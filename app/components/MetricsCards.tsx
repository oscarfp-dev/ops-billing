type Metrics = {
  totalGB: number;
  priorityGB: number | null;
  standardGB: number | null;
  nonBillableGB: number | null;
  avgPerDayGB: number;
  peakDayGB: number;
  peakDayDate: string | null;
  overage?: {
    pricePerGB: number | null;
    overageAmountGB: number | null;
    overagePrice: number | null;
    productId?: string | null;
  };
};

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(2);
}

export default function MetricsCards({ metrics }: { metrics: Metrics }) {
  const hasOverage = !!metrics.overage;

  const cards: { label: string; value: string; hint?: string }[] = [
    { label: "Total (GB)", value: fmt(metrics.totalGB) },
    { label: "Avg / day (GB)", value: fmt(metrics.avgPerDayGB) },
    { label: "Peak day (GB)", value: fmt(metrics.peakDayGB), hint: metrics.peakDayDate ?? undefined },
  ];

  if (metrics.priorityGB !== null) cards.splice(1, 0, { label: "Priority (GB)", value: fmt(metrics.priorityGB) });
  if (metrics.standardGB !== null) cards.push({ label: "Standard (GB)", value: fmt(metrics.standardGB) });
  if (metrics.nonBillableGB !== null) cards.push({ label: "Non-billable (GB)", value: fmt(metrics.nonBillableGB) });

  if (hasOverage) {
    cards.push({
      label: "Overage (GB)",
      value: fmt(metrics.overage?.overageAmountGB ?? null),
      hint: metrics.overage?.productId ?? undefined,
    });
    cards.push({
      label: "Overage ($)",
      value: metrics.overage?.overagePrice == null ? "—" : String(metrics.overage?.overagePrice),
      hint: metrics.overage?.pricePerGB == null ? undefined : `$${metrics.overage?.pricePerGB}/GB`,
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-4">
          <div className="text-xs text-zinc-400">{c.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{c.value}</div>
          {c.hint && <div className="mt-1 text-xs text-zinc-500 font-mono break-all">{c.hint}</div>}
        </div>
      ))}
    </div>
  );
}
