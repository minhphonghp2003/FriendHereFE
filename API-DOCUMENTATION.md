# FriendHere API Documentation

## Overview
FriendHere is a social networking application with real-time messaging, location sharing, moments, and friendship features. This API documentation covers all REST endpoints and SignalR hubs for frontend integration.

**Base URL:** `https://api.yourdomain.com/api`
**SignalR Hub URL:** `https://api.yourdomain.com/app` and `https://api.yourdomain.com/location`

**Authentication:** Most endpoints require Bearer token authentication in the `Authorization` header.
**Content-Type:** `application/json`

---

## Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management) 
3. [Chat & Conversations](#chat--conversations)
4. [Friendships](#friendships)
5. [Location Sharing](#location-sharing)
6. [Moments](#moments)
7. [Timelines](#timelines)
8. [File Uploads](#file-uploads)
9. [SignalR Hubs](#signalr-hubs)
10. [Common DTOs](#common-dtos)
11. [Enums](#enums)

---

## Authentication

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "SecurePassword123!",
  "age": 25,
  "genderId": 1,
  "fcmToken": "optional-fcm-token"
}
```

**Response:**
```json
{
  "data": {
    "userId": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-01T13:00:00Z",
    "refreshToken": "refresh_token_here",
    "refreshTokenExpiresAt": "2024-01-15T13:00:00Z"
  },
  "success": true,
  "message": null
}
```

**Authentication:** None (AllowAnonymous)

---

### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "fcmToken": "optional-fcm-token"
}
```

**Response:**
```json
{
  "data": {
    "userId": 123,
    "name": "John Doe", 
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-01T13:00:00Z",
    "refreshToken": "refresh_token_here",
    "refreshTokenExpiresAt": "2024-01-15T13:00:00Z"
  },
  "success": true,
  "message": null
}
```

**Authentication:** None (AllowAnonymous)

---

### GET /api/auth/google
Initiate Google OAuth login.

**Query Parameters:**
- `redirect_uri` (optional): Redirect URI after authentication

**Response:** HTTP Redirect to Google OAuth page

**Authentication:** None (AllowAnonymous)

---

### GET /api/auth/google/callback
Google OAuth callback handler.

**Query Parameters:**
- `code`: Authorization code from Google
- `state` (optional): State parameter for CSRF protection
- `error` (optional): Error code if authentication failed

**Response:** HTTP Redirect with authentication tokens

**Authentication:** None (AllowAnonymous)

---

### GET /api/auth/facebook
Initiate Facebook OAuth login.

**Query Parameters:**
- `redirect_uri` (optional): Redirect URI after authentication

**Response:** HTTP Redirect to Facebook OAuth page

**Authentication:** None (AllowAnonymous)

---

### GET /api/auth/facebook/callback
Facebook OAuth callback handler.

**Query Parameters:**
- `code`: Authorization code from Facebook
- `state` (optional): State parameter for CSRF protection
- `error` (optional): Error code if authentication failed

**Response:** HTTP Redirect with authentication tokens

**Authentication:** None (AllowAnonymous)

---

### GET /api/auth/apple
Initiate Apple OAuth login.

**Query Parameters:**
- `redirect_uri` (optional): Redirect URI after authentication

**Response:** HTTP Redirect to Apple OAuth page

**Authentication:** None (AllowAnonymous)

---

### POST /api/auth/apple/callback
Apple OAuth callback handler.

**Form Data:**
- `code`: Authorization code from Apple
- `state` (optional): State parameter for CSRF protection
- `error` (optional): Error code if authentication failed

**Response:** HTTP Redirect with authentication tokens

**Authentication:** None (AllowAnonymous)

---

### POST /api/auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Password reset email sent"
}
```

**Authentication:** None (AllowAnonymous)

---

### POST /api/auth/reset-password
Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Password reset successfully"
}
```

**Authentication:** None (AllowAnonymous)

---

### PUT /api/auth/fcm-token
Update FCM token for push notifications.

**Request Body:**
```json
{
  "fcmToken": "new_fcm_token"
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "FCM token updated"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here",
  "userId": 123
}
```

**Response:**
```json
{
  "data": {
    "token": "new_access_token",
    "expiresAt": "2024-01-01T14:00:00Z",
    "refreshToken": "new_refresh_token", 
    "refreshTokenExpiresAt": "2024-01-15T14:00:00Z"
  },
  "success": true,
  "message": null
}
```

**Authentication:** None (AllowAnonymous)

---

### POST /api/auth/revoke-refresh-token
Revoke refresh token for logout.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_to_revoke"
}
```

**Response:**
```json
{
  "data": true,
  "success": true,
  "message": "Refresh token revoked"
}
```

**Authentication:** None (AllowAnonymous)

---

## User Management

### GET /api/user/{id}
Get user profile by ID.

**Route Parameters:**
- `id` (int): User ID

**Response:**
```json
{
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "age": 25,
    "genderId": 1,
    "images": [
      {
        "id": "guid-1",
        "url": "https://cdn.example.com/avatar.jpg",
        "type": "Image"
      }
    ],
    "friendship": {
      "status": "Accepted",
      "type": "CloseFriend"
    }
  },
  "success": true,
  "message": null
}
```

**Authentication:** None (AllowAnonymous)

---

### GET /api/user/me
Get current user profile.

**Response:**
```json
{
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com", 
    "age": 25,
    "genderId": 1,
    "images": [
      {
        "id": "guid-1",
        "url": "https://cdn.example.com/avatar.jpg",
        "type": "Image"
      }
    ],
    "friendship": null
  },
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/user/me
Update current user profile.

**Request Body:**
```json
{
  "name": "John Updated",
  "age": 26
}
```

**Response:**
```json
{
  "data": {
    "id": 123,
    "name": "John Updated",
    "email": "john@example.com",
    "age": 26,
    "genderId": 1,
    "images": [...],
    "friendship": null
  },
  "success": true,
  "message": "Profile updated"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/user/me/avatar
Upload avatar for current user.

**Request Body:**
```json
{
  "fileId": "guid-of-uploaded-file"
}
```

**Response:**
```json
{
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "age": 25,
    "genderId": 1,
    "images": [
      {
        "id": "guid-1",
        "url": "https://cdn.example.com/new-avatar.jpg",
        "type": "Image"
      }
    ],
    "friendship": null
  },
  "success": true,
  "message": "Avatar updated"
}
```

**Authentication:** Required (Bearer token)

---

## Chat & Conversations

### GET /api/chat
Get all conversations for current user (paginated).

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 456,
      "name": "Group Chat",
      "isDirect": false,
      "isRestricted": false,
      "isMuted": false,
      "isArchived": false,
      "memberCount": 5,
      "isOnline": true,
      "unreadCount": 3,
      "isBlocked": false,
      "blockedById": null,
      "image": {
        "id": "guid-1",
        "url": "https://cdn.example.com/group-avatar.jpg",
        "type": "Image"
      },
      "lastMessage": {
        "id": 789,
        "conversationId": 456,
        "senderId": 124,
        "senderName": "Jane Smith",
        "senderAvatar": {...},
        "senderRole": "Member",
        "content": "Hey everyone!",
        "replyToId": null,
        "repliedMessage": null,
        "momentId": null,
        "type": "Text",
        "attachments": null,
        "momentThumbnail": null,
        "reactions": [],
        "status": "Delivered",
        "createdAt": "2024-01-01T12:30:00Z",
        "isDeleted": false,
        "isMine": false
      }
    }
  ],
  "success": true,
  "message": null,
  "hasNext": false,
  "nextCursor": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/{conversationId}
Get conversation details by ID.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Response:**
```json
{
  "data": {
    "id": 456,
    "name": "Group Chat",
    "isDirect": false,
    "isRestricted": false,
    "isMuted": false,
    "isArchived": false,
    "memberCount": 5,
    "isOnline": true,
    "unreadCount": 3,
    "isBlocked": false,
    "blockedById": null,
    "image": {...},
    "lastMessage": {...}
  },
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/opponent/{opponentId}
Get conversation ID with a specific user.

**Route Parameters:**
- `opponentId` (int): Opponent user ID

**Response:**
```json
{
  "data": 456,
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat
Create a new direct conversation.

**Request Body:**
```json
{
  "receiverId": 124,
  "content": "Hi Jane!",
  "messageType": "Text",
  "fileIds": null
}
```

**Response:**
```json
{
  "data": 456,
  "success": true,
  "message": "Conversation created"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/group
Create a new group conversation.

**Request Body:**
```json
{
  "name": "My Group",
  "imageFileId": "guid-1",
  "memberIds": [124, 125, 126],
  "content": "Welcome to the group!",
  "messageType": "Text",
  "fileIds": null
}
```

**Response:**
```json
{
  "data": 457,
  "success": true,
  "message": "Group created"
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/{conversationId}/messages
Get messages for a conversation (paginated).

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 789,
      "conversationId": 456,
      "senderId": 124,
      "senderName": "Jane Smith",
      "senderAvatar": {...},
      "senderRole": "Member",
      "content": "Hey everyone!",
      "replyToId": null,
      "repliedMessage": null,
      "momentId": null,
      "type": "Text",
      "attachments": null,
      "momentThumbnail": null,
      "reactions": [],
      "status": "Delivered",
      "createdAt": "2024-01-01T12:30:00Z",
      "isDeleted": false,
      "isMine": false
    }
  ],
  "success": true,
  "message": null,
  "hasNext": true,
  "nextCursor": 780
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/{conversationId}/messages/search
Search messages in a conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Query Parameters:**
- `messageId` (long, optional): Search from specific message ID
- `content` (string, optional): Content to search for

**Response:**
```json
{
  "data": [
    {
      "id": 790,
      "conversationId": 456,
      "senderId": 125,
      "senderName": "Bob Wilson",
      "senderAvatar": {...},
      "senderRole": "Admin",
      "content": "Meeting tomorrow",
      "replyToId": null,
      "repliedMessage": null,
      "momentId": null,
      "type": "Text",
      "attachments": null,
      "momentThumbnail": null,
      "reactions": [],
      "status": "Read",
      "createdAt": "2024-01-01T11:00:00Z",
      "isDeleted": false,
      "isMine": false
    }
  ],
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/{conversationId}/members
Get members of a conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Response:**
```json
{
  "data": [
    {
      "userId": 124,
      "userName": "Jane Smith",
      "userImage": {...},
      "role": "Admin",
      "joinedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/{conversationId}/join-requests
Get pending join requests for a group conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "conversationId": 456,
      "userId": 127,
      "userName": "Alice Brown",
      "userImage": {...},
      "createdAt": "2024-01-01T09:00:00Z"
    }
  ],
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/discoverable
Get discoverable public groups.

**Response:**
```json
{
  "data": [
    {
      "id": 500,
      "name": "Public Group",
      "memberCount": 150,
      "image": {...},
      "description": "A public group for everyone"
    }
  ],
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/{conversationId}/messages/{messageId}/reactions
Get reactions for a specific message (paginated).

**Route Parameters:**
- `conversationId` (long): Conversation ID
- `messageId` (long): Message ID

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:**
```json
{
  "data": [
    {
      "userId": 124,
      "userName": "Jane Smith",
      "userImage": {...},
      "emoji": "👍",
      "reactedAt": "2024-01-01T12:35:00Z"
    }
  ],
  "success": true,
  "message": null,
  "hasNext": false,
  "nextCursor": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/chat/giphy
Get GIFs from Giphy.

**Query Parameters:**
- `type` (string): Giphy type (trending, search)
- `q` (string, optional): Search query for type=search
- `limit` (int, optional): Number of results (1-50, default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "giphy-1",
      "url": "https://media.giphy.com/media/...",
      "thumbnailUrl": "https://media.giphy.com/media/...",
      "title": "Funny GIF"
    }
  ],
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/block-user
Block a user from direct conversations.

**Request Body:**
```json
{
  "targetUserId": 124
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "User blocked"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/unblock-user
Unblock a user.

**Request Body:**
```json
{
  "targetUserId": 124
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "User unblocked"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/{conversationId}/mute
Mute/unmute a conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Request Body:**
```json
{
  "isMuted": true
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Conversation muted"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/{conversationId}/archive
Archive/unarchive a conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Request Body:**
```json
{
  "isArchived": true
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Conversation archived"
}
```

**Authentication:** Required (Bearer token)

---

### DELETE /api/chat/{conversationId}
Delete a conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Conversation deleted"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/chat/{conversationId}/group/name
Update group conversation name.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Request Body:**
```json
{
  "name": "Updated Group Name"
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Group name updated"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/chat/{conversationId}/group/image
Update group conversation image.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Request Body:**
```json
{
  "fileId": "guid-1"
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Group image updated"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/chat/{conversationId}/group/restricted
Set group restricted status (requires join approval).

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Request Body:**
```json
{
  "isRestricted": true
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Group restriction updated"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/{conversationId}/members
Add a member to a group conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Request Body:**
```json
{
  "userId": 127
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Member added"
}
```

**Authentication:** Required (Bearer token)

---

### DELETE /api/chat/{conversationId}/members/{userId}
Remove a member from a group conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID
- `userId` (int): User ID to remove

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Member removed"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/{conversationId}/leave
Leave a group conversation.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Left group"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/{conversationId}/join-request
Create a join request for a restricted group.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Join request created"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/chat/{conversationId}/join
Join a non-restricted group directly.

**Route Parameters:**
- `conversationId` (long): Conversation ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Joined group"
}
```

**Authentication:** Required (Bearer token)

---

### DELETE /api/chat/join-request/{requestId}
Cancel a join request.

**Route Parameters:**
- `requestId` (int): Join request ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Join request cancelled"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/chat/join-request/{requestId}
Approve or reject a join request.

**Route Parameters:**
- `requestId` (int): Join request ID

**Request Body:**
```json
{
  "isApproved": true
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Join request processed"
}
```

**Authentication:** Required (Bearer token)

---

## Friendships

### GET /api/friendship/{id}
Get friendship details by ID.

**Route Parameters:**
- `id` (long): Friendship ID

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Accepted",
    "type1": "CloseFriend",
    "type2": "Friend",
    "requestedById": 123,
    "blockedById": null,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/friendship/me
Get all friendships for current user (paginated).

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)
- `type` (FriendshipType, optional): Filter by friendship type

**Response:**
```json
{
  "data": [
    {
      "id": 100,
      "user1Id": 123,
      "user2Id": 124,
      "status": "Accepted",
      "type1": "CloseFriend",
      "type2": "Friend",
      "requestedById": 123,
      "blockedById": null,
      "createdAt": "2024-01-01T08:00:00Z",
      "otherUserName": "Jane Smith",
      "otherUserImage": {...}
    }
  ],
  "success": true,
  "message": null,
  "hasNext": true,
  "nextCursor": 95
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/friendship
Create a new friendship request.

**Request Body:**
```json
{
  "targetUserId": 124
}
```

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Pending",
    "type1": "Friend",
    "type2": "Friend",
    "requestedById": 123,
    "blockedById": null,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": "Friendship request sent"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/friendship/{id}/accept
Accept a friendship request.

**Route Parameters:**
- `id` (long): Friendship ID

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Accepted",
    "type1": "Friend",
    "type2": "Friend",
    "requestedById": 124,
    "blockedById": null,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": "Friendship accepted"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/friendship/{id}/reject
Reject a friendship request.

**Route Parameters:**
- `id` (long): Friendship ID

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Rejected",
    "type1": "Friend",
    "type2": "Friend",
    "requestedById": 124,
    "blockedById": null,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": "Friendship rejected"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/friendship/{id}/revoke
Revoke a pending friendship request.

**Route Parameters:**
- `id` (long): Friendship ID

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Revoked",
    "type1": "Friend",
    "type2": "Friend",
    "requestedById": 123,
    "blockedById": null,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": "Friendship revoked"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/friendship/{id}/block
Block a user in a friendship.

**Route Parameters:**
- `id` (long): Friendship ID

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Blocked",
    "type1": "Friend",
    "type2": "Friend",
    "requestedById": 123,
    "blockedById": 123,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": "User blocked"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/friendship/{id}/unblock
Unblock a user in a friendship.

**Route Parameters:**
- `id` (long): Friendship ID

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Accepted",
    "type1": "Friend",
    "type2": "Friend",
    "requestedById": 123,
    "blockedById": null,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": "User unblocked"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/friendship/{id}/type
Change friendship type.

**Route Parameters:**
- `id` (long): Friendship ID

**Request Body:**
```json
{
  "type": "CloseFriend"
}
```

**Response:**
```json
{
  "data": {
    "id": 100,
    "user1Id": 123,
    "user2Id": 124,
    "status": "Accepted",
    "type1": "CloseFriend",
    "type2": "Friend",
    "requestedById": 123,
    "blockedById": null,
    "createdAt": "2024-01-01T08:00:00Z",
    "otherUserName": "Jane Smith",
    "otherUserImage": {...}
  },
  "success": true,
  "message": "Friendship type updated"
}
```

**Authentication:** Required (Bearer token)

---

### DELETE /api/friendship/{id}
Remove a friendship.

**Route Parameters:**
- `id` (long): Friendship ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Friendship removed"
}
```

**Authentication:** Required (Bearer token)

---

## Location Sharing

### GET /api/location/active
Get active users with location information (paginated).

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)
- `sortBy` (LocationSortBy, optional): Sort by field (Distance, UpdatedAt)

**Response:**
```json
{
  "data": [
    {
      "userId": 124,
      "userName": "Jane Smith",
      "userImage": {...},
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 10.5,
      "speed": 0.0,
      "battery": 85,
      "status": "Available",
      "visibility": "Friends",
      "updatedAt": "2024-01-01T12:30:00Z",
      "distance": 2.5,
      "moments": [...]
    }
  ],
  "success": true,
  "message": null,
  "hasNext": true,
  "nextCursor": 120
}
```

**Authentication:** Required (Bearer token)

---

## Moments

### GET /api/moment/feed
Get moments feed for current user (paginated).

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 200,
      "userId": 124,
      "userName": "Jane Smith",
      "userImage": {...},
      "caption": "Beautiful sunset today!",
      "timelineId": null,
      "timeline": null,
      "visibility": "Friends",
      "status": "Active",
      "allowComment": true,
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "placeName": "Central Park",
        "isShowed": true
      },
      "images": [
        {
          "id": "guid-1",
          "url": "https://cdn.example.com/moment.jpg",
          "type": "Image"
        }
      ],
      "video": null,
      "reactions": [
        {
          "userId": 125,
          "emoji": "❤️"
        }
      ],
      "createdAt": "2024-01-01T11:00:00Z"
    }
  ],
  "success": true,
  "message": null,
  "hasNext": true,
  "nextCursor": 195
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/moment/{id}
Get moment details by ID.

**Route Parameters:**
- `id` (long): Moment ID

**Response:**
```json
{
  "data": {
    "id": 200,
    "userId": 124,
    "userName": "Jane Smith",
    "userImage": {...},
    "caption": "Beautiful sunset today!",
    "timelineId": null,
    "timeline": null,
    "visibility": "Friends",
    "status": "Active",
    "allowComment": true,
    "location": {...},
    "images": [...],
    "video": null,
    "reactions": [...],
    "createdAt": "2024-01-01T11:00:00Z"
  },
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/moment/user/{userId}
Get moments for a specific user (paginated).

**Route Parameters:**
- `userId` (int): User ID

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)
- `fromDate` (DateTime, optional): Filter moments from this date
- `toDate` (DateTime, optional): Filter moments until this date

**Response:** Same as GET /api/moment/feed

**Authentication:** Required (Bearer token)

---

### GET /api/moment/timeline/{timelineId}
Get moments for a specific timeline (paginated).

**Route Parameters:**
- `timelineId` (long): Timeline ID

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:** Same as GET /api/moment/feed

**Authentication:** Required (Bearer token)

---

### GET /api/moment/available
Get moments available in a date range (paginated).

**Query Parameters:**
- `fromDate` (DateTime): Start date
- `toDate` (DateTime): End date
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:** Same as GET /api/moment/feed

**Authentication:** Required (Bearer token)

---

### POST /api/moment
Create a new moment.

**Request Body:**
```json
{
  "caption": "Beautiful sunset today!",
  "visibility": "Friends",
  "allowComment": true,
  "isShowLocation": true,
  "excludedUserIds": "125,126",
  "imageFileIds": ["guid-1", "guid-2"],
  "videoFileId": null
}
```

**Response:**
```json
{
  "data": {
    "id": 200,
    "userId": 123,
    "userName": "John Doe",
    "userImage": {...},
    "caption": "Beautiful sunset today!",
    "timelineId": null,
    "timeline": null,
    "visibility": "Friends",
    "status": "Active",
    "allowComment": true,
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "placeName": null,
      "isShowed": true
    },
    "images": [...],
    "video": null,
    "reactions": [],
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "success": true,
  "message": "Moment created"
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/moment/{momentId}/reactions
Add a reaction to a moment.

**Route Parameters:**
- `momentId` (long): Moment ID

**Request Body:**
```json
{
  "emoji": "❤️"
}
```

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Reaction added"
}
```

**Authentication:** Required (Bearer token)
**Rate Limit:** Applied (ReactionPolicy)

---

### GET /api/moment/{id}/reactions
Get reactions for a moment (paginated).

**Route Parameters:**
- `id` (long): Moment ID

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:**
```json
{
  "data": [
    {
      "userId": 125,
      "userName": "Bob Wilson",
      "userImage": {...},
      "emoji": "❤️",
      "reactedAt": "2024-01-01T12:05:00Z"
    }
  ],
  "success": true,
  "message": null,
  "hasNext": false,
  "nextCursor": null
}
```

**Authentication:** Required (Bearer token)

---

### POST /api/moment/{id}/hide
Hide a moment from feed.

**Route Parameters:**
- `id` (long): Moment ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Moment hidden"
}
```

**Authentication:** Required (Bearer token)

---

### PUT /api/moment/{id}/visibility
Update moment visibility.

**Route Parameters:**
- `id` (long): Moment ID

**Request Body:**
```json
{
  "visibility": "Public"
}
```

**Response:**
```json
{
  "data": {
    "id": 200,
    "userId": 123,
    "userName": "John Doe",
    "userImage": {...},
    "caption": "Beautiful sunset today!",
    "timelineId": null,
    "timeline": null,
    "visibility": "Public",
    "status": "Active",
    "allowComment": true,
    "location": {...},
    "images": [...],
    "video": null,
    "reactions": [...],
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "success": true,
  "message": "Visibility updated"
}
```

**Authentication:** Required (Bearer token)

---

### DELETE /api/moment/{id}
Delete a moment.

**Route Parameters:**
- `id` (long): Moment ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Moment deleted"
}
```

**Authentication:** Required (Bearer token)

---

## Timelines

### GET /api/timeline/{id}
Get timeline details by ID.

**Route Parameters:**
- `id` (long): Timeline ID

**Response:**
```json
{
  "data": {
    "id": 300,
    "userId": 123,
    "name": "My Timeline",
    "color": "#FF5733",
    "icon": "📅",
    "isDefault": false,
    "momentCount": 15,
    "createdAt": "2024-01-01T08:00:00Z"
  },
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/timeline/me
Get all timelines for current user (paginated).

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 300,
      "userId": 123,
      "name": "My Timeline",
      "color": "#FF5733",
      "icon": "📅",
      "isDefault": false,
      "momentCount": 15,
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ],
  "success": true,
  "message": null,
  "hasNext": false,
  "nextCursor": null
}
```

**Authentication:** Required (Bearer token)

---

### GET /api/timeline/user/{userId}
Get timelines for a specific user (paginated).

**Route Parameters:**
- `userId` (int): User ID

**Query Parameters:**
- `prevId` (long, optional): Previous page cursor ID
- `take` (int, optional): Number of items to take (default: 10)

**Response:** Same as GET /api/timeline/me

**Authentication:** Required (Bearer token)

---

### POST /api/timeline
Create a new timeline.

**Request Body:**
```json
{
  "name": "Travel Timeline",
  "color": "#3498DB",
  "icon": "✈️"
}
```

**Response:**
```json
{
  "data": {
    "id": 301,
    "userId": 123,
    "name": "Travel Timeline",
    "color": "#3498DB",
    "icon": "✈️",
    "isDefault": false,
    "momentCount": 0,
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "success": true,
  "message": "Timeline created"
}
```

**Authentication:** Required (Bearer token)

---

### DELETE /api/timeline/{id}
Delete a timeline.

**Route Parameters:**
- `id` (long): Timeline ID

**Response:**
```json
{
  "data": {},
  "success": true,
  "message": "Timeline deleted"
}
```

**Authentication:** Required (Bearer token)

---

## File Uploads

### POST /api/upload/presigned-upload
Get presigned URLs for file uploads to cloud storage.

**Request Body:**
```json
{
  "bucket": "user-uploads",
  "contentTypes": [
    "image/jpeg",
    "image/png",
    "video/mp4"
  ]
}
```

**Response:**
```json
{
  "data": [
    {
      "fileId": "guid-1",
      "presignedUrl": "https://s3.amazonaws.com/...",
      "contentType": "image/jpeg",
      "expiresAt": "2024-01-01T13:00:00Z"
    },
    {
      "fileId": "guid-2",
      "presignedUrl": "https://s3.amazonaws.com/...",
      "contentType": "image/png",
      "expiresAt": "2024-01-01T13:00:00Z"
    }
  ],
  "success": true,
  "message": null
}
```

**Authentication:** Required (Bearer token)

**Usage:**
1. Call this endpoint to get presigned URLs
2. Upload files directly to the presigned URLs using PUT requests
3. Use the returned `fileId` values in other API calls (avatars, moments, messages, etc.)

---

## SignalR Hubs

FriendHere uses SignalR for real-time communication. Connect to the hubs using WebSocket connections.

### AppHub
**URL:** `https://api.yourdomain.com/app`

**Authentication:** Bearer token in query string or header

#### Client Methods (Server → Client)
These methods are called by the server and received by the client:

**ReceiveKicked()** - Client was kicked from the server due to new connection

**ReceiveMessage(MessageDto message)** - New message received
```typescript
{
  id: 789,
  conversationId: 456,
  senderId: 124,
  senderName: "Jane Smith",
  content: "Hello!",
  type: "Text",
  createdAt: "2024-01-01T12:30:00Z",
  // ... other MessageDto fields
}
```

**ReceiveMessageEdited(MessageDto message)** - Message was edited

**ReceiveMessageDeleted(long messageId)** - Message was deleted

**ReceiveMessageReacted(MessageReactionNotificationDto data)** - Message reaction added
```typescript
{
  messageId: 789,
  reaction: {
    userId: 125,
    emoji: "👍"
  },
  conversationId: 456
}
```

**ReceiveMessageReactedRemoved(MessageReactionRemovedNotificationDto data)** - Message reaction removed

**ReceiveMessagesRead(MessageReadNotificationDto data)** - Messages were read by user

**ReceiveConversationUpdated(ConversationUpdatedNotificationDto data)** - Conversation details updated

**ReceiveNewConversation(ConversationDto conversation, MessageDto initialMessage)** - New conversation created

**ReceiveMemberRemoved(MemberRemovedData data)** - Member removed from group

**ReceiveMemberLeft(MemberLeftData data)** - Member left group

**ReceiveJoinRequestCreated(JoinRequestDto joinRequest)** - New join request created

**ReceiveJoinRequestProcessed(JoinRequestProcessedData data)** - Join request approved/rejected

**ReceiveGroupDeleted(GroupDeletedNotification data)** - Group conversation deleted

**ReceiveFriendshipCreated(FriendshipDto friendship)** - New friendship request

**ReceiveFriendshipAccepted(FriendshipDto friendship)** - Friendship accepted

**ReceiveFriendshipBlocked(FriendshipDto friendship)** - User blocked in friendship

**ReceiveFriendshipUnblocked(FriendshipDto friendship)** - User unblocked

**ReceiveChatBlocked(ChatBlockedData data)** - Direct conversation blocked

**ReceiveChatUnblocked(ChatUnblockedData data)** - Direct conversation unblocked

**ReceiveMomentReacted(MomentReactionNotificationDto data)** - Moment reaction added

**ReceiveFileMarkedSuccess(FileDto file)** - File upload completed successfully

**ReceiveTyping(TypingData data)** - User is typing in conversation
```typescript
{
  conversationId: 456,
  userId: 124,
  isTyping: true
}
```

**ReceiveCall(IncomingCallData data)** - Incoming video/voice call
```typescript
{
  callId: "call-123",
  callerId: 124,
  callerName: "Jane Smith",
  callerImage: {...},
  conversationId: 456,
  type: "Video",
  createdAt: "2024-01-01T12:30:00Z"
}
```

**ReceiveCallSignal(CallSignalData data)** - WebRTC call signaling data

#### Server Methods (Client → Server)
These methods are called by the client:

**JoinConversation(long id)** - Join a conversation for real-time updates

**SendMessage(AddMessageDto dto)** - Send a new message
```typescript
{
  conversationId: 456,
  content: "Hello!",
  messageType: "Text",
  fileIds: [],
  replyToId: null,
  momentId: null
}
```

**EditMessage(EditMessageDto dto)** - Edit an existing message
```typescript
{
  messageId: 789,
  content: "Updated message"
}
```

**DeleteMessage(DeleteMessageDto dto)** - Delete a message
```typescript
{
  messageId: 789,
  conversationId: 456
}
```

**ReactMessage(AddMessageReactionDto dto)** - Add reaction to message
```typescript
{
  messageId: 789,
  conversationId: 456,
  emoji: "👍"
}
```

**RemoveReactMessage(RemoveMessageReactionDto dto)** - Remove message reaction
```typescript
{
  messageId: 789,
  conversationId: 456,
  emoji: "👍"
}
```

**LeaveConversation(long id)** - Leave a conversation (stop receiving updates)

**Typing(long conversationId, bool isTyping)** - Send typing indicator

**Call(CallRequestDto request)** - Start a video/voice call
```typescript
{
  conversationId: 456,
  type: "Video"
}
```

**CallSignal(CallSignalDto signal)** - Send WebRTC signaling data
```typescript
{
  callId: "call-123",
  signal: {
    type: "offer",
    sdp: "...",
    candidate: null
  }
}
```

---

### LocationHub
**URL:** `https://api.yourdomain.com/location`

**Authentication:** Bearer token in query string or header

#### Client Methods (Server → Client)

**ReceiveLocations(IEnumerable<LocationDto> locations)** - Initial locations when joining

**NewJoin(UserDto user, LocationDto location)** - New user joined location sharing

**ReceiveUserDisconnect(int userId)** - User disconnected from location sharing

**ReceiveOtherMovement(LocationDto location)** - Other user updated their location

**ReceiveVisibilityUpdated(LocationDto location)** - User updated their visibility

**ReceiveBatteryUpdated(LocationDto location)** - User updated their battery level

**ReceiveStatusUpdated(LocationDto location)** - User updated their status

#### Server Methods (Client → Server)

**Join(JoinRequest request)** - Join location sharing
```typescript
{
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10.5,
  speed: 0.0
}
```

**UpdateLocation(double latitude, double longitude, double? accuracy, double? speed)** - Update current location

**UpdateVisibility(Visibility visibility)** - Update location visibility (Public, Friends, Private)

**UpdateBattery(int battery)** - Update battery percentage (0-100)

**UpdateStatus(string status)** - Update user status message

---

## Common DTOs

### FileDto
```typescript
{
  id: "guid",
  url: "https://cdn.example.com/file.jpg",
  type: "Image" | "Video"
}
```

### BaseResponse\<T\>
```typescript
{
  data: T,
  success: boolean,
  message: string | null
}
```

### BasePageResponse\<T\>
```typescript
{
  data: T[],
  success: boolean,
  message: string | null,
  hasNext: boolean,
  nextCursor: long | null
}
```

### Unit
Empty response type (equivalent to `{}`)

---

## Enums

### FriendshipStatus
- `Pending` - Friendship request sent, waiting for response
- `Accepted` - Friendship accepted
- `Rejected` - Friendship request rejected
- `Blocked` - One user blocked the other
- `Revoked` - Friendship request revoked

### FriendshipType
- `Friend` - Regular friend
- `CloseFriend` - Close friend (can see private moments)
- `BestFriend` - Best friend (highest privilege level)

### Visibility
- `Public` - Visible to everyone
- `Friends` - Visible to friends only
- `Private` - Visible to self only

### MessageType
- `Text` - Text message
- `Image` - Image attachment
- `Video` - Video attachment
- `Audio` - Audio attachment
- `File` - File attachment
- `Moment` - Moment share
- `System` - System message

### MessageStatus
- `Sent` - Message sent to server
- `Delivered` - Message delivered to recipient
- `Read` - Message read by recipient
- `Failed` - Message delivery failed

### MomentStatus
- `Active` - Moment is active and visible
- `Hidden` - Moment is hidden by user
- `Deleted` - Moment is deleted

### ConversationRole
- `Owner` - Conversation owner
- `Admin` - Conversation administrator
- `Member` - Regular member

### LocationSortBy
- `Distance` - Sort by distance from current user
- `UpdatedAt` - Sort by last update time

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `409` - Conflict (duplicate resource, state violation)
- `500` - Internal Server Error

### Rate Limiting
Some endpoints (like moment reactions) have rate limiting applied. When rate limits are exceeded:

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "data": null
}
```

---

## WebSocket Connection Examples

### JavaScript/TypeScript (SignalR Client)

```typescript
import * as signalR from '@microsoft/signalr';

// Connect to AppHub
const appHubConnection = new signalR.HubConnectionBuilder()
  .withUrl('https://api.yourdomain.com/app', {
    accessTokenFactory: () => getAuthToken()
  })
  .build();

// Set up event handlers
appHubConnection.on('ReceiveMessage', (message) => {
  console.log('New message:', message);
  // Handle new message
});

appHubConnection.on('ReceiveTyping', (data) => {
  console.log('User typing:', data.userId);
  // Show typing indicator
});

// Start connection
await appHubConnection.start();

// Call server methods
await appHubConnection.invoke('JoinConversation', conversationId);
await appHubConnection.invoke('SendMessage', {
  conversationId: 456,
  content: 'Hello!',
  messageType: 'Text',
  fileIds: [],
  replyToId: null,
  momentId: null
});
```

```typescript
// Connect to LocationHub
const locationHubConnection = new signalR.HubConnectionBuilder()
  .withUrl('https://api.yourdomain.com/location', {
    accessTokenFactory: () => getAuthToken()
  })
  .build();

// Set up location event handlers
locationHubConnection.on('ReceiveLocations', (locations) => {
  console.log('Active users:', locations);
  // Update map with user locations
});

locationHubConnection.on('NewJoin', (user, location) => {
  console.log('User joined location sharing:', user.name);
  // Add user to map
});

// Start connection
await locationHubConnection.start();

// Join location sharing
await locationHubConnection.invoke('Join', {
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10.5,
  speed: 0.0
});

// Update location
await locationHubConnection.invoke('UpdateLocation', 40.7130, -74.0065, 8.2, 1.5);
```

---

## Frontend Integration Tips

1. **Token Management**: Store and refresh tokens securely. Use the `/api/auth/refresh` endpoint before tokens expire.

2. **Real-time Updates**: Maintain SignalR connections for both AppHub and LocationHub to receive real-time updates.

3. **Pagination**: Use cursor-based pagination with `prevId` and `take` parameters for efficient data loading.

4. **File Uploads**: Get presigned URLs first, then upload directly to cloud storage, and use the returned `fileId` in API calls.

5. **Error Handling**: Implement proper error handling for network failures, rate limits, and authentication issues.

6. **Location Updates**: Throttle location updates to avoid excessive API calls (recommended: every 10-30 seconds).

7. **Caching**: Cache user profiles and conversation data to improve performance and reduce API calls.

8. **Typing Indicators**: Implement debouncing for typing indicators (wait 500ms after last keystroke before sending).

---

## Version History

- **v1.0.0** - Initial API documentation with all core features
  - Authentication (OAuth, email/password, token refresh)
  - User management and profiles
  - Chat and conversations (direct and group)
  - Friendships with multiple types
  - Location sharing with real-time updates
  - Moments with reactions
  - Timelines for organizing moments
  - File uploads with presigned URLs
  - SignalR hubs for real-time communication

---

For questions or support, contact the API development team or refer to the frontend integration guide.