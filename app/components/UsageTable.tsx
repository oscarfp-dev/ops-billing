type Row = {
  date: string; // YYYY-MM-DD
  priorityGB: number;
  standardGB: number;
  nonBillableGB: number;
  totalGB: number;
};

function fmt(n: number) {
  return n.toFixed(2);
}

export default function UsageTable({ rows }: { rows: Row[] }) {
  if (!rows?.length) {
    return <div className="text-sm text-zinc-400">No daily data available.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-950">
          <tr className="text-zinc-300">
            <th className="text-left font-medium px-3 py-2">Date</th>
            <th className="text-right font-medium px-3 py-2">Priority (GB)</th>
            <th className="text-right font-medium px-3 py-2">Standard (GB)</th>
            <th className="text-right font-medium px-3 py-2">Non-billable (GB)</th>
            <th className="text-right font-medium px-3 py-2">Total (GB)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-t border-zinc-800 hover:bg-zinc-900/50">
              <td className="px-3 py-2 font-mono text-zinc-200">{r.date}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(r.priorityGB)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(r.standardGB)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(r.nonBillableGB)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(r.totalGB)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
