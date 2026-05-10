package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"chat-anonymous/backend/models"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"golang.org/x/text/unicode/norm"
)

// Mode tách local vs MinIO.
type Mode int

const (
	ModeLocal Mode = iota
	ModeMinIO
)

var (
	mode            Mode
	localDir        string
	minioClient     *minio.Client
	minioBucket     string
	minioPublicBase *url.URL
)

// IsLocal — có phục vụ file qua /uploads trên API hay không.
func IsLocal() bool {
	return mode == ModeLocal
}

// InitFromEnv: không có MINIO_ENDPOINT → ghi đĩa ./uploads; có → MinIO S3.
func InitFromEnv() error {
	endpoint := strings.TrimSpace(os.Getenv("MINIO_ENDPOINT"))
	if endpoint == "" {
		mode = ModeLocal
		localDir = filepath.Clean("uploads")
		if err := os.MkdirAll(localDir, 0o755); err != nil {
			return fmt.Errorf("storage local mkdir: %w", err)
		}
		return nil
	}

	access := strings.TrimSpace(os.Getenv("MINIO_ACCESS_KEY"))
	secret := strings.TrimSpace(os.Getenv("MINIO_SECRET_KEY"))
	bucket := strings.TrimSpace(os.Getenv("MINIO_BUCKET"))
	publicRaw := strings.TrimSpace(os.Getenv("MINIO_PUBLIC_URL"))
	useSSL := strings.EqualFold(strings.TrimSpace(os.Getenv("MINIO_USE_SSL")), "true")

	if access == "" || secret == "" || bucket == "" || publicRaw == "" {
		return fmt.Errorf("MINIO_ENDPOINT set requires MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, MINIO_PUBLIC_URL")
	}

	pub, err := url.Parse(publicRaw)
	if err != nil || pub.Scheme == "" || pub.Host == "" {
		return fmt.Errorf("MINIO_PUBLIC_URL must be absolute URL (e.g. http://localhost:9000/chat-uploads)")
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(access, secret, ""),
		Secure: useSSL,
	})
	if err != nil {
		return fmt.Errorf("minio client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return fmt.Errorf("minio bucket check: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("minio make bucket: %w", err)
		}
	}

	if err := setPublicReadPolicy(ctx, client, bucket); err != nil {
		return err
	}

	mode = ModeMinIO
	minioClient = client
	minioBucket = bucket
	minioPublicBase = pub
	return nil
}

func setPublicReadPolicy(ctx context.Context, client *minio.Client, bucket string) error {
	policy := map[string]interface{}{
		"Version": "2012-10-17",
		"Statement": []interface{}{
			map[string]interface{}{
				"Effect":    "Allow",
				"Principal": map[string]interface{}{"AWS": []string{"*"}},
				"Action":    []string{"s3:GetObject"},
				"Resource":  []string{fmt.Sprintf("arn:aws:s3:::%s/*", bucket)},
			},
		},
	}
	b, err := json.Marshal(policy)
	if err != nil {
		return err
	}
	return client.SetBucketPolicy(ctx, bucket, string(b))
}

// SaveMultipartFile lưu file và trả URL client có thể GET (đường dẫn tương đối hoặc URL đầy đủ).
func SaveMultipartFile(fileHeader *multipart.FileHeader) (*models.MessageFile, error) {
	source, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer source.Close()

	filename := filepath.Base(fileHeader.Filename)
	filename = norm.NFC.String(filename)
	objectKey := fmt.Sprintf("%s-%s", models.NewID("file"), filename)

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	putSize := fileHeader.Size
	if putSize <= 0 {
		if seeker, ok := source.(io.Seeker); ok {
			end, _ := seeker.Seek(0, io.SeekEnd)
			_, _ = seeker.Seek(0, io.SeekStart)
			putSize = end
		}
		if putSize <= 0 {
			putSize = -1
		}
	}

	if mode == ModeLocal {
		destPath := filepath.Join(localDir, objectKey)
		dst, err := os.Create(destPath)
		if err != nil {
			return nil, err
		}
		defer dst.Close()
		if _, err := io.Copy(dst, source); err != nil {
			return nil, err
		}
		fi, err := dst.Stat()
		outSize := putSize
		if err == nil && fi != nil {
			outSize = fi.Size()
		}
		return &models.MessageFile{
			Name:        filename,
			URL:         "/uploads/" + objectKey,
			Size:        outSize,
			ContentType: contentType,
		}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	_, err = minioClient.PutObject(ctx, minioBucket, objectKey, source, putSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return nil, err
	}

	publicURL := objectPublicURL(objectKey)
	outSize := fileHeader.Size
	if outSize <= 0 {
		outSize = putSize
		if outSize < 0 {
			outSize = 0
		}
	}
	return &models.MessageFile{
		Name:        filename,
		URL:         publicURL,
		Size:        outSize,
		ContentType: contentType,
	}, nil
}

func objectPublicURL(objectKey string) string {
	base := minioPublicBase.String()
	base = strings.TrimSuffix(base, "/")
	return base + "/" + url.PathEscape(objectKey)
}

// DeleteByURL xóa object MinIO hoặc file local (/uploads/...).
func DeleteByURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	if mode == ModeMinIO && minioPublicBase != nil {
		u, err := url.Parse(raw)
		if err == nil && u.Scheme != "" && u.Host != "" {
			if key, ok := objectKeyFromPublicURL(u); ok {
				ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
				defer cancel()
				err := minioClient.RemoveObject(ctx, minioBucket, key, minio.RemoveObjectOptions{})
				if err != nil {
					er := minio.ToErrorResponse(err)
					if er.Code == "NoSuchKey" {
						return nil
					}
					return err
				}
				return nil
			}
		}
	}

	return deleteLocalByURL(raw)
}

func objectKeyFromPublicURL(u *url.URL) (string, bool) {
	pub := minioPublicBase
	if !strings.EqualFold(u.Scheme, pub.Scheme) || !strings.EqualFold(u.Host, pub.Host) {
		return "", false
	}
	prefix := strings.TrimSuffix(pub.Path, "/")
	p := u.Path
	if prefix != "" && !strings.HasPrefix(p, prefix) {
		return "", false
	}
	key := strings.TrimPrefix(p, prefix)
	key = strings.TrimPrefix(key, "/")
	if key == "" {
		return "", false
	}
	key, err := url.PathUnescape(key)
	if err != nil {
		key = strings.TrimPrefix(strings.TrimPrefix(p, prefix), "/")
	}
	return key, true
}

func deleteLocalByURL(raw string) error {
	storedName := strings.TrimPrefix(raw, "/uploads/")
	if storedName == "" || storedName == raw {
		u, err := url.Parse(raw)
		if err != nil || u.Path == "" {
			return nil
		}
		if idx := strings.Index(u.Path, "/uploads/"); idx >= 0 {
			storedName = u.Path[idx+len("/uploads/"):]
		} else {
			return nil
		}
	}
	dir := localDir
	if dir == "" {
		dir = filepath.Clean("uploads")
	}
	path := filepath.Join(dir, filepath.Base(storedName))
	err := os.Remove(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}
