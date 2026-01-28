# Bridge Classroom API

Backend API server for the Bridge Classroom project. Stores encrypted practice observations from students.

## Features

- **User registration**: Students register with their public keys
- **Encrypted observations**: Receives and stores encrypted practice data
- **Query API**: Fetch observations by user, classroom, skill, date range
- **Teacher key management**: Provides teacher's public key for dual-key encryption

## Prerequisites

- Rust 1.75+ (install via [rustup](https://rustup.rs/))
- SQLite 3.x

## Setup

1. **Clone and navigate to the API directory:**
   ```bash
   cd bridge-classroom-api
   ```

2. **Copy the environment file and configure:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   - `API_KEY`: Generate a secure random string (e.g., `openssl rand -hex 32`)
   - `TEACHER_PUBLIC_KEY`: Add the teacher's public key (base64-encoded SPKI)
   - `ALLOWED_ORIGINS`: Add your frontend URLs

3. **Build and run:**
   ```bash
   cargo run
   ```

   For release builds:
   ```bash
   cargo build --release
   ./target/release/bridge-classroom-api
   ```

## API Endpoints

### Health Check
```
GET /health
```
Returns "OK" if the server is running.

### Teacher Key
```
GET /api/keys/teacher
```
Returns the teacher's public key for encrypting observations.

**Response:**
```json
{
  "public_key": "base64-encoded-spki-key"
}
```

### User Registration
```
POST /api/users
```
Register or update a user.

**Request:**
```json
{
  "user_id": "uuid",
  "first_name": "Margaret",
  "last_name": "Thompson",
  "classroom": "tuesday-am",
  "public_key": "base64-encoded-spki-key",
  "data_consent": true
}
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid"
}
```

### Get User Public Key
```
GET /api/users/:user_id/public-key
```
Get a user's public key (for peer encryption).

**Response:**
```json
{
  "user_id": "uuid",
  "public_key": "base64-encoded-spki-key"
}
```

### Submit Observations
```
POST /api/observations
```
Submit encrypted observations. Requires `x-api-key` header.

**Headers:**
```
x-api-key: your-api-key
Content-Type: application/json
```

**Request:**
```json
{
  "observations": [
    {
      "encrypted_data": "base64...",
      "iv": "base64...",
      "student_key_blob": "base64...",
      "teacher_key_blob": "base64...",
      "metadata": {
        "observation_id": "uuid",
        "user_id": "uuid",
        "timestamp": "2026-01-29T14:30:00.000Z",
        "skill_path": "bidding_conventions/stayman",
        "correct": false,
        "classroom": "tuesday-am",
        "deal_subfolder": "Stayman",
        "deal_number": 5
      }
    }
  ]
}
```

**Response:**
```json
{
  "received": 5,
  "stored": 5,
  "errors": []
}
```

### Get Observations
```
GET /api/observations
```
Fetch observations with filters. Requires `x-api-key` header.

**Query Parameters:**
- `user_id` - Filter by user
- `classroom` - Filter by classroom
- `skill_path` - Filter by skill (prefix match)
- `correct` - Filter by correct (true/false)
- `from` - ISO8601 start date
- `to` - ISO8601 end date
- `limit` - Max results (default: 100, max: 1000)
- `offset` - Pagination offset

**Response:**
```json
{
  "observations": [...],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### Get Observation Metadata
```
GET /api/observations/metadata
```
Same as above but returns only metadata (no encrypted data). Useful for dashboard summaries.

## Database

Uses SQLite for simplicity. The database file is created automatically at the path specified in `DATABASE_URL`.

### Tables

**users**
- `id` (TEXT, PRIMARY KEY)
- `first_name_encrypted` (TEXT)
- `last_name_encrypted` (TEXT)
- `classroom` (TEXT)
- `public_key` (TEXT, NOT NULL)
- `data_consent` (INTEGER)
- `created_at` (TEXT)
- `updated_at` (TEXT)

**observations**
- `id` (TEXT, PRIMARY KEY)
- `user_id` (TEXT, FOREIGN KEY)
- `timestamp` (TEXT)
- `skill_path` (TEXT)
- `correct` (INTEGER)
- `classroom` (TEXT)
- `deal_subfolder` (TEXT)
- `deal_number` (INTEGER)
- `encrypted_data` (TEXT)
- `iv` (TEXT)
- `student_key_blob` (TEXT)
- `teacher_key_blob` (TEXT)
- `created_at` (TEXT)

## Development

Run with live reload:
```bash
cargo watch -x run
```

Run tests:
```bash
cargo test
```

## Deployment

### Option 1: Direct deployment
1. Build release: `cargo build --release`
2. Copy binary and `.env` to server
3. Run behind nginx/caddy reverse proxy

### Option 2: Docker
```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/bridge-classroom-api /usr/local/bin/
CMD ["bridge-classroom-api"]
```

### Option 3: fly.io / railway
See their respective documentation for Rust deployments.

## Security Notes

- The API key should be kept secret and rotated periodically
- Observation data is encrypted client-side before transmission
- Only the student and teacher can decrypt observations
- User names are stored in the database (consider encrypting for additional privacy)
- Use HTTPS in production
