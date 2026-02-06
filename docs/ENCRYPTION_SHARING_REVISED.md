# Encryption and Sharing Strategy (Revised)

## Overview

This document replaces the dual-encryption approach with a simpler, more flexible key-sharing model. Instead of encrypting observations multiple times for each viewer, we encrypt once with the student's key and share the key itself with authorized viewers.

## Design Principles

1. **Single Encryption** — Each observation encrypted once with student's symmetric key
2. **Key Sharing** — Student shares their secret key with authorized viewers
3. **Flexible Authorization** — Student can share with teachers, partners, anyone
4. **Admin Recovery** — Site admin always has access for key recovery scenarios
5. **No Data Duplication** — Viewers decrypt the same records, not separate copies

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  STUDENT CREATES DATA                                           │
│                                                                 │
│  Observation → Encrypt with Student's Secret Key → Store        │
│                                                                 │
│  (Only ONE encrypted copy exists)                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STUDENT SHARES ACCESS                                          │
│                                                                 │
│  Student grants access to Teacher:                              │
│  1. Fetch Teacher's public key                                  │
│  2. Encrypt { student_secret_key, student_name, email }         │
│     with Teacher's public key                                   │
│  3. Store in sharing_grants table                               │
│                                                                 │
│  Teacher can now:                                               │
│  1. Fetch sharing grant (encrypted for them)                    │
│  2. Decrypt with their private key → get student's secret key   │
│  3. Use student's secret key to decrypt observations            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ADMIN RECOVERY                                                 │
│                                                                 │
│  On user creation, automatically create sharing grant to admin  │
│  Admin can recover any student's key if student loses theirs    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Types

### Student Secret Key (Symmetric)
- **Algorithm:** AES-256-GCM
- **Purpose:** Encrypts all student's observations
- **Storage:** Student's localStorage (and in sharing grants)
- **Lifecycle:** Created once at registration, never changes

### Student Keypair (Asymmetric) — REMOVED
- No longer needed for observations
- Could keep for future features (e.g., receiving encrypted messages)

### Viewer Keypair (Asymmetric)
- **Algorithm:** RSA-OAEP, 2048-bit
- **Purpose:** Encrypts sharing grants TO that viewer
- **Storage:** Private key in viewer's localStorage; public key on server
- **Who has one:** Teachers, partners, admin, anyone who might receive shared access

### Admin Keypair (Asymmetric)
- **Algorithm:** RSA-OAEP, 2048-bit
- **Purpose:** Site-wide recovery capability
- **Storage:** Private key secured offline; public key on server
- **Special:** All users automatically grant access to admin

---

## Data Flow

### Student Registration

```
1. Student enters: firstName, lastName, email, classroom
2. Generate AES-256-GCM secret key (student_secret_key)
3. Store in localStorage
4. Fetch admin's public key from server
5. Create admin sharing grant:
   - Encrypt { student_secret_key, firstName, lastName, email } 
     with admin's public key
6. Register with server:
   - user_id, firstName, lastName, email, classroom
   - admin sharing grant
7. Offer key backup download
```

### Recording Observations

```
1. Student completes bid prompt
2. Create observation object
3. Generate random IV
4. Encrypt observation with student_secret_key (AES-256-GCM)
5. Store/sync:
   {
     observation_id,
     user_id,
     encrypted_data,
     iv,
     metadata: { timestamp, skill_path, correct, ... }
   }
```

**Note:** No teacher_key_blob or student_key_blob on observations anymore.

### Granting Access

```
1. Student goes to Settings → Share Access
2. Enters viewer's email or selects from known teachers
3. Fetch viewer's public key from server
4. Create sharing grant:
   {
     grant_id,
     grantor_id: student's user_id,
     grantee_id: viewer's user_id,
     encrypted_payload: RSA_Encrypt(
       { student_secret_key, firstName, lastName, email },
       viewer_public_key
     ),
     granted_at,
     expires_at (optional),
     revoked: false
   }
5. POST to server
```

### Viewer Reads Student Data

