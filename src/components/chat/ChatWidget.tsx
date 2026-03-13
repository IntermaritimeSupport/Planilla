import { useEffect, useRef, useState } from "react";
import { Bot, Minimize2, Send, X, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCompany } from "../../context/routerContext";
import { apiPost } from "../../services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatWidget: React.FC = () => {
  const { t } = useTranslation();
  const { selectedCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("chat_welcome") },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, open, minimized]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const data = await apiPost<{ message: string; usage?: { total_tokens: number } }>(
        "/api/chat",
        { messages: updated, companyId: selectedCompany?.id }
      );
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      if (data.usage) setTokensUsed((prev) => prev + data.usage!.total_tokens);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, ocurrió un error. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const tokenPct = Math.min((tokensUsed / 500000) * 100, 100);
  const tokenColor = tokensUsed > 400000 ? "#f87171" : tokensUsed > 200000 ? "#fbbf24" : "#34d399";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4">

      {/* ── Chat panel ─────────────────────────────────────────────── */}
      {open && (
        <div
          className={`flex flex-col overflow-hidden transition-all duration-500 ease-out ${
            minimized ? "h-14 w-80" : "h-[620px] w-[440px] sm:w-[500px]"
          }`}
          style={{
            borderRadius: minimized ? "18px" : "24px",
            background: "linear-gradient(160deg, #0f172a 0%, #0d1f35 60%, #0a1628 100%)",
            border: "1px solid rgba(99,179,237,0.15)",
            boxShadow:
              "0 0 0 1px rgba(99,179,237,0.08), 0 8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(20,184,166,0.08)",
          }}
        >
          {/* Glow top bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "15%",
              right: "15%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(99,179,237,0.5), transparent)",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 cursor-pointer select-none"
            style={{
              background: "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(56,189,248,0.06) 100%)",
              borderBottom: minimized ? "none" : "1px solid rgba(99,179,237,0.1)",
            }}
            onClick={() => minimized && setMinimized(false)}
          >
            <div className="flex items-center gap-3">
              {/* AI orb */}
              <div
                className="relative flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
                  boxShadow: "0 0 16px rgba(20,184,166,0.5)",
                }}
              >
                <Bot size={15} className="text-white" />
                {/* Pulse ring */}
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    background: "rgba(20,184,166,0.25)",
                    animationDuration: "2.5s",
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">{t("chat_title")}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(99,179,237,0.7)" }}>
                  {loading ? "Procesando..." : "En línea"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized((v) => !v); }}
                className="p-1.5 rounded-lg transition-all hover:scale-110"
                style={{
                  color: "rgba(148,163,184,0.7)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <Minimize2 size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="p-1.5 rounded-lg transition-all hover:scale-110"
                style={{
                  color: "rgba(148,163,184,0.7)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(99,179,237,0.15) transparent",
                }}
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5"
                        style={{
                          background: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
                          boxShadow: "0 0 10px rgba(20,184,166,0.35)",
                        }}
                      >
                        <Bot size={11} className="text-white" />
                      </div>
                    )}
                    <div
                      className="max-w-[78%] text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        padding: "10px 14px",
                        borderRadius:
                          msg.role === "user"
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                        background:
                          msg.role === "user"
                            ? "linear-gradient(135deg, #0ea5e9, #14b8a6)"
                            : "rgba(255,255,255,0.05)",
                        border:
                          msg.role === "user"
                            ? "none"
                            : "1px solid rgba(99,179,237,0.12)",
                        color: msg.role === "user" ? "#fff" : "rgba(226,232,240,0.92)",
                        boxShadow:
                          msg.role === "user"
                            ? "0 4px 20px rgba(14,165,233,0.25)"
                            : "none",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* Loading dots */}
                {loading && (
                  <div className="flex items-end gap-2 justify-start">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
                        boxShadow: "0 0 10px rgba(20,184,166,0.35)",
                      }}
                    >
                      <Bot size={11} className="text-white" />
                    </div>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "18px 18px 18px 4px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(99,179,237,0.12)",
                      }}
                    >
                      <span className="flex gap-1.5 items-center">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="block w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{
                              background: "#14b8a6",
                              animationDelay: `${delay}ms`,
                              boxShadow: "0 0 6px rgba(20,184,166,0.6)",
                            }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Token bar */}
              {tokensUsed > 0 && (
                <div className="flex-shrink-0 px-4 pb-1">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: "10px", color: "rgba(100,116,139,0.8)" }}>
                      <Zap size={9} className="inline mr-0.5 mb-0.5" />
                      Tokens sesión
                    </span>
                    <span style={{ fontSize: "10px", color: tokenColor }}>
                      {tokensUsed.toLocaleString()} / 500,000
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: "2px", background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${tokenPct}%`,
                        background: `linear-gradient(90deg, #14b8a6, ${tokenColor})`,
                        boxShadow: `0 0 6px ${tokenColor}`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Input area */}
              <div
                className="flex-shrink-0 px-3 pb-3 pt-2"
                style={{ borderTop: "1px solid rgba(99,179,237,0.08)" }}
              >
                <div
                  className="flex items-end gap-2 rounded-2xl px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(99,179,237,0.15)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                  }}
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("chat_placeholder")}
                    className="flex-1 resize-none bg-transparent text-sm outline-none max-h-24"
                    style={{
                      color: "rgba(226,232,240,0.9)",
                      caretColor: "#14b8a6",
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="flex-shrink-0 p-2 rounded-xl transition-all duration-200"
                    style={
                      input.trim() && !loading
                        ? {
                            background: "linear-gradient(135deg, #0ea5e9, #14b8a6)",
                            boxShadow: "0 0 16px rgba(20,184,166,0.4)",
                            transform: "scale(1)",
                            color: "#fff",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(100,116,139,0.5)",
                            cursor: "not-allowed",
                          }
                    }
                  >
                    <Send size={15} />
                  </button>
                </div>
                <p className="text-center mt-1.5" style={{ fontSize: "9px", color: "rgba(71,85,105,0.6)" }}>
                  FlowPlanilla AI · Powered by Groq
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FAB button ──────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen((v) => !v); setMinimized(false); }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95"
        style={{
          background: open
            ? "rgba(15,23,42,0.9)"
            : "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)",
          border: "1px solid rgba(99,179,237,0.25)",
          boxShadow: open
            ? "0 4px 20px rgba(0,0,0,0.4)"
            : "0 0 0 0 rgba(20,184,166,0.4), 0 8px 30px rgba(14,165,233,0.4)",
        }}
        title={t("chat_title")}
      >
        {/* Outer pulse when closed */}
        {!open && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: "rgba(20,184,166,0.2)",
              animationDuration: "2s",
            }}
          />
        )}
        {open ? (
          <X size={22} style={{ color: "rgba(148,163,184,0.8)" }} />
        ) : (
          <Bot size={24} className="text-white" />
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
