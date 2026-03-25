import { useStore } from "../store/useStore";
import RequestCard from "../components/RequestCard";
import { useState } from "react";

export default function DonorDashboard() {
  const [error, setError] = useState(null);
  const walletAddress = useStore((s) => s.walletAddress);
  const requests = useStore((s) => s.requests);
  const donorAccept = useStore((s) => s.donorAccept);
  const startChargingSession = useStore((s) => s.startChargingSession);
  const completeChargingSession = useStore((s) => s.completeChargingSession);

  // Show all pending requests, including ones created by the same wallet (handy for demo/testing).
  const pending = requests.filter((r) => r.status === "pending");

  const myActive = requests.filter(
    (r) =>
      r.donor?.toLowerCase() === walletAddress?.toLowerCase() &&
      ["accepted", "charging", "completed"].includes(r.status)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Donor dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Accept open requests and control charging for sessions you own.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">Incoming requests</h2>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500 sm:col-span-2">No open requests.</p>
        ) : (
          pending.map((req) => (
            <RequestCard key={req.id} req={req}>
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  try {
                    await donorAccept(req.id);
                  } catch (e) {
                    setError(e?.message || "Failed to accept request.");
                  }
                }}
                className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-500"
              >
                acceptRequest()
              </button>
            </RequestCard>
          ))
        )}
      </div>

      <h2 className="mt-12 text-lg font-semibold text-white">Your sessions</h2>
      <div className="mt-4 space-y-4">
        {myActive.length === 0 ? (
          <p className="text-sm text-slate-500">No active sessions.</p>
        ) : (
          myActive.map((req) => (
            <RequestCard key={req.id} req={req}>
              {req.status === "accepted" && (
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    try {
                      await startChargingSession(req.id);
                    } catch (e) {
                      setError(e?.message || "Failed to start charging.");
                    }
                  }}
                  className="w-full rounded-xl bg-accent py-3 font-semibold text-ink-950"
                >
                  Start charging
                </button>
              )}
              {req.status === "charging" && (
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    try {
                      await completeChargingSession(req.id);
                    } catch (e) {
                      setError(e?.message || "Failed to end charging.");
                    }
                  }}
                  className="w-full rounded-xl border border-white/20 py-3 font-medium text-white"
                >
                  End charging (donor confirm)
                </button>
              )}
              {req.status === "completed" && (
                <p className="text-sm text-slate-400">
                  Session completed. Receiver can call <code className="text-slate-300">releasePayment()</code>.
                </p>
              )}
            </RequestCard>
          ))
        )}
      </div>
    </div>
  );
}
