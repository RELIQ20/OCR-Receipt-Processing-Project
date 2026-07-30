const fs = require('fs');
let code = fs.readFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', 'utf-8');

// 1. Update View type
code = code.replace('type View = "dashboard" | "inbox";', 'type View = "dashboard" | "inbox-processing" | "inbox-completed";');

// 2. Change Dashboard view references
code = code.replace(/view === "inbox"/g, 'view.startsWith("inbox")');
code = code.replace(/setView\("inbox"\)/g, 'setView("inbox-processing")');

// 3. Update the sidebar navigation for Records to have subcategories
const sidebarStart = code.indexOf('<nav className="flex-1 space-y-2 px-3 mt-2">');
const sidebarEndStr = '</nav>';
const sidebarEnd = code.indexOf(sidebarEndStr, sidebarStart) + sidebarEndStr.length;

const newSidebar = `<nav className="flex-1 space-y-2 px-3 mt-2">
          <button 
            onClick={() => setView("dashboard")}
            className={\`w-full flex items-center transition-all duration-300 rounded-xl \${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}\`} 
            style={view === "dashboard" ? { background: '#0a4226', color: '#ffffff' } : { background: 'transparent', color: '#e2e8f0' }}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={20} className="shrink-0" />
              {!isCollapsed && <span className="text-[15px] font-bold tracking-wide">Dashboard</span>}
            </div>
            {!isCollapsed && view === "dashboard" && <div className="w-2.5 h-2.5 rounded-full bg-[#dca842] shrink-0" />}
          </button>
          
          <div className="flex flex-col">
            <button 
              onClick={() => setView(view.startsWith("inbox") ? "dashboard" : "inbox-processing")} 
              className={\`w-full flex items-center justify-between transition-all duration-300 rounded-xl \${isCollapsed ? 'justify-center p-3 relative' : 'px-4 py-3'}\`} 
              style={view.startsWith("inbox") ? { background: '#0a4226', color: '#ffffff' } : { background: 'transparent', color: '#e2e8f0' }}
              title={isCollapsed ? "Records" : undefined}
            >
              <div className="flex items-center gap-3">
                <InboxIcon size={20} className="shrink-0" />
                {!isCollapsed && <span className="text-[15px] font-bold tracking-wide">Records</span>}
              </div>
              {!isCollapsed && view.startsWith("inbox") && <div className="w-2.5 h-2.5 rounded-full bg-[#dca842] shrink-0" />}
              {isCollapsed && openInboxCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#dca842]" />
              )}
            </button>
            
            {!isCollapsed && view.startsWith("inbox") && (
              <div className="flex flex-col gap-1 mt-2 pl-4 border-l-2 ml-6" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <button 
                  onClick={() => setView("inbox-processing")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
                  style={view === "inbox-processing" ? { color: '#ffffff', background: 'rgba(255,255,255,0.1)' } : { color: '#88a698' }}
                >
                  Processing / Pending
                </button>
                <button 
                  onClick={() => setView("inbox-completed")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
                  style={view === "inbox-completed" ? { color: '#ffffff', background: 'rgba(255,255,255,0.1)' } : { color: '#88a698' }}
                >
                  Completed
                </button>
              </div>
            )}
          </div>
        </nav>`;

code = code.substring(0, sidebarStart) + newSidebar + code.substring(sidebarEnd);


// 4. Modify ReceiptInboxView to use the new view filter
// ReceiptInboxView will now accept \`filterStatus\` as a prop ("processing" | "completed") instead of query string only.
code = code.replace(
  '<ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} query={query} setQuery={setQuery} />',
  '<ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} query={query} setQuery={setQuery} filterStatus={view === "inbox-completed" ? "completed" : "processing"} />'
);

const receiptInboxStart = code.indexOf('function ReceiptInboxView({');
const receiptInboxEnd = code.indexOf('/* ============================================================================', receiptInboxStart);