```
1. Teacher opens dashboard
2. Fetch all sharing grants where grantee_id = teacher's user_id
3. For each grant:
   a. Decrypt encrypted_payload with teacher's private key
   b. Extract student_secret_key, name, email
4. For each student, fetch their observations
5. Decrypt observations using that student's secret_key
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

## User Registration Fields

### Required at Registration
- **First Name** — Display name
- **Last Name** — Display name
- **Email** — Unique identifier, helps differentiate same-name students
- **Classroom** — Current class enrollment

### Stored in localStorage
```javascript
{
  "bridgePractice": {
    "currentUserId": "uuid",
    "users": {
      "uuid": {
        "id": "uuid",
        "firstName": "Margaret",
        "lastName": "Thompson",
        "email": "margaret@example.com",
        "classroom": "tuesday-am",
        "secretKey": "base64-encoded-aes-key",
        "dataConsent": true,
        "createdAt": "2026-01-29T10:00:00Z"
      }
    }
  }
}
```

### Stored on Server
```javascript
{
  "user_id": "uuid",
  "first_name": "Margaret",        // Plaintext for teacher queries
  "last_name": "Thompson",
  "email": "margaret@example.com", // Plaintext for lookups
  "classroom": "tuesday-am",
  "data_consent": true,
  "created_at": "2026-01-29T10:00:00Z"
}
```

**Note:** Names and email are stored in plaintext on server since teachers need to query/display them. The sensitive data is the *observations*, which remain encrypted.

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  classroom TEXT NOT NULL,
  data_consent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_classroom ON users(classroom);
```

### Viewers Table (Teachers, Partners, etc.)
```sql
CREATE TABLE viewers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,          -- RSA public key for receiving grants
  role TEXT NOT NULL DEFAULT 'teacher',  -- admin, teacher, partner, other
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_viewers_email ON viewers(email);
```

### Sharing Grants Table
```sql
CREATE TABLE sharing_grants (
  id TEXT PRIMARY KEY,
  grantor_id TEXT NOT NULL REFERENCES users(id),
  grantee_id TEXT NOT NULL REFERENCES viewers(id),
  encrypted_payload TEXT NOT NULL,   -- RSA-encrypted { secret_key, name, email }
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,              -- NULL = never expires
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMP,
  
  UNIQUE(grantor_id, grantee_id)     -- One grant per student-viewer pair
);

CREATE INDEX idx_grants_grantor ON sharing_grants(grantor_id);
CREATE INDEX idx_grants_grantee ON sharing_grants(grantee_id);
CREATE INDEX idx_grants_active ON sharing_grants(grantee_id) 
  WHERE revoked = false AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
```

### Observations Table (Simplified)
```sql
CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  encrypted_data TEXT NOT NULL,      -- AES-GCM encrypted observation
  iv TEXT NOT NULL,                  -- Initialization vector
  
  -- Plaintext metadata for queries
  timestamp TIMESTAMP NOT NULL,
  skill_path TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  deal_subfolder TEXT,
  deal_number INTEGER,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_obs_user ON observations(user_id);
CREATE INDEX idx_obs_timestamp ON observations(timestamp);
CREATE INDEX idx_obs_skill ON observations(skill_path);
```

---

## Sharing Grant Payload

The encrypted payload contains everything needed to access and identify the student:

```javascript
{
  "student_secret_key": "base64-encoded-aes-256-key",
  "student_id": "uuid",
  "first_name": "Margaret",
  "last_name": "Thompson", 
  "email": "margaret@example.com",
  "granted_at": "2026-02-01T10:00:00Z"
}
```

This is encrypted with the grantee's RSA public key, so only they can read it.

---

## Admin Recovery Flow

### Setup (One-Time)
1. Generate admin RSA keypair
2. Store private key securely (offline, password-protected)
3. Upload public key to server as special "admin" viewer

### Automatic Grant on User Registration
```javascript
// During user registration
const adminGrant = {
  grantor_id: newUser.id,
  grantee_id: ADMIN_VIEWER_ID,
  encrypted_payload: rsaEncrypt(
    {
      student_secret_key: newUser.secretKey,
      student_id: newUser.id,
      first_name: newUser.firstName,
      last_name: newUser.lastName,
      email: newUser.email
    },
    adminPublicKey
  )
}
// Store with user registration
```

### Recovery Process
1. Student contacts admin: "I lost my key"
2. Admin authenticates student (email verification, identity check)
3. Admin fetches their grant for that student
4. Admin decrypts to get student's secret key
5. Admin provides key back to student (secure channel)
6. Student imports key, regains access

---

## API Endpoints

### Viewers

