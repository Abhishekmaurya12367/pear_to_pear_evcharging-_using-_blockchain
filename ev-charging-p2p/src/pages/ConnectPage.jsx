import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { connectMetaMask } from "../lib/wallet";

export default function ConnectPage() {
  const navigate = useNavigate();
  const setWallet = useStore((s) => s.setWallet);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onMetaMask() {
    setErr(null);
    setBusy(true);
    try {
      const { provider, signer, address, chainId } = await connectMetaMask();
      setWallet({
        address,
        signer,
        provider,
        chainId,
      });
      navigate("/role");
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950 px-4">
      <div className="mb-10 text-center">
        <p className="text-4xl font-bold tracking-tight text-white">EV Charge</p>
        <p className="mt-2 text-balance text-slate-400">
          Peer-to-peer charging. Connect your wallet to continue — no passwords.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4 rounded-3xl border border-surface-border bg-surface p-8 shadow-card">
        <h1 className="text-center text-lg font-semibold text-white">
          Sign in with wallet
        </h1>
        <button
          type="button"
          disabled={busy}
          onClick={onMetaMask}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-semibold text-ink-950 shadow-glow transition hover:bg-accent-dim disabled:opacity-50"
        >
          {busy ? "Connecting…" : "Connect MetaMask"}
        </button>
        <div className="relative py-2 text-center text-xs text-slate-500">
          <span className="bg-surface px-2">or try without wallet</span>
        </div>
        {err ? (
          <p className="rounded-xl bg-red-500/10 p-3 text-center text-sm text-red-300">
            {err}
          </p>
        ) : null}
      </div>
      <p className="mt-8 max-w-sm text-center text-xs text-slate-600">
        MetaMask will call your deployed contracts using addresses from <code className="text-slate-500">.env</code>.
      </p>
    </div>
  );
}
