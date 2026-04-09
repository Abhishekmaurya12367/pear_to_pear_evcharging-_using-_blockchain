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
}) {
  return (
    <div className="grid">
      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Phase 2 — Create Request (Receiver)</h2>
        <label>
          Energy required
          <input
            type="number"
            value={forms.create.energy}
            onChange={(e) => setForm("create", "energy", e.target.value)}
          />
        </label>
        <label>
          Price per kWh (wei)
          <input
            type="number"
            value={forms.create.price}
            onChange={(e) => setForm("create", "price", e.target.value)}
          />
        </label>
        <label>
          Location
          <input
            value={forms.create.location}
            onChange={(e) => setForm("create", "location", e.target.value)}
          />
        </label>
        <p className="small">Total cost (energy × price): {totalCost.toString()} wei</p>
        <button onClick={createRequest} disabled={needConnection || locked || !isVerified}>
          Create request (includes escrow deposit)
        </button>
        <p className="muted small">
          This design deposits escrow in the same transaction as request creation.
        </p>
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Refund (if expired/failed)</h2>
        <label>
          Request id
          <input
            value={forms.refund.id}
            onChange={(e) => setForm("refund", "id", e.target.value)}
          />
        </label>
        <button onClick={() => refundExpired(forms.refund.id)} disabled={needConnection || locked}>
          Claim refund (if expired)
        </button>
        <p className="muted small">
          Refund is allowed if nobody accepted in time, or charging timed out.
        </p>
      </div>
    </div>
  );
};
