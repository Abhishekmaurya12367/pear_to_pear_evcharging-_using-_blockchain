import StatusBadge from "./StatusBadge";

export default function RequestCard({
  req,
  children,
  footer,
}) {
  return (
    <article className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card transition hover:border-slate-600 hover:shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{req.location}</p>
          <p className="mt-1 text-sm text-slate-400">
            {req.kwh} kWh · {req.timeSlot}
          </p>
          <p className="mt-2 font-mono text-xs text-slate-500">
            ID {req.id}
          </p>
        </div>
        <StatusBadge status={req.paymentReleased ? "paid" : req.status} />
      </div>
      {req.status === "accepted" || req.status === "charging" || req.status === "completed" ? (
        <div className="mt-4 rounded-xl bg-ink-800/80 p-3 text-sm">
          <p className="text-slate-500">Donor</p>
          <p className="font-mono text-slate-200">
            {req.donor || "—"}
          </p>
        </div>
      ) : null}
      {children ? <div className="mt-4 space-y-3">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-surface-border pt-4">{footer}</div> : null}
    </article>
  );
}
