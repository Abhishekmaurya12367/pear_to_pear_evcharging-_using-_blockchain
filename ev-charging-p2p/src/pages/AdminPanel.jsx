import { useState } from "react";
import { useStore } from "../store/useStore";

export default function AdminPanel() {
  const {
    walletAddress,
    adminAddress,
    verifyUser,
    getUserProfile,
    setAdminAddress,
  } = useStore();

  const [addr, setAddr] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function fetchStatus() {
    setErr(null);
    setStatus(null);
    setLoading(true);
    try {
      const profile = await getUserProfile(addr);
      setStatus(profile);
    } catch (e) {
      setErr(e?.message || "Unable to fetch profile.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setErr(null);
    setLoading(true);
    try {
      await verifyUser(addr);
      const profile = await getUserProfile(addr);
      setStatus(profile);
    } catch (e) {
      setErr(e?.message || "Verify failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-white">
      <h1 className="text-2xl font-bold">Admin panel</h1>
      <p className="mt-1 text-sm text-slate-400">
        Connect with the registry admin wallet to verify registered users.
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-surface-border bg-surface p-4">
        <p className="text-sm text-slate-300">
          Connected wallet: <span className="font-mono">{walletAddress || "none"}</span>
        </p>
        <p className="text-sm text-slate-300">
          Registry admin (from contract):{" "}
          <span className="font-mono">{adminAddress || "fetch after first verify attempt"}</span>
        </p>
        <p className="text-xs text-slate-500">
          Users must register themselves first (Userregistry.register_user). Admin can only verify.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchStatus();
        }}
        className="mt-6 space-y-3 rounded-2xl border border-surface-border bg-surface p-6 shadow-card"
      >
        <label className="text-xs font-medium text-slate-400">User address</label>
        <input
          className="w-full rounded-xl border border-surface-border bg-ink-900 px-4 py-3 font-mono text-sm text-white outline-none focus:border-accent"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="0x..."
          required
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600"
            disabled={loading}
          >
            {loading ? "Checking..." : "Check status"}
          </button>
          <button
            type="button"
            onClick={onVerify}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent-dim disabled:opacity-50"
            disabled={loading || !status || status.isvarified}
          >
            {loading ? "Verifying..." : status?.isvarified ? "Already verified" : "Verify user"}
          </button>
        </div>
        {err ? (
          <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{err}</p>
        ) : null}
        {status ? (
          <div className="rounded-lg border border-surface-border bg-ink-900 p-3 text-sm text-slate-200">
            <div>Registered: {status.isRegister ? "yes" : "no"}</div>
            <div>Verified: {status.isvarified ? "yes" : "no"}</div>
            <div>Role: {status.role ?? "n/a"}</div>
            <div>Battery: {status.batterycapacity?.toString?.() ?? "n/a"}</div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
