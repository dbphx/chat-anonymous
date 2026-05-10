package services

import (
	"chat-anonymous/backend/models"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrInvalidRole = errors.New("invalid role")
var ErrAdminExists = errors.New("admin already exists")
var ErrUsernameExists = errors.New("username already exists")
var ErrUserNotFound = errors.New("user not found")
var ErrCannotDeleteLastAdmin = errors.New("cannot delete the last admin")
var ErrCannotDemoteLastAdmin = errors.New("cannot demote the last admin")
var ErrCannotDeleteSelf = errors.New("cannot delete the current admin account")
var ErrSessionNotFound = errors.New("session not found")
var ErrSessionExpired = errors.New("session expired")

const (
	adminUsersCollection    = "users"
	adminSessionsCollection = "admin_sessions"
	adminSessionDuration    = 7 * 24 * time.Hour
)

type AdminService struct {
	db *mongo.Client
}

func NewAdminService(db *mongo.Client) *AdminService {
	return &AdminService{db: db}
}

func (s *AdminService) BootstrapDefaultAdmin() error {
	collection := s.db.Database("chat").Collection(adminUsersCollection)
	count, err := collection.CountDocuments(context.TODO(), bson.M{"role": models.RoleAdmin})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	username := strings.TrimSpace(os.Getenv("ADMIN_USERNAME"))
	if username == "" {
		username = "admin"
	}
	if existing, err := s.findUserByUsername(username); err == nil {
		if strings.TrimSpace(os.Getenv("ADMIN_USERNAME")) != "" {
			return fmt.Errorf("admin username already exists: %s", existing.Username)
		}
		username = fmt.Sprintf("admin-%s", shortToken(4))
	}

	password := strings.TrimSpace(os.Getenv("ADMIN_PASSWORD"))
	generatedPassword := false
	if password == "" {
		password = shortToken(16)
		generatedPassword = true
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := models.NewAdminUser(username, string(hash), models.RoleAdmin)
	if _, err = collection.InsertOne(context.TODO(), user); err != nil {
		return err
	}

	if generatedPassword || strings.TrimSpace(os.Getenv("ADMIN_USERNAME")) == "" {
		logrus.Warnf("Bootstrapped admin credentials username=%s password=%s", username, password)
	}

	return nil
}

func shortToken(length int) string {
	if length <= 0 {
		length = 8
	}
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes)[:length]
}

func (s *AdminService) Login(username, password string) (*models.AdminUser, string, error) {
	username = strings.TrimSpace(username)
	password = strings.TrimSpace(password)

	user, err := s.findUserByUsername(username)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, "", ErrInvalidCredentials
		}
		return nil, "", err
	}

	if user.Role != models.RoleAdmin && user.Role != models.RoleMod {
		return nil, "", ErrInvalidCredentials
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return nil, "", ErrInvalidCredentials
	}

	token, tokenHash, err := newSessionToken()
	if err != nil {
		return nil, "", err
	}

	session := models.NewAdminSession(user, tokenHash, time.Now().Add(adminSessionDuration))
	if _, err := s.db.Database("chat").Collection(adminSessionsCollection).InsertOne(context.TODO(), session); err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *AdminService) Authenticate(token string) (*models.AdminUser, error) {
	trimmedToken := strings.TrimSpace(token)
	if trimmedToken == "" {
		return nil, ErrSessionNotFound
	}

	tokenHash := hashToken(trimmedToken)
	collection := s.db.Database("chat").Collection(adminSessionsCollection)
	var session models.AdminSession
	err := collection.FindOne(context.TODO(), bson.M{"token_hash": tokenHash}).Decode(&session)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}

	if session.ExpiresAt <= time.Now().Unix() {
		_, _ = collection.DeleteOne(context.TODO(), bson.M{"_id": session.ID})
		return nil, ErrSessionExpired
	}

	user, err := s.findUserByID(session.UserID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AdminService) ListUsers() ([]models.AdminUser, error) {
	collection := s.db.Database("chat").Collection(adminUsersCollection)
	findOptions := options.Find().SetSort(bson.M{"created": 1})
	cursor, err := collection.Find(context.TODO(), bson.M{"role": bson.M{"$in": []string{models.RoleMod, models.RoleAdmin}}}, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	users := make([]models.AdminUser, 0)
	if err := cursor.All(context.TODO(), &users); err != nil {
		return nil, err
	}
	return users, nil
}

// AdminUserListResult is a paginated admin/mod user list.
type AdminUserListResult struct {
	Items []models.AdminUser
	Total int64
	Page  int
	Limit int
}

// SearchAdminUsers filters mod/admin users by optional substring on username, role, or _id.
func (s *AdminService) SearchAdminUsers(query string, page, limit int) (*AdminUserListResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	roleFilter := bson.M{"role": bson.M{"$in": []string{models.RoleMod, models.RoleAdmin}}}
	var filter bson.M
	q := strings.TrimSpace(query)
	if q != "" {
		esc := regexp.QuoteMeta(q)
		rx := bson.M{"$regex": esc, "$options": "i"}
		filter = bson.M{
			"$and": []bson.M{
				roleFilter,
				{"$or": []bson.M{
					{"username": rx},
					{"role": rx},
					{"_id": rx},
				}},
			},
		}
	} else {
		filter = roleFilter
	}

	collection := s.db.Database("chat").Collection(adminUsersCollection)
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

	var items []models.AdminUser
	if err = cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []models.AdminUser{}
	}

	return &AdminUserListResult{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *AdminService) CreateUser(username, password, role string) (*models.AdminUser, error) {
	username = strings.TrimSpace(username)
	password = strings.TrimSpace(password)
	role = strings.TrimSpace(role)
	if username == "" || password == "" {
		return nil, ErrInvalidCredentials
	}
	if role != models.RoleMod && role != models.RoleAdmin {
		return nil, ErrInvalidRole
	}

	if _, err := s.findUserByUsername(username); err == nil {
		return nil, ErrUsernameExists
	} else if !errors.Is(err, ErrUserNotFound) {
		return nil, err
	}

	if role == models.RoleAdmin {
		count, err := s.db.Database("chat").Collection(adminUsersCollection).CountDocuments(context.TODO(), bson.M{"role": models.RoleAdmin})
		if err != nil {
			return nil, err
		}
		if count > 0 {
			return nil, ErrAdminExists
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := models.NewAdminUser(username, string(hash), role)
	_, err = s.db.Database("chat").Collection(adminUsersCollection).InsertOne(context.TODO(), user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser updates username, password (if non-empty), and/or role. Clears sessions for that user on success.
func (s *AdminService) UpdateUser(targetID, username, password, role string) (*models.AdminUser, error) {
	targetID = strings.TrimSpace(targetID)
	user, err := s.findUserByID(targetID)
	if err != nil {
		return nil, err
	}

	newUsername := strings.TrimSpace(username)
	newRole := strings.TrimSpace(role)
	password = strings.TrimSpace(password)

	if newUsername == "" {
		newUsername = user.Username
	} else if newUsername != user.Username {
		existing, lookupErr := s.findUserByUsername(newUsername)
		if lookupErr == nil && existing.ID != user.ID {
			return nil, ErrUsernameExists
		}
		if lookupErr != nil && !errors.Is(lookupErr, ErrUserNotFound) {
			return nil, lookupErr
		}
	}

	if newRole == "" {
		newRole = user.Role
	}
	if newRole != models.RoleMod && newRole != models.RoleAdmin {
		return nil, ErrInvalidRole
	}

	if user.Role == models.RoleAdmin && newRole == models.RoleMod {
		count, err := s.db.Database("chat").Collection(adminUsersCollection).CountDocuments(context.TODO(), bson.M{"role": models.RoleAdmin})
		if err != nil {
			return nil, err
		}
		if count <= 1 {
			return nil, ErrCannotDemoteLastAdmin
		}
	}

	if user.Role != models.RoleAdmin && newRole == models.RoleAdmin {
		count, err := s.db.Database("chat").Collection(adminUsersCollection).CountDocuments(context.TODO(), bson.M{"role": models.RoleAdmin})
		if err != nil {
			return nil, err
		}
		if count > 0 {
			return nil, ErrAdminExists
		}
	}

	setFields := bson.M{
		"username": newUsername,
		"role":     newRole,
		"updated":  time.Now().Unix(),
	}
	if password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		setFields["password_hash"] = string(hash)
	}

	ctx := context.TODO()
	_, err = s.db.Database("chat").Collection(adminUsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": setFields})
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	if password != "" {
		_, _ = s.db.Database("chat").Collection(adminSessionsCollection).DeleteMany(ctx, bson.M{"user_id": user.ID})
	} else {
		_, _ = s.db.Database("chat").Collection(adminSessionsCollection).UpdateMany(ctx, bson.M{"user_id": user.ID}, bson.M{
			"$set": bson.M{
				"username": newUsername,
				"role":     newRole,
				"updated":  now,
			},
		})
	}

	updated, err := s.findUserByID(user.ID)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *AdminService) DeleteUser(id, requesterID string) error {
	if strings.TrimSpace(id) == strings.TrimSpace(requesterID) {
		return ErrCannotDeleteSelf
	}

	user, err := s.findUserByID(id)
	if err != nil {
		return err
	}

	if user.Role == models.RoleAdmin {
		count, err := s.db.Database("chat").Collection(adminUsersCollection).CountDocuments(context.TODO(), bson.M{"role": models.RoleAdmin})
		if err != nil {
			return err
		}
		if count <= 1 {
			return ErrCannotDeleteLastAdmin
		}
	}

	ctx := context.TODO()
	_, _ = s.db.Database("chat").Collection(adminSessionsCollection).DeleteMany(ctx, bson.M{"user_id": id})
	result, err := s.db.Database("chat").Collection(adminUsersCollection).DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (s *AdminService) findUserByUsername(username string) (*models.AdminUser, error) {
	var user models.AdminUser
	err := s.db.Database("chat").Collection(adminUsersCollection).FindOne(context.TODO(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (s *AdminService) findUserByID(id string) (*models.AdminUser, error) {
	var user models.AdminUser
	err := s.db.Database("chat").Collection(adminUsersCollection).FindOne(context.TODO(), bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func newSessionToken() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	token := hex.EncodeToString(raw)
	return token, hashToken(token), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
