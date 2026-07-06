# FriendHere API Documentation

## Base URL
```
/api
```

## Response Format
```json
{
  "data": T,
  "success": true,
  "message": "string"
}
```

---

## Auth (`/api/Auth`)

### POST `/api/Auth/register`
Register a new user.

**Auth:** No

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "age": 25,
  "genderId": 1
}
```

**Response:**
```json
{
  "data": {
    "userId": 1,
    "name": "John",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-01-01T00:00:00Z"
  },
  "success": true
}
```

---

### POST `/api/Auth/login`
Login with email and password.

**Auth:** No

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "data": {
    "userId": 1,
    "name": "John",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-01-01T00:00:00Z"
  },
  "success": true
}
```

---

### POST `/api/Auth/escalate/{userId}`
Escalate a walk-in user to a system user with email/password.

**Auth:** No

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "data": {
    "userId": 1,
    "name": "John",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-01-01T00:00:00Z"
  },
  "success": true
}
```

---

## User (`/api/User`)

### GET `/api/User/{id}`
Get user by ID.

**Auth:** No

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John",
    "image": null,
    "email": "john@example.com",
    "age": 25,
    "genderId": 1,
    "isWalkIn": false
  },
  "success": true
}
```

---

### GET `/api/User/me`
Get current authenticated user.

**Auth:** Yes (Bearer Token)

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John",
    "image": "https://example.com/avatar.jpg",
    "email": "john@example.com",
    "age": 25,
    "genderId": 1,
    "isWalkIn": false
  },
  "success": true
}
```

---

### PUT `/api/User/me`
Update current user profile. Walk-in users cannot use this endpoint.

**Auth:** Yes (Bearer Token)

**Request:**
```json
{
  "name": "John Updated",
  "image": "https://example.com/avatar.jpg",
  "age": 26,
  "genderId": 1
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John Updated",
    "image": "https://example.com/avatar.jpg",
    "email": "john@example.com",
    "age": 26,
    "genderId": 1,
    "isWalkIn": false
  },
  "success": true
}
```

**Errors:**
- `403` - Walk-in user cannot update profile

---

## WalkIn (`/api/WalkIn`)

### POST `/api/WalkIn`
Create a walk-in user (no email/password required).

**Auth:** No

**Request:**
```json
{
  "name": "Walk-in Guest",
  "age": 30,
  "genderId": 2
}
```

**Response:**
```json
{
  "data": {
    "id": 5,
    "name": "Walk-in Guest",
    "email": null,
    "passwordHash": null,
    "image": null,
    "age": 30,
    "genderId": 2,
    "isWalkIn": true
  },
  "success": true
}
```

---

### PUT `/api/WalkIn/{id}`
Update a walk-in user.

**Auth:** No

**Request:**
```json
{
  "name": "Updated Guest",
  "image": null,
  "age": 31,
  "genderId": 2
}
```

**Response:**
```json
{
  "data": {
    "id": 5,
    "name": "Updated Guest",
    "image": null,
    "email": null,
    "age": 31,
    "genderId": 2,
    "isWalkIn": true
  },
  "success": true
}
```

---

### DELETE `/api/WalkIn/{id}`
Delete a walk-in user.

**Auth:** No

**Response:**
```json
{
  "data": null,
  "success": true
}
```

---

## SignalR Hub

### Connection
```
/Location
```

**Auth:** No (anonymous)

```
wss://localhost:5001/Location
```

---

### Client Methods (Server → Client)

| Method | Parameters | Description |
|--------|------------|-------------|
| `ReceiveLocations` | `locations: LocationDto[]` | Receive multiple locations |
| `NewJoin` | `user: UserDto`, `location: LocationDto` | New user joined |

---

### Hub Methods (Client → Server)

#### `Join`
Join with initial location. Broadcasts `NewJoin` to all clients.

**Parameters:**
```json
{
  "userId": 1,
  "latitude": 10.762622,
  "longitude": 106.660172,
  "accuracy": 10.0,
  "speed": 5.0
}
```

---

### Data Types

#### LocationDto
```json
{
  "id": "string",
  "userId": 1,
  "name": "string",
  "image": "string",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "accuracy": 10.0,
  "speed": 5.0,
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

#### UserDto
```json
{
  "id": 1,
  "name": "string",
  "image": "string",
  "email": "string",
  "age": 25,
  "genderId": 1,
  "isWalkIn": false
}
```
---

