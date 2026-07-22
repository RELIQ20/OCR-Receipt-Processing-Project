"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Inbox as InboxIcon,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  Trash2,
  FileDown,
  ChevronDown,
  Check,
  X,
  FileText,
  Receipt as ReceiptIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  ExternalLink,
  Plus,
  Users,
} from "lucide-react";
import { CardCarousel, type CarouselCard } from "./CardCarousel";
import { ChatAssistant } from "./ChatAssistant";
import {
  createReceipt as createReceiptApi,
  deleteReceipt as deleteReceiptApi,
  fetchReceipts as fetchReceiptsApi,
  updateReceipt as updateReceiptApi,
  type ReceiptMessagePayload,
} from "../src/lib/api";
import { buildSpendingContext } from "./spendingContext";

/* ============================================================================
   THEME — Castleton green / Saffron / Sea Salt / Paper. One token system,
   two modes. Every color used below is derived from this object so light
   and dark stay perfectly in sync.
   ========================================================================= */

const THEME = {
  light: {
    pageBg: "#FBFBF9",
    barBg: "#00563B",
    sidebarBg: "#003B28",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F6F3",
    text: "#0F241B",
    textMuted: "#5C6B65",
    onBar: "#FFFFFF",
    onBarMuted: "rgba(255,255,255,0.65)",
    green: "#00563B",
    greenDeep: "#003B28",
    accent: "#F4C430",
    accentInk: "#3A2A00",
    border: "rgba(0,86,59,0.12)",
    danger: "#B3261E",
    blue: "#3D8BFF",
    paper: "#F5EEDB",
  },
  dark: {
    pageBg: "#07211A",
    barBg: "#04160F",
    sidebarBg: "#04160F",
    surface: "#0E2E22",
    surfaceAlt: "#123526",
    text: "#F5EEDB",
    textMuted: "rgba(245,238,219,0.62)",
    onBar: "#F5EEDB",
    onBarMuted: "rgba(245,238,219,0.55)",
    green: "#0F6B48",
    greenDeep: "#04160F",
    accent: "#F4C430",
    accentInk: "#2B1E00",
    border: "rgba(245,238,219,0.12)",
    danger: "#FF8A80",
    blue: "#5FA3FF",
    paper: "#F5EEDB",
  },
} as const;

type ThemeTokens = { [K in keyof typeof THEME.light]: string };
type Mode = "light" | "dark";

/** Brand gradients cycled across sender cards. */
const CARD_GRADIENTS = [
  "linear-gradient(135deg, #00563B 0%, #003624 100%)",
  "linear-gradient(135deg, #B98A00 0%, #003624 100%)",
  "linear-gradient(135deg, #3D8BFF 0%, #04160F 100%)",
  "linear-gradient(135deg, #0F6B48 0%, #003B28 100%)",
];

/* ============================================================================
   TYPES — mirrors the real lifewood_db.receipts document shape written by
   the WhatsApp OpenClaw bot. One document = one submitted message, which can
   contain more than one scanned merchant receipt.
   ========================================================================= */

interface ReceiptItem {
  description: string;
  price: number;
}

interface ReceiptEntry {
  merchant_name: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "HH:MM"
  total_amount: number;
  currency: string;
  drive_link?: string;
  items: ReceiptItem[];
}

interface ReceiptMessage {
  id: string;
  sender_name: string;
  status: string; // "Processing" | "Pending" | "Confirmed" | "Failed" | ...
  source: string; // always "WhatsApp OpenClaw"
  receipts: ReceiptEntry[];
  grand_total: number;
  excel_link?: string;
  createdAt: string;
}

interface AppNotification {
  id: string;
  type: "new_receipt" | "status_changed" | "processing_failed" | "save_failed";
  title: string;
  detail: string;
  time: string;
  read: boolean;
  receiptId?: string;
}

interface SenderSummary {
  name: string;
  total: number;
  currency: string;
  messageCount: number;
  receiptCount: number;
  latestMerchant?: string;
  latestDate?: string;
  latestItems?: { name: string; qty: number; price: number }[];
}

interface FlatRow {
  messageId: string;
  sender: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  time?: string;
  status: string;
}

type DateRange = "1m" | "3m" | "6m" | "1y";
type View = "dashboard" | "inbox";

/* ============================================================================
   HELPERS
   ========================================================================= */

const RANGES: { key: DateRange; label: string }[] = [
  { key: "1m", label: "1 Month" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
];

const STATUS_FILTERS: { key: "all" | string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "failed", label: "Failed" },
];

const STATUS_OPTIONS = ["Processing", "Pending", "Confirmed", "Failed"];

