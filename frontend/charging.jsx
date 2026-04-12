const { useEffect, useState } = React;

const ABI_FILES = {
  EVChargingEscrow: "abis/EVChargingEscrow.json",
};

const CHARGING_API =
  window.CHARGING_API ||
  `${window.location.protocol}//${window.location.hostname}:4000`;

function ChargingApp() {
  const [abis, setAbis] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [contracts, setContracts] = useState(null);
  const [logs, setLogs] = useState(["Waiting to connect wallet..."]);
  const [request, setRequest] = useState(null);
  const [energyDelivered, setEnergyDelivered] = useState("");
  const [loading, setLoading] = useState(true);
  const [pollId, setPollId] = useState(null);

  const requestId = (() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("requestId");
    return id ? BigInt(id) : null;
  })();

  const pushLog = (message) =>
    setLogs((prev) => [`${new Date().toLocaleTimeString()} — ${message}`, ...prev].slice(0, 80));

  /* load ABIs */
  useEffect(() => {
    (async () => {
      try {
        const entries = await Promise.all(
          Object.entries(ABI_FILES).map(async ([name, path]) => {
            const res = await fetch(path);
            const json = await res.json();
            return [name, window.normalizeAbi(json)];
          })
        );
        setAbis(Object.fromEntries(entries));
      } catch (e) {
        pushLog(`Failed to load ABIs: ${e.message}`);
      }
    })();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found. Install it to continue.");
      return;
    }
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (e) {
        if (e?.code !== -32002) {
          throw e;
        }
      }
      await prov.send("eth_requestAccounts", []);
      const network = await prov.getNetwork();
      if (network.chainId !== BigInt(window.TARGET_CHAIN_ID_DEC)) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: window.TARGET_CHAIN_ID_HEX }],
        });
      }
      const s = await prov.getSigner();
      const addr = await s.getAddress();
      setProvider(prov);
      setSigner(s);
      setAccount(addr);
      pushLog(`Connected as ${addr}`);
    } catch (e) {
      pushLog(`Wallet connect failed: ${e.message}`);
    }
  };

  /* instantiate contracts */
  useEffect(() => {
    if (!signer || !abis) return;
    const c = {
      escrow: new ethers.Contract(window.CONTRACT_ADDRESSES.EVChargingEscrow, abis.EVChargingEscrow, signer),
    };
    setContracts(c);
  }, [signer, abis]);

  /* load request details */
  useEffect(() => {
    if (!contracts || !requestId) return;
    (async () => {
      setLoading(true);
      try {
        const req = await contracts.escrow.requests(requestId);
        setRequest({
          id: Number(req.id),
          receiver: req.receiver,
          donor: req.donor,
          energy: req.energyRequired?.toString?.(),
          price: req.pricePerUnitWei?.toString?.(),
          location: req.location,
          status: ["OPEN", "ACCEPTED", "CHARGING", "COMPLETED", "CANCELED", "REFUNDED", "FAILED", "DISPUTED"][Number(req.status)],
        });
      } catch (e) {
        pushLog(`Load request failed: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [contracts, requestId]);

  const withTx = async (fn, label) => {
    if (!provider || !signer || !contracts) {
      alert("Connect wallet first");
      return null;
    }
    try {
      const tx = await fn();
      pushLog(`${label} → ${tx.hash}`);
      const receipt = await tx.wait();
      pushLog(`${label} confirmed in block ${receipt.blockNumber}`);
      return receipt;
    } catch (e) {
      pushLog(`${label} failed: ${e.message}`);
      return null;
    }
  };

  const startCharging = async () => {
    await startSimulation();
    await reloadRequest();
  };

  const reloadRequest = async () => {
    if (!contracts) return;
    try {
      const req = await contracts.escrow.requests(requestId);
      setRequest({
        id: Number(req.id),
        receiver: req.receiver,
        donor: req.donor,
        energy: req.energyRequired?.toString?.(),
        price: req.pricePerUnitWei?.toString?.(),
        location: req.location,
        status: ["OPEN", "ACCEPTED", "CHARGING", "COMPLETED", "CANCELED", "REFUNDED", "FAILED", "DISPUTED"][Number(req.status)],
      });
    } catch (e) {
      pushLog(`Refresh failed: ${e.message}`);
    }
  };

  /* ---- backend simulation ---- */
  const startSimulation = async () => {
    if (!request) return;
    try {
      const body = {
        sessionId: requestId.toString(),
        donor: account,
        receiver: request.receiver,
        requestedEnergy: request.energy,
        escrowAddress: window.CONTRACT_ADDRESSES.EVChargingEscrow,
      };
      const res = await fetch(`${CHARGING_API}/start-charging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pushLog("Simulator: charging started");
      beginPolling();
    } catch (e) {
      pushLog(`Simulator start failed: ${e.message}`);
    }
  };

  const beginPolling = () => {
    if (pollId) clearInterval(pollId);
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${CHARGING_API}/status/${requestId.toString()}`);
        if (!res.ok) return;
        const s = await res.json();
        pushLog(`Status ${s.status}: energy=${s.transferredEnergy}`);
        if (s.status === "COMPLETED" || s.status === "ERROR" || s.status === "STOPPED") {
          clearInterval(id);
          setPollId(null);
          if (s.txHash) pushLog(`On-chain tx: ${s.txHash}`);
          if (s.status === "COMPLETED") {
            // Automatically refresh the UI and MetaMask related blockchain state.
            await reloadRequest();
            pushLog("Funds transferred to donor. Session completed!");
          }
        } else {
          setPollId(id);
        }
      } catch (e) {
        // ignore transient errors
      }
    }, 1500);
  };

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1>Charging Session</h1>
          <p className="muted small">Request ID: {requestId ? requestId.toString() : "missing"}</p>
        </div>
        <button onClick={connectWallet}>
          {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
        </button>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Request details</h2>
          {loading && <p className="muted small">Loading…</p>}
          {request && (
            <div className="small">
              <p>
                #{request.id} <span className={`status ${request.status}`}>{request.status}</span>
              </p>
              <p className="mono">Receiver: {request.receiver}</p>
              {request.donor && request.donor !== "0x0000000000000000000000000000000000000000" && (
                <p className="mono">Donor: {request.donor}</p>
              )}
              <p>Energy: {request.energy} | Price: {request.price} wei</p>
              <p>Location: {request.location}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Charging actions</h2>
          <button onClick={startCharging} disabled={!requestId}>
            Start Charging (simulator)
          </button>
          <div className="divider" />
          <p className="muted small">Request id is read from URL. Charging completes and pays donor automatically once simulated energy is delivered.</p>
        </div>

        <div className="card">
          <h2>Logs</h2>
          <div className="log">
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ChargingApp />);
