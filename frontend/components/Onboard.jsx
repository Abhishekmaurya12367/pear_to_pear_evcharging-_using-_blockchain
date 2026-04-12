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
  batchVerifyUsers,
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
            placeholder="e.g. Tesla Model 3"
          />
        </label>
        <label>
          Battery capacity (Wh)
          <input
            type="number"
            value={forms.register.battery}
            onChange={(e) => setForm("register", "battery", e.target.value)}
            placeholder="e.g. 75000"
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
        {userSelf?.isRegister && (
          <div className="success-badge" style={{ marginTop: 12 }}>
            ✅ Registered as {userSelf.roleText}
            {userSelf.isvarified ? " · Verified" : " · Awaiting verification"}
          </div>
        )}
        <p className="muted small">
          After registering, pick your dashboard. Admin verification may still be required.
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
            ⚡ Receiver view
          </button>
          <button
            style={{ flex: 1 }}
            onClick={() => setCurrentPage("donor")}
            disabled={!userSelf?.isRegister}
          >
            🔋 Donor view
          </button>
          <button
            style={{ flex: 1 }}
            onClick={() => setCurrentPage("stats")}
          >
            📊 Stats
          </button>
        </div>
        <p className="muted small">You can switch views anytime from the top nav.</p>
        {adminAddress && (
          <p className="muted small mono">Admin wallet (verify from this): {adminAddress}</p>
        )}
        <div className="divider" />
        <h3>Admin — Verify Users</h3>
        <p className="muted small">
          Connect with admin/verifier wallet. Paste user address and click Verify.
        </p>
        <label>
          User address to verify
          <input
            value={forms.verify?.addr || ""}
            onChange={(e) => setForm("verify", "addr", e.target.value)}
            placeholder="0x..."
          />
        </label>
        <button onClick={() => verifyUser(forms.verify?.addr)} disabled={needConnection}>
          Verify this user
        </button>

        <div className="divider" />
        <h3>Batch Verify (multiple addresses)</h3>
        <p className="muted small">
          Paste comma-separated or newline-separated addresses.
        </p>
        <label>
          Addresses
          <textarea
            rows="3"
            value={forms.batchVerify?.addrs || ""}
            onChange={(e) => setForm("batchVerify", "addrs", e.target.value)}
            placeholder="0xAbc..., 0xDef..."
            style={{ resize: "vertical", minHeight: 60 }}
          />
        </label>
        <button onClick={batchVerifyUsers} disabled={needConnection}>
          Batch Verify All
        </button>
      </div>
    </div>
  );
};
