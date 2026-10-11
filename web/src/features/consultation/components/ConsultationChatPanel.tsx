import { useState, useRef, useEffect } from "react";
import type { ConsultationMessage } from "../types";

export interface ConsultationChatPanelProps {
  messages: ConsultationMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  peerName: string;
}

export function ConsultationChatPanel({
  messages,
  currentUserId,
  onSendMessage,
  isSending,
  peerName,
}: ConsultationChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setInputText("");
    await onSendMessage(trimmed);
  };

  const formatMessageTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden select-none">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/40">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px]">
            chat
          </span>
          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Ruang Chat Interaktif
            </h4>
            <p className="text-[11px] text-on-surface-variant/80 font-medium">
              Terkoneksi langsung dengan {peerName}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          REAL-TIME
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[300px] max-h-[460px] md:max-h-[500px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant/60">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">
              forum
            </span>
            <p className="text-xs font-semibold">Belum ada percakapan</p>
            <p className="text-[11px] mt-0.5 max-w-[200px]">
              Gunakan chat ini untuk mengirim pesan teks, instruksi resep, atau pertanyaan medis.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-on-surface-variant font-medium">
                  <span className="font-bold text-on-surface">
                    {isMe ? "Anda" : msg.sender_name}
                  </span>
                  <span>•</span>
                  <span>{formatMessageTime(msg.created_at)}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-sm break-words ${
                    isMe
                      ? "bg-primary text-white rounded-br-xs"
                      : "bg-surface-container-low text-on-surface border border-outline-variant/30 rounded-bl-xs"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-outline-variant/20 bg-surface-container-lowest flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pesan..."
          className="flex-1 bg-surface-container-low/70 border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
}
