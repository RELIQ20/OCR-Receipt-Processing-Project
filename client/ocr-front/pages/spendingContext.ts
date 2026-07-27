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
  date: string;
  currency: string;
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
  byMerchant: Record<string, number>;
  bySender: Record<string, number>;
  topMerchants: [string, number][];
  topSenders: [string, number][];
  receiptCount: number;
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
        date: r.date,
        currency: r.currency,
      });
    });
  });
  return flat;
}

export function buildSpendingContext(messages: ReceiptMessageLike[], currency = "PHP"): SpendingContext {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const flat = flattenMessages(messages);

  const sum = (rs: FlatReceipt[]) => rs.reduce((a, r) => a + r.amount, 0);
  const inRange = (r: FlatReceipt, from: Date) => {
    const d = new Date(r.date);
    return !Number.isNaN(d.getTime()) && d >= from;
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

  return {
    asOf: now.toISOString(),
    currency,
    totals: {
      thisWeek: sum(flat.filter((r) => inRange(r, weekStart))),
      thisMonth: sum(flat.filter((r) => inRange(r, monthStart))),
      thisYear: sum(flat.filter((r) => inRange(r, yearStart))),
      allTime: sum(flat),
    },
    byMerchant,
    bySender,
    topMerchants,
    topSenders,
    receiptCount: flat.length,
    receipts: flat
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_RAW_RECEIPTS),
  };
}
