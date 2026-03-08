# OTO Judge Server API Documentation

This document describes the HTTP API exposed by the OTO Judge server. The API uses JSON for request/response bodies unless otherwise specified. All times are UTC.

Base URL: http://localhost:8080

## Authentication

- Scheme: Bearer JWT in Authorization header
  - Header: `Authorization: Bearer <token>`
- Token issuance: `POST /api/login`
- Token contents: `{ user_id, role, exp }` (role is informational; admin is DB-verified)
- Required for all `/api/*` routes except `/api/login` and `/api/register`
- Admin-only routes are under `/api/admin` and require both `RequireAuth` and `RequireAdmin`

SSE endpoints accept token in query: `?q=<token>`

## Error shape

```
{
  "error": "error_code",
  "fields": { "details": "optional details" }
}
```

## Data Models (responses may be subsets)

- User: `{ id, name, email, is_admin, created_at }`
- Contest: `{ id, title, start_time, duration, created_at, problems? }`
- Problem: `{ id, title, contest_id, statement, problem_number, created_at }`
- Problem (admin): adds `{ test_case_path }`
- Submission: `{ id, user_id, problem_id, contest_id, language, status, message, created_at, source_code? }`
- Standing row: `{ rank, user_id, user_name, solved, penalty, problems: [{ problem_number, status, color, count }] }`

Status values include: `pending`, `PASS`, or failure codes set by judge.

---

## Auth Endpoints

### POST /api/register
Create a regular user.

Body:
```
{ name: string, email: string, password: string }
```
Responses:
- 201: `{ message: "User created successfully", user_id }`
- 400/409: ErrorResponse

### POST /api/login
Issue JWT token.

Body:
```
{ email: string, password: string }
```
Responses:
- 200: `{ id, name, email, role, token }`
- 400/404: ErrorResponse

### GET /api/me
Get current user profile.

Auth: Bearer

Responses:
- 200: `{ id, name, email, role }`
- 401: ErrorResponse

### GET /api/logout
No-op on server; client should discard token.

Auth: Bearer

Responses:
- 200: `{ msg }`

---

## Admin: Users
All paths under `/api/admin` require Bearer token and admin privileges.

### POST /api/admin/users
Create user (admin).

Body:
```
{ name, email, password, is_admin }
```
Responses:
- 201: `{ id, name, email, is_admin, created_at }`
- 409/400: ErrorResponse

### GET /api/admin/users
List users (paginated). Query: `page`, `page_size`, `include_deleted=true|false`.

Responses:
- 200: `{ users: [User], total, page }`

### GET /api/admin/users/:userId
Get a user.

Responses:
- 200: User
- 404: ErrorResponse

### PUT/PATCH /api/admin/users/:userId
Update a user. Body supports any of: `{ name, email, password, is_admin }`.

Responses:
- 200: User
- 409/400/404: ErrorResponse

### DELETE /api/admin/users/:userId
Soft delete a user.

Responses:
- 200: `{ message }`
- 404: ErrorResponse

---

## Contests

### GET /api/contests
List contests.

Auth: Bearer

Responses:
- 200: `[Contest]`

### GET /api/contests/upcomming
List upcoming contests (server-side now()).

Auth: Bearer

Responses:
- 200: `[Contest]`

### GET /api/contests/:contestId
Get a contest.

Auth: Bearer

Rules:
- If requester is non-admin and contest not started: returns metadata only (no `problems`)
- If started (or admin): returns `problems`; `test_case_path` is cleared for non-admins

Responses:
- 200: `ContestMetadataResponse | ContestResponse`
- 404: ErrorResponse

### GET /api/contests/:contestId/standings
Get computed standings (sorted, ranked).

Auth: Bearer

Responses:
- 200: `[UserStanding]`

### GET /api/contests/:contestId/submissions
List all submissions for a contest.

Auth: Bearer

Rules:
- During contest: admin only (403 for non-admins)
- After contest: allowed for all authenticated users
- Source code only included for admins

Responses:
- 200: `[SubmissionWithProblem]`
- 403/404: ErrorResponse

### GET /api/contests/:contestId/submissions/my
List my submissions for a contest.

Auth: Bearer

Responses:
- 200: `[SubmissionWithProblem]`

---

