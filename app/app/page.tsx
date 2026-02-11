"use client";

import { useMemo, useState } from "react";
import MetricsCards from "@/components/MetricsCards";
import UsageTable from "@/components/UsageTable";

type RangeTab = "current" | "previous" | "last30";

type DailyRow = {
  date: string;
  priorityGB: number;
  standardGB: number;
  nonBillableGB: number;
  totalGB: number;
};

type CycleSummary = {
  startDate: string;
  endDate: string;
  totalPriorityGB: number;
  totalStandardGB: number;
  totalNonBillableGB: number;
  totalGB: number;
  avgPerDayGB: number;
  peakDayGB: number;
  peakDayDate: string | null;
  overage?: {
    pricePerGB: number | null;
    overageAmountGB: number | null;
    overagePrice: number | null;
    productId?: string | null;
  };
  daily: DailyRow[];
};

type Dashboard = {
  serviceLineNumber: string;
  accountNumber: string;
  lastUpdated: string;
  currentCycle: CycleSummary | null;
  previousCycle: CycleSummary | null;
  last30Days: {
    totalGB: number;
    avgPerDayGB: number;
    peakDayGB: number;
    peakDayDate: string | null;
    daily: DailyRow[];
  };
  cycles: { startDate: string; endDate: string }[];
};

function fmtISODate(iso: string) {
  // "2026-02-09T21:39:..." -> "2026-02-09"
  return iso?.slice?.(0, 10) ?? iso;
}

export default function Page() {
  const [serviceLineNumber, setServiceLineNumber] = useState("");
  const [tab, setTab] = useState<RangeTab>("current");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);

  const canQuery = useMemo(() => serviceLineNumber.trim().length > 6, [serviceLineNumber]);
  function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

  async function onQuery() {
    if (!canQuery) return;

    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ serviceLineNumber: serviceLineNumber.trim() });
      const res = await fetch(`/api/starlink/usage?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Request failed");

      setData(json);
      if (!json?.currentCycle) setTab("last30");
    } catch (e: unknown) {
      setErr(errorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const view = useMemo(() => {
    if (!data) return null;
    if (tab === "previous") {
  return data.previousCycle
    ? {
        title: "Previous billing cycle",
        subtitle: `${fmtISODate(data.previousCycle.startDate)} → ${fmtISODate(
          data.previousCycle.endDate
        )}`,
        metrics: {
          totalGB: data.previousCycle.totalGB,
          priorityGB: data.previousCycle.totalPriorityGB,
          standardGB: data.previousCycle.totalStandardGB,
          nonBillableGB: data.previousCycle.totalNonBillableGB,
          avgPerDayGB: data.previousCycle.avgPerDayGB,
          peakDayGB: data.previousCycle.peakDayGB,
          peakDayDate: data.previousCycle.peakDayDate,
          overage: data.previousCycle.overage,
        },
        daily: data.previousCycle.daily,
      }
    : null;
}
    if (tab === "current") {
      return data.currentCycle
        ? {
            title: "Current billing cycle",
            subtitle: `${fmtISODate(data.currentCycle.startDate)} → ${fmtISODate(data.currentCycle.endDate)}`,
            metrics: {
              totalGB: data.currentCycle.totalGB,
              priorityGB: data.currentCycle.totalPriorityGB,
              standardGB: data.currentCycle.totalStandardGB,
              nonBillableGB: data.currentCycle.totalNonBillableGB,
              avgPerDayGB: data.currentCycle.avgPerDayGB,
              peakDayGB: data.currentCycle.peakDayGB,
              peakDayDate: data.currentCycle.peakDayDate,
              overage: data.currentCycle.overage,
            },
            daily: data.currentCycle.daily,
          }
        : null;
    }
    return {
      title: "Last 30 days",
      subtitle: "Rolling window (across cycles)",
      metrics: {
        totalGB: data.last30Days.totalGB,
        priorityGB: null,
        standardGB: null,
        nonBillableGB: null,
        avgPerDayGB: data.last30Days.avgPerDayGB,
        peakDayGB: data.last30Days.peakDayGB,
        peakDayDate: data.last30Days.peakDayDate,
        overage: undefined,
      },
      daily: data.last30Days.daily,
    };
  }, [data, tab]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Starlink Data Usage</h1>
          <p className="text-zinc-400 text-sm">
            Stateless dashboard: pega un <span className="font-mono">serviceLineNumber</span>, consulta y listo.
          </p>
        </header>

        {/* Query bar */}
        <section className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-400">Service Line Number</label>
              <input
                value={serviceLineNumber}
                onChange={(e) => setServiceLineNumber(e.target.value)}
                placeholder="SL-DF-9559710-12363-59"
                className="mt-1 w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm outline-none focus:border-zinc-600"
              />
            </div>

            <button
              onClick={onQuery}
              disabled={!canQuery || loading}
              className="rounded-xl px-4 py-2 bg-zinc-100 text-zinc-950 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>

          {err && (
            <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}

          {data && (
            <div className="mt-3 text-xs text-zinc-400 flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
              <div>
                Account: <span className="text-zinc-200 font-mono">{data.accountNumber}</span>
              </div>
              <div>
                Service line: <span className="text-zinc-200 font-mono">{data.serviceLineNumber}</span>
              </div>
              <div>
                Last updated: <span className="text-zinc-200 font-mono">{data.lastUpdated}</span>
              </div>
            </div>
          )}
        </section>

        {/* Tabs */}
        <section className="flex gap-2">
          <button
            onClick={() => setTab("current")}
            disabled={!data?.currentCycle}
            className={[
              "px-3 py-2 rounded-xl border text-sm",
              tab === "current"
                ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                : "bg-transparent text-zinc-200 border-zinc-800 hover:border-zinc-600",
              !data?.currentCycle ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Current cycle
          </button>
         <button
          onClick={() => setTab("previous")}
          disabled={!data?.previousCycle}
          className={[
            "px-3 py-2 rounded-xl border text-sm",
            tab === "previous"
              ? "bg-zinc-100 text-zinc-950 border-zinc-100"
              : "bg-transparent text-zinc-200 border-zinc-800 hover:border-zinc-600",
            !data?.previousCycle ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          Previous cycle
        </button>
          <button
            onClick={() => setTab("last30")}
            className={[
              "px-3 py-2 rounded-xl border text-sm",
              tab === "last30"
                ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                : "bg-transparent text-zinc-200 border-zinc-800 hover:border-zinc-600",
            ].join(" ")}
          >
            Last 30 days
          </button>

        </section>

        {/* Dashboard */}
        {view ? (
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{view.title}</h2>
                <p className="text-zinc-400 text-sm">{view.subtitle}</p>
              </div>
            </div>

            <MetricsCards metrics={view.metrics} />

            <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-4">
              <h3 className="font-medium">Daily breakdown</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Totals are per-day: priority + standard + non-billable.
              </p>

              <div className="mt-3">
                <UsageTable rows={view.daily} />
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 text-zinc-400">
            Ingresa un <span className="font-mono">serviceLineNumber</span> y consulta para ver datos.
          </section>
        )}
      </div>
    </main>
  );
}
