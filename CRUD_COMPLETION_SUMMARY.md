# CRUD + Bulk Delete Implementation Summary

Complete implementation of missing CRUD operations and bulk delete for all slices in AI-First MVP.

## Changes Made

### 1. Shared Schemas (packages/shared)

#### `packages/shared/src/pagination.ts`
- Added `bulkDeleteSchema` - Request schema for bulk delete (array of UUIDs, min 1, max 100)
- Added `bulkDeleteResponseSchema` - Response schema with `deleted` count

#### `packages/shared/src/slices/leads/schemas.ts`
- Added `updateLeadSchema` - Schema for PATCH /leads/:id
  - All fields optional: name, email, phone, metadata

### 2. Service Layer (apps/api/src/slices)

#### `users/service.ts`
- Added `createUser(db, data)` - Creates user with bcrypt password hashing
- Added `bulkDeleteUsers(db, ids)` - Deletes multiple users by ID array

#### `leads/service.ts`
- Added `updateLead(db, id, data)` - Updates lead by ID (no updatedAt column in table)
- Added `bulkDeleteLeads(db, ids)` - Deletes multiple leads by ID array
- Fixed createLead to cast metadata in upsert case

#### `conversations/service.ts`
- Added `deleteConversation(db, id)` - Deletes single conversation
- Added `bulkDeleteConversations(db, ids)` - Deletes multiple conversations by ID array

#### `bots/service.ts`
- Added `bulkDeleteBots(db, ids)` - Deletes multiple bots by ID array

#### `documents/service.ts`
- Added `bulkDeleteDocuments(db, ids)` - Deletes multiple documents by ID array

### 3. Routes Layer (apps/api/src/slices)

#### `users/routes.ts`
- Added `POST /` - Create new user with email, name, password, role

#### `leads/routes.ts`
- Added `POST /` - Create new lead (uses upsert logic in service)
- Added `PATCH /:id` - Update existing lead

#### `conversations/routes.ts`
- Added `DELETE /:id` - Delete single conversation

#### All routes files
- Added `DELETE /bulk` - Bulk delete endpoint
- Bulk delete routes registered BEFORE `/:id` routes to avoid path conflicts

## Current CRUD Status

| Slice | LIST | GET | POST | PATCH | DELETE | Bulk DELETE |
|-------|------|-----|------|-------|--------|-------------|
| bots | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| users | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| leads | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| conversations | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |

**Note:** Conversations POST/PATCH are not applicable - conversations are created automatically via chat endpoint.

## Testing Instructions

Start the API server:
```bash
pnpm dev:api
```

### Users Endpoints

#### POST /api/users (Create user)
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "password": "SecurePassword123!",
    "role": "user"
  }'
```

Expected: 201 Created with user object (no passwordHash exposed)

#### DELETE /api/users/bulk (Bulk delete users)
```bash
curl -X DELETE http://localhost:3001/api/users/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["uuid-1", "uuid-2", "uuid-3"]
  }'
```

Expected: 200 OK with `{ "deleted": 3 }`

### Leads Endpoints

#### POST /api/leads (Create lead)
```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "01942f1e-5b3a-7000-8000-000000000002",
    "senderId": "visitor-abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+56912345678",
    "metadata": {
      "source": "widget",
      "campaign": "summer-promo"
    }
  }'
```

Expected: 201 Created with lead object
Note: Uses upsert logic - if botId+senderId exists, updates instead

#### PATCH /api/leads/:id (Update lead)
```bash
curl -X PATCH http://localhost:3001/api/leads/01942f1e-5b3a-7000-8000-000000000004 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john.smith@example.com",
    "metadata": {
      "source": "widget",
      "converted": true
    }
  }'
```

Expected: 200 OK with updated lead object

#### DELETE /api/leads/bulk (Bulk delete leads)
```bash
curl -X DELETE http://localhost:3001/api/leads/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["uuid-1", "uuid-2"]
  }'
