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
	"path"
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

func normalizeRoomSegment(roomID string) (string, error) {
	s := strings.TrimSpace(roomID)
	if s == "" {
		return "", errors.New("empty room id")
	}
	if strings.ContainsAny(s, `/\`) || strings.Contains(s, "..") {
		return "", errors.New("invalid room id")
	}
	return s, nil
}

func encodeURLPathSegments(segments ...string) string {
	enc := make([]string, len(segments))
	for i, s := range segments {
		enc[i] = url.PathEscape(s)
	}
	return strings.Join(enc, "/")
}

// SaveMultipartFile lưu file theo cấu trúc bucket/{roomID}/data/{fileKey}; trả URL client có thể GET.
func SaveMultipartFile(roomID string, fileHeader *multipart.FileHeader) (*models.MessageFile, error) {
	source, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer source.Close()

	normRoom, err := normalizeRoomSegment(roomID)
	if err != nil {
		return nil, err
	}

	filename := filepath.Base(fileHeader.Filename)
	filename = norm.NFC.String(filename)
	fileKey := fmt.Sprintf("%s-%s", models.NewID("file"), filename)
	if strings.Contains(fileKey, "/") || fileKey == "" {
		return nil, errors.New("invalid storage file key")
	}
	objectKey := path.Join(normRoom, "data", fileKey)

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
		destPath := filepath.Join(localDir, filepath.FromSlash(objectKey))
		if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
			return nil, err
		}
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
		relURL := "/" + encodeURLPathSegments(append([]string{"uploads"}, strings.Split(objectKey, "/")...)...)
		return &models.MessageFile{
			Name:        filename,
			URL:         relURL,
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
	base := strings.TrimSuffix(minioPublicBase.String(), "/")
	parts := strings.Split(objectKey, "/")
	var out []string
	for _, p := range parts {
		if p == "" {
			continue
		}
		out = append(out, url.PathEscape(p))
	}
	return base + "/" + strings.Join(out, "/")
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
	parts := strings.Split(key, "/")
	for i := range parts {
		dec, err := url.PathUnescape(parts[i])
		if err == nil {
			parts[i] = dec
		}
	}
	return strings.Join(parts, "/"), true
}

// resolveLocalUploadPath kiểm tra relWeb nằm trong uploadDir (chống path traversal).
func resolveLocalUploadPath(uploadDir, relWeb string) (absPath string, cacheKey string, baseName string, err error) {
	relWeb = strings.Trim(relWeb, "/")
	if relWeb == "" {
		return "", "", "", os.ErrNotExist
	}
	parts := strings.Split(relWeb, "/")
	var cleaned []string
	for _, p := range parts {
		if p == "" {
			continue
		}
		if p == ".." || strings.Contains(p, "..") {
			return "", "", "", os.ErrNotExist
		}
		dec, e := url.PathUnescape(p)
		if e != nil {
			dec = p
		}
		if strings.Contains(dec, "..") {
			return "", "", "", os.ErrNotExist
		}
		cleaned = append(cleaned, dec)
	}
	if len(cleaned) == 0 {
		return "", "", "", os.ErrNotExist
	}
	cacheKey = strings.Join(cleaned, "/")
	baseName = cleaned[len(cleaned)-1]

	full := filepath.Join(append([]string{uploadDir}, cleaned...)...)
	absUpload, err := filepath.Abs(uploadDir)
	if err != nil {
		return "", "", "", err
	}
	absFull, err := filepath.Abs(full)
	if err != nil {
		return "", "", "", err
	}
	sep := string(filepath.Separator)
	if absFull != absUpload && !strings.HasPrefix(absFull, absUpload+sep) {
		return "", "", "", os.ErrNotExist
	}
	return absFull, cacheKey, baseName, nil
}

// WebPathToObjectKey — đường dẫn sau /api/media/image/ hoặc tương đương → object key MinIO.
func WebPathToObjectKey(rel string) (string, bool) {
	rel = strings.Trim(rel, "/")
	if rel == "" || strings.Contains(rel, "..") {
		return "", false
	}
	parts := strings.Split(rel, "/")
	var out []string
	for _, p := range parts {
		if p == "" || p == "." {
			continue
		}
		if p == ".." || strings.Contains(p, "..") {
			return "", false
		}
		dec, err := url.PathUnescape(p)
		if err != nil {
			dec = p
		}
		if strings.Contains(dec, "..") {
			return "", false
		}
		out = append(out, dec)
	}
	if len(out) == 0 {
		return "", false
	}
	return strings.Join(out, "/"), true
}

func extractUploadsRelativePath(raw string) string {
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, "/uploads/") {
		return strings.TrimPrefix(raw, "/uploads/")
	}
	u, err := url.Parse(raw)
	if err != nil || u.Path == "" {
		return ""
	}
	idx := strings.Index(u.Path, "/uploads/")
	if idx < 0 {
		return ""
	}
	return strings.TrimPrefix(u.Path[idx+len("/uploads/"):], "/")
}

func deleteLocalByURL(raw string) error {
	storedRel := extractUploadsRelativePath(raw)
	if storedRel == "" {
		return nil
	}
	dir := localDir
	if dir == "" {
		dir = filepath.Clean("uploads")
	}
	absPath, _, _, err := resolveLocalUploadPath(dir, storedRel)
	if err != nil {
		legacy := filepath.Join(dir, filepath.Base(storedRel))
		err := os.Remove(legacy)
		if err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
		return nil
	}
	err = os.Remove(absPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}
