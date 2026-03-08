package utils

import (
	"time"

	"github.com/khayrultw/go-judge/models"
)

// IsContestStarted checks if a contest has started
func IsContestStarted(contest *models.Contest) bool {
	now := time.Now().UTC()
	return contest.StartTime.Time.Before(now) || contest.StartTime.Time.Equal(now)
}

// IsContestEnded checks if a contest has ended
func IsContestEnded(contest *models.Contest) bool {
	now := time.Now().UTC()
	endTime := contest.StartTime.Time.Add(time.Duration(contest.Duration) * time.Minute)
	return now.After(endTime)
}

// IsContestOngoing checks if a contest is currently ongoing
func IsContestOngoing(contest *models.Contest) bool {
	return IsContestStarted(contest) && !IsContestEnded(contest)
}

// GetContestEndTime returns the end time of a contest
func GetContestEndTime(contest *models.Contest) time.Time {
	return contest.StartTime.Time.Add(time.Duration(contest.Duration) * time.Minute)
}
