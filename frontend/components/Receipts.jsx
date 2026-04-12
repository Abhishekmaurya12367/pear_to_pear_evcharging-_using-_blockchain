// Defines window.ReceiptsPanel
window.ReceiptsPanel = function ReceiptsPanel({ receipts, myRequests }) {
  // Use receipts from props or derive from myRequests
  const completed = (myRequests || []).filter(r => r.status === "COMPLETED" || r.status === "FAILED");

  return (
    <div className="card">
      <h2>🏆 Session History</h2>
      {completed.length === 0 && <p className="muted small">No history yet</p>}
      <div className="stack">
        {completed.map((r, i) => (
          <div key={i} className="request-card" style={{ borderLeft: `4px solid ${r.status === "COMPLETED" ? "#10b981" : "#f472b6"}` }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mono small font-bold">Request #{r.id}</span>
              <span className={`status ${r.status}`}>{r.status}</span>
            </div>
            <p className="small">Energy: {r.energyDelivered?.toString()} / {r.energy?.toString()} Wh</p>
            <p className="small">Rate: {r.price?.toString()} wei/Wh</p>
            <p className="muted small mono" style={{ fontSize: '0.7rem' }}>Recipient: {r.receiver.slice(0,10)}...</p>
            {r.signatureVerified && (
              <p className="small" style={{ color: "var(--accent-2)" }}>🔏 Validated & Signed</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
