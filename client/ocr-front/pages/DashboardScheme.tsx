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
  ArrowLeft,
  ArrowRight,
  Hourglass,
  Timer,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  ExternalLink,
  Plus,
  Users,
  LogOut,
  User,
} from "lucide-react";
import { CardCarousel, type CarouselCard } from "./CardCarousel";
import { ChatAssistant } from "./ChatAssistant";
import {

  deleteReceipt as deleteReceiptApi,
  fetchReceipts as fetchReceiptsApi,
  updateReceipt as updateReceiptApi,
  getServerIp
} from "../src/lib/api";
import { buildSpendingContext } from "./spendingContext";

/* ============================================================================
   THEME — Castleton green / Saffron / Sea Salt / Paper. One token system,
   two modes. Every color used below is derived from this object so light
   and dark stay perfectly in sync.
   ========================================================================= */

const THEME = {
  light: {
    pageBg: "#F6F2E6",
    barBg: "#046241",
    sidebarBg: "#133020",
    surface: "#ffffff",
    surfaceAlt: "#f5eedb",
    text: "#133020",
    textMuted: "#046241",
    onBar: "#ffffff",
    onBarMuted: "rgba(255,255,255,0.7)",
    green: "#046241",
    greenDeep: "#133020",
    accent: "#FFB347",
    accentInk: "#133020",
    border: "rgba(19,48,32,0.1)",
    danger: "#ef4444",
    blue: "#3b82f6",
    paper: "#f5eedb",
  },
  dark: {
    pageBg: "#133020",
    barBg: "#046241",
    sidebarBg: "#0B1D13",
    surface: "#1A402A",
    surfaceAlt: "#046241",
    text: "#F9F7F7",
    textMuted: "#f5eedb",
    onBar: "#F9F7F7",
    onBarMuted: "rgba(249,247,247,0.7)",
    green: "#046241",
    greenDeep: "#133020",
    accent: "#FFB347",
    accentInk: "#133020",
    border: "rgba(249,247,247,0.15)",
    danger: "#ef4444",
    blue: "#3b82f6",
    paper: "#f5eedb",
  },
} as const;

type ThemeTokens = { [K in keyof typeof THEME.light]: string };
type Mode = "light" | "dark";

/** Brand gradients cycled across sender cards. */
const CARD_GRADIENTS = [
  "linear-gradient(135deg, #046241 0%, #133020 100%)",
  "linear-gradient(135deg, #FFB347 0%, #FFC370 100%)",
  "linear-gradient(135deg, #133020 0%, #046241 100%)",
  "linear-gradient(135deg, #046241 0%, #FFB347 100%)",
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
  processingTotal: number;
  processingCount: number;
  confirmedTotal: number;
  confirmedCount: number;
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

type DateRange = "weekly" | "monthly" | "yearly";
type View = "dashboard" | "inbox-processing" | "inbox-completed";

/* ============================================================================
   HELPERS
   ========================================================================= */

const RANGES: { key: DateRange; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

const STATUS_FILTERS: { key: "all" | string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "failed", label: "Failed" },
];

const STATUS_OPTIONS = ["Processing", "Confirmed"];

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
    total: { label: "Total Receipts", tone: t.accent, icon: InboxIcon },
    processing: { label: "Processing", tone: t.blue, icon: Hourglass },
    confirmed: { label: "Confirmed", tone: t.green, icon: FileText },
  };
  return map[key] ?? { label: status || "Unknown", tone: t.textMuted, icon: Hourglass };
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
      processingTotal: 0,
      processingCount: 0,
      confirmedTotal: 0,
      confirmedCount: 0,
    };
    entry.total += msg.grand_total;
    const status = msg.status ? msg.status.trim().toLowerCase() : "processing";
    if (status === "confirmed") {
      entry.confirmedTotal += msg.grand_total;
      entry.confirmedCount += msg.receipts.length;
    } else {
      // Treat everything else as processing
      entry.processingTotal += msg.grand_total;
      entry.processingCount += msg.receipts.length;
    }
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

  if (range === "weekly") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const buckets = Array(7).fill(0).map(() => ({ v: 0, c: 0 }));
    
    // Find Monday of the current week
    const currentDay = now.getDay();
    const diffToMonday = (currentDay === 0 ? 6 : currentDay - 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    flat.forEach((r) => {
      const d = new Date(r.date);
      if (d >= monday) {
        const dayIdx = (d.getDay() === 0 ? 6 : d.getDay() - 1);
        if (dayIdx >= 0 && dayIdx < 7) {
          buckets[dayIdx].v += r.amount;
          buckets[dayIdx].c += 1;
        }
      }
    });
    return buckets.map((b, i) => ({ label: days[i], value: b.v, count: b.c }));
  }

  if (range === "monthly") {
    const buckets = [{v:0, c:0}, {v:0, c:0}, {v:0, c:0}, {v:0, c:0}];
    flat.forEach((r) => {
      const d = new Date(r.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const week = Math.min(3, Math.floor((d.getDate() - 1) / 7));
        buckets[week].v += r.amount;
        buckets[week].c += 1;
      }
    });
    return buckets.map((b, i) => ({ label: `Wk ${i + 1}`, value: b.v, count: b.c }));
  }

  if (range === "yearly") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = Array(12).fill(0).map(() => ({ v: 0, c: 0 }));
    flat.forEach((r) => {
      const d = new Date(r.date);
      if (d.getFullYear() === now.getFullYear()) {
        const m = d.getMonth();
        buckets[m].v += r.amount;
        buckets[m].c += 1;
      }
    });
    return buckets.map((b, i) => ({ label: months[i], value: b.v, count: b.c }));
  }

  return [];
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
    candidates.push(`https://drive.google.com/thumbnail?id=${id}&sz=w3000-h3000`);
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
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

  if (!link) return null;

  const previewOptions = resolvePhotoSrcCandidates(link);
  const currentSrc = previewOptions[previewIndex];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="w-full h-full flex items-start justify-center pt-4">
      <div 
        className="relative group inline-flex overflow-hidden"
        onMouseMove={handleMouseMove}
        onClick={() => setIsZoomed(!isZoomed)}
        onMouseLeave={() => setIsZoomed(false)}
        style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in', maxHeight: '100%', maxWidth: '100%' }}
      >
        {!isZoomed && !previewFailed && (
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-bold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md">
            Click to zoom
          </div>
        )}
        {!previewFailed && currentSrc && (
          <img
            src={currentSrc}
            alt={`${merchant} receipt`}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{ 
              transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
              transformOrigin: zoomOrigin
            }}
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
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center w-64 h-64 bg-black/5">
            <p className="text-sm opacity-50">High quality preview unavailable.</p>
            <a href={link} target="_blank" rel="noreferrer" className="text-xs font-bold underline">Open in Drive</a>
          </div>
        )}
      </div>
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
    { key: "inbox-processing", label: "Receipt Inbox", icon: InboxIcon },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full p-1 backdrop-blur-md border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)" }}>
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = key.startsWith("inbox") ? view.startsWith("inbox") : view === key;
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