const NOTIF_ICONS: Record<AppNotification["type"], any> = {
  new_receipt: FileText,
  status_changed: CheckCircle2,
  processing_failed: AlertTriangle,
  save_failed: AlertTriangle,
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = { PHP: "₱", USD: "$", EUR: "€", JPY: "¥", GBP: "£" };

function formatAmount(n: number, currency = "PHP") {
  const symbol = CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? `${currency} `;
  return `${symbol}${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateOnly(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Status → color + icon, resolved against the active theme and tolerant of unknown status strings. */
function statusMeta(t: ThemeTokens, status: string) {
  const key = (status || "").trim().toLowerCase();
  const map: Record<string, { label: string; tone: string; icon: any; spin?: boolean; pulse?: boolean }> = {
    processing: { label: "Processing", tone: t.accent, icon: Loader2, spin: true },
    pending: { label: "Pending", tone: t.blue, icon: Clock, pulse: true },
    confirmed: { label: "Confirmed", tone: t.green, icon: CheckCircle2 },
    complete: { label: "Complete", tone: t.green, icon: CheckCircle2 },
    failed: { label: "Failed", tone: t.danger, icon: AlertTriangle },
  };
  return map[key] ?? { label: status || "Unknown", tone: t.textMuted, icon: Clock };
}

function flattenReceipts(messages: ReceiptMessage[]): FlatRow[] {
  const rows: FlatRow[] = [];
  messages.forEach((m) => {
    m.receipts.forEach((r) => {
      rows.push({ messageId: m.id, sender: m.sender_name, merchant: r.merchant_name, amount: r.total_amount, currency: r.currency, date: r.date, time: r.time, status: m.status });
    });
  });
  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function summarizeSenders(messages: ReceiptMessage[]): SenderSummary[] {
  const sorted = messages.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const map = new Map<string, SenderSummary>();

  sorted.forEach((msg) => {
    const existing = map.get(msg.sender_name);
    const entry: SenderSummary = existing ?? {
      name: msg.sender_name,
      total: 0,
      currency: msg.receipts[0]?.currency ?? "PHP",
      messageCount: 0,
      receiptCount: 0,
    };
    entry.total += msg.grand_total;
    entry.messageCount += 1;
    entry.receiptCount += msg.receipts.length;
    if (!entry.latestMerchant && msg.receipts.length > 0) {
      const first = msg.receipts[0];
      entry.latestMerchant = first.merchant_name;
      entry.latestDate = first.date;
      entry.latestItems = first.items.map((it) => ({ name: it.description, qty: 1, price: it.price }));
    }
    map.set(msg.sender_name, entry);
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function buildSeries(flat: { date: string; amount: number }[], range: DateRange) {
  const now = new Date();

  if (range === "1m") {
    const buckets = [0, 0, 0, 0];
    flat.forEach((r) => {
      const d = new Date(r.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const week = Math.min(3, Math.floor((d.getDate() - 1) / 7));
        buckets[week] += r.amount;
      }
    });
    return buckets.map((v, i) => ({ label: `Wk ${i + 1}`, value: v }));
  }

  const monthsBack = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const labels: { label: string; year: number; month: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push({ label: d.toLocaleString(undefined, { month: "short" }), year: d.getFullYear(), month: d.getMonth() });
  }
  return labels.map((l) => ({
    label: l.label,
    value: flat
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === l.year && d.getMonth() === l.month;
      })
      .reduce((a, r) => a + r.amount, 0),
  }));
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function resolvePhotoSrcCandidates(link?: string) {
  if (!link) return [];

  const fileIdFromLink = (candidate: string) => {
    const match = candidate.match(/(?:\/file\/d\/|\/open\?id=|id=)([A-Za-z0-9_-]+)/);
    if (match?.[1]) return match[1];
    const directMatch = candidate.match(/\/uc\?export=download&id=([A-Za-z0-9_-]+)/);
    if (directMatch?.[1]) return directMatch[1];
    const docsMatch = candidate.match(/\/document\/d\/([A-Za-z0-9_-]+)/);
    if (docsMatch?.[1]) return docsMatch[1];
    return null;
  };

  const candidates: string[] = [];
  const id = fileIdFromLink(link);

  if (id) {
    candidates.push(`https://drive.google.com/uc?export=view&id=${id}`);
    candidates.push(`https://drive.google.com/uc?export=download&id=${id}`);
    candidates.push(`https://drive.google.com/thumbnail?id=${id}`);
  }

  try {
    const url = new URL(link);
    if (/\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(url.pathname)) {
      candidates.push(link);
    }
  } catch {
    if (/\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(link)) {
      candidates.push(link);
    }
  }

  return Array.from(new Set(candidates));
}

function ReceiptPhotoPreview({ link, merchant, t }: { link?: string; merchant: string; t: ThemeTokens }) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);
  if (!link) return null;

  const previewOptions = resolvePhotoSrcCandidates(link);
  const currentSrc = previewOptions[previewIndex];

  return (
    <div className="pt-2 space-y-2">
      <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: t.green }}>
        <ExternalLink size={12} /> View original photo
      </a>
      {!previewFailed && currentSrc && (
        <img
          src={currentSrc}
          alt={`${merchant} receipt`}
          loading="lazy"
          className="w-full max-h-80 rounded-xl border object-contain"
          style={{ borderColor: t.border, background: t.surfaceAlt }}
          onError={() => {
            if (previewIndex + 1 < previewOptions.length) {
              setPreviewIndex((index) => index + 1);
            } else {
              setPreviewFailed(true);
            }
          }}
        />
      )}
      {previewFailed && (
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Preview unavailable. Open the original photo link to view it.
        </p>
      )}
    </div>
  );
}

