package judge

import (
	"github.com/khayrultw/go-judge/models"
	"github.com/khayrultw/go-judge/utils"
	"gorm.io/gorm"
)

func RunTest(db *gorm.DB, submission models.Submission, problem models.Problem) {
	result := JudgeCode(submission.SourceCode, problem.TestCasePath, submission.Language)
	if problem.IsSpecial && result.Status == "PASS" {
		submission.Status = "PENDING_CODE_REVIEW"
		submission.Message = "Pending Code Review"
	} else {
		submission.Status = result.Status
		submission.Message = result.Message
	}
	db.Model(&submission).Updates(map[string]interface{}{
		"status":  submission.Status,
		"message": submission.Message,
	})
	utils.GetBroadcaster().Publish("all_submissions", "new submission")
	utils.GetBroadcaster().Publish("mysubmissions", "new submission")
	utils.GetBroadcaster().Publish("standings", "new submission")
	utils.GetBroadcaster().Publish("contest_submissions", "new submission")
	utils.GetBroadcaster().Publish("my_contest_submissions", "new submission")
}
