import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "../../../lib/api-client";
import type { ConsultationMessage, WSSignalingMessage } from "../types";

export interface UseConsultationWebRTCOptions {
  consultationId: string;
  isDoctor?: boolean;
  onNewMessage?: (msg: ConsultationMessage) => void;
  onSessionEnded?: () => void;
}

export function useConsultationWebRTC({
  consultationId,
  isDoctor = false,
  onNewMessage,
  onSessionEnded,
}: UseConsultationWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [isConnectedWS, setIsConnectedWS] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;
  const onSessionEndedRef = useRef(onSessionEnded);
  onSessionEndedRef.current = onSessionEnded;

  const isDoctorRef = useRef(isDoctor);
  isDoctorRef.current = isDoctor;

  const getWsUrl = useCallback(() => {
    const token = getAccessToken();
    const isHttps = window.location.protocol === "https:";
    const wsProto = isHttps ? "wss:" : "ws:";
    // If dev server on 5173, backend is on 8080
    const host =
      window.location.port === "5173"
        ? `${window.location.hostname}:8080`
        : window.location.host;
    return `${wsProto}//${host}/api/v1/consultations/${consultationId}/ws?token=${encodeURIComponent(
      token ?? ""
    )}`;
  }, [consultationId]);

  // Send signaling message
  const sendSignaling = useCallback((type: WSSignalingMessage["type"], payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // Flush queued ICE candidates after remote description is set
  const flushCandidateQueue = useCallback(async (pc: RTCPeerConnection) => {
    const queue = candidateQueueRef.current;
    candidateQueueRef.current = [];
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Error adding queued ICE candidate:", err);
      }
    }
  }, []);

  // Create or return active RTCPeerConnection
  const getOrCreatePeerConnection = useCallback(() => {
    if (pcRef.current && pcRef.current.signalingState !== "closed") {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignaling("webrtc_ice_candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setIsPeerConnected(true);
      } else if (event.track) {
        setRemoteStream((prev) => {
          if (prev) {
            prev.addTrack(event.track);
            return prev;
          }
          return new MediaStream([event.track]);
        });
        setIsPeerConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setIsPeerConnected(true);
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setIsPeerConnected(false);
      }
    };

    // Add local tracks if stream is already acquired
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pcRef.current = pc;
    return pc;
  }, [sendSignaling]);

  // Request user camera and microphone
  useEffect(() => {
    let isCancelled = false;

    async function initMedia() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setMediaError("Perangkat Anda tidak mendukung akses media video/audio.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setMediaError(null);

        // If peer connection was already created, add tracks now
        if (pcRef.current && pcRef.current.signalingState !== "closed") {
          const currentSenders = pcRef.current.getSenders();
          let added = false;
          stream.getTracks().forEach((track) => {
            const hasSender = currentSenders.some((s) => s.track?.kind === track.kind);
            if (!hasSender) {
              pcRef.current?.addTrack(track, stream);
              added = true;
            }
          });
          if (added && isDoctorRef.current && pcRef.current.signalingState === "stable") {
            try {
              const offer = await pcRef.current.createOffer();
              await pcRef.current.setLocalDescription(offer);
              sendSignaling("webrtc_offer", offer);
            } catch (e) {
              console.warn("Failed to create renegotiation offer:", e);
            }
          }
        }
      } catch (err: any) {
        console.warn("Could not access camera/mic:", err);
        setMediaError("Izin kamera/mikrofon belum aktif. Mode chat tetap berjalan normal.");
      }
    }

    void initMedia();

    return () => {
      isCancelled = true;
    };
  }, [sendSignaling]);

  // Connect WebSocket & Manage Signaling (only on consultationId change)
  useEffect(() => {
    if (!consultationId) return;

    let isDisposed = false;
    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isDisposed) {
        setIsConnectedWS(true);
      }
    };

    ws.onclose = () => {
      if (!isDisposed) {
        setIsConnectedWS(false);
        setIsPeerConnected(false);
      }
    };

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err);
    };

    ws.onmessage = async (event) => {
      if (isDisposed) return;

      const raw = typeof event.data === "string" ? event.data : "";
      const lines = raw.split("\n").filter((l) => l.trim().length > 0);

      for (const line of lines) {
        try {
          const data: WSSignalingMessage = JSON.parse(line);

          switch (data.type) {
            case "peer_joined": {
              // A peer joined or is already here.
              // Doctor initiates the WebRTC offer (Caller role)
              const pc = getOrCreatePeerConnection();
              if (localStreamRef.current) {
                const currentSenders = pc.getSenders();
                localStreamRef.current.getTracks().forEach((track) => {
                  const hasSender = currentSenders.some((s) => s.track?.kind === track.kind);
                  if (!hasSender) {
                    pc.addTrack(track, localStreamRef.current!);
                  }
                });
              }
              if (isDoctorRef.current) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignaling("webrtc_offer", offer);
              }
              break;
            }

            case "webrtc_offer": {
              // Patient receives offer, creates answer
              const pc = getOrCreatePeerConnection();
              if (localStreamRef.current) {
                const currentSenders = pc.getSenders();
                localStreamRef.current.getTracks().forEach((track) => {
                  const hasSender = currentSenders.some((s) => s.track?.kind === track.kind);
                  if (!hasSender) {
                    pc.addTrack(track, localStreamRef.current!);
                  }
                });
              }
              await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
              await flushCandidateQueue(pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignaling("webrtc_answer", answer);
              break;
            }

            case "webrtc_answer": {
              // Doctor receives answer
              const pc = getOrCreatePeerConnection();
              if (pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
                await flushCandidateQueue(pc);
              }
              break;
            }

            case "webrtc_ice_candidate": {
              const pc = getOrCreatePeerConnection();
              if (data.payload) {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.payload));
                  } catch (e) {
                    console.warn("Error adding ICE candidate:", e);
                  }
                } else {
                  candidateQueueRef.current.push(data.payload);
                }
              }
              break;
            }

            case "peer_left": {
              setIsPeerConnected(false);
              setRemoteStream(null);
              if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
              }
              break;
            }

            case "chat_message": {
              if (data.payload && onNewMessageRef.current) {
                onNewMessageRef.current(data.payload as ConsultationMessage);
              }
              break;
            }

            case "session_ended": {
              setIsPeerConnected(false);
              setRemoteStream(null);
              if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
              }
              if (onSessionEndedRef.current) {
                onSessionEndedRef.current();
              }
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error("Error processing ws signaling message:", e);
        }
      }
    };

    return () => {
      isDisposed = true;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [consultationId, getWsUrl, getOrCreatePeerConnection, sendSignaling, flushCandidateQueue]);

  // Clean up streams & peer connection on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  // Send In-Room Chat directly via WebSocket
  const sendChatMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      sendSignaling("chat_message", { message: message.trim() });
    },
    [sendSignaling]
  );

  // Toggle Microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextState = !isMicOn;
      audioTracks.forEach((track) => {
        track.enabled = nextState;
      });
      setIsMicOn(nextState);
    }
  }, [isMicOn]);

  // Toggle Camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const nextState = !isCameraOn;
      videoTracks.forEach((track) => {
        track.enabled = nextState;
      });
      setIsCameraOn(nextState);
    }
  }, [isCameraOn]);

  // Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (pcRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) return;
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;
        screenTrackRef.current = screenTrack;

        screenTrack.onended = () => {
          void toggleScreenShare();
        };

        if (pcRef.current) {
          const sender = pcRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
      }
    }
  }, [isScreenSharing]);

  return {
    localStream,
    remoteStream,
    isPeerConnected,
    isConnectedWS,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    mediaError,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage,
  };
}
