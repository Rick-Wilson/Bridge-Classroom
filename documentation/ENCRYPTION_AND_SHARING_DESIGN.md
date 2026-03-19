# Encryption and Sharing Design

## Overview

Bridge Classroom uses client-side encryption so the server never sees raw observation data. Each student has a single AES-256-GCM secret key that encrypts all their observations. Authorized viewers (teachers, admin) access student data through RSA-encrypted sharing grants that contain the student's secret key.

Account recovery uses two independent mechanisms: automated email-based magic links (primary) and admin RSA sharing grants (fallback).

## Design Principles

1. **Single Encryption** — Each observation encrypted once with student's symmetric key
2. **Key Sharing** — Student's secret key shared with authorized viewers via RSA encryption
3. **No Passwords** — Students authenticate via UUID + local secret key, not passwords
4. **Automated Recovery** — Email magic link restores account without admin intervention
5. **Admin Fallback** — Admin RSA sharing grant provides manual recovery capability
6. **No Data Duplication** — Viewers decrypt the same records, not separate copies

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  STUDENT CREATES DATA                                           │
│                                                                 │
│  Observation → Encrypt with Student's Secret Key → Store        │
│                                                                 │
│  (Only ONE encrypted copy exists on the server)                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SHARING GRANTS                                                 │
│                                                                 │
│  Student grants access to Teacher:                              │
│  1. Fetch Teacher's RSA public key from server                  │
│  2. RSA-encrypt the raw AES secret key bytes                    │
│  3. Store encrypted payload in sharing_grants table             │
│                                                                 │
│  Teacher decrypts:                                              │
│  1. Fetch sharing grant (encrypted for them)                    │
│  2. RSA-decrypt with their private key → student's secret key   │
│  3. Use secret key to decrypt student's observations            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ACCOUNT RECOVERY (Two mechanisms)                              │
│                                                                 │
│  1. Email Magic Link (Primary):                                 │
│     - Server stores AES-encrypted copy of student's secret key  │
│     - Student requests recovery → server sends email with link  │
│     - Link contains one-time token → server decrypts and        │
│       returns secret key                                        │
│                                                                 │
│  2. Admin RSA Grant (Fallback):                                 │
│     - On registration, admin sharing grant created              │
│     - Admin can decrypt with their private key if email fails   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Types

### Student Secret Key (Symmetric)
- **Algorithm:** AES-256-GCM
- **Purpose:** Encrypts all student's observations
- **Generation:** Client-side via Web Crypto API at registration
- **Storage:** Student's localStorage; also server-side in `recovery_encrypted_key` (encrypted with RECOVERY_SECRET)
- **Lifecycle:** Created once at registration, never changes

### Viewer Keypair (Asymmetric)
- **Algorithm:** RSA-OAEP, 2048-bit, SHA-256
- **Purpose:** Encrypts sharing grants TO that viewer
- **Storage:** Public key on server (viewers table); private key on viewer's device
- **Who has one:** Teachers, admin — anyone who might receive shared access

### Recovery Secret (Server-Side)
- **Algorithm:** AES-256-GCM with key derived via SHA-256 from RECOVERY_SECRET
- **Purpose:** Server-side encryption of student's secret key for email recovery
- **Storage:** RECOVERY_SECRET environment variable (never exposed to clients)
- **Lifecycle:** Set once in server configuration

---

## Data Flow

### Student Registration

```
1. Student enters: firstName, lastName, email, classroom
2. Client generates AES-256-GCM secret key (crypto.subtle.generateKey)
3. Store in localStorage
4. Fetch admin's RSA public key from GET /api/keys/admin
5. Create admin sharing grant:
   - RSA-encrypt raw secret key bytes with admin's public key
6. Register with server (POST /api/users):
   - user_id, firstName, lastName, email, classroom
   - secret_key (plaintext — server encrypts with RECOVERY_SECRET before storing)
   - admin_grant { grantee_id, encrypted_payload }
7. Server encrypts secret_key → stores as recovery_encrypted_key
8. Server stores admin sharing grant in sharing_grants table
9. Client shows key backup download modal
```

### Recording Observations

```
1. Student completes bid prompt
2. Create observation object (JSON)
3. Generate random 96-bit IV
4. Encrypt observation JSON with student's secret key (AES-256-GCM)
5. Queue for sync:
   {
     encrypted_data: base64(ciphertext),
     iv: base64(iv),
     metadata: {                        // Unencrypted — for server-side queries
       observation_id, user_id,
       timestamp, skill_path, correct,
       classroom, deal_subfolder, deal_number
     }
   }
6. Sync sends to POST /api/observations
```

### Granting Access (Sharing Grants)

