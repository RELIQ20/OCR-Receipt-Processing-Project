"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import type { SpendingContext } from "./spendingContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How much did I spend this week?",
  "Summarize my receipts this month",
  "What's my top spending category?",
];

export function ChatAssistant({
  accent,
  currency = "PHP",
  buildContext,
}: {
  accent: string;
  currency?: string;
  /** called fresh on every send so the assistant always sees current data */
  buildContext: () => SpendingContext;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages, // history prior to this turn
          context: buildContext(),
          currency,
        }),
      });

      if (!res.ok) throw new Error("request_failed");
      const data = await res.json();
      if (data.error) throw new Error(data.details ?? data.error);

      setMessages([...nextHistory, { role: "assistant", content: data.reply ?? "I couldn't come up with an answer for that." }]);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Something went wrong reaching the assistant.";
      setError(message);
      setMessages(nextHistory); // keep the user's message, drop the failed reply
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: accent, color: "#133020" }}
        aria-label={open ? "Close spending assistant" : "Open spending assistant"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            {open ? <X size={18} /> : <MessageCircle size={18} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] rounded-3xl border border-white/10 bg-[#1f1f1f] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 shrink-0">
              <Sparkles size={14} color={accent} />
              <span className="text-xs font-semibold text-white">Spending Assistant</span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-2 pt-4">
                  <p className="text-xs text-white/40 text-center mb-3">Ask about your spending</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs text-white/70 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] text-xs rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-wrap"
                    style={
                      m.role === "user"
                        ? { background: accent, color: "#133020" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)" }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="text-xs rounded-2xl px-3 py-2 bg-white/[0.06] text-white/50">Thinking…</div>
                </div>
              )}

              {error && <p className="text-[11px] text-center" style={{ color: "#C17110" }}>{error}</p>}
            </div>

            <div className="flex items-center gap-2 p-3 border-t border-white/5 shrink-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask about your receipts…"
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-2 text-xs text-white outline-none placeholder:text-white/30"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                style={{ background: accent, color: "#133020" }}
                aria-label="Send message"
              >
                <Send size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatAssistant;
