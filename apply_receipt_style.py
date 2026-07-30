import os

path = r"C:\Users\R3liq\code\lifewood_project\client\ocr-front\pages\DashboardScheme.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update resolvePhotoSrcCandidates
old_resolve = """export function resolvePhotoSrcCandidates(driveLink: string): string[] {
  try {
    const url = new URL(driveLink);
    let fileId = "";
    if (url.hostname.includes("drive.google.com")) {
      const match = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) fileId = match[1];
      else fileId = url.searchParams.get("id") || "";
    }
    if (fileId) {
      return [
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000-h1000`, // Increased size
      ];
    }
  } catch (e) {}
  return [driveLink];
}"""

new_resolve = """export function resolvePhotoSrcCandidates(driveLink: string): string[] {
  try {
    const url = new URL(driveLink);
    let fileId = "";
    if (url.hostname.includes("drive.google.com")) {
      const match = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) fileId = match[1];
      else fileId = url.searchParams.get("id") || "";
    }
    if (fileId) {
      return [
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w3000-h3000`, 
      ];
    }
  } catch (e) {}
  return [driveLink];
}"""
code = code.replace(old_resolve, new_resolve)

# 2. Update ReceiptPhotoPreview
old_preview = """function ReceiptPhotoPreview({ link, merchant, t }: { link?: string; merchant: string; t: ThemeTokens }) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);
  if (!link) return null;

  const previewOptions = resolvePhotoSrcCandidates(link);
  const currentSrc = previewOptions[previewIndex];

  return (
    <div className="pt-2 space-y-2">
      <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: t.green }}>
        <ExternalLink size={12} /> View original photo
      </a>
      {!previewFailed && currentSrc && (
        <img
          src={currentSrc}
          alt={`${merchant} receipt`}
          loading="lazy"
          className="w-full rounded-xl border object-contain"
          style={{ borderColor: t.border, background: t.surfaceAlt }}
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
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Preview unavailable. Open the original photo link to view it.
        </p>
      )}
    </div>
  );
}"""

new_preview = """function ReceiptPhotoPreview({ link, merchant, t }: { link?: string; merchant: string; t: ThemeTokens }) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);
  if (!link) return null;

  const previewOptions = resolvePhotoSrcCandidates(link);
  const currentSrc = previewOptions[previewIndex];

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/5 rounded-2xl overflow-hidden min-h-[400px]">
      {!previewFailed && currentSrc && (
        <img
          src={currentSrc}
          alt={`${merchant} receipt`}
          loading="lazy"
          className="w-full h-full object-contain"
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
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <p className="text-sm opacity-50">High quality preview unavailable.</p>
          <a href={link} target="_blank" rel="noreferrer" className="text-xs font-bold underline">Open in Drive</a>
        </div>
      )}
    </div>
  );
}"""
code = code.replace(old_preview, new_preview)

# 3. Mark as Complete Button moved to Header
# The header is inside detail panel
old_header_actions = """              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button onClick={startEdit} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: t.surfaceAlt }} title="Edit receipt values">
                      <Pencil size={16} color={t.text} />
                    </button>
                    <button onClick={() => onDelete(selected.id)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${t.danger}1a` }} title="Delete this submission">
                      <Trash2 size={16} color={t.danger} />
                    </button>
                  </>
                ) : ("""

new_header_actions = """              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    {selected.status !== 'Confirmed' && (
                      <button onClick={() => onStatusChange(selected.id, "Confirmed")} className="flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-sm" style={{ background: '#0a4226', color: '#ffffff' }}>
                        <CheckCircle2 size={16} /> Mark as Complete
                      </button>
                    )}
                    <button onClick={startEdit} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: t.surfaceAlt }} title="Edit receipt values">
                      <Pencil size={16} color={t.text} />
                    </button>
                    <button onClick={() => onDelete(selected.id)} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${t.danger}1a` }} title="Delete this submission">
                      <Trash2 size={16} color={t.danger} />
                    </button>
                  </>
                ) : ("""
code = code.replace(old_header_actions, new_header_actions)


# 4. Update the Paper Container to separate the Receipt data
# And remove the footer entirely.

