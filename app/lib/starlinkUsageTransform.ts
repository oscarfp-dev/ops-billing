export type DailyRow = {
  date: string; // YYYY-MM-DD
  priorityGB: number;
  standardGB: number;
  nonBillableGB: number;
  totalGB: number;
};

export type CycleSummary = {
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

export type Dashboard = {
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

/** ✅ Tipos mínimos para tu API (solo lo que usas) */
type ApiDailyUsage = {
  date: string;
  priorityGB?: number | string | null;
  standardGB?: number | string | null;
  nonBillableGB?: number | string | null;
};

type ApiOverageLine = {
  pricePerGB?: number | null;
  overageAmountGB?: number | null;
  overagePrice?: number | null;
  productId?: string | null;
};

type ApiBillingCycle = {
  startDate: string;
  endDate: string;
  dailyDataUsage?: ApiDailyUsage[];
  overageLines?: ApiOverageLine[];
  totalPriorityGB?: number | string | null;
  totalStandardGB?: number | string | null;
  totalNonBillableGB?: number | string | null;
};

type ApiResultItem = {
  serviceLineNumber: string;
  accountNumber: string;
  lastUpdated: string;
  billingCycles?: ApiBillingCycle[];
};

type ApiResponse = {
  content?: {
    results?: ApiResultItem[];
  };
};

function toISODateOnly(iso: string) {
  return iso.slice(0, 10);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** ✅ Ya no any */
function normalizeDaily(d: ApiDailyUsage): DailyRow {
  const priorityGB = Number(d.priorityGB ?? 0);
  const standardGB = Number(d.standardGB ?? 0);
  const nonBillableGB = Number(d.nonBillableGB ?? 0);

  return {
    date: toISODateOnly(String(d.date)),
    priorityGB: round2(priorityGB),
    standardGB: round2(standardGB),
    nonBillableGB: round2(nonBillableGB),
    totalGB: round2(priorityGB + standardGB + nonBillableGB),
  };
}

function summarizeDaily(daily: DailyRow[]) {
  const totalGB = round2(daily.reduce((a, r) => a + r.totalGB, 0));
  const days = Math.max(1, daily.length);
  const avgPerDayGB = round2(totalGB / days);

  let peakDayGB = 0;
  let peakDayDate: string | null = null;

  for (const r of daily) {
    if (r.totalGB > peakDayGB) {
      peakDayGB = r.totalGB;
      peakDayDate = r.date;
    }
  }

  return { totalGB, avgPerDayGB, peakDayGB: round2(peakDayGB), peakDayDate };
}

/** ✅ Ya no any */
function pickOverageFromCycle(cycle: ApiBillingCycle): CycleSummary["overage"] | undefined {
  const line = Array.isArray(cycle.overageLines) ? cycle.overageLines[0] : undefined;
  if (!line) return undefined;

  return {
    pricePerGB: line.pricePerGB ?? null,
    overageAmountGB: line.overageAmountGB ?? null,
    overagePrice: line.overagePrice ?? null,
    productId: line.productId ?? null,
  };
}

/** ✅ Ya no any */
function buildCycleSummary(cycle: ApiBillingCycle): CycleSummary {
  const daily: DailyRow[] = (cycle.dailyDataUsage ?? []).map(normalizeDaily);
  const { totalGB, avgPerDayGB, peakDayGB, peakDayDate } = summarizeDaily(daily);

  return {
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    totalPriorityGB: Number(cycle.totalPriorityGB ?? 0),
    totalStandardGB: Number(cycle.totalStandardGB ?? 0),
    totalNonBillableGB: Number(cycle.totalNonBillableGB ?? 0),
    totalGB,
    avgPerDayGB,
    peakDayGB,
    peakDayDate,
    overage: pickOverageFromCycle(cycle),
    daily,
  };
}

/** ✅ cycles tipado, y c inferido */
function findCurrentCycle(cycles: ApiBillingCycle[], now = new Date()) {
  const t = now.getTime();
  return (
    cycles.find((c) => {
      const s = new Date(c.startDate).getTime();
      const e = new Date(c.endDate).getTime();
      return t >= s && t < e;
    }) ?? null
  );
}

/** ✅ apiJson ya no any */
export function buildDashboardFromResponse(apiJson: ApiResponse, now = new Date()): Dashboard {
  const item = apiJson.content?.results?.[0];
  if (!item) throw new Error("No results[0] in response");

  const cyclesRaw: ApiBillingCycle[] = item.billingCycles ?? [];
  const cyclesSummaries: CycleSummary[] = cyclesRaw.map(buildCycleSummary);

  const currentRaw = findCurrentCycle(cyclesRaw, now);
  const currentIdx = currentRaw ? cyclesRaw.indexOf(currentRaw) : -1;

  const currentCycle = currentIdx >= 0 ? cyclesSummaries[currentIdx] : null;
  const previousCycle = currentIdx > 0 ? cyclesSummaries[currentIdx - 1] : null;

  // ✅ aquí ya no truena: c es CycleSummary
  const allDaily = cyclesSummaries.flatMap((c) => c.daily);
  const allDailySorted = allDaily.slice().sort((a, b) => a.date.localeCompare(b.date));

  const last30 = allDailySorted.slice(Math.max(0, allDailySorted.length - 30));
  const last30Summary = summarizeDaily(last30);

  return {
    serviceLineNumber: item.serviceLineNumber,
    accountNumber: item.accountNumber,
    lastUpdated: item.lastUpdated,
    currentCycle,
    previousCycle,
    last30Days: { ...last30Summary, daily: last30 },
    cycles: cyclesSummaries.map((c) => ({ startDate: c.startDate, endDate: c.endDate })),
  };
}
