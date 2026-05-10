package handlers

import (
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"chat-anonymous/backend/cache"
	"chat-anonymous/backend/httpcache"
	"chat-anonymous/backend/storage"

	"github.com/gin-gonic/gin"
)

// CachedMinIOImage đọc ảnh từ MinIO, cache Redis — GET/HEAD /api/media/image/*filepath
func CachedMinIOImage() gin.HandlerFunc {
	return func(c *gin.Context) {
		rel := strings.TrimPrefix(c.Param("filepath"), "/")
		key := filepath.Base(rel)
		if key == "" || key == "." || strings.Contains(rel, "..") {
			c.Status(http.StatusNotFound)
			return
		}

		if cache.Enabled() {
			if blob, ct, ok := cache.GetImageBlob(key); ok {
				writeImageCachedResponse(c, blob, ct)
				return
			}
		}

		data, ct, err := storage.FetchMinIOImageObject(c.Request.Context(), key)
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}

		if cache.Enabled() {
			cache.SetImageBlob(key, data, ct)
		}
		writeImageCachedResponse(c, data, ct)
	}
}

func writeImageCachedResponse(c *gin.Context, blob []byte, ct string) {
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
