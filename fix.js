const fs = require('fs');
let code = fs.readFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', 'utf-8');

// Fix NavPill
code = code.replace(
  '{ key: "inbox", label: "Receipt Inbox", icon: InboxIcon },',
  '{ key: "inbox-processing", label: "Receipt Inbox", icon: InboxIcon },'
);
code = code.replace(
  'const active = view === key;',
  'const active = key.startsWith("inbox") ? view.startsWith("inbox") : view === key;'
);

// Remove unused EditReceiptModal
const modalStart = code.indexOf('function EditReceiptModal({');
if (modalStart !== -1) {
  const modalEnd = code.indexOf('/* ============================================================================', modalStart);
  code = code.substring(0, modalStart) + code.substring(modalEnd);
}

fs.writeFileSync('C:/Users/R3liq/code/lifewood_project/client/ocr-front/pages/DashboardScheme.tsx', code);
console.log('Fixed NavPill and removed modal');
