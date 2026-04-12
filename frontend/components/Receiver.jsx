// Defines window.ReceiverView
window.ReceiverView = function ReceiverView({
  locked,
  needConnection,
  forms,
  setForm,
  totalCost,
  createRequest,
  isVerified,
  refundExpired,
  openDispute,
  cancelOpen,
  myRequests,
  account,
}) {
  // Filter to receiver's requests
  const receiverRequests = (myRequests || []).filter(
    (r) => account && r.receiver.toLowerCase() === account.toLowerCase()
  );

  return (
    <div className="grid">
      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>⚡ Create Charging Request</h2>
        <label>
          Energy required (Wh)
          <input
            type="number"
            value={forms.create.energy}
            onChange={(e) => setForm("create", "energy", e.target.value)}
            placeholder="e.g. 1000"
          />
        </label>
        <label>
          Price per Wh (wei)
          <input
            type="number"
            value={forms.create.price}
            onChange={(e) => setForm("create", "price", e.target.value)}
            placeholder="e.g. 1000000000000000"
          />
        </label>
        <label>
          Location
          <input
            value={forms.create.location}
            onChange={(e) => setForm("create", "location", e.target.value)}
            placeholder="e.g. Delhi, India"
          />
        </label>
        <p className="small">Total escrow (energy × price): {totalCost.toString()} wei</p>
        <button onClick={createRequest} disabled={needConnection || locked || !isVerified}>
          Create Request + Deposit Escrow
        </button>
        {!isVerified && (
          <p className="danger small" style={{ marginTop: 8 }}>
            ⚠️ Your account is not verified. Ask admin to verify you first.
          </p>
        )}
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>🔙 Refund / Cancel / Dispute</h2>
        <label>
          Request ID
          <input
            value={forms.refund.id}
            onChange={(e) => setForm("refund", "id", e.target.value)}
            placeholder="Request ID"
          />
        </label>
        <div className="row" style={{ gap: 8 }}>
          <button
            style={{ flex: 1 }}
            onClick={() => cancelOpen(forms.refund.id)}
            disabled={needConnection || locked}
          >
            Cancel (if OPEN)
          </button>
          <button
            style={{ flex: 1 }}
            onClick={() => refundExpired(forms.refund.id)}
            disabled={needConnection || locked}
          >
            Refund (if expired)
          </button>
          <button
            style={{ flex: 1 }}
            onClick={() => openDispute(forms.refund.id)}
            disabled={needConnection || locked}
            className="dispute-btn"
          >
            🚩 Open Dispute
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          <strong>Cancel:</strong> Only for OPEN requests. <strong>Refund:</strong> After timeout expires.
          <strong> Dispute:</strong> Within 1hr after completion if energy delivery was unsatisfactory.
        </p>
      </div>

      {/* My Requests */}
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <h2>📋 My Requests</h2>
        {receiverRequests.length === 0 && <p className="muted small">No requests found</p>}
        <div className="stack">
          {receiverRequests.map((r) => (
            <div key={r.id} className="request-card">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="mono">#{r.id}</div>
                <span className={`status ${r.status}`}>{r.status}</span>
              </div>
              <p className="small">
                Energy: {r.energy.toString()} Wh | Delivered: {r.energyDelivered.toString()} Wh
              </p>
              <p className="small">Price: {r.price.toString()} wei/Wh</p>
              <p className="small">Total: {r.total.toString()} wei</p>
              <p className="muted small">📍 {r.location}</p>
              {r.donor && r.donor !== "0x0000000000000000000000000000000000000000" && (
                <p className="muted small mono">Donor: {r.donor}</p>
              )}
              {r.signatureVerified && (
                <span className="pill" style={{ fontSize: "0.75rem" }}>🔏 Signature verified</span>
              )}
              {r.status === "FAILED" && (
                <p className="danger small">❌ Energy validation failed — escrow refunded to you.</p>
              )}
              {r.status === "DISPUTED" && (
                <p className="danger small">🚩 Under dispute — awaiting admin resolution.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
