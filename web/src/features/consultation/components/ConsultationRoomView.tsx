import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../../context/auth-context";
import {
  useConsultationRoom,
  useSendConsultationMessage,
  useCompleteConsultation,
} from "../hooks/use-consultations";
import { useConsultationWebRTC } from "../hooks/use-consultation-webrtc";
import { VideoCallArea } from "./VideoCallArea";
import { ConsultationChatPanel } from "./ConsultationChatPanel";
import { PatientClinicalSummary } from "./PatientClinicalSummary";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useToastStore } from "../../../stores/toast-store";
import type { ConsultationMessage } from "../types";

export interface ConsultationRoomViewProps {
  consultationId: string;
}

export function ConsultationRoomView({ consultationId }: ConsultationRoomViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";
  const addToast = useToastStore((state) => state.addToast);

  // Active tab on right sidebar (for doctor: 'chat' | 'clinical')
  const [activeTab, setActiveTab] = useState<"chat" | "clinical">("chat");
  const [isEndCallDialogOpen, setIsEndCallDialogOpen] = useState(false);

  // Fetch consultation room data
  const { data: room, isLoading, isError, error } = useConsultationRoom(consultationId);

  // Always use canonical consultation ID from room data once loaded
  const canonicalConsultationId = room?.consultation_id ?? consultationId;

  // Send message mutation
  const { mutateAsync: sendMessage, isPending: isSendingMessage } =
    useSendConsultationMessage(canonicalConsultationId);

  // Complete consultation mutation
  const { mutateAsync: completeConsultation, isPending: isCompleting } =
    useCompleteConsultation();

  // Local state for instant real-time message stream
  const [liveMessages, setLiveMessages] = useState<ConsultationMessage[]>([]);

  const handleIncomingWSMessage = useCallback((msg: ConsultationMessage) => {
    setLiveMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // WebRTC & WebSocket Hook (connected with canonical ID)
  const {
    localStream,
    remoteStream,
    isPeerConnected,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    mediaError,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useConsultationWebRTC({
    consultationId: canonicalConsultationId,
    isDoctor,
    onNewMessage: handleIncomingWSMessage,
    onSessionEnded: () => {
      if (!isDoctor) {
        addToast({
          type: "info",
          title: "Sesi Selesai",
          message: "Dokter telah menyelesaikan sesi konsultasi ini. Anda dialihkan ke halaman janji temu.",
        });
        void navigate({ to: "/patient/appointments" });
      }
    },
  });

  // Combine initial room messages with real-time messages
  const allMessages = useMemo(() => {
    const initial = room?.messages ?? [];
    const merged = [...initial];
    for (const lm of liveMessages) {
      if (!merged.some((m) => m.id === lm.id)) {
        merged.push(lm);
      }
    }
    return merged.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [room?.messages, liveMessages]);

  const handleSendChatMessage = async (text: string) => {
    try {
      // Persist via HTTP REST API (backend will broadcast to all connected WebSocket clients)
      const res = await sendMessage({ message: text });
      setLiveMessages((prev) => {
        if (prev.some((m) => m.id === res.id)) return prev;
        return [...prev, res];
      });
    } catch {
      // Handled
    }
  };

  const handleConfirmEndCall = async () => {
    if (isDoctor) {
      try {
        await completeConsultation(canonicalConsultationId);
        setIsEndCallDialogOpen(false);
        void navigate({ to: "/doctor" });
      } catch (err: any) {
        addToast({
          type: "info",
          title: "Sesi Selesai",
          message: err instanceof Error ? err.message : "Sesi konsultasi medis telah ditutup.",
        });
        setIsEndCallDialogOpen(false);
        void navigate({ to: "/doctor" });
      }
    } else {
      setIsEndCallDialogOpen(false);
      void navigate({ to: "/patient/appointments" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="text-sm font-bold text-on-surface">Memuat Ruang Konsultasi Medis...</p>
      </div>
    );
  }

  if (isError || !room) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-center p-6">
        <span className="material-symbols-outlined text-5xl text-error">
          videocam_off
        </span>
        <h3 className="text-lg font-bold text-on-surface">Gagal Membuka Ruang Konsultasi</h3>
        <p className="text-xs text-on-surface-variant max-w-sm">
          {error instanceof Error
            ? error.message
            : "Anda tidak memiliki otorisasi untuk mengakses sesi konsultasi ini atau ruangan tidak ditemukan."}
        </p>
        <Button
          variant="outline"
          onClick={() => void navigate({ to: isDoctor ? "/doctor" : "/patient/appointments" })}
        >
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const peerParticipant = isDoctor ? room.patient : room.doctor;
  const myParticipant = isDoctor ? room.doctor : room.patient;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto gap-4 p-2 sm:p-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-outline-variant/30 shadow-xs select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEndCallDialogOpen(true)}
            className="p-2 -ml-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Kembali"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-on-surface leading-tight">
                Ruang Konsultasi Medis
              </h2>
              <Badge variant={room.status === "completed" ? "info" : "success"}>
                {room.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-[11px] text-on-surface-variant/80 font-medium mt-0.5">
              {isDoctor ? `Pasien: ${room.patient.name}` : `Dokter: ${room.doctor.name}`} • ID Sesi: {room.consultation_id.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* Doctor Actions / End Call */}
        <div className="flex items-center gap-2.5">
          {isDoctor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEndCallDialogOpen(true)}
              className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
            >
              Selesaikan Konsultasi
            </Button>
          )}
        </div>
      </div>

      {/* Main Workspace Grid (Video on Left, Panel on Right) */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Video Call Area */}
        <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0">
          <VideoCallArea
            localStream={localStream}
            remoteStream={remoteStream}
            isPeerConnected={isPeerConnected}
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            mediaError={mediaError}
            peerParticipant={peerParticipant}
            myParticipant={myParticipant}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onToggleScreenShare={toggleScreenShare}
            onEndCall={() => setIsEndCallDialogOpen(true)}
            isDoctor={isDoctor}
          />
        </div>

        {/* Right Column: In-room Sidebar (Chat & Clinical Notes) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
          {isDoctor ? (
            <div className="flex flex-col h-full bg-white rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
              {/* Doctor Sidebar Tabs */}
              <div className="grid grid-cols-2 p-1.5 bg-surface-container-low border-b border-outline-variant/20 select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "chat"
                      ? "bg-white text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Chat Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("clinical")}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "clinical"
                      ? "bg-white text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Catatan & Resep
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "chat" ? (
                  <ConsultationChatPanel
                    messages={allMessages}
                    currentUserId={user?.id ?? ""}
                    onSendMessage={handleSendChatMessage}
                    isSending={isSendingMessage}
                    peerName={peerParticipant.name}
                  />
                ) : (
                  <PatientClinicalSummary
                    consultationId={room.consultation_id}
                    patient={room.patient}
                    initialNotes={room.notes}
                  />
                )}
              </div>
            </div>
          ) : (
            <ConsultationChatPanel
              messages={allMessages}
              currentUserId={user?.id ?? ""}
              onSendMessage={handleSendChatMessage}
              isSending={isSendingMessage}
              peerName={peerParticipant.name}
            />
          )}
        </div>
      </div>

      {/* Confirmation Dialog on End Call / Exit */}
      <Dialog
        isOpen={isEndCallDialogOpen}
        onClose={() => setIsEndCallDialogOpen(false)}
        title={isDoctor ? "Selesaikan Konsultasi Medis?" : "Keluar dari Ruang Konsultasi?"}
      >
        <div className="space-y-4 select-none">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isDoctor
              ? "Menyelesaikan sesi ini akan menandai konsultasi dan janji temu sebagai Selesai. Pasien akan dapat melihat catatan diagnosis serta menebus resep obat yang telah dibuat."
              : "Apakah Anda yakin ingin meninggalkan ruang konsultasi? Anda dapat masuk kembali ke ruangan selama sesi konsultasi masih berlangsung."}
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEndCallDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isCompleting}
              onClick={handleConfirmEndCall}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCompleting ? "Menyelesaikan..." : isDoctor ? "Ya, Selesaikan Sesi" : "Keluar Ruangan"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
