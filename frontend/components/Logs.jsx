// Defines window.LogPanel
window.LogPanel = function LogPanel({ logs }) {
  return (
    <div className="card">
      <h2>📜 Activity Logs</h2>
      <div className="log">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        <strong>Standard Flow:</strong> Register ➔ Admin Verify ➔ Receiver Create ➔
        Donor Accept ➔ Validator Start/Complete ➔ Energy Validation ➔ Automatic Payout.
      </p>
      <p className="muted small">
        <strong>Security:</strong> All payments protected by ReentrancyGuard and AccessControl roles.
      </p>
    </div>
  );
};
