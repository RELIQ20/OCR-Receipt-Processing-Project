import { ArrowRight } from "lucide-react";

interface HomepageProps {
  onLogin: () => void;
}

export default function Homepage({ onLogin }: HomepageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#081510] text-white p-6">
      <div className="max-w-2xl w-full rounded-[28px] border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.4em] text-[#8ED8B5]">LifeReceipt</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">Smarter receipt tracking for every purchase.</h1>
          <p className="mt-4 text-sm leading-7 text-[#D6E5DA]">
            Mock homepage experience: connect your account, review receipt data, and access the dashboard with a single click.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_240px] items-center">
          <div className="space-y-3 text-[#E3F1E6]">
            <p className="text-sm">
              The dashboard is designed to keep your spending totals visible and receipts organized from WhatsApp, email, or mobile uploads.
            </p>
            <ul className="space-y-2 text-sm text-[#BEE4C6]">
              <li>• Review recent receipts in one place</li>
              <li>• Search by merchant, sender, date, or status</li>
              <li>• Log out securely when you’re done</li>
            </ul>
          </div>

          <button
            onClick={onLogin}
            className="inline-flex items-center justify-center gap-2 rounded-3xl bg-[#8ED8B5] px-6 py-3 text-sm font-semibold text-[#042618] transition hover:bg-[#76c599]"
          >
            Login / Sign up
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
