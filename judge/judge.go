package judge

import (
	"github.com/khayrultw/go-judge/models"
	"gorm.io/gorm"
)

func RunTest(db *gorm.DB, submission models.Submission, problem models.Problem) {
	result := JudgeCode("store/solutions/"+submission.SourceCode, problem.TestCasePath)
	submission.Status = result.Status
	submission.Message = result.Message
	db.Model(&submission).Updates(map[string]interface{}{
		"status":  result.Status,
		"message": result.Message,
	})
}
