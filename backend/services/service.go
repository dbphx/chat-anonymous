package services

import (
	"chat-anonymous/backend/models"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RoomService handles room operations
type RoomService struct {
	db *mongo.Client
}

// MessageService handles message operations
type MessageService struct {
	db *mongo.Client
}

var ErrInvalidSecret = errors.New("invalid room secret")
var ErrRoomNotFound = errors.New("room not found")

// NewRoomService creates a new RoomService
func NewRoomService(db *mongo.Client) *RoomService {
	return &RoomService{db: db}
}

// NewMessageService creates a new MessageService
func NewMessageService(db *mongo.Client) *MessageService {
	return &MessageService{db: db}
}

// CreateRoom creates a new room
func (s *RoomService) CreateRoom(name, password string) (*models.Room, error) {
	collection := s.db.Database("chat").Collection("rooms")
	room := models.NewRoom(name, hashSecret(password))
	_, err := collection.InsertOne(context.TODO(), room)
	if err != nil {
		return nil, err
	}
	return room, nil
}

// GetRoom retrieves a room by ID
func (s *RoomService) GetRoom(id string) (*models.Room, error) {
	collection := s.db.Database("chat").Collection("rooms")
	var result models.Room
	err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&result)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrRoomNotFound
		}
		return nil, err
	}
	return &result, nil
}

// DeleteRoom deletes a room by ID
func (s *RoomService) DeleteRoom(id, secret string) error {
	if _, err := s.ValidateSecret(id, secret); err != nil {
		return err
	}

	ctx := context.TODO()
	messagesCollection := s.db.Database("chat").Collection("messages")
	if _, err := messagesCollection.DeleteMany(ctx, bson.M{"room_id": id}); err != nil {
		return err
	}

	roomsCollection := s.db.Database("chat").Collection("rooms")
	result, err := roomsCollection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrRoomNotFound
	}
	return nil
}

// GetRooms retrieves all rooms
func (s *RoomService) GetRooms() ([]models.Room, error) {
	collection := s.db.Database("chat").Collection("rooms")
	findOptions := options.Find().SetSort(bson.M{"created": 1})
	cursor, err := collection.Find(context.TODO(), bson.M{}, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var results []models.Room
	if err = cursor.All(context.TODO(), &results); err != nil {
		return nil, err
	}
	return results, nil
}

func (s *RoomService) ValidateSecret(id, secret string) (*models.Room, error) {
	room, err := s.GetRoom(id)
	if err != nil {
		return nil, err
	}
	if room.Password != hashSecret(secret) {
		return nil, ErrInvalidSecret
	}
	return room, nil
}

func hashSecret(secret string) string {
	hash := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(hash[:])
}

// SendMessage sends a message to a room
func (s *MessageService) SendMessage(roomID, user, content string, file *models.MessageFile) (*models.Message, error) {
	collection := s.db.Database("chat").Collection("messages")
	message := models.NewMessage(roomID, user, content, file)
	_, err := collection.InsertOne(context.TODO(), message)
	if err != nil {
		return nil, err
	}
	return message, nil
}

// GetMessages retrieves messages from a room
func (s *MessageService) GetMessages(roomID string) ([]models.Message, error) {
	collection := s.db.Database("chat").Collection("messages")
	findOptions := options.Find().SetSort(bson.M{"created": 1})
	cursor, err := collection.Find(context.TODO(), bson.M{"room_id": roomID}, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	results := make([]models.Message, 0)
	if err = cursor.All(context.TODO(), &results); err != nil {
		return nil, err
	}
	return results, nil
}
