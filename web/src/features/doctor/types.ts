export interface Specialty {
  id: string;
  name: string;
  image_icon: string;
  description?: string;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  email: string;
	full_name: string;
	profile_picture_url?: string | null;
	phone_number?: string | null;
	specialty_id?: string | null;
  specialty?: Specialty | null;
  license_number?: string | null;
  is_credential_verified: boolean;
  consultation_fee: number;
  rating?: number;
  total_reviews?: number;
}

export interface Availability {
  id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface DoctorReview {
  id: string;
  doctor_id: string;
  patient_id: string;
  consultation_id: string;
  patient_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_counts: Record<string, number>;
}

export interface DoctorReviewsResponse {
  summary: ReviewSummary;
  reviews: DoctorReview[];
}
