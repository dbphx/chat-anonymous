package models

import (
	"fmt"
	"math/rand"
	"time"
)

// Room represents a chat room
type Room struct {
	ID       string `json:"id" bson:"_id,omitempty"`
	Name     string `json:"name" bson:"name"`
	Password string `json:"password" bson:"password"`
	Created  int64  `json:"created" bson:"created"`
}

// Message represents a chat message
type Message struct {
	ID      string       `json:"id" bson:"_id,omitempty"`
	RoomID  string       `json:"room_id" bson:"room_id"`
	User    string       `json:"user" bson:"user"`
	Content string       `json:"content" bson:"content"`
	File    *MessageFile `json:"file,omitempty" bson:"file,omitempty"`
	Created int64        `json:"created" bson:"created"`
}

type MessageFile struct {
	Name        string `json:"name" bson:"name"`
	URL         string `json:"url" bson:"url"`
	Size        int64  `json:"size" bson:"size"`
	ContentType string `json:"content_type" bson:"content_type"`
}

// NewRoom creates a new room with current timestamp
func NewRoom(name, password string) *Room {
	return &Room{
		ID:       NewID("room"),
		Name:     name,
		Password: password,
		Created:  time.Now().Unix(),
	}
}

// NewMessage creates a new message with current timestamp
func NewMessage(roomID, user, content string, file *MessageFile) *Message {
	return &Message{
		ID:      NewID("msg"),
		RoomID:  roomID,
		User:    user,
		Content: content,
		File:    file,
		Created: time.Now().Unix(),
	}
}

func NewID(prefix string) string {
	return fmt.Sprintf("%s-%d-%06d", prefix, time.Now().UnixNano(), rand.Intn(1000000))
}
