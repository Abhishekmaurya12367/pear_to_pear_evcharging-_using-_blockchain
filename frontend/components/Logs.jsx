// Defines window.LogPanel
window.LogPanel = function LogPanel({ logs }) {
  return (
    <div className="card">
      <h2>Logs</h2>
      <div className="log">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        Sequence (per contracts): register → admin verifies → receiver creates →
        donor accepts → status to ACCEPTED → deposit → start → complete → (admin) release.
      </p>
    </div>
  );
};
