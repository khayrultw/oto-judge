package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// CustomTime handles multiple time formats automatically
type CustomTime struct {
	time.Time
}

// Common time formats
var timeFormats = []string{
	time.RFC3339,          // "2006-01-02T15:04:05Z07:00"
	time.RFC3339Nano,      // "2006-01-02T15:04:05.999999999Z07:00"
	"2006-01-02T15:04:05", // "2006-01-02T15:04:05"
	"2006-01-02T15:04",    // "2006-01-02T15:04"
	"2006-01-02 15:04:05", // "2006-01-02 15:04:05"
	"2006-01-02 15:04",    // "2006-01-02 15:04"
	"2006-01-02",          // "2006-01-02"
}

func (ct *CustomTime) UnmarshalJSON(data []byte) error {
	var timeStr string
	if err := json.Unmarshal(data, &timeStr); err != nil {
		return err
	}

	// Try each format
	for _, format := range timeFormats {
		if t, err := time.Parse(format, timeStr); err == nil {
			ct.Time = t
			return nil
		}
	}

	return fmt.Errorf("unable to parse time: %s", timeStr)
}

func (ct CustomTime) MarshalJSON() ([]byte, error) {
	return json.Marshal(ct.Time.Format(time.RFC3339))
}

func (ft *CustomTime) Scan(value interface{}) error {
	if value == nil {
		ft.Time = time.Time{}
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		ft.Time = v
		return nil
	case string:
		if v == "" {
			ft.Time = time.Time{}
			return nil
		}
		// Try to parse the string
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			ft.Time = t
			return nil
		}
		return fmt.Errorf("cannot parse time string: %s", v)
	default:
		return fmt.Errorf("cannot scan %T into FlexibleTime", value)
	}
}

func (ft CustomTime) Value() (driver.Value, error) {
	if ft.Time.IsZero() {
		return nil, nil
	}
	return ft.Time, nil
}
