package cache

import (
	"context"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// Rdb client Redis (nil nếu không cấu hình REDIS_ADDR).
var Rdb *redis.Client

// InitFromEnv kết nối Redis; để trống REDIS_ADDR → không dùng cache.
func InitFromEnv() error {
	addr := strings.TrimSpace(os.Getenv("REDIS_ADDR"))
	if addr == "" {
		return nil
	}
	Rdb = redis.NewClient(&redis.Options{Addr: addr})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return Rdb.Ping(ctx).Err()
}

// Enabled — Redis đã kết nối.
func Enabled() bool {
	return Rdb != nil
}

const imgTTL = 48 * time.Hour

func imgBinKey(objectKey string) string {
	return "img:v1:" + objectKey + ":bin"
}

func imgCtKey(objectKey string) string {
	return "img:v1:" + objectKey + ":ct"
}

// GetImageBlob trả về body + Content-Type đã cache.
func GetImageBlob(objectKey string) ([]byte, string, bool) {
	if Rdb == nil || objectKey == "" {
		return nil, "", false
	}
	ctx := context.Background()
	blob, err := Rdb.Get(ctx, imgBinKey(objectKey)).Bytes()
	if err != nil || len(blob) == 0 {
		return nil, "", false
	}
	ct, err := Rdb.Get(ctx, imgCtKey(objectKey)).Result()
	if err != nil || strings.TrimSpace(ct) == "" {
		ct = "application/octet-stream"
	}
	return blob, ct, true
}

// SetImageBlob lưu ảnh (object key = tên file trong uploads hoặc MinIO).
func SetImageBlob(objectKey string, blob []byte, contentType string) {
	if Rdb == nil || objectKey == "" || len(blob) == 0 {
		return
	}
	ctx := context.Background()
	pipe := Rdb.Pipeline()
	pipe.Set(ctx, imgBinKey(objectKey), blob, imgTTL)
	pipe.Set(ctx, imgCtKey(objectKey), contentType, imgTTL)
	_, _ = pipe.Exec(ctx)
}