```
POST /api/viewers
  Register a new viewer (teacher, partner)
  Body: { name, email, public_key, role }
  → { viewer_id }

GET /api/viewers?email=<email>
  Look up viewer by email (to get their public key for granting)
  → { viewer_id, name, public_key }

GET /api/viewers/:id/public-key
  Get viewer's public key
  → { public_key }
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
  Get all grants a student has issued (for management UI)
  → { grants: [...] }

DELETE /api/grants/:id
  Revoke a grant (sets revoked=true)
  → { success: true }
```

### Observations (Simplified)

```
POST /api/observations
  Store observations (unchanged from before, but simpler structure)
  Body: { observations: [{ encrypted_data, iv, metadata }] }
  → { received, stored }

GET /api/observations?user_id=<uuid>
  Get observations for a user
  → { observations: [...] }
```

---

## UI Changes

### Registration Flow
Add email field:

```
┌─────────────────────────────────────────────────────────────────┐
│           Welcome to Bridge Practice!                           │
│                                                                 │
│   First Name: [Margaret          ]                              │
│                                                                 │
│   Last Name:  [Thompson          ]                              │
│                                                                 │
│   Email:      [margaret@email.com]                              │
│                                                                 │
│   Classroom:  [▼ Tuesday AM      ]                              │
│                                                                 │
│   ☑  Share my practice results with my teacher                  │
│                                                                 │
│                    [ Start Practicing ]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sharing Management (Settings)

```
┌─────────────────────────────────────────────────────────────────┐
│  Share My Progress                                              │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  People who can see your practice history:                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 Rick Wilson (Teacher)           Since Jan 15, 2026   │   │
│  │    rick@harmonicsystems.com                    [Revoke] │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 👤 Robert Thompson (Partner)       Since Feb 1, 2026    │   │
│  │    robert@email.com                            [Revoke] │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🔒 Site Admin (Recovery)           Since Jan 15, 2026   │   │
│  │    admin@harmonicsystems.com           Cannot revoke    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Share with someone new:                                        │
│                                                                 │
│  Email: [                    ]  [ Share ]                       │
│                                                                 │
│  Note: They must have a Bridge Classroom viewer account.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
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
  const exported = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}
```

### Encrypt Observation
```javascript
async function encryptObservation(observation, secretKeyBase64) {
  const keyData = Uint8Array.from(atob(secretKeyBase64), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw', keyData, 'AES-GCM', false, ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(observation))
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  
  return {
    encrypted_data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  }
}
```

### Create Sharing Grant
```javascript
async function createSharingGrant(student, granteePublicKey) {
  const payload = JSON.stringify({
    student_secret_key: student.secretKey,
    student_id: student.id,
    first_name: student.firstName,
    last_name: student.lastName,
    email: student.email,
    granted_at: new Date().toISOString()
  })
  
  const publicKey = await importPublicKey(granteePublicKey)
  const encoded = new TextEncoder().encode(payload)
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encoded
  )
  
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}
```

### Decrypt Sharing Grant (Viewer Side)
```javascript
async function decryptSharingGrant(encryptedPayload, privateKey) {
  const data = Uint8Array.from(atob(encryptedPayload), c => c.charCodeAt(0))
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    data
  )
  
  return JSON.parse(new TextDecoder().decode(decrypted))
}
```

---

## Migration from Current Design

If you have existing data with the dual-encryption approach:

1. **Observations:** Need to be re-encrypted with just the student's key (or keep both formats temporarily)
2. **Users:** Add email field
3. **Sharing grants:** New table, populate from existing teacher relationships
4. **Admin grant:** Create for all existing users

Alternatively, for beta: start fresh with new design, existing test data can be discarded.

---

## Security Considerations

### What's Protected
- Observation content (encrypted with student's key)
- Student's secret key (encrypted in sharing grants)

### What's Not Protected (by design)
- User names and emails (needed for queries/display)
- Observation metadata (timestamp, skill_path, correct)
- Who has shared with whom (grant relationships)

### Revocation Limitations
- Revoking a grant removes server-side access
- If viewer cached the key, they could still decrypt until cache cleared
- For true revocation, student would need to rotate their key and re-encrypt all observations

### Trust Model
- Students trust viewers they share with
- All students trust admin (recovery mechanism)
- Server operator can see metadata but not observation content
