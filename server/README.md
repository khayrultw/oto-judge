# go-judge

A competitive programming judge system built with Go and Gin framework.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Admin Panel**: Comprehensive admin interface for managing users, contests, problems, and submissions
- **Contest Management**: Create and manage programming contests with time-based access control
- **Problem Management**: Create problems with testcase files and manage problem visibility
- **Submission System**: Submit code in multiple languages (Python, JavaScript, Java, C++, Kotlin, Go)
- **Real-time Updates**: SSE (Server-Sent Events) for live submission updates and standings
- **Soft Delete**: User and submission records can be soft deleted for data retention
- **Access Control**: Fine-grained permissions based on user role and contest timing

## Architecture

### Authentication & Authorization

- **JWT Tokens**: All authenticated requests require a valid JWT token in the Authorization header
- **Role-Based Access**: Users have either "user" or "admin" role
- **DB-Backed Admin Check**: Admin status is verified from the database, not just JWT claims
- **Admin Routes**: All admin operations are under `/api/admin` with RequireAuth + RequireAdmin middleware

### API Structure

```
/api
├── /register               # Public registration (creates regular users)
├── /login                  # Public login
├── /me                     # Get current user info
├── /logout                 # Logout (client-side token removal)
├── /contests               # Contest operations (authenticated users)
├── /problem                # Problem access (time-gated for non-admins)
├── /submissions            # User submissions
└── /admin                  # Admin-only operations
    ├── /users              # User management
    ├── /contests           # Contest CRUD
    ├── /problems           # Problem CRUD
    └── /submissions        # Submission management
```

## Admin Features

### User Management

Admins can perform full CRUD operations on users:

- **Create User**: `POST /api/admin/users` - Create users with optional admin flag
- **List Users**: `GET /api/admin/users` - Paginated list with optional `include_deleted` flag
- **Get User**: `GET /api/admin/users/:userId` - View specific user details
- **Update User**: `PUT /api/admin/users/:userId` - Update name, email, password, or admin status
- **Delete User**: `DELETE /api/admin/users/:userId` - Soft delete user

### Contest Management

- **Create Contest**: `POST /api/admin/contests`
- **Update Contest**: `PUT /api/admin/contests/:contestId`
- **Delete Contest**: `DELETE /api/admin/contests/:contestId` (hard delete)
- **List Problems**: `GET /api/admin/contests/:contestId/problems`

### Problem Management

- **Create Problem**: `POST /api/admin/problems` - With testcase file
- **Update Problem**: `PUT /api/admin/problems/:problemId` - Including testcase replacement via `testcase_text` field
- **Delete Problem**: `DELETE /api/admin/problems/:problemId` (hard delete)

### Submission Management

- **List All Submissions**: `GET /api/admin/submissions` - With filters:
  - `contest_id`: Filter by contest
  - `user_id`: Filter by user
  - `status`: Filter by submission status
  - `language`: Filter by programming language
  - `start_date`, `end_date`: Date range filter (RFC3339 format)
  - `page`, `page_size`: Pagination
- **Delete Submission**: `DELETE /api/admin/submissions/:submissionId` - Soft delete
- **Rejudge Submission**: `POST /api/admin/submissions/:submissionId/rejudge` - Rerun judge

## Access Control Rules

### Contest Visibility

- **Before Start**:
  - Regular users: Can see contest metadata only (no problems)
  - Admins: Can see full contest including problems
- **During/After Contest**:
  - All authenticated users can see problems
  - TestCasePath is hidden from non-admins

### Problem Access

- **Before Contest Start**: Only admins can access problems
- **After Contest Start**: All authenticated users can access problems
- **TestCasePath**: Never exposed to non-admins

### Submission Visibility

- **Own Submissions**: Users can always view their own submissions
- **Other Users' Submissions**: Only admins can view
- **All Contest Submissions** (REST & SSE):
  - During contest: Admin only
  - After contest: All authenticated users

### SSE (Server-Sent Events)

