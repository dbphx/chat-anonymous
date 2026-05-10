package storage

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/minio/minio-go/v7"
)

// MaxCachedImageBytes — giới hạn ảnh lưu Redis (proxy + local cache).
const MaxCachedImageBytes = 15 << 20

// IsMinIO — đang dùng object store S3.
func IsMinIO() bool {
	return mode == ModeMinIO
}

// FetchMinIOImageObject tải object; chỉ trả về nếu Content-Type là image/* và kích thước trong giới hạn.
func FetchMinIOImageObject(ctx context.Context, objectKey string) ([]byte, string, error) {
	if strings.TrimSpace(objectKey) == "" || strings.Contains(objectKey, "..") {
		return nil, "", errors.New("invalid key")
	}
	if mode != ModeMinIO || minioClient == nil {
		return nil, "", errors.New("minio not configured")
	}
	obj, err := minioClient.GetObject(ctx, minioBucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", err
	}
	defer obj.Close()

	st, err := obj.Stat()
	if err != nil {
		return nil, "", err
	}
	if st.Size > MaxCachedImageBytes {
		return nil, "", errors.New("object too large")
	}
	r := io.LimitReader(obj, MaxCachedImageBytes+1)
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, "", err
	}
	if int64(len(data)) > MaxCachedImageBytes {
		return nil, "", errors.New("object too large")
	}
	ct := strings.TrimSpace(st.ContentType)
	if ct == "" {
		ct = http.DetectContentType(data)
	}
	if !strings.HasPrefix(strings.ToLower(ct), "image/") {
		return nil, "", errors.New("not an image")
	}
	return data, ct, nil
}
