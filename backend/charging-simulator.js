const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: true });
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });

const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const fs = require("fs");

// ---- CONFIG ----
const PORT = process.env.PORT || 4000;
const TICK_MS = 1000;
const TIMEOUT_MS = 5 * 60 * 1000;
/** Wait for donor accept before validator can start (ms). */
const WAIT_ACCEPT_MS = Number(process.env.WAIT_ACCEPT_MS || 180000);
const POLL_MS = Number(process.env.POLL_MS || 2000);

// EVChargingEscrow.Status
const ReqStatus = {
  OPEN: 0,
  ACCEPTED: 1,
  CHARGING: 2,
  COMPLETED: 3,
  CANCELED: 4,
  REFUNDED: 5,
  FAILED: 6,
  DISPUTED: 7
};

/** Unified flow uses EVChargingEscrow only — do not fall back to legacy EscrowPayment (ESCROW_ADDRESS). */
function resolveEvEscrowAddress() {
  const fromEnv = process.env.EV_ESCROW_ADDRESS && process.env.EV_ESCROW_ADDRESS.trim();
  if (fromEnv) return fromEnv;

  const files = [
    path.join(__dirname, "..", "Addresses.json"),
    path.join(__dirname, "..", "frontend", "Addresses.json"),
  ];
  for (const fp of files) {
    try {
      if (!fs.existsSync(fp)) continue;
      const data = JSON.parse(fs.readFileSync(fp, "utf8"));
      const addr = data.EVChargingEscrow || data.evChargingEscrow;
      if (addr && typeof addr === "string" && addr.startsWith("0x") && addr.length === 42) {
        return addr;
      }
    } catch (_) {
      /* try next */
    }
  }
  return null;
}

const EV_ESCROW_CONTRACT = resolveEvEscrowAddress();

// ---- APP ----
const app = express();
app.use(express.json());
app.use(cors());

// ---- STATE ----
const sessions = new Map();

// ---- HELPERS ----
function loadAbi(kind) {
  const candidates = [
    process.env.EV_ESCROW_ABI_PATH,
    path.join(__dirname, "..", "artifacts/contracts/EVChargingEscrow.sol/EVChargingEscrow.json"),
    path.join(__dirname, "..", "frontend/abis/EVChargingEscrow.json"),
  ].filter(Boolean);

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      return Array.isArray(json) ? json : json.abi;
    }
  }
  throw new Error("EVChargingEscrow ABI not found in any known path");
}

function getContract(address, kind) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
  const abi = loadAbi(kind);

  return {
    contract: new ethers.Contract(address, abi, wallet),
    wallet,
  };
}

function safeSession(s) {
  const { timer, ...rest } = s;
  for (const key in rest) {
    if (typeof rest[key] === "bigint") {
      rest[key] = rest[key].toString();
    }
  }
  return rest;
}

/**
 * Donor must call acceptRequest before validator startCharging.
 * If already CHARGING (e.g. retry), skip starting again.
 */
