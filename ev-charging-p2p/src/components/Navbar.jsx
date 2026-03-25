import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { connectMetaMask } from "../lib/wallet";

function shortAddr(a) {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

export default function Navbar() {
  const navigate = useNavigate();
  const {
    walletAddress,
    role,
    disconnect,
    setRole,
    setWallet,
  } = useStore();

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-ink-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to={
            role === "receiver"
              ? "/receiver"
              : role === "donor"
                ? "/donor"
                : "/role"
          }
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-lg">
            ⚡
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">EV Charge</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              P2P
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {role && (
            <span className="hidden rounded-full bg-surface-raised px-3 py-1 text-xs font-medium text-slate-300 sm:inline">
              {role === "donor" ? "Donor" : "Receiver"}
            </span>
          )}
          <Link
            to="/admin"
            className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-accent/50 hover:text-white"
          >
            Admin
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-3 py-1.5 font-mono text-xs text-slate-200">
            {shortAddr(walletAddress) || "Not connected"}
          </div>
          {!walletAddress && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const { provider, signer, address, chainId } =
                    await connectMetaMask();
                  setWallet({ address, signer, provider, chainId });
                } catch (e) {
                  // surface in console; UI already shows not connected
                  console.warn("MetaMask connect failed:", e);
                }
              }}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-accent-dim"
            >
              Connect wallet
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setRole(null);
              navigate("/role");
            }}
            className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-accent/50 hover:text-white"
          >
            Switch role
          </button>
          <button
            type="button"
            onClick={() => {
              disconnect();
              navigate("/");
            }}
            className="rounded-full bg-surface-raised px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-red-500/20 hover:text-red-200"
          >
            Disconnect
          </button>
        </div>
      </div>
    </header>
  );
}
