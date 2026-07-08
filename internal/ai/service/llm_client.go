package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/timurdianradhasejati/telemed_hub/internal/ai/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/config"
)

type LLMClient interface {
	Triage(ctx context.Context, anonymizedSymptom string) (*dto.TriageResponse, error)
}

// Circuit Breaker States
type CircuitState int

const (
	StateClosed CircuitState = iota
	StateOpen
	StateHalfOpen
)

type GeminiLLMClient struct {
	cfg *config.Config
	log *slog.Logger
	h   *http.Client

	// Circuit Breaker State
	mu             sync.RWMutex
	state          CircuitState
	failures       int
	lastStateChange time.Time
}

func NewGeminiLLMClient(cfg *config.Config, log *slog.Logger) *GeminiLLMClient {
	return &GeminiLLMClient{
		cfg:             cfg,
		log:             log,
		h:               &http.Client{Timeout: 5 * time.Second}, // Strict 5s timeout
		state:           StateClosed,
		lastStateChange: time.Now(),
	}
}

var _ LLMClient = (*GeminiLLMClient)(nil)

func (c *GeminiLLMClient) Triage(ctx context.Context, anonymizedSymptom string) (*dto.TriageResponse, error) {
	// 1. Check Circuit Breaker State
	if !c.allowRequest() {
		c.log.Warn("circuit breaker is OPEN. Falling back to local rules-based triage engine.")
		return c.localTriageFallback(anonymizedSymptom), nil
	}

	// 2. Fallback to Local Heuristics if API Key is not set
	if c.cfg.LLM.APIKey == "" {
		c.log.Info("LLM API key not set. Using local rules-based triage fallback.")
		return c.localTriageFallback(anonymizedSymptom), nil
	}

	// 3. Make the API Call to Gemini
	resp, err := c.callGeminiAPI(ctx, anonymizedSymptom)
	if err != nil {
		c.log.Error("LLM API call failed", "error", err)
		c.recordFailure()
		return c.localTriageFallback(anonymizedSymptom), nil
	}

	c.recordSuccess()
	return resp, nil
}

// callGeminiAPI sends request to Gemini API and expects structured JSON response
func (c *GeminiLLMClient) callGeminiAPI(ctx context.Context, symptom string) (*dto.TriageResponse, error) {
	// Gemini generateContent body structure
	prompt := fmt.Sprintf(`Analyze the following patient symptom text and classify it into triage suggestion.
Symptom: %s

You MUST return a JSON object with exactly these keys:
{
  "suggested_urgency": "low" | "medium" | "high",
  "suggested_specialty": "general_practitioner" | "pediatrician" | "cardiologist" | "dermatologist" | "pulmonologist" | "dentist" | "emergency_medicine"
}
Output only the raw JSON. Do not include markdown code block formatting.`, symptom)

	// If using the default Google Gemini endpoint, format request accordingly
	var reqBody []byte
	var err error
	if strings.Contains(c.cfg.LLM.APIURL, "generativelanguage.googleapis.com") {
		payload := map[string]any{
			"contents": []map[string]any{
				{
					"parts": []map[string]any{
						{"text": prompt},
					},
				},
			},
			"generationConfig": map[string]any{
				"responseMimeType": "application/json",
			},
		}
		reqBody, err = json.Marshal(payload)
	} else {
		// Generic proxy payload format
		payload := map[string]any{
			"prompt": prompt,
		}
		reqBody, err = json.Marshal(payload)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to marshal Gemini request payload: %w", err)
	}

	apiURL := c.cfg.LLM.APIURL
	if strings.Contains(apiURL, "generativelanguage.googleapis.com") {
		// Append API key query param
		apiURL = fmt.Sprintf("%s?key=%s", apiURL, c.cfg.LLM.APIKey)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.h.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("api returned non-ok status code: %d", resp.StatusCode)
	}

	// Parse response
	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode JSON response: %w", err)
	}

	// Extract generated text from Gemini response structure
	// candidates[0].content.parts[0].text
	var rawText string
	if candidates, ok := result["candidates"].([]any); ok && len(candidates) > 0 {
		if candMap, ok := candidates[0].(map[string]any); ok {
			if content, ok := candMap["content"].(map[string]any); ok {
				if parts, ok := content["parts"].([]any); ok && len(parts) > 0 {
					if partMap, ok := parts[0].(map[string]any); ok {
						rawText, _ = partMap["text"].(string)
					}
				}
			}
		}
	} else {
		// Fallback to direct key if proxy returns direct
		rawText, _ = result["text"].(string)
	}

	if rawText == "" {
		return nil, errors.New("empty text generated from LLM")
	}

	// Clean code block ticks if LLM returned them
	rawText = strings.TrimPrefix(rawText, "```json")
	rawText = strings.TrimPrefix(rawText, "```")
	rawText = strings.TrimSuffix(rawText, "```")
	rawText = strings.TrimSpace(rawText)

	var parsed struct {
		SuggestedUrgency   string `json:"suggested_urgency"`
		SuggestedSpecialty string `json:"suggested_specialty"`
	}
	if err := json.Unmarshal([]byte(rawText), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse structured JSON response from LLM output %q: %w", rawText, err)
	}

	// Validate urgency enum
	urg := strings.ToLower(parsed.SuggestedUrgency)
	if urg != "low" && urg != "medium" && urg != "high" {
		urg = "low"
	}

	spec := strings.ToLower(parsed.SuggestedSpecialty)
	if spec == "" {
		spec = "general_practitioner"
	}

	return &dto.TriageResponse{
		SuggestedUrgency:   urg,
		SuggestedSpecialty: spec,
	}, nil
}

