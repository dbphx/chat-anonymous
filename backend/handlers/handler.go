package handlers

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"chat-anonymous/backend/models"
	"chat-anonymous/backend/services"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

const roomSecretHeader = "X-Room-Secret"
const uploadDir = "uploads"

// RoomHandler handles room-related HTTP requests
type RoomHandler struct {
	roomService    *services.RoomService
	messageService *services.MessageService
}

type roomResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Created   int64  `json:"created"`
	UserCount int    `json:"user_count"`
}

func toRoomResponse(room *models.Room, userCount int) roomResponse {
	return roomResponse{
		ID:        room.ID,
		Name:      room.Name,
		Created:   room.Created,
		UserCount: userCount,
	}
}

func roomIDsFromItems(items []models.Room) []string {
	ids := make([]string, 0, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
	}
	return ids
}

// NewRoomHandler creates a new RoomHandler
func NewRoomHandler(roomService *services.RoomService, messageService *services.MessageService) *RoomHandler {
	return &RoomHandler{
		roomService:    roomService,
		messageService: messageService,
	}
}

// GetRooms returns paginated rooms (query q, page, limit).
func (h *RoomHandler) GetRooms(c *gin.Context) {
	q := parseSearchQuery(c)
	page, limit := parsePageLimit(c)
	result, err := h.roomService.SearchRooms(q, page, limit)
	if err != nil {
		logrus.Error("Failed to get rooms:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rooms"})
		return
	}
	counts, err := h.messageService.CountDistinctUsersByRoomIDs(roomIDsFromItems(result.Items))
	if err != nil {
		logrus.Error("Failed to count room users:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rooms"})
		return
	}
	responses := make([]roomResponse, 0, len(result.Items))
	for i := range result.Items {
		roomCopy := result.Items[i]
		responses = append(responses, toRoomResponse(&roomCopy, counts[roomCopy.ID]))
	}
	c.JSON(http.StatusOK, gin.H{
		"items": responses,
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

// CreateRoom creates a new room
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	var room models.Room
	if err := c.ShouldBindJSON(&room); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room.Name = strings.TrimSpace(room.Name)
	room.Password = strings.TrimSpace(room.Password)
	if room.Name == "" || room.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and secret are required"})
		return
	}

	createdRoom, err := h.roomService.CreateRoom(room.Name, room.Password)
	if err != nil {
		logrus.Error("Failed to create room:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create room"})
		return
	}

	c.JSON(http.StatusCreated, toRoomResponse(createdRoom, 0))
}

// GetRoom retrieves a room by ID
func (h *RoomHandler) GetRoom(c *gin.Context) {
	id := c.Param("id")
	room, err := h.roomService.GetRoom(id)
	if err != nil {
		logrus.Error("Failed to get room:", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}
	counts, err := h.messageService.CountDistinctUsersByRoomIDs([]string{room.ID})
	if err != nil {
		logrus.Error("Failed to count room users:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get room"})
		return
	}
	c.JSON(http.StatusOK, toRoomResponse(room, counts[room.ID]))
}

