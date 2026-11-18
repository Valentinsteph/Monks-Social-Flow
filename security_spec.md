# Security Specification (Phase 0)

## 1. Data Invariants
1. **Authenticated & Verified Workspace Access**: Every read and write requires `request.auth != null && request.auth.token.email_verified == true`.
2. **Master Gate Relational Integrity**: Subcollections (`/boards/{boardId}/projects/{projectId}`, `/boards/{boardId}/columns/{columnId}`, `/boards/{boardId}/cards/{cardId}`) cannot exist without a valid parent `/boards/{boardId}` document (`existsAfter(...)` on create, `exists(...)` on read/update/delete).
3. **Path-to-Data Consistency**: Every document's `id` and `boardId` fields must match the document ID and parent `boardId` path parameter, both matching `^[a-zA-Z0-9_\-]+$` with max length 128.
4. **Identity Integrity & Immutability**: On create, `ownerId` must equal `request.auth.uid`. On update, `ownerId`, `boardId`, and `createdAt` are immutable.
5. **Temporal Integrity**: On create, `createdAt == request.time && updatedAt == request.time`. On update, `updatedAt == request.time`.
6. **Strict Schema & Size Bounds**: Every string has an explicit `.size()` upper bound; `platforms` is strictly bounded (`size >= 1 && size <= 4`) and allowlisted via `.hasOnly(['instagram', 'youtube', 'x', 'facebook'])`; ghost/shadow fields are rejected via `keys().hasAll(...) && keys().hasOnly(...)` and action-based `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read or write any board/card with `request.auth == null`.
2. **Unverified Email Spoofing**: Write with `request.auth != null` and `request.auth.token.email_verified == false`.
3. **Orphaned Subcollection Create**: Create `/boards/nonexistent/cards/card-1` when `/boards/nonexistent` does not exist.
4. **ID Poisoning**: Create a card with document ID containing invalid characters (`card$invalid`) or > 128 chars.
5. **Identity Spoofing on Create**: Create a card with `ownerId: "victim-uid"` when `request.auth.uid == "attacker-uid"`.
6. **Shadow / Ghost Field Injection on Create**: Create a card including `"isAdmin": true` alongside valid fields.
7. **Shadow Update / Ghost Field on Update**: Update a card adding `"extraFlag": "pwned"`.
8. **Immutable Field Tampering**: Update a card attempting to change `ownerId`, `boardId`, or `createdAt`.
9. **Client Timestamp Forgery**: Create or update a card with a client-supplied string timestamp instead of `request.time`.
10. **Platform Array Poisoning**: Create a card with `platforms: ["tiktok"]` or `platforms: []` or > 4 items.
11. **Denial-of-Wallet Oversized String**: Create a card with `title` > 200 chars or `caption` > 5000 chars.
12. **Blanket Unscoped List Query**: Attempt `list` on `/boards` without matching `visibility == 'workspace'` or `ownerId == request.auth.uid`.