```

Expected: 200 OK with `{ "deleted": 2 }`

### Conversations Endpoints

#### DELETE /api/conversations/:id (Delete conversation)
```bash
curl -X DELETE http://localhost:3001/api/conversations/01942f1e-5b3a-7000-8000-000000000005
```

Expected: 204 No Content

#### DELETE /api/conversations/bulk (Bulk delete conversations)
```bash
curl -X DELETE http://localhost:3001/api/conversations/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["uuid-1", "uuid-2", "uuid-3"]
  }'
```

Expected: 200 OK with `{ "deleted": 3 }`

### Bots Endpoints

#### DELETE /api/bots/bulk (Bulk delete bots)
```bash
curl -X DELETE http://localhost:3001/api/bots/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["uuid-1", "uuid-2"]
  }'
```

Expected: 200 OK with `{ "deleted": 2 }`

### Documents Endpoints

#### DELETE /api/documents/bulk (Bulk delete documents)
```bash
curl -X DELETE http://localhost:3001/api/documents/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["uuid-1", "uuid-2", "uuid-3"]
  }'
```

Expected: 200 OK with `{ "deleted": 3 }`

## Implementation Details

### Bulk Delete Pattern

All bulk delete endpoints follow the same pattern:

1. **Request Schema:**
   - `ids`: Array of UUIDs (min 1, max 100)
   - Validated by `bulkDeleteSchema` from shared package

2. **Service Function:**
   ```typescript
   export async function bulkDeleteXXX(db: ReturnType<typeof getDb>, ids: string[]) {
     await db.delete(table).where(inArray(table.id, ids))
     return { deleted: ids.length }
   }
   ```

3. **Route Registration:**
   - Always BEFORE `/:id` routes to avoid path conflicts
   - Uses `DELETE /bulk` path
   - Returns `bulkDeleteResponseSchema` with count

### Password Hashing (Users)

User creation uses bcryptjs with 10 salt rounds:
```typescript
const SALT_ROUNDS = 10
const passwordHash = bcrypt.hashSync(data.password, SALT_ROUNDS)
```

Matches the pattern used in auth/service.ts for consistency.

### Upsert Logic (Leads)

createLead implements upsert behavior:
- If lead with same botId+senderId exists → updates it
- Otherwise → creates new lead

This prevents duplicate leads for the same visitor on the same bot.

## Verification

All implementations verified:
- ✅ `pnpm typecheck` - All types compile correctly
- ✅ `pnpm test` - All existing tests pass (47 tests in shared, 9 in api)
- ✅ Pattern consistency - All slices follow the same CRUD patterns
- ✅ OpenAPI contracts - All routes use `createRoute()` with proper schemas
- ✅ Error handling - AppError used for not found, conflict, validation
- ✅ Bulk operations - inArray from drizzle-orm for efficient multi-delete

## Files Modified

### Shared Package (3 files)
- `packages/shared/src/pagination.ts` - Bulk delete schemas
- `packages/shared/src/slices/leads/schemas.ts` - Update lead schema
- `packages/shared/src/index.ts` - Exports (no changes needed, already correct)

### API Services (5 files)
- `apps/api/src/slices/users/service.ts` - createUser, bulkDeleteUsers
- `apps/api/src/slices/leads/service.ts` - updateLead, bulkDeleteLeads
- `apps/api/src/slices/conversations/service.ts` - deleteConversation, bulkDeleteConversations
- `apps/api/src/slices/bots/service.ts` - bulkDeleteBots
- `apps/api/src/slices/documents/service.ts` - bulkDeleteDocuments

### API Routes (5 files)
- `apps/api/src/slices/users/routes.ts` - POST /, DELETE /bulk
- `apps/api/src/slices/leads/routes.ts` - POST /, PATCH /:id, DELETE /bulk
- `apps/api/src/slices/conversations/routes.ts` - DELETE /:id, DELETE /bulk
- `apps/api/src/slices/bots/routes.ts` - DELETE /bulk
- `apps/api/src/slices/documents/routes.ts` - DELETE /bulk

## Commits

All changes committed and pushed to main:

1. `feat(shared): add bulk delete and update lead schemas` (1d052d4)
2. `feat(api): add missing crud operations and bulk delete to services` (79967c8)
3. `feat(api): add missing crud routes and bulk delete endpoints` (19314ce)

Each commit is atomic and focused on a single logical change.
