"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  RotateCw,
  Moon,
  Sun,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Loader2,
  ArrowRightCircle,
  Clock,
  CheckCircle2,
  Mail,
  Bell,
  ChevronDown,
  Check,
  Camera,
  FileImage,
  FileText,
  UploadCloud,
  LayoutGrid,
  Inbox as InboxIcon,
  X,
  AlertTriangle,
  Sparkles,
  Pencil,
  Palette,
  Banknote,
  CreditCard,
  Receipt as ReceiptIcon,
  Lock,
} from "lucide-react";
import { CardCarousel, type CarouselCard } from "./CardCarousel";

/* ============================================================================
   BRAND PALETTE — every color in the app comes from this list only
   ========================================================================= */

const PALETTE = {
  deepest: "#133020",
  forest: "#034E34",
  sage: "#417256",
  mist: "#708E7C",
  fog: "#9CAFA4",
  rust: "#C17110",
  amber: "#E89131",
  gold: "#FFB347",
  peach: "#FFC370",
  sand: "#F4D0A4",
  gray1: "#666666",
  gray2: "#999999",
  gray3: "#CCCCCC",
  gray4: "#E6E6E6",
  white: "#FFFFFF",
};

const CARD_SWATCHES = [PALETTE.forest, PALETTE.sage, PALETTE.rust, PALETTE.amber, PALETTE.gold, PALETTE.deepest];

/* ============================================================================
   TYPES
   ========================================================================= */

type ReceiptStatus = "processing" | "ongoing" | "pending" | "complete" | "failed";
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
  /** false once a human has manually reassigned status — automatic pipeline timers stop touching it */
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

/** Permanent ledger entry — written once a receipt completes, never removed on delete. Feeds the graph. */
interface HistoryEntry {
  id: string;
  accountLast4: string;
  vendor: string;
  amount: number;
  date: string;
}

interface AppNotification {
  id: string;
  type:
    | "new_receipt"
    | "email"
    | "ocr_complete"
    | "request_approved"
    | "transfer_complete"
    | "processing_failed"
    | "ai_extraction";
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

/* ============================================================================
   MOCK DATA / HELPERS  (swap for your real OCR + API calls)
   ========================================================================= */

const VENDORS = [
  { name: "Nike Store", category: "Retail", contact: "+63 917 200 1122" },
  { name: "WeWork", category: "Workspace", contact: "+63 918 334 5567" },
  { name: "Google Drive", category: "Subscription", contact: "+63 2 8888 0000" },
  { name: "Starbucks", category: "Food & Drink", contact: "+63 917 555 0192" },
  { name: "Jollibee", category: "Food & Drink", contact: "+63 2 8879 8888" },
  { name: "Delta Airlines", category: "Travel", contact: "+63 2 7902 0100" },
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

const PIPELINE_META: Record<
  Exclude<ReceiptStatus, "failed">,
  { label: string; tone: string; icon: any; spin: boolean }
> = {
  processing: { label: "Processing", tone: PALETTE.amber, icon: Loader2, spin: true },
  ongoing: { label: "Ongoing", tone: PALETTE.gold, icon: ArrowRightCircle, spin: false },
  pending: { label: "Pending", tone: PALETTE.mist, icon: Clock, spin: false },
  complete: { label: "Complete", tone: PALETTE.forest, icon: CheckCircle2, spin: false },
};
const FAILED_TONE = PALETTE.rust;

/** User-facing status choices — deliberately simpler than the internal pipeline (no "ongoing" here). */
const STATUS_OPTIONS: { key: ReceiptStatus; label: string }[] = [
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "complete", label: "Completed" },
];

const NOTIF_ICONS: Record<AppNotification["type"], any> = {
  new_receipt: FileText,
  email: Mail,
  ocr_complete: CheckCircle2,
  request_approved: ArrowRightCircle,
  transfer_complete: ArrowRightCircle,
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

/** Reads an image file as a data URL for the Receipt Preview thumbnail. Non-image files resolve to undefined. */
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
    { id: "acc_1", last4: "5008", name: "Ethan Reynolds", role: "Admin", email: "ethan@lifewood.ai", password: "••••••••", avatarColor: PALETTE.amber, balance: 12850 },
    { id: "acc_2", last4: "6150", name: "Mika Santos", role: "User", email: "mika.ops@lifewood.ai", password: "••••••••", avatarColor: PALETTE.sage, balance: 6150 },
    { id: "acc_3", last4: "3140", name: "Carlo Dizon", role: "Viewer", email: "carlo.view@lifewood.ai", password: "••••••••", avatarColor: PALETTE.rust, balance: 3140 },
  ];
}

/** A handful of historical, already-complete receipts so the graph and lists have real shape on first load. */
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

/** Builds the graph series from the permanent history ledger — untouched by deletes — for the active account + range. */
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

/* ============================================================================
   UPLOAD SCREEN  — shown when there are zero receipts
   ========================================================================= */

