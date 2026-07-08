"use client";

import { useCallback, useMemo, useRef, useState, type SetStateAction } from "react";
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
   BRAND PALETTE
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

/* ============================================================================
   TYPES & INTERFACES
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

/* ============================================================================
   HELPERS & SEED DATA
   ========================================================================= */
const VENDORS = [
  { name: "Nike Store", category: "Retail", contact: "+63 917 200 1122" },
  { name: "WeWork", category: "Workspace", contact: "+63 918 334 5567" },
  { name: "Google Drive", category: "Subscription", contact: "+63 2 8888 0000" },
  { name: "Starbucks", category: "Food & Drink", contact: "+63 917 555 0192" },
  { name: "Jollibee", category: "Food & Drink", contact: "+63 2 8879 8888" },
];

const PAYMENT_METHODS: { label: string; type: PaymentType }[] = [
  { label: "GCash", type: "online" },
  { label: "Visa •• 5008", type: "online" },
  { label: "Cash", type: "cash" },
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

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function peso(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateAndYear(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
      { id: uid("li"), name: `${vendor.name} Allocation`, qty: 1, price: amount },
    ],
    timeline: [
      { label: "Uploaded", time: "Just now", done: true },
      { label: "OCR scan", time: done ? "Complete" : "", done },
      { label: "AI extraction", time: done ? "Complete" : "", done },
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

function seedReceipts(accounts: Account[]): Receipt[] {
  const out: Receipt[] = [];
  const now = new Date();
  accounts.forEach((acc) => {
    VENDORS.forEach((vendor, i) => {
      out.push(
        makeReceipt({
          vendor,
          amount: 120 + i * 45,
          date: now,
          status: "complete",
          source: "upload",
          accountLast4: acc.last4,
          payment: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
        })
      );
    });
  });
  return out;
}

/* ============================================================================
   SUBCOMPONENTS
   ========================================================================= */
function StatusBadge({ status }: { status: ReceiptStatus }) {
  const styles: Record<ReceiptStatus, { label: string; tone: string }> = {
    processing: { label: "Processing", tone: PALETTE.amber },
    ongoing: { label: "Ongoing", tone: PALETTE.gold },
    pending: { label: "Pending", tone: PALETTE.mist },
    complete: { label: "Complete", tone: PALETTE.forest },
    failed: { label: "Failed", tone: PALETTE.rust },
  };
  const s = styles[status] || styles.pending;
  return (
    <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ color: s.tone, background: `${s.tone}1a`, border: `1px solid ${s.tone}40` }}>
      {s.label}
    </span>
  );
}

function ReceiptThumb({ receipt, size = 40 }: { receipt: Receipt; size?: number }) {
  if (receipt.imagePreview) {
    return <img src={receipt.imagePreview} alt={receipt.vendor} style={{ width: size, height: size }} className="rounded-xl object-cover shrink-0 border border-white/10" />;
  }
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, background: `linear-gradient(135deg,${PALETTE.amber},${PALETTE.rust})`, color: PALETTE.deepest }}>
      <ReceiptIcon size={size * 0.45} />
    </div>
  );
}

