package dto

type ConsultationParticipant struct {
	UserID            string  `json:"user_id"`
	Name              string  `json:"name"`
	Role              string  `json:"role"`
	ProfilePictureURL *string `json:"profile_picture_url,omitempty"`
	Specialty         *string `json:"specialty,omitempty"`
	Gender            *string `json:"gender,omitempty"`
	BloodType         *string `json:"blood_type,omitempty"`
	DateOfBirth       *string `json:"date_of_birth,omitempty"`
}

type MessageResponse struct {
	ID             string  `json:"id"`
	ConsultationID string  `json:"consultation_id"`
	SenderID       string  `json:"sender_id"`
	SenderName     string  `json:"sender_name"`
	SenderRole     string  `json:"sender_role"`
	Message        string  `json:"message"`
	AttachmentURL  *string `json:"attachment_url,omitempty"`
	CreatedAt      string  `json:"created_at"`
}

type ConsultationRoomResponse struct {
	ConsultationID string                  `json:"consultation_id"`
	AppointmentID  string                  `json:"appointment_id"`
	Status         string                  `json:"status"`
	Notes          *string                 `json:"notes,omitempty"`
	Doctor         ConsultationParticipant `json:"doctor"`
	Patient        ConsultationParticipant `json:"patient"`
	Messages       []MessageResponse       `json:"messages"`
}

type SendMessageRequest struct {
	Message       string  `json:"message"`
	AttachmentURL *string `json:"attachment_url,omitempty"`
}