## Admin: Contests

### POST /api/admin/contests
Create a contest.

Body:
```
{ title, start_time (RFC3339), duration (minutes) }
```
Responses:
- 201: Contest
- 400: ErrorResponse

### PUT /api/admin/contests/:contestId
Update a contest.

Body: partial `{ title?, start_time?, duration? }`

Responses:
- 200: Contest
- 400/404: ErrorResponse

### DELETE /api/admin/contests/:contestId
Delete a contest (hard delete).

Responses:
- 200: `{ message }`
- 404: ErrorResponse

### GET /api/admin/contests/:contestId/problems
List problems for a contest (admin, full visibility).

Responses:
- 200: `[Problem]` (includes `test_case_path`)

---

## Problems

### GET /api/problem/:problemId
Get a problem.

Auth: Bearer + time guard

Rules:
- Non-admin before contest start: blocked (403)
- Non-admin after start: returns Problem (without `test_case_path`)
- Admin: returns ProblemAdminResponse (with `test_case_path`)

Responses:
- 200: ProblemResponse | ProblemAdminResponse
- 403/404: ErrorResponse

## Admin: Problems

### POST /api/admin/problems
Create a problem with inline testcase text.

Content-Type: multipart/form-data

Fields:
- `contest_id` (string), `problem_number` (string), `title`, `statement`, `testcase` (inline text)

Responses:
- 200: Problem (includes `test_case_path`)
- 400/500: ErrorResponse

### PUT /api/admin/problems/:problemId
Update problem statement/title and optionally replace testcase.

Accepts either JSON or multipart/form-data.

JSON Body:
```
{ title?, statement?, testcase_text? }
```

Responses:
- 200: Problem (admin view)
- 400/404/500: ErrorResponse

### DELETE /api/admin/problems/:problemId
Delete a problem (hard delete).

Responses:
- 200: `{ message }`
- 500: ErrorResponse

---

## Submissions

### POST /api/submissions/:problemId
Submit code for a problem.

Auth: Bearer + RequireStarted (admins bypass time guard)

Body:
```
{ source_code: string, language: one of [python javascript java cpp kotlin go] }
```

Behavior:
- `contest_id` is set from the problem
- Kicks off async judge run; initial status `pending`

Responses:
- 200: Submission
- 400/500: ErrorResponse

### GET /api/submissions/:submissionId
Get a submission by ID.

Auth: Bearer

Rules:
- Only the owner or an admin can view

Responses:
- 200: Submission
- 403/500: ErrorResponse

### GET /api/submissions/my
List my submissions (all contests).

Auth: Bearer

Responses:
- 200: `[SubmissionWithProblem]`

---

## Admin: Submissions

### GET /api/admin/submissions
List submissions with filters and pagination.

Query:
- `contest_id`, `user_id`, `status`, `language`, `start_date`, `end_date` (RFC3339), `page`, `page_size`

Responses:
- 200: `{ submissions: [SubmissionWithProblem], total, page, page_size }`

### DELETE /api/admin/submissions/:submissionId
Soft delete a submission.

Responses:
- 200: `{ message }`
- 404/500: ErrorResponse

### POST /api/admin/submissions/:submissionId/rejudge
Rejudge a submission.

Responses:
- 200: `{ message, submission }`
- 400/404/500: ErrorResponse

---

## SSE Endpoints

All SSE endpoints use token in query string (`?q=<token>`).

### GET /api/contests/standings/sse/:contestId
Standings stream. Auth: token in query.

### GET /api/contests/:contestId/sse
All submissions for a contest.
- During contest: admin only (403 otherwise)
- After contest: all authenticated users

### GET /api/contests/:contestId/sse/my
My submissions for the contest.

### GET /api/submissions/sse/my
My submissions across all contests.

---

## Static and Client Assets

- `/store` serves files under `./store`
- Frontend assets under `/assets` and fallback routes via `RegisterClientRoutes`

---

## Notes

- All times are UTC and contest gates use server time
- Soft delete applies to `users` and `submissions`; `contests` and `problems` are hard-deleted
- Admin status is DB-verified each request (cached per-context)
- Source code visibility in lists:
  - Admins: included
  - Non-admins: hidden for bulk contest views during contest

## Version

Date: 2025-10-28
