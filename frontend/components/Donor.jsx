// Defines window.DonorView
window.DonorView = function DonorView({
  locked,
  needConnection,
  openRequests,
  acceptRequest,
  acceptingId,
  forms,
  setForm,
  startSession,
  completeSession,
  autoRelease,
  setAutoRelease,
  adminAddress,
}) {
  return (
    <div className="grid">
      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Accept Request (manual)</h2>
        <label>
          Request id
          <input
            value={forms.accept.id}
            onChange={(e) => setForm("accept", "id", e.target.value)}
          />
        </label>
        <button
          onClick={() => acceptRequest(forms.accept.id)}
          disabled={needConnection || locked || acceptingId === forms.accept.id}
        >
          Accept by id
        </button>
        <p className="muted small">Use this if the list below is empty but you already know the id.</p>
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Phase 3 — Open Requests (Donor)</h2>
        {openRequests.length === 0 && <p className="muted small">No OPEN requests</p>}
        <div className="stack">
          {openRequests.map((r) => (
            <div key={r.id} className="request-card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="mono">#{r.id}</div>
                <span className={`status ${r.status}`}>{r.status}</span>
              </div>
              <p className="small">Energy: {r.energy.toString()} | Price: {r.price.toString()} wei</p>
              <p className="small">Total: {r.total.toString()} wei</p>
              <p className="muted small">Location: {r.location}</p>
              <p className="muted small mono">Receiver: {r.receiver}</p>
              <button
                onClick={() => acceptRequest(r.id)}
                disabled={needConnection || locked || acceptingId === r.id.toString()}
              >
                Accept request
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Phase 4 — Charging Session</h2>
        <label>
          Request id
          <input
            value={forms.start.id}
            onChange={(e) => {
              setForm("start", "id", e.target.value);
              setForm("complete", "id", e.target.value);
            }}
          />
        </label>
        <div className="row">
          <button onClick={() => startSession(forms.start.id)} disabled={needConnection || locked}>
            Start charging
          </button>
          <div style={{ flex: 1 }} />
        </div>
        <div className="divider" />
        <label>
          Energy delivered (for completion)
          <input
            value={forms.complete.delivered}
            onChange={(e) => setForm("complete", "delivered", e.target.value)}
          />
        </label>
        <button
          onClick={() => completeSession(forms.complete.id, forms.complete.delivered)}
          disabled={needConnection || locked}
        >
          Complete charging
        </button>
        <p className="muted small">
          Contract requires validator to call start/complete. If you are not the validator address,
          these txs will revert.
        </p>
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Auto-Release (admin wallet only)</h2>
        <label className="row" style={{ alignItems: "center" }}>
          <input
            type="checkbox"
            checked={autoRelease}
            onChange={(e) => setAutoRelease(e.target.checked)}
          />
          <span className="small">Auto-release on completion (requires escrow admin wallet)</span>
        </label>
        {adminAddress && (
          <p className="muted small mono">Escrow admin: {adminAddress}</p>
        )}
      </div>
    </div>
  );
};
