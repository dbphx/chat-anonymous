package models

import (
	"context"
	"log"
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// InitDB initializes and returns a MongoDB connection
func InitDB() (*mongo.Client, error) {
	// Get MongoDB connection string from environment variable
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI environment variable is not set")
	}

	// Create a new client and connect to the server
	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, err
	}

	// Send a ping to confirm a successful connection
	ctx := context.TODO()
	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, err
	}

	log.Println("Connected to MongoDB successfully!")
	return client, nil
}

// CloseDB closes the MongoDB connection
func CloseDB(client *mongo.Client) {
	if client != nil {
		err := client.Disconnect(context.TODO())
		if err != nil {
			log.Println("Error disconnecting from MongoDB:", err)
		} else {
			log.Println("Disconnected from MongoDB successfully!")
		}
	}
}
