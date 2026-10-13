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
import { ConsultationReviewModal } from "./ConsultationReviewModal";
import { useMedicalRecords } from "../../medical-records/hooks/use-medical-records";
import { MedicalRecordList } from "../../medical-records/components/MedicalRecordList";
import type { ConsultationMessage } from "../types";

export interface ConsultationRoomViewProps {
  consultationId: string;
}

export function ConsultationRoomView({ consultationId }: ConsultationRoomViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";
  const addToast = useToastStore((state) => state.addToast);

  // Tab state in doctor sidebar ('chat' | 'clinical' | 'records')
  const [activeTab, setActiveTab] = useState<"chat" | "clinical" | "records">("chat");

  // Mobile segmented view ('video' | 'panel')
  const [mobileView, setMobileView] = useState<"video" | "panel">("video");

  const [isEndCallDialogOpen, setIsEndCallDialogOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [sessionEndedByDoctor, setSessionEndedByDoctor] = useState(false);

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

  // Fetch patient medical records for doctor review
  const patientIdForRecords = room?.patient_id || room?.patient?.patient_id;
  const { data: patientRecords, isLoading: isRecordsLoading } = useMedicalRecords({
    patientId: isDoctor && patientIdForRecords ? patientIdForRecords : undefined,
  });

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
        setSessionEndedByDoctor(true);
        setIsReviewModalOpen(true);
        addToast({
          type: "info",
          title: "Sesi Selesai",
          message: "Dokter telah menyelesaikan sesi konsultasi ini. Silakan berikan penilaian untuk dokter.",
        });
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
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3.5 text-center p-6">
        <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-on-surface">Menghubungkan Ruang Konsultasi Medis...</p>
        <p className="text-xs text-on-surface-variant max-w-xs">
          Menginisialisasi sinyal aman WebRTC dan data klinis pasien.
        </p>
      </div>
    );
  }

  if (isError || !room) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-3xl">videocam_off</span>
        </div>
        <h3 className="text-base font-bold text-on-surface">Gagal Membuka Ruang Konsultasi</h3>
        <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
          {error instanceof Error
            ? error.message
            : "Sesi konsultasi tidak ditemukan atau akun Anda tidak memiliki akses ke ruangan ini."}
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
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-7xl mx-auto gap-3 p-2 sm:p-4">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-outline-variant/30 shadow-xs select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEndCallDialogOpen(true)}
            className="p-1.5 -ml-1 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Keluar dari Ruangan"
            aria-label="Kembali ke Dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-on-surface leading-tight">
                Konsultasi Medis Tatap Muka
              </h2>
              <Badge variant={room.status === "completed" ? "info" : "success"}>
                {room.status === "completed" ? "SELESAI" : "SEDANG BERJALAN"}
              </Badge>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
              {isDoctor ? `Pasien: ${room.patient.name}` : `Dokter: ${room.doctor.name}`}
              <span className="mx-1.5 text-outline-variant">•</span>
              Sesi #{room.consultation_id.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile View Toggle */}
          <div className="flex lg:hidden bg-surface-container p-0.5 rounded-xl border border-outline-variant/30 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMobileView("video")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                mobileView === "video"
                  ? "bg-white text-primary shadow-xs"
                  : "text-on-surface-variant"
              }`}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => setMobileView("panel")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                mobileView === "panel"
                  ? "bg-white text-primary shadow-xs"
                  : "text-on-surface-variant"
              }`}
            >
              {isDoctor ? "Panel Medis" : "Chat"}
            </button>
          </div>

          {isDoctor && room.status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEndCallDialogOpen(true)}
              className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 h-8 px-3"
            >
              Selesaikan Sesi
            </Button>
          )}

          {!isDoctor && room.status === "completed" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsReviewModalOpen(true)}
              className="text-xs font-bold h-8 px-3.5 rounded-full flex items-center gap-1.5 shadow-xs"
            >
              <span
                className="material-symbols-outlined text-[16px] text-amber-300"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              Beri / Cek Ulasan
            </Button>
          )}
        </div>
      </header>

      {/* Main Workspace Grid (Video on Left, Panel on Right) */}
      <main className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Left Column: Video Call Stage */}
        <div
          className={`col-span-12 lg:col-span-8 flex flex-col min-h-0 ${
            mobileView === "panel" ? "hidden lg:flex" : "flex"
          }`}
        >
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
            onEndCall={() => {
              if (room.status === "completed") {
                void navigate({ to: isDoctor ? "/doctor" : "/patient/appointments" });
              } else {
                setIsEndCallDialogOpen(true);
              }
            }}
            isDoctor={isDoctor}
            isCompleted={room.status === "completed"}
          />
        </div>

        {/* Right Column: In-room Sidebar (Chat & Clinical Notes) */}
        <div
          className={`col-span-12 lg:col-span-4 flex flex-col min-h-0 ${
            mobileView === "video" ? "hidden lg:flex" : "flex"
          }`}
        >
          {isDoctor ? (
            <div className="flex flex-col h-full bg-white rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
              {/* Doctor Sidebar Tabs */}
              <div className="grid grid-cols-3 p-1 bg-surface-container-low border-b border-outline-variant/20 select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "chat"
                      ? "bg-white text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Pesan Chat
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
                  Rekam & Resep
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("records")}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                    activeTab === "records"
                      ? "bg-white text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span>Riwayat</span>
                  {patientRecords && patientRecords.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                      {patientRecords.length}
                    </span>
                  )}
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
                    isDoctor={true}
                  />
                ) : activeTab === "clinical" ? (
                  <PatientClinicalSummary
                    consultationId={room.consultation_id}
                    patient={room.patient}
                    initialNotes={room.notes}
                  />
                ) : (
                  <div className="p-4 h-full overflow-y-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-1 border-b border-outline-variant/15">
                      <div>
                        <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                          Riwayat Medis Pasien
                        </h4>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Kategori rekam medis & dokter penerbit
                        </p>
                      </div>
                    </div>
                    <MedicalRecordList
                      records={patientRecords}
                      isLoading={isRecordsLoading}
                      maxHeight="max-h-[calc(100vh-270px)]"
                      emptyMessage="Tidak ada rekam medis sebelumnya untuk pasien ini."
                    />
                  </div>
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
              isDoctor={false}
            />
          )}
        </div>
      </main>

      {/* Confirmation Dialog on End Call / Exit */}
      <Dialog
        isOpen={isEndCallDialogOpen}
        onClose={() => setIsEndCallDialogOpen(false)}
        title={isDoctor ? "Selesaikan Konsultasi Medis?" : "Keluar dari Ruangan?"}
      >
        <div className="space-y-4 select-none">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isDoctor
              ? "Menyelesaikan sesi ini akan menutup ruang tatap muka video dan menandai janji temu sebagai selesai. Pasien akan dapat melihat catatan diagnosis serta menebus resep obat yang telah diterbitkan."
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

      {/* Consultation Review & Rating Modal */}
      <ConsultationReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          if (sessionEndedByDoctor) {
            void navigate({ to: "/patient/appointments" });
          }
        }}
        consultationId={canonicalConsultationId}
        doctorName={room?.doctor?.name}
      />
    </div>
  );
}
