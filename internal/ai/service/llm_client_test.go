package service

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
)

func TestGeminiLLMClient_CircuitBreakerAndFallback(t *testing.T) {
	cfg := &config.Config{
		LLM: config.LLMConfig{
			APIKey: "", // triggers local rules fallback
			APIURL: "http://invalid-url-for-test",
		},
	}
	log := slog.New(slog.DiscardHandler)
	client := NewGeminiLLMClient(cfg, log)

	t.Run("Local Heuristic Triage: High Urgency", func(t *testing.T) {
		res, err := client.Triage(context.Background(), "I am experiencing severe chest pain and short of breath")
		assert.NoError(t, err)
		assert.Equal(t, "high", res.SuggestedUrgency)
		assert.Equal(t, "cardiologist", res.SuggestedSpecialty)
	})

	t.Run("Local Heuristic Triage: Pediatric", func(t *testing.T) {
		res, err := client.Triage(context.Background(), "my baby has a mild fever")
		assert.NoError(t, err)
		assert.Equal(t, "medium", res.SuggestedUrgency)
		assert.Equal(t, "pediatrician", res.SuggestedSpecialty)
	})

	t.Run("Local Heuristic Triage: Skin", func(t *testing.T) {
		res, err := client.Triage(context.Background(), "I have a red rash on my arm")
		assert.NoError(t, err)
		assert.Equal(t, "low", res.SuggestedUrgency)
		assert.Equal(t, "dermatologist", res.SuggestedSpecialty)
	})

	t.Run("Circuit Breaker State Transition: Closed -> Open -> Half-Open", func(t *testing.T) {
		// Enable API client execution path (key is set)
		cfg.LLM.APIKey = "fake-key"
		client.state = StateClosed
		client.failures = 0

		// Trigger 3 consecutive failures to open the circuit
		for i := 0; i < 3; i++ {
			client.recordFailure()
		}

		assert.Equal(t, StateOpen, client.state)
		assert.False(t, client.allowRequest(), "should not allow requests when Open")

		// Force cooldown period elapsed by backdating the state change time
		client.lastStateChange = time.Now().Add(-31 * time.Second)
		assert.True(t, client.allowRequest(), "should allow requests in Half-Open state")
		assert.Equal(t, StateHalfOpen, client.state)

		// Record a success to close the circuit
		client.recordSuccess()
		assert.Equal(t, StateClosed, client.state)
		assert.Equal(t, 0, client.failures)
	})
}
