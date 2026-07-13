"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Inbox as InboxIcon,
  Upload,
  LogOut,
  Settings,
  Plus,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  Trash2,
  FileDown,
  ChevronDown,
  Check,
  ScanLine,
  Sparkles,
  Eye,
  X,
  Image as ImageIcon,
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
  Mail,
  Banknote,
  CreditCard,
  Camera,
  FileImage,
  UploadCloud,
  Pencil,
  Lock,
} from "lucide-react";
import { CardCarousel, type CarouselCard } from "./CardCarousel";
import { ChatAssistant } from "./ChatAssistant";
import { createReceipt, deleteReceipt as deleteReceiptApi, fetchReceipts, updateReceipt, type ReceiptPayload } from "../src/lib/api";
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

/** Brand gradients used to cycle "My cards" backgrounds — always dark enough for white card type. */
const CARD_GRADIENTS = [
  "linear-gradient(135deg, #00563B 0%, #003624 100%)",
  "linear-gradient(135deg, #B98A00 0%, #003624 100%)",
  "linear-gradient(135deg, #3D8BFF 0%, #04160F 100%)",
  "linear-gradient(135deg, #0F6B48 0%, #003B28 100%)",
];

/* ============================================================================
   TYPES  (unchanged data model from DashboardScheme.tsx)
   ========================================================================= */

type ReceiptStatus = "processing" | "pending" | "complete" | "failed";
type PaymentType = "cash" | "online";
type Role = "Admin" | "User" | "Viewer";

interface LineItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface Receipt {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  status: ReceiptStatus;
  auto: boolean;
  paymentMethod: string;
  paymentType: PaymentType;
  source: "upload" | "camera" | "email";
  accountLast4: string;
  contactNumber: string;
  imagePreview?: string;
  lineItems: LineItem[];
  timeline: { label: string; time: string; done: boolean }[];
}

interface Transaction {
  id: string;
  receiptId: string;
  vendor: string;
  amount: number;
  date: string;
  time: string;
  category: string;
  status: ReceiptStatus;
  paymentMethod: string;
  paymentType: PaymentType;
  emailSource?: string;
  accountLast4: string;
}

interface HistoryEntry {
  id: string;
  accountLast4: string;
  vendor: string;
  amount: number;
  date: string;
}

interface AppNotification {
  id: string;
  type: "new_receipt" | "email" | "ocr_complete" | "processing_failed" | "ai_extraction";
  title: string;
  detail: string;
  time: string;
  read: boolean;
  receiptId?: string;
}

interface Account {
  id: string;
  last4: string;
  name: string;
  role: Role;
  email: string;
  password: string;
  avatarColor: string;
  balance: number;
}

type DateRange = "1m" | "3m" | "6m" | "1y";
type View = "dashboard" | "inbox";

/* ============================================================================
   MOCK DATA / HELPERS
   ========================================================================= */

const VENDORS = [
  { name: "Nike Store", category: "Retail", contact: "+63 917 200 1122" },
  { name: "WeWork", category: "Workspace", contact: "+63 918 334 5567" },
  { name: "Google Drive", category: "Subscription", contact: "+63 2 8888 0000" },
  { name: "Starbucks", category: "Food & Drink", contact: "+63 917 555 0192" },
  { name: "Jollibee", category: "Food & Drink", contact: "+63 2 8879 8888" },
  { name: "Grab", category: "Transport", contact: "+63 2 7902 0100" },
];

const PAYMENT_METHODS: { label: string; type: PaymentType }[] = [
  { label: "GCash", type: "online" },
  { label: "Visa •• 5008", type: "online" },
  { label: "Cash", type: "cash" },
  { label: "Mastercard •• 6150", type: "online" },
];

const RANGES: { key: DateRange; label: string }[] = [
  { key: "1m", label: "1 Month" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
];

/** Status → color + icon, resolved against the active theme so both modes stay legible. */
function pipelineMeta(t: ThemeTokens) {
  return {
    processing: { label: "Processing", tone: t.accent, icon: Loader2, spin: true, pulse: false },
    pending: { label: "Pending", tone: t.blue, icon: Clock, spin: false, pulse: true },
    complete: { label: "Complete", tone: t.green, icon: CheckCircle2, spin: false, pulse: false },
    failed: { label: "Failed", tone: t.danger, icon: AlertTriangle, spin: false, pulse: false },
  } as const;
}

const STATUS_OPTIONS: { key: ReceiptStatus; label: string }[] = [
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "complete", label: "Complete" },
];

const STATUS_FILTERS: { key: "all" | ReceiptStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "complete", label: "Complete" },
  { key: "failed", label: "Failed" },
];

