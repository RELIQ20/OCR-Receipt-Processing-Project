const fs = require('fs');
let code = fs.readFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', 'utf-8');

const startStr = 'function ReceiptInboxView({';
const endStr = '/* ============================================================================';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr, startIndex + 10);

const replacement = `function ReceiptInboxView({
  t,
  receipts,
  focusId,
  onDelete,
  onStatusChange,
  onSaveEdit,
  query,
  setQuery,
}: {
  t: ThemeTokens;
  receipts: ReceiptMessage[];
  focusId: string | null;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onSaveEdit: (id: string, updates: Partial<ReceiptMessage>) => void;
  query: string;
  setQuery: (q: string) => void;
}) {
  const [listOpen, setListOpen] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(receipts[0]?.id ?? null);
  const [draft, setDraft] = useState<ReceiptMessage | null>(null);

  useEffect(() => {
    if (focusId) setSelectedId(focusId);
  }, [focusId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return receipts
      .filter((m) => (filter === "all" ? true : m.status.trim().toLowerCase() === filter))
      .filter((m) => (q ? [m.sender_name, m.status, ...m.receipts.map((r) => r.merchant_name)].join(" ").toLowerCase().includes(q) : true));
  }, [receipts, filter, query]);

  const selected = receipts.find((m) => m.id === selectedId) ?? filtered[0] ?? null;
  const isEditing = draft !== null;
  const isDirty = isEditing && JSON.stringify(draft) !== JSON.stringify(selected);

  const startEdit = () => {
    if (selected) setDraft(JSON.parse(JSON.stringify(selected)));
  };

  const cancelEdit = () => {
    setDraft(null);
  };

  const saveEdit = () => {
    if (draft) {
      onSaveEdit(draft.id, draft);
      setDraft(null);
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

  const counts: Record<string, number> = { all: receipts.length };
  STATUS_FILTERS.slice(1).forEach((f) => {
    counts[f.key] = receipts.filter((m) => m.status.trim().toLowerCase() === f.key).length;
  });

  return (
    <div className="relative flex flex-1 overflow-hidden gap-5 p-5" style={{ background: \`linear-gradient(160deg, \${t.barBg} 0%, \${t.greenDeep} 100%)\` }}>
      {/* LIST */}
      <div
        className="flex-shrink-0 flex flex-col rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          background: t.surface,
          width: listOpen ? 380 : 0,
          opacity: listOpen ? 1 : 0,
          marginRight: listOpen ? 0 : -20,
          pointerEvents: listOpen ? "auto" : "none",
        }}
      >
        <div className="p-4 border-b shrink-0 flex flex-col gap-3" style={{ borderColor: t.border }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm" style={{ color: t.text }}>Processing Records</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: \`\${t.accent}1a\`, color: t.accent }}>
              {filtered.length} total
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFilter("all")}
              className="text-[11px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              style={{ background: filter === "all" ? t.green : t.surfaceAlt, color: filter === "all" ? "#fff" : t.textMuted }}
            >
              All
            </button>
            {STATUS_FILTERS.slice(1).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-[11px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                style={{ background: filter === f.key ? t.green : t.surfaceAlt, color: filter === f.key ? "#fff" : t.textMuted }}
              >
                {f.label} <span className="opacity-60 ml-1">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6" style={{ color: t.textMuted }}>
              <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center" style={{ background: t.surfaceAlt }}>
                <InboxIcon size={18} opacity={0.5} />
              </div>
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
                  className="w-full flex flex-col p-4 border-b text-left transition-colors relative"
                  style={{
                    background: active ? t.surfaceAlt : "transparent",
                    borderColor: t.border,
                  }}
                >
                  {active && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: t.accent }} />}
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-bold text-[13px] truncate pr-2" style={{ color: t.text }}>
                      {m.sender_name}
                    </span>
                    <span className="text-[10px] whitespace-nowrap opacity-80" style={{ color: t.textMuted }}>
                      {dateOnly(m.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-xs font-bold" style={{ color: t.text }}>
                      {formatAmount(m.grand_total, m.receipts[0]?.currency)}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style={{ color: meta.tone, background: \`\${meta.tone}1a\` }}>
                      <meta.icon size={9} className={meta.spin ? "animate-spin" : meta.pulse ? "animate-pulse" : ""} />
                      {meta.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* DETAILS PANEL */}
      <div className="flex-1 flex flex-col rounded-2xl shadow-xl overflow-hidden transition-all duration-300 relative" style={{ background: t.surface }}>
        <div className="h-14 border-b flex items-center px-4 shrink-0 transition-colors justify-between" style={{ borderColor: t.border }}>
          <button onClick={() => setListOpen(!listOpen)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80" style={{ background: t.surfaceAlt }}>
            <LayoutDashboard size={14} color={t.text} />
          </button>
          <button onClick={() => window.alert('Export all CSV not implemented')} className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-all shadow-sm" style={{ background: t.green }}>
            <FileDown size={14} />
            Export All Receipts
          </button>
        </div>

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ color: t.textMuted }}>
            <InboxIcon size={48} opacity={0.2} className="mb-4" />
            <p className="text-lg font-semibold" style={{ color: t.text }}>
              No record selected
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
                <div className="mt-1.5 flex gap-2">
                  <StatusBadge status={selected.status} t={t} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isEditing ? (
                  <>
                    {selected.status !== 'Confirmed' && (
                      <button onClick={() => onStatusChange(selected.id, 'Confirmed')} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-sm transition-all" style={{ background: t.green }}>
                         <Check size={14} />
                         Mark as Complete
                      </button>
                    )}
                    {selected.excel_link && (
                      <a href={selected.excel_link} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: t.surfaceAlt }} title="Open Spreadsheet">
                        <ExternalLink size={15} color={t.text} />
                      </a>
                    )}
                    <button onClick={startEdit} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: t.surfaceAlt }} title="Edit receipt values">
                      <Pencil size={15} color={t.text} />
                    </button>
                    <button onClick={() => onDelete(selected.id)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: \`\${t.danger}1a\` }} title="Delete this submission">
                      <Trash2 size={15} color={t.danger} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={saveEdit} className="flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-bold text-white shadow-sm transition-all" style={{ background: t.green }}>
                      <Check size={16} />
                      Save changes
                    </button>
                    <button onClick={cancelEdit} className="flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-bold text-white shadow-sm transition-all" style={{ background: t.danger }}>
                      <X size={16} />
                      {isDirty ? 'Discard changes' : 'Cancel'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {(isEditing ? draft : selected)!.receipts.map((r, rIndex) => (
                <div key={rIndex} className="rounded-xl p-4 space-y-2" style={{ background: t.surfaceAlt }}>
                  <div className="flex items-center justify-between">
                    {isEditing ? (
                      <input 
                        value={r.merchant_name} 
                        onChange={(e) => updateDraftReceipt(rIndex, "merchant_name", e.target.value)} 
                        className="font-semibold text-sm rounded-lg px-2 py-1 outline-none border" 
                        style={{ background: t.surface, color: t.text, borderColor: t.border }} 
                      />
                    ) : (
                      <p className="font-semibold text-sm" style={{ color: t.text }}>
                        {r.merchant_name}
                      </p>
                    )}
                    <span className="font-mono text-sm font-semibold" style={{ color: t.text }}>
                      {formatAmount(r.total_amount, r.currency)}
                    </span>
                  </div>
                  <div className="text-[11px]" style={{ color: t.textMuted }}>
                    {isEditing ? (
                      <div className="flex gap-2 mt-2">
                        <input type="date" value={r.date} onChange={(e) => updateDraftReceipt(rIndex, "date", e.target.value)} className="rounded-lg px-2 py-1 outline-none border" style={{ background: t.surface, color: t.text, borderColor: t.border }} />
                        <input type="time" value={r.time ?? ''} onChange={(e) => updateDraftReceipt(rIndex, "time", e.target.value)} className="rounded-lg px-2 py-1 outline-none border" style={{ background: t.surface, color: t.text, borderColor: t.border }} />
                      </div>
                    ) : (
                      <>{dateOnly(r.date)} {r.time ? \`· \${r.time}\` : ""}</>
                    )}
                  </div>
                  
                  {r.items.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {r.items.map((it, ii) => (
                        <div key={ii} className="flex items-center justify-between gap-2 text-xs">
                          {isEditing ? (
                            <>
                              <input value={it.description} onChange={(e) => updateDraftItem(rIndex, ii, "description", e.target.value)} className="flex-1 rounded-lg px-2 py-1 outline-none border" style={{ background: t.surface, color: t.text, borderColor: t.border }} />
                              <input type="number" value={it.price} onChange={(e) => updateDraftItem(rIndex, ii, "price", parseFloat(e.target.value))} className="w-24 rounded-lg px-2 py-1 font-mono outline-none border text-right" style={{ background: t.surface, color: t.text, borderColor: t.border }} />
                              <button onClick={() => removeDraftItem(rIndex, ii)}><Trash2 size={12} color={t.danger}/></button>
                            </>
                          ) : (
                            <>
                              <span style={{ color: t.text, opacity: 0.85 }}>{it.description}</span>
                              <span className="font-mono" style={{ color: t.textMuted }}>
                                {formatAmount(it.price, r.currency)}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {isEditing && (
                    <button onClick={() => addDraftItem(rIndex)} className="text-xs font-semibold mt-2 flex items-center gap-1" style={{ color: t.accent }}><Plus size={12}/> Add line item</button>
                  )}
                  {r.drive_link && <ReceiptPhotoPreview link={r.drive_link} merchant={r.merchant_name} t={t} />}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-lg font-bold pt-4 border-t" style={{ borderColor: t.border, color: t.text }}>
              <span>Grand Total</span>
              <span className="font-mono">{formatAmount((isEditing ? draft : selected)!.grand_total, (isEditing ? draft : selected)!.receipts[0]?.currency)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

`;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
fs.writeFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', code);
console.log('Successfully rewrote ReceiptInboxView');
