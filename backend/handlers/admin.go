package handlers

import (
	"errors"
	"net/http"
	"strings"

	"chat-anonymous/backend/models"
	"chat-anonymous/backend/services"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

const adminUserContextKey = "adminUser"

type AdminHandler struct {
	adminService   *services.AdminService
	roomService    *services.RoomService
	messageService *services.MessageService
}

type adminUserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Created  int64  `json:"created"`
	Updated  int64  `json:"updated"`
}

type adminAuthResponse struct {
	Token string            `json:"token"`
	User  adminUserResponse `json:"user"`
}

func toAdminUserResponse(user *models.AdminUser) adminUserResponse {
	return adminUserResponse{
		ID:       user.ID,
		Username: user.Username,
		Role:     user.Role,
		Created:  user.Created,
		Updated:  user.Updated,
	}
}

func NewAdminHandler(adminService *services.AdminService, roomService *services.RoomService, messageService *services.MessageService) *AdminHandler {
	return &AdminHandler{adminService: adminService, roomService: roomService, messageService: messageService}
}

func (h *AdminHandler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authorization := strings.TrimSpace(c.GetHeader("Authorization"))
		parts := strings.Fields(authorization)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization token required"})
			return
		}

		token := strings.TrimSpace(parts[1])
		user, err := h.adminService.Authenticate(token)
		if err != nil {
			if errors.Is(err, services.ErrSessionExpired) || errors.Is(err, services.ErrSessionNotFound) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
				return
			}
			logrus.Error("Failed to authenticate admin session:", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Set(adminUserContextKey, user)
		c.Next()
	}
}

func currentAdminUser(c *gin.Context) *models.AdminUser {
	value, ok := c.Get(adminUserContextKey)
	if !ok {
		return nil
	}
	user, _ := value.(*models.AdminUser)
	return user
}

func requireAdminRole(c *gin.Context) *models.AdminUser {
	user := currentAdminUser(c)
	if user == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return nil
	}
	if user.Role != models.RoleAdmin {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return nil
	}
	return user
}

func (h *AdminHandler) Login(c *gin.Context) {
	var payload struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, token, err := h.adminService.Login(payload.Username, payload.Password)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		logrus.Error("Failed to login admin:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to login"})
		return
	}

	c.JSON(http.StatusOK, adminAuthResponse{Token: token, User: toAdminUserResponse(user)})
}

