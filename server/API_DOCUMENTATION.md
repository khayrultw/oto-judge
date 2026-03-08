# OTO Judge API Documentation

> **Version:** 1.0.0  
> **Base URL:** `http://<host>:8080/api`  
> **Last Updated:** December 28, 2025

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Authentication Endpoints](#authentication-endpoints)
- [Admin Panel - User Management](#admin-panel---user-management)
- [Admin Panel - Contest Management](#admin-panel---contest-management)
- [Admin Panel - Problem Management](#admin-panel---problem-management)
- [Admin Panel - Submission Management](#admin-panel---submission-management)
- [Contests](#contests)
- [Problems](#problems)
- [Submissions](#submissions)
- [Server-Sent Events (SSE)](#server-sent-events-sse)
- [Test Endpoints](#test-endpoints)

---

## Overview

OTO Judge is an online judge system for programming contests. This API provides endpoints for:

- **User authentication** (registration, login, logout)
- **Admin panel** (full CRUD for users, contests, problems, submissions)
- **Contest management** (view contests, standings, submissions)
- **Code submission** (submit code, view results)
- **Real-time updates** via Server-Sent Events (SSE)

### Supported Languages

| Language | Code |
|----------|------|
| C++ | `cpp` |
| Python | `py` |
| Kotlin | `kt` |
| JavaScript | `js` |
| Java | `java` |
| Go | `go` |

### Time Format

All timestamps use **RFC3339** format: `"2025-12-28T15:04:05Z"`

---

## Authentication

### Header Authentication (Most Endpoints)

```
Authorization: Bearer <jwt_token>
```

### Query Parameter Authentication (SSE Endpoints)

```
?q=<jwt_token>
```

JWT tokens are obtained via the `/api/login` endpoint and expire after 24 hours.

---

## Error Handling

All error responses follow this structure:

```json
{
  "error": "error_code",
  "fields": {
    "details": "Additional error information"
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `validation_failed` | Request body validation failed |
| 401 | `unauthorized` | Missing or invalid authentication |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `user_not_found` | Resource not found |
| 409 | `email_already_exists` | Email already registered |
| 500 | `internal_error` | Server error |

---

## Authentication Endpoints

### Register User

Create a new regular (non-admin) user account.

```
POST /api/register
```

**Request Body:**

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 2-100 characters |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | 5-100 characters |

**Response (201 Created):**

```json
{
  "message": "User created successfully",
  "user_id": 123
}
```

---

### Login

Authenticate and receive a JWT token.

```
POST /api/login
```

**Request Body:**

```json
{
  "email": "ada@example.com",
  "password": "secret123"
}
```

**Response (200 OK):**

```json
{
  "id": 123,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field | Description |
|-------|-------------|
| `role` | Either `"user"` or `"admin"` |
| `token` | JWT token valid for 24 hours |

---

### Get Current User

Get the authenticated user's profile.

```
GET /api/me
```

**Headers:** `Authorization: Bearer <jwt>`

**Response (200 OK):**

```json
{
  "id": 123,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "user"
}
```

---

### Logout

Logout the current user (client should discard token).

```
GET /api/logout
```

**Response (200 OK):**

```json
{
  "msg": "Logout (client should discard token)"
}
```

---

## Admin Panel - User Management

> **Authentication:** All admin endpoints require `Authorization: Bearer <jwt>` with an admin account.

### Get User Statistics

Get overall user statistics.

```
GET /api/admin/users/stats
```

**Response (200 OK):**

```json
{
  "total_users": 150,
  "total_admins": 5,
  "deleted_users": 3,
  "active_users": 150
}
```

---

### Search Users

Search users by name or email.

```
GET /api/admin/users/search
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (name or email) |
| `page` | integer | No | Page number (default: 1) |
| `page_size` | integer | No | Items per page (default: 20, max: 100) |
| `include_deleted` | boolean | No | Include soft-deleted users |
| `is_admin` | boolean | No | Filter by admin status |

**Example:** `GET /api/admin/users/search?q=ada&is_admin=false&page=1&page_size=10`

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 123,
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "is_admin": false,
      "created_at": "2025-12-28T15:04:05Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

---

### List Users

Get a paginated list of all users.

```
GET /api/admin/users
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 50 | Items per page |
| `include_deleted` | boolean | false | Include soft-deleted users |

**Response (200 OK):**

```json
{
  "users": [
    {
      "id": 123,
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "is_admin": false,
      "created_at": "2025-12-28T15:04:05Z"
    }
  ],
  "total": 150,
  "page": "1"
}
```

---

### Get User by ID

Get a specific user's details.

```
GET /api/admin/users/:userId
```

**Response (200 OK):**

```json
{
  "id": 123,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "is_admin": false,
  "created_at": "2025-12-28T15:04:05Z"
}
```

**Error Responses:**
- `404 Not Found` - User not found

---

### Create User

Create a new user (can be admin or regular).

```
POST /api/admin/users
```

**Request Body:**

```json
{
  "name": "Grace Hopper",
  "email": "grace@example.com",
  "password": "secret123",
  "is_admin": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | 2-100 characters |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | 5-100 characters |
| `is_admin` | boolean | No | Default: false |

**Response (201 Created):**

```json
{
  "id": 200,
  "name": "Grace Hopper",
  "email": "grace@example.com",
  "is_admin": true,
  "created_at": "2025-12-28T15:04:05Z"
}
```

**Error Responses:**
- `409 Conflict` - Email already exists

---

### Update User

Update a user's information.

```
PUT /api/admin/users/:userId
PATCH /api/admin/users/:userId
```

**Request Body (all fields optional):**

```json
{
  "name": "Grace M. Hopper",
  "email": "grace2@example.com",
  "password": "newpassword123",
  "is_admin": false
}
```

**Response (200 OK):**

```json
{
  "id": 200,
  "name": "Grace M. Hopper",
  "email": "grace2@example.com",
  "is_admin": false,
  "created_at": "2025-12-28T15:04:05Z"
}
```

---

### Update User Password

Update only a user's password.

```
PUT /api/admin/users/:userId/password
```

**Request Body:**

```json
{
  "password": "newsecret123"
}
```

**Response (200 OK):**

```json
{
  "message": "Password updated successfully"
}
```

---

### Delete User

Soft delete a user (can be restored later).

```
DELETE /api/admin/users/:userId
```

**Response (200 OK):**

```json
{
  "message": "User deleted successfully"
}
```

---

### Restore User

Restore a soft-deleted user.

```
POST /api/admin/users/:userId/restore
```

**Response (200 OK):**

```json
{
  "message": "User restored successfully",
  "user": {
    "id": 123,
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "is_admin": false,
    "created_at": "2025-12-28T15:04:05Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - User is not deleted
- `404 Not Found` - User not found

---

## Admin Panel - Contest Management

### Create Contest

```
POST /api/admin/contests
```

**Request Body:**

```json
{
  "title": "Weekly Contest #1",
  "start_time": "2025-12-28T15:00:00Z",
  "duration": 120
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Contest title |
| `start_time` | string | Yes | RFC3339 timestamp |
| `duration` | integer | Yes | Duration in minutes |

**Response (201 Created):** Contest object

---

### Update Contest

```
PUT /api/admin/contests/:contestId
```

**Request Body:** Same as create, all fields optional.

**Response (200 OK):** Updated contest object

---

### Delete Contest

```
DELETE /api/admin/contests/:contestId
```

**Response (200 OK):**

```json
{
  "message": "Contest deleted successfully"
}
```

---

### Get Contest Problems (Admin)

Get all problems for a contest, including test case paths.

```
GET /api/admin/contests/:contestId/problems
```

**Response (200 OK):** Array of Problem objects with `test_case_path`

---

## Admin Panel - Problem Management

### Create Problem

```
POST /api/admin/problems
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contest_id` | integer | Yes | Associated contest ID |
| `problem_number` | integer | Yes | Problem number (0-indexed) |
| `title` | string | Yes | Problem title |
| `statement` | string | Yes | Problem statement (Markdown) |
| `testcase` | string | Yes | Test case content |

**Response (200 OK):** Created Problem object

---

### Update Problem

```
PUT /api/admin/problems/:problemId
```

**Option 1 - JSON Body:**

```json
{
  "title": "Updated Title",
  "statement": "Updated statement...",
  "testcase_text": "New test case content"
}
```

**Option 2 - Form Data:** `title` and `statement` fields

**Response (200 OK):**

```json
{
  "id": 10,
  "title": "Updated Title",
  "contest_id": 1,
  "statement": "...",
  "test_case_path": "store/test_cases/contest_1/c_1_p_0_testcase.txt",
  "problem_number": 0,
  "created_at": "2025-12-28T15:04:05Z"
}
```

---

### Delete Problem

```
DELETE /api/admin/problems/:problemId
```

**Response (200 OK):**

```json
{
  "message": "Problem deleted"
}
```

---

## Admin Panel - Submission Management

### List All Submissions

Get all submissions with optional filters.

```
GET /api/admin/submissions
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `contest_id` | integer | - | Filter by contest |
| `user_id` | integer | - | Filter by user |
| `status` | string | - | Filter by status (PASS, FAIL, etc.) |
| `language` | string | - | Filter by language |
| `start_date` | string | - | RFC3339 timestamp |
| `end_date` | string | - | RFC3339 timestamp |
| `page` | integer | 1 | Page number |
| `page_size` | integer | 50 | Items per page (max 200) |

**Response (200 OK):**

```json
{
  "submissions": [
    {
      "id": 999,
      "user_id": 123,
      "user_name": "Ada Lovelace",
      "problem_id": 10,
      "problem_title": "A + B",
      "language": "py",
      "source_code": "print(sum(map(int, input().split())))",
      "status": "PASS",
      "message": "All tests passed",
      "created_at": "2025-12-28T15:04:05Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50
}
```

---

### Delete Submission

Soft delete a submission.

```
DELETE /api/admin/submissions/:submissionId
```

**Response (200 OK):**

```json
{
  "message": "Submission deleted successfully"
}
```

---

### Rejudge Submission

Re-run the judge on a submission.

```
POST /api/admin/submissions/:submissionId/rejudge
```

**Response (200 OK):**

```json
{
  "message": "Submission rejudge initiated",
  "submission": {
    "id": 999,
    "user_id": 123,
    "problem_id": 10,
    "contest_id": 1,
    "source_code": "...",
    "language": "py",
    "status": "pending",
    "message": "",
    "created_at": "2025-12-28T15:04:05Z"
  }
}
```

---

## Contests

### List All Contests

```
GET /api/contests
```

**Headers:** `Authorization: Bearer <jwt>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter: `upcoming`, `ongoing`, `past` |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Weekly Contest #1",
      "start_time": "2025-12-28T15:00:00Z",
      "duration": 120,
      "created_at": "2025-12-01T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

### List Upcoming Contests

```
GET /api/contests/upcoming
```

**Headers:** `Authorization: Bearer <jwt>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 100) |

**Response (200 OK):** Paginated array of upcoming Contest objects

---

### List Past Contests

```
GET /api/contests/past
```

**Headers:** `Authorization: Bearer <jwt>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 100) |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Weekly Contest #1",
      "start_time": "2025-12-20T15:00:00Z",
      "duration": 120,
      "created_at": "2025-12-01T00:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 20,
  "total_pages": 2
}
```

---

### Get Contest Details

```
GET /api/contests/:contestId
```

**Headers:** `Authorization: Bearer <jwt>`

**Behavior:**
- Before contest starts (non-admin): Returns metadata only (no problems)
- After contest starts: Returns contest with problems (test_case_path hidden for non-admins)

**Response (200 OK) - Metadata Only:**

```json
{
  "id": 1,
  "title": "Contest 1",
  "start_time": "2025-12-28T15:00:00Z",
  "duration": 120,
  "created_at": "2025-12-01T00:00:00Z"
}
```

**Response (200 OK) - With Problems:**

```json
{
  "id": 1,
  "title": "Contest 1",
  "start_time": "2025-12-28T15:00:00Z",
  "duration": 120,
  "problems": [
    {
      "id": 10,
      "title": "A + B",
      "problem_number": 0,
      "statement": "..."
    }
  ],
  "created_at": "2025-12-01T00:00:00Z"
}
```

---

### Get Contest Standings

```
GET /api/contests/:contestId/standings
```

**Headers:** `Authorization: Bearer <jwt>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 100) |

**Response (200 OK):**

```json
{
  "data": [
    {
      "rank": 1,
      "user_id": 123,
      "user_name": "Ada Lovelace",
      "solved": 3,
      "penalty": 120,
      "problems": [
        {
          "problem_number": 0,
          "status": "+",
          "color": "#28a745",
          "count": 1
        }
      ]
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

### Get All Contest Submissions

```
GET /api/contests/:contestId/submissions
```

**Headers:** `Authorization: Bearer <jwt>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status (PASS, FAIL, etc.) |
| `language` | string | - | Filter by language |

**Access Control:**
- During ongoing contest: Admin only
- After contest: All authenticated users
- Non-admins see `source_code: "Not Available"`

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 999,
      "user_id": 123,
      "user_name": "Ada Lovelace",
      "problem_id": 10,
      "problem_title": "A + B",
      "language": "py",
      "source_code": "Not Available",
      "status": "PASS",
      "message": "All tests passed",
      "created_at": "2025-12-28T15:04:05Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

---

### Get My Contest Submissions

```
GET /api/contests/:contestId/submissions/my
```

**Headers:** `Authorization: Bearer <jwt>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status |
| `language` | string | - | Filter by language |

**Response (200 OK):** Paginated array of the caller's submissions for the contest

---

## Problems

### Get Problem Details

```
GET /api/problem/:problemId
```

**Headers:** `Authorization: Bearer <jwt>`

**Access Control:**
- Non-admins can only access after contest starts
- Admins can access anytime

**Response (200 OK) - Non-Admin:**

```json
{
  "id": 10,
  "title": "A + B",
  "contest_id": 1,
  "statement": "Given two integers...",
  "problem_number": 0,
  "created_at": "2025-12-28T15:04:05Z"
}
```

**Response (200 OK) - Admin (includes test_case_path):**

```json
{
  "id": 10,
  "title": "A + B",
  "contest_id": 1,
  "statement": "Given two integers...",
  "test_case_path": "store/test_cases/contest_1/c_1_p_0_testcase.txt",
  "problem_number": 0,
  "created_at": "2025-12-28T15:04:05Z"
}
```

---

## Submissions

### Submit Code

```
POST /api/submissions/:problemId
```

**Headers:** `Authorization: Bearer <jwt>`

**Access Control:** Can only submit after contest starts (non-admins)

**Request Body:**

```json
{
  "source_code": "print(sum(map(int, input().split())))",
  "language": "py"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `source_code` | string | Yes | Your solution code |
| `language` | string | Yes | `cpp`, `py`, `kt`, `js`, `java`, `go` |

**Response (200 OK):**

```json
{
  "id": 999,
  "user_id": 123,
  "problem_id": 10,
  "contest_id": 1,
  "source_code": "...",
  "language": "py",
  "status": "pending",
  "message": "",
  "created_at": "2025-12-28T15:04:05Z"
}
```

---

### Get Submission Details

```
GET /api/submissions/:submissionId
```

**Headers:** `Authorization: Bearer <jwt>`

**Access Control:** Owner or admin only

**Response (200 OK):** Submission object

---

### Get My Submissions

Get all submissions by the current user.

```
GET /api/submissions/my
```

**Headers:** `Authorization: Bearer <jwt>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 100) |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 999,
      "user_id": 123,
      "user_name": "",
      "problem_id": 10,
      "problem_title": "A + B",
      "language": "py",
      "source_code": "...",
      "status": "PASS",
      "message": "All tests passed",
      "created_at": "2025-12-28T15:04:05Z"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

## Server-Sent Events (SSE)

All SSE endpoints use query parameter authentication: `?q=<jwt>`

### Standings Stream

```
GET /api/contests/standings/sse/:contestId?q=<jwt>
```

**Event Format:**

```
data: [{"rank":1,"user_id":123,...}]

```

---

### All Contest Submissions Stream

```
GET /api/contests/:contestId/sse?q=<jwt>
```

**Access Control:** Admin only during ongoing contest

---

### My Contest Submissions Stream

```
GET /api/contests/:contestId/sse/my?q=<jwt>
```

---

### My Submissions Stream (Global)

```
GET /api/submissions/sse/my?q=<jwt>
```

---

## Test Endpoints

### Test Python Judge

```
GET /api/test/python
```

**Response (200 OK):**

```json
{
  "message": "<judge status>"
}
```

---

### Test Kotlin Judge

```
GET /api/test/kotlin
```

**Response (200 OK):**

```json
{
  "message": "<judge status>"
}
```

---

## Appendix: Data Models

### User

```json
{
  "id": 123,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "is_admin": false,
  "created_at": "2025-12-28T15:04:05Z"
}
```

### Contest

```json
{
  "id": 1,
  "title": "Weekly Contest #1",
  "start_time": "2025-12-28T15:00:00Z",
  "duration": 120,
  "problems": [],
  "created_at": "2025-12-28T15:04:05Z"
}
```

### Problem

```json
{
  "id": 10,
  "title": "A + B",
  "contest_id": 1,
  "statement": "Given two integers...",
  "test_case_path": "store/test_cases/contest_1/c_1_p_0_testcase.txt",
  "problem_number": 0,
  "created_at": "2025-12-28T15:04:05Z"
}
```

### Submission

```json
{
  "id": 999,
  "user_id": 123,
  "problem_id": 10,
  "contest_id": 1,
  "source_code": "print(1)",
  "language": "py",
  "status": "PASS",
  "message": "All tests passed",
  "created_at": "2025-12-28T15:04:05Z"
}
```

### Submission Status Values

| Status | Description |
|--------|-------------|
| `pending` | Submission is being judged |
| `PASS` | All test cases passed |
| `FAIL` | One or more test cases failed |
| `CE` | Compilation error |
| `TLE` | Time limit exceeded |
| `RTE` | Runtime error |
| `MLE` | Memory limit exceeded |

---

## Rate Limiting

The API implements rate limiting with a maximum of 20 requests per second with a burst capacity of 10 requests.

---

## Pagination

Many list endpoints support pagination. Paginated responses follow this structure:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

### Pagination Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number (1-indexed) |
| `page_size` | integer | 20 | 100 | Items per page |

### Paginated Endpoints

| Endpoint | Additional Filters |
|----------|-------------------|
| `GET /api/contests` | `status` (upcoming, ongoing, past) |
| `GET /api/contests/upcoming` | - |
| `GET /api/contests/past` | - |
| `GET /api/contests/:contestId/standings` | - |
| `GET /api/contests/:contestId/submissions` | `status`, `language` |
| `GET /api/contests/:contestId/submissions/my` | `status`, `language` |
| `GET /api/submissions/my` | - |
| `GET /api/admin/users` | `include_deleted` |
| `GET /api/admin/users/search` | `q`, `include_deleted`, `is_admin` |
| `GET /api/admin/submissions` | `contest_id`, `user_id`, `status`, `language`, `start_date`, `end_date` |

**Non-Paginated List Endpoints:**

| Endpoint | Reason |
|----------|--------|
| `GET /api/admin/contests/:contestId/problems` | Contest problems are typically small lists |

---

## CORS

The API accepts requests from any origin. For production deployments, configure appropriate CORS settings.