SSE endpoints use the same JWT auth as the rest of the API. Browser clients rely on the HttpOnly auth cookie set during login, and non-browser clients can send the usual `Authorization: Bearer <token>` header:

- `/api/contests/:contestId/sse` - All contest submissions (admin only during contest)
- `/api/contests/:contestId/sse/my` - User's own contest submissions
- `/api/contests/standings/sse/:contestId` - Contest standings
- `/api/submissions/sse/my` - User's all submissions

## Soft Delete

- **User**: Soft deleted with `deleted_at` timestamp
- **Submission**: Soft deleted with `deleted_at` timestamp
- **Contest & Problem**: Hard deleted (permanent removal)

Admin can view soft-deleted records with `include_deleted=true` query parameter.

## Data Transfer Objects (DTOs)

All endpoints use typed request/response structures with validation:

- **LoginRequest**: Email (required, valid email), Password (required, min 5 chars)
- **RegisterRequest**: Name, Email, Password
- **CreateUserRequest**: Name, Email, Password, IsAdmin
- **UpdateUserRequest**: Optional fields for partial updates
- **SubmitCodeRequest**: SourceCode (required), Language (required, enum)
- **UpdateProblemRequest**: Title, Statement, TestcaseText (for testcase replacement)

### Validation

All DTOs include binding and validation tags. Invalid requests return:

```json
{
  "error": "validation_failed",
  "fields": {
    "details": "specific validation error message"
  }
}
```

## Security Features

1. **Password Hashing**: bcrypt with cost factor 14
2. **JWT Expiration**: 24 hours
3. **Admin Verification**: DB-backed, not just token claims
4. **Time-Based Guards**: Contest timing enforced for non-admins
5. **Action Logging**: Admin actions logged with actor ID, action, and target
6. **Input Validation**: All inputs validated with binding tags
7. **Sanitized Responses**: Internal paths and sensitive data hidden from non-admins

## Time-Based Access Helpers

Utility functions for contest timing:

- `IsContestStarted(contest)`: Check if contest has begun
- `IsContestEnded(contest)`: Check if contest has ended
- `IsContestOngoing(contest)`: Check if contest is currently running
- `GetContestEndTime(contest)`: Calculate contest end time

All times are handled in UTC.

## Database Schema

### Models with Soft Delete

- **User**: `id`, `name`, `email`, `password`, `is_admin`, `created_at`, `deleted_at`
- **Submission**: `id`, `user_id`, `problem_id`, `contest_id`, `source_code`, `language`, `status`, `message`, `created_at`, `deleted_at`

### Models with Hard Delete

- **Contest**: `id`, `title`, `start_time`, `duration`, `created_at`
- **Problem**: `id`, `contest_id`, `title`, `statement`, `test_case_path`, `problem_number`, `created_at`

## Testing

Use the provided `test.rest` file with REST Client extension in VS Code. The file includes:

- Authentication tests (login, register, get user)
- Admin user management tests (CRUD operations)
- Contest management tests (create, update, delete, visibility)
- Problem management tests (create, update with testcase replacement, delete)
- Submission tests (submit, list, filters, rejudge)
- Access control tests (verify permission boundaries)
- Validation tests (invalid inputs)
- SSE endpoint examples

## Setup

1. Configure database connection in config file
2. Run migrations: `go run main.go` (AutoMigrate runs on startup)
3. Create an admin user manually in database or via admin creation endpoint
4. Use test.rest to verify all functionality

## Environment Variables

Configure via config file:
- `DBHost`, `DBUser`, `DBPassword`, `DBName`, `DBPort`
- `JWTSecret`

## Development Notes

- All admin actions are logged to stdout with actor, action, and target
- Source code is included in admin submission queries but excluded for regular users during contests
- Pagination defaults: page_size=50, max=200
- Contest duration is in minutes
- Testcase files stored in `store/test_cases/contest_<id>/`

## Future Enhancements

- Rate limiting on admin routes (implement at gateway/reverse proxy level)
- More granular permissions (e.g., contest organizers)
- Bulk operations for admin
- Export functionality for submissions and standings
- WebSocket alternative to SSE for better client support
