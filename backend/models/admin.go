package models

import "time"

const (
	RoleMod   = "mod"
	RoleAdmin = "admin"
)

type AdminUser struct {
	ID           string `json:"id" bson:"_id,omitempty"`
	Username     string `json:"username" bson:"username"`
	PasswordHash string `json:"-" bson:"password_hash"`
	Role         string `json:"role" bson:"role"`
	Created      int64  `json:"created" bson:"created"`
	Updated      int64  `json:"updated" bson:"updated"`
}

type AdminSession struct {
	ID        string `json:"id" bson:"_id,omitempty"`
	TokenHash string `json:"-" bson:"token_hash"`
	UserID    string `json:"user_id" bson:"user_id"`
	Username  string `json:"username" bson:"username"`
	Role      string `json:"role" bson:"role"`
	ExpiresAt int64  `json:"expires_at" bson:"expires_at"`
	Created   int64  `json:"created" bson:"created"`
	Updated   int64  `json:"updated" bson:"updated"`
}

func NewAdminUser(username, passwordHash, role string) *AdminUser {
	now := time.Now().Unix()
	return &AdminUser{
		ID:           NewID("admin"),
		Username:     username,
		PasswordHash: passwordHash,
		Role:         role,
		Created:      now,
		Updated:      now,
	}
}

func NewAdminSession(user *AdminUser, tokenHash string, expiresAt time.Time) *AdminSession {
	now := time.Now().Unix()
	return &AdminSession{
		ID:        NewID("session"),
		TokenHash: tokenHash,
		UserID:    user.ID,
		Username:  user.Username,
		Role:      user.Role,
		ExpiresAt: expiresAt.Unix(),
		Created:   now,
		Updated:   now,
	}
}