function UploadScreen({
  accent,
  onUpload,
}: {
  accent: string;
  onUpload: (source: "upload" | "camera", fileName?: string, imagePreview?: string) => void;
}) {
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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden text-white" style={{ background: PALETTE.deepest }}>
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full blur-[130px]"
          style={{ background: `${accent}22` }}
          animate={{ y: [0, 24, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: `${PALETTE.sage}33` }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative z-10 w-full max-w-xl mx-6">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: accent }}>
            Receipt AI
          </p>
          <h1 className="text-3xl font-semibold">Add your first receipt</h1>
          <p className="text-sm text-white/50 mt-2">Drop a file, snap a photo, or upload — we&apos;ll scan and extract everything for you.</p>
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
          animate={{ scale: dragOver ? 1.02 : 1, borderColor: dragOver ? accent : "rgba(255,255,255,0.14)" }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative rounded-[28px] border-2 border-dashed backdrop-blur-xl bg-white/[0.04] px-8 py-14 flex flex-col items-center text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border border-white/10"
            style={{ background: `${accent}1f` }}
          >
            {processing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <UploadCloud size={26} color={accent} />
              </motion.div>
            ) : (
              <UploadCloud size={26} color={accent} />
            )}
          </motion.div>

          <p className="font-medium text-white/90">{processing ? "Scanning your receipt…" : "Drag & drop a receipt here"}</p>
          <p className="text-xs text-white/40 mt-1 mb-6">JPG · PNG · HEIC · PDF · EXCEL</p>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg"
              style={{ background: accent, color: PALETTE.deepest }}
            >
              <FileText size={15} /> Upload Receipt
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
            >
              <Camera size={15} /> Camera
            </motion.button>
          </div>

          <div className="flex items-center gap-2 mt-6 text-white/30 text-[11px]">
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
   RECEIPT INBOX
   ========================================================================= */

function StatusBadge({ status }: { status: ReceiptStatus }) {
  const styles: Record<ReceiptStatus, { label: string; tone: string }> = {
    processing: { label: "Processing", tone: PALETTE.amber },
    ongoing: { label: "Ongoing", tone: PALETTE.gold },
    pending: { label: "Pending", tone: PALETTE.mist },
    complete: { label: "Complete", tone: PALETTE.forest },
    failed: { label: "Failed", tone: FAILED_TONE },
  };
  const s = styles[status];
  return (
    <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ color: s.tone, background: `${s.tone}1a`, border: `1px solid ${s.tone}40` }}>
      {s.label}
    </span>
  );
}

/** "Export PDF" per the spec — the actual output is an Excel-compatible CSV of the receipt. */
function exportReceiptExcel(r: Receipt) {
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

function ReceiptThumb({ receipt, size = 40 }: { receipt: Receipt; size?: number }) {
  if (receipt.imagePreview) {
    return <img src={receipt.imagePreview} alt={receipt.vendor} style={{ width: size, height: size }} className="rounded-xl object-cover shrink-0 border border-white/10" />;
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg,${PALETTE.amber},${PALETTE.rust})`, color: PALETTE.deepest }}
    >
      <ReceiptIcon size={size * 0.45} />
    </div>
  );
}

function ReceiptInbox({
  receipts,
  selectedReceiptId,
  onSelect,
  onDelete,
  onReassignStatus,
  canManage,
}: {
  receipts: Receipt[];
  selectedReceiptId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReassignStatus: (id: string, status: ReceiptStatus) => void;
  canManage: boolean;
}) {
  const [localQuery, setLocalQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ReceiptStatus>("all");
  const [reassigning, setReassigning] = useState(false);

  const filtered = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    return receipts
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => (q ? r.vendor.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || dateAndYear(r.date).toLowerCase().includes(q) : true));
  }, [receipts, filter, localQuery]);

  const selected = receipts.find((r) => r.id === selectedReceiptId) ?? filtered[0] ?? null;

  const FILTERS: { key: "all" | ReceiptStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "processing", label: "Processing" },
    { key: "pending", label: "Pending" },
    { key: "complete", label: "Complete" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 h-full">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 flex flex-col min-h-0">
        <h3 className="text-sm font-semibold text-white px-1 mb-3">Receipt Inbox</h3>

        <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2 mb-3">
          <Search size={14} className="text-white/40" />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search brand, category, or date"
            className="bg-transparent outline-none text-sm placeholder:text-white/30 w-full text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-colors ${filter === f.key ? "bg-white text-[#133020] font-medium" : "text-white/50 bg-white/5 hover:text-white"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((r) => (
              <motion.button
                key={r.id}
                layout
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.05)" }}
                onClick={() => {
                  onSelect(r.id);
                  setReassigning(false);
                }}
                className={`w-full text-left rounded-2xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                  selected?.id === r.id ? "border-[#E89131]/50 bg-white/[0.05]" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <ReceiptThumb receipt={r} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-white truncate">{r.vendor}</p>
                    {r.source === "email" && <Mail size={11} className="text-white/40 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-white/40">
                    {r.category} · {dateAndYear(r.date)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-medium text-white">{peso(r.amount)}</span>
                  <StatusBadge status={r.status} />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && <p className="text-center text-xs text-white/30 py-8">No receipts match.</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {/* Receipt Preview + header: brand + date/year */}
              <div className="flex items-start justify-between mb-6 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <ReceiptThumb receipt={selected} size={56} />
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-white truncate">{selected.vendor}</h2>
                    <p className="text-sm text-white/40">{dateAndYear(selected.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={selected.status} />
                  {canManage && (
                    <button onClick={() => onDelete(selected.id)} className="text-white/40 hover:text-white transition-colors" title="Delete receipt">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* 4 boxes: Amount / Payment Method / Category / Source */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                  <p className="text-[11px] text-white/40 mb-1">Amount</p>
                  <p className="text-lg font-semibold text-white">{peso(selected.amount)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                  <p className="text-[11px] text-white/40 mb-1">Payment Method</p>
                  <p className="text-sm text-white flex items-center gap-1.5">
                    {selected.paymentType === "cash" ? <Banknote size={13} /> : <CreditCard size={13} />}
                    {selected.paymentMethod} <span className="text-white/40">({selected.paymentType === "cash" ? "Cash" : "Online"})</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                  <p className="text-[11px] text-white/40 mb-1">Category</p>
                  <p className="text-sm text-white">{selected.category}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                  <p className="text-[11px] text-white/40 mb-1">Source</p>
                  <p className="text-sm text-white capitalize">{selected.source}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-white/50 mb-3 tracking-wide">TIMELINE</p>
              <div className="space-y-3 mb-6">
                {selected.timeline.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.done ? PALETTE.sage : "rgba(255,255,255,0.15)" }} />
                    <span className={`text-sm ${t.done ? "text-white" : "text-white/30"}`}>{t.label}</span>
                    {t.time && <span className="text-[11px] text-white/30 ml-auto">{t.time}</span>}
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-white/50 mb-3 tracking-wide">LINE ITEMS</p>
              <div className="space-y-2 mb-6">
                {selected.lineItems.map((li) => (
                  <div key={li.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">
                      {li.qty}× {li.name}
                    </span>
                    <span className="text-white">{peso(li.price)}</span>
                  </div>
                ))}
              </div>

              {!canManage && (
                <p className="text-[11px] text-white/30 flex items-center gap-1.5 mb-3">
                  <Lock size={11} /> View-only account — ask an Admin or User to make changes.
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap relative">
                <button
                  onClick={() => exportReceiptExcel(selected)}
                  className="text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded-full px-4 py-2 transition-colors"
                  title="Downloads an Excel-compatible .csv of this receipt"
                >
                  Export PDF
                </button>

                {canManage && (
                  <>
                    <button onClick={() => setReassigning((v) => !v)} className="text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded-full px-4 py-2 transition-colors">
                      Reassign category
                    </button>
                    {reassigning && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute top-10 left-[7.5rem] z-10 rounded-xl border border-white/10 bg-[#1f1f1f] shadow-2xl p-2 flex flex-col gap-1 w-40">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s.key}
                            onClick={() => {
                              onReassignStatus(selected.id, s.key);
                              setReassigning(false);
                            }}
                            className="text-left text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg px-2 py-1.5 flex items-center justify-between"
                          >
                            {s.label}
                            {selected.status === s.key && <Check size={12} style={{ color: PALETTE.amber }} />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                    <button onClick={() => onDelete(selected.id)} className="text-xs font-medium rounded-full px-4 py-2 transition-colors ml-auto" style={{ color: FAILED_TONE, background: `${FAILED_TONE}1a` }}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <p className="text-sm text-white/30 text-center py-20">Select a receipt to view details.</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================================
   NOTIFICATIONS  (bell dropdown + toast pop-ups)
   ========================================================================= */

function NotificationCenter({
  notifications,
  accent,
  onMarkRead,
  onMarkAllRead,
  onOpenReceipt,
}: {
  notifications: AppNotification[];
  accent: string;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenReceipt: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button className="text-white/60 hover:text-white transition-colors relative" onClick={() => setOpen((v) => !v)}>
        <Bell size={16} />
        {unread > 0 && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
            style={{ background: accent }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 top-8 w-80 rounded-2xl border border-white/10 bg-[#1f1f1f] shadow-2xl z-30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-semibold text-white">Notifications</span>
              <div className="flex items-center gap-3">
                <button onClick={onMarkAllRead} className="text-[11px] text-white/40 hover:text-white">
                  Mark all read
                </button>
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                  <X size={13} />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && <p className="text-xs text-white/30 text-center py-8">You&apos;re all caught up.</p>}
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
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}22`, border: `1px solid ${accent}40` }}>
                      <Icon size={13} color={accent} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs truncate ${n.read ? "text-white/50" : "text-white font-medium"}`}>{n.title}</p>
                      <p className="text-[11px] text-white/40 truncate">{n.detail}</p>
                    </div>
                    <span className="text-[10px] text-white/25 ml-auto shrink-0">{n.time}</span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: PALETTE.amber }} />}
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

function ToastStack({ toasts, onOpenReceipt }: { toasts: AppNotification[]; onOpenReceipt: (id: string) => void }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 w-72">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = NOTIF_ICONS[t.type];
          return (
            <motion.button
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={() => t.receiptId && onOpenReceipt(t.receiptId)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1f1f1f]/95 backdrop-blur-md shadow-2xl px-4 py-3 text-left"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${PALETTE.amber}22`, border: `1px solid ${PALETTE.amber}40` }}>
                <Icon size={13} color={PALETTE.amber} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{t.title}</p>
                <p className="text-[11px] text-white/50 truncate">{t.detail}</p>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
   ACCOUNT SWITCHER  (3 roles: Admin / User / Viewer, with login+password editing)
   ========================================================================= */

const ROLE_TONE: Record<Role, string> = { Admin: PALETTE.amber, User: PALETTE.sage, Viewer: PALETTE.mist };

function AccountSwitcher({
  accounts,
  activeIndex,
  onSwitch,
  onUpdateCredentials,
}: {
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

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 pl-3 border-l border-white/10 cursor-pointer">
        <div className="w-8 h-8 rounded-full" style={{ background: `linear-gradient(135deg, ${active.avatarColor}, ${PALETTE.rust})` }} />
        <div className="leading-tight text-left">
          <p className="text-xs font-medium text-white">{active.name}</p>
          <p className="text-[10px]" style={{ color: ROLE_TONE[active.role] }}>
            {active.role} · •• {active.last4}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown size={13} className="text-white/40" />
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
              className="absolute right-0 top-11 w-72 rounded-2xl border border-white/10 bg-[#1f1f1f] shadow-2xl z-30 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-white/5">
                <span className="text-[11px] font-semibold text-white/40 tracking-wide">SWITCH ACCOUNT</span>
              </div>
              {accounts.map((a, i) => (
                <div key={a.id} className="border-b border-white/5 last:border-0">
                  <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left">
                    <button
                      onClick={() => {
                        onSwitch(i);
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-8 h-8 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${a.avatarColor}, ${PALETTE.rust})` }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{a.name}</p>
                        <p className="text-[10px] truncate" style={{ color: ROLE_TONE[a.role] }}>
                          {a.role} · {a.email || "no login set"}
                        </p>
                      </div>
                    </button>
                    {i === activeIndex && <Check size={14} style={{ color: PALETTE.amber }} className="shrink-0" />}
                    <button
                      onClick={() => {
                        setEditingId(editingId === a.id ? null : a.id);
                        setDraftEmail(a.email);
                        setDraftPassword("");
                      }}
                      className="text-white/30 hover:text-white shrink-0"
                      title="Edit login"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                  {editingId === a.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-4 pb-3 space-y-2">
                      <input
                        value={draftEmail}
                        onChange={(e) => setDraftEmail(e.target.value)}
                        placeholder="Login email"
                        className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder:text-white/30 outline-none"
                      />
                      <input
                        value={draftPassword}
                        onChange={(e) => setDraftPassword(e.target.value)}
                        type="password"
                        placeholder="New password"
                        className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder:text-white/30 outline-none"
                      />
                      <button
                        onClick={() => {
                          onUpdateCredentials(a.id, draftEmail, draftPassword || a.password);
                          setEditingId(null);
                        }}
                        className="text-[11px] font-medium rounded-lg px-3 py-1.5 w-full"
                        style={{ background: PALETTE.amber, color: PALETTE.deepest }}
                      >
                        Save credentials
                      </button>
                    </motion.div>
                  )}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
   GENERIC PREMIUM SLIDER  (used for Request/Transfer)
   ========================================================================= */

function PremiumSlider({
  leftLabel,
  rightLabel,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  value,
  onChange,
  accent,
}: {
  leftLabel: string;
  rightLabel: string;
  leftIcon: any;
  rightIcon: any;
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
  accent: string;
}) {
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);

  const fire = (v: "left" | "right", e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, key: Date.now() });
    onChange(v);
  };

  return (
    <div className="relative grid grid-cols-2 gap-0 rounded-full p-1 bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md">
      <motion.div
        className="absolute top-1 bottom-1 rounded-full"
        style={{ background: value === "right" ? accent : PALETTE.white, width: "calc(50% - 4px)" }}
        animate={{ left: value === "left" ? 4 : "calc(50% + 0px)" }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      />
      {(["left", "right"] as const).map((side) => {
        const Icon = side === "left" ? LeftIcon : RightIcon;
        const label = side === "left" ? leftLabel : rightLabel;
        return (
          <button key={side} onClick={(e) => fire(side, e)} className="relative z-10 flex items-center justify-center gap-2 py-3 text-sm font-medium overflow-hidden">
            <motion.span
              animate={value === side ? { y: 0, opacity: 1 } : { y: 2, opacity: 0.7 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex items-center gap-2"
              style={{ color: value === side ? PALETTE.deepest : "#ffffffaa" }}
            >
              <Icon size={14} /> {label}
            </motion.span>
            <AnimatePresence>
              {ripple && value === side && (
                <motion.span
                  key={ripple.key}
                  className="absolute rounded-full bg-white/40 pointer-events-none"
                  style={{ left: ripple.x, top: ripple.y, translateX: "-50%", translateY: "-50%" }}
                  initial={{ width: 0, height: 0, opacity: 0.6 }}
                  animate={{ width: 160, height: 160, opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
   GRAPH ("Transaction Receipt History") + PIPELINE STATUS
   ========================================================================= */

function TransactionHistoryChart({ data, accent }: { data: { label: string; value: number }[]; accent: string }) {
  const width = 720;
  const height = 200;
  const padding = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(1, data.length - 1)) * (width - padding * 2),
    y: height - padding - ((d.value - min) / (max - min || 1)) * (height - padding * 2),
    ...d,
  }));

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
      <defs>
        <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((row) => (
        <line key={row} x1={padding} x2={width - padding} y1={padding + row * ((height - padding * 2) / 3)} y2={padding + row * ((height - padding * 2) / 3)} stroke="rgba(255,255,255,0.06)" />
      ))}
      <motion.path key={JSON.stringify(data)} d={areaPath} fill="url(#historyFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      <motion.path
        key={`${JSON.stringify(data)}-line`}
        d={linePath}
        fill="none"
        stroke={PALETTE.white}
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={PALETTE.white} opacity={0.85} />
      ))}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 4} fontSize="11" fill={PALETTE.gray2} textAnchor="middle">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function PendingReviewStatus({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md px-5 py-4 flex items-center justify-between flex-wrap gap-3">
      <span className="text-xs font-semibold text-white/40 tracking-wide">PIPELINE STATUS</span>
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(PIPELINE_META) as (keyof typeof PIPELINE_META)[]).map((key) => {
          const s = PIPELINE_META[key];
          const count = counts[key] ?? 0;
          return (
            <motion.div
              key={key}
              className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shrink-0 overflow-hidden"
              style={{ background: `${s.tone}1a`, border: `1px solid ${s.tone}40`, color: s.tone }}
              animate={
                key === "pending" ? { opacity: [0.6, 1, 0.6] } : key === "complete" ? { boxShadow: [`0 0 0px ${s.tone}00`, `0 0 10px ${s.tone}55`, `0 0 0px ${s.tone}00`] } : {}
              }
              transition={{ duration: key === "pending" ? 2.2 : 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {key === "ongoing" && (
                <motion.span
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(90deg, transparent, ${s.tone}33, transparent)` }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                />
              )}
              <s.icon size={12} strokeWidth={2} className={`relative ${s.spin ? "animate-spin" : ""}`} />
              <span className="relative">{s.label}</span>
              <span className="relative text-white/70">{count}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Item 16 — horizontal bar chart, one rectangle per receipt, length ∝ amount, colored by status. */
function StatusUpdateBar({ receipts, onOpen }: { receipts: Receipt[]; onOpen: (id: string) => void }) {
  const rows = receipts.slice(0, 8);
  const max = Math.max(1, ...rows.map((r) => r.amount));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md px-5 py-4">
      <span className="text-[11px] font-semibold text-white/40 tracking-wide">STATUS UPDATE BAR</span>
      <div className="mt-3 space-y-2.5">
        {rows.length === 0 && <p className="text-xs text-white/30">No receipts uploaded yet.</p>}
        {rows.map((r) => {
          const meta = PIPELINE_META[r.status as keyof typeof PIPELINE_META] ?? PIPELINE_META.complete;
          const pct = Math.max(6, (r.amount / max) * 100);
          return (
            <button key={r.id} onClick={() => onOpen(r.id)} className="w-full flex items-center gap-3 group">
              <span className="text-[11px] text-white/60 w-28 truncate text-left shrink-0">{r.vendor}</span>
              <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden relative">
                <motion.div
                  className="h-full rounded-lg flex items-center px-2"
                  style={{ background: `${meta.tone}` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: PALETTE.deepest }}>
                    {peso(r.amount)}
                  </span>
                </motion.div>
              </div>
              <span className="text-[10px] font-medium w-16 text-right shrink-0" style={{ color: meta.tone }}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   VIEW SWITCHER — Dashboard / Receipt Inbox / Upload New Receipt (item 18)
   ========================================================================= */

type View = "dashboard" | "inbox";

function ViewSwitcher({
  view,
  setView,
  accent,
  onUploadClick,
}: {
  view: View;
  setView: (v: View) => void;
  accent: string;
  onUploadClick: () => void;
}) {
  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full p-1 bg-white/5 border border-white/10 backdrop-blur-md">
      {[
        { key: "dashboard" as View, label: "Dashboard", icon: LayoutGrid },
        { key: "inbox" as View, label: "Receipt Inbox", icon: InboxIcon },
      ].map((v) => (
        <button key={v.key} onClick={() => setView(v.key)} className="relative flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full transition-colors">
          {view === v.key && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full" style={{ background: accent }} transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
          <v.icon size={13} className="relative z-10" style={{ color: view === v.key ? PALETTE.deepest : "#ffffffaa" }} />
          <span className="relative z-10" style={{ color: view === v.key ? PALETTE.deepest : "#ffffffaa" }}>
            {v.label}
          </span>
        </button>
      ))}
      <div className="w-px h-4 bg-white/15 mx-1" />
      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onUploadClick} className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full text-white/80 hover:text-white">
        <UploadCloud size={13} /> Upload New Receipt
      </motion.button>
    </div>
  );
}

/* ============================================================================
   ADD-NEW-CARD COLOR PICKER (swatches + exact hex color input)
   ========================================================================= */

function AddCardButton({ accent, onCreate, disabled }: { accent: string; onCreate: (color: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState(PALETTE.amber);

  if (disabled) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs font-medium rounded-full px-3 py-1.5 transition-colors" style={{ background: accent, color: PALETTE.deepest }}>
        <Plus size={13} /> Add new
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              className="absolute right-0 top-9 z-30 rounded-2xl border border-white/10 bg-[#1f1f1f] shadow-2xl p-3 w-56"
            >
              <p className="text-[11px] text-white/40 mb-2 flex items-center gap-1.5">
                <Palette size={11} /> Choose a card color
              </p>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {CARD_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onCreate(c);
                      setOpen(false);
                    }}
                    className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-white/40 mb-1.5">Or pick an exact color</p>
              <div className="flex items-center gap-2">
                <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-8 h-8 rounded-lg border border-white/15 bg-transparent cursor-pointer" />
                <button
                  onClick={() => {
                    onCreate(customColor);
                    setOpen(false);
                  }}
                  className="flex-1 text-[11px] font-medium rounded-lg px-3 py-2"
                  style={{ background: customColor, color: PALETTE.deepest }}
                >
                  Use {customColor}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
   MAIN DASHBOARD — default export, owns all app state
   ========================================================================= */

export default function Dashboard() {
  const accent = PALETTE.amber;
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts());
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>(() => seedReceipts(seedAccounts()));
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(() => seedReceipts(seedAccounts()).map(receiptToTransaction));
  const [history, setHistory] = useState<HistoryEntry[]>(() => seedReceipts(seedAccounts()).map(receiptToHistoryEntry));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<DateRange>("6m");
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [requestTransfer, setRequestTransfer] = useState<"left" | "right">("right");
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "processing" | "pending" | "complete">("all");
  const quickUploadRef = useRef<HTMLInputElement>(null);

  const role = accounts[activeAccountIndex]?.role ?? "Viewer";
  const canManage = role !== "Viewer"; // Admin + User can upload/delete/reassign/add cards; Viewer is read-only

  const pushNotification = useCallback((n: Omit<AppNotification, "id" | "read" | "time">) => {
    const full: AppNotification = { ...n, id: uid("notif"), read: false, time: "now" };
    setNotifications((prev) => [full, ...prev]);
    setToasts((prev) => [...prev, full]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== full.id));
    }, 4500);
  }, []);

  const advanceReceipt = useCallback(
    (id: string, next: ReceiptStatus, delay: number) => {
      window.setTimeout(() => {
        setReceipts((prev) => prev.map((r) => (r.id === id && r.auto ? { ...r, status: next } : r)));
        setTransactions((prev) => prev.map((t) => (t.receiptId === id ? { ...t, status: next } : t)));
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
      setSelectedReceiptId(receipt.id);
      setView("inbox");

      pushNotification({
        type: source === "email" ? "email" : "new_receipt",
        title: source === "email" ? "New email received" : "New receipt received",
        detail: `${vendor.name}${fileName ? ` — ${fileName}` : ""} · Processing`,
        receiptId: receipt.id,
      });

      advanceReceipt(receipt.id, "ongoing", 3000);
      advanceReceipt(receipt.id, "pending", 6000);
      advanceReceipt(receipt.id, "complete", 9000);
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

  const deleteReceipt = useCallback((id: string) => {
    // Receipts + live transactions can be removed, but `history` (feeding the graph) is untouched on purpose.
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    setTransactions((prev) => prev.filter((t) => t.receiptId !== id));
    setSelectedReceiptId((cur) => (cur === id ? null : cur));
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
    setTransactions((prev) => prev.map((t) => (t.receiptId === id ? { ...t, status } : t)));
  }, []);

  const openReceipt = useCallback((id: string) => {
    setSelectedReceiptId(id);
    setView("inbox");
  }, []);

  const updateCredentials = useCallback((id: string, email: string, password: string) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, email, password } : a)));
  }, []);

  const createCustomCard = useCallback((color: string) => {
    setAccounts((prev) => [...prev, { id: uid("acc"), last4: randomLast4(), name: "New Cardholder", role: "User", email: "", password: "", avatarColor: color, balance: 0 }]);
  }, []);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 1200);
  };

  const account = accounts[activeAccountIndex];
  const chartData = useMemo(() => buildSeries(history, account.last4, range), [history, account.last4, range]);

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
      background: i === 0 && !latest ? `linear-gradient(135deg, ${PALETTE.peach} 0%, ${PALETTE.sand} 100%)` : `linear-gradient(135deg, ${a.avatarColor} 0%, ${PALETTE.rust} 100%)`,
      label: latest ? latest.vendor : a.name,
      balance: peso(a.balance),
      last4: a.last4,
      dateLabel: latest ? dateAndYear(latest.date) : undefined,
      contactNumber: latest?.contactNumber,
      items: latest?.lineItems.map((li) => ({ name: li.name, qty: li.qty, price: li.price })),
    };
  });

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = { processing: 0, ongoing: 0, pending: 0, complete: 0 };
    transactions.forEach((t) => {
      if (t.status in counts) counts[t.status] += 1;
    });
    return counts;
  }, [transactions]);

  const q = query.trim().toLowerCase();
  const visibleTransactions = transactions
    .filter((t) => t.accountLast4 === account.last4)
    .filter((t) => (q ? [t.vendor, t.category, t.status, t.paymentMethod, t.paymentType, t.emailSource ?? "", dateAndYear(t.date)].join(" ").toLowerCase().includes(q) : true));

  const sidebarReceipts = receipts.filter((r) => r.accountLast4 === account.last4).filter((r) => (sidebarFilter === "all" ? true : r.status === sidebarFilter)).slice(0, 6);

  if (receipts.length === 0) {
    return <UploadScreen accent={accent} onUpload={handleUpload} />;
  }

  const SIDEBAR_FILTERS: { key: typeof sidebarFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "processing", label: "Processing" },
    { key: "pending", label: "Pending" },
    { key: "complete", label: "Complete" },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden" style={{ background: PALETTE.deepest }}>
      <ViewSwitcher view={view} setView={setView} accent={accent} onUploadClick={() => quickUploadRef.current?.click()} />
      <input ref={quickUploadRef} type="file" accept=".jpg,.jpeg,.png,.heic,.pdf,.xlsx,.xls" className="hidden" onChange={(e) => handleQuickUploadFile(e.target.files)} />
      <ToastStack toasts={toasts} onOpenReceipt={openReceipt} />

      <AnimatePresence mode="wait">
        {view === "inbox" ? (
          <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="h-full p-6 pt-20">
            <ReceiptInbox receipts={receipts} selectedReceiptId={selectedReceiptId} onSelect={setSelectedReceiptId} onDelete={deleteReceipt} onReassignStatus={reassignStatus} canManage={canManage} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="h-full">
            <div
              className="relative flex h-full w-full font-sans antialiased overflow-hidden transition-colors duration-500"
              style={{ background: mode === "dark" ? PALETTE.deepest : PALETTE.sand, color: mode === "dark" ? PALETTE.white : PALETTE.deepest }}
            >
              <div className="pointer-events-none absolute inset-0 -z-0">
                <div className="absolute -top-32 left-1/3 w-[560px] h-[440px] rounded-full blur-[120px]" style={{ background: `${accent}1f` }} />
                <div className="absolute bottom-0 right-0 w-[460px] h-[400px] rounded-full blur-[120px]" style={{ background: `${PALETTE.sage}22` }} />
              </div>

              <main className="relative z-10 flex-1 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2 w-80">
                    <button onClick={refresh} title="Refresh dashboard" className="text-white/50 hover:text-white transition-colors shrink-0">
                      <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }} transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}} className="inline-block">
                        <RotateCw size={15} />
                      </motion.span>
                    </button>
                    <div className="w-px h-4 bg-white/10 shrink-0" />
                    <Search size={15} className="text-white/40 shrink-0" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipts, vendors, dates, payment type…" className="bg-transparent outline-none text-sm placeholder:text-white/30 w-full" />
                  </div>

                  <div className="flex items-center gap-4">
                    <NotificationCenter
                      notifications={notifications}
                      accent={accent}
                      onMarkRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))}
                      onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                      onOpenReceipt={openReceipt}
                    />

                    <button className="text-white/60 hover:text-white transition-colors" onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))} title="Toggle theme">
                      <motion.span key={mode} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
                        {mode === "dark" ? <Moon size={16} style={{ color: accent }} /> : <Sun size={16} style={{ color: accent }} />}
                      </motion.span>
                    </button>

                    <AccountSwitcher accounts={accounts} activeIndex={activeAccountIndex} onSwitch={setActiveAccountIndex} onUpdateCredentials={updateCredentials} />
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  {/* Request/Transfer — upper-center, OUTSIDE the graph card (item 4) */}
                  <div className="flex justify-center">
                    <div className="w-64">
                      <PremiumSlider leftLabel="Request" rightLabel="Transfer" leftIcon={ArrowDownLeft} rightIcon={ArrowUpRight} value={requestTransfer} onChange={setRequestTransfer} accent={accent} />
                    </div>
                  </div>

                  <motion.div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 relative overflow-hidden" whileHover={{ borderColor: `${accent}55` }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#E89131]/10 via-transparent to-[#034E34]/5 pointer-events-none" />

                    <div className="relative flex items-start justify-between mb-6 flex-wrap gap-3">
                      <div>
                        <h2 className="text-sm text-white/50 mb-1">
                          Transaction Receipt History <span className="text-white/30">· •••• {account.last4}</span>
                        </h2>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-semibold" style={{ color: mode === "dark" ? PALETTE.white : PALETTE.deepest }}>
                            {peso(account.balance)}
                          </span>
                          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: PALETTE.sage }}>
                            <ArrowUpRight size={12} /> 2.92%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
                        {RANGES.map((r) => (
                          <button
                            key={r.key}
                            onClick={() => setRange(r.key)}
                            className="text-xs px-3 py-1.5 rounded-full transition-colors"
                            style={{ background: range === r.key ? PALETTE.white : "transparent", color: range === r.key ? PALETTE.deepest : "#ffffff80", fontWeight: range === r.key ? 500 : 400 }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <TransactionHistoryChart data={chartData} accent={accent} />
                  </motion.div>

                  <PendingReviewStatus counts={pipelineCounts} />
                  <StatusUpdateBar receipts={receipts.filter((r) => r.accountLast4 === account.last4)} onOpen={openReceipt} />
                </div>
              </main>

              <aside className="relative z-10 w-96 border-l border-white/5 p-6 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between mb-6 w-full">
                  <h3 className="font-medium text-sm text-white/50">My cards</h3>
                  <AddCardButton accent={accent} onCreate={createCustomCard} disabled={!canManage} />
                </div>

                <CardCarousel cards={carouselCards} activeIndex={activeAccountIndex} onActiveChange={setActiveAccountIndex} />

                {/* Receipt status filter — mirrors the Receipt Inbox filters exactly (item 17) */}
                <div className="mt-5 flex items-center gap-1.5 flex-wrap">
                  {SIDEBAR_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setSidebarFilter(f.key)}
                      className="text-[11px] px-3 py-1.5 rounded-full transition-colors"
                      style={{
                        background: sidebarFilter === f.key ? PALETTE.white : "rgba(255,255,255,0.05)",
                        color: sidebarFilter === f.key ? PALETTE.deepest : "#ffffff80",
                        fontWeight: sidebarFilter === f.key ? 500 : 400,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-1.5">
                  {sidebarReceipts.map((r) => {
                    const meta = PIPELINE_META[r.status as keyof typeof PIPELINE_META] ?? PIPELINE_META.complete;
                    return (
                      <button key={r.id} onClick={() => openReceipt(r.id)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors text-left">
                        <span className="text-xs text-white/80 truncate">{r.vendor}</span>
                        <span className="text-[10px] font-medium shrink-0" style={{ color: meta.tone }}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                  {sidebarReceipts.length === 0 && <p className="text-center text-[11px] text-white/25 py-3">Nothing here yet.</p>}
                </div>

                <div className="flex items-center justify-between mt-8 mb-4">
                  <h3 className="font-medium text-sm text-white/50">Recent Transactions</h3>
                  <span className="text-xs" style={{ color: accent }}>
                    {visibleTransactions.length} total
                  </span>
                </div>

                <div className="space-y-1">
                  {visibleTransactions.slice(0, 8).map((t) => {
                    const meta = PIPELINE_META[t.status as keyof typeof PIPELINE_META];
                    return (
                      <button key={t.id} onClick={() => openReceipt(t.receiptId)} className="w-full flex items-center justify-between px-2 py-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: accent, color: PALETTE.deepest }}>
                            {t.vendor.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-sm text-white truncate">{t.vendor}</p>
                              {t.emailSource && <Mail size={10} className="text-white/30 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-white/40 truncate flex items-center gap-1">
                              {t.category} · {t.paymentType === "cash" ? <Banknote size={9} /> : <CreditCard size={9} />} {t.paymentMethod}
                            </p>
                            <p className="text-[10.5px] text-white/25">
                              {dateAndYear(t.date)} · {t.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-medium text-white">{peso(t.amount)}</span>
                          {meta && (
                            <span className="flex items-center gap-1 text-[9.5px] font-medium rounded-full px-1.5 py-0.5" style={{ color: meta.tone, background: `${meta.tone}1a` }}>
                              <meta.icon size={9} className={meta.spin ? "animate-spin" : ""} />
                              {meta.label}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {visibleTransactions.length === 0 && <p className="text-center text-xs text-white/30 py-8">No transactions yet.</p>}
                </div>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}