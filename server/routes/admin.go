package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/khayrultw/go-judge/controllers"
	"github.com/khayrultw/go-judge/middleware"
)

// RegisterAdminRoutes registers all admin-only routes under /api/admin
func RegisterAdminRoutes(rg *gin.RouterGroup) {
	// All admin routes require authentication and admin privileges
	admin := rg.Group("/admin", middleware.RequireAuth, middleware.RequireAdmin)
	{
		// User management
		userController := controllers.NewUserController()
		admin.POST("/users", userController.CreateUser)
		admin.GET("/users", userController.ListUsers)
		admin.GET("/users/search", userController.SearchUsers)
		admin.GET("/users/stats", userController.GetUserStats)
		admin.GET("/users/:userId", userController.GetUser)
		admin.PUT("/users/:userId", userController.UpdateUser)
		admin.PATCH("/users/:userId", userController.UpdateUser)
		admin.PUT("/users/:userId/password", userController.UpdateUserPassword)
		admin.DELETE("/users/:userId", userController.DeleteUser)
		admin.POST("/users/:userId/restore", userController.RestoreUser)
		admin.DELETE("/users/:userId/permanent", userController.PermanentDeleteUser)

		// Contest management (admin-specific)
		contestController := controllers.NewContestController()
		admin.POST("/contests", contestController.CreateContest)
		admin.PUT("/contests/:contestId", contestController.UpdateContest)
		admin.DELETE("/contests/:contestId", contestController.DeleteContest)
		admin.GET("/contests/:contestId/problems", contestController.GetContestProblems)

		// Problem management (admin-specific)
		problemController := controllers.NewProblemController()
		admin.POST("/problems", problemController.CreateProblem)
		admin.PUT("/problems/:problemId", problemController.UpdateProblem)
		admin.DELETE("/problems/:problemId", problemController.DeleteProblem)

		// Submission management (admin-specific)
		submissionController := controllers.NewSubmissionController()
		admin.GET("/submissions", submissionController.ListAllSubmissions)
		admin.DELETE("/submissions/:submissionId", submissionController.DeleteSubmission)
		admin.POST("/submissions/:submissionId/restore", submissionController.RestoreSubmission)
		admin.DELETE("/submissions/:submissionId/permanent", submissionController.PermanentDeleteSubmission)
		admin.POST("/submissions/:submissionId/rejudge", submissionController.RejudgeSubmission)
		admin.PATCH("/submissions/:submissionId/manual-judge", submissionController.ManualJudgeSubmission)

		// Password reset token management
		resetController := controllers.NewResetController()
		admin.GET("/reset-tokens", resetController.ListResetTokens)
		admin.DELETE("/reset-tokens/:id", resetController.RevokeResetToken)
	}
}
