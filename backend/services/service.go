package services

import (
	"chat-anonymous/backend/models"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

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
var ErrMessageNotFound = errors.New("message not found")
var ErrMessageNotOwned = errors.New("message does not belong to user")
var ErrEmptyMessageContent = errors.New("message content cannot be empty")

const uploadDir = "uploads"

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
	return s.deleteRoom(id, secret, true)
}

func (s *RoomService) DeleteRoomForce(id string) error {
	return s.deleteRoom(id, "", false)
}

func (s *RoomService) deleteRoom(id, secret string, validateSecret bool) error {
	if validateSecret {
		if _, err := s.ValidateSecret(id, secret); err != nil {
			return err
		}
	}

	ctx := context.TODO()
	messagesCollection := s.db.Database("chat").Collection("messages")
	cursor, err := messagesCollection.Find(ctx, bson.M{"room_id": id})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var messages []models.Message
	if err := cursor.All(ctx, &messages); err != nil {
		return err
	}

	for _, message := range messages {
		if message.File == nil {
			continue
		}
		if err := removeUploadedFile(message.File.URL); err != nil {
			return err
		}
	}

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

// RoomListResult is a paginated room list from SearchRooms.
type RoomListResult struct {
	Items []models.Room
	Total int64
	Page  int
	Limit int
}

// SearchRooms filters by optional substring on name or _id (case-insensitive) with paging.
func (s *RoomService) SearchRooms(query string, page, limit int) (*RoomListResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	filter := bson.M{}
	q := strings.TrimSpace(query)
	if q != "" {
		esc := regexp.QuoteMeta(q)
		rx := bson.M{"$regex": esc, "$options": "i"}
		filter = bson.M{"$or": []bson.M{
			{"name": rx},
			{"_id": rx},
		}}
	}

	collection := s.db.Database("chat").Collection("rooms")
	ctx := context.TODO()

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, err
	}

	skip := int64((page - 1) * limit)
	findOpts := options.Find().
		SetSort(bson.M{"created": -1}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []models.Room
	if err = cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []models.Room{}
	}

	return &RoomListResult{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// GetRooms retrieves all rooms (internal use).
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

func (s *MessageService) SendMessage(roomID, user, content string, file *models.MessageFile, replyTo *models.MessageReplyTo) (*models.Message, error) {
	collection := s.db.Database("chat").Collection("messages")
	message := models.NewMessage(roomID, user, content, file, replyTo)
	_, err := collection.InsertOne(context.TODO(), message)
	if err != nil {
		return nil, err
	}
	return message, nil
}

func (s *MessageService) GetMessage(roomID, messageID string) (*models.Message, error) {
	collection := s.db.Database("chat").Collection("messages")
	var result models.Message
	err := collection.FindOne(context.TODO(), bson.M{"_id": messageID, "room_id": roomID}).Decode(&result)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrMessageNotFound
		}
		return nil, err
	}
	return &result, nil
}

func (s *MessageService) BuildReplyTo(roomID, replyToID string) (*models.MessageReplyTo, error) {
	if strings.TrimSpace(replyToID) == "" {
		return nil, nil
	}

	message, err := s.GetMessage(roomID, replyToID)
	if err != nil {
		return nil, err
	}

	snapshot := strings.TrimSpace(message.Content)
	if snapshot == "" && message.File != nil {
		snapshot = "[File] " + message.File.Name
	}

	return &models.MessageReplyTo{
		ID:      message.ID,
		User:    message.User,
		Content: snapshot,
	}, nil
}

func (s *MessageService) UpdateMessage(roomID, messageID, user, content string) (*models.Message, error) {
	return s.updateMessage(roomID, messageID, user, content, true)
}

func (s *MessageService) UpdateMessageForce(roomID, messageID, content string) (*models.Message, error) {
	return s.updateMessage(roomID, messageID, "", content, false)
}

func (s *MessageService) updateMessage(roomID, messageID, user, content string, enforceOwnership bool) (*models.Message, error) {
	trimmedContent := strings.TrimSpace(content)
	if trimmedContent == "" {
		return nil, ErrEmptyMessageContent
	}

	message, err := s.GetMessage(roomID, messageID)
	if err != nil {
		return nil, err
	}
	if enforceOwnership && message.User != user {
		return nil, ErrMessageNotOwned
	}

	message.Content = trimmedContent
	message.Edited = true
	message.Updated = time.Now().Unix()

	collection := s.db.Database("chat").Collection("messages")
	_, err = collection.UpdateOne(
		context.TODO(),
		bson.M{"_id": messageID, "room_id": roomID},
		bson.M{"$set": bson.M{"content": message.Content, "edited": message.Edited, "updated": message.Updated}},
	)
	if err != nil {
		return nil, err
	}

	return message, nil
}

func (s *MessageService) DeleteMessage(roomID, messageID, user string) (*models.Message, error) {
	return s.deleteMessage(roomID, messageID, user, true)
}

func (s *MessageService) DeleteMessageForce(roomID, messageID string) (*models.Message, error) {
	return s.deleteMessage(roomID, messageID, "", false)
}

func (s *MessageService) deleteMessage(roomID, messageID, user string, enforceOwnership bool) (*models.Message, error) {
	message, err := s.GetMessage(roomID, messageID)
	if err != nil {
		return nil, err
	}
	if enforceOwnership && message.User != user {
		return nil, ErrMessageNotOwned
	}

	collection := s.db.Database("chat").Collection("messages")
	result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": messageID, "room_id": roomID})
	if err != nil {
		return nil, err
	}
	if result.DeletedCount == 0 {
		return nil, ErrMessageNotFound
	}

	return message, nil
}

// SetMessagePinned sets the pinned flag; enforceOwnership requires message author to match user.
func (s *MessageService) SetMessagePinned(roomID, messageID, user string, pinned bool, enforceOwnership bool) (*models.Message, error) {
	message, err := s.GetMessage(roomID, messageID)
	if err != nil {
		return nil, err
	}
	if enforceOwnership && message.User != user {
		return nil, ErrMessageNotOwned
	}

	collection := s.db.Database("chat").Collection("messages")
	_, err = collection.UpdateOne(
		context.TODO(),
		bson.M{"_id": messageID, "room_id": roomID},
		bson.M{"$set": bson.M{"pinned": pinned}},
	)
	if err != nil {
		return nil, err
	}
	message.Pinned = pinned
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

// CountDistinctUsersByRoomIDs returns, for each room ID, the number of distinct message authors in that room.
func (s *MessageService) CountDistinctUsersByRoomIDs(roomIDs []string) (map[string]int, error) {
	out := make(map[string]int)
	if len(roomIDs) == 0 {
		return out, nil
	}

	collection := s.db.Database("chat").Collection("messages")
	// $addToSet + $size avoids fragile nested $_id paths across MongoDB/driver versions.
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"room_id": bson.M{"$in": roomIDs}}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   "$room_id",
			"users": bson.M{"$addToSet": "$user"},
		}}},
		bson.D{{Key: "$project", Value: bson.M{
			"count": bson.M{"$size": "$users"},
		}}},
	}

	cursor, err := collection.Aggregate(context.TODO(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	type aggRow struct {
		ID    string `bson:"_id"`
		Count int    `bson:"count"`
	}

	for cursor.Next(context.TODO()) {
		var row aggRow
		if err := cursor.Decode(&row); err != nil {
			return nil, err
		}
		out[row.ID] = row.Count
	}

	return out, cursor.Err()
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
