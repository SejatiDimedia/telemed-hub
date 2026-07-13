export type ConsultationStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Consultation {
  id: string;
  appointment_id: string;
  status: ConsultationStatus;
  notes: string;
  started_at?: string | null;
  ended_at?: string | null;
}
