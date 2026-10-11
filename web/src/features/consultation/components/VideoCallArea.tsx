import { useEffect, useRef } from "react";
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
}: VideoCallAreaProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  return (
    <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl min-h-[440px] md:min-h-[520px] select-none border border-slate-800">
      {/* Remote Video Stream / Fallback Hero */}
      <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden">
        {remoteStream && isPeerConnected ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
            <div className="relative mb-4">
              <Avatar
                src={peerParticipant.profile_picture_url ?? undefined}
                name={peerParticipant.name}
                size="lg"
                className="w-24 h-24 text-2xl ring-4 ring-primary/40 ring-offset-4 ring-offset-slate-950"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              {peerParticipant.name}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 max-w-sm">
              {isPeerConnected
                ? "Menghubungkan sinyal video..."
                : `Menunggu ${peerParticipant.role === "doctor" ? "Dokter" : "Pasien"} terhubung ke ruang konsultasi...`}
            </p>
          </div>
        )}

        {/* Remote participant tag overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-white text-xs font-semibold">
          <span
            className={`w-2 h-2 rounded-full ${
              isPeerConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
            }`}
          />
          <span>{peerParticipant.name}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            ({peerParticipant.role === "doctor" ? peerParticipant.specialty ?? "Dokter" : "Pasien"})
          </span>
        </div>

        {/* Local Video Stream (Picture-in-Picture in bottom right) */}
        <div className="absolute bottom-20 right-4 z-20 w-36 h-28 sm:w-48 sm:h-36 bg-slate-900/90 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700/80 group">
          {localStream && isCameraOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
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
              <span className="text-[10px] font-semibold text-slate-400">Kamera Mati</span>
            </div>
          )}

          <div className="absolute bottom-1.5 left-2 text-[10px] bg-slate-950/70 backdrop-blur-sm px-2 py-0.5 rounded text-white font-medium flex items-center gap-1">
            <span>Anda</span>
            {!isMicOn && (
              <span className="material-symbols-outlined text-[12px] text-red-400">
                mic_off
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Media Error Warning Bar */}
      {mediaError && (
        <div className="absolute top-4 right-4 max-w-sm z-30 bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs px-3 py-2 rounded-xl flex items-start gap-2 shadow-lg backdrop-blur-sm">
          <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">
            warning
          </span>
          <p className="leading-snug">{mediaError}</p>
        </div>
      )}

      {/* Bottom Floating Controls Bar */}
      <div className="relative z-20 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex items-center justify-center gap-3 sm:gap-4">
        {/* Toggle Mic */}
        <button
          type="button"
          onClick={onToggleMic}
          title={isMicOn ? "Matikan Mikrofon" : "Nyalakan Mikrofon"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
            isMicOn
              ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600/50"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isMicOn ? "mic" : "mic_off"}
          </span>
        </button>

        {/* Toggle Camera */}
        <button
          type="button"
          onClick={onToggleCamera}
          title={isCameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
            isCameraOn
              ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600/50"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isCameraOn ? "videocam" : "videocam_off"}
          </span>
        </button>

        {/* Screen Share */}
        <button
          type="button"
          onClick={onToggleScreenShare}
          title={isScreenSharing ? "Hentikan Berbagi Layar" : "Bagikan Layar"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
            isScreenSharing
              ? "bg-primary text-white ring-2 ring-primary/50"
              : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600/50"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isScreenSharing ? "stop_screen_share" : "screen_share"}
          </span>
        </button>

        {/* End Call / Finish */}
        <button
          type="button"
          onClick={onEndCall}
          title={isDoctor ? "Selesaikan Sesi Konsultasi" : "Keluar dari Ruangan"}
          className="px-5 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-red-900/30 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[20px]">call_end</span>
          <span>{isDoctor ? "Selesaikan" : "Tinggalkan"}</span>
        </button>
      </div>
    </div>
  );
}