const NOTIF_ICONS: Record<AppNotification["type"], any> = {
  new_receipt: FileText,
  email: Mail,
  ocr_complete: CheckCircle2,
  processing_failed: AlertTriangle,
  ai_extraction: Sparkles,
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function peso(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateAndYear(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function randomLast4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function readImagePreview(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function receiptToBackendPayload(receipt: Receipt): ReceiptPayload {
  return {
    ...receipt,
    status: receipt.status,
    paymentType: receipt.paymentType,
    source: receipt.source,
    lineItems: receipt.lineItems,
    timeline: receipt.timeline,
  };
}

function makeReceipt(opts: {
  vendor: (typeof VENDORS)[number];
  amount: number;
  date: Date;
  status: ReceiptStatus;
  source: "upload" | "camera" | "email";
  accountLast4: string;
  payment: (typeof PAYMENT_METHODS)[number];
  imagePreview?: string;
}): Receipt {
  const { vendor, amount, date, status, source, accountLast4, payment, imagePreview } = opts;
  const done = status === "complete";
  return {
    id: uid("rcpt"),
    vendor: vendor.name,
    amount,
    date: date.toISOString(),
    category: vendor.category,
    status,
    auto: true,
    paymentMethod: payment.label,
    paymentType: payment.type,
    source,
    accountLast4,
    contactNumber: vendor.contact,
    imagePreview,
    lineItems: [
      { id: uid("li"), name: `${vendor.name} item A`, qty: 1, price: Math.round(amount * 0.6 * 100) / 100 },
      { id: uid("li"), name: `${vendor.name} item B`, qty: 1, price: Math.round(amount * 0.4 * 100) / 100 },
    ],
    timeline: [
      { label: "Uploaded", time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), done: true },
      { label: "OCR scan", time: done ? "Complete" : "", done },
      { label: "AI extraction", time: done ? "Complete" : "", done },
      { label: "Ready for review", time: done ? "Complete" : "", done },
    ],
  };
}

function seedAccounts(): Account[] {
  return [
    { id: "acc_1", last4: "5008", name: "Ethan Reynolds", role: "Admin", email: "ethan@lifewood.ai", password: "••••••••", avatarColor: "#F4C430", balance: 12850 },
    { id: "acc_2", last4: "6150", name: "Mika Santos", role: "User", email: "mika.ops@lifewood.ai", password: "••••••••", avatarColor: "#3D8BFF", balance: 6150 },
    { id: "acc_3", last4: "3140", name: "Carlo Dizon", role: "Viewer", email: "carlo.view@lifewood.ai", password: "••••••••", avatarColor: "#00563B", balance: 3140 },
  ];
}

function seedReceipts(accounts: Account[]): Receipt[] {
  const out: Receipt[] = [];
  const now = new Date();
  accounts.forEach((acc, accIdx) => {
    for (let m = 5; m >= 0; m--) {
      const count = 1 + ((m + accIdx) % 2);
      for (let c = 0; c < count; c++) {
        const vendor = VENDORS[(m + c + accIdx) % VENDORS.length];
        const payment = PAYMENT_METHODS[(m + c) % PAYMENT_METHODS.length];
        const day = 3 + c * 9;
        const date = new Date(now.getFullYear(), now.getMonth() - m, Math.min(day, 27));
        const amount = Math.round((40 + ((m * 13 + c * 7 + accIdx * 5) % 160)) * 100) / 100;
        out.push(makeReceipt({ vendor, amount, date, status: "complete", source: "upload", accountLast4: acc.last4, payment }));
      }
    }
  });
  return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function receiptToTransaction(r: Receipt): Transaction {
  return {
    id: uid("txn"),
    receiptId: r.id,
    vendor: r.vendor,
    amount: r.amount,
    date: r.date,
    time: nowTime(),
    category: r.category,
    status: r.status,
    paymentMethod: r.paymentMethod,
    paymentType: r.paymentType,
    emailSource: r.source === "email" ? "receipts@vendor.com" : undefined,
    accountLast4: r.accountLast4,
  };
}

function receiptToHistoryEntry(r: Receipt): HistoryEntry {
  return { id: uid("hist"), accountLast4: r.accountLast4, vendor: r.vendor, amount: r.amount, date: r.date };
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

function buildSeries(history: HistoryEntry[], last4: string, range: DateRange) {
  const now = new Date();
  const filtered = history.filter((t) => t.accountLast4 === last4);

  if (range === "1m") {
    const buckets = [0, 0, 0, 0];
    filtered.forEach((t) => {
      const d = new Date(t.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const week = Math.min(3, Math.floor((d.getDate() - 1) / 7));
        buckets[week] += t.amount;
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
    value: filtered
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === l.year && d.getMonth() === l.month;
      })
      .reduce((a, t) => a + t.amount, 0),
  }));
}

/** Exports a CSV (Excel-compatible) breakdown of a single receipt. */
function exportReceiptCsv(r: Receipt) {
  const header = ["Field", "Value"];
  const rows = [
    ["Brand / Establishment", r.vendor],
    ["Date", dateAndYear(r.date)],
    ["Amount", peso(r.amount)],
    ["Payment Method", `${r.paymentMethod} (${r.paymentType === "cash" ? "Cash" : "Online"})`],
    ["Category", r.category],
    ["Source", r.source],
    ["Status", r.status],
    ["", ""],
    ["Line Item", "Price"],
    ...r.lineItems.map((li) => [`${li.qty}x ${li.name}`, peso(li.price)]),
  ];
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.vendor.replace(/\s+/g, "_")}_receipt.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================================
   UPLOAD SCREEN — zero-state, shown when there are zero receipts
   ========================================================================= */

function UploadScreen({ t, onUpload }: { t: ThemeTokens; onUpload: (source: "upload" | "camera", fileName?: string, imagePreview?: string) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const ACCEPTED = ".jpg,.jpeg,.png,.heic,.pdf,.xlsx,.xls";

  const handleFiles = useCallback(
    async (files: FileList | null, source: "upload" | "camera" = "upload") => {
      if (!files || !files.length) return;
      setProcessing(true);
      const file = files[0];
      const preview = await readImagePreview(file);
      window.setTimeout(() => {
        onUpload(source, file.name, preview);
        setProcessing(false);
      }, 900);
    },
    [onUpload]
  );

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden" style={{ background: t.greenDeep, color: t.onBar }}>
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full blur-[130px]"
          style={{ background: `${t.accent}22` }}
          animate={{ y: [0, 24, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: `${t.blue}22` }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative z-10 w-full max-w-xl mx-6">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: t.accent }}>
            LifeReceipt
          </p>
          <h1 className="text-3xl font-semibold">Add your first receipt</h1>
          <p className="text-sm mt-2" style={{ color: t.onBarMuted }}>
            Drop a file, snap a photo, or upload — we&apos;ll scan and extract everything for you.
          </p>
        </div>

        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          animate={{ scale: dragOver ? 1.02 : 1, borderColor: dragOver ? t.accent : "rgba(255,255,255,0.14)" }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative rounded-[28px] border-2 border-dashed backdrop-blur-xl px-8 py-14 flex flex-col items-center text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border border-white/10"
            style={{ background: `${t.accent}1f` }}
          >
            {processing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <UploadCloud size={26} color={t.accent} />
              </motion.div>
            ) : (
              <UploadCloud size={26} color={t.accent} />
            )}
          </motion.div>

          <p className="font-medium">{processing ? "Scanning your receipt…" : "Drag & drop a receipt here"}</p>
          <p className="text-xs mt-1 mb-6" style={{ color: t.onBarMuted }}>
            JPG · PNG · HEIC · PDF · EXCEL
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg"
              style={{ background: t.accent, color: t.accentInk }}
            >
              <FileText size={15} /> Upload Receipt
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
            >
              <Camera size={15} /> Camera
            </motion.button>
          </div>

          <div className="flex items-center gap-2 mt-6 text-[11px]" style={{ color: t.onBarMuted }}>
            <FileImage size={12} /> Files stay on your encrypted workspace
          </div>

          <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files, "camera")} />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ============================================================================
   SHARED BITS: status badge, receipt thumb
   ========================================================================= */

function StatusBadge({ status, t }: { status: ReceiptStatus; t: ThemeTokens }) {
  const meta = pipelineMeta(t)[status];
  return (
    <motion.span
      key={status}
      initial={status === "complete" ? { scale: 0.85, opacity: 0.5 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${status === "pending" ? "animate-pulse" : ""}`}
      style={{ color: meta.tone, background: `${meta.tone}1a`, border: `1px solid ${meta.tone}40` }}
    >
      {meta.label}
    </motion.span>
  );
}

/* ============================================================================
   TOP BAR — bell / nav pill / upload / theme toggle
   ========================================================================= */

function NavPill({ view, setView, t, onUploadClick, canManage }: { view: View; setView: (v: View) => void; t: ThemeTokens; onUploadClick: () => void; canManage: boolean }) {
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
      {canManage && (
        <button onClick={onUploadClick} className="relative flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full transition-colors font-semibold" style={{ color: t.onBar, background: "rgba(255,255,255,0.12)" }}>
          <Upload size={13} />
          Upload New Receipt
        </button>
      )}
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

function AccountSwitcher({
  t,
  accounts,
  activeIndex,
  onSwitch,
  onUpdateCredentials,
}: {
  t: ThemeTokens;
  accounts: Account[];
  activeIndex: number;
  onSwitch: (i: number) => void;
  onUpdateCredentials: (id: string, email: string, password: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPassword, setDraftPassword] = useState("");
  const active = accounts[activeIndex];
  const ROLE_TONE: Record<Role, string> = { Admin: t.accent, User: t.blue, Viewer: t.onBarMuted };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 pl-3 border-l border-white/15 cursor-pointer">
        <div className="w-8 h-8 rounded-full" style={{ background: `linear-gradient(135deg, ${active.avatarColor}, ${t.greenDeep})` }} />
        <div className="leading-tight text-left hidden sm:block">
          <p className="text-xs font-medium" style={{ color: t.onBar }}>
            {active.name}
          </p>
          <p className="text-[10px]" style={{ color: ROLE_TONE[active.role] }}>
            {active.role} · •• {active.last4}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown size={13} color={t.onBarMuted} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-11 w-72 rounded-2xl shadow-2xl z-30 overflow-hidden border"
              style={{ background: t.surface, borderColor: t.border }}
            >
              <div className="px-4 py-2.5 border-b" style={{ borderColor: t.border }}>
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: t.textMuted }}>
                  SWITCH ACCOUNT
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {accounts.map((acc, i) => (
                  <div key={acc.id} className="border-b last:border-0" style={{ borderColor: t.border }}>
                    {editingId === acc.id ? (
                      <div className="px-4 py-3 space-y-2">
                        <input
                          value={draftEmail}
                          onChange={(e) => setDraftEmail(e.target.value)}
                          placeholder="Email"
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none border"
                          style={{ background: t.surfaceAlt, color: t.text, borderColor: t.border }}
                        />
                        <input
                          value={draftPassword}
                          onChange={(e) => setDraftPassword(e.target.value)}
                          placeholder="Password"
                          type="password"
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none border"
                          style={{ background: t.surfaceAlt, color: t.text, borderColor: t.border }}
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              onUpdateCredentials(acc.id, draftEmail, draftPassword);
                              setEditingId(null);
                            }}
                            className="flex-1 text-[11px] font-medium rounded-lg px-3 py-1.5"
                            style={{ background: t.accent, color: t.accentInk }}
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-[11px] px-3 py-1.5" style={{ color: t.textMuted }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <button
                          onClick={() => {
                            onSwitch(i);
                            setOpen(false);
                          }}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        >
                          <div className="w-7 h-7 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${acc.avatarColor}, ${t.greenDeep})` }} />
                          <div className="min-w-0">
                            <p className="text-xs truncate" style={{ color: t.text }}>
                              {acc.name}
                            </p>
                            <p className="text-[10px]" style={{ color: acc.role === "Admin" ? t.accentInk : t.textMuted }}>
                              {acc.role} · •• {acc.last4}
                            </p>
                          </div>
                        </button>
                        {i === activeIndex && <Check size={13} color={t.green} className="shrink-0" />}
                        <button
                          onClick={() => {
                            setEditingId(acc.id);
                            setDraftEmail(acc.email);
                            setDraftPassword(acc.password);
                          }}
                          className="shrink-0"
                          style={{ color: t.textMuted }}
                          title="Edit credentials"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
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
  const meta = pipelineMeta(t);
  const ORDER: (keyof ReturnType<typeof pipelineMeta>)[] = ["processing", "pending", "complete"];
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
          const m = meta[key];
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

function StatusUpdateStrip({ receipts, t, onOpen }: { receipts: Receipt[]; t: ThemeTokens; onOpen: (id: string) => void }) {
  const recent = receipts.slice(0, 8);
  if (recent.length === 0) return null;
  const meta = pipelineMeta(t);

  return (
    <section className="rounded-2xl p-6 border" style={{ background: t.surface, borderColor: t.border }}>
      <p className="text-xs font-bold tracking-wider uppercase mb-4" style={{ color: t.textMuted }}>
        Recent Status Updates
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {recent.map((r) => {
          const m = meta[r.status];
          const Icon = m.icon;
          return (
            <button key={r.id} onClick={() => onOpen(r.id)} className="flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5" style={{ background: t.surfaceAlt }}>
              <Icon size={11} color={m.tone} className={m.spin ? "animate-spin" : m.pulse ? "animate-pulse" : ""} />
              <span className="text-[11px]" style={{ color: t.text }}>
                {r.vendor}
              </span>
              <span className="text-[10px]" style={{ color: t.textMuted }}>
                {peso(r.amount)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================================
   RECEIPT INBOX — email-style layout: collapsible white list + big detail
   panel with a "paper" scanned-receipt mock on the right.
   ========================================================================= */

function StatusDropdown({ t, value, onChange }: { t: ThemeTokens; value: ReceiptStatus; onChange: (s: ReceiptStatus) => void }) {
  const [open, setOpen] = useState(false);
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
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                onChange(o.key);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between"
              style={{ color: t.text }}
            >
              {o.label}
              {value === o.key && <Check size={13} color={t.green} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptInboxView({
  t,
  receipts,
  onSelect: _onSelect,
  onDelete,
  onReassignStatus,
  canManage,
}: {
  t: ThemeTokens;
  receipts: Receipt[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReassignStatus: (id: string, status: ReceiptStatus) => void;
  canManage: boolean;
}) {
  const [listOpen, setListOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ReceiptStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(receipts[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return receipts
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => (q ? r.vendor.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || dateAndYear(r.date).toLowerCase().includes(q) : true));
  }, [receipts, filter, search]);

  const selected = receipts.find((r) => r.id === selectedId) ?? filtered[0] ?? null;
  const meta = pipelineMeta(t);

  const counts: Record<string, number> = { all: receipts.length };
  STATUS_FILTERS.slice(1).forEach((f) => {
    counts[f.key] = receipts.filter((r) => r.status === f.key).length;
  });

  return (
    <div className="relative flex flex-1 overflow-hidden gap-5 p-5" style={{ background: `linear-gradient(160deg, ${t.barBg} 0%, ${t.greenDeep} 100%)` }}>
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
                  {receipts.length} receipts
                </p>
              </div>
            </div>
            <button onClick={() => setListOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.surfaceAlt }} title="Hide inbox list">
              <PanelLeftClose size={15} color={t.textMuted} />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.surfaceAlt }}>
            <Search size={15} color={t.textMuted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search receipt inbox" className="bg-transparent outline-none text-sm flex-1" style={{ color: t.text }} />
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
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="w-full text-left px-3 py-3 rounded-xl transition-colors"
              style={{ background: selected?.id === r.id ? t.surfaceAlt : "transparent" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta[r.status].tone }} />
                    <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
                      {r.vendor}
                    </p>
                    {r.source === "email" && <Mail size={10} style={{ color: t.textMuted }} />}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                    {dateAndYear(r.date)} · {r.category}
                  </p>
                </div>
                <span className="text-sm font-semibold flex-shrink-0" style={{ color: t.text }}>
                  {peso(r.amount)}
                </span>
              </div>
            </button>
          ))}
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

      {/* DETAIL — bigger white "email" box, split info | receipt photo */}
      <div className="flex-1 rounded-2xl shadow-xl overflow-hidden" style={{ background: t.surface }}>
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm" style={{ color: t.textMuted }}>
              Select a receipt to view details.
            </p>
          </div>
        ) : (
          <div className="h-full flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    {dateAndYear(selected.date)}
                  </p>
                  <h2 className="text-2xl font-bold mt-0.5" style={{ color: t.text }}>
                    {selected.vendor}
                  </h2>
                  <div className="mt-1.5">
                    <StatusBadge status={selected.status} t={t} />
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => onDelete(selected.id)} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${t.danger}1a` }} title="Delete receipt">
                    <Trash2 size={15} color={t.danger} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Amount
                  </p>
                  <p className="font-semibold text-base" style={{ color: t.text }}>
                    {peso(selected.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Payment Method
                  </p>
                  <p className="font-semibold text-base flex items-center gap-1.5" style={{ color: t.text }}>
                    {selected.paymentType === "cash" ? <Banknote size={14} /> : <CreditCard size={14} />}
                    {selected.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Category
                  </p>
                  <p className="font-semibold text-base" style={{ color: t.text }}>
                    {selected.category}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Source
                  </p>
                  <p className="font-semibold text-base flex items-center gap-1.5 capitalize" style={{ color: t.text }}>
                    {selected.source === "camera" ? <ImageIcon size={14} /> : <FileText size={14} />}
                    {selected.source}
                  </p>
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: t.surfaceAlt }}>
                {selected.lineItems.map((li) => (
                  <div key={li.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: t.text }}>
                      {li.qty}× {li.name}
                    </span>
                    <span className="font-mono" style={{ color: t.text }}>
                      {peso(li.price)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-2 border-t" style={{ borderColor: t.border, color: t.text }}>
                  <span>Total</span>
                  <span className="font-mono">{peso(selected.amount)}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Timeline
                </p>
                <div className="flex items-center">
                  {selected.timeline.map((step, i) => {
                    const Icon = [Upload, ScanLine, Sparkles, Eye][i] ?? Eye;
                    return (
                      <div key={step.label} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5 w-16">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: step.done ? t.green : t.surfaceAlt, color: step.done ? "#fff" : t.textMuted }}>
                            {step.done ? <Check size={14} /> : <Icon size={14} />}
                          </div>
                          <p className="text-[9px] text-center leading-tight" style={{ color: t.textMuted }}>
                            {step.label}
                          </p>
                        </div>
                        {i < selected.timeline.length - 1 && <div className="flex-1 h-0.5 -mt-4" style={{ background: step.done ? t.green : t.surfaceAlt }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!canManage && (
                <p className="text-[11px] flex items-center gap-1.5" style={{ color: t.textMuted }}>
                  <Lock size={11} /> View-only account — ask an Admin or User to make changes.
                </p>
              )}

              <div className="flex items-center gap-2.5 pt-2 flex-wrap">
                <button
                  onClick={() => exportReceiptCsv(selected)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: t.green }}
                >
                  <FileDown size={15} />
                  Export CSV
                </button>

                {canManage && <StatusDropdown t={t} value={selected.status} onChange={(s) => onReassignStatus(selected.id, s)} />}
              </div>
            </div>

            {/* right: uploaded receipt photo panel — paper colour */}
            <div className="w-[26rem] flex-shrink-0 hidden lg:flex flex-col items-center justify-center p-8 border-l" style={{ background: t.paper, borderColor: t.border }}>
              <div className="w-full flex items-center justify-between mb-6">
                <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#8A6A00" }}>
                  Uploaded {selected.source}
                </p>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(138,106,0,0.12)" }}>
                  {selected.source === "camera" ? <ImageIcon size={15} color="#8A6A00" /> : <FileText size={15} color="#8A6A00" />}
                </div>
              </div>

              {selected.imagePreview ? (
                <img src={selected.imagePreview} alt={selected.vendor} className="w-80 rounded-lg shadow-2xl object-cover" style={{ transform: "rotate(-1.5deg)" }} />
              ) : (
                <div
                  className="w-80 bg-white shadow-2xl p-7"
                  style={{
                    transform: "rotate(-1.5deg)",
                    fontFamily: "monospace",
                    clipPath:
                      "polygon(0% 0%, 100% 0%, 100% 97%, 94% 100%, 88% 97%, 82% 100%, 76% 97%, 70% 100%, 64% 97%, 58% 100%, 52% 97%, 46% 100%, 40% 97%, 34% 100%, 28% 97%, 22% 100%, 16% 97%, 10% 100%, 4% 97%, 0% 100%)",
                  }}
                >
                  <div className="flex justify-center mb-3">
                    <ReceiptIcon size={30} color={t.green} />
                  </div>
                  <p className="text-center text-sm font-bold uppercase tracking-wide" style={{ color: "#0F241B" }}>
                    {selected.vendor}
                  </p>
                  <p className="text-center text-[11px] mb-4" style={{ color: "#5C6B65" }}>
                    {dateAndYear(selected.date)}
                  </p>
                  <div className="border-t border-dashed my-2.5" style={{ borderColor: "#c9c2a8" }} />
                  {selected.lineItems.map((li) => (
                    <div key={li.id} className="flex justify-between text-xs leading-relaxed py-1">
                      <span style={{ color: "#33270D" }}>
                        {li.qty}× {li.name}
                      </span>
                      <span style={{ color: "#33270D" }}>{peso(li.price)}</span>
                    </div>
                  ))}
                  <div className="border-t border-dashed my-2.5" style={{ borderColor: "#c9c2a8" }} />
                  <p className="text-center text-sm font-bold" style={{ color: "#0F241B" }}>
                    TOTAL {peso(selected.amount)}
                  </p>
                  <p className="text-center text-[10px] mt-1.5" style={{ color: "#8A6A00" }}>
                    {selected.paymentMethod}
                  </p>
                </div>
              )}

              <p className="text-xs text-center mt-7 px-6" style={{ color: "#8A6A00" }}>
                Original file preview — captured on upload
              </p>
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

  const [accounts, setAccounts] = useState<Account[]>(seedAccounts);
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>(() => seedReceipts(seedAccounts()));
  const [transactions, setTransactions] = useState<Transaction[]>(() => seedReceipts(seedAccounts()).map(receiptToTransaction));
  const [history, setHistory] = useState<HistoryEntry[]>(() => seedReceipts(seedAccounts()).map(receiptToHistoryEntry));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<DateRange>("6m");
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [sidebarFilter, setSidebarFilter] = useState<"all" | ReceiptStatus>("all");
  const quickUploadRef = useRef<HTMLInputElement>(null);

  const role = accounts[activeAccountIndex]?.role ?? "Viewer";
  const canManage = role !== "Viewer";

  useEffect(() => {
    let ignored = false;

    const loadReceipts = async () => {
      try {
        const payload = await fetchReceipts();
        if (ignored) return;
        const loadedReceipts = payload.map((receipt) => ({
          ...receipt,
          status: receipt.status as ReceiptStatus,
          paymentType: receipt.paymentType as PaymentType,
          source: receipt.source as Receipt["source"],
        })) as Receipt[];

        if (loadedReceipts.length > 0) {
          setReceipts(loadedReceipts);
          setTransactions(loadedReceipts.map(receiptToTransaction));
          setHistory(loadedReceipts.map(receiptToHistoryEntry));
        }
      } catch (error) {
        console.error("Unable to load receipts from backend", error);
      }
    };

    void loadReceipts();

    return () => {
      ignored = true;
    };
  }, []);

  const pushNotification = useCallback((n: Omit<AppNotification, "id" | "read" | "time">) => {
    const full: AppNotification = { ...n, id: uid("notif"), read: false, time: "now" };
    setNotifications((prev) => [full, ...prev]);
    setToasts((prev) => [...prev, full]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== full.id));
    }, 4500);
  }, []);

  const advanceReceipt = useCallback(
    (id: string, next: ReceiptStatus, delay: number) => {
      window.setTimeout(() => {
        setReceipts((prev) => prev.map((r) => (r.id === id && r.auto ? { ...r, status: next } : r)));
        setTransactions((prev) => prev.map((tx) => (tx.receiptId === id ? { ...tx, status: next } : tx)));
        void updateReceipt(id, { status: next, auto: true }).catch((error) => console.error("Failed to sync receipt status", error));
        if (next === "complete") {
          setReceipts((prev) => {
            const r = prev.find((x) => x.id === id);
            if (r && r.auto) {
              pushNotification({ type: "ocr_complete", title: "AI extraction finished", detail: `${r.vendor} — ${peso(r.amount)}`, receiptId: id });
              setAccounts((accs) => accs.map((a) => (a.last4 === r.accountLast4 ? { ...a, balance: Math.max(0, a.balance - r.amount) } : a)));
              setHistory((prevHist) => [...prevHist, receiptToHistoryEntry(r)]);
            }
            return prev;
          });
        }
      }, delay);
    },
    [pushNotification]
  );

  const handleUpload = useCallback(
    (source: "upload" | "camera" | "email", fileName?: string, imagePreview?: string) => {
      const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
      const amount = Math.round((Math.random() * 180 + 8) * 100) / 100;
      const account = accounts[activeAccountIndex];
      const payment = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
      const receipt = makeReceipt({ vendor, amount, date: new Date(), status: "processing", source, accountLast4: account.last4, payment, imagePreview });

      setReceipts((prev) => [receipt, ...prev]);
      setTransactions((prev) => [receiptToTransaction(receipt), ...prev]);
      setView("inbox");
      void createReceipt(receiptToBackendPayload(receipt)).catch((error) => console.error("Failed to save receipt", error));

      pushNotification({
        type: source === "email" ? "email" : "new_receipt",
        title: source === "email" ? "New email received" : "New receipt received",
        detail: `${vendor.name}${fileName ? ` — ${fileName}` : ""} · Processing`,
        receiptId: receipt.id,
      });

      advanceReceipt(receipt.id, "pending", 3000);
      advanceReceipt(receipt.id, "complete", 6000);
    },
    [accounts, activeAccountIndex, advanceReceipt, pushNotification]
  );

  const handleQuickUploadFile = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length) return;
      const file = files[0];
      const preview = await readImagePreview(file);
      handleUpload("upload", file.name, preview);
    },
    [handleUpload]
  );

  const removeReceipt = useCallback((id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    setTransactions((prev) => prev.filter((tx) => tx.receiptId !== id));
    void deleteReceiptApi(id).catch((error: unknown) => console.error("Failed to delete receipt", error));
  }, []);

  const reassignStatus = useCallback((id: string, status: ReceiptStatus) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const wasComplete = r.status === "complete";
        const updated: Receipt = { ...r, status, auto: false };
        if (status === "complete" && !wasComplete) {
          setHistory((prevHist) => [...prevHist, receiptToHistoryEntry(updated)]);
          setAccounts((accs) => accs.map((a) => (a.last4 === r.accountLast4 ? { ...a, balance: Math.max(0, a.balance - r.amount) } : a)));
        }
        return updated;
      })
    );
    setTransactions((prev) => prev.map((tx) => (tx.receiptId === id ? { ...tx, status } : tx)));
    void updateReceipt(id, { status }).catch((error) => console.error("Failed to update receipt status", error));
  }, []);

  const openReceipt = useCallback((id?: string) => {
    if (id) {
      setView("inbox");
      return;
    }
    setView("inbox");
  }, []);

  const updateCredentials = useCallback((id: string, email: string, password: string) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, email, password } : a)));
  }, []);

  const createCustomCard = useCallback((color: string) => {
    setAccounts((prev) => [...prev, { id: uid("acc"), last4: randomLast4(), name: "New Cardholder", role: "User", email: "", password: "", avatarColor: color, balance: 0 }]);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const payload = await fetchReceipts();
      const loadedReceipts = payload.map((receipt) => ({
        ...receipt,
        status: receipt.status as ReceiptStatus,
        paymentType: receipt.paymentType as PaymentType,
        source: receipt.source as Receipt["source"],
      })) as Receipt[];

      if (loadedReceipts.length > 0) {
        setReceipts(loadedReceipts);
        setTransactions(loadedReceipts.map(receiptToTransaction));
        setHistory(loadedReceipts.map(receiptToHistoryEntry));
      }
    } catch (error) {
      console.error("Refresh failed", error);
    } finally {
      setRefreshing(false);
    }
  };

  const account = accounts[activeAccountIndex];
  const chartData = useMemo(() => buildSeries(history, account.last4, range), [history, account.last4, range]);
  const currentTotal = chartData[chartData.length - 1]?.value ?? 0;
  const prevValue = chartData.length > 1 ? chartData[chartData.length - 2].value : currentTotal;
  const growthPct = prevValue ? (((currentTotal - prevValue) / prevValue) * 100).toFixed(2) : "0.00";
  const isPositive = Number(growthPct) >= 0;

  const latestByAccount = useMemo(() => {
    const map = new Map<string, Receipt>();
    receipts.forEach((r) => {
      if (!map.has(r.accountLast4)) map.set(r.accountLast4, r);
    });
    return map;
  }, [receipts]);

  const carouselCards: CarouselCard[] = accounts.map((a, i) => {
    const latest = latestByAccount.get(a.last4);
    return {
      background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
      label: latest ? latest.vendor : a.name,
      balance: peso(a.balance),
      last4: a.last4,
      dateLabel: latest ? dateAndYear(latest.date) : undefined,
      contactNumber: latest?.contactNumber,
      items: latest?.lineItems.map((li) => ({ name: li.name, qty: li.qty, price: li.price })),
    };
  });

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = { processing: 0, pending: 0, complete: 0, failed: 0 };
    transactions.forEach((tx) => {
      if (tx.status in counts) counts[tx.status] += 1;
    });
    return counts;
  }, [transactions]);

  const q = query.trim().toLowerCase();
  const visibleTransactions = transactions
    .filter((tx) => tx.accountLast4 === account.last4)
    .filter((tx) => (q ? [tx.vendor, tx.category, tx.status, tx.paymentMethod, tx.paymentType, tx.emailSource ?? "", dateAndYear(tx.date)].join(" ").toLowerCase().includes(q) : true));

  const accountReceipts = receipts.filter((r) => r.accountLast4 === account.last4);
  const sidebarReceipts = accountReceipts.filter((r) => (sidebarFilter === "all" ? true : r.status === sidebarFilter)).slice(0, 6);
  const openInboxCount = accountReceipts.filter((r) => r.status !== "complete").length;
  const meta = pipelineMeta(t);

  if (receipts.length === 0) {
    return <UploadScreen t={t} onUpload={handleUpload} />;
  }

  const SIDEBAR_FILTERS: { key: typeof sidebarFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "processing", label: "Processing" },
    { key: "pending", label: "Pending" },
    { key: "complete", label: "Complete" },
  ];

  return (
    <div className="flex flex-col h-screen w-full font-sans transition-colors duration-500" style={{ background: t.pageBg, color: t.text }}>
      <input ref={quickUploadRef} type="file" accept=".jpg,.jpeg,.png,.heic,.pdf,.xlsx,.xls" className="hidden" onChange={(e) => handleQuickUploadFile(e.target.files)} />
      <ToastStack t={t} toasts={toasts} onOpenReceipt={openReceipt} />
      <ChatAssistant accent={t.accent} currency="PHP" buildContext={() => buildSpendingContext(accountReceipts)} />

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

        <NavPill view={view} setView={setView} t={t} onUploadClick={() => quickUploadRef.current?.click()} canManage={canManage} />

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

          <AccountSwitcher accounts={accounts} activeIndex={activeAccountIndex} onSwitch={setActiveAccountIndex} onUpdateCredentials={updateCredentials} t={t} />
        </div>
      </div>

      {/* BODY */}
      <AnimatePresence mode="wait">
        {view === "inbox" ? (
          <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 min-h-0 flex">
            <ReceiptInboxView t={t} receipts={accountReceipts} onSelect={() => {}} onDelete={removeReceipt} onReassignStatus={reassignStatus} canManage={canManage} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-1 overflow-hidden">
            {/* SIDEBAR */}
            <aside className="w-60 flex-shrink-0 hidden md:flex flex-col justify-between p-5 transition-colors duration-500" style={{ background: t.sidebarBg, color: t.onBar }}>
              <div>
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
              </div>

              <div className="space-y-1 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/5" style={{ color: t.onBarMuted }}>
                  <Settings size={16} />
                  Settings
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/5" style={{ color: t.onBarMuted }}>
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
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
                    placeholder="Search receipts, vendors, dates, payment"
                    className="bg-transparent outline-none text-sm flex-1"
                    style={{ color: t.text }}
                  />
                </div>
              </div>

              <div className="p-6 space-y-6">
                <section className="rounded-2xl p-6 transition-colors duration-500" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
                    <p className="text-sm font-semibold" style={{ color: t.textMuted }}>
                      Transaction Receipt History <span style={{ color: t.textMuted, opacity: 0.6 }}>· •••• {account.last4}</span>
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
                    <span className="text-3xl font-bold">{peso(account.balance)}</span>
                    <span className="text-sm font-semibold flex items-center gap-0.5" style={{ color: isPositive ? t.green : t.danger }}>
                      {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(Number(growthPct))}%
                    </span>
                  </div>

                  <TransactionHistoryChart data={chartData} t={t} />
                </section>

                <PipelineStatus counts={pipelineCounts} t={t} />
                <StatusUpdateStrip receipts={accountReceipts} t={t} onOpen={openReceipt} />
              </div>
            </main>

            {/* RIGHT PANEL */}
            <aside className="w-96 flex-shrink-0 hidden lg:flex flex-col p-6 space-y-6 overflow-y-auto border-l transition-colors duration-500" style={{ background: t.surface, borderColor: t.border }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">My cards</h2>
                {canManage && (
                  <button
                    onClick={() => createCustomCard(CARD_GRADIENTS[accounts.length % CARD_GRADIENTS.length].match(/#[0-9A-Fa-f]{6}/)?.[0] ?? t.accent)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: t.accent, color: t.accentInk }}
                  >
                    <Plus size={14} />
                    Add new
                  </button>
                )}
              </div>

              <CardCarousel cards={carouselCards} activeIndex={activeAccountIndex} onActiveChange={setActiveAccountIndex} />

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

              <div className="space-y-1.5 -mt-3">
                {sidebarReceipts.map((r) => (
                  <button key={r.id} onClick={() => openReceipt(r.id)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left" style={{ background: "transparent" }}>
                    <span className="text-xs truncate" style={{ color: t.text }}>
                      {r.vendor}
                    </span>
                    <span className="text-[10px] font-medium shrink-0" style={{ color: meta[r.status].tone }}>
                      {meta[r.status].label}
                    </span>
                  </button>
                ))}
                {sidebarReceipts.length === 0 && (
                  <p className="text-center text-[11px] py-3" style={{ color: t.textMuted }}>
                    Nothing here yet.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Recent Transactions</h3>
                <span className="text-xs font-semibold" style={{ color: t.accentInk === "#3A2A00" ? t.green : t.accent }}>
                  {visibleTransactions.length} total
                </span>
              </div>

              <div className="space-y-1">
                {visibleTransactions.slice(0, 8).map((tx) => {
                  const m = meta[tx.status];
                  return (
                    <button key={tx.id} onClick={() => openReceipt(tx.receiptId)} className="w-full flex items-center justify-between px-2 py-3 rounded-xl transition-colors text-left hover:opacity-90">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: t.green, color: "#fff" }}>
                          {tx.vendor.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm truncate" style={{ color: t.text }}>
                              {tx.vendor}
                            </p>
                            {tx.emailSource && <Mail size={10} style={{ color: t.textMuted }} />}
                          </div>
                          <p className="text-[11px] truncate flex items-center gap-1" style={{ color: t.textMuted }}>
                            {tx.category} · {tx.paymentType === "cash" ? <Banknote size={9} /> : <CreditCard size={9} />} {tx.paymentMethod}
                          </p>
                          <p className="text-[10.5px]" style={{ color: t.textMuted, opacity: 0.7 }}>
                            {dateAndYear(tx.date)} · {tx.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-medium" style={{ color: t.text }}>
                          {peso(tx.amount)}
                        </span>
                        <span className="flex items-center gap-1 text-[9.5px] font-medium rounded-full px-1.5 py-0.5" style={{ color: m.tone, background: `${m.tone}1a` }}>
                          <m.icon size={9} className={m.spin ? "animate-spin" : m.pulse ? "animate-pulse" : ""} />
                          {m.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {visibleTransactions.length === 0 && (
                  <p className="text-center text-xs py-8" style={{ color: t.textMuted }}>
                    No transactions yet.
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
