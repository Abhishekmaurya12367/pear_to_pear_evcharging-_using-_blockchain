// Defines window.ReceiptsPanel
window.ReceiptsPanel = function ReceiptsPanel({ receipts }) {
  return (
    <div className="card">
      <h2>Phase 6 — Receipts</h2>
      {receipts.length === 0 && <p className="muted small">No receipts yet</p>}
      <div className="stack">
        {receipts.map((r, i) => (
          <div key={i} className="request-card">
            <p className="mono small">Tx: {r.tx}</p>
            <p className="small">Request #{r.requestId}</p>
            <p className="small">Energy delivered: {r.energy}</p>
            <p className="small">Amount: {r.amount} wei</p>
            <p className="muted small">Timestamp: {r.timestamp}</p>
            <p className="muted small">Contracts: Escrow {window.CONTRACT_ADDRESSES.EscrowPayment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
