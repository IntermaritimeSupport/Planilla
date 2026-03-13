import { useEffect, useRef, useState } from "react";
import { Bot, Minimize2, Send, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/themeContext";
import { useCompany } from "../../context/routerContext";
import { apiPost } from "../../services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatWidget: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
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

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className={`flex flex-col rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 ${
            minimized ? "h-12 w-80" : "h-[600px] w-[420px] sm:w-[480px]"
          } ${
            isDarkMode
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 flex-shrink-0 ${
              isDarkMode
                ? "bg-slate-800 border-b border-slate-700"
                : "bg-teal-600 border-b border-teal-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-teal-400" />
              <span className="text-sm font-semibold text-white">
                {t("chat_title")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((v) => !v)}
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div
                        className={`w-6 h-6 rounded-full flex-shrink-0 mr-2 flex items-center justify-center text-xs ${
                          isDarkMode
                            ? "bg-teal-500/20 text-teal-400"
                            : "bg-teal-100 text-teal-600"
                        }`}
                      >
                        <Bot size={13} />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? isDarkMode
                            ? "bg-teal-600 text-white rounded-br-sm"
                            : "bg-teal-600 text-white rounded-br-sm"
                          : isDarkMode
                          ? "bg-slate-800 text-slate-200 rounded-bl-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div
                      className={`w-6 h-6 rounded-full flex-shrink-0 mr-2 flex items-center justify-center ${
                        isDarkMode ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-600"
                      }`}
                    >
                      <Bot size={13} />
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl rounded-bl-sm text-sm ${
                        isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <span className="flex gap-1">
                        <span className="animate-bounce [animation-delay:0ms]">·</span>
                        <span className="animate-bounce [animation-delay:150ms]">·</span>
                        <span className="animate-bounce [animation-delay:300ms]">·</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Token counter */}
              {tokensUsed > 0 && (
                <div className={`flex-shrink-0 px-4 py-1 flex items-center justify-end gap-1.5 text-xs ${
                  isDarkMode ? "text-slate-500" : "text-gray-400"
                }`}>
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      tokensUsed > 400000 ? "bg-red-400" : tokensUsed > 200000 ? "bg-yellow-400" : "bg-green-400"
                    }`}
                  />
                  {tokensUsed.toLocaleString()} / 500,000 tokens diarios
                </div>
              )}

              {/* Input */}
              <div
                className={`flex-shrink-0 border-t px-3 py-2 flex items-end gap-2 ${
                  isDarkMode ? "border-slate-700" : "border-gray-200"
                }`}
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("chat_placeholder")}
                  className={`flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none max-h-24 ${
                    isDarkMode
                      ? "bg-slate-800 text-slate-200 placeholder-slate-500 border border-slate-700 focus:border-teal-500"
                      : "bg-gray-100 text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-teal-400"
                  }`}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
                    input.trim() && !loading
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : isDarkMode
                      ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          setMinimized(false);
        }}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
          open
            ? isDarkMode
              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            : "bg-teal-600 text-white hover:bg-teal-700"
        }`}
        title={t("chat_title")}
      >
        {open ? <X size={20} /> : <Bot size={20} />}
      </button>
    </div>
  );
};

export default ChatWidget;
