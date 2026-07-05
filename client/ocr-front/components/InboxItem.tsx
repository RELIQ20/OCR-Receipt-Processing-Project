import type { ReceiptData } from '../types/receipt';

export default function InboxItem({ 
  receipt,
  onClick,
  isActive
}: { 
  receipt: ReceiptData;
  onClick: () => void
  isActive: boolean; 
}) {
  return (
    <button
      type="button"
      key={receipt.id}
      onClick={onClick}
      className={`group relative flex w-full items-center justify-between gap-4 overflow-hidden px-4 py-4 text-left transition-all duration-300 ${
        isActive
          ? 'border-emerald-200 bg-emerald-50/80 shadow-sm'
          : 'bg-white hover:border-sea hover:bg-sea hover:cursor-pointer'
      }`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-1 rounded-r-full bg-emerald-500 transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />

      <div className="flex min-w-0 items-center gap-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${isActive ? 'ring-1 ring-emerald-200' : 'group-hover:ring-1 group-hover:ring-emerald-100'}`}>
            <span className="text-lg font-bold text-emerald-500">{receipt.vendor.charAt(0)}</span>
        </div>

        <div className="min-w-0">
          <h3 className={`truncate text-[17px] font-semibold transition-colors duration-300 ${isActive ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-950'}`}>{receipt.vendor}</h3>
          <p className="text-xs  text-slate-400">{receipt.date}</p>
          <span className={`mt-3 px-5 inline-flex items-center rounded-full py-1 text-xs font-medium transition-colors duration-300
            ${receipt.status === "completed"
              ? "bg-castleton/10 text-castleton"
              : receipt.status === "processing"
              ? "bg-paper text-white"
              : "bg-saffaron/10 text-saffaron"
            }`}>
            <span
              className={`mr-2 h-2 w-2 rounded-full ${
                receipt.status === "completed"
                  ? "bg-castleton"
                  : receipt.status === "processing"
                  ? "bg-paper"
                  : "bg-saffaron"
              }`}
            />
            {
              receipt.status === "completed"
                ? "Completed"
                : receipt.status === "processing"
                ? "Processing"
                : "For Review"
            }
          </span>
        </div>
      </div>

      <div className={`shrink-0 text-lg font-semibold tracking-tight transition-colors duration-300 ${isActive ? 'text-emerald-950' : 'text-emerald-900 group-hover:text-emerald-950'}`}>
          <span className={`h-2 w-2 rounded-full bg-castleton mr-2`} />
      </div>
    </button>
  )
}



