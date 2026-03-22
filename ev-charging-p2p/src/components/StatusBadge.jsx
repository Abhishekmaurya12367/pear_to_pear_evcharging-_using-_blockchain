const styles = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  accepted: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  charging: "bg-accent/15 text-accent-glow border-accent/40",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  paid: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const labels = {
  pending: "Pending",
  accepted: "Accepted",
  charging: "Charging",
  completed: "Completed",
  paid: "Paid",
};

export default function StatusBadge({ status }) {
  const key = status === "paid" ? "paid" : status;
  const cls = styles[key] || styles.pending;
  const label = labels[key] || status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
