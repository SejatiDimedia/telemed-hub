import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "../../../lib/api-client";
import type { ConsultationMessage, WSSignalingMessage } from "../types";

export interface UseConsultationWebRTCOptions {
  consultationId: string;
  onNewMessage?: (msg: ConsultationMessage) => void;
}

export function useConsultationWebRTC({
  consultationId,
  onNewMessage,
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
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

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

  // Initialize or get RTCPeerConnection
  const getOrCreatePeerConnection = useCallback(
    (stream: MediaStream | null) => {
      if (pcRef.current) {
        return pcRef.current;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
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

      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      pcRef.current = pc;
      return pc;
    },
    [sendSignaling]
  );

  // Initialize local media stream
  useEffect(() => {
    let active = true;

    async function setupLocalMedia() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setMediaError("Perangkat Anda tidak mendukung akses media video/audio.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setLocalStream(stream);
        setMediaError(null);
      } catch (err: any) {
        console.warn("Could not access camera/mic:", err);
        setMediaError(
          "Kamera/Mikrofon tidak dapat diakses atau izin ditolak. Mode chat tetap aktif."
        );
      }
    }

    void setupLocalMedia();

    return () => {
      active = false;
    };
  }, []);

  // Connect WebSocket & Wire Signaling
  useEffect(() => {
    if (!consultationId) return;

    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnectedWS(true);
    };

    ws.onclose = () => {
      setIsConnectedWS(false);
      setIsPeerConnected(false);
    };

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err);
      setIsConnectedWS(false);
    };

    ws.onmessage = async (event) => {
      try {
        const data: WSSignalingMessage = JSON.parse(event.data);

        switch (data.type) {
          case "peer_joined": {
            // Another peer joined, create an offer as the caller
            const pc = getOrCreatePeerConnection(localStream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignaling("webrtc_offer", offer);
            break;
          }

          case "webrtc_offer": {
            // Received an offer, set remote and answer
            const pc = getOrCreatePeerConnection(localStream);
            await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignaling("webrtc_answer", answer);
            break;
          }

          case "webrtc_answer": {
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription(data.payload)
              );
            }
            break;
          }

          case "webrtc_ice_candidate": {
            if (pcRef.current && data.payload) {
              try {
                await pcRef.current.addIceCandidate(
                  new RTCIceCandidate(data.payload)
                );
              } catch (e) {
                console.warn("Error adding ICE candidate:", e);
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

          default:
            break;
        }
      } catch (e) {
        console.error("Error processing ws signaling message:", e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [consultationId, getWsUrl, getOrCreatePeerConnection, localStream, sendSignaling]);

  // Clean up streams & peer connection on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [localStream]);

  // Toggle Microphone
  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      const nextState = !isMicOn;
      audioTracks.forEach((track) => {
        track.enabled = nextState;
      });
      setIsMicOn(nextState);
    }
  }, [localStream, isMicOn]);

  // Toggle Camera
  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      const nextState = !isCameraOn;
      videoTracks.forEach((track) => {
        track.enabled = nextState;
      });
      setIsCameraOn(nextState);
    }
  }, [localStream, isCameraOn]);

  // Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Revert back to camera track
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (pcRef.current && localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
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
  }, [isScreenSharing, localStream]);

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
  };
}