// JoinRoom checks the provided secret and returns room info.
func (h *RoomHandler) JoinRoom(c *gin.Context) {
	id := c.Param("id")
	var payload struct {
		Secret string `json:"secret"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	payload.Secret = strings.TrimSpace(payload.Secret)
	if payload.Secret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}

	room, err := h.roomService.ValidateSecret(id, payload.Secret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidSecret) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid secret"})
			return
		}
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	counts, err := h.messageService.CountDistinctUsersByRoomIDs([]string{room.ID})
	if err != nil {
		logrus.Error("Failed to count room users:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join room"})
		return
	}
	c.JSON(http.StatusOK, toRoomResponse(room, counts[room.ID]))
}

// DeleteRoom deletes a room by ID
func (h *RoomHandler) DeleteRoom(c *gin.Context) {
	id := c.Param("id")
	var payload struct {
		Secret string `json:"secret"`
	}

	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	secret := strings.TrimSpace(payload.Secret)
	if secret == "" {
		secret = strings.TrimSpace(c.GetHeader(roomSecretHeader))
	}
	if secret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}

	err := h.roomService.DeleteRoom(id, secret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidSecret) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid secret"})
			return
		}
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		logrus.Error("Failed to delete room:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete room"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Room deleted successfully"})
}

// MessageHandler handles message-related HTTP requests
type MessageHandler struct {
	service     *services.MessageService
	roomService *services.RoomService
}

// NewMessageHandler creates a new MessageHandler
func NewMessageHandler(service *services.MessageService, roomService *services.RoomService) *MessageHandler {
	return &MessageHandler{service: service, roomService: roomService}
}

// SendMessage sends a message to a room
func (h *MessageHandler) SendMessage(c *gin.Context) {
	roomID := c.Param("id")

	message, fileHeader, err := parseMessageRequest(c, true)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if message.Secret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}

	_, err = h.roomService.ValidateSecret(roomID, message.Secret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidSecret) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid secret"})
			return
		}
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	var fileMeta *models.MessageFile
	if fileHeader != nil {
		fileMeta, err = saveUploadedFile(fileHeader)
		if err != nil {
			logrus.Error("Failed to save uploaded file:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
			return
		}
	}

	replyTo, err := h.service.BuildReplyTo(roomID, message.ReplyToID)
	if err != nil {
		rollbackUploadedFile(fileMeta)
		if errors.Is(err, services.ErrMessageNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Reply target not found in room"})
			return
		}
		logrus.Error("Failed to resolve reply target:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	_, err = h.service.SendMessage(roomID, message.User, message.Content, fileMeta, replyTo)
	if err != nil {
		rollbackUploadedFile(fileMeta)
		logrus.Error("Failed to send message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Message sent successfully"})
}

type sendMessagePayload struct {
	User      string
	Content   string
	Secret    string
	ReplyToID string
}

type updateMessagePayload struct {
	User    string `json:"user"`
	Content string `json:"content"`
	Secret  string `json:"secret"`
}

type deleteMessagePayload struct {
	User   string `json:"user"`
	Secret string `json:"secret"`
}

type pinMessagePayload struct {
	User   string `json:"user"`
	Secret string `json:"secret"`
	Pinned bool   `json:"pinned"`
}

func parseMessageRequest(c *gin.Context, requireUser bool) (*sendMessagePayload, *multipart.FileHeader, error) {
	payload := &sendMessagePayload{}
	contentType := c.ContentType()
	if strings.HasPrefix(contentType, "multipart/form-data") {
		payload.User = strings.TrimSpace(c.PostForm("user"))
		payload.Content = strings.TrimSpace(c.PostForm("content"))
		payload.Secret = strings.TrimSpace(c.PostForm("secret"))
		payload.ReplyToID = strings.TrimSpace(c.PostForm("reply_to_id"))

		fileHeader, err := c.FormFile("file")
		if err != nil {
			if errors.Is(err, http.ErrMissingFile) {
				if requireUser && payload.User == "" {
					return nil, nil, errors.New("user is required")
				}
				if payload.Content == "" {
					return nil, nil, errors.New("content or file is required")
				}
				return payload, nil, nil
			}
			return nil, nil, err
		}

		if requireUser && payload.User == "" {
			return nil, nil, errors.New("user is required")
		}
		if payload.Content == "" && fileHeader == nil {
			return nil, nil, errors.New("content or file is required")
		}

		return payload, fileHeader, nil
	}

	var body struct {
		User      string `json:"user"`
		Content   string `json:"content"`
		Secret    string `json:"secret"`
		ReplyToID string `json:"reply_to_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		return nil, nil, err
	}
	payload.User = strings.TrimSpace(body.User)
	payload.Content = strings.TrimSpace(body.Content)
	payload.Secret = strings.TrimSpace(body.Secret)
	payload.ReplyToID = strings.TrimSpace(body.ReplyToID)
	if requireUser && payload.User == "" {
		return nil, nil, errors.New("user is required")
	}
	if payload.Content == "" {
		return nil, nil, errors.New("content or file is required")
	}
	return payload, nil, nil
}

func saveUploadedFile(fileHeader *multipart.FileHeader) (*models.MessageFile, error) {
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return nil, err
	}

	source, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer source.Close()

	filename := filepath.Base(fileHeader.Filename)
	storedName := fmt.Sprintf("%s-%s", models.NewID("file"), filename)
	destinationPath := filepath.Join(uploadDir, storedName)

	destination, err := os.Create(destinationPath)
	if err != nil {
		return nil, err
	}
	defer destination.Close()

	if _, err := io.Copy(destination, source); err != nil {
		return nil, err
	}

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return &models.MessageFile{
		Name:        filename,
		URL:         "/uploads/" + storedName,
		Size:        fileHeader.Size,
		ContentType: contentType,
	}, nil
}