async function waitUntilAcceptedOrCharging(contract, requestId) {
  const deadline = Date.now() + WAIT_ACCEPT_MS;
  while (Date.now() < deadline) {
    const r = await contract.requests(requestId);
    const st = Number(r.status);
    if (st === ReqStatus.ACCEPTED) return "ACCEPTED";
    if (st === ReqStatus.CHARGING) return "CHARGING";
    if (st >= ReqStatus.COMPLETED) {
      throw new Error(`Request ${requestId} not startable (on-chain status=${st})`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(
    `Timeout after ${WAIT_ACCEPT_MS}ms — donor must accept the request on-chain before charging starts.`
  );
}

// ---- COMPLETE ON CHAIN ----
async function completeOnChain(session, deliveredOverride) {
  const { escrowAddress, sessionId, transferredEnergy } = session;
  const { contract: escrow, wallet } = getContract(escrowAddress, "EVChargingEscrow");

  const energy = deliveredOverride ?? transferredEnergy;

  console.log(`[chain] Backend wallet: ${wallet.address}`);
  console.log(`[chain] Completing ${sessionId} with energy ${energy}`);

  const tx = await escrow.completeCharging(sessionId, energy);
  const receipt = await tx.wait();
  console.log(`[chain] Complete+Payout tx: ${receipt.hash}`);

  const r = await escrow.getRequest(sessionId);
  const finalStatus = Number(r.status);
  
  if (finalStatus === ReqStatus.FAILED) {
    session.status = "FAILED";
    console.log(`[chain] Session ${sessionId} FAILED energy validation on-chain.`);
  } else {
    session.status = "COMPLETED";
    console.log(`[chain] Session ${sessionId} COMPLETED on-chain.`);
  }
  
  session.txHash = receipt.hash;
}

// ---- TIMER ----
function startTimer(session) {
  const startTime = Date.now();

  const t = setInterval(async () => {
    if (session.status !== "CHARGING") {
      clearInterval(session.timer);
      return;
    }

    session.transferredEnergy += 1n;
    console.log(`[sim] ${session.sessionId} energy = ${session.transferredEnergy}`);

    const elapsed = Date.now() - startTime;

    if (
      session.transferredEnergy >= session.requestedEnergy ||
      elapsed >= TIMEOUT_MS
    ) {
      clearInterval(session.timer);
      session.status = "COMPLETING";

      try {
        await completeOnChain(session);
      } catch (e) {
        console.error("[sim] complete failed:", e.message);
        session.status = "ERROR";
        session.error = e.message;
      }
    }
  }, TICK_MS);

  Object.defineProperty(session, "timer", {
    value: t,
    enumerable: false,
    writable: true,
  });
}

// ---- ROUTES ----

// ✅ START CHARGING
app.post("/start-charging", async (req, res) => {
  try {
    const { sessionId, requestedEnergy, donor, receiver } = req.body;

    if (!sessionId || !requestedEnergy) {
      return res.status(400).send({ error: "Missing fields" });
    }

    if (sessions.has(sessionId)) {
      const prev = sessions.get(sessionId);
      // Allow retry after a failed run; otherwise idempotent
      if (prev.status !== "ERROR") {
        return res.send({ ok: true, session: safeSession(prev) });
      }
      if (prev.timer) clearInterval(prev.timer);
      sessions.delete(sessionId);
    }

    const sid = BigInt(sessionId);
    const energy = BigInt(requestedEnergy);

    const escrowAddress = EV_ESCROW_CONTRACT;
    if (!escrowAddress) {
      return res.status(500).send({
        error:
          "EVChargingEscrow address not configured: set EV_ESCROW_ADDRESS in .env or run deploy (Addresses.json).",
      });
    }

    const { contract } = getContract(escrowAddress, "EVChargingEscrow");

    // 1) Wait for donor accept (fixes "not accepted")
    const phase = await waitUntilAcceptedOrCharging(contract, sid);

    // 2) Move chain to CHARGING if not already
    if (phase === "ACCEPTED") {
      const tx = await contract.startCharging(sid);
      await tx.wait();
      console.log(`[chain] Session ${sessionId} started on-chain`);
    } else {
      console.log(`[chain] Session ${sessionId} already CHARGING on-chain — resuming sim`);
    }

    const session = {
      sessionId: sid,
      donor,
      receiver,
      requestedEnergy: energy,
      transferredEnergy: 0n,
      status: "CHARGING",
      escrowAddress,
    };

    sessions.set(sessionId, session);
    startTimer(session);

    res.send({ ok: true, session: safeSession(session) });
  } catch (e) {
    console.error("[chain] start failed:", e.message);
    res.status(503).send({ ok: false, error: e.message });
  }
});

// ✅ STATUS
app.get("/status/:id", (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).send({ error: "not found" });

  res.send(safeSession(s));
});

// ✅ STOP
app.post("/stop-charging", (req, res) => {
  const { sessionId } = req.body;
  const s = sessions.get(sessionId);

  if (!s) return res.status(404).send({ error: "not found" });

  if (s.timer) clearInterval(s.timer);
  s.status = "STOPPED";

  res.send({ ok: true });
});

// ✅ MANUAL COMPLETE
app.post("/complete-charging", async (req, res) => {
  try {
    const { sessionId, deliveredEnergy } = req.body;
    const s = sessions.get(sessionId);

    if (!s) return res.status(404).send({ error: "not found" });

    if (s.timer) clearInterval(s.timer);

    await completeOnChain(
      s,
      deliveredEnergy ? BigInt(deliveredEnergy) : undefined
    );

    res.send({ ok: true });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
  if (EV_ESCROW_CONTRACT) {
    console.log(`[config] EVChargingEscrow: ${EV_ESCROW_CONTRACT}`);
  } else {
    console.warn(
      "[config] EVChargingEscrow missing — set EV_ESCROW_ADDRESS or keep EVChargingEscrow in Addresses.json (deploy)."
    );
  }
  if (!process.env.RPC_URL) console.warn("[config] RPC_URL missing — chain calls will fail.");
  if (!process.env.ORACLE_PRIVATE_KEY) console.warn("[config] ORACLE_PRIVATE_KEY missing — chain calls will fail.");
  console.log(`[config] WAIT_ACCEPT_MS=${WAIT_ACCEPT_MS} (poll every ${POLL_MS}ms)`);
});