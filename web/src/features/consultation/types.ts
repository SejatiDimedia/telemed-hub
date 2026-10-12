export type ConsultationStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Consultation {
  id: string;
  appointment_id: string;
  status: ConsultationStatus;
  notes: string;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface ConsultationParticipant {
  user_id: string;
  name: string;
  role: "doctor" | "patient" | string;
  profile_picture_url?: string | null;
  specialty?: string | null;
  gender?: string | null;
  blood_type?: string | null;
  date_of_birth?: string | null;
}

export interface ConsultationMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "doctor" | "patient" | string;
  message: string;
  attachment_url?: string | null;
  created_at: string;
}

export interface ConsultationRoom {
  consultation_id: string;
  appointment_id: string;
  status: ConsultationStatus;
  notes?: string | null;
  doctor: ConsultationParticipant;
  patient: ConsultationParticipant;
  messages: ConsultationMessage[];
}

export interface SendMessagePayload {
  message: string;
  attachment_url?: string;
}

export interface WSSignalingMessage {
  type:
    | "webrtc_offer"
    | "webrtc_answer"
    | "webrtc_ice_candidate"
    | "chat_message"
    | "peer_joined"
    | "peer_left"
    | "media_state"
    | "session_ended";
  payload: any;
}

export interface CreateReviewPayload {
  rating: number;
  comment: string;
}

export interface ConsultationReview {
  id: string;
  doctor_id: string;
  patient_id: string;
  consultation_id: string;
  patient_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

