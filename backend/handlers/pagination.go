package handlers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func parseSearchQuery(c *gin.Context) string {
	return strings.TrimSpace(c.Query("q"))
}

// parsePageLimit reads page (default 1) and limit (default 20, max 100).
func parsePageLimit(c *gin.Context) (page, limit int) {
	page = 1
	limit = 20

	if v := strings.TrimSpace(c.Query("page")); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	}
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 {
			limit = l
			if limit > 100 {
				limit = 100
			}
		}
	}
	return page, limit
}
