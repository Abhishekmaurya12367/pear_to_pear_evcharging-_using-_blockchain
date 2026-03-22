import { useState } from "react";
import { useStore } from "../store/useStore";
import RequestCard from "../components/RequestCard";
import ChargingProgress from "../components/ChargingProgress";

export default function ReceiverDashboard() {
  const walletAddress = useStore((s) => s.walletAddress);
  const requests = useStore((s) => s.requests);
  const sessions = useStore((s) => s.sessions);
  const submitCreateRequest = useStore((s) => s.submitCreateRequest);
  const startChargingSession = useStore((s) => s.startChargingSession);
  const completeChargingSession = useStore((s) => s.completeChargingSession);
  const releasePaymentTx = useStore((s) => s.releasePaymentTx);

  const [loc, setLoc] = useState("");
  const [kwh, setKwh] = useState("");
  const [slot, setSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mine = requests.filter(
    (r) => r.receiver?.toLowerCase() === walletAddress?.toLowerCase()
  );

  async function onCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitCreateRequest(loc.trim(), kwh, slot.trim());
      setLoc("");
      setKwh("");
      setSlot("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Receiver dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Create a charging request and follow status through completion and payment.
      </p>

      <form
        onSubmit={onCreate}
        className="mt-8 space-y-4 rounded-3xl border border-surface-border bg-surface p-6 shadow-card"
      >
        <h2 className="font-semibold text-white">New charging request</h2>
        <div>
          <label className="text-xs font-medium text-slate-400">Location</label>
          <input
            className="mt-1 w-full rounded-xl border border-surface-border bg-ink-900 px-4 py-3 text-white outline-none focus:border-accent"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            placeholder="Station name or map pin"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Required charge (kWh)</label>
          <input
            className="mt-1 w-full rounded-xl border border-surface-border bg-ink-900 px-4 py-3 text-white outline-none focus:border-accent"
            type="number"
            min="1"
            step="0.1"
            value={kwh}
            onChange={(e) => setKwh(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Time slot</label>
          <input
            className="mt-1 w-full rounded-xl border border-surface-border bg-ink-900 px-4 py-3 text-white outline-none focus:border-accent"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder="e.g. Today 15:00–17:00"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-accent py-3.5 font-semibold text-ink-950 transition hover:bg-accent-dim disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit to blockchain"}
        </button>
      </form>

      <h2 className="mt-12 text-lg font-semibold text-white">Your requests</h2>
      <div className="mt-4 space-y-4">
        {mine.length === 0 ? (
          <p className="text-sm text-slate-500">No requests yet.</p>
        ) : (
          mine.map((req) => (
            <RequestCard key={req.id} req={req}>
              {req.status === "pending" && (
                <p className="text-sm text-amber-200/90">
                  Waiting for a donor to accept your request.
                </p>
              )}
              {req.status === "accepted" && (
                <button
                  type="button"
                  onClick={() => startChargingSession(req.id)}
                  className="w-full rounded-xl bg-accent py-3 font-semibold text-ink-950"
                >
                  Start charging
                </button>
              )}
              {req.status === "charging" && (
                <>
                  <ChargingProgress session={sessions[req.id]} kwh={req.kwh} />
                  <button
                    type="button"
                    onClick={() => completeChargingSession(req.id)}
                    className="w-full rounded-xl border border-accent/50 py-3 font-medium text-accent-glow"
                  >
                    End charging (receiver confirm)
                  </button>
                </>
              )}
              {req.status === "completed" && !req.paymentReleased && (
                <button
                  type="button"
                  onClick={() => releasePaymentTx(req.id)}
                  className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500"
                >
                  releasePayment()
                </button>
              )}
              {req.paymentReleased && (
                <p className="text-sm text-emerald-300">Payment released on-chain.</p>
              )}
            </RequestCard>
          ))
        )}
      </div>
    </div>
  );
}
