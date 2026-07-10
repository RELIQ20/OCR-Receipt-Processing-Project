/**
 * Precomputes spending aggregates for a set of receipts so the chat assistant
 * can answer "how much did I spend this week/month/year" reliably, without
 * relying on an LLM to do arithmetic over a raw list.
 */

export interface ReceiptLike {
  vendor: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

export interface SpendingContext {
  asOf: string;
  currency: string;
  totals: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    allTime: number;
  };
  byCategory: Record<string, number>;
  topVendors: [string, number][];
  receiptCount: number;
  receipts: ReceiptLike[];
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

/** Cap on raw receipts included verbatim in the prompt, keeps context small. */
const MAX_RAW_RECEIPTS = 60;

export function buildSpendingContext(receipts: ReceiptLike[], currency = "PHP"): SpendingContext {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const sum = (rs: ReceiptLike[]) => rs.reduce((a, r) => a + r.amount, 0);
  const inRange = (r: ReceiptLike, from: Date) => new Date(r.date) >= from;

  const byCategory: Record<string, number> = {};
  const byVendor: Record<string, number> = {};
  receipts.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;
    byVendor[r.vendor] = (byVendor[r.vendor] ?? 0) + r.amount;
  });

  const topVendors = Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [string, number][];

  return {
    asOf: now.toISOString(),
    currency,
    totals: {
      thisWeek: sum(receipts.filter((r) => inRange(r, weekStart))),
      thisMonth: sum(receipts.filter((r) => inRange(r, monthStart))),
      thisYear: sum(receipts.filter((r) => inRange(r, yearStart))),
      allTime: sum(receipts),
    },
    byCategory,
    topVendors,
    receiptCount: receipts.length,
    receipts: receipts
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_RAW_RECEIPTS)
      .map((r) => ({ vendor: r.vendor, amount: r.amount, date: r.date, category: r.category, status: r.status })),
  };
}