func (h *AdminHandler) Me(c *gin.Context) {
	user := currentAdminUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	c.JSON(http.StatusOK, toAdminUserResponse(user))
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	if requireAdminRole(c) == nil {
		return
	}

	q := parseSearchQuery(c)
	page, limit := parsePageLimit(c)
	result, err := h.adminService.SearchAdminUsers(q, page, limit)
	if err != nil {
		logrus.Error("Failed to list admin users:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load users"})
		return
	}

	responses := make([]adminUserResponse, 0, len(result.Items))
	for i := range result.Items {
		user := result.Items[i]
		responses = append(responses, toAdminUserResponse(&user))
	}
	c.JSON(http.StatusOK, gin.H{
		"items": responses,
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

func (h *AdminHandler) CreateUser(c *gin.Context) {
	if requireAdminRole(c) == nil {
		return
	}

	var payload struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.adminService.CreateUser(payload.Username, payload.Password, payload.Role)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidRole):
			c.JSON(http.StatusBadRequest, gin.H{"error": "role must be mod or admin"})
		case errors.Is(err, services.ErrAdminExists):
			c.JSON(http.StatusConflict, gin.H{"error": "An admin account already exists"})
		case errors.Is(err, services.ErrUsernameExists):
			c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		case errors.Is(err, services.ErrInvalidCredentials):
			c.JSON(http.StatusBadRequest, gin.H{"error": "username and password are required"})
		default:
			logrus.Error("Failed to create admin user:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		}
		return
	}

	c.JSON(http.StatusCreated, toAdminUserResponse(user))
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
	user := requireAdminRole(c)
	if user == nil {
		return
	}

	if err := h.adminService.DeleteUser(c.Param("id"), user.ID); err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		case errors.Is(err, services.ErrCannotDeleteSelf):
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete the currently signed-in admin"})
		case errors.Is(err, services.ErrCannotDeleteLastAdmin):
			c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete the last admin"})
		default:
			logrus.Error("Failed to delete admin user:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *AdminHandler) GetRooms(c *gin.Context) {
	if currentAdminUser(c) == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	q := parseSearchQuery(c)
	page, limit := parsePageLimit(c)
	result, err := h.roomService.SearchRooms(q, page, limit)
	if err != nil {
		logrus.Error("Failed to get admin rooms:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rooms"})
		return
	}

	responses := make([]roomResponse, 0, len(result.Items))
	for i := range result.Items {
		room := result.Items[i]
		responses = append(responses, toRoomResponse(&room))
	}
	c.JSON(http.StatusOK, gin.H{
		"items": responses,
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

func (h *AdminHandler) JoinRoom(c *gin.Context) {
	if currentAdminUser(c) == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	room, err := h.roomService.GetRoom(c.Param("id"))
	if err != nil {
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		logrus.Error("Failed to get admin room:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join room"})
		return
	}

	c.JSON(http.StatusOK, toRoomResponse(room))
}

func (h *AdminHandler) DeleteRoom(c *gin.Context) {
	if currentAdminUser(c) == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.roomService.DeleteRoomForce(c.Param("id")); err != nil {
		if errors.Is(err, services.ErrRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		logrus.Error("Failed to delete admin room:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete room"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Room deleted successfully"})
}

func (h *AdminHandler) GetMessages(c *gin.Context) {
	if currentAdminUser(c) == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	messages, err := h.messageService.GetMessages(c.Param("id"))
	if err != nil {
		logrus.Error("Failed to get admin messages:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

func (h *AdminHandler) SendMessage(c *gin.Context) {
	adminUser := currentAdminUser(c)
	if adminUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	message, fileHeader, err := parseMessageRequest(c, false)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	message.User = adminUser.Username

	var fileMeta *models.MessageFile
	if fileHeader != nil {
		fileMeta, err = saveUploadedFile(fileHeader)
		if err != nil {
			logrus.Error("Failed to save uploaded file for admin message:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
			return
		}
	}

	replyTo, err := h.messageService.BuildReplyTo(c.Param("id"), message.ReplyToID)
	if err != nil {
		rollbackUploadedFile(fileMeta)
		if errors.Is(err, services.ErrMessageNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Reply target not found in room"})
			return
		}
		logrus.Error("Failed to resolve admin reply target:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	_, err = h.messageService.SendMessage(c.Param("id"), message.User, message.Content, fileMeta, replyTo)
	if err != nil {
		rollbackUploadedFile(fileMeta)
		logrus.Error("Failed to send admin message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Message sent successfully"})
}

func (h *AdminHandler) UpdateMessage(c *gin.Context) {
	if currentAdminUser(c) == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var payload struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedMessage, err := h.messageService.UpdateMessageForce(c.Param("id"), c.Param("messageId"), payload.Content)
	if err != nil {
		if errors.Is(err, services.ErrEmptyMessageContent) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
			return
		}
		if errors.Is(err, services.ErrMessageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		logrus.Error("Failed to update admin message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update message"})
		return
	}

	c.JSON(http.StatusOK, updatedMessage)
}

func (h *AdminHandler) DeleteMessage(c *gin.Context) {
	if currentAdminUser(c) == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	deletedMessage, err := h.messageService.DeleteMessageForce(c.Param("id"), c.Param("messageId"))
	if err != nil {
		if errors.Is(err, services.ErrMessageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		logrus.Error("Failed to delete admin message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message"})
		return
	}

	if deletedMessage.File != nil {
		if err := removeUploadedFile(deletedMessage.File.URL); err != nil {
			logrus.Warn("Failed to remove uploaded file for admin message:", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message deleted successfully"})
}
