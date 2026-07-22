export interface AISession {
  id: string;
  patient_id: string;
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
  suggestions?: AISuggestion[];
}

export interface AISuggestion {
  id: string;
  input_summary: string;
  suggested_urgency: 'low' | 'medium' | 'high';
  suggested_specialty: string;
  disclaimer_shown: boolean;
  created_at: string;
}

export interface CreateSessionResponse {
  id: string;
  patient_id: string;
  status: 'active' | 'closed';
  created_at: string;
}

export interface PostMessageRequest {
  message: string;
}

export interface TriageResponse {
  suggested_urgency: 'low' | 'medium' | 'high';
  suggested_specialty: string;
  disclaimer: string;
  session_id: string;
}
