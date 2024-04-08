package judge

import (
	"github.com/khayrultw/go-judge/models"
	"gorm.io/gorm"
)

func RunTest(db *gorm.DB, code models.Code) {
	status := JudgeCode("store/"+code.SourceCode, "judge/test/test.txt")
	code.Status = status
	db.Model(&code).Update("status", status)
}