function UploadScreen({ accent, onUpload }: { accent: string; onUpload: (source: "upload" | "camera", name?: string, preview?: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 text-center" style={{ background: PALETTE.deepest }}>
      <div className="max-w-md w-full border border-white/10 rounded-[28px] bg-white/[0.02] p-8 backdrop-blur-xl">
        <UploadCloud size={40} className="mx-auto mb-4" style={{ color: accent }} />
        <h2 className="text-xl font-medium text-white mb-2">Ingest core ledger documents</h2>
        <button onClick={() => inputRef.current?.click()} className="px-5 py-2.5 rounded-full text-xs font-semibold shadow-lg transition-transform hover:scale-105" style={{ background: accent, color: PALETTE.deepest }}>
          Choose File
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={async (e) => {
          if (e.target.files?.[0]) {
            const preview = await readImagePreview(e.target.files[0]);
            onUpload("upload", e.target.files[0].name, preview);
          }
        }} />
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN DASHBOARD ARCHITECTURE
   ========================================================================= */
export default function Dashboard() {
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [accounts] = useState<Account[]>(() => seedAccounts());
  const [activeAccountId, setActiveAccountId] = useState<string>("acc_1");
  const [receipts, setReceipts] = useState<Receipt[]>(() => seedReceipts(seedAccounts()));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const activeAccount = useMemo(() => accounts.find(a => a.id === activeAccountId) || accounts[0], [accounts, activeAccountId]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      if (r.accountLast4 !== activeAccount.last4) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return r.vendor.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [receipts, activeAccount, searchQuery]);

  const currentSelectedReceipt = useMemo(() => {
    return receipts.find(r => r.id === selectedReceiptId) || filteredReceipts[0] || null;
  }, [receipts, selectedReceiptId, filteredReceipts]);

  // Fixed mapping architecture for downstream transaction rendering arrays
  const visibleTransactions = useMemo(() => {
    return filteredReceipts.map(r => ({
      id: uid("tx"),
      vendor: r.vendor,
      amount: r.amount,
      date: r.date,
      category: r.category,
      paymentMethod: r.paymentMethod,
      paymentType: r.paymentType,
      status: r.status,
      time: "12:00 PM"
    }));
  }, [filteredReceipts]);

  const handleManualUpload = (source: "upload" | "camera", name?: string, preview?: string) => {
    const randomVendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
    const randomPayment = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
    const amt = Math.round((50 + Math.random() * 250) * 100) / 100;
    
    const newR = makeReceipt({
      vendor: randomVendor,
      amount: amt,
      date: new Date(),
      status: "complete",
      source,
      accountLast4: activeAccount.last4,
      payment: randomPayment,
      imagePreview: preview,
    });

    setReceipts(prev => [newR, ...prev]);
  };

  if (receipts.length === 0) {
    return <UploadScreen accent={activeAccount.avatarColor} onUpload={handleManualUpload} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeMode === "dark" ? "bg-[#0b1a11] text-white" : "bg-[#f4f7f5] text-[#133020]"}`}>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${themeMode === "dark" ? "bg-[#0b1a11]/80 border-white/5" : "bg-[#f4f7f5]/80 border-[#133020]/10"}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#034E34] flex items-center justify-center text-white font-bold">L</div>
            <div>
              <span className="font-semibold text-sm block">Lifewood AI</span>
              <span className="text-[10px] opacity-40 block -mt-1 font-mono">Receipt Core</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setThemeMode(prev => prev === "dark" ? "light" : "dark")} className="p-2 rounded-xl bg-white/5 border border-white/5">
              {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <select value={activeAccountId} onChange={(e) => setActiveAccountId(e.target.value)} className="bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer">
              {accounts.map(acc => <option key={acc.id} value={acc.id} className="bg-[#0b1a11] text-white">{acc.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 w-full">
            <CardCarousel 
              cards={accounts.map(acc => ({
                id: acc.id,
                title: acc.name,
                subtitle: acc.role,
                balance: peso(acc.balance),
                cardNumber: `•••• •••• •••• ${acc.last4}`,
                color: acc.avatarColor
              }))} 
              activeId={activeAccountId} 
              onCardChange={(id: SetStateAction<string>) => setActiveAccountId(id)} 
            />
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div className="p-5 rounded-2xl border bg-white/[0.02] border-white/5">
              <span className="text-[11px] opacity-40 uppercase tracking-wider block">Total Documented</span>
              <span className="text-2xl font-semibold font-mono mt-1 block">{peso(filteredReceipts.reduce((acc, curr) => acc + curr.amount, 0))}</span>
            </div>
            <div className="p-5 rounded-2xl border bg-white/[0.02] border-white/5">
              <span className="text-[11px] opacity-40 uppercase tracking-wider block">Scanned Invoices</span>
              <span className="text-2xl font-semibold font-mono mt-1 block">{filteredReceipts.length} entries</span>
            </div>
            <div className="p-5 rounded-2xl border bg-white/[0.02] border-white/5">
              <span className="text-[11px] opacity-40 uppercase tracking-wider block">Remaining Limits</span>
              <span className="text-2xl font-semibold font-mono mt-1 block">{peso(activeAccount.balance)}</span>
            </div>
          </div>
        </section>

        <section className="p-4 rounded-2xl border bg-white/[0.02] border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#034E34] flex items-center justify-center text-[#FFB347]"><UploadCloud size={18} /></div>
            <div>
              <h3 className="text-xs font-semibold">Live Workspace Document Parser</h3>
              <p className="text-[10.5px] opacity-40">Direct ingestion pipeline uploads files straight into your layout.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleManualUpload("upload")} className="px-4 py-2 rounded-xl text-xs font-medium bg-[#034E34] text-white">Ingest Photo</button>
            <button onClick={() => handleManualUpload("camera")} className="px-4 py-2 rounded-xl text-xs font-medium bg-[#417256] text-white">Snap Camera</button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 h-full">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 flex flex-col min-h-0">
            <h3 className="text-sm font-semibold text-white px-1 mb-3">Receipt Inbox</h3>
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2 mb-3">
              <Search size={14} className="text-white/40" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tags..." className="bg-transparent outline-none text-sm placeholder:text-white/30 w-full text-white" />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredReceipts.map((r) => (
                <button key={r.id} onClick={() => setSelectedReceiptId(r.id)} className={`w-full text-left rounded-2xl border px-4 py-3 flex items-center gap-3 transition-colors ${currentSelectedReceipt?.id === r.id ? "border-[#E89131]/50 bg-white/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
                  <ReceiptThumb receipt={r} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{r.vendor}</p>
                    <p className="text-[11px] opacity-40">{r.category} · {dateAndYear(r.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-medium text-white">{peso(r.amount)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 overflow-y-auto">
            {currentSelectedReceipt ? (
              <div>
                <div className="flex items-start justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <ReceiptThumb receipt={currentSelectedReceipt} size={56} />
                    <div>
                      <h2 className="text-xl font-semibold text-white truncate">{currentSelectedReceipt.vendor}</h2>
                      <p className="text-sm opacity-40">{dateAndYear(currentSelectedReceipt.date)}</p>
                    </div>
                  </div>
                  <StatusBadge status={currentSelectedReceipt.status} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                    <p className="text-[11px] opacity-40 mb-1">Amount</p>
                    <p className="text-lg font-semibold text-white">{peso(currentSelectedReceipt.amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                    <p className="text-[11px] opacity-40 mb-1">Payment Method</p>
                    <p className="text-sm text-white flex items-center gap-1.5">{currentSelectedReceipt.paymentMethod}</p>
                  </div>
                </div>

                <p className="text-xs font-semibold opacity-40 mb-3 tracking-wide">LINE ITEMS</p>
                <div className="space-y-2 mb-6">
                  {currentSelectedReceipt.lineItems.map((li) => (
                    <div key={li.id} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-xl">
                      <span className="text-white/70">{li.name}</span>
                      <span className="text-white font-mono">{peso(li.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <p className="text-xs font-semibold opacity-40 tracking-wide">TRANSACTION REFERENCE AUDIT ({visibleTransactions.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {visibleTransactions.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white/[0.01] p-2 rounded-lg border border-white/5">
                        <span className="opacity-70">{tx.vendor} ({tx.category})</span>
                        <span className="font-mono">{peso(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-30 text-center py-20">No active item layout in focus.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}