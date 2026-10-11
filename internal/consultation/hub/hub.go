package hub

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/dto"
	"github.com/timurdianradhasejati/telemed_hub/internal/consultation/service"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow local development and same-host origins
		return true
	},
}

// WSMessage represents the envelope for signaling and in-room chat.
type WSMessage struct {
	Type           string          `json:"type"`
	ConsultationID string          `json:"consultation_id,omitempty"`
	SenderID       string          `json:"sender_id,omitempty"`
	SenderName     string          `json:"sender_name,omitempty"`
	SenderRole     string          `json:"sender_role,omitempty"`
	Payload        json.RawMessage `json:"payload,omitempty"`
	Timestamp      string          `json:"timestamp,omitempty"`
}

type Client struct {
	hub            *Hub
	conn           *websocket.Conn
	send           chan []byte
	consultationID uuid.UUID
	userID         uuid.UUID
	userName       string
	userRole       string
}

type Hub struct {
	svc     service.ConsultationService
	logger  *slog.Logger
	mu      sync.RWMutex
	rooms   map[uuid.UUID]map[*Client]bool
}

func NewHub(svc service.ConsultationService, logger *slog.Logger) *Hub {
	return &Hub{
		svc:    svc,
		logger: logger,
		rooms:  make(map[uuid.UUID]map[*Client]bool),
	}
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request, consultationID uuid.UUID, userID uuid.UUID, userName string, userRole string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error("failed to upgrade websocket connection", "error", err)
		return
	}

	client := &Client{
		hub:            h,
		conn:           conn,
		send:           make(chan []byte, 256),
		consultationID: consultationID,
		userID:         userID,
		userName:       userName,
		userRole:       userRole,
	}

	h.register(client)

	go client.writePump()
	go client.readPump()
}

func (h *Hub) register(client *Client) {
	h.mu.Lock()
	if _, ok := h.rooms[client.consultationID]; !ok {
		h.rooms[client.consultationID] = make(map[*Client]bool)
	}
	h.rooms[client.consultationID][client] = true

	var existingPeers []*Client
	for other := range h.rooms[client.consultationID] {
		if other != client {
			existingPeers = append(existingPeers, other)
		}
	}
	h.mu.Unlock()

	// 1. Notify other peers in room that a new user joined
	h.broadcastToRoom(client.consultationID, client, &WSMessage{
		Type:           "peer_joined",
		ConsultationID: client.consultationID.String(),
		SenderID:       client.userID.String(),
		SenderName:     client.userName,
		SenderRole:     client.userRole,
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
	})

	// 2. Notify the newly joined client about peers who are ALREADY in the room
	for _, peer := range existingPeers {
		msgBytes, err := json.Marshal(&WSMessage{
			Type:           "peer_joined",
			ConsultationID: client.consultationID.String(),
			SenderID:       peer.userID.String(),
			SenderName:     peer.userName,
			SenderRole:     peer.userRole,
			Timestamp:      time.Now().UTC().Format(time.RFC3339),
		})
		if err == nil {
			select {
			case client.send <- msgBytes:
			default:
			}
		}
	}
}

// BroadcastChat broadcasts a persistent chat message to all connected clients in the room.
func (h *Hub) BroadcastChat(consultationID uuid.UUID, msg *dto.MessageResponse) {
	payloadBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}
	wsMsg := &WSMessage{
		Type:           "chat_message",
		ConsultationID: consultationID.String(),
		SenderID:       msg.SenderID,
		SenderName:     msg.SenderName,
		SenderRole:     msg.SenderRole,
		Payload:        payloadBytes,
		Timestamp:      msg.CreatedAt,
	}
	h.broadcastToRoom(consultationID, nil, wsMsg)
}

// BroadcastSessionEnded broadcasts that the consultation session has been finished.
func (h *Hub) BroadcastSessionEnded(consultationID uuid.UUID) {
	wsMsg := &WSMessage{
		Type:           "session_ended",
		ConsultationID: consultationID.String(),
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
	}
	h.broadcastToRoom(consultationID, nil, wsMsg)
}

func (h *Hub) unregister(client *Client) {
	h.mu.Lock()
	if clients, ok := h.rooms[client.consultationID]; ok {
		if _, exists := clients[client]; exists {
			delete(clients, client)
			close(client.send)
			if len(clients) == 0 {
				delete(h.rooms, client.consultationID)
			}
		}
	}
	h.mu.Unlock()

	// Notify other peers in room that user left
	h.broadcastToRoom(client.consultationID, client, &WSMessage{
		Type:           "peer_left",
		ConsultationID: client.consultationID.String(),
		SenderID:       client.userID.String(),
		SenderName:     client.userName,
		SenderRole:     client.userRole,
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
	})
}

// broadcastToRoom relays a message to all clients in the room (except sender if sender is provided).
func (h *Hub) broadcastToRoom(consultationID uuid.UUID, sender *Client, msg *WSMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	clients, ok := h.rooms[consultationID]
	if !ok {
		h.mu.RUnlock()
		return
	}

	for client := range clients {
		if sender != nil && client == sender {
			continue
		}
		select {
		case client.send <- data:
		default:
			// If buffer full, skip to prevent deadlock
		}
	}
	h.mu.RUnlock()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister(c)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(65536)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var incoming WSMessage
		if err := json.Unmarshal(messageBytes, &incoming); err != nil {
			continue
		}

		incoming.ConsultationID = c.consultationID.String()
		incoming.SenderID = c.userID.String()
		incoming.SenderName = c.userName
		incoming.SenderRole = c.userRole
		incoming.Timestamp = time.Now().UTC().Format(time.RFC3339)

		// Handle Chat Message persistence
		if incoming.Type == "chat_message" {
			var chatPayload struct {
				Message       string  `json:"message"`
				AttachmentURL *string `json:"attachment_url"`
			}
			if err := json.Unmarshal(incoming.Payload, &chatPayload); err == nil && chatPayload.Message != "" {
				// Persist via service
				saved, errSave := c.hub.svc.SendMessage(context.Background(), c.consultationID, c.userID, dto.SendMessageRequest{
					Message:       chatPayload.Message,
					AttachmentURL: chatPayload.AttachmentURL,
				})
				if errSave == nil && saved != nil {
					payloadBytes, _ := json.Marshal(saved)
					incoming.Payload = payloadBytes
				}
			}
			// Broadcast chat message to EVERYONE in the room (including sender confirmation)
			c.hub.broadcastToRoom(c.consultationID, nil, &incoming)
			continue
		}

		// WebRTC Signaling messages (offer, answer, ice-candidate, media-state): relay to peer
		c.hub.broadcastToRoom(c.consultationID, c, &incoming)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub closed the channel
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
