// Defines window.AdminView
window.AdminView = function AdminView({
  contracts,
  needConnection,
  pushLog,
  withTx,
  refreshRequests,
  allRequests,
}) {
  const [disputeId, setDisputeId] = React.useState("");
  const [validatorAddr, setValidatorAddr] = React.useState("");
  const [minDelivery, setMinDelivery] = React.useState("9000");

  const disputedRequests = (allRequests || []).filter(r => r.status === "DISPUTED");

  const resolveDispute = async (id, favorReceiver) => {
    await withTx(
      () => contracts.escrow.resolveDispute(id, favorReceiver),
      `Resolve dispute #${id} (${favorReceiver ? "Receiver" : "Donor"})`
    );
    refreshRequests();
  };

  const updateMinDelivery = async () => {
    await withTx(
      () => contracts.escrow.setMinDelivery(BigInt(minDelivery)),
      `Update Min Delivery to ${minDelivery} BPS`
    );
  };

  const addValidator = async () => {
    await withTx(
      () => contracts.escrow.addValidator(validatorAddr),
      `Add Validator ${validatorAddr}`
    );
  };

  const setPaused = async (status) => {
    if (status) {
      await withTx(() => contracts.escrow.emergencyPause(), "Emergency Pause");
    } else {
      await withTx(() => contracts.escrow.unpause(), "Unpause");
    }
  };

  return (
    <div className="stack">
      <div className="grid">
        <div className="card">
          <h2>🚩 Dispute Resolution</h2>
          {disputedRequests.length === 0 && <p className="muted small">No active disputes</p>}
          <div className="stack">
            {disputedRequests.map(r => (
              <div key={r.id} className="request-card">
                <p className="mono small">#{r.id} — Receiver: {r.receiver.slice(0,6)}... Donor: {r.donor.slice(0,6)}...</p>
                <div className="row" style={{ marginTop: 8 }}>
                  <button onClick={() => resolveDispute(r.id, true)} style={{ flex: 1, background: "var(--danger)" }}>
                    Refund Receiver
                  </button>
                  <button onClick={() => resolveDispute(r.id, false)} style={{ flex: 1 }}>
                    Pay Donor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>⚙️ System Controls</h2>
          <label>
            Minimum Delivery (Basis Points: 9000 = 90%)
            <input type="number" value={minDelivery} onChange={e => setMinDelivery(e.target.value)} />
          </label>
          <button onClick={updateMinDelivery} disabled={needConnection}>Set Min Delivery</button>
          
          <div className="divider" />
          
          <label>
            New Validator Address
            <input value={validatorAddr} onChange={e => setValidatorAddr(e.target.value)} placeholder="0x..." />
          </label>
          <button onClick={addValidator} disabled={needConnection}>Add Validator</button>

          <div className="divider" />

          <div className="row">
            <button onClick={() => setPaused(true)} style={{ flex: 1, background: "var(--danger)" }}>Pause Contract</button>
            <button onClick={() => setPaused(false)} style={{ flex: 1 }}>Unpause</button>
          </div>
        </div>
      </div>
    </div>
  );
};
