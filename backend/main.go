package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"chat-anonymous/backend/handlers"
	"chat-anonymous/backend/models"
	"chat-anonymous/backend/services"
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

	// Initialize router
	router := gin.Default()
	uploadPath := filepath.Clean("uploads")
	if err := os.MkdirAll(uploadPath, 0o755); err != nil {
		log.Fatal("Failed to create uploads directory:", err)
	}
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Room-Secret")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	router.Static("/uploads", uploadPath)

	// Initialize handlers
	roomHandler := handlers.NewRoomHandler(roomService, messageService)
	messageHandler := handlers.NewMessageHandler(messageService, roomService)

	// Define routes
	api := router.Group("/api")
	{
		api.GET("/rooms", roomHandler.GetRooms)
		api.POST("/rooms", roomHandler.CreateRoom)
		api.GET("/rooms/:id", roomHandler.GetRoom)
		api.POST("/rooms/:id/join", roomHandler.JoinRoom)
		api.DELETE("/rooms/:id", roomHandler.DeleteRoom)
		api.POST("/rooms/:id/messages", messageHandler.SendMessage)
		api.GET("/rooms/:id/messages", messageHandler.GetMessages)
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