```
1. Student goes to share access
2. Fetch viewer's RSA public key from server
3. RSA-encrypt the raw AES secret key bytes:
   encrypted_payload = RSA_Encrypt(secret_key_bytes, viewer_public_key)
4. POST sharing grant to server:
   {
     grantor_id: student's user_id,
     grantee_id: viewer's user_id,
     encrypted_payload: base64(RSA-encrypted secret key)
   }
```

**Note:** The encrypted payload contains only the raw secret key bytes, not a JSON object. Student identity is available from the grant metadata (grantor_id → users table).

### Viewer Reads Student Data

```
1. Teacher authenticates (password + private key)
2. Fetch all sharing grants: GET /api/grants?grantee_id=<viewer_id>
3. For each grant:
   a. RSA-decrypt encrypted_payload with teacher's private key
   b. Recover student's AES secret key
4. For each student, fetch observations: GET /api/observations?user_id=<id>
5. Decrypt observations with student's secret key (AES-256-GCM)
6. Display dashboard
```

### Revoking Access

```
1. Student goes to Settings → Manage Access
2. Sees list of current grants
3. Clicks "Revoke" on a grant
4. Server marks grant as revoked: true
5. Viewer can no longer fetch that grant

Note: If viewer cached the key locally, they could still decrypt
until their cache expires. For stronger revocation, student would
need to re-key (generate new secret, re-encrypt all observations).
```

---

## Account Recovery

### Primary: Email Magic Link

This is the automated recovery path. No admin intervention required.

```
1. Student loses localStorage (new device, cleared browser)
2. During re-registration, server detects email already exists
   - Returns existing_user: true, prompting recovery flow
3. Student enters email in recovery form
4. POST /api/recovery/request { email }
5. Server:
   a. Finds user by email
   b. Checks recovery_encrypted_key exists
   c. Generates 32-byte random token (URL-safe base64)
   d. Stores SHA-256(token) in recovery_tokens table (1-hour expiry)
   e. Sends email via Resend API with magic link:
      https://bridge-classroom.com?recover={token}&user_id={id}
   f. If email fails, logs link to stdout for manual delivery
6. Student clicks link in email
7. Frontend detects ?recover= params, calls POST /api/recovery/claim
   { user_id, token }
8. Server:
   a. Hashes token, looks up in recovery_tokens (not used, not expired)
   b. Marks token as used (one-time)
   c. Fetches user's recovery_encrypted_key
   d. Decrypts with RECOVERY_SECRET → recovers plaintext secret key
   e. Returns { id, first_name, last_name, email, secret_key, classroom }
9. Frontend restores user to localStorage, resumes normal operation
```

**Security properties:**
- Token is single-use and expires in 1 hour
- Server stores only token hash (SHA-256), not plaintext token
- Old tokens for same user are deleted when a new recovery is requested
- Secret key is encrypted at rest with AES-256-GCM (keyed from RECOVERY_SECRET)

### Fallback: Admin RSA Grant

If email recovery is unavailable (RECOVERY_SECRET not configured, email not delivered, pre-recovery accounts):

```
1. Student contacts teacher/admin
2. Admin fetches their sharing grant for that student
3. Admin decrypts with their RSA private key → gets student's secret key
4. Admin provides key back to student (out-of-band)
5. Student imports key via backup restore
```

### Tertiary: Key Backup File

Students can download a JSON backup file after registration:

```json
{
  "bridge_practice_backup": true,
  "version": "2.0",
  "user_id": "uuid",
  "name": "Margaret Thompson",
  "email": "margaret@example.com",
  "secret_key": "base64-encoded-aes-key",
  "created": "2026-01-29",
  "note": "Keep this file safe. Import it to restore your practice history on a new device."
}
```

---

## User Registration Fields

### Stored in localStorage
```javascript
{
  "bridgePractice": {
    "currentUserId": "uuid",
    "adminViewerId": "uuid",
    "users": {
      "uuid": {
        "id": "uuid",
        "firstName": "Margaret",
        "lastName": "Thompson",
        "email": "margaret@example.com",
        "classrooms": ["tuesday-am"],
        "secretKey": "base64-encoded-aes-key",
        "dataConsent": true,
        "serverRegistered": true,
        "adminGrantPayload": { ... },
        "createdAt": "2026-01-29T10:00:00Z",
        "updatedAt": "2026-01-29T10:00:00Z"
      }
    }
  }
}
```

### Sent to Server at Registration
```json
{
  "user_id": "uuid",
  "first_name": "Margaret",
  "last_name": "Thompson",
  "email": "margaret@example.com",
  "classroom": "tuesday-am",
  "data_consent": true,
  "secret_key": "base64-aes-key",
  "admin_grant": {
    "grantee_id": "admin-viewer-uuid",
    "encrypted_payload": "base64-rsa-encrypted-key"
  }
}
```

