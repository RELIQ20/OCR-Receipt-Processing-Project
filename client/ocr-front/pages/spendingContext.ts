/**
 * Precomputes spending aggregates for a set of WhatsApp receipt submissions
 * so the chat assistant can answer "how much did I spend this week/month/year"
 * reliably, without relying on an LLM to do arithmetic over raw records.
 */

export interface ReceiptItemLike {
  description: string;
  price: number;
}

export interface ReceiptEntryLike {
  merchant_name: string;
  date: string;
  time?: string;
  total_amount: number;
  currency: string;
  items?: ReceiptItemLike[];
}

export interface ReceiptMessageLike {
  sender_name: string;
  status: string;
  receipts: ReceiptEntryLike[];
  grand_total: number;
}

export interface FlatReceipt {
  sender: string;
  merchant: string;
  amount: number;
  /** The transaction date printed on the receipt itself — NOT when it was uploaded/submitted. */
  receiptDate: string;
  /** Time printed on the receipt, "HH:MM", when available. Used to order same-day receipts correctly. */
  receiptTime?: string;
  currency: string;
}

export interface SpendingContext {
  asOf: string;
  currency: string;
  note: string;
  periods: {
    thisWeekStart: string;
    lastWeekStart: string;
    lastWeekEnd: string;
    thisMonthStart: string;
    lastMonthStart: string;
    lastMonthEnd: string;
    thisYearStart: string;
  };
  totals: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    allTime: number;
  };
  byMerchant: Record<string, number>;
  bySender: Record<string, number>;
  topMerchants: [string, number][];
  topSenders: [string, number][];
  receiptCount: number;
  /** Number of submissions excluded from all figures above because they aren't status "Confirmed" yet. */
  excludedPendingCount: number;
  /** The single most recent confirmed receipt (by receiptDate + receiptTime, falling back to submission order for same-day ties). Use this directly for "what was my last purchase" style questions. */
  mostRecent: FlatReceipt | null;
  /** The 5 most recent confirmed receipts in order, most recent first. */
  recentReceipts: FlatReceipt[];
  receipts: FlatReceipt[];
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

/** Cap on raw receipts included verbatim in the prompt, keeps context small. */
const MAX_RAW_RECEIPTS = 60;

function flattenMessages(messages: ReceiptMessageLike[]): FlatReceipt[] {
  const flat: FlatReceipt[] = [];
  messages.forEach((msg) => {
    msg.receipts.forEach((r) => {
      flat.push({
        sender: msg.sender_name,
        merchant: r.merchant_name,
        amount: r.total_amount,
        receiptDate: r.date,
        receiptTime: r.time || undefined,
        currency: r.currency,
      });
    });
  });
  return flat;
}

/**
 * Sortable timestamp for a receipt. Combines receiptDate with receiptTime when
 * available; receipts with no time default to midnight so, on a shared date,
 * they naturally sort behind ones that do have a time. Array order for
 * genuine ties (same date, both missing time, or identical date+time) falls
 * back to `Array.prototype.sort`'s stability, i.e. the order receipts were
 * passed in — which callers keep as most-recently-submitted first.
 */
function receiptSortKey(r: FlatReceipt): number {
  const time = r.receiptTime && /^\d{1,2}:\d{2}/.test(r.receiptTime) ? r.receiptTime : "00:00";
  const t = new Date(`${r.receiptDate}T${time.length === 4 ? "0" + time : time}:00`).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sortByMostRecent(rs: FlatReceipt[]): FlatReceipt[] {
  return rs
    .map((r, i) => ({ r, i }))
    .sort((a, b) => receiptSortKey(b.r) - receiptSortKey(a.r) || a.i - b.i)
    .map(({ r }) => r);
}

export function buildSpendingContext(messages: ReceiptMessageLike[], currency = "PHP"): SpendingContext {
  const now = new Date();

  // Only fully-confirmed submissions count toward spending totals — a receipt
  // still "Processing" (or "Pending"/"Failed") hasn't been verified yet, so it
  // shouldn't factor into what the assistant tells the user they've spent.
  const confirmedMessages = messages.filter((m) => (m.status ?? "").trim().toLowerCase() === "confirmed");
  const excludedPendingCount = messages.length - confirmedMessages.length;

  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart); // exclusive upper bound = start of this week

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(thisMonthStart); // exclusive upper bound = start of this month

  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  const flat = flattenMessages(confirmedMessages);

  const sum = (rs: FlatReceipt[]) => rs.reduce((a, r) => a + r.amount, 0);
  const inRange = (r: FlatReceipt, from: Date, to?: Date) => {
    const d = new Date(r.receiptDate);
    if (Number.isNaN(d.getTime())) return false;
    if (d < from) return false;
    if (to && d >= to) return false;
    return true;
  };

  const byMerchant: Record<string, number> = {};
  const bySender: Record<string, number> = {};
  flat.forEach((r) => {
    byMerchant[r.merchant] = (byMerchant[r.merchant] ?? 0) + r.amount;
    bySender[r.sender] = (bySender[r.sender] ?? 0) + r.amount;
  });

  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [string, number][];

  const topSenders = Object.entries(bySender)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [string, number][];

  const sortedByRecency = sortByMostRecent(flat);

  return {
    asOf: now.toISOString(),
    currency,
    note:
      "All figures below are computed ONLY from receipts with status \"Confirmed\" — anything still Processing, Pending, or Failed is excluded (see excludedPendingCount) because it hasn't been verified yet. All dates/totals use receiptDate (the date printed on each receipt), never when it was uploaded. For \"what was my most recent / last / latest purchase\" questions, use 'mostRecent' directly rather than scanning 'receipts' yourself — it's already correctly ordered using receiptDate+receiptTime, with submission order as the tiebreaker when multiple receipts share the same date and no time is available. 'recentReceipts' gives the 5 most recent in order for \"what were my last few purchases\" questions. Otherwise prefer the precomputed 'totals' and 'periods' over recalculating from the raw 'receipts' list. If excludedPendingCount > 0 and the user's total seems low to them, you can mention some receipts are still processing.",
    periods: {
      thisWeekStart: thisWeekStart.toISOString().slice(0, 10),
      lastWeekStart: lastWeekStart.toISOString().slice(0, 10),
      lastWeekEnd: lastWeekEnd.toISOString().slice(0, 10),
      thisMonthStart: thisMonthStart.toISOString().slice(0, 10),
      lastMonthStart: lastMonthStart.toISOString().slice(0, 10),
      lastMonthEnd: lastMonthEnd.toISOString().slice(0, 10),
      thisYearStart: thisYearStart.toISOString().slice(0, 10),
    },
    totals: {
      thisWeek: sum(flat.filter((r) => inRange(r, thisWeekStart))),
      lastWeek: sum(flat.filter((r) => inRange(r, lastWeekStart, lastWeekEnd))),
      thisMonth: sum(flat.filter((r) => inRange(r, thisMonthStart))),
      lastMonth: sum(flat.filter((r) => inRange(r, lastMonthStart, lastMonthEnd))),
      thisYear: sum(flat.filter((r) => inRange(r, thisYearStart))),
      allTime: sum(flat),
    },
    byMerchant,
    bySender,
    topMerchants,
    topSenders,
    receiptCount: flat.length,
    excludedPendingCount,
    mostRecent: sortedByRecency[0] ?? null,
    recentReceipts: sortedByRecency.slice(0, 5),
    receipts: sortedByRecency.slice(0, MAX_RAW_RECEIPTS),
  };
}