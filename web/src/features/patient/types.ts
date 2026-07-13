export interface PatientProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
}

export interface UpdatePatientRequest {
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  phone_number?: string;
}
