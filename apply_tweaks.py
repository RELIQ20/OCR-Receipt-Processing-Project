import os

path = r"C:\Users\R3liq\code\lifewood_project\client\ocr-front\pages\DashboardScheme.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Image preview
code = code.replace(
    'className="w-full max-h-80 rounded-xl border object-contain"',
    'className="w-full rounded-xl border object-contain"'
)

# 2. Remove Dashboard yellow indicator
code = code.replace(
    '{!isCollapsed && view === "dashboard" && <div className="w-2.5 h-2.5 rounded-full bg-[#dca842] shrink-0" />}',
    ''
)

# 3. Remove Records yellow indicator
code = code.replace(
    '{!isCollapsed && view.startsWith("inbox") && <div className="w-2.5 h-2.5 rounded-full bg-[#dca842] shrink-0" />}',
    ''
)

# 4. Update sidebar subcategories
old_subcats = """                <button 
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
                </button>"""

new_subcats = """                <button 
                  onClick={() => setView("inbox-processing")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                  style={view === "inbox-processing" ? { color: '#ffffff', background: 'rgba(255,255,255,0.1)' } : { color: '#88a698' }}
                >
                  <Hourglass size={14} /> Processing
                </button>
                <button 
                  onClick={() => setView("inbox-completed")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                  style={view === "inbox-completed" ? { color: '#ffffff', background: 'rgba(255,255,255,0.1)' } : { color: '#88a698' }}
                >
                  <CheckCircle2 size={14} /> Completed
                </button>"""

code = code.replace(old_subcats, new_subcats)

# 5. Update filter logic
old_filter = """        if (filterStatus === "completed") return status === "confirmed";
        return status !== "confirmed"; // processing/pending/missing"""
new_filter = """        if (filterStatus === "completed") return status === "confirmed";
        return status === "processing" || status === "pending"; // pending included for older records"""
code = code.replace(old_filter, new_filter)

# 6. Header update for ReceiptInboxView
old_inbox = """            {view.startsWith("inbox") ? (
              <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col">
                {/* Inbox specific mobile header just in case */}
                <div className="absolute top-4 left-6 z-10 flex items-center gap-3 md:hidden">
                  <h1 className="font-bold text-lg text-white drop-shadow-md">Receipt Inbox</h1>
                </div>
                <ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} query={query} setQuery={setQuery} filterStatus={view === "inbox-completed" ? "completed" : "processing"} />
              </motion.div>
            ) : ("""

new_inbox = """            {view.startsWith("inbox") ? (
              <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col pt-8 pb-5">
                {/* PAGE TITLE & NOTIFICATION BELL */}
                <div className="px-8 mb-6 flex justify-between items-start shrink-0">
                  <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-1" style={{ color: t.accent }}>
                      {view === "inbox-completed" ? "Completed Records" : "Processing Records"}
                    </h1>
                  </div>
                  
                  <NotificationBell
                    t={t}
                    notifications={notifications}
                    onMarkRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))}
                    onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                    onOpenReceipt={openReceipt}
                    iconColor={t.greenDeep}
                    bg={t.surface}
                  />
                </div>
                <div className="px-8 flex-1 min-h-0 flex">
                  <ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} query={query} setQuery={setQuery} filterStatus={view === "inbox-completed" ? "completed" : "processing"} />
                </div>
              </motion.div>
            ) : ("""

code = code.replace(old_inbox, new_inbox)

# 7. Remove p-5 from ReceiptInboxView wrapper
code = code.replace(
    '<div className="relative flex flex-1 overflow-hidden gap-5 p-5" style={{ background: t.pageBg }}>',
    '<div className="relative flex flex-1 overflow-hidden gap-5" style={{ background: "transparent" }}>'
)

# 8. Add padding to cards
old_cards = '''<div className="flex-1 flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-sm border" style={{ background: '#f3f0e0', borderColor: t.border }}>'''
new_cards = '''<div className="flex-1 flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-sm border p-4 lg:p-6 gap-6" style={{ background: '#f3f0e0', borderColor: t.border }}>'''
code = code.replace(old_cards, new_cards)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("Update complete")
