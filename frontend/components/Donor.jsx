// Defines window.DonorView
window.DonorView = function DonorView({
  locked,
  needConnection,
  openRequests,
  acceptRequest,
  acceptingId,
  forms,
  setForm,
  myRequests,
  account,
}) {
  // Filter accepted/completed by this donor
  const donorRequests = (myRequests || []).filter(
    (r) => account && r.donor.toLowerCase() === account.toLowerCase()
  );

  return (
    <div className="grid">
      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Accept Request (manual)</h2>
        <label>
          Request ID
          <input
            value={forms.accept.id}
            onChange={(e) => setForm("accept", "id", e.target.value)}
            placeholder="Enter request ID"
          />
        </label>
        <button
          onClick={() => acceptRequest(forms.accept.id)}
          disabled={needConnection || locked || acceptingId === forms.accept.id}
        >
          Accept by ID
        </button>
        <p className="muted small">Use this if the list below is empty but you already know the ID.</p>
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>🔌 Open Requests Available</h2>
        {openRequests.length === 0 && <p className="muted small">No OPEN requests right now</p>}
        <div className="stack">
          {openRequests.map((r) => (
            <div key={r.id} className="request-card">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="mono">#{r.id}</div>
                <span className={`status ${r.status}`}>{r.status}</span>
              </div>
              <p className="small">
                Energy: {r.energy.toString()} Wh | Price: {r.price.toString()} wei/Wh
              </p>
              <p className="small">Total payout: {r.total.toString()} wei</p>
              <p className="muted small">📍 {r.location}</p>
              <p className="muted small mono">Receiver: {r.receiver}</p>
              <button
                onClick={() => acceptRequest(r.id)}
                disabled={needConnection || locked || acceptingId === r.id.toString()}
                className="accept-btn"
              >
                ⚡ Accept Request (Required)
              </button>
              <p className="muted small" style={{ marginTop: 4 }}>
                <em>* Note: You must accept this on-chain in MetaMask before the simulator can start.</em>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>📋 My Donor Sessions</h2>
        {donorRequests.length === 0 && <p className="muted small">No sessions yet</p>}
        <div className="stack">
          {donorRequests.map((r) => (
            <div key={r.id} className="request-card">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="mono">#{r.id}</div>
                <span className={`status ${r.status}`}>{r.status}</span>
              </div>
              <p className="small">
                Required: {r.energy.toString()} Wh | Delivered: {r.energyDelivered.toString()} Wh
              </p>
              <p className="muted small mono">Receiver: {r.receiver}</p>
              {r.status === "COMPLETED" && Number(r.energyDelivered) >= Number(r.energy) && (
                <p className="small" style={{ color: "#10b981" }}>✅ Full delivery — full payout received</p>
              )}
              {r.status === "COMPLETED" && Number(r.energyDelivered) < Number(r.energy) && (
                <p className="small" style={{ color: "#f59e0b" }}>
                  ⚠️ Partial delivery ({((Number(r.energyDelivered) / Number(r.energy)) * 100).toFixed(1)}%) — proportional payout
                </p>
              )}
              {r.status === "FAILED" && (
                <p className="danger small">
                  ❌ Energy too low ({((Number(r.energyDelivered) / Number(r.energy)) * 100).toFixed(1)}% of required) — no payout
                </p>
              )}
              {r.status === "DISPUTED" && (
                <p className="danger small">🚩 Under dispute</p>
              )}
              {r.signatureVerified && (
                <span className="pill" style={{ fontSize: "0.75rem" }}>🔏 Signed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>ℹ️ How Charging Works</h2>
        <p className="muted small">
          After you accept, a charging session page opens. The validator (backend simulator)
          handles startCharging and completeCharging on-chain. Energy validation runs automatically:
        </p>
        <ul className="muted small" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
          <li><strong>≥ 100% delivered</strong> → Full payout (minus platform fee)</li>
          <li><strong>90-99% delivered</strong> → Proportional payout + partial refund to receiver</li>
          <li><strong>&lt; 90% delivered</strong> → FAILED — full refund to receiver, no payout</li>
        </ul>
      </div>
    </div>
  );
};
