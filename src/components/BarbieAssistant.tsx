import { useState, useEffect, useRef } from "react";

export function BarbieAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [messages, setMessages] = useState<{ from: "barbie" | "user"; text: string; time: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { from: "user" as const, text: input.trim(), time: "now" };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { from: "barbie", text: data.reply || "Sorry, I didn't get that. Try asking about coins, payments, or Poppo/Vone!", time: "now" }]);
    } catch {
      setMessages((m) => [...m, { from: "barbie", text: "Oops! Something went wrong. Try again or WhatsApp us directly! 💬", time: "now" }]);
    }
    setIsTyping(false);
  };

  return (
    <>
      {/* Floating Avatar */}
      <div className="fixed bottom-[5.5rem] left-4 z-50 md:bottom-6 md:left-6">
        {/* Static glow */}
        <span className="absolute inset-[-6px] rounded-full bg-gradient-to-br from-primary via-pink-400 to-gold opacity-40 blur-[8px]" />

        {/* Avatar */}
        <button
          onClick={() => { setIsOpen((v) => !v); setShowBubble(false); }}
          className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 shadow-[0_0_25px_oklch(0.72_0.25_350/0.3)] transition-all duration-300 hover:scale-110 hover:shadow-[0_0_40px_oklch(0.72_0.25_350/0.5)] active:scale-95 md:h-16 md:w-16"
          aria-label="Chat with Barbie"
        >
          <img src="/barbie-avatar.jpg" alt="Barbie" className="h-full w-full object-cover" />
        </button>

        {/* Notification bubble */}
        {showBubble && !isOpen && (
          <div className="absolute -top-1 -right-1 flex h-7 items-center gap-1 rounded-full bg-gold px-2 text-[11px] font-bold text-black shadow-lg">
            Hi! 💬
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-[8rem] left-4 z-50 w-[calc(100vw-2rem)] max-w-sm origin-bottom-left animate-scale-in md:bottom-24 md:left-6">
          <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/95 shadow-[0_20px_60px_-15px_oklch(0.72_0.25_350/0.3)] backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary/20 via-pink-500/10 to-gold/10 px-4 py-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-primary/30">
                <img src="/barbie-avatar.jpg" alt="Barbie" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Barbie Assistant</div>
                <div className="flex items-center gap-1 text-[11px] text-green-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  Online — Ask me anything!
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex h-72 flex-col overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <ChatMessage from="barbie" text="Hi! 💖 I'm Barbie, your Barbieverse assistant. Ask me anything about coins, payments, or Poppo/Vone!" time="now" />
              )}
              {messages.map((m, i) => (
                <ChatMessage key={i} from={m.from} text={m.text} time={m.time} />
              ))}
              {isTyping && <TypingIndicator />}
            </div>

            {/* Quick chips */}
            {messages.length < 3 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {["How to recharge?", "Find my Poppo ID", "Payment methods", "Order status"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] text-primary transition-colors hover:bg-primary/15"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border/40 bg-secondary/30 px-3 py-2.5">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-border/60 bg-input/50 px-4 py-2 text-sm focus:border-primary focus:outline-none focus-glow"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-pink text-white transition-all hover:scale-105 hover:shadow-[0_0_20px_oklch(0.72_0.25_350/0.4)] disabled:opacity-40"
                >
                  <SendIcon className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChatMessage({ from, text, time }: { from: "barbie" | "user"; text: string; time: string }) {
  const isBarbie = from === "barbie";
  return (
    <div className={`mb-3 flex ${isBarbie ? "justify-start" : "justify-end"}`}>
      {isBarbie && (
        <div className="mr-2 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-primary/30">
          <img src="/barbie-avatar.jpg" alt="Barbie" className="h-full w-full object-cover" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isBarbie
            ? "rounded-tl-md bg-secondary/60 text-foreground"
            : "rounded-tr-md bg-gradient-pink text-primary-foreground"
        }`}
      >
        {text}
        <div className={`mt-1 text-[10px] ${isBarbie ? "text-muted-foreground" : "text-white/60"}`}>{time}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-3 flex justify-start">
      <div className="mr-2 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-primary/30">
        <img src="/barbie-avatar.jpg" alt="Barbie" className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-secondary/60 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}