**Note:** The `secret_key` is sent in plaintext during registration only. The server immediately encrypts it with RECOVERY_SECRET (AES-256-GCM) and stores the ciphertext in `recovery_encrypted_key`. The plaintext is never stored on the server.

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  classroom TEXT,
  data_consent INTEGER NOT NULL DEFAULT 1,
  recovery_encrypted_key TEXT,          -- AES-encrypted secret key (for email recovery)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_classroom ON users(classroom);
```

### Viewers Table
```sql
CREATE TABLE viewers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,             -- RSA-OAEP public key (SPKI, base64)
  role TEXT NOT NULL DEFAULT 'teacher', -- admin, teacher
  created_at TEXT NOT NULL
);

CREATE INDEX idx_viewers_email ON viewers(email);
```

### Sharing Grants Table
```sql
CREATE TABLE sharing_grants (
  id TEXT PRIMARY KEY,
  grantor_id TEXT NOT NULL,             -- Student user ID
  grantee_id TEXT NOT NULL,             -- Viewer ID (teacher/admin)
  encrypted_payload TEXT NOT NULL,      -- RSA-encrypted raw AES key bytes
  granted_at TEXT NOT NULL,
  expires_at TEXT,                      -- NULL = never expires
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT,
  FOREIGN KEY (grantor_id) REFERENCES users(id),
  FOREIGN KEY (grantee_id) REFERENCES viewers(id),
  UNIQUE(grantor_id, grantee_id)
);

CREATE INDEX idx_grants_grantor ON sharing_grants(grantor_id);
CREATE INDEX idx_grants_grantee ON sharing_grants(grantee_id);
```

### Observations Table
```sql
CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  correct INTEGER NOT NULL,
  classroom TEXT,
  deal_subfolder TEXT,
  deal_number INTEGER,
  encrypted_data TEXT NOT NULL,         -- AES-256-GCM ciphertext (base64)
  iv TEXT NOT NULL,                     -- 96-bit IV (base64)
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_observations_user_id ON observations(user_id);
CREATE INDEX idx_observations_classroom ON observations(classroom);
CREATE INDEX idx_observations_timestamp ON observations(timestamp);
CREATE INDEX idx_observations_skill_path ON observations(skill_path);
```

### Recovery Tokens Table
```sql
CREATE TABLE recovery_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,             -- SHA-256 hash of the actual token
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,             -- 1 hour from creation
  used INTEGER NOT NULL DEFAULT 0,      -- Prevents reuse
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_recovery_tokens_user_id ON recovery_tokens(user_id);
```

**Notes:**
- All IDs are UUIDs stored as TEXT
- All timestamps are ISO 8601 strings (TEXT, not TIMESTAMP)
- Booleans are INTEGER (0/1)
- Migrations use `CREATE TABLE IF NOT EXISTS` (inline in Rust, no migration directory)

---

## API Endpoints

### Users

```
POST /api/users
  Register or update a user
  Body: { user_id, first_name, last_name, email, classroom?,
          data_consent?, secret_key?, admin_grant? }
  → { success, user_id, existing_user? }
  Note: If email exists with different user_id, returns existing_user: true

GET /api/users
  List all users (requires x-api-key header)
  → { users: [...] }
```

### Recovery

```
POST /api/recovery/request
  Request account recovery email
  Body: { email }
  → { success, message, user_id? }

POST /api/recovery/claim
  Claim recovery with token from email
  Body: { user_id, token }
  → { success, user?: { id, first_name, last_name, email, secret_key, classroom }, error? }
```

### Keys

```
GET /api/keys/admin
  Get admin's RSA public key (for creating sharing grants)
  → { viewer_id, public_key }
```

### Viewers

```
POST /api/viewers
  Register a viewer (teacher, admin)
  Body: { name, email, public_key, role }
  → { viewer_id }

GET /api/viewers?email=<email>
  Look up viewer by email
  → { viewer_id, name, public_key }
```

### Sharing Grants

```
POST /api/grants
  Create a sharing grant
  Body: { grantor_id, grantee_id, encrypted_payload, expires_at? }
  → { grant_id }

GET /api/grants?grantee_id=<viewer_id>
  Get all active grants for a viewer
  → { grants: [...] }

GET /api/grants?grantor_id=<user_id>
  Get all grants a student has issued
  → { grants: [...] }

DELETE /api/grants/:id
  Revoke a grant (sets revoked=true)
  → { success: true }