old_layout = """            {/* Paper Container */}
            <div className="flex-1 rounded-2xl overflow-y-auto flex flex-col p-6 gap-6" style={{ background: '#f3f0e0' }}>
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
                        <>{dateOnly(r.date)} {r.time ? `· ${r.time}` : ""}</>
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
                  <button onClick={() => onStatusChange(selected.id, "Confirmed")} className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-sm" style={{ background: t.accent }}>
                    <CheckCircle2 size={16} /> Mark as Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}"""

new_layout = """            {/* Split Container */}
            <div className="flex-1 rounded-2xl overflow-y-auto flex flex-col gap-6 p-2 lg:p-6" style={{ background: 'transparent' }}>
              {(isEditing ? draft : selected)!.receipts.map((r, rIndex) => (
                <div key={rIndex} className="flex flex-col min-h-0 gap-8 lg:flex-row h-full">
                  
                  {/* Left Column: Image Preview */}
                  <div className="w-full lg:w-1/2 flex items-center justify-center">
                    {r.drive_link ? (
                      <ReceiptPhotoPreview link={r.drive_link} merchant={r.merchant_name} t={t} />
                    ) : (
                      <div className="text-sm opacity-50 flex items-center justify-center h-64 w-full bg-black/5 rounded-2xl">No image provided</div>
                    )}
                  </div>
                  
                  {/* Right Column: Physical Receipt Styled Data */}
                  <div className="w-full lg:w-1/2 flex justify-center py-4">
                    <div 
                      className="w-full max-w-sm flex flex-col bg-white relative p-6 lg:p-8 drop-shadow-xl"
                      style={{ 
                        color: '#2a2a2a',
                        fontFamily: '"Courier New", Courier, monospace',
                        backgroundImage: 'radial-gradient(circle at 10px 0, transparent 10px, white 11px), radial-gradient(circle at 10px 20px, transparent 10px, white 11px)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: 'bottom left, top left',
                        backgroundRepeat: 'repeat-x, repeat-x',
                        borderTop: '15px solid transparent',
                        borderBottom: '15px solid transparent',
                        clipPath: 'polygon(0% 10px, 10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px))'
                      }}
                    >
                      {/* Receipt Zig-Zag edges via pseudo borders trick - implemented using drop-shadow and clip path approximations for simplicity, but let's keep it clean */}
                      <style>{`
                        .receipt-paper {
                           background: #fff;
                           position: relative;
                           box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                        }
                        .receipt-paper::before, .receipt-paper::after {
                           content: "";
                           position: absolute;
                           left: 0;
                           right: 0;
                           height: 12px;
                           background-size: 24px 12px;
                           background-repeat: repeat-x;
                           z-index: 10;
                        }
                        .receipt-paper::before {
                           top: -12px;
                           background-image: linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%);
                        }
                        .receipt-paper::after {
                           bottom: -12px;
                           background-image: linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(-135deg, #fff 25%, transparent 25%);
                        }
                      `}</style>
                      
                      <div className="absolute inset-0 bg-white" style={{ zIndex: 0 }}></div>
                      
                      <div className="relative z-20 flex flex-col h-full">
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

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 font-mono text-sm">
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
                           <div className="text-center mt-8 text-xs text-gray-400">
                             *** THANK YOU ***
                           </div>
                        </div>
                      </div>
                      
                      {/* Real receipt jagged edges */}
                      <div className="absolute top-0 left-0 right-0 h-3" style={{ backgroundSize: '24px 12px', backgroundImage: 'linear-gradient(45deg, transparent 25%, #f8f9fa 25%, #f8f9fa 75%, transparent 75%, transparent), linear-gradient(135deg, transparent 25%, #f8f9fa 25%, #f8f9fa 75%, transparent 75%, transparent)', backgroundPosition: '0 0', marginTop: '-12px' }}></div>
                      <div className="absolute bottom-0 left-0 right-0 h-3" style={{ backgroundSize: '24px 12px', backgroundImage: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa), linear-gradient(135deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa)', backgroundPosition: '0 0', marginBottom: '-12px' }}></div>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}"""
code = code.replace(old_layout, new_layout)


with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("Update complete");
