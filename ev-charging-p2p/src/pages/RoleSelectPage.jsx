import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

export default function RoleSelectPage() {
  const navigate = useNavigate();
  const setRole = useStore((s) => s.setRole);

  function pick(role) {
    setRole(role);
    navigate(role === "donor" ? "/donor" : "/receiver");
  }

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-16">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-white">How will you use EV Charge?</h1>
        <p className="mt-2 text-sm text-slate-400">
          Stored only in this browser (Zustand + localStorage). Switch anytime from the navbar.
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => pick("donor")}
          className="group rounded-3xl border border-surface-border bg-surface p-8 text-left shadow-card transition hover:border-accent/50 hover:shadow-glow"
        >
          <div className="text-3xl">🔌</div>
          <h2 className="mt-4 text-xl font-bold text-white group-hover:text-accent-glow">
            I am a Donor
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Charging station owner — view incoming requests, accept, start and end sessions.
          </p>
        </button>
        <button
          type="button"
          onClick={() => pick("receiver")}
          className="group rounded-3xl border border-surface-border bg-surface p-8 text-left shadow-card transition hover:border-sky-500/40 hover:shadow-glow"
        >
          <div className="text-3xl">🚗</div>
          <h2 className="mt-4 text-xl font-bold text-white group-hover:text-sky-300">
            I am a Receiver
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            EV driver — book energy, track status, start charging, and release payment.
          </p>
        </button>
      </div>
    </div>
  );
}
