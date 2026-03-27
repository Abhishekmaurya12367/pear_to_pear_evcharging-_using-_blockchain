// Defines window.ReceiverView
window.ReceiverView = function ReceiverView({
  locked,
  needConnection,
  forms,
  setForm,
  totalCost,
  createRequest,
  depositEscrow,
  isVerified,
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
          Create request
        </button>
        <p className="muted small">
          Deposit to escrow is only allowed when status is ACCEPTED (contract rule). After donor
          accepts, click Deposit below.
        </p>
      </div>

      <div className={`card ${locked ? "locked" : ""}`}>
        <h2>Phase 5 — Escrow</h2>
        <label>
          Request id
          <input
            value={forms.deposit.id}
            onChange={(e) => setForm("deposit", "id", e.target.value)}
          />
        </label>
        <button onClick={() => depositEscrow(forms.deposit.id)} disabled={needConnection || locked}>
          Deposit full amount
        </button>
        <p className="muted small">
          Escrow deposit succeeds only when request status is ACCEPTED. Ensure donor accepted and status updated.
        </p>
      </div>
    </div>
  );
};
