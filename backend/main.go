package main

import (
	"log"
	"net/http"
	"os"

	"chat-anonymous/backend/cache"
	"chat-anonymous/backend/handlers"
	"chat-anonymous/backend/models"
	"chat-anonymous/backend/services"
	"chat-anonymous/backend/storage"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func main() {
	// Initialize logging
	logrus.SetFormatter(&logrus.JSONFormatter{})
	logrus.SetOutput(os.Stdout)
	logrus.SetLevel(logrus.InfoLevel)

	// Initialize database
	db, err := models.InitDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer models.CloseDB(db)

	// Initialize services
	roomService := services.NewRoomService(db)
	messageService := services.NewMessageService(db)
	adminService := services.NewAdminService(db)
	if err := adminService.BootstrapDefaultAdmin(); err != nil {
		log.Fatal("Failed to bootstrap default admin:", err)
	}

	if err := storage.InitFromEnv(); err != nil {
		log.Fatal("Failed to init storage:", err)
	}

	if err := cache.InitFromEnv(); err != nil {
		log.Fatal("Failed to init redis:", err)
	}

	// Initialize router
	router := gin.Default()
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Room-Secret")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	if storage.IsLocal() {
		uploadHandler := storage.GinLocalUploads()
		router.GET("/uploads/*filepath", uploadHandler)
		router.HEAD("/uploads/*filepath", uploadHandler)
	}

	if storage.IsMinIO() {
		imgProxy := handlers.CachedMinIOImage()
		router.GET("/api/media/image/*filepath", imgProxy)
		router.HEAD("/api/media/image/*filepath", imgProxy)
	}

	// Initialize handlers
	roomHandler := handlers.NewRoomHandler(roomService, messageService)
	messageHandler := handlers.NewMessageHandler(messageService, roomService)
	adminHandler := handlers.NewAdminHandler(adminService, roomService, messageService)

	// Define routes
	api := router.Group("/api")
	{
		api.GET("/rooms", roomHandler.GetRooms)
		api.POST("/rooms", roomHandler.CreateRoom)
		api.GET("/rooms/:id", roomHandler.GetRoom)
		api.POST("/rooms/:id/join", roomHandler.JoinRoom)
		api.POST("/rooms/:id/join_room", roomHandler.JoinRoom)
		api.DELETE("/rooms/:id", roomHandler.DeleteRoom)
		api.POST("/rooms/:id/messages", messageHandler.SendMessage)
		api.GET("/rooms/:id/messages", messageHandler.GetMessages)
		// Pin must register before PATCH …/messages/:messageId so Gin does not shadow /pin
		api.PATCH("/rooms/:id/messages/:messageId/pin", messageHandler.PinMessage)
		api.POST("/rooms/:id/messages/:messageId/pin", messageHandler.PinMessage)
		api.PATCH("/rooms/:id/messages/:messageId", messageHandler.UpdateMessage)
		api.DELETE("/rooms/:id/messages/:messageId", messageHandler.DeleteMessage)

		admin := api.Group("/admin")
		admin.POST("/login", adminHandler.Login)
		adminProtected := admin.Group("")
		adminProtected.Use(adminHandler.AuthMiddleware())
		{
			adminProtected.GET("/me", adminHandler.Me)
			adminProtected.GET("/rooms", adminHandler.GetRooms)
			adminProtected.POST("/rooms/:id/join_room", adminHandler.JoinRoom)
			adminProtected.DELETE("/rooms/:id", adminHandler.DeleteRoom)
			adminProtected.GET("/rooms/:id/messages", adminHandler.GetMessages)
			adminProtected.POST("/rooms/:id/messages", adminHandler.SendMessage)
			adminProtected.PATCH("/rooms/:id/messages/:messageId/pin", adminHandler.PinMessage)
			adminProtected.POST("/rooms/:id/messages/:messageId/pin", adminHandler.PinMessage)
			adminProtected.PATCH("/rooms/:id/messages/:messageId", adminHandler.UpdateMessage)
			adminProtected.DELETE("/rooms/:id/messages/:messageId", adminHandler.DeleteMessage)
			adminProtected.GET("/users", adminHandler.ListUsers)
			adminProtected.POST("/users", adminHandler.CreateUser)
			adminProtected.PATCH("/users/:id", adminHandler.UpdateUser)
			adminProtected.DELETE("/users/:id", adminHandler.DeleteUser)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
