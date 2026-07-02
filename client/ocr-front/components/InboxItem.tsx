interface InboxItemProps {
  name?: string
  avatar?: string
  date?: string
  status?: string
  isSelected?: boolean
  isRead?: boolean
  onClick?: () => void
}

export default function InboxItem({
  name = 'Zelestaire',
  avatar,
  date = '2026-07-01 · 09:23',
  status = 'Processing',
  isSelected = false,
  isRead = false,
  onClick,
}: InboxItemProps) {

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center justify-between gap-4 overflow-hidden px-4 py-4 text-left transition-all duration-300 ${
        isSelected
          ? 'border-emerald-200 bg-emerald-50/80 shadow-sm'
          : 'bg-white hover:border-sea hover:bg-castleton/5 hover:cursor-pointer'
      }`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-1 rounded-r-full bg-emerald-500 transition-opacity duration-300 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />

      <div className="flex min-w-0 items-center gap-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${isSelected ? 'ring-1 ring-emerald-200' : 'group-hover:ring-1 group-hover:ring-emerald-100'}`}>
          {avatar ? (
            <img src={avatar} alt={name} className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <span className="text-lg font-bold text-emerald-500">{name.charAt(0)}</span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className={`truncate text-[17px] font-semibold transition-colors duration-300 ${isSelected ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-950'}`}>{name}</h3>
          <p className="text-xs  text-slate-400">{date}</p>
          <span className={`mt-3 border border-castleton px-5 inline-flex items-center rounded-full py-1 text-xs font-medium transition-colors duration-300 ${isSelected ? 'shadow-sm' : ''}`}>
            <span className={`h-2 w-2 rounded-full bg-castleton mr-2`} />
            {status}
          </span>
        </div>
      </div>

      <div className={`shrink-0 text-lg font-semibold tracking-tight transition-colors duration-300 ${isSelected ? 'text-emerald-950' : 'text-emerald-900 group-hover:text-emerald-950'}`}>
          <span className={`h-2 w-2 rounded-full bg-castleton mr-2`} />
      </div>
    </button>
  )
}
