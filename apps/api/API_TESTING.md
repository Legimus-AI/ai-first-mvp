# API Testing Guide

Complete curl commands to test all backend endpoints.

## Prerequisites

1. Start the database: `docker compose up -d`
2. Run migrations: `pnpm db:generate && pnpm db:migrate`
3. Seed database: `pnpm db:seed`
4. Start API: `pnpm dev:api`

Test credentials (from seed):
- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

---

## Auth Endpoints

### Register a new user

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "password": "password123",
    "role": "user"
  }'
```

Expected: 201 Created with `{ token, user }`

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "user123"
  }'
```

Expected: 200 OK with `{ token, user }`

**Save the token for authenticated requests below!**

### Get current user (authenticated)

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected: 200 OK with user object

---

## Users Endpoints (Admin)

### List users (paginated)

```bash
curl -X GET "http://localhost:3001/api/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Search users

```bash
curl -X GET "http://localhost:3001/api/users?search=admin" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get user by ID

```bash
# Replace USER_ID with an actual user ID from list response
curl -X GET http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update user

```bash
curl -X PATCH http://localhost:3001/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Updated Name"
  }'
```

### Delete user

```bash
curl -X DELETE http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected: 204 No Content

---

## Bots Endpoints

### List bots

```bash
curl -X GET "http://localhost:3001/api/bots?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get bot by ID

```bash
# Replace BOT_ID with an actual bot ID
curl -X GET http://localhost:3001/api/bots/BOT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create bot

```bash
curl -X POST http://localhost:3001/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "My Custom Bot",
    "systemPrompt": "You are a helpful assistant specialized in technical support.",
    "model": "gemini-2.0-flash",
    "welcomeMessage": "Hello! How can I help you today?",
    "isActive": true
  }'
```

Expected: 201 Created with bot object

### Update bot

```bash
curl -X PATCH http://localhost:3001/api/bots/BOT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Updated Bot Name",
    "isActive": false
  }'
```

### Delete bot

```bash
curl -X DELETE http://localhost:3001/api/bots/BOT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected: 204 No Content

---

## Documents Endpoints

### List all documents

```bash
curl -X GET "http://localhost:3001/api/documents?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### List documents by bot

```bash
curl -X GET "http://localhost:3001/api/documents?botId=BOT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get document by ID

```bash
curl -X GET http://localhost:3001/api/documents/DOC_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create document

```bash
curl -X POST http://localhost:3001/api/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "botId": "BOT_ID",
    "title": "FAQ",
    "content": "Frequently asked questions:\n\nQ: What is this?\nA: This is a sample document."
  }'
```

Expected: 201 Created with document object

### Update document

```bash
curl -X PATCH http://localhost:3001/api/documents/DOC_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Updated FAQ",
    "content": "Updated content here"
  }'
```

### Delete document

```bash
curl -X DELETE http://localhost:3001/api/documents/DOC_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected: 204 No Content

---

## Leads Endpoints

### List all leads

```bash
curl -X GET "http://localhost:3001/api/leads?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### List leads by bot

```bash
curl -X GET "http://localhost:3001/api/leads?botId=BOT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get lead by ID

```bash
curl -X GET http://localhost:3001/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Delete lead

```bash
curl -X DELETE http://localhost:3001/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected: 204 No Content

---

## Conversations Endpoints (Admin)

### List conversations

```bash
curl -X GET "http://localhost:3001/api/conversations?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### List conversations by bot

```bash
curl -X GET "http://localhost:3001/api/conversations?botId=BOT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get conversation with messages

```bash
curl -X GET http://localhost:3001/api/conversations/CONV_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Chat Endpoints (PUBLIC - No Auth)

### Send a chat message

```bash
curl -X POST http://localhost:3001/api/chat/BOT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "visitor-test-123",
    "message": "Hello! Can you help me with returns?"
  }'
```

Expected: 200 OK with `{ reply, conversationId }`

The bot will:
1. Find or create a conversation for this senderId + botId
2. Get cached message history from Redis (or DB)
3. Load bot configuration and documents
4. Call Gemini API with context
5. Save user message + AI response
6. Update cache
7. Return AI reply

### Get chat history

```bash
curl -X GET "http://localhost:3001/api/chat/history/BOT_ID?senderId=visitor-test-123"
```

Expected: 200 OK with array of messages for this sender

---

## Pagination Examples

All list endpoints support pagination:

```bash
# Page 2, 20 items per page
curl -X GET "http://localhost:3001/api/users?page=2&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Search + pagination
curl -X GET "http://localhost:3001/api/bots?search=support&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Sort by name ascending
curl -X GET "http://localhost:3001/api/documents?sort=title&order=asc" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Response format:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasMore": true
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Bot not found",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Error codes:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## OpenAPI Documentation

- Swagger UI: http://localhost:3001/ui
- OpenAPI JSON: http://localhost:3001/doc

---

## Complete E2E Flow Example

```bash
# 1. Register a new user
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "testpass123"
  }' | jq -r '.token')

echo "Token: $TOKEN"

# 2. Create a bot
BOT_ID=$(curl -s -X POST http://localhost:3001/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Bot",
    "systemPrompt": "You are a test bot.",
    "welcomeMessage": "Hi there!"
  }' | jq -r '.id')

echo "Bot ID: $BOT_ID"

# 3. Add a document to the bot
curl -X POST http://localhost:3001/api/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"botId\": \"$BOT_ID\",
    \"title\": \"Product Info\",
    \"content\": \"We sell amazing products.\"
  }"

# 4. Test the chat (PUBLIC endpoint, no auth needed)
curl -X POST http://localhost:3001/api/chat/$BOT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "visitor-xyz",
    "message": "Tell me about your products"
  }'

# 5. Get chat history
curl -X GET "http://localhost:3001/api/chat/history/$BOT_ID?senderId=visitor-xyz"
```

---

## Notes

- All authenticated endpoints require `Authorization: Bearer TOKEN` header
- Chat endpoints (`/api/chat`) are PUBLIC and do NOT require authentication
- Auth endpoints (`/api/auth`) are PUBLIC
- All other endpoints require authentication
- Rate limit: 100 requests/minute per IP
- Request IDs are included in all responses and errors for tracing
