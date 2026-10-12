import { useEffect, useRef, useState } from "react";
import { Avatar } from "../../../components/ui/Avatar";
import type { ConsultationParticipant } from "../types";

export interface VideoCallAreaProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isPeerConnected: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  mediaError: string | null;
  peerParticipant: ConsultationParticipant;
  myParticipant: ConsultationParticipant;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  isDoctor: boolean;
  isCompleted?: boolean;
}

export function VideoCallArea({
  localStream,
  remoteStream,
  isPeerConnected,
  isMicOn,
  isCameraOn,
  isScreenSharing,
  mediaError,
  peerParticipant,
  myParticipant,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  isDoctor,
  isCompleted = false,
}: VideoCallAreaProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Call duration counter (only runs during active connected call)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPeerConnected && !isCompleted) {
      timer = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPeerConnected, isCompleted]);

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream && !isCompleted) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isCompleted]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && !isCompleted) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, isCompleted]);

  return (
    <section
      aria-label="Area Panggilan Video"
      className="relative flex-1 bg-[#0a111a] rounded-2xl overflow-hidden flex flex-col justify-between shadow-level-2 min-h-[380px] md:min-h-[460px] select-none border border-slate-800/80"
    >
      {/* Top Overlay Bar */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Remote participant tag */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-white shadow-md">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isCompleted
                ? "bg-slate-400"
                : isPeerConnected
                  ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-amber-400"
            }`}
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-tight tracking-tight">
              {peerParticipant.name}
            </span>
            <span className="text-[10px] text-slate-300 font-medium leading-none">
              {peerParticipant.role === "doctor"
                ? peerParticipant.specialty ?? "Dokter Konsultan"
                : "Pasien"}
            </span>
          </div>
        </div>

        {/* Security & Call duration pills */}
        <div className="pointer-events-auto flex items-center gap-2">
          {!isCompleted && isPeerConnected && (
            <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-white text-xs font-semibold tabular-nums shadow-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>{formatDuration(callDurationSeconds)}</span>
            </div>
          )}

          <div
            title="Sesi dilindungi protokol enkripsi WebRTC standar medis."
            className="hidden sm:flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-slate-300 text-[11px] font-medium shadow-md"
          >
            <span className="material-symbols-outlined text-[15px] text-emerald-400">
              lock
            </span>
            <span>{isCompleted ? "Arsip Selesai" : "P2P Enkripsi"}</span>
          </div>
        </div>
      </div>

      {/* Main Video Viewport / Stage */}
      <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden p-6">
        {isCompleted ? (
          /* Concluded Session Archive Stage */
          <div className="flex flex-col items-center justify-center text-center text-slate-200 max-w-md mx-auto my-auto">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full p-1 ring-4 ring-emerald-500/30 ring-offset-4 ring-offset-[#0a111a] flex items-center justify-center bg-slate-900 overflow-hidden shadow-xl">
                <Avatar
                  src={peerParticipant.profile_picture_url ?? undefined}
                  name={peerParticipant.name}
                  size="2xl"
                  className="w-full h-full rounded-full"
                />
              </div>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              {peerParticipant.name}
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {peerParticipant.role === "doctor"
                ? peerParticipant.specialty ?? "Dokter Konsultan"
                : "Pasien Terverifikasi"}
            </p>

            <div className="mt-4 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-left text-xs text-slate-300 space-y-2 shadow-lg w-full">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="material-symbols-outlined text-[20px]">
                  task_alt
                </span>
                <span>Sesi Konsultasi Telah Selesai</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Panggilan video tatap muka telah ditutup dan disimpan ke arsip medis. Anda dapat meninjau riwayat obrolan pesan serta catatan diagnosis dan resep obat pada panel di sebelah kanan.
              </p>
            </div>
          </div>
        ) : remoteStream && isPeerConnected ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            aria-label={`Siaran video ${peerParticipant.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Medical Waiting Stage */
          <div className="flex flex-col items-center justify-center text-center text-slate-200 max-w-md mx-auto my-auto">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full p-1 ring-4 ring-primary/30 ring-offset-4 ring-offset-[#0a111a] flex items-center justify-center bg-slate-900 overflow-hidden shadow-xl">
                <Avatar
                  src={peerParticipant.profile_picture_url ?? undefined}
                  name={peerParticipant.name}
                  size="2xl"
                  className="w-full h-full rounded-full"
                />
              </div>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              {peerParticipant.name}
            </h3>
            <p className="text-xs text-primary-fixed-dim font-medium mt-0.5">
              {peerParticipant.role === "doctor"
                ? peerParticipant.specialty ?? "Dokter Konsultan"
                : "Pasien Terverifikasi"}
            </p>

            <div className="mt-4 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-left text-xs text-slate-300 space-y-1.5 shadow-lg w-full">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  info
                </span>
                <span>
                  {isPeerConnected ? "Menghubungkan sinyal..." : "Menunggu Rekan Bergabung"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {peerParticipant.role === "doctor"
                  ? "Dokter sedang bersiap membuka ruang konsultasi. Video akan terhubung secara otomatis begitu dokter masuk."
                  : "Pasien belum memasuki ruang tatap muka. Anda dapat menunggu atau mengirimkan pesan chat terlebih dahulu."}
              </p>
            </div>
          </div>
        )}

        {/* Local Picture-in-Picture (PiP) Mirror (only if call is active) */}
        {!isCompleted && (
          <div className="absolute bottom-20 right-4 z-20 w-36 sm:w-44 aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/80">
            {localStream && isCameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                aria-label="Kamera lokal Anda"
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-400 bg-slate-900">
                <Avatar
                  src={myParticipant.profile_picture_url ?? undefined}
                  name={myParticipant.name}
                  size="sm"
                  className="mb-1"
                />
                <span className="text-[10px] font-semibold text-slate-300">Kamera Nonaktif</span>
              </div>
            )}

            <div className="absolute bottom-1.5 left-2 text-[10px] bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-white font-medium flex items-center gap-1.5">
              <span>Anda</span>
              {!isMicOn && (
                <span className="material-symbols-outlined text-[13px] text-red-400" title="Mikrofon Anda Senyap">
                  mic_off
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Permission or Media Error Banner */}
      {!isCompleted && mediaError && (
        <aside
          role="alert"
          className="absolute top-16 left-4 right-4 sm:left-auto sm:right-4 max-w-sm z-30 bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs p-3 rounded-xl flex items-start gap-2.5 shadow-lg backdrop-blur-sm"
        >
          <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">
            warning
          </span>
          <p className="leading-snug">{mediaError}</p>
        </aside>
      )}

      {/* Control Bar Dock */}
      <footer className="relative z-20 p-4 bg-gradient-to-t from-[#0a111a] via-[#0a111a]/90 to-transparent flex items-center justify-center gap-3 sm:gap-4">
        {isCompleted ? (
          <button
            type="button"
            onClick={onEndCall}
            className="px-5 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 border border-slate-700 shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Kembali ke Dashboard</span>
          </button>
        ) : (
          <>
            {/* Toggle Microphone */}
            <button
              type="button"
              onClick={onToggleMic}
              aria-label={isMicOn ? "Nonaktifkan mikrofon" : "Aktifkan mikrofon"}
              title={isMicOn ? "Matikan Mikrofon" : "Nyalakan Mikrofon"}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 shadow-md ${
                isMicOn
                  ? "bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600/50"
                  : "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isMicOn ? "mic" : "mic_off"}
              </span>
            </button>

            {/* Toggle Camera */}
            <button
              type="button"
              onClick={onToggleCamera}
              aria-label={isCameraOn ? "Nonaktifkan kamera" : "Aktifkan kamera"}
              title={isCameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 shadow-md ${
                isCameraOn
                  ? "bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600/50"
                  : "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isCameraOn ? "videocam" : "videocam_off"}
              </span>
            </button>

            {/* Screen Share */}
            <button
              type="button"
              onClick={onToggleScreenShare}
              aria-label={isScreenSharing ? "Hentikan berbagi layar" : "Bagikan layar"}
              title={isScreenSharing ? "Hentikan Berbagi Layar" : "Bagikan Layar"}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 shadow-md ${
                isScreenSharing
                  ? "bg-primary text-white ring-2 ring-primary/50"
                  : "bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600/50"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isScreenSharing ? "stop_screen_share" : "screen_share"}
              </span>
            </button>

            <div className="w-px h-6 bg-slate-700/60 mx-1" aria-hidden="true" />

            {/* End Call / Leave Room Button */}
            <button
              type="button"
              onClick={onEndCall}
              aria-label={isDoctor ? "Selesaikan sesi konsultasi medis" : "Tinggalkan ruang konsultasi"}
              title={isDoctor ? "Selesaikan Sesi Konsultasi" : "Keluar dari Ruangan"}
              className="px-4 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all duration-150 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">call_end</span>
              <span>{isDoctor ? "Selesaikan Sesi" : "Keluar"}</span>
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