const newReceiptInbox = `function ReceiptInboxView({
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return receipts
      .filter((m) => {
        const status = m.status.trim().toLowerCase();
        if (filterStatus === "completed") return status === "confirmed";
        return status !== "confirmed"; // processing/pending/missing
      })
      .filter((m) => (q ? [m.sender_name, m.status, ...m.receipts.map((r) => r.merchant_name)].join(" ").toLowerCase().includes(q) : true));
  }, [receipts, filterStatus, query]);

  const selected = receipts.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

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

  return (
    <div className="relative flex flex-1 overflow-hidden gap-5 p-5" style={{ background: t.pageBg }}>
      {/* LIST */}
      <div
        className="flex-shrink-0 flex flex-col rounded-[24px] shadow-sm overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          background: t.surface,
          width: listOpen ? 340 : 0,
          opacity: listOpen ? 1 : 0,
          marginRight: listOpen ? 0 : -20,
          pointerEvents: listOpen ? "auto" : "none",
        }}
      >
        <div className="p-5 border-b shrink-0 flex flex-col gap-4" style={{ borderColor: t.border }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setListOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80" style={{ background: \`\${t.accent}1a\`, color: t.accent }}>
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

      {/* DETAIL */}
      <div className="flex-1 rounded-[24px] shadow-sm overflow-hidden flex flex-col" style={{ background: t.surface }}>
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm" style={{ color: t.textMuted }}>
              Select a receipt to view details.
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm" style={{ color: t.textMuted }}>
                  {dateTime(selected.createdAt)} · via {selected.source}
                </p>
                <h2 className="text-3xl font-bold mt-1" style={{ color: t.text }}>
                  {selected.sender_name}
                </h2>
                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={selected.status} t={t} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button onClick={startEdit} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: t.surfaceAlt }} title="Edit receipt values">
                      <Pencil size={16} color={t.text} />
                    </button>
                    <button onClick={() => onDelete(selected.id)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: \`\${t.danger}1a\` }} title="Delete this submission">
                      <Trash2 size={16} color={t.danger} />
                    </button>
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

            {/* Paper Container */}
            <div className="flex-1 rounded-2xl overflow-y-auto flex flex-col p-6" style={{ background: '#f3f0e0' }}>
              {(isEditing ? draft : selected)!.receipts.map((r, rIndex) => (
                <div key={rIndex} className="flex flex-col h-full gap-6 lg:flex-row">
                  {/* Left Column: Image Preview */}
                  <div className="w-full lg:w-1/2 rounded-xl overflow-hidden shadow-sm flex items-center justify-center" style={{ background: '#eae7d7' }}>
                    {r.drive_link ? (
                      <ReceiptPhotoPreview link={r.drive_link} merchant={r.merchant_name} t={t} />
                    ) : (
                      <div className="text-sm opacity-50 flex items-center justify-center h-64">No image provided</div>
                    )}
                  </div>
                  
                  {/* Right Column: Receipt Data */}
                  <div className="w-full lg:w-1/2 flex flex-col space-y-4">
                    <div className="flex items-start justify-between">
                      {isEditing ? (
                        <input 
                          value={r.merchant_name} 
                          onChange={(e) => updateDraftReceipt(rIndex, "merchant_name", e.target.value)} 
                          className="font-bold text-lg rounded-lg px-2 py-1 outline-none border bg-white" 
                          style={{ color: t.text, borderColor: '#dcd9cc' }} 
                        />
                      ) : (
                        <h3 className="font-bold text-lg uppercase" style={{ color: t.text }}>
                          {r.merchant_name}
                        </h3>
                      )}
                      <span className="font-mono text-sm font-bold" style={{ color: t.text }}>
                        {formatAmount(r.total_amount, r.currency)}
                      </span>
                    </div>
                    
                    <div className="text-xs" style={{ color: '#5a6e61' }}>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input type="date" value={r.date} onChange={(e) => updateDraftReceipt(rIndex, "date", e.target.value)} className="rounded-lg px-2 py-1 outline-none border bg-white" style={{ color: t.text, borderColor: '#dcd9cc' }} />
                          <input type="time" value={r.time ?? ''} onChange={(e) => updateDraftReceipt(rIndex, "time", e.target.value)} className="rounded-lg px-2 py-1 outline-none border bg-white" style={{ color: t.text, borderColor: '#dcd9cc' }} />
                        </div>
                      ) : (
                        <>{dateOnly(r.date)} {r.time ? \`· \${r.time}\` : ""}</>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4">
                      {r.items.length > 0 && r.items.map((it, ii) => (
                        <div key={ii} className="flex items-start justify-between gap-3 text-sm">
                          {isEditing ? (
                            <>
                              <input value={it.description} onChange={(e) => updateDraftItem(rIndex, ii, "description", e.target.value)} className="flex-1 rounded-lg px-2 py-1 outline-none border bg-white text-xs" style={{ color: t.text, borderColor: '#dcd9cc' }} />
                              <input type="number" value={it.price} onChange={(e) => updateDraftItem(rIndex, ii, "price", parseFloat(e.target.value))} className="w-24 rounded-lg px-2 py-1 font-mono outline-none border bg-white text-right text-xs" style={{ color: t.text, borderColor: '#dcd9cc' }} />
                              <button onClick={() => removeDraftItem(rIndex, ii)}><Trash2 size={14} color={t.danger}/></button>
                            </>
                          ) : (
                            <>
                              <span className="uppercase" style={{ color: '#324a3c', opacity: 0.9 }}>{it.description}</span>
                              <span className="font-mono" style={{ color: '#324a3c' }}>
                                {formatAmount(it.price, r.currency)}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                      {isEditing && (
                        <button onClick={() => addDraftItem(rIndex)} className="text-xs font-semibold mt-4 flex items-center gap-1" style={{ color: t.green }}><Plus size={14}/> Add line item</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-6 shrink-0">
              <div className="flex items-center justify-between text-base font-bold mb-6" style={{ color: t.text }}>
                <span>Grand Total</span>
                <span className="font-mono text-lg">{formatAmount((isEditing ? draft : selected)!.grand_total, (isEditing ? draft : selected)!.receipts[0]?.currency)}</span>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => exportMessageCsv(selected)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-sm" style={{ background: t.green }}>
                  <FileDown size={16} />
                  Export CSV
                </button>
                {selected.excel_link && (
                  <a
                    href={selected.excel_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-sm"
                    style={{ background: t.surfaceAlt, color: t.text }}
                  >
                    <ExternalLink size={16} />
                    Open spreadsheet
                  </a>
                )}
                {!isEditing && selected.status !== 'Confirmed' && (
                  <button onClick={() => onStatusChange(selected.id, 'Confirmed')} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-sm transition-all" style={{ background: t.accent }}>
                    <Check size={16} />
                    Mark as Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

code = code.substring(0, receiptInboxStart) + newReceiptInbox + code.substring(receiptInboxEnd);

fs.writeFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', code);
console.log('Successfully applied rewrite script');
