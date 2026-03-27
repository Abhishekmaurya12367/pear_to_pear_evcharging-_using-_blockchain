const { useEffect, useState } = React;

const ABI_FILES = {
  ChargingRequest: "abis/ChargingRequest.json",
  MatchingContract: "abis/MatchingContract.json",
  EnergyValidation: "abis/EnergyValidation.json",
  EscrowPayment: "abis/EscrowPayment.json",
};

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
            return [name, json];
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
      charging: new ethers.Contract(window.CONTRACT_ADDRESSES.ChargingRequest, abis.ChargingRequest, signer),
      matching: new ethers.Contract(window.CONTRACT_ADDRESSES.MatchingContract, abis.MatchingContract, signer),
      validation: new ethers.Contract(window.CONTRACT_ADDRESSES.EnergyValidation, abis.EnergyValidation, signer),
      escrow: new ethers.Contract(window.CONTRACT_ADDRESSES.EscrowPayment, abis.EscrowPayment, signer),
    };
    setContracts(c);
  }, [signer, abis]);

  /* load request details */
  useEffect(() => {
    if (!contracts || !requestId) return;
    (async () => {
      setLoading(true);
      try {
        const req = await contracts.charging.getRequest(requestId);
        setRequest({
          id: Number(req.id),
          receiver: req.reciever,
          energy: req.energyrequired?.toString?.(),
          price: req.priceperkilo?.toString?.(),
          location: req.location,
          status: ["OPEN", "ACCEPTED", "COMPLETED", "CANCELED"][Number(req.status)],
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
    await withTx(() => contracts.validation.started(requestId), "Start charging");
    await reloadRequest();
  };

  const completeCharging = async () => {
    await withTx(
      () => contracts.validation.completed(requestId, BigInt(energyDelivered || "0")),
      "Complete charging"
    );
    await reloadRequest();
  };

  const reloadRequest = async () => {
    if (!contracts) return;
    try {
      const req = await contracts.charging.getRequest(requestId);
      setRequest({
        id: Number(req.id),
        receiver: req.reciever,
        energy: req.energyrequired?.toString?.(),
        price: req.priceperkilo?.toString?.(),
        location: req.location,
        status: ["OPEN", "ACCEPTED", "COMPLETED", "CANCELED"][Number(req.status)],
      });
    } catch (e) {
      pushLog(`Refresh failed: ${e.message}`);
    }
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
              <p>#{request.id} <span className={`status ${request.status}`}>{request.status}</span></p>
              <p className="mono">Receiver: {request.receiver}</p>
              <p>Energy: {request.energy} | Price: {request.price} wei</p>
              <p>Location: {request.location}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Charging actions</h2>
          <button onClick={startCharging} disabled={!requestId}>Start Charging</button>
          <div className="divider" />
          <label>
            Energy delivered
            <input
              value={energyDelivered}
              onChange={(e) => setEnergyDelivered(e.target.value)}
              placeholder="e.g., 10"
            />
          </label>
          <button onClick={completeCharging} disabled={!requestId}>
            Complete Charging
          </button>
          <p className="muted small">
            Request id is read from URL; no manual entry needed.
          </p>
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
