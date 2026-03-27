// Defines window.Onboard
window.Onboard = function Onboard({
  forms,
  setForm,
  needConnection,
  registerUser,
  userSelf,
  setCurrentPage,
  adminAddress,
  verifyUser,
}) {
  return (
    <div className="grid">
      <div className="card">
        <h2>Step 1 — Connect & Register</h2>
        <label>
          EV model
          <input
            value={forms.register.ev}
            onChange={(e) => setForm("register", "ev", e.target.value)}
          />
        </label>
        <label>
          Battery capacity
          <input
            type="number"
            value={forms.register.battery}
            onChange={(e) => setForm("register", "battery", e.target.value)}
          />
        </label>
        <label>
          Choose role
          <select
            value={forms.register.role}
            onChange={(e) => setForm("register", "role", e.target.value)}
          >
            <option value="1">DONOR</option>
            <option value="2">RECEIVER</option>
            <option value="3">BOTH</option>
          </select>
        </label>
        <label className="row" style={{ alignItems: "center" }}>
          <input
            type="checkbox"
            checked={forms.register.autoVerify}
            onChange={(e) => setForm("register", "autoVerify", e.target.checked)}
          />
          <span className="small">Try auto-verify after register (requires admin wallet)</span>
        </label>
        <button onClick={registerUser} disabled={needConnection}>
          Register
        </button>
        <p className="muted small">
          After registering, pick your dashboard. Admin verification may still be required by the contract.
        </p>
      </div>

      <div className="card">
        <h2>Step 2 — Go to your dashboard</h2>
        <div className="row" style={{ gap: 12 }}>
          <button
            style={{ flex: 1 }}
            onClick={() => setCurrentPage("receiver")}
            disabled={!userSelf?.isRegister}
          >
            Receiver view
          </button>
          <button
            style={{ flex: 1 }}
            onClick={() => setCurrentPage("donor")}
            disabled={!userSelf?.isRegister}
          >
            Donor view
          </button>
        </div>
        <p className="muted small">You can switch views anytime from the top nav.</p>
        {adminAddress && (
          <p className="muted small mono">Admin wallet (verify from this): {adminAddress}</p>
        )}
        <div className="divider" />
        <h3>Admin quick verify</h3>
        <p className="muted small">
          1) Connect with admin wallet. 2) Paste user address. 3) Click Verify.
        </p>
        <label>
          User address to verify
          <input
            value={forms.verify?.addr || ""}
            onChange={(e) => setForm("verify", "addr", e.target.value)}
          />
        </label>
        <button onClick={() => verifyUser(forms.verify?.addr)} disabled={needConnection}>
          Verify this user (admin only)
        </button>
      </div>
    </div>
  );
};