```

### Observations

```
POST /api/observations
  Store encrypted observations
  Body: { observations: [{ encrypted_data, iv, metadata }] }
  → { received, stored }

GET /api/observations?user_id=<uuid>
  Get observations for a user
  → { observations: [...] }
```

---

## Crypto Implementation

### Generate Student Secret Key
```javascript
async function generateSecretKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,  // extractable
    ['encrypt', 'decrypt']
  )
  const rawKey = await crypto.subtle.exportKey('raw', key)
  return arrayBufferToBase64(rawKey)
}
```

### Encrypt Observation
```javascript
async function encryptObservation(observation, secretKeyBase64) {
  const secretKey = await importSecretKey(secretKeyBase64)
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV

  const data = new TextEncoder().encode(JSON.stringify(observation))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    secretKey,
    data
  )

  return {
    encrypted_data: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  }
}
```

### Create Sharing Grant
```javascript
async function createSharingGrant(secretKeyBase64, viewerPublicKeyBase64) {
  const viewerPublicKey = await importPublicKey(viewerPublicKeyBase64)
  const secretKeyBuffer = base64ToArrayBuffer(secretKeyBase64)

  // RSA-OAEP encrypt the raw AES key bytes
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    viewerPublicKey,
    secretKeyBuffer
  )

  return arrayBufferToBase64(encrypted)
}
```

### Decrypt Sharing Grant (Viewer Side)
```javascript
async function decryptSharingGrant(encryptedPayload, viewerPrivateKeyBase64) {
  const viewerPrivateKey = await importPrivateKey(viewerPrivateKeyBase64)
  const encryptedBuffer = base64ToArrayBuffer(encryptedPayload)

  // RSA-OAEP decrypt to recover the raw AES key
  const secretKeyBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    viewerPrivateKey,
    encryptedBuffer
  )

  return arrayBufferToBase64(secretKeyBuffer)
}
```

### Server-Side Recovery Encryption (Rust)
```rust
fn encrypt_for_recovery(secret_key: &str, recovery_secret: &str) -> Result<String> {
    // Derive 256-bit key from RECOVERY_SECRET via SHA-256
    let key_bytes = sha256(recovery_secret);
    let key = AES_256_GCM::new(key_bytes);

    // Random 96-bit nonce
    let nonce = random_bytes(12);

    // Encrypt the secret key
    let ciphertext = aes_gcm_seal(key, nonce, secret_key.as_bytes());

    // Store as base64(nonce || ciphertext || tag)
    Ok(base64_encode(nonce + ciphertext))
}
```

---

## Server Configuration

### Required Environment Variables

```bash
DATABASE_URL=sqlite:./data/bridge_classroom.db
API_KEY=<api-key>

# Recovery (required for email-based account recovery)
RECOVERY_SECRET=<random-secret>          # Encrypts/decrypts student secret keys
RESEND_API_KEY=<resend-api-key>          # Sends recovery emails (optional — falls back to stdout)
FROM_EMAIL=Bridge Classroom <noreply@harmonicsystems.com>
FRONTEND_URL=https://bridge-classroom.com  # Base URL for recovery links

# Auth
TEACHER_PUBLIC_KEY=<base64-rsa-public-key>  # Admin/teacher RSA public key

# Server
HOST=127.0.0.1
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,https://bridge-classroom.com,https://www.bridge-classroom.com
```

---

## Security Considerations

### What's Protected
- Observation content (AES-256-GCM encrypted with student's key)
- Student's secret key at rest on server (AES-256-GCM encrypted with RECOVERY_SECRET)
- Sharing grant payloads (RSA-OAEP encrypted for specific viewers)

### What's Not Protected (by design)
- User names and emails (stored plaintext — needed for queries/display)
- Observation metadata (timestamp, skill_path, correct — needed for server-side aggregation)
- Who has shared with whom (grant relationships)

### Recovery Security
- Recovery tokens: single-use, 1-hour expiry, stored as SHA-256 hash
- Secret key transit during registration: sent once over HTTPS, immediately encrypted server-side
- RECOVERY_SECRET compromise: would expose all recovery-encrypted keys — keep it secure
- No RECOVERY_SECRET: email recovery unavailable; admin RSA grant or backup file still work

### Revocation Limitations
- Revoking a sharing grant removes server-side access
- If viewer cached the key locally, they could still decrypt until cache cleared
- For true revocation, student would need to rotate their key and re-encrypt all observations

### Trust Model
- Students trust viewers they share with
- All students trust admin (automatic sharing grant at registration)
- Server operator can see metadata but not observation content
- Server operator with RECOVERY_SECRET can recover any student's key (this is by design for a classroom app)