// localTriageFallback implements a rules-based fallback engine for offline/keyless use
func (c *GeminiLLMClient) localTriageFallback(msg string) *dto.TriageResponse {
	cleaned := strings.ToLower(msg)

	urgency := "low"
	specialty := "general_practitioner"

	// High urgency checks
	if strings.Contains(cleaned, "chest pain") ||
		strings.Contains(cleaned, "heart") ||
		strings.Contains(cleaned, "breathing") ||
		strings.Contains(cleaned, "breath") ||
		strings.Contains(cleaned, "stroke") ||
		strings.Contains(cleaned, "unconscious") ||
		strings.Contains(cleaned, "paralysis") ||
		strings.Contains(cleaned, "severe bleeding") {
		urgency = "high"
		if strings.Contains(cleaned, "chest") || strings.Contains(cleaned, "heart") {
			specialty = "cardiologist"
		} else if strings.Contains(cleaned, "breath") || strings.Contains(cleaned, "breathing") {
			specialty = "pulmonologist"
		} else {
			specialty = "emergency_medicine"
		}
	} else if strings.Contains(cleaned, "child") ||
		strings.Contains(cleaned, "baby") ||
		strings.Contains(cleaned, "kid") ||
		strings.Contains(cleaned, "toddler") ||
		strings.Contains(cleaned, "pediatric") {
		urgency = "medium"
		specialty = "pediatrician"
	} else if strings.Contains(cleaned, "skin") ||
		strings.Contains(cleaned, "rash") ||
		strings.Contains(cleaned, "itch") ||
		strings.Contains(cleaned, "eczema") ||
		strings.Contains(cleaned, "acne") {
		urgency = "low"
		specialty = "dermatologist"
	} else if strings.Contains(cleaned, "tooth") ||
		strings.Contains(cleaned, "dental") ||
		strings.Contains(cleaned, "gums") ||
		strings.Contains(cleaned, "cavity") {
		urgency = "medium"
		specialty = "dentist"
	}

	return &dto.TriageResponse{
		SuggestedUrgency:   urgency,
		SuggestedSpecialty: specialty,
	}
}

// allowRequest implements state transition rules for Circuit Breaker
func (c *GeminiLLMClient) allowRequest() bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	switch c.state {
	case StateClosed:
		return true
	case StateOpen:
		if time.Since(c.lastStateChange) > 30*time.Second {
			// Cooldown period elapsed, transition to Half-Open
			c.log.Info("circuit breaker transitioned from OPEN to HALF-OPEN")
			c.state = StateHalfOpen
			c.lastStateChange = time.Now()
			return true
		}
		return false
	case StateHalfOpen:
		// Allow test request
		return true
	default:
		return true
	}
}

func (c *GeminiLLMClient) recordSuccess() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.failures = 0
	if c.state == StateHalfOpen {
		c.log.Info("circuit breaker transitioned from HALF-OPEN to CLOSED")
		c.state = StateClosed
		c.lastStateChange = time.Now()
	}
}

func (c *GeminiLLMClient) recordFailure() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.failures++
	if c.state == StateClosed && c.failures >= 3 {
		c.log.Warn("circuit breaker transitioned from CLOSED to OPEN due to 3 consecutive failures")
		c.state = StateOpen
		c.lastStateChange = time.Now()
	} else if c.state == StateHalfOpen {
		c.log.Warn("circuit breaker transitioned from HALF-OPEN to OPEN due to test request failure")
		c.state = StateOpen
		c.lastStateChange = time.Now()
	}
}
