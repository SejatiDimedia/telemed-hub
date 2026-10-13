export type MedicalRecordType = "diagnosis" | "allergy" | "lab_result" | "note";

export interface MedicalRecord {
  id: string;
  patient_id: string;
  consultation_id?: string | null;
  record_type: MedicalRecordType;
  content: string;
  file_id?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  doctor_name?: string | null;
  doctor_specialty?: string | null;
}
