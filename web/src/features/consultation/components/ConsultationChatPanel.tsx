import { useState, useRef, useEffect } from "react";
import type { ConsultationMessage } from "../types";

export interface ConsultationChatPanelProps {
  messages: ConsultationMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  peerName: string;
  isDoctor?: boolean;
}

export function ConsultationChatPanel({
  messages,
  currentUserId,
  onSendMessage,
  isSending,
  peerName,
  isDoctor = false,
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

  const handleQuickChipClick = (suggestion: string) => {
    setInputText((prev) => (prev ? `${prev} ${suggestion}` : suggestion));
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

  const quickChips = isDoctor
    ? [
        "Bisa ceritakan riwayat gejalanya?",
        "Apakah ada riwayat alergi obat?",
        "Resep obat sudah saya terbitkan.",
      ]
    : [
        "Baik dokter.",
        "Gejala sudah berlangsung 2 hari.",
        "Apakah ada pantangan makanan?",
      ];

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden select-none">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/40">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px]">
            chat
          </span>
          <div>
            <h4 className="text-xs font-bold text-on-surface leading-tight">
              Pesan Konsultasi
            </h4>
            <p className="text-[11px] text-on-surface-variant font-medium">
              Obrolan langsung dengan {peerName}
            </p>
          </div>
        </div>
        <div
          title="Percakapan dilindungi kerahasiaan rekam medis"
          className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md"
        >
          <span className="material-symbols-outlined text-[14px]">verified_user</span>
          <span>Privat</span>
        </div>
      </div>

      {/* Message List */}
      <div
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
            <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary mb-2">
              <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
            </div>
            <p className="text-xs font-bold text-on-surface">Belum ada pesan</p>
            <p className="text-[11px] text-on-surface-variant mt-1 max-w-[220px] leading-relaxed">
              Kirim pesan teks atau instruksi klinis untuk melengkapi komunikasi tatap muka.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-on-surface-variant font-medium px-1">
                  <span className="font-bold text-on-surface">
                    {isMe ? "Anda" : msg.sender_name}
                  </span>
                  <span>•</span>
                  <span>{formatMessageTime(msg.created_at)}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-medium leading-relaxed break-words shadow-2xs ${
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

      {/* Quick Clinical Chips */}
      <div className="px-3 pt-2 pb-1.5 bg-surface-container-lowest border-t border-outline-variant/10 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider shrink-0 mr-1">
          Cepat:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickChipClick(chip)}
            className="text-[11px] font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center gap-2"
      >
        <label htmlFor="chat_input_text" className="sr-only">
          Tulis pesan konsultasi
        </label>
        <input
          id="chat_input_text"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Tulis pesan untuk ${peerName}...`}
          className="flex-1 bg-surface-container-low/60 border border-outline-variant/40 rounded-xl px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          aria-label="Kirim pesan"
          title="Kirim Pesan"
          className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-2xs"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
}