/** Exports every merchant receipt + line item inside one WhatsApp submission as a CSV. */
function exportMessageCsv(m: ReceiptMessage) {
  const header = ["Field", "Value"];
  const rows: string[][] = [
    ["Sender", m.sender_name],
    ["Status", m.status],
    ["Submitted", dateTime(m.createdAt)],
    ["Grand Total", formatAmount(m.grand_total, m.receipts[0]?.currency)],
    ["", ""],
  ];
  m.receipts.forEach((r, i) => {
    rows.push([`Receipt ${i + 1} — Merchant`, r.merchant_name]);
    rows.push([`Receipt ${i + 1} — Date`, `${r.date} ${r.time ?? ""}`.trim()]);
    rows.push([`Receipt ${i + 1} — Total`, formatAmount(r.total_amount, r.currency)]);
    r.items.forEach((it) => rows.push([`  ${it.description}`, formatAmount(it.price, r.currency)]));
    rows.push(["", ""]);
  });

  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${m.sender_name.replace(/\s+/g, "_")}_receipts.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================================
   SHARED BITS
   ========================================================================= */

function StatusBadge({ status, t }: { status: string; t: ThemeTokens }) {
  const meta = statusMeta(t, status);
  return (
    <span
      className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${meta.pulse ? "animate-pulse" : ""}`}
      style={{ color: meta.tone, background: `${meta.tone}1a`, border: `1px solid ${meta.tone}40` }}
    >
      {meta.label}
    </span>
  );
}

/* ============================================================================
   TOP BAR
   ========================================================================= */

function NavPill({ view, setView, t }: { view: View; setView: (v: View) => void; t: ThemeTokens }) {
  const TABS: { key: View; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "inbox", label: "Receipt Inbox", icon: InboxIcon },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full p-1 backdrop-blur-md border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)" }}>
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = view === key;
        return (
          <button
            key={key}
            onClick={() => setView(key)}
            className="relative flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full transition-colors"
            style={{ color: active ? t.accentInk : t.onBarMuted }}
          >
            {active && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-full" style={{ background: t.accent }} transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
            <span className="relative flex items-center gap-1.5">
              <Icon size={13} />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NotificationBell({
  t,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onOpenReceipt,
}: {
  t: ThemeTokens;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenReceipt: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative flex items-center justify-center w-9 h-9 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <Bell size={16} color={t.onBar} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: t.accent, color: t.accentInk }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 top-11 w-80 rounded-2xl shadow-2xl p-2 z-30 border"
            style={{ background: t.surface, borderColor: t.border }}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-bold" style={{ color: t.text }}>
                Notifications
              </p>
              <div className="flex items-center gap-3">
                <button onClick={onMarkAllRead} className="text-[11px]" style={{ color: t.textMuted }}>
                  Mark all read
                </button>
                <button onClick={() => setOpen(false)}>
                  <X size={13} color={t.textMuted} />
                </button>
              </div>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="text-xs px-2 py-6 text-center" style={{ color: t.textMuted }}>
                  You&apos;re all caught up.
                </p>
              )}
              {notifications.map((n) => {
                const Icon = NOTIF_ICONS[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      onMarkRead(n.id);
                      if (n.receiptId) onOpenReceipt(n.receiptId);
                      setOpen(false);
                    }}
                    className="w-full flex items-start gap-2 px-2 py-2 rounded-xl text-left"
                    style={{ background: t.surfaceAlt }}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.accent, color: t.accentInk }}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: n.read ? t.textMuted : t.text }}>
                        {n.title}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: t.textMuted }}>
                        {n.detail}
                      </p>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1 ml-auto" style={{ background: t.accent }} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

function ToastStack({ t, toasts, onOpenReceipt }: { t: ThemeTokens; toasts: AppNotification[]; onOpenReceipt: (id: string) => void }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 w-72">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = NOTIF_ICONS[toast.type];
          return (
            <motion.button
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={() => toast.receiptId && onOpenReceipt(toast.receiptId)}
              className="flex items-center gap-3 rounded-2xl shadow-2xl px-4 py-3 text-left border"
              style={{ background: t.surface, borderColor: t.border }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${t.accent}22`, border: `1px solid ${t.accent}55` }}>
                <Icon size={13} color={t.accentInk} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: t.text }}>
                  {toast.title}
                </p>
                <p className="text-[11px] truncate" style={{ color: t.textMuted }}>
                  {toast.detail}
                </p>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
   TRANSACTION HISTORY CHART — smooth SVG line chart, theme aware
   ========================================================================= */

