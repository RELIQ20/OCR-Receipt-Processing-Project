import { useState } from 'react';
import { IoSearch, IoFilter } from "react-icons/io5";
import type { ReceiptData } from '../types/receipt';
import InboxItem from '../components/InboxItem';
import InboxDetail from '../components/InboxDetail';

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

  const filtered = receipts.filter(r => r.vendor.toLowerCase().includes(search.toLowerCase()));

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

      <InboxDetail
        receipt={selected}
        onSave={(updatedReceipt) => setSelected(updatedReceipt)}
      />
    </div>
  )
}