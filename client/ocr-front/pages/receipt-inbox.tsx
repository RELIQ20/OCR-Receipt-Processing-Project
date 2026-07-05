import { useState } from 'react';
import { IoSearch, IoFilter } from "react-icons/io5";
import { FaCheck } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import type { EditState, ReceiptData, Status } from '../types/receipt';
import InboxItem from '../components/InboxItem';

interface ReceiptInboxProps {
  onSignOut?: () => Promise<void>;
}

export default function ReceiptInbox({ onSignOut }: ReceiptInboxProps) {
  // Sample data only orayt
  const receipts: ReceiptData[] = [
  {
    id: "r1", // Unique identifier for the receipt; fetched from database 
    vendor: "Starbucks",
    items: [
      { name: "Caramel Macchiato", quantity: 1, price: 6.25 },
      { name: "Blueberry Muffin", quantity: 1, price: 3.75 },
    ],
    total: 10.00,
    tax: 0.80,
    date: "2026-07-01",
    time: "08:15",
    status: "completed",
    confidence: 99,
  },

  {
    id: "r2",
    vendor: "SM Supermarket",
    items: [
      { name: "Rice (5kg)", quantity: 1, price: 12.50 },
      { name: "Fresh Milk", quantity: 2, price: 2.15 },
      { name: "Eggs (12 pcs)", quantity: 1, price: 4.20 },
      { name: "Bread", quantity: 1, price: 2.10 },
    ],
    total: 20.95,
    tax: 1.88,
    date: "2026-07-01",
    time: "18:42",
    status: "completed",
    confidence: 98,
  },

  {
    id: "r3",
    vendor: "BDO ATM",
    items: [
      { name: "Cash Withdrawal", quantity: 1, price: 200.00 },
      { name: "ATM Service Fee", quantity: 1, price: 2.50 },
    ],
    total: 202.50,
    tax: 0,
    date: "2026-06-30",
    time: "14:10",
    status: "completed",
    confidence: 97,
  },

  {
    id: "r4",
    vendor: "Grab",
    items: [
      { name: "Ride - Ayala to IT Park", quantity: 1, price: 8.75 },
    ],
    total: 8.75,
    tax: 0.79,
    date: "2026-06-30",
    time: "09:18",
    status: "completed",
    confidence: 96,
  },

  {
    id: "r5",
    vendor: "Shell",
    items: [
      { name: "Unleaded Fuel", quantity: 25, price: 1.65 },
    ],
    total: 41.25,
    tax: 3.71,
    date: "2026-06-29",
    time: "07:35",
    status: "for_review",
    confidence: 81,
  },

  {
    id: "r6",
    vendor: "Mercury Drug",
    items: [
      { name: "Paracetamol", quantity: 2, price: 3.20 },
      { name: "Vitamin C", quantity: 1, price: 8.50 },
    ],
    total: 14.90,
    tax: 1.34,
    date: "2026-06-29",
    time: "19:40",
    status: "completed",
    confidence: 95,
  },

  {
    id: "r7",
    vendor: "Jollibee",
    items: [
      { name: "Chickenjoy Meal", quantity: 2, price: 6.25 },
      { name: "Peach Mango Pie", quantity: 2, price: 1.50 },
      { name: "Soft Drinks", quantity: 2, price: 1.20 },
    ],
    total: 17.90,
    tax: 1.61,
    date: "2026-06-28",
    time: "12:24",
    status: "completed",
    confidence: 99,
  },

  {
    id: "r8",
    vendor: "Cebu Pacific",
    items: [
      { name: "Flight Ticket MNL-CEB", quantity: 1, price: 92.00 },
      { name: "20kg Baggage", quantity: 1, price: 18.00 },
    ],
    total: 110.00,
    tax: 9.90,
    date: "2026-06-28",
    time: "10:05",
    status: "processing",
    confidence: 90,
  },

  {
    id: "r9",
    vendor: "Marriott Hotel",
    items: [
      { name: "Deluxe Room", quantity: 2, price: 145.00 },
      { name: "Breakfast Buffet", quantity: 2, price: 18.00 },
    ],
    total: 326.00,
    tax: 29.34,
    date: "2026-06-27",
    time: "13:15",
    status: "completed",
    confidence: 98,
  },

  {
    id: "r10",
    vendor: "LRT Ticketing",
    items: [
      { name: "Single Journey Ticket", quantity: 1, price: 0.75 },
    ],
    total: 0.75,
    tax: 0,
    date: "2026-06-27",
    time: "08:05",
    status: "completed",
    confidence: 93,
  },

  {
    id: "r11",
    vendor: "7-Eleven",
    items: [
      { name: "Bottled Water", quantity: 2, price: 1.20 },
      { name: "Hotdog Sandwich", quantity: 1, price: 2.50 },
      { name: "Coffee", quantity: 1, price: 1.80 },
    ],
    total: 6.70,
    tax: 0.60,
    date: "2026-06-26",
    time: "22:18",
    status: "completed",
    confidence: 96,
  },

  {
    id: "r12",
    vendor: "GCash Cash-In",
    items: [
      { name: "Cash-In Transaction", quantity: 1, price: 100.00 },
      { name: "Convenience Fee", quantity: 1, price: 1.00 },
    ],
    total: 101.00,
    tax: 0,
    date: "2026-06-26",
    time: "16:40",
    status: "for_review",
    confidence: 84,
  },
];

  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<ReceiptData>(receipts[0]);
  const [editMode, setEditMode] = useState(false);
  const [edit, setEdit] = useState<EditState>({
    vendor: receipts[0].vendor,
    total: receipts[0].total,
    tax: receipts[0].tax,
    items: receipts[0].items,
    date: receipts[0].date,
    time: receipts[0].time,
  });

  const filtered = receipts.filter(r => r.vendor.toLowerCase().includes(search.toLowerCase()));

  const tBgFor = (s: Status) =>
    s === "completed" ? "bg-castleton" : s === "for_review" ? "bg-saffaron" : "bg-sea";

  const handleSave = () => {
    const updatedReceipt: ReceiptData = {
      ...selected,
      vendor: edit.vendor,
      items: edit.items.map((item) => ({ ...item })),
      total: edit.total,
      tax: edit.tax,
      date: edit.date,
      time: edit.time,
    };

    setSelected(updatedReceipt);
    setEdit(updatedReceipt);
    setEditMode(false);
  };

  function ConfidenceBar({ label, value }: { label: string; value: number }) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </span>
          <span className="text-xs font-semibold text-gray-500">{value}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${value}%`, backgroundColor: "bg-castleton" }}
          />
        </div>
      </div>
    );
  }

  // Processing Timeline
  const timeline = [
    {
      label: "Receipt received from WhatsApp",
      done: true,
    },
    {
      label: "OCR processing completed",
      done: selected.status !== "processing",
    },
    {
      label: "Receipt data extracted",
      done: selected.status !== "processing",
    },
    {
      label: "Receipt data verified",
      done: selected.status === "completed",
    },
    {
      label: "Receipt report generated",
      done: selected.status === "completed",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-100 shrink-0 flex items-center justify-between">
          <div className="relative flex-1">
            <IoSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search receipts…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-100 focus:outline-none focus:border-green-300"/>
          </div>
          <button
            onClick={() => onSignOut?.()}
            className="ml-3 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
          >
            Sign Out
          </button>
        </div>
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{filtered.length} receipts</span>
            <button className="text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600">
              <IoFilter size={11}/> Filter
            </button>
          </div>
        </div>

        {/* Inbox list */}
        <div className="overflow-y-auto flex-1">
          {filtered.map(r => {
            const active = selected.id === r.id;
            return (
              <InboxItem 
                receipt={r}
                onClick={() => setSelected(r)} 
                isActive={active} 
              />
            );
          })}
        </div>
      </div>

      {/* Inbox detail view */}
      <div className="flex-1 overflow-y-auto bg-salt">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "text-castleton" }}>{selected.vendor || "Unknown Vendor"}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{selected.date} at {selected.time}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="rounded-full px-3 py-1 text-xs font-semibold capitalize text-white" style={{ backgroundColor: tBgFor(selected.status) }}>
                {selected.status.replace("_", " ")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Image + timeline */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div
                  className="h-64 flex items-center justify-center"
                  style={{ backgroundColor: tBgFor(selected.status) }}
                >
                  {selected.receiptImage ? (
                    <img
                      src={selected.receiptImage}
                      alt={`${selected.vendor} receipt`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="w-48 h-56 bg-white border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center shadow-sm">
                      <span className="text-sm font-medium text-gray-500">
                        Receipt Image
                      </span>
                      <span className="mt-1 text-xs text-gray-400">
                        Image preview will appear here
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Processing Timeline</h4>
                <div className="space-y-3.5">
                  {timeline.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-500" : "bg-gray-200"}`}>
                        {step.done ? <FaCheck size={10} color="white"/> : <div className="w-2 h-2 rounded-full bg-gray-400"/>}
                      </div>
                      <p className={`text-xs flex-1 ${step.done ? "text-gray-700" : "text-gray-400"}`}>{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Extracted data */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-sm font-semibold">Extracted Data</h4>
                  <button onClick={() => setEditMode(!editMode)}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <MdEdit size={12}/> {editMode ? "Cancel" : "Edit"}
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
                      Vendor Name
                    </label>

                    {editMode ? (
                      <input
                        value={edit.vendor}
                        onChange={(e) =>
                          setEdit({ ...edit, vendor: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none"
                      />
                    ) : (
                      <p
                        className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg"
                        style={{ color: "text-castleton" }}
                      >
                        {edit.vendor || "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
                      Total Amount
                    </label>

                    {editMode ? (
                      <input
                        type="number"
                        value={edit.total}
                        onChange={(e) =>
                          setEdit({ ...edit, total: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none"
                      />
                    ) : (
                      <p
                        className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg"
                        style={{ color: "text-castleton" }}
                      >
                        ${edit.total.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
                      Tax
                    </label>

                    {editMode ? (
                      <input
                        type="number"
                        value={edit.tax}
                        onChange={(e) =>
                          setEdit({ ...edit, tax: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none"
                      />
                    ) : (
                      <p
                        className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg"
                        style={{ color: "text-castleton" }}
                      >
                        ${edit.tax.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
                      Items
                    </label>

                    <div className="space-y-2">
                      {edit.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2">
                          <input
                            value={item.name}
                            onChange={(e) => {
                              const items = [...edit.items];
                              items[index].name = e.target.value;
                              setEdit({ ...edit, items });
                            }}
                            className="px-2 py-1 text-sm border rounded"
                          />

                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const items = [...edit.items];
                              items[index].quantity = Number(e.target.value) || 0;
                              setEdit({ ...edit, items });
                            }}
                            className="px-2 py-1 text-sm border rounded"
                          />

                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const items = [...edit.items];
                              items[index].price = Number(e.target.value) || 0;
                              setEdit({ ...edit, items });
                            }}
                            className="px-2 py-1 text-sm border rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <ConfidenceBar
                      label="Overall AI confidence"
                      value={selected.confidence}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  style={{backgroundColor:"bg-castleton"}}>
                  {editMode ? <><MdEdit size={14}/> Save Corrections</> : <><FaCheck size={14}/> Mark as Correct</>}
                </button>
                <button className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors font-medium">
                  Flag Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}