function ToastContainer({
  t,
  notifications,
  onMarkRead,
  onOpenReceipt,
}: {
  t: ThemeTokens;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onOpenReceipt: (id: string) => void;
}) {
  const unread = notifications.filter((n) => !n.read);

  if (unread.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
      <AnimatePresence>
        {unread.map((n) => {
          const Icon = NOTIF_ICONS[n.type];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="w-full flex items-start gap-3 p-4 rounded-2xl shadow-xl border pointer-events-auto"
              style={{ background: t.surface, borderColor: t.border }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: t.accent, color: t.accentInk }}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate" style={{ color: t.text }}>
                  {n.title}
                </p>
                <p className="text-xs mt-1 leading-snug" style={{ color: t.textMuted }}>
                  {n.detail}
                </p>
                <div className="flex gap-2 mt-3">
                  {n.receiptId && (
                    <button 
                      onClick={() => { onMarkRead(n.id); onOpenReceipt(n.receiptId!); }} 
                      className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                      style={{ background: t.accent, color: t.accentInk }}
                    >
                      View
                    </button>
                  )}
                  <button 
                    onClick={() => onMarkRead(n.id)} 
                    className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: t.surfaceAlt, color: t.text }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
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

function TransactionHistoryChart({ data, t }: { data: { label: string; value: number; count?: number }[]; t: ThemeTokens }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const PAD_TOP = 64;
  const PAD_BOTTOM = 24;
  const PAD_X = 24;
  const max = Math.max(1, ...data.map((d) => d.value));

  const points = data.map((d, i) => ({
    x: data.length > 1 ? PAD_X + (i * (W - PAD_X * 2)) / (data.length - 1) : W / 2,
    y: H - PAD_BOTTOM - (d.value / max) * (H - PAD_TOP - PAD_BOTTOM),
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${H - PAD_BOTTOM} L ${points[0].x} ${H - PAD_BOTTOM} Z` : "";

  return (
    <div className="w-full overflow-x-auto relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480, overflow: "visible" }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        
        {areaPath && (
          <>
            <clipPath id="areaClipReveal">
              <motion.rect
                initial={{ y: 0, height: 0 }}
                animate={{ y: 0, height: H }}
                transition={{ delay: 1, duration: 1, ease: "easeInOut" }}
                x={0}
                width={W}
              />
            </clipPath>
            <path 
              key={`area-${points.length}`} 
              d={areaPath} 
              fill="url(#chartFill)" 
              clipPath="url(#areaClipReveal)"
            />
          </>
        )}
        
        {linePath && (
          <motion.path 
            key={`line-${points.length}`} 
            initial={{ pathLength: 0 }} 
            animate={{ pathLength: 1 }} 
            transition={{ duration: 1, ease: "easeOut" }} 
            d={linePath} 
            fill="none" 
            stroke={t.green} 
            strokeWidth={3} 
            strokeLinecap="round" 
          />
        )}
        
        {points.map((p, i) => (
          <g key={`${i}-${points.length}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            <motion.circle 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 1.2 + i * 0.1, type: "spring" }} 
              cx={p.x} 
              cy={p.y} 
              r={hovered === i ? 6 : 4} 
              fill={t.accent} 
              stroke={t.surface} 
              strokeWidth={hovered === i ? 2 : 1.5} 
              style={{ transition: "r 0.2s, stroke-width 0.2s" }} 
            />
            <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
          </g>
        ))}
        
        {data.map((d, i) => (
          <text key={i} x={points[i]?.x ?? 0} y={H - 4} textAnchor="middle" fontSize={11} fill={t.textMuted}>
            {d.label}
          </text>
        ))}

        <AnimatePresence>
          {hovered !== null && data[hovered] && (
            <motion.g
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              style={{ pointerEvents: "none" }}
            >
              <rect
                x={Math.max(0, Math.min(W - 130, points[hovered].x - 65))}
                y={points[hovered].y - 55}
                width={130}
                height={42}
                rx={8}
                fill={t.surface}
                stroke={t.border}
                strokeWidth={1}
                filter="drop-shadow(0px 4px 12px rgba(0,0,0,0.15))"
              />
              <text x={Math.max(65, Math.min(W - 65, points[hovered].x))} y={points[hovered].y - 34} textAnchor="middle" fontSize={12} fontWeight="bold" fill={t.text}>
                {data[hovered].count ?? 0} Receipts
              </text>
              <text x={Math.max(65, Math.min(W - 65, points[hovered].x))} y={points[hovered].y - 20} textAnchor="middle" fontSize={10} fill={t.textMuted}>
                {data[hovered].label} · ₱{data[hovered].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

/* ============================================================================
   PIPELINE STATUS + RECENT STATUS STRIP
   ========================================================================= */

function PipelineStatus({ counts, t }: { counts: Record<string, number>; t: ThemeTokens }) {
  const ORDER = ["total", "processing", "confirmed"];
  const SUBTITLES: Record<string, string> = {
    total: "received from all users",
    processing: "currently processing",
    confirmed: "verified successfully",
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {ORDER.map((key) => {
        const m = statusMeta(t, key);
        const Icon = m.icon;
        return (
          <div key={key} className="flex flex-col justify-between rounded-2xl p-6 shadow-sm transition-all hover:shadow-md border" style={{ background: t.surface, borderColor: t.border }}>
            <div className="flex items-start justify-between mb-4">
              <p className="text-xs font-bold tracking-wider uppercase mt-1" style={{ color: t.textMuted }}>
                {m.label}
              </p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${m.tone}22` }}>
                <Icon size={14} color={m.tone} className={m.spin ? "animate-spin" : m.pulse ? "animate-pulse" : ""} />
              </div>
            </div>
            <div>
              <p className="text-[34px] font-extrabold mb-0.5 leading-none" style={{ color: t.greenDeep }}>
                {counts[key] ?? 0}
              </p>
            </div>
          </div>
        );
      })}
    </div>
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
  query,
  setQuery,
  filterStatus,
}: {
  t: ThemeTokens;
  receipts: ReceiptMessage[];
  focusId: string | null;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onSaveEdit: (id: string, updates: Partial<ReceiptMessage>) => void;
  query: string;
  setQuery: (q: string) => void;
  filterStatus: "processing" | "completed";
}) {
  const [listOpen, setListOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(receipts[0]?.id ?? null);
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ReceiptMessage | null>(null);

  useEffect(() => {
    if (focusId) setSelectedId(focusId);
  }, [focusId]);

  useEffect(() => {
    setSelectedId(null);
  }, [filterStatus]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return receipts
      .filter((m) => {
        const status = m.status.trim().toLowerCase();
        if (filterStatus === "completed") return status === "confirmed";
        return status === "processing" || status === "pending"; // pending included for older records
      })
      .filter((m) => (q ? [m.sender_name, m.status, ...m.receipts.map((r) => r.merchant_name)].join(" ").toLowerCase().includes(q) : true));
  }, [receipts, filterStatus, query]);

  const selected = receipts.find((m) => m.id === selectedId) ?? (filterStatus === "processing" ? filtered[0] : null);

  const startEdit = () => {
    if (selected) {
      setDraft(JSON.parse(JSON.stringify(selected)));
      setEditing(true);
    }
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
  };

  const saveEdit = () => {
    if (draft) {
      onSaveEdit(draft.id, draft);
      setDraft(null);
      setEditing(false);
    }
  };

  const updateDraftReceipt = (rIndex: number, field: string, value: any) => {
    if (!draft) return;
    const newDraft = { ...draft };
    newDraft.receipts[rIndex] = { ...newDraft.receipts[rIndex], [field]: value };
    newDraft.grand_total = newDraft.receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
    setDraft(newDraft);
  };

  const updateDraftItem = (rIndex: number, iIndex: number, field: string, value: any) => {
    if (!draft) return;
    const newDraft = { ...draft };
    const items = [...newDraft.receipts[rIndex].items];
    items[iIndex] = { ...items[iIndex], [field]: value };
    newDraft.receipts[rIndex].items = items;
    
    newDraft.receipts[rIndex].total_amount = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    newDraft.grand_total = newDraft.receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
    setDraft(newDraft);
  };

  const addDraftItem = (rIndex: number) => {
    if (!draft) return;
    const newDraft = { ...draft };
    newDraft.receipts[rIndex].items.push({ description: "", price: 0 });
    setDraft(newDraft);
  };

  const removeDraftItem = (rIndex: number, iIndex: number) => {
    if (!draft) return;
    const newDraft = { ...draft };
    newDraft.receipts[rIndex].items.splice(iIndex, 1);
    newDraft.receipts[rIndex].total_amount = newDraft.receipts[rIndex].items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    newDraft.grand_total = newDraft.receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
    setDraft(newDraft);
  };

  const isCompletedView = filterStatus === "completed";
  const listWidth = !listOpen 
    ? 0 
    : isCompletedView 
      ? '100%' 
      : 340;

  const renderDetailContent = () => {
    if (!selected) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm" style={{ color: t.textMuted }}>
            Select a receipt to view details.
          </p>
        </div>
      );
    }
    
    return (
      <div className="h-full flex flex-col p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: t.text }}>
              {selected.sender_name}
            </h2>
            <p className="text-sm mt-1 mb-3" style={{ color: t.textMuted }}>
              {dateTime(selected.createdAt)} · via {selected.source}
            </p>
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} t={t} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {selected.status !== 'Confirmed' && (
                  <button onClick={() => onStatusChange(selected.id, "Confirmed")} className="flex items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all" style={{ background: t.accent, color: '#ffffff' }}>
                    <Check size={16} /> Mark as Complete
                  </button>
                )}
                {!isCompletedView && (
                  <>
                    <button onClick={startEdit} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: t.surfaceAlt }} title="Edit receipt values">
                      <Pencil size={16} color={t.text} />
                    </button>
                    <button onClick={() => onDelete(selected.id)} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${t.danger}1a` }} title="Delete this submission">
                      <Trash2 size={16} color={t.danger} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button onClick={saveEdit} className="flex items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white shadow-sm" style={{ background: t.green }}>
                  <Check size={16} />
                  Save
                </button>
                <button onClick={cancelEdit} className="flex items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white shadow-sm" style={{ background: t.danger }}>
                  <X size={16} />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Split Container */}
        <div className="flex-1 rounded-2xl overflow-y-auto flex flex-col gap-6 p-2 lg:p-6" style={{ background: 'transparent' }}>
          {(isEditing ? draft : selected)!.receipts.map((r, rIndex) => (
            <div key={rIndex} className="flex flex-col min-h-0 gap-8 lg:flex-row items-start">
              
              {/* Left Column: Image Preview */}
              <div className="w-full lg:w-1/2 lg:sticky lg:top-0 lg:h-[75vh] flex items-start justify-center">
                {r.drive_link ? (
                  <ReceiptPhotoPreview link={r.drive_link} merchant={r.merchant_name} t={t} />
                ) : (
                  <div className="text-sm opacity-50 flex items-center justify-center h-64 w-full bg-black/5 rounded-2xl">No image provided</div>
                )}
              </div>
              
              {/* Right Column: Physical Receipt Styled Data */}
              <div className="w-full lg:w-1/2 flex justify-center py-4" style={{ filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.2)) drop-shadow(0 8px 10px rgba(0,0,0,0.1))' }}>
                <div 
                  className="w-full max-w-sm flex flex-col relative p-6 lg:p-8"
                  style={{ 
                    backgroundColor: '#fdfaf2',
                    color: '#2a2a2a',
                    fontFamily: '"Courier New", Courier, monospace'
                  }}
                >
                  {/* Perforated top edge */}
                  <div className="absolute top-0 left-0 right-0 h-2" style={{ 
                    marginTop: '-8px',
                    backgroundSize: '16px 8px', 
                    backgroundImage: 'radial-gradient(circle at 50% 0, transparent 4px, #fdfaf2 5px)', 
                  }}></div>

                  <div className="relative z-20 flex flex-col">
                    <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-6">
                      {isEditing ? (
                        <input 
                          value={r.merchant_name} 
                          onChange={(e) => updateDraftReceipt(rIndex, "merchant_name", e.target.value)} 
                          className="font-bold text-xl rounded px-2 py-1 outline-none border border-gray-200 bg-gray-50 w-full text-center mb-2" 
                        />
                      ) : (
                        <h3 className="font-bold text-2xl uppercase tracking-wider mb-2 text-gray-800">
                          {r.merchant_name}
                        </h3>
                      )}
                      
                      <div className="text-sm text-gray-500 font-mono flex items-center justify-center gap-2">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <input type="date" value={r.date} onChange={(e) => updateDraftReceipt(rIndex, "date", e.target.value)} className="rounded px-2 py-1 outline-none border border-gray-200 bg-gray-50" />
                            <input type="time" value={r.time ?? ''} onChange={(e) => updateDraftReceipt(rIndex, "time", e.target.value)} className="rounded px-2 py-1 outline-none border border-gray-200 bg-gray-50" />
                          </div>
                        ) : (
                          <>{dateOnly(r.date)} {r.time ? `· ${r.time}` : ""}</>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 font-mono text-sm pb-4">
                      {r.items.length > 0 && r.items.map((it, ii) => (
                        <div key={ii} className="flex items-start justify-between gap-3">
                          {isEditing ? (
                            <>
                              <input value={it.description} onChange={(e) => updateDraftItem(rIndex, ii, "description", e.target.value)} className="flex-1 rounded px-2 py-1 outline-none border border-gray-200 bg-gray-50" />
                              <input type="number" value={it.price} onChange={(e) => updateDraftItem(rIndex, ii, "price", parseFloat(e.target.value))} className="w-20 rounded px-2 py-1 outline-none border border-gray-200 bg-gray-50 text-right" />
                              <button onClick={() => removeDraftItem(rIndex, ii)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                            </>
                          ) : (
                            <>
                              <span className="uppercase flex-1 pr-4" style={{ color: '#333' }}>{it.description}</span>
                              <span className="font-semibold" style={{ color: '#000' }}>
                                {formatAmount(it.price, r.currency)}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                      {isEditing && (
                        <button onClick={() => addDraftItem(rIndex)} className="text-xs font-bold mt-4 flex items-center gap-1 text-green-700 hover:bg-green-50 px-2 py-1 rounded"><Plus size={14}/> ADD ITEM</button>
                      )}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                       <div className="flex items-center justify-between font-bold text-lg text-gray-900">
                         <span className="uppercase tracking-widest">Total</span>
                         <span>{formatAmount((isEditing ? draft : selected)!.grand_total, (isEditing ? draft : selected)!.receipts[0]?.currency)}</span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Perforated bottom edge */}
                  <div className="absolute bottom-0 left-0 right-0 h-2" style={{ 
                    marginBottom: '-8px',
                    backgroundSize: '16px 8px', 
                    backgroundImage: 'radial-gradient(circle at 50% 100%, transparent 4px, #fdfaf2 5px)', 
                  }}></div>
                  
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-1 overflow-hidden gap-5" style={{ background: "transparent" }}>
      {/* LIST OR TABLE */}
      <div
        className="flex-shrink-0 flex flex-col rounded-[24px] shadow-sm overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          background: t.surface,
          width: listWidth,
          opacity: listOpen ? 1 : 0,
          marginRight: listOpen ? 0 : -20,
          pointerEvents: listOpen ? "auto" : "none",
        }}
      >
        {isCompletedView ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-5 border-b shrink-0 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: t.border }}>
              <div className="flex items-center gap-3">
                <button onClick={() => setListOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80" style={{ background: `${t.accent}1a`, color: t.accent }}>
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-bold text-lg" style={{ color: t.text }}>Completed Records</h3>
                <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: t.surfaceAlt, color: t.textMuted }}>{filtered.length}</span>
              </div>
              <div className="relative w-64 max-w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" color={t.text} />
                <input
                  type="text"
                  placeholder="Search sender or merchant..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none"
                  style={{ background: t.surfaceAlt, color: t.text }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 z-10 shadow-sm" style={{ background: '#f8f6f0' }}>
                  <tr>
                    <th className="font-bold text-[10px] uppercase tracking-wider px-6 py-4 border-b text-gray-400" style={{ borderColor: t.border }}>NO.</th>
                    <th className="font-bold text-[10px] uppercase tracking-wider px-6 py-4 border-b text-gray-400" style={{ borderColor: t.border }}>Sender Name</th>
                    <th className="font-bold text-[10px] uppercase tracking-wider px-6 py-4 border-b text-gray-400" style={{ borderColor: t.border }}>Date</th>
                    <th className="font-bold text-[10px] uppercase tracking-wider px-6 py-4 border-b hidden sm:table-cell text-gray-400" style={{ borderColor: t.border }}>Source</th>
                    <th className="font-bold text-[10px] uppercase tracking-wider px-6 py-4 border-b text-center text-gray-400" style={{ borderColor: t.border }}>Items</th>
                    <th className="font-bold text-[10px] uppercase tracking-wider px-6 py-4 border-b text-right text-gray-400" style={{ borderColor: t.border }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12" style={{ color: t.textMuted }}>
                        <InboxIcon size={32} opacity={0.2} className="mx-auto mb-3" />
                        <p className="text-sm font-semibold">No records found</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m, i) => {
                      const active = selectedId === m.id;
                      return (
                        <tr 
                          key={m.id} 
                          onClick={() => { setSelectedId(m.id); if (isEditing) cancelEdit(); }}
                          className="cursor-pointer transition-colors"
                          style={{ background: active ? '#f3f0e0' : 'transparent' }}
                          onMouseEnter={(e) => !active && (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                          onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="px-6 py-5 border-b font-medium text-gray-400" style={{ borderColor: t.border }}>{i + 1}</td>
                          <td className="px-6 py-5 border-b" style={{ borderColor: t.border }}>
                            <div className="font-bold truncate max-w-[200px]" style={{ color: t.text }}>{m.sender_name}</div>
                          </td>
                          <td className="px-6 py-5 border-b whitespace-nowrap" style={{ borderColor: t.border, color: t.text }}>
                            <div className="text-sm font-medium">{dateOnly(m.createdAt)}</div>
                          </td>
                          <td className="px-6 py-5 border-b hidden sm:table-cell" style={{ borderColor: t.border }}>
                            <div className="text-sm font-medium" style={{ color: t.text }}>{m.source}</div>
                          </td>
                          <td className="px-6 py-5 border-b text-center" style={{ borderColor: t.border }}>
                            <span className="px-3 py-1.5 rounded-md text-[11px] font-bold" style={{ background: '#f2ecdb', color: '#333' }}>
                              {m.receipts.length} Receipt{m.receipts.length > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-5 border-b text-right font-bold whitespace-nowrap" style={{ borderColor: t.border, color: t.text }}>
                            {formatAmount(m.grand_total, m.receipts[0]?.currency)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-5 border-b shrink-0 flex flex-col gap-4" style={{ borderColor: t.border }}>
              <div className="flex items-center gap-3">
                <button onClick={() => setListOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80" style={{ background: `${t.accent}1a`, color: t.accent }}>
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 className="font-bold text-base" style={{ color: t.text }}>Receipt Inbox</h3>
                  <p className="text-xs" style={{ color: t.textMuted }}>{filtered.length} submissions</p>
                </div>
              </div>
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" color={t.text} />
                <input
                  type="text"
                  placeholder="Search sender or merchant"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: t.surfaceAlt, color: t.text }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6" style={{ color: t.textMuted }}>
                  <InboxIcon size={32} opacity={0.2} className="mb-3" />
                  <p className="text-sm font-semibold">No records found</p>
                </div>
              ) : (
                filtered.map((m) => {
                  const active = selectedId === m.id;
                  const meta = statusMeta(t, m.status);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedId(m.id);
                        if (isEditing) cancelEdit();
                      }}
                      className="w-full flex flex-col p-4 rounded-xl text-left transition-colors relative mb-2"
                      style={{
                        background: active ? '#f3f0e0' : "transparent",
                      }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: meta.tone }} />
                          <span className="font-bold text-[14px] truncate" style={{ color: t.text }}>
                            {m.sender_name}
                          </span>
                        </div>
                        <span className="font-bold text-sm" style={{ color: t.text }}>
                          {formatAmount(m.grand_total, m.receipts[0]?.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: t.textMuted, marginLeft: '16px' }}>
                        <span>{dateOnly(m.createdAt)} · {m.receipts.length} receipt{m.receipts.length > 1 ? 's' : ''}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {!listOpen && (
        <button
          onClick={() => setListOpen(true)}
          className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-4 rounded-r-2xl shadow-lg z-10"
          style={{ background: t.surface, color: t.green }}
          title="Show inbox list"
        >
          <ArrowRight size={16} />
        </button>
      )}

      {/* DETAIL OR MODAL */}
      {isCompletedView ? (
        selected && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8" 
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} 
            onClick={() => { setSelectedId(null); if (isEditing) cancelEdit(); }}
          >
            <div 
              className="relative w-full max-w-7xl max-h-full rounded-[24px] shadow-2xl overflow-hidden flex flex-col" 
              style={{ background: t.surface }} 
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => { setSelectedId(null); if (isEditing) cancelEdit(); }} 
                className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex-1 overflow-y-auto">
                {renderDetailContent()}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex-1 rounded-[24px] shadow-sm overflow-hidden flex flex-col" style={{ background: t.surface }}>
          {renderDetailContent()}
        </div>
      )}
    </div>
  );
}
/* ============================================================================
   MAIN DASHBOARD — default export, owns all app state
   ========================================================================= */

export default function LifeReceiptDashboard({ currentUser, onLogout }: { currentUser?: any; onLogout: () => Promise<void> | void }) {
  const [mode, setMode] = useState<Mode>("light");
  const t = THEME[mode];

  const [receipts, setReceipts] = useState<ReceiptMessage[]>([]);
  const [receiptsLoaded, setReceiptsLoaded] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<DateRange>("monthly");
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [sidebarFilter, setSidebarFilter] = useState<string>("all");
  const [activeSenderIndex, setActiveSenderIndex] = useState(0);
  const [focusReceiptId, setFocusReceiptId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string>("");

  const receiptsRef = useRef<ReceiptMessage[]>([]);
  const hasLoadedOnceRef = useRef(false);
  
  useEffect(() => {
    getServerIp()
      .then((res) => setBackendUrl(`http://${res.ip}:${res.port}`))
      .catch((e) => console.warn("Failed to get server IP", e));
  }, []);

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
    // Dynamic ultra-fast polling every 3 seconds so new entries appear almost instantly
    const interval = window.setInterval(() => void loadReceipts(), 3000);
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
    setView("inbox-processing");
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadReceipts();
    setRefreshing(false);
  };

  const flatRows = useMemo(() => flattenReceipts(receipts), [receipts]);
  const senders = useMemo(() => summarizeSenders(receipts), [receipts]);

  // Sync search query to carousel selection
  useEffect(() => {
    if (query.trim() && view === "dashboard") {
      const q = query.trim().toLowerCase();
      // Try to find a matching sender card
      const matchIndex = senders.findIndex(s => s.name.toLowerCase().includes(q));
      if (matchIndex !== -1) {
        // Since we filter processingCount > 0 for carousel, we need to find the correct index in carouselCards
        const carouselMatch = senders.filter(s => s.processingCount > 0).findIndex(s => s.name.toLowerCase().includes(q));
        if (carouselMatch !== -1) {
          setActiveSenderIndex(carouselMatch);
        }
      }
    }
  }, [query, senders, view]);

  const chartData = useMemo(() => buildSeries(flatRows, range), [flatRows, range]);
  
  const { currentTotal, prevTotal } = useMemo(() => {
    const now = new Date();
    let current = 0;
    let prev = 0;

    if (range === "weekly") {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const prevMonday = new Date(monday);
      prevMonday.setDate(monday.getDate() - 7);

      flatRows.forEach((r) => {
        const d = new Date(r.date);
        if (d >= monday) current += r.amount;
        else if (d >= prevMonday && d < monday) prev += r.amount;
      });
    } else if (range === "monthly") {
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      flatRows.forEach((r) => {
        const d = new Date(r.date);
        if (d >= currentMonthStart) current += r.amount;
        else if (d >= prevMonthStart && d < currentMonthStart) prev += r.amount;
      });
    } else if (range === "yearly") {
      const currentYearStart = new Date(now.getFullYear(), 0, 1);
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);

      flatRows.forEach((r) => {
        const d = new Date(r.date);
        if (d >= currentYearStart) current += r.amount;
        else if (d >= prevYearStart && d < currentYearStart) prev += r.amount;
      });
    }
    return { currentTotal: current, prevTotal: prev };
  }, [flatRows, range]);

  const growthPct = prevTotal ? (((currentTotal - prevTotal) / prevTotal) * 100).toFixed(2) : "0.00";
  const isPositive = Number(growthPct) >= 0;

  const carouselCards: CarouselCard[] = senders
    .filter((s) => s.processingCount > 0)
    .map((s, i) => ({
      background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
      label: s.name,
      balance: formatAmount(s.total, s.currency),
      processingAmount: formatAmount(s.processingTotal, s.currency),
      processingCount: s.processingCount,
      confirmedAmount: formatAmount(s.confirmedTotal, s.currency),
      confirmedCount: s.confirmedCount,
      last4: String(s.messageCount).padStart(2, "0"),
      dateLabel: s.latestDate ? dateOnly(s.latestDate) : undefined,
      contactNumber: s.latestMerchant,
      items: s.latestItems,
      exportUrl: backendUrl ? `${backendUrl}/api/receipts/export?sender=${encodeURIComponent(s.name)}` : undefined
    }));

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = { total: flatRows.length };
    receipts.forEach((m) => {
      const key = m.status.trim().toLowerCase();
      // Keep other counts as message/submission counts for now
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [receipts, flatRows.length]);

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
    <div className="flex flex-row h-screen w-full font-sans transition-colors duration-500 overflow-hidden" style={{ background: t.pageBg, color: t.text }}>
      <ToastStack t={t} toasts={toasts} onOpenReceipt={openReceipt} />
      <ChatAssistant accent={t.accent} currency="PHP" buildContext={() => buildSpendingContext(receipts, "PHP")} />

      {/* GLOBAL SIDEBAR */}
      <aside 
        className={`flex-shrink-0 flex flex-col transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.03)] relative z-30 ${isCollapsed ? 'w-20' : 'w-64'}`}
        style={{ background: t.sidebarBg, color: t.onBar }}
      >
        {/* LOGO */}
        <div className="flex items-center justify-center h-24 px-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {isCollapsed ? (
            <div className="w-14 h-14 rounded-[20px] bg-white shadow-sm flex items-center justify-center mx-auto shrink-0">
              <img src="/logo-icon.png" alt="LifeRCP Logo" className="w-[42px] h-[42px] rounded-full object-contain" />
            </div>
          ) : (
            <div className="w-full h-14 rounded-2xl bg-white shadow-sm overflow-hidden flex items-center justify-center">
              <img src="/logo.jpeg" alt="LifeRCP Logo" className="w-full h-full object-cover object-center scale-[0.80]" />
            </div>
          )}
        </div>

        {/* COLLAPSE TOGGLE */}
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center py-4 cursor-pointer transition-colors"
          style={{ color: '#88a698' }}
        >
          {isCollapsed ? <ArrowRight size={16} /> : (
            <span className="flex items-center gap-2 text-[13px] font-medium tracking-wide">
              Collapse <ArrowLeft size={16} />
            </span>
          )}
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-2 px-3 mt-2">
          <button 
            onClick={() => setView("dashboard")}
            className={`w-full flex items-center transition-all duration-300 rounded-xl ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`} 
            style={view === "dashboard" ? { background: '#0a4226', color: '#ffffff' } : { background: 'transparent', color: '#e2e8f0' }}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={20} className="shrink-0" />
              {!isCollapsed && <span className="text-[15px] font-bold tracking-wide">Dashboard</span>}
            </div>
            
          </button>
          
          <div className="flex flex-col">
            <button 
              onClick={() => setView(view.startsWith("inbox") ? "dashboard" : "inbox-processing")} 
              className={`w-full flex items-center justify-between transition-all duration-300 rounded-xl ${isCollapsed ? 'justify-center p-3 relative' : 'px-4 py-3'}`} 
              style={view.startsWith("inbox") ? { background: '#0a4226', color: '#ffffff' } : { background: 'transparent', color: '#e2e8f0' }}
              title={isCollapsed ? "Records" : undefined}
            >
              <div className="flex items-center gap-3">
                <InboxIcon size={20} className="shrink-0" />
                {!isCollapsed && <span className="text-[15px] font-bold tracking-wide">Records</span>}
              </div>
              
              {isCollapsed && openInboxCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#dca842]" />
              )}
            </button>
            
            {!isCollapsed && view.startsWith("inbox") && (
              <div className="flex flex-col gap-1 mt-2 pl-4 border-l-2 ml-6" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <button 
                  onClick={() => setView("inbox-processing")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                  style={view === "inbox-processing" ? { color: '#ffffff', background: 'rgba(255,255,255,0.1)' } : { color: '#88a698' }}
                >
                  <Hourglass size={14} /> Processing
                </button>
                <button 
                  onClick={() => setView("inbox-completed")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                  style={view === "inbox-completed" ? { color: '#ffffff', background: 'rgba(255,255,255,0.1)' } : { color: '#88a698' }}
                >
                  <CheckCircle2 size={14} /> Completed
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* BOTTOM PROFILE / ACTIONS */}
        <div className="p-3 pb-8 flex flex-col gap-4">
          {/* Lifewood Logo Pill */}
          {isCollapsed ? (
            <div className="w-14 h-14 rounded-[20px] bg-white shadow-sm flex items-center justify-center mx-auto shrink-0 mb-2">
              <div className="w-[16px] h-[38px] overflow-hidden relative">
                <img src="/lifewood-logo.png" alt="Lifewood" className="absolute left-[-2px] top-0 h-full w-auto max-w-none" />
              </div>
            </div>
          ) : (
            <div className="w-full bg-white rounded-2xl h-14 flex items-center justify-center shadow-sm p-1.5 overflow-hidden">
              <img src="/lifewood-logo.png" alt="Lifewood" className="w-full h-full object-contain object-center scale-[0.85]" />
            </div>
          )}

          <div className={`flex items-center rounded-2xl transition-all p-3 ${isCollapsed ? 'flex-col gap-4' : 'gap-3'}`} style={{ background: '#1c3629', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-[15px] uppercase" style={{ background: '#0a4226', color: '#fff' }}>
              {currentUser ? `${currentUser.firstName?.[0] || ""}${currentUser.lastName?.[0] || ""}` : "NL"}
            </div>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                <p className="text-[14px] font-bold text-white truncate leading-tight tracking-wide">
                  {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Nathaniel La..."}
                </p>
                {currentUser?.role && (
                  <p className="text-[11px] tracking-wide text-gray-400 truncate leading-tight mt-0.5">
                    {currentUser.role}
                  </p>
                )}
                {!currentUser?.role && (
                  <p className="text-[11px] tracking-wide text-gray-400 truncate leading-tight mt-0.5">
                    Superadmin
                  </p>
                )}
              </div>
            )}

            {!isCollapsed && (
              <div className={`flex items-center gap-4 shrink-0`}>
                <button
                  onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
                  className="hover:text-white text-gray-400 transition-colors"
                  title="Toggle theme"
                >
                  {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                  onClick={onLogout}
                  className="hover:text-white text-gray-400 transition-colors"
                  title="Log out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ToastContainer 
          t={t} 
          notifications={notifications} 
          onMarkRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))}
          onOpenReceipt={openReceipt}
        />
        {/* BODY */}
        <main className="flex-1 relative overflow-hidden" style={{ background: t.pageBg }}>
          <AnimatePresence mode="wait">
            {view.startsWith("inbox") ? (
              <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col pt-8 pb-5">
                {/* PAGE TITLE */}
                <div className="px-8 mb-6 flex justify-between items-start shrink-0">
                  <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-1" style={{ color: t.accent }}>
                      {view === "inbox-completed" ? "Completed Records" : "Processing Records"}
                    </h1>
                  </div>
                </div>
                <div className="px-8 flex-1 min-h-0 flex">
                  <ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} query={query} setQuery={setQuery} filterStatus={view === "inbox-completed" ? "completed" : "processing"} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col overflow-y-auto pt-8 pb-10">
                {/* PAGE TITLE */}
                <div className="px-8 mb-6 flex justify-between items-start shrink-0">
                  <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-1" style={{ color: t.accent }}>Dashboard Overview</h1>
                  </div>
                </div>

                {/* BOTTOM CONTENT (SPLIT) */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 px-8 min-h-0 shrink-0">
                  
                  {/* LEFT MAIN CONTENT */}
                  <div className="flex-1 flex flex-col min-w-0 space-y-6">
                    {/* SEARCH BAR */}
                    <div className="shrink-0">
                      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-sm transition-shadow focus-within:shadow-md" style={{ background: t.surface, borderColor: t.border }}>
                        <Search size={18} color={t.textMuted} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search sender, merchant, date, status..."
                          className="bg-transparent outline-none text-[15px] font-medium flex-1 placeholder:opacity-50"
                          style={{ color: t.greenDeep }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && query.trim() !== "") {
                              setView("inbox-processing");
                            }
                          }}
                        />
                      </div>
                    </div>

                    <PipelineStatus counts={pipelineCounts} t={t} />

                    <section className="rounded-2xl p-6 transition-colors duration-500 shadow-sm" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
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

                      <TransactionHistoryChart key={JSON.stringify(chartData)} data={chartData} t={t} />
                    </section>
                    <StatusUpdateStrip receipts={receipts} t={t} onOpen={openReceipt} />
                  </div>

                  {/* RIGHT SIDEBAR */}
                  <aside className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col space-y-2">
                    {/* MACHINE SECTION (No Card Background) */}
                    <div className="flex flex-col px-2 pb-0">
                      {carouselCards.length > 0 ? (
                        <CardCarousel cards={carouselCards} activeIndex={activeSenderIndex} onActiveChange={setActiveSenderIndex} />
                      ) : (
                        <div className="rounded-2xl border border-dashed py-10 flex items-center justify-center text-xs" style={{ borderColor: t.border, color: t.textMuted }}>
                          No senders yet
                        </div>
                      )}
                    </div>

                    {/* FILTERS & RECEIPTS (Inside the card) */}
                    <div className="p-6 rounded-2xl border transition-colors duration-500 shadow-sm flex flex-col space-y-5" style={{ background: t.surface, borderColor: t.border }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {SIDEBAR_FILTERS.map((f) => (
                          <button
                            key={f.key}
                            onClick={() => setSidebarFilter(f.key)}
                            className="text-[11px] px-3 py-1.5 rounded-full transition-colors shadow-sm"
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
                        {visibleRows.slice(0, 5).map((row, i) => {
                          const meta = statusMeta(t, row.status);
                          return (
                            <button key={`${row.messageId}_${i}`} onClick={() => openReceipt(row.messageId)} className="w-full flex items-center justify-between px-2 py-3 rounded-xl transition-colors text-left hover:opacity-90">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: t.green, color: "#fff" }}>
                                  {row.merchant.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm truncate font-semibold" style={{ color: t.text }}>
                                    {row.merchant}
                                  </p>
                                  <p className="text-[11px] truncate" style={{ color: t.textMuted }}>
                                    {row.sender}
                                  </p>
                                  <p className="text-[10.5px] mt-0.5" style={{ color: t.textMuted, opacity: 0.7 }}>
                                    {dateOnly(row.date)} {row.time ? `· ${row.time}` : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className="text-sm font-bold" style={{ color: t.text }}>
                                  {formatAmount(row.amount, row.currency)}
                                </span>
                                <span className="flex items-center gap-1 text-[9.5px] font-semibold rounded-full px-2 py-0.5" style={{ color: meta.tone, background: `${meta.tone}1a` }}>
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
                    </div>
                  </aside>
                </div>
              </motion.div>
        )}
      </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
