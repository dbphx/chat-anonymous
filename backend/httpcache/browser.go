package httpcache

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// ImmutableImageCacheControl — URL upload thường bất biến (key không đổi nội dung).
const ImmutableImageCacheControl = "public, max-age=31536000, immutable"

// ApplyImmutableImageCacheHeaders thiết lập cache trình duyệt cho ảnh tĩnh.
func ApplyImmutableImageCacheHeaders(h http.Header) {
	h.Set("Cache-Control", ImmutableImageCacheControl)
}

// ETagFromBytes — strong ETag (SHA-256) khi đã có toàn bộ bytes trong RAM.
func ETagFromBytes(b []byte) string {
	sum := sha256.Sum256(b)
	return `"` + hex.EncodeToString(sum[:]) + `"`
}

// ETagFromFileIdentity — strong-enough validator khi chỉ có stat (không đọc file).
func ETagFromFileIdentity(modTime time.Time, size int64) string {
	return `"` + strconv.FormatInt(modTime.UnixNano(), 36) + "-" + strconv.FormatInt(size, 36) + `"`
}

// ShouldReturn304IfNoneMatch: true → handler chỉ cần trả 304, không gửi body.
func ShouldReturn304IfNoneMatch(r *http.Request, etag string) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}
	inm := strings.TrimSpace(r.Header.Get("If-None-Match"))
	if inm == "" {
		return false
	}
	if inm == "*" {
		return true
	}
	for _, part := range strings.Split(inm, ",") {
		t := strings.TrimSpace(part)
		if t == etag || stripQuotes(t) == stripQuotes(etag) {
			return true
		}
	}
	return false
}

func stripQuotes(s string) string {
	return strings.Trim(s, `"`)
}