function TransactionHistoryChart({ data, t }: { data: { label: string; value: number }[]; t: ThemeTokens }) {
  const W = 640;
  const H = 200;
  const PAD = 24;
  const max = Math.max(1, ...data.map((d) => d.value));

  const points = data.map((d, i) => ({
    x: data.length > 1 ? PAD + (i * (W - PAD * 2)) / (data.length - 1) : W / 2,
    y: H - PAD - (d.value / max) * (H - PAD * 2),
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${H - PAD} L ${points[0].x} ${H - PAD} Z` : "";

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#chartFill)" />}
        {linePath && <path d={linePath} fill="none" stroke={t.green} strokeWidth={3} strokeLinecap="round" />}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={t.accent} stroke={t.surface} strokeWidth={1.5} />
        ))}
        {data.map((d, i) => (
          <text key={i} x={points[i]?.x ?? 0} y={H - 4} textAnchor="middle" fontSize={11} fill={t.textMuted}>
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ============================================================================
   PIPELINE STATUS + RECENT STATUS STRIP
   ========================================================================= */

function PipelineStatus({ counts, t }: { counts: Record<string, number>; t: ThemeTokens }) {
  const ORDER = ["processing", "pending", "confirmed"];
  return (
    <section className="rounded-2xl p-6 border" style={{ background: t.surface, borderColor: t.border }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold tracking-wider uppercase" style={{ color: t.textMuted }}>
          Pipeline Status
        </p>
        <RefreshCw size={14} color={t.textMuted} />
      </div>
      <div className="flex flex-wrap gap-3">
        {ORDER.map((key) => {
          const m = statusMeta(t, key);
          const Icon = m.icon;
          return (
            <div key={key} className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl" style={{ background: t.surfaceAlt }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${m.tone}22` }}>
                <Icon size={14} color={m.tone} className={m.spin ? "animate-spin" : m.pulse ? "animate-pulse" : ""} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: t.text }}>
                  {counts[key] ?? 0}
                </p>
                <p className="text-[10px]" style={{ color: t.textMuted }}>
                  {m.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusUpdateStrip({ receipts, t, onOpen }: { receipts: ReceiptMessage[]; t: ThemeTokens; onOpen: (id: string) => void }) {
  const recent = receipts.slice(0, 8);
  if (recent.length === 0) return null;

  return (
    <section className="rounded-2xl p-6 border" style={{ background: t.surface, borderColor: t.border }}>
      <p className="text-xs font-bold tracking-wider uppercase mb-4" style={{ color: t.textMuted }}>
        Recent Status Updates
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {recent.map((m) => {
          const meta = statusMeta(t, m.status);
          const Icon = meta.icon;
          return (
            <button key={m.id} onClick={() => onOpen(m.id)} className="flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5" style={{ background: t.surfaceAlt }}>
              <Icon size={11} color={meta.tone} className={meta.spin ? "animate-spin" : meta.pulse ? "animate-pulse" : ""} />
              <span className="text-[11px]" style={{ color: t.text }}>
                {m.sender_name}
              </span>
              <span className="text-[10px]" style={{ color: t.textMuted }}>
                {formatAmount(m.grand_total, m.receipts[0]?.currency)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================================
   QUICK STATUS DROPDOWN
   ========================================================================= */

function StatusDropdown({ t, value, onChange }: { t: ThemeTokens; value: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = STATUS_OPTIONS.includes(value) ? STATUS_OPTIONS : [...STATUS_OPTIONS, value];
  return (
    <div className="relative inline-block flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
        style={{ background: t.surfaceAlt, color: t.text }}
      >
        Update status
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute bottom-12 left-0 w-44 rounded-xl shadow-xl p-1 z-20 border" style={{ background: t.surface, borderColor: t.border }}>
          {options.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between"
              style={{ color: t.text }}
            >
              {o}
              {value === o && <Check size={13} color={t.green} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   EDIT MODAL — fix values the OCR misread: sender, status, per-merchant
   fields, and individual line items. Grand total is always recomputed from
   the receipts below rather than typed directly, so it can't drift.
   ========================================================================= */

function EditReceiptModal({ message, t, onClose, onSave }: { message: ReceiptMessage; t: ThemeTokens; onClose: () => void; onSave: (updates: Partial<ReceiptMessage>) => void }) {
  const [draft, setDraft] = useState<ReceiptMessage>(() => JSON.parse(JSON.stringify(message)));

  const computedGrandTotal = draft.receipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

  const updateReceiptField = (index: number, field: keyof ReceiptEntry, value: any) => {
    setDraft((d) => {
      const receipts = d.receipts.slice();
      receipts[index] = { ...receipts[index], [field]: value };
      return { ...d, receipts };
    });
  };

  const updateItemField = (rIndex: number, iIndex: number, field: keyof ReceiptItem, value: any) => {
    setDraft((d) => {
      const receipts = d.receipts.slice();
      const items = receipts[rIndex].items.slice();
      items[iIndex] = { ...items[iIndex], [field]: value };
      receipts[rIndex] = { ...receipts[rIndex], items };
      return { ...d, receipts };
    });
  };

  const addItem = (rIndex: number) => {
    setDraft((d) => {
      const receipts = d.receipts.slice();
      receipts[rIndex] = { ...receipts[rIndex], items: [...receipts[rIndex].items, { description: "", price: 0 }] };
      return { ...d, receipts };
    });
  };

  const removeItem = (rIndex: number, iIndex: number) => {
    setDraft((d) => {
      const receipts = d.receipts.slice();
      receipts[rIndex] = { ...receipts[rIndex], items: receipts[rIndex].items.filter((_, i) => i !== iIndex) };
      return { ...d, receipts };
    });
  };

  const addReceipt = () => {
    setDraft((d) => ({
      ...d,
      receipts: [...d.receipts, { merchant_name: "", date: new Date().toISOString().slice(0, 10), time: "", total_amount: 0, currency: "PHP", items: [] }],
    }));
  };

  const removeReceipt = (rIndex: number) => {
    setDraft((d) => ({ ...d, receipts: d.receipts.filter((_, i) => i !== rIndex) }));
  };

  const handleSave = () => {
    onSave({ sender_name: draft.sender_name, status: draft.status, receipts: draft.receipts, excel_link: draft.excel_link });
    onClose();
  };

  const inputStyle = { background: t.surfaceAlt, color: t.text, borderColor: t.border } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl p-6 space-y-5"
        style={{ background: t.surface }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: t.text }}>
            Edit receipt
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: t.surfaceAlt }}>
            <X size={15} color={t.textMuted} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
              Sender
            </label>
            <input
              value={draft.sender_name}
              onChange={(e) => setDraft((d) => ({ ...d, sender_name: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none border"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
              Status
            </label>
            <select
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none border"
              style={inputStyle}
            >
              {(STATUS_OPTIONS.includes(draft.status) ? STATUS_OPTIONS : [...STATUS_OPTIONS, draft.status]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {draft.receipts.map((r, rIndex) => (
            <div key={rIndex} className="rounded-xl p-4 space-y-3 border" style={{ background: t.surfaceAlt, borderColor: t.border }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: t.textMuted }}>
                  Receipt {rIndex + 1}
                </p>
                <button onClick={() => removeReceipt(rIndex)} title="Remove this receipt">
                  <Trash2 size={14} color={t.danger} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={r.merchant_name}
                  onChange={(e) => updateReceiptField(rIndex, "merchant_name", e.target.value)}
                  placeholder="Merchant name"
                  className="rounded-lg px-3 py-2 text-sm outline-none border"
                  style={{ background: t.surface, color: t.text, borderColor: t.border }}
                />
                <div className="flex items-center gap-2">
                  <input
                    value={r.currency}
                    onChange={(e) => updateReceiptField(rIndex, "currency", e.target.value)}
                    placeholder="Currency"
                    className="w-20 rounded-lg px-3 py-2 text-sm outline-none border"
                    style={{ background: t.surface, color: t.text, borderColor: t.border }}
                  />
                  <input
                    type="number"
                    value={r.total_amount}
                    onChange={(e) => updateReceiptField(rIndex, "total_amount", Number(e.target.value))}
                    placeholder="Total"
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border"
                    style={{ background: t.surface, color: t.text, borderColor: t.border }}
                  />
                </div>
                <input
                  type="date"
                  value={r.date}
                  onChange={(e) => updateReceiptField(rIndex, "date", e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none border"
                  style={{ background: t.surface, color: t.text, borderColor: t.border }}
                />
                <input
                  type="time"
                  value={r.time ?? ""}
                  onChange={(e) => updateReceiptField(rIndex, "time", e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none border"
                  style={{ background: t.surface, color: t.text, borderColor: t.border }}
                />
              </div>

              <div className="space-y-1.5">
                {r.items.map((it, iIndex) => (
                  <div key={iIndex} className="flex items-center gap-2">
                    <input
                      value={it.description}
                      onChange={(e) => updateItemField(rIndex, iIndex, "description", e.target.value)}
                      placeholder="Item description"
                      className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none border"
                      style={{ background: t.surface, color: t.text, borderColor: t.border }}
                    />
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) => updateItemField(rIndex, iIndex, "price", Number(e.target.value))}
                      className="w-24 rounded-lg px-2.5 py-1.5 text-xs outline-none border"
                      style={{ background: t.surface, color: t.text, borderColor: t.border }}
                    />
                    <button onClick={() => removeItem(rIndex, iIndex)} title="Remove item">
                      <Trash2 size={13} color={t.danger} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addItem(rIndex)} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: t.green }}>
                  <Plus size={12} /> Add item
                </button>
              </div>
            </div>
          ))}

          <button onClick={addReceipt} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl" style={{ background: t.surfaceAlt, color: t.text }}>
            <Plus size={13} /> Add another receipt to this message
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-sm font-bold" style={{ borderColor: t.border, color: t.text }}>
          <span>Grand total (auto-calculated)</span>
          <span className="font-mono">{formatAmount(computedGrandTotal, draft.receipts[0]?.currency)}</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: t.textMuted }}>
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: t.green, color: "#fff" }}>
            Save changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================================
   RECEIPT INBOX — email-style layout: collapsible white list + detail panel.
   ========================================================================= */

function ReceiptInboxView({
  t,
  receipts,
  focusId,
  onDelete,
  onStatusChange,
  onSaveEdit,
}: {
  t: ThemeTokens;
  receipts: ReceiptMessage[];
  focusId: string | null;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onSaveEdit: (id: string, updates: Partial<ReceiptMessage>) => void;
}) {
  const [listOpen, setListOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(receipts[0]?.id ?? null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (focusId) setSelectedId(focusId);
  }, [focusId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return receipts
      .filter((m) => (filter === "all" ? true : m.status.trim().toLowerCase() === filter))
      .filter((m) => (q ? [m.sender_name, m.status, ...m.receipts.map((r) => r.merchant_name)].join(" ").toLowerCase().includes(q) : true));
  }, [receipts, filter, search]);

  const selected = receipts.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  const counts: Record<string, number> = { all: receipts.length };
  STATUS_FILTERS.slice(1).forEach((f) => {
    counts[f.key] = receipts.filter((m) => m.status.trim().toLowerCase() === f.key).length;
  });

  return (
    <div className="relative flex flex-1 overflow-hidden gap-5 p-5" style={{ background: `linear-gradient(160deg, ${t.barBg} 0%, ${t.greenDeep} 100%)` }}>
      {editing && selected && (
        <EditReceiptModal
          message={selected}
          t={t}
          onClose={() => setEditing(false)}
          onSave={(updates) => onSaveEdit(selected.id, updates)}
        />
      )}

      {/* LIST — white "email" box, collapsible */}
      <div
        className="flex-shrink-0 flex flex-col rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          background: t.surface,
          width: listOpen ? 380 : 0,
          opacity: listOpen ? 1 : 0,
          marginRight: listOpen ? 0 : -20,
          pointerEvents: listOpen ? "auto" : "none",
        }}
      >
        <div className="p-4 space-y-3 border-b" style={{ borderColor: t.border }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.green }}>
                <InboxIcon size={14} color="#FFFFFF" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: t.text }}>
                  Receipt Inbox
                </p>
                <p className="text-[10px]" style={{ color: t.textMuted }}>
                  {receipts.length} submissions
                </p>
              </div>
            </div>
            <button onClick={() => setListOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.surfaceAlt }} title="Hide inbox list">
              <PanelLeftClose size={15} color={t.textMuted} />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.surfaceAlt }}>
            <Search size={15} color={t.textMuted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sender or merchant" className="bg-transparent outline-none text-sm flex-1" style={{ color: t.text }} />
          </div>

          <div className="flex gap-1.5 overflow-x-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={filter === f.key ? { background: t.green, color: "#fff" } : { background: t.surfaceAlt, color: t.textMuted }}
              >
                {f.label} · {counts[f.key] ?? 0}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: t.textMuted }}>
              No receipts match this filter.
            </p>
          )}
          {filtered.map((m) => {
            const meta = statusMeta(t, m.status);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className="w-full text-left px-3 py-3 rounded-xl transition-colors"
                style={{ background: selected?.id === m.id ? t.surfaceAlt : "transparent" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.tone }} />
                      <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
                        {m.sender_name}
                      </p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                      {dateOnly(m.createdAt)} · {m.receipts.length} receipt{m.receipts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold flex-shrink-0" style={{ color: t.text }}>
                    {formatAmount(m.grand_total, m.receipts[0]?.currency)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {!listOpen && (
        <button
          onClick={() => setListOpen(true)}
          className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-3 rounded-r-2xl shadow-lg z-10"
          style={{ background: t.surface, color: t.green }}
          title="Show inbox list"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* DETAIL */}
      <div className="flex-1 rounded-2xl shadow-xl overflow-hidden" style={{ background: t.surface }}>
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm" style={{ color: t.textMuted }}>
              Select a receipt to view details.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-8 space-y-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs" style={{ color: t.textMuted }}>
                  {dateTime(selected.createdAt)} · via {selected.source}
                </p>
                <h2 className="text-2xl font-bold mt-0.5" style={{ color: t.text }}>
                  {selected.sender_name}
                </h2>
                <div className="mt-1.5">
                  <StatusBadge status={selected.status} t={t} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditing(true)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: t.surfaceAlt }} title="Edit receipt values">
                  <Pencil size={15} color={t.text} />
                </button>
                <button onClick={() => onDelete(selected.id)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${t.danger}1a` }} title="Delete this submission">
                  <Trash2 size={15} color={t.danger} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {selected.receipts.map((r, i) => (
                <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: t.surfaceAlt }}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm" style={{ color: t.text }}>
                      {r.merchant_name}
                    </p>
                    <span className="font-mono text-sm font-semibold" style={{ color: t.text }}>
                      {formatAmount(r.total_amount, r.currency)}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: t.textMuted }}>
                    {dateOnly(r.date)} {r.time ? `· ${r.time}` : ""}
                  </p>
                  {r.items.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {r.items.map((it, ii) => (
                        <div key={ii} className="flex items-center justify-between text-xs">
                          <span style={{ color: t.text, opacity: 0.85 }}>{it.description}</span>
                          <span className="font-mono" style={{ color: t.textMuted }}>
                            {formatAmount(it.price, r.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.drive_link && <ReceiptPhotoPreview link={r.drive_link} merchant={r.merchant_name} t={t} />}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t" style={{ borderColor: t.border, color: t.text }}>
              <span>Grand Total</span>
              <span className="font-mono">{formatAmount(selected.grand_total, selected.receipts[0]?.currency)}</span>
            </div>

            <div className="flex items-center gap-2.5 pt-2 flex-wrap">
              <button onClick={() => exportMessageCsv(selected)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: t.green }}>
                <FileDown size={15} />
                Export CSV
              </button>

              {selected.excel_link && (
                <a
                  href={selected.excel_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: t.surfaceAlt, color: t.text }}
                >
                  <ExternalLink size={15} />
                  Open spreadsheet
                </a>
              )}

              <StatusDropdown t={t} value={selected.status} onChange={(s) => onStatusChange(selected.id, s)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN DASHBOARD — default export, owns all app state
   ========================================================================= */

export default function LifeReceiptDashboard() {
  const [mode, setMode] = useState<Mode>("light");
  const t = THEME[mode];

  const [receipts, setReceipts] = useState<ReceiptMessage[]>([]);
  const [receiptsLoaded, setReceiptsLoaded] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<DateRange>("6m");
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [sidebarFilter, setSidebarFilter] = useState<string>("all");
  const [activeSenderIndex, setActiveSenderIndex] = useState(0);
  const [focusReceiptId, setFocusReceiptId] = useState<string | null>(null);

  const receiptsRef = useRef<ReceiptMessage[]>([]);
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    receiptsRef.current = receipts;
  }, [receipts]);

  const pushNotification = useCallback((n: Omit<AppNotification, "id" | "read" | "time">) => {
    const full: AppNotification = { ...n, id: uid("notif"), read: false, time: "now" };
    setNotifications((prev) => [full, ...prev]);
    setToasts((prev) => [...prev, full]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== full.id));
    }, 4500);
  }, []);

  const loadReceipts = useCallback(async () => {
    try {
      const payload = await fetchReceiptsApi();
      const incoming = payload as unknown as ReceiptMessage[];

      if (hasLoadedOnceRef.current) {
        const prevById = new Map(receiptsRef.current.map((m) => [m.id, m]));
        incoming.forEach((m) => {
          const prev = prevById.get(m.id);
          if (!prev) {
            pushNotification({ type: "new_receipt", title: "New receipt received", detail: `${m.sender_name} — ${formatAmount(m.grand_total, m.receipts[0]?.currency)}`, receiptId: m.id });
          } else if (prev.status !== m.status) {
            const failed = m.status.trim().toLowerCase() === "failed";
            pushNotification({
              type: failed ? "processing_failed" : "status_changed",
              title: `${m.sender_name}'s receipt is now ${m.status}`,
              detail: formatAmount(m.grand_total, m.receipts[0]?.currency),
              receiptId: m.id,
            });
          }
        });
      }

      setReceipts(incoming);
    } catch (error) {
      console.error("Unable to load receipts from backend", error);
    } finally {
      hasLoadedOnceRef.current = true;
      setReceiptsLoaded(true);
    }
  }, [pushNotification]);

  useEffect(() => {
    void loadReceipts();
    const interval = window.setInterval(() => void loadReceipts(), 20000);
    return () => window.clearInterval(interval);
  }, [loadReceipts]);

  const deleteMessage = useCallback((id: string) => {
    setReceipts((prev) => prev.filter((m) => m.id !== id));
    void deleteReceiptApi(id).catch((error: unknown) => console.error("Failed to delete receipt", error));
  }, []);

  const changeStatus = useCallback(
    (id: string, status: string) => {
      setReceipts((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      void updateReceiptApi(id, { status }).catch((error) => {
        console.error("Failed to update status", error);
        pushNotification({ type: "save_failed", title: "Status update failed", detail: "Could not sync with the server.", receiptId: id });
      });
    },
    [pushNotification]
  );

  const saveEdit = useCallback(
    (id: string, updates: Partial<ReceiptMessage>) => {
      setReceipts((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const merged = { ...m, ...updates } as ReceiptMessage;
          merged.grand_total = merged.receipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
          return merged;
        })
      );
      void updateReceiptApi(id, updates)
        .then((saved) => {
          setReceipts((prev) => prev.map((m) => (m.id === id ? (saved as unknown as ReceiptMessage) : m)));
        })
        .catch((error) => {
          console.error("Failed to save receipt edits", error);
          pushNotification({ type: "save_failed", title: "Save failed", detail: "Your edits couldn't be synced to the server.", receiptId: id });
        });
    },
    [pushNotification]
  );

  const openReceipt = useCallback((id?: string) => {
    if (id) setFocusReceiptId(id);
    setView("inbox");
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadReceipts();
    setRefreshing(false);
  };

  const flatRows = useMemo(() => flattenReceipts(receipts), [receipts]);
  const senders = useMemo(() => summarizeSenders(receipts), [receipts]);

  const chartData = useMemo(() => buildSeries(flatRows, range), [flatRows, range]);
  const currentTotal = chartData[chartData.length - 1]?.value ?? 0;
  const prevValue = chartData.length > 1 ? chartData[chartData.length - 2].value : currentTotal;
  const growthPct = prevValue ? (((currentTotal - prevValue) / prevValue) * 100).toFixed(2) : "0.00";
  const isPositive = Number(growthPct) >= 0;

  const carouselCards: CarouselCard[] = senders.map((s, i) => ({
    background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
    label: s.name,
    balance: formatAmount(s.total, s.currency),
    last4: String(s.messageCount).padStart(2, "0"),
    dateLabel: s.latestDate ? dateOnly(s.latestDate) : undefined,
    contactNumber: s.latestMerchant,
    items: s.latestItems,
  }));

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    receipts.forEach((m) => {
      const key = m.status.trim().toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [receipts]);

  const q = query.trim().toLowerCase();
  const visibleRows = flatRows
    .filter((r) => (sidebarFilter === "all" ? true : r.status.trim().toLowerCase() === sidebarFilter))
    .filter((r) => (q ? [r.sender, r.merchant, r.status, dateOnly(r.date)].join(" ").toLowerCase().includes(q) : true));

  const openInboxCount = receipts.filter((m) => m.status.trim().toLowerCase() !== "confirmed").length;

  const SIDEBAR_FILTERS = STATUS_FILTERS;

  if (!receiptsLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: t.greenDeep, color: t.onBar }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: t.onBarMuted }}>
          <RefreshCw size={16} className="animate-spin" />
          Loading your receipts…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full font-sans transition-colors duration-500" style={{ background: t.pageBg, color: t.text }}>
      <ToastStack t={t} toasts={toasts} onOpenReceipt={openReceipt} />
      <ChatAssistant accent={t.accent} currency="PHP" buildContext={() => buildSpendingContext(receipts, "PHP")} />

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 transition-colors duration-500" style={{ background: t.barBg }}>
        <div className="w-56">
          <NotificationBell
            t={t}
            notifications={notifications}
            onMarkRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))}
            onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
            onOpenReceipt={openReceipt}
          />
        </div>

        <NavPill view={view} setView={setView} t={t} />

        <div className="w-56 flex justify-end items-center gap-3">
          <button
            onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
            className="relative flex items-center w-14 h-8 rounded-full px-1 transition-colors duration-500"
            style={{ background: "rgba(255,255,255,0.14)" }}
            title="Toggle light / dark mode"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-500"
              style={{ background: t.accent, transform: mode === "dark" ? "translateX(24px)" : "translateX(0px)" }}
            >
              {mode === "dark" ? <Moon size={13} color={t.accentInk} /> : <Sun size={13} color={t.accentInk} />}
            </div>
          </button>
        </div>
      </div>

      {/* BODY */}
      <AnimatePresence mode="wait">
        {view === "inbox" ? (
          <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 min-h-0 flex">
            <ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-1 overflow-hidden">
            {/* SIDEBAR */}
            <aside className="w-60 flex-shrink-0 hidden md:flex flex-col p-5 transition-colors duration-500" style={{ background: t.sidebarBg, color: t.onBar }}>
              <p className="text-[10px] uppercase tracking-wider opacity-50 mb-3 px-1">Navigation</p>
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold" style={{ background: t.accent, color: t.accentInk }}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                <button onClick={() => setView("inbox")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm hover:bg-white/5" style={{ color: t.onBarMuted }}>
                  <span className="flex items-center gap-3">
                    <InboxIcon size={16} />
                    Receipt Inbox
                  </span>
                  {openInboxCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: t.accent, color: t.accentInk }}>
                      {openInboxCount}
                    </span>
                  )}
                </button>
              </nav>
            </aside>

            {/* MAIN COLUMN */}
            <main className="flex-1 flex flex-col overflow-y-auto">
              <div className="flex items-center gap-4 px-6 py-4 border-b transition-colors duration-500" style={{ borderColor: t.border, background: t.surface }}>
                <button onClick={refresh} title="Refresh dashboard" className="shrink-0" style={{ color: t.textMuted }}>
                  <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }} transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}} className="inline-block">
                    <RefreshCw size={15} />
                  </motion.span>
                </button>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.surfaceAlt }}>
                  <Search size={16} color={t.textMuted} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search sender, merchant, date, status"
                    className="bg-transparent outline-none text-sm flex-1"
                    style={{ color: t.text }}
                  />
                </div>
              </div>

              <div className="p-6 space-y-6">
                <section className="rounded-2xl p-6 transition-colors duration-500" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
                    <p className="text-sm font-semibold" style={{ color: t.textMuted }}>
                      Transaction Receipt History <span style={{ color: t.textMuted, opacity: 0.6 }}>· All senders</span>
                    </p>
                    <div className="flex gap-1 rounded-full p-1" style={{ background: t.surfaceAlt }}>
                      {RANGES.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => setRange(r.key)}
                          className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                          style={range === r.key ? { background: t.green, color: "#fff" } : { color: t.textMuted }}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold">{formatAmount(currentTotal)}</span>
                    <span className="text-sm font-semibold flex items-center gap-0.5" style={{ color: isPositive ? t.green : t.danger }}>
                      {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(Number(growthPct))}%
                    </span>
                  </div>

                  <TransactionHistoryChart data={chartData} t={t} />
                </section>

                <PipelineStatus counts={pipelineCounts} t={t} />
                <StatusUpdateStrip receipts={receipts} t={t} onOpen={openReceipt} />
              </div>
            </main>

            {/* RIGHT PANEL */}
            <aside className="w-96 flex-shrink-0 hidden lg:flex flex-col p-6 space-y-6 overflow-y-auto border-l transition-colors duration-500" style={{ background: t.surface, borderColor: t.border }}>
              <div className="flex items-center gap-2">
                <Users size={16} color={t.textMuted} />
                <h2 className="font-bold text-lg">Senders</h2>
              </div>

              {carouselCards.length > 0 ? (
                <CardCarousel cards={carouselCards} activeIndex={activeSenderIndex} onActiveChange={setActiveSenderIndex} />
              ) : (
                <div className="rounded-2xl border border-dashed py-10 flex items-center justify-center text-xs" style={{ borderColor: t.border, color: t.textMuted }}>
                  No senders yet
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-wrap">
                {SIDEBAR_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSidebarFilter(f.key)}
                    className="text-[11px] px-3 py-1.5 rounded-full transition-colors"
                    style={{ background: sidebarFilter === f.key ? t.green : t.surfaceAlt, color: sidebarFilter === f.key ? "#fff" : t.textMuted }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Recent Receipts</h3>
                <span className="text-xs font-semibold" style={{ color: t.accent }}>
                  {visibleRows.length} total
                </span>
              </div>

              <div className="space-y-1">
                {visibleRows.slice(0, 10).map((row, i) => {
                  const meta = statusMeta(t, row.status);
                  return (
                    <button key={`${row.messageId}_${i}`} onClick={() => openReceipt(row.messageId)} className="w-full flex items-center justify-between px-2 py-3 rounded-xl transition-colors text-left hover:opacity-90">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: t.green, color: "#fff" }}>
                          {row.merchant.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm truncate" style={{ color: t.text }}>
                            {row.merchant}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: t.textMuted }}>
                            {row.sender}
                          </p>
                          <p className="text-[10.5px]" style={{ color: t.textMuted, opacity: 0.7 }}>
                            {dateOnly(row.date)} {row.time ? `· ${row.time}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-medium" style={{ color: t.text }}>
                          {formatAmount(row.amount, row.currency)}
                        </span>
                        <span className="flex items-center gap-1 text-[9.5px] font-medium rounded-full px-1.5 py-0.5" style={{ color: meta.tone, background: `${meta.tone}1a` }}>
                          <meta.icon size={9} className={meta.spin ? "animate-spin" : meta.pulse ? "animate-pulse" : ""} />
                          {meta.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {visibleRows.length === 0 && (
                  <p className="text-center text-xs py-8" style={{ color: t.textMuted }}>
                    No receipts yet.
                  </p>
                )}
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
