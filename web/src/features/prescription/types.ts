export interface PrescriptionItem {
  medicine_id: string;
  dosage: string;
  quantity: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  issued_at: string;
  status: "active" | "fulfilled" | "expired";
  items?: PrescriptionItem[];
}

export interface CreatePrescriptionRequest {
  consultation_id: string;
  items: PrescriptionItem[];
}
