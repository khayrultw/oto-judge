package middleware

import (
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	rateMu       sync.Mutex
	rateVisitors = make(map[string]*visitor)
	rateOnce     sync.Once

	cooldownMu   sync.Mutex
	cooldownEnds = make(map[string]time.Time)
	cooldownOnce sync.Once
)

func getClientKey(c *gin.Context) string {
	return "ip:" + c.ClientIP()
}

// normalizeKey converts supported numeric user ID types into a stable map key.
// Unsupported or negative values return an empty string.
func normalizeKey(v interface{}) string {
	switch value := v.(type) {
	case uint:
		return "user:" + itoa(uint64(value))
	case uint64:
		return "user:" + itoa(value)
	case int:
		if value >= 0 {
			return "user:" + itoa(uint64(value))
		}
	case int64:
		if value >= 0 {
			return "user:" + itoa(uint64(value))
		}
	}
	return ""
}

// itoa converts an unsigned integer to its base-10 string form.
// This keeps key generation lightweight without importing strconv.
func itoa(n uint64) string {
	if n == 0 {
		return "0"
	}
	buf := [20]byte{}
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

// userCooldownKey returns the per-user cooldown key when authenticated.
// If no user is in context, it returns an empty string.
func userCooldownKey(c *gin.Context) string {
	if userID, exists := c.Get("userId"); exists {
		return normalizeKey(userID)
	}
	return ""
}

// startRateCleanup launches a background cleanup loop once.
// It periodically removes idle per-IP token buckets to cap memory usage.
func startRateCleanup() {
	rateOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(2 * time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				cutoff := time.Now().Add(-10 * time.Minute)
				rateMu.Lock()
				for key, v := range rateVisitors {
					if v.lastSeen.Before(cutoff) {
						delete(rateVisitors, key)
					}
				}
				rateMu.Unlock()
			}
		}()
	})
}

// startCooldownCleanup launches a background cleanup loop once.
// It periodically removes expired cooldown entries from the map.
func startCooldownCleanup() {
	cooldownOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(30 * time.Second)
			defer ticker.Stop()
			for range ticker.C {
				now := time.Now()
				cooldownMu.Lock()
				for key, endAt := range cooldownEnds {
					if !endAt.After(now) {
						delete(cooldownEnds, key)
					}
				}
				cooldownMu.Unlock()
			}
		}()
	})
}

// RateLimiter applies per-IP token-bucket rate limiting.
// rps controls refill rate and burst controls short spike allowance.
func RateLimiter(rps float64, burst int) gin.HandlerFunc {
	startRateCleanup()

	return func(c *gin.Context) {
		key := getClientKey(c)

		rateMu.Lock()
		v, exists := rateVisitors[key]
		if !exists {
			v = &visitor{limiter: rate.NewLimiter(rate.Limit(rps), burst)}
			rateVisitors[key] = v
		}
		v.lastSeen = time.Now()
		allowed := v.limiter.Allow()
		rateMu.Unlock()

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// CooldownLimiter enforces a fixed minimum interval between requests.
// A request is blocked if either the caller IP or authenticated user is still cooling down.
func CooldownLimiter(cooldown time.Duration) gin.HandlerFunc {
	startCooldownCleanup()

	return func(c *gin.Context) {
		now := time.Now()
		keys := []string{getClientKey(c)}
		if userKey := userCooldownKey(c); userKey != "" {
			keys = append(keys, userKey)
		}

		cooldownMu.Lock()
		var longestWait float64
		for _, key := range keys {
			if endAt, exists := cooldownEnds[key]; exists && endAt.After(now) {
				wait := endAt.Sub(now).Seconds()
				if wait > longestWait {
					longestWait = wait
				}
			}
		}

		if longestWait > 0 {
			cooldownMu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":               "cooldown active",
				"retry_after_seconds": int(math.Ceil(longestWait)),
			})
			c.Abort()
			return
		}

		nextAllowed := now.Add(cooldown)
		for _, key := range keys {
			cooldownEnds[key] = nextAllowed
		}
		cooldownMu.Unlock()

		c.Next()
	}
}
