const fs = require('fs');
let code = fs.readFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', 'utf-8');

// Replace ReceiptInboxView wrapper
code = code.replace(
  '<div className="relative flex flex-1 overflow-hidden gap-5 p-5" style={{ background: t.pageBg }}>',
  '<div className="relative flex flex-1 overflow-hidden gap-5" style={{ background: "transparent" }}>'
);

// Replace inbox branch
const targetContent = `            {view.startsWith("inbox") ? (
              <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col">
                {/* Inbox specific mobile header just in case */}
                <div className="absolute top-4 left-6 z-10 flex items-center gap-3 md:hidden">
                  <h1 className="font-bold text-lg text-white drop-shadow-md">Receipt Inbox</h1>
                </div>
                <ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} query={query} setQuery={setQuery} filterStatus={view === "inbox-completed" ? "completed" : "processing"} />
              </motion.div>
            ) : (`;

const newContent = `            {view.startsWith("inbox") ? (
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
                  />
                </div>
                <div className="px-8 flex-1 min-h-0 flex">
                  <ReceiptInboxView t={t} receipts={receipts} focusId={focusReceiptId} onDelete={deleteMessage} onStatusChange={changeStatus} onSaveEdit={saveEdit} query={query} setQuery={setQuery} filterStatus={view === "inbox-completed" ? "completed" : "processing"} />
                </div>
              </motion.div>
            ) : (`;

code = code.replace(targetContent, newContent);

fs.writeFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', code);
console.log('Update complete');
