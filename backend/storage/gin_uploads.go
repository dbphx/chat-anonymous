package storage

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"chat-anonymous/backend/cache"
	"chat-anonymous/backend/httpcache"

	"github.com/gin-gonic/gin"
	"golang.org/x/text/unicode/norm"
)

// GinLocalUploads phục vụ GET/HEAD /uploads/* khi lưu file trên đĩa (Unicode NFC/NFD).
func GinLocalUploads() gin.HandlerFunc {
	return ServeUploadsFromDir(localDir)
}

func isImageBasename(name string) bool {
	lower := strings.ToLower(name)
	for _, ext := range []string{
		".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".heic", ".heif",
	} {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

func ginServeCachedBytes(c *gin.Context, blob []byte, ct string) {
	etag := httpcache.ETagFromBytes(blob)
	httpcache.ApplyImmutableImageCacheHeaders(c.Writer.Header())
	c.Header("ETag", etag)
	if httpcache.ShouldReturn304IfNoneMatch(c.Request, etag) {
		c.Status(http.StatusNotModified)
		return
	}
	if c.Request.Method == http.MethodHead {
		c.Header("Content-Type", ct)
		c.Header("Content-Length", strconv.Itoa(len(blob)))
		c.Status(http.StatusOK)
		return
	}
	c.Data(http.StatusOK, ct, blob)
}

// ServeUploadsFromDir phục vụ file local; ảnh nhỏ được cache Redis (REDIS_ADDR).
func ServeUploadsFromDir(uploadDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		rel := strings.TrimPrefix(c.Param("filepath"), "/")
		absPath, cacheKey, name, err := resolveLocalUploadPath(uploadDir, rel)
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		if name == "." || name == "" {
			c.Status(http.StatusNotFound)
			return
		}

		if cache.Enabled() && isImageBasename(name) {
			if blob, ct, ok := cache.GetImageBlob(cacheKey); ok {
				ginServeCachedBytes(c, blob, ct)
				return
			}
		}

		f, err := os.Open(absPath)
		if err != nil {
			f, err = openUploadWithUnicodeFallback(filepath.Dir(absPath), filepath.Base(absPath))
			if err != nil {
				c.Status(http.StatusNotFound)
				return
			}
		}

		fi, err := f.Stat()
		if err != nil {
			f.Close()
			c.Status(http.StatusNotFound)
			return
		}

		modTime := fi.ModTime()
		size := fi.Size()

		tryRedisFill := cache.Enabled() && isImageBasename(name) && size > 0 && size <= MaxCachedImageBytes

		if tryRedisFill {
			body, errRead := io.ReadAll(f)
			f.Close()
			if errRead == nil && int64(len(body)) == size {
				ct := http.DetectContentType(body)
				if strings.HasPrefix(ct, "image/") {
					cache.SetImageBlob(cacheKey, body, ct)
					ginServeCachedBytes(c, body, ct)
					return
				}
			}
			f, err = os.Open(absPath)
			if err != nil {
				f, err = openUploadWithUnicodeFallback(filepath.Dir(absPath), filepath.Base(absPath))
				if err != nil {
					c.Status(http.StatusNotFound)
					return
				}
			}
			defer f.Close()
			fi, err = f.Stat()
			if err != nil {
				c.Status(http.StatusNotFound)
				return
			}
			modTime = fi.ModTime()
		} else {
			defer f.Close()
		}

		if isImageBasename(name) {
			etag := httpcache.ETagFromFileIdentity(modTime, size)
			httpcache.ApplyImmutableImageCacheHeaders(c.Writer.Header())
			c.Header("ETag", etag)
			if httpcache.ShouldReturn304IfNoneMatch(c.Request, etag) {
				c.Status(http.StatusNotModified)
				return
			}
		}

		http.ServeContent(c.Writer, c.Request, name, modTime, f)
	}
}

func openUploadWithUnicodeFallback(dir, name string) (*os.File, error) {
	seen := make(map[string]bool)
	candidates := []string{
		name,
		norm.NFC.String(name),
		norm.NFD.String(name),
	}
	for _, cand := range candidates {
		base := filepath.Base(cand)
		if base == "" || base == "." || seen[base] {
			continue
		}
		seen[base] = true
		p := filepath.Join(dir, base)
		f, err := os.Open(p)
		if err == nil {
			return f, nil
		}
	}
	return nil, os.ErrNotExist
}
