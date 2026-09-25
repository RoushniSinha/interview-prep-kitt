# Security Specification & Test-Driven Rules Blueprint (Phase 0)

## 1. Data Invariants & Access Control Policy
1. **User Invariant**: A user profile in `/users/{userId}` must strictly have `userId == request.auth.uid`. No user may read another user's email or profile (PII Isolation).
2. **Kit Invariant**: A kit in `/kits/{kitId}` belongs strictly to the creator (`userId == request.auth.uid`). Users can only query, fetch, create, update, or delete their own kits.
3. **Immutability Invariant**: Ownership fields (`userId`) cannot be modified on update.
4. **Volume & Integrity Invariant**: All identifiers must be bounded (`isValidId(id)` <= 128 chars, alphanumeric + dashes/underscores). Arrays are bounded to prevent denial-of-wallet resource exhaustion.
5. **Catch-All Default Deny**: Every undefined collection or root path is strictly blocked from read/write.

## 2. The "Dirty Dozen" Threat Payloads (Security Verification Matrix)
1. **Ghost Field Poisoning**: Inserting shadow/privilege escalation fields (e.g., `{ isAdmin: true }`) into `/users/{userId}`. (Blocked by `hasOnly` strict key validation).
2. **Identity Spoofing on Kit Creation**: Creating a kit with `incoming().userId = 'victim_uid'` while authenticated as `'attacker_uid'`. (Blocked by `incoming().userId == request.auth.uid`).
3. **Cross-Tenant Kit Retrieval**: User B executing `get` or `list` on User A's kit document. (Blocked by `resource.data.userId == request.auth.uid`).
4. **Cross-Tenant Kit Mutation**: User B updating or deleting User A's kit. (Blocked by `resource.data.userId == request.auth.uid`).
5. **Ownership Tampering**: Attempting to alter `userId` on existing kit during update. (Blocked by `incoming().userId == existing().userId`).
6. **Path ID Poisoning**: Supplying a 2KB buffer or control chars as `{kitId}` or `{userId}`. (Blocked by `isValidId()`).
7. **PII Query Scraping**: Unauthenticated user or non-owner attempting `allow list` or `get` on `/users`. (Blocked by mandatory `request.auth.uid == userId` and no blanket list).
8. **Unverified Email Mutation**: Malicious actor writing documents with unverified credentials. (Guarded by email verification constraints).
9. **Denial of Wallet Huge Arrays**: Submitting 50,000 flashcards or questions in a single kit document. (Blocked by `.size() <= 100` and `.size() <= 150` bounds).
10. **Type Mismatch Injection**: Submitting non-map values for `source` or `role`. (Blocked by explicit `is map` type checks in `isValidKit`).
11. **Orphaned Write / Update-Gap**: Updating a document without satisfying the comprehensive `isValidKit` validator. (Blocked by prefixing all update statements with `isValidKit`).
12. **Catch-All Exploitation**: Attempting read or write on undeclared collection `/system_secrets/{id}`. (Blocked by `match /{document=**} { allow read, write: if false; }`).
