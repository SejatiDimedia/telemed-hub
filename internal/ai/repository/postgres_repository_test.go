package repository

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/timurdianradhasejati/telemed_hub/internal/ai/model"
)

func setupTestDatabase(t *testing.T) (*pgxpool.Pool, func()) {
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
	)
	require.NoError(t, err)

	connURL, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	var pool *pgxpool.Pool
	var pingErr error
	for i := 0; i < 20; i++ {
		pool, err = pgxpool.New(ctx, connURL)
		if err == nil {
			pingErr = pool.Ping(ctx)
			if pingErr == nil {
				break
			}
			pool.Close()
		} else {
			pingErr = err
		}
		time.Sleep(500 * time.Millisecond)
	}
	require.NoError(t, pingErr, "failed to ping database after retries")

	migrationsPath, err := filepath.Abs(filepath.Join("..", "..", "..", "migrations"))
	require.NoError(t, err)

	m, err := migrate.New("file://"+migrationsPath, connURL)
	require.NoError(t, err)

	err = m.Up()
	if err != nil && err != migrate.ErrNoChange {
		require.NoError(t, err)
	}

	cleanup := func() {
		pool.Close()
		_ = pgContainer.Terminate(ctx)
	}

	return pool, cleanup
}

func seedPatient(t *testing.T, ctx context.Context, db *pgxpool.Pool) (uuid.UUID, uuid.UUID) {
	userID := uuid.New()
	_, err := db.Exec(ctx, `INSERT INTO users (id, email, password_hash, full_name, status) VALUES ($1,$2,$3,$4,$5)`,
		userID, "patient@test.com", "hash", "Alice Wonder", "active")
	require.NoError(t, err)

	patientID := uuid.New()
	_, err = db.Exec(ctx, `INSERT INTO patients (id, user_id, date_of_birth, gender, blood_type) VALUES ($1,$2,$3,$4,$5)`,
		patientID, userID, "1990-01-01", "female", "AB+")
	require.NoError(t, err)

	return userID, patientID
}

func TestPostgresRepository_AIOperations(t *testing.T) {
	db, cleanup := setupTestDatabase(t)
	defer cleanup()

	ctx := context.Background()
	repo := NewPostgresRepository(db)
	_, patientID := seedPatient(t, ctx, db)

	t.Run("Create & Get Active Session", func(t *testing.T) {
		sessionID := uuid.New()
		sess := &model.AISession{
			ID:        sessionID,
			PatientID: patientID,
			Status:    "active",
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}

		err := repo.CreateSession(ctx, sess)
		assert.NoError(t, err)

		active, err := repo.GetActiveSessionByPatientID(ctx, patientID)
		assert.NoError(t, err)
		assert.NotNil(t, active)
		assert.Equal(t, sessionID, active.ID)
		assert.Equal(t, "active", active.Status)

		// Get by ID
		fetched, err := repo.GetSessionByID(ctx, sessionID)
		assert.NoError(t, err)
		assert.Equal(t, sessionID, fetched.ID)
	})

	t.Run("Create Triage Suggestion", func(t *testing.T) {
		active, err := repo.GetActiveSessionByPatientID(ctx, patientID)
		require.NoError(t, err)
		require.NotNil(t, active)

		sugg := &model.AISuggestion{
			ID:                 uuid.New(),
			SessionID:          active.ID,
			InputSummary:       "feeling feverish",
			SuggestedUrgency:   "medium",
			SuggestedSpecialty: "general_practitioner",
			DisclaimerShown:    true,
			CreatedAt:          time.Now().UTC(),
		}

		err = repo.CreateSuggestion(ctx, sugg)
		assert.NoError(t, err)

		suggs, err := repo.GetSuggestionsBySessionID(ctx, active.ID)
		assert.NoError(t, err)
		assert.Len(t, suggs, 1)
		assert.Equal(t, "feeling feverish", suggs[0].InputSummary)
		assert.Equal(t, "medium", suggs[0].SuggestedUrgency)
	})

	t.Run("Close Inactive Sessions", func(t *testing.T) {
		// Close active session using threshold
		threshold := time.Now().Add(1 * time.Hour).UTC() // Future time, so current session is inactive
		rows, err := repo.CloseInactiveSessions(ctx, threshold)
		assert.NoError(t, err)
		assert.Equal(t, int64(1), rows)

		// Active session should be nil now
		active, err := repo.GetActiveSessionByPatientID(ctx, patientID)
		assert.NoError(t, err)
		assert.Nil(t, active)
	})
}
