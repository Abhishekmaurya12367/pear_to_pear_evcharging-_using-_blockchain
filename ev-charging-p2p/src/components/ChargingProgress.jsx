import { useEffect, useState } from "react";

export default function ChargingProgress({ session, kwh }) {
  const [progress, setProgress] = useState(session?.progress ?? 0);

  useEffect(() => {
    if (!session?.startedAt || session?.endedAt) {
      setProgress(session?.progress ?? (session?.endedAt ? 100 : 0));
      return;
    }
    const totalMs = Math.max(8000, Number(kwh) * 200);
    const tick = () => {
      const elapsed = Date.now() - session.startedAt;
      const p = Math.min(100, Math.floor((elapsed / totalMs) * 100));
      setProgress(p);
    };
    tick();
    const id = setInterval(tick, 400);
    return () => clearInterval(id);
  }, [session?.startedAt, session?.endedAt, session?.progress, kwh]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Session progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-dim to-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
