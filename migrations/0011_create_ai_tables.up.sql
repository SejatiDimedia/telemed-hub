CREATE TABLE ai_sessions (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    input_summary TEXT NOT NULL,
    suggested_urgency VARCHAR(20) NOT NULL CHECK (suggested_urgency IN ('low', 'medium', 'high')),
    suggested_specialty VARCHAR(100) NOT NULL,
    disclaimer_shown BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching session status by patient
CREATE INDEX idx_ai_sessions_patient_status ON ai_sessions(patient_id, status);
-- Index for suggestions retrieval
CREATE INDEX idx_ai_suggestions_session_id ON ai_suggestions(session_id);
