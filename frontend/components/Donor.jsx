// Defines window.DonorView
window.DonorView = function DonorView({
  locked,
  needConnection,
  openRequests,
  acceptRequest,
  acceptingId,
  forms,
  setForm,
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

      <div className="card">
        <h2>Charging Session</h2>
        <p className="muted small">
          After you accept a request, a charging session page opens. The validator (backend
          simulator wallet) will start/complete charging and handle on-chain payout automatically.
        </p>
      </div>
    </div>
  );
};