func removeUploadedFile(fileURL string) error {
	trimmedURL := strings.TrimSpace(fileURL)
	if trimmedURL == "" {
		return nil
	}

	storedName := strings.TrimPrefix(trimmedURL, "/uploads/")
	if storedName == "" || storedName == trimmedURL {
		return nil
	}

	path := filepath.Join(uploadDir, filepath.Base(storedName))
	err := os.Remove(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func rollbackUploadedFile(fileMeta *models.MessageFile) {
	if fileMeta == nil {
		return
	}
	if err := removeUploadedFile(fileMeta.URL); err != nil {
		logrus.Warn("Failed to rollback uploaded file:", err)
	}
}

// GetMessages retrieves messages from a room
func (h *MessageHandler) GetMessages(c *gin.Context) {
	roomID := c.Param("id")
	secret := strings.TrimSpace(c.GetHeader(roomSecretHeader))
	if secret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}

	_, err := h.roomService.ValidateSecret(roomID, secret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidSecret) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid secret"})
			return
		}
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	messages, err := h.service.GetMessages(roomID)
	if err != nil {
		logrus.Error("Failed to get messages:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// UpdateMessage edits a room message owned by the current user.
func (h *MessageHandler) UpdateMessage(c *gin.Context) {
	roomID := c.Param("id")
	messageID := c.Param("messageId")

	var payload updateMessagePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payload.User = strings.TrimSpace(payload.User)
	payload.Content = strings.TrimSpace(payload.Content)
	payload.Secret = strings.TrimSpace(payload.Secret)
	if payload.Secret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}
	if payload.User == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is required"})
		return
	}

	_, err := h.roomService.ValidateSecret(roomID, payload.Secret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidSecret) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid secret"})
			return
		}
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	updatedMessage, err := h.service.UpdateMessage(roomID, messageID, payload.User, payload.Content)
	if err != nil {
		if errors.Is(err, services.ErrEmptyMessageContent) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
			return
		}
		if errors.Is(err, services.ErrMessageNotOwned) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only edit your own messages"})
			return
		}
		if errors.Is(err, services.ErrMessageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		logrus.Error("Failed to update message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update message"})
		return
	}

	c.JSON(http.StatusOK, updatedMessage)
}

// DeleteMessage deletes a room message owned by the current user.
func (h *MessageHandler) DeleteMessage(c *gin.Context) {
	roomID := c.Param("id")
	messageID := c.Param("messageId")

	var payload deleteMessagePayload
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	payload.User = strings.TrimSpace(payload.User)
	payload.Secret = strings.TrimSpace(payload.Secret)
	if payload.Secret == "" {
		payload.Secret = strings.TrimSpace(c.GetHeader(roomSecretHeader))
	}
	if payload.Secret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}
	if payload.User == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is required"})
		return
	}

	_, err := h.roomService.ValidateSecret(roomID, payload.Secret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidSecret) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid secret"})
			return
		}
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	deletedMessage, err := h.service.DeleteMessage(roomID, messageID, payload.User)
	if err != nil {
		if errors.Is(err, services.ErrMessageNotOwned) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own messages"})
			return
		}
		if errors.Is(err, services.ErrMessageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		logrus.Error("Failed to delete message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message"})
		return
	}

	if deletedMessage.File != nil {
		if err := removeUploadedFile(deletedMessage.File.URL); err != nil {
			logrus.Warn("Failed to remove uploaded file:", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message deleted successfully"})
}

// PinMessage pins or unpins a message (only author in user API).
func (h *MessageHandler) PinMessage(c *gin.Context) {
	roomID := c.Param("id")
	messageID := c.Param("messageId")

	var payload pinMessagePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payload.User = strings.TrimSpace(payload.User)
	payload.Secret = strings.TrimSpace(payload.Secret)
	if payload.Secret == "" {
		payload.Secret = strings.TrimSpace(c.GetHeader(roomSecretHeader))
	}
	if payload.Secret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}
	if payload.User == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is required"})
		return
	}

	_, err := h.roomService.ValidateSecret(roomID, payload.Secret)
	if err != nil {
		if errors.Is(err, services.ErrInvalidSecret) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid secret"})
			return
		}
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	updatedMessage, err := h.service.SetMessagePinned(roomID, messageID, payload.User, payload.Pinned, true)
	if err != nil {
		if errors.Is(err, services.ErrMessageNotOwned) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only pin your own messages"})
			return
		}
		if errors.Is(err, services.ErrMessageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		logrus.Error("Failed to pin message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update pin"})
		return
	}

	c.JSON(http.StatusOK, updatedMessage)
}
