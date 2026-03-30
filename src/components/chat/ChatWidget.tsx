import { useEffect, useRef, useState } from "react";
import { Bot, X } from "lucide-react";

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

  // 🔴 CONTROL GLOBAL DEL CHAT
  const chatEnabled = false;

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
    if (!text || loading || !chatEnabled) return;

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
  // @ts-ignore
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!chatEnabled) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  // @ts-ignore
  const tokenPct = Math.min((tokensUsed / 500000) * 100, 100);
  // @ts-ignore
  const tokenColor =
    tokensUsed > 400000 ? "#f87171" : tokensUsed > 200000 ? "#fbbf24" : "#34d399";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4">

      {/* ── Chat panel ─────────────────────────────────────────────── */}
      {open && chatEnabled && (
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
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 select-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(56,189,248,0.06) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="relative flex items-center justify-center w-8 h-8 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
                }}
              >
                <Bot size={15} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-white">{t("chat_title")}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB button (DESHABILITADO) ─────────────────────────────── */}
      <button
        onClick={() => {
          if (!chatEnabled) return;
          setOpen((v) => !v);
          setMinimized(false);
        }}
        disabled={!chatEnabled}
        className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95"
        style={{
          opacity: chatEnabled ? 1 : 0.5,
          cursor: chatEnabled ? "pointer" : "not-allowed",
          background: open
            ? "rgba(15,23,42,0.9)"
            : "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)",
          border: "1px solid rgba(99,179,237,0.25)",
        }}
        title={chatEnabled ? t("chat_title") : "Próximamente"}
      >
        {!open ? (
          <Bot size={24} className="text-white" />
        ) : (
          <X size={22} style={{ color: "rgba(148,163,184,0.8)" }} />
        )}
      </button>
    </div>
  );
};

export default ChatWidget;