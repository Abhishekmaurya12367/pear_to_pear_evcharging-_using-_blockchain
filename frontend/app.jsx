const { useEffect, useMemo, useState } = React;

const ABI_FILES = {
  Userregistry: "abis/Userregistry.json",
  EVChargingEscrow: "abis/EVChargingEscrow.json",
};

const ROLE = ["NONE", "DONOR", "RECEIVER", "BOTH"];
const STATUS = ["OPEN", "ACCEPTED", "CHARGING", "COMPLETED", "CANCELED", "REFUNDED"];

function App() {
  const [abis, setAbis] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [contracts, setContracts] = useState(null);
  const [logs, setLogs] = useState(["Waiting to connect wallet..."]);
  const [userSelf, setUserSelf] = useState(null);
  const [requestCount, setRequestCount] = useState(0);
  const [openRequests, setOpenRequests] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [currentPage, setCurrentPage] = useState("onboard"); // onboard | receiver | donor
  const [acceptingId, setAcceptingId] = useState(null);
  const [loadingSelf, setLoadingSelf] = useState(false);

  const [forms, setForms] = useState({
    register: { ev: "", battery: "", role: "1", autoVerify: false },
    create: { energy: "", price: "", location: "" },
    accept: { id: "" },
    refund: { id: "" },
    verify: { addr: "" },
  });

  const setForm = (key, field, value) =>
    setForms((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const pushLog = (message) =>
    setLogs((prev) => [`${new Date().toLocaleTimeString()} — ${message}`, ...prev].slice(0, 80));

  const needConnection = !provider || !signer || !contracts;
  const locked = useMemo(() => !userSelf?.isRegister, [userSelf]);

  /* ------------ load ABIs once ------------ */
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
        pushLog("ABIs loaded");
      } catch (e) {
        pushLog(`Failed to load ABIs: ${e.message}`);
      }
    })();
  }, []);

  /* ------------ wallet connect ------------ */
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found. Install it to continue.");
      return;
    }
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      // Ask for account picker each time; ignore "request already pending" errors
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (e) {
        if (e?.code !== -32002) {
          // If not the "request already pending" error, surface it
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

  /* ------------ instantiate contracts ------------ */
  useEffect(() => {
    if (!signer || !abis) return;
    const c = {
      user: new ethers.Contract(window.CONTRACT_ADDRESSES.Userregistry, abis.Userregistry, signer),
      escrow: new ethers.Contract(window.CONTRACT_ADDRESSES.EVChargingEscrow, abis.EVChargingEscrow, signer),
    };
    setContracts(c);
    pushLog("Contracts ready");
  }, [signer, abis]);

  const loadSelf = async () => {
    if (!contracts || !account) return;
    setLoadingSelf(true);
    try {
      const u = await contracts.user.getuser(account);
      const verified = await contracts.user.isvarifieduser(account);
      const roleText = ROLE[Number(u.role)] || "UNKNOWN";
      setUserSelf({
        ...u,
        roleText,
        isRegister: u.isRegister,
        isvarified: verified,
      });
    } catch (e) {
      pushLog(`Self load failed: ${e.message}`);
    }
    setLoadingSelf(false);
  };

  /* ------------ hydrate self + globals ------------ */
  useEffect(() => {
    loadSelf();
    refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, account]);

  // Global listener to reuse existing verifyUser logic
  // (listener removed; verifyUser is called directly from UI)

  /* ------------ poll open requests every 20s ------------ */
  useEffect(() => {
    if (!contracts) return;
    const id = setInterval(refreshRequests, 20000);
    return () => clearInterval(id);
  }, [contracts]);

  const refreshRequests = async () => {
    if (!contracts) return;
    try {
      const count = await contracts.escrow.requestCount();
      setRequestCount(Number(count));
      const items = [];
      for (let i = 1; i <= Number(count); i++) {
        try {
          const r = await contracts.escrow.requests(i);
          const status = STATUS[Number(r.status)] || "UNKNOWN";
          const total = r.energyRequired * r.pricePerUnitWei;
          items.push({
            id: Number(r.id),
            receiver: r.receiver,
            donor: r.donor,
            energy: r.energyRequired,
            price: r.pricePerUnitWei,
            total,
            location: r.location,
            status,
          });
        } catch (_) {}
      }
      setOpenRequests(items.filter((r) => r.status === "OPEN"));
    } catch (e) {
      pushLog(`Refresh requests failed: ${e.message}`);
    }
  };

  /* ------------ helpers ------------ */
  const parseUint = (value) => (value ? BigInt(value) : 0n);

  const withTx = async (fn, label) => {
    if (needConnection) {
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

  /* ------------ actions ------------ */
  const mustId = (value) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      throw new Error("Request id required");
    }
    const n = BigInt(value);
    if (n <= 0) throw new Error("Request id must be greater than 0");
    return n;
  };

  const registerUser = async () => {
    const { ev, battery, role } = forms.register;
    const receipt = await withTx(
      () => contracts.user.register_user(ev, parseUint(battery), Number(role)),
      "Register user"
    );
    if (receipt) {
      const u = await contracts.user.getuser(account);
      const roleText = ROLE[Number(u.role)];
      setUserSelf({ ...u, roleText, isRegister: u.isRegister });

      if (forms.register.autoVerify && contracts.user.varifyuser) {
        try {
          await withTx(() => contracts.user.varifyuser(account), "Auto-verify (admin only)");
        } catch {
          pushLog("Auto-verify failed (needs admin wallet)");
        }
      }
    }
  };

  const verifyUser = async (addr) => {
    const target = addr || forms.verify.addr;
    if (!target) {
      pushLog("Enter address to verify");
      return;
    }
    const receipt = await withTx(() => contracts.user.varifyuser(target), "Verify user");
    if (receipt && target.toLowerCase() === account.toLowerCase()) {
      await loadSelf();
    }
  };

  const createRequest = async () => {
    const { energy, price, location } = forms.create;
    try {
      const verified = await contracts.user.isvarifieduser(account);
      if (!verified) {
        pushLog("On-chain verification missing. Connect admin wallet and verify this address.");
        await loadSelf();
        return;
      }
    } catch (e) {
      pushLog(`Unable to confirm verification: ${e.message}`);
      return;
    }
    const total = parseUint(energy) * parseUint(price);
    const receipt = await withTx(
      () =>
        contracts.escrow.createRequest(parseUint(energy), parseUint(price), location, {
          value: total,
        }),
      "Create request"
    );
    if (receipt) {
      refreshRequests();
    }
  };

  const acceptRequest = async (id) => {
    let parsed;
    try {
      parsed = mustId(id);
    } catch (e) {
      pushLog(e.message);
      return;
    }
    setAcceptingId(parsed.toString());
    // Open charging page immediately (user gesture) to avoid popup blockers.
    const chargingUrl = `./charging.html?requestId=${parsed.toString()}`;
    const tab = window.open(chargingUrl, "_blank", "noopener");

    const receipt = await withTx(() => contracts.escrow.acceptRequest(parsed), "Accept request");
    setAcceptingId(null);

    if (receipt) {
      // Remove from OPEN list (accepted now)
      setOpenRequests((prev) => prev.filter((r) => BigInt(r.id) !== parsed));
      // tab already opened to chargingUrl; nothing else to do
    } else if (tab && !tab.closed) {
      tab.close(); // close if tx failed
    }

    refreshRequests();
  };

  const refundExpired = async (id) => {
    let parsed;
    try {
      parsed = mustId(id);
    } catch (e) {
      pushLog(e.message);
      return;
    }
    await withTx(() => contracts.escrow.refundExpired(parsed), "Refund expired");
    refreshRequests();
  };

  const recordReceipt = (data) =>
    setReceipts((prev) => [data, ...prev].slice(0, 20));

  /* ------------ derived ------------ */
  const totalCost = useMemo(() => {
    const e = parseUint(forms.create.energy);
    const p = parseUint(forms.create.price);
    return e * p;
  }, [forms.create.energy, forms.create.price]);

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1>EV P2P Energy</h1>
          <div className="row">
            <span className="pill">Sepolia 0xaa36a7</span>
            <span className="pill">Requests: {requestCount}</span>
            {userSelf && (
              <span className="pill">
                Role: {userSelf.roleText} · {userSelf.isvarified ? "Verified" : "Unverified"}
              </span>
            )}
          </div>
          <div className="switch">
            <button
              className={currentPage === "receiver" ? "active" : ""}
              onClick={() => setCurrentPage("receiver")}
            >
              Receiver view
            </button>
            <button
              className={currentPage === "donor" ? "active" : ""}
              onClick={() => setCurrentPage("donor")}
            >
              Donor view
            </button>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button onClick={() => setCurrentPage("onboard")} disabled={currentPage === "onboard"}>
            Onboard
          </button>
          <button onClick={() => setCurrentPage("receiver")} disabled={currentPage === "receiver"}>
            Receiver
          </button>
          <button onClick={() => setCurrentPage("donor")} disabled={currentPage === "donor"}>
            Donor
          </button>
          <button onClick={connectWallet}>
            {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
          </button>
          <button onClick={loadSelf} disabled={needConnection || loadingSelf}>
            Refresh status
          </button>
        </div>
      </div>

      {currentPage === "onboard" && (
        <window.Onboard
          forms={forms}
          setForm={setForm}
          needConnection={needConnection}
          registerUser={registerUser}
          userSelf={userSelf}
          setCurrentPage={setCurrentPage}
            adminAddress={null}
          verifyUser={verifyUser}
        />
      )}

      {currentPage === "receiver" && (
        <window.ReceiverView
          locked={locked}
          needConnection={needConnection}
          forms={forms}
          setForm={setForm}
          totalCost={totalCost}
          createRequest={createRequest}
          isVerified={userSelf?.isvarified}
          refundExpired={refundExpired}
        />
      )}

      {currentPage === "donor" && (
        <window.DonorView
          locked={locked}
          needConnection={needConnection}
          openRequests={openRequests}
          acceptRequest={acceptRequest}
          acceptingId={acceptingId}
          forms={forms}
          setForm={setForm}
          startSession={null}
          completeSession={null}
          autoRelease={false}
          setAutoRelease={() => {}}
          adminAddress={null}
        />
      )}

      {/* Common panels */}
      <div className="grid">
        <window.ReceiptsPanel receipts={receipts} />
        <window.LogPanel logs={logs} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
