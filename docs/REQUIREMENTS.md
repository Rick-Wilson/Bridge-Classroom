# Requirements Specification

## 1. User Management

### 1.1 First-Time User Onboarding

**Flow:**
1. User opens app for first time
2. Welcome screen prompts for:
   - First name (required)
   - Last name (required)
   - Classroom selection (required, dropdown)
   - Data sharing consent (checkbox, default: checked)
3. On submit:
   - Generate cryptographic keypair (RSA-OAEP, 2048-bit)
   - Store private key in localStorage
   - Register user with server (send public key)
   - Fetch and cache teacher's public key
   - Offer key backup download
4. Proceed to practice

**Classrooms:**
- Tuesday AM
- Tuesday PM
- Thursday Zoom
- Private Lesson - Ladies
- Private Lesson - Nancies

**Consent Language:**
> "Share my practice results with Rick Wilson"
> 
> This helps Rick understand your progress and tailor lessons to your needs. 
> Your data is encrypted and never shared with anyone else.

**Expandable "What data is shared?" section:**
> We share:
> - Your name and classroom
> - Which hands you practiced  
> - Your bidding choices (correct and incorrect)
> - When you practiced
>
> We never share:
> - Your data with other students
> - Your data with anyone other than Rick
> - Any data if you uncheck this box
>
> You can change this setting anytime in Settings.

### 1.2 Returning User

**Flow:**
1. App detects existing user(s) in localStorage
2. Display: "Welcome back, {firstName}!"
3. Options:
   - [Continue] → proceed to practice
   - [Not {firstName}? Switch user] → show user selector

### 1.3 Multi-User Support (Shared Computer)

**User Switching:**
- Show list of all users stored locally
- Click to switch active user
- Option to "Add new user" (returns to onboarding flow)

**localStorage Structure:**
```json
{
  "currentUserId": "uuid-1",
  "users": {
    "uuid-1": {
      "id": "uuid-1",
      "firstName": "Margaret",
      "lastName": "Thompson",
      "classroom": "tuesday-am",
      "dataConsent": true,
      "publicKey": "base64...",
      "privateKey": "base64...",
      "createdAt": "2026-01-29T10:00:00Z"
    },
    "uuid-2": {
      "id": "uuid-2",
      "firstName": "Robert", 
      "lastName": "Thompson",
      "classroom": "tuesday-am",
      "dataConsent": true,
      "publicKey": "base64...",
      "privateKey": "base64...",
      "createdAt": "2026-01-29T10:05:00Z"
    }
  },
  "teacherPublicKey": "base64...",
  "pendingObservations": []
}
```

### 1.4 Key Backup

**On First Run:**
After registration, show modal:
> **Your Personal Key**
>
> We've created a personal key that encrypts your practice data. 
> Only you can see your detailed results.
>
> ⚠️ If you clear your browser data or use a new device, 
> you'll need this key to see your history.
>
> [Download Key Backup]  [I understand, continue]
>
> 💡 Tip: Save the backup file somewhere safe, like your email 
> or a folder on your computer.

**Backup File Format:**
```json
{
  "bridge_practice_backup": true,
  "version": "1.0",
  "user_id": "uuid-1",
  "name": "Margaret Thompson",
  "private_key": "base64...",
  "public_key": "base64...",
  "created": "2026-01-29",
  "note": "Keep this file safe. Import it to restore your practice history on a new device."
}
```

**Key Restoration:**
- Settings → "Restore from Backup"
- Or on welcome screen: [Restore from Backup] option
- Upload JSON file, validate, merge/replace user

---

## 2. Bidding Practice

### 2.1 Deal Selection

**Categories (from Baker Bridge taxonomy):**

Basic Bidding:
- Major Suit Openings
- Minor Suit Openings  
- Notrump Openings

Bidding Conventions:
- 2-Over-1 Game Force
- Strong 2♣ Bids
- Blackwood
- Reverse Drury
- Fourth Suit Forcing
- Help Suit Game Try
- Jacoby 2NT / Splinters
- New Minor Forcing
- Ogust
- Preemptive Bids
- Reverse Bids
- Roman Key Card Blackwood
- Stayman
- Jacoby Transfers
- Weak 2-Bids

Competitive Bidding:
- Support Cue-bids
- DONT
- Lebensohl
- Michaels / Unusual NT
- Negative Doubles
- Overcalls
- Takeout Doubles

Declarer Play:
- Elimination Plays
- Entry Management
- Suit Establishment
- Finessing
- Holdup Plays
- Squeeze Plays
- Trump Management

Defense:
- Opening Leads
- Second Hand Play
- Defensive Signals
- Third Hand Play

Practice Deals:
- 100 Miscellaneous Deals
- 100 Notrump Deals

Partnership Bidding:
- Sets 1-12

### 2.2 Practice Flow

1. User selects category or "Random"
2. Deal loads, showing:
   - Student's hand (based on `Student` field in deal)
   - Auction so far (if any)
   - Bidding box
3. User makes bid
4. If correct:
   - Show success indicator
   - Advance auction or proceed to next prompt
5. If incorrect:
   - Show error indicator
   - Show expected bid
   - Record observation
   - Allow retry or continue
6. After all bid prompts complete:
   - Show commentary/explanation
   - Option for next deal

### 2.3 Observation Recording

**For each bid prompt, record:**
```json
{
  "observation_id": "uuid",
  "timestamp": "2026-01-29T14:30:00Z",
  "user_id": "uuid",
  
  "deal": {
    "subfolder": "Stayman",
    "filename": "deal005.html",
    "deal_number": 5,
    "kind": "BID+NEXT",
    "dealer": "N",
    "student_seat": "S",
    "hands": {
      "north": "S:... H:... D:... C:...",
      "east": "S:... H:... D:... C:...",
      "south": "S:... H:... D:... C:...",
      "west": "S:... H:... D:... C:..."
    },
    "full_auction": "1NT pass 2C pass 2H pass 4H pass pass pass",
    "contract": "4H",
    "declarer": "S"
  },
  
  "bid_prompt": {
    "prompt_index": 0,
    "auction_so_far": ["1NT", "Pass"],
    "expected_bid": "2C",
    "student_hand": "S:KJ85 H:AQ73 D:42 C:965"
  },
  
  "result": {
    "student_bid": "2NT",
    "correct": false,
    "attempt_number": 1,
    "time_taken_ms": 8500
  },
  
  "skill_path": "bidding_conventions/stayman",
  "session_id": "uuid"
}
```

---

## 3. Progress Visualization (Student View)

### 3.1 Dashboard

Show after practice session or via menu:
- Overall accuracy percentage
- Deals practiced today / this week / total
- Current streak (consecutive correct)
- Skill breakdown chart

### 3.2 Skill Breakdown

Visual representation of competency by category:
- Bar chart or radar chart
- Color coding: green (>80%), yellow (50-80%), red (<50%)
- Click category for drill-down

### 3.3 History

List of recent practice sessions:
- Date, category, accuracy
- Click to see individual deals and responses

### 3.4 Trends

Line chart showing accuracy over time:
- By week or month
- Filter by skill category

---

## 4. Data Synchronization

### 4.1 Encryption Flow

For each observation:
1. Generate one-time AES-256-GCM symmetric key
2. Encrypt observation JSON with symmetric key
3. Encrypt symmetric key with student's RSA public key → `student_key_blob`
4. Encrypt symmetric key with teacher's RSA public key → `teacher_key_blob`
5. Package for transmission:
   ```json
   {
     "encrypted_data": "base64...",
     "iv": "base64...",
     "student_key_blob": "base64...",
     "teacher_key_blob": "base64...",
     "metadata": {
       "user_id": "uuid",
       "timestamp": "ISO8601",
       "skill_path": "category/subcategory",
       "correct": true,
       "classroom": "tuesday-am"
     }
   }
   ```

### 4.2 Sync Strategy

**Queue locally:**
- Store encrypted observations in localStorage
- Include retry count and last attempt timestamp

**Sync triggers:**
- After each observation (debounced)
- On app focus/visibility change
- Before page unload (via sendBeacon)

**Retry logic:**
- On network failure, keep in queue
- Exponential backoff: 1s, 2s, 4s, 8s, max 60s
- After 10 failures, stop retrying until next session

**Offline support:**
- App fully functional offline
- Observations queue locally
- Sync when connection restored

### 4.3 Decryption (Reading Data)

**Student reads own data:**
1. Fetch observations from API (filtered by user_id)
2. For each, decrypt `student_key_blob` with private key → symmetric key
3. Decrypt `encrypted_data` with symmetric key → observation JSON
4. Display in UI

**Teacher reads all data:**
1. Fetch all observations from API
2. For each, decrypt `teacher_key_blob` with teacher private key → symmetric key
3. Decrypt `encrypted_data` with symmetric key → observation JSON
4. Aggregate and display

---

## 5. API Server

### 5.1 Endpoints

**Public Key Management:**
```
GET /api/keys/teacher
  → { "public_key": "base64..." }

POST /api/users
  Body: { "user_id", "first_name", "last_name", "classroom", "public_key" }
  → { "success": true }

GET /api/users/:user_id/public-key
  → { "public_key": "base64..." }
```

**Observations:**
```
POST /api/observations
  Body: { observations: [...] }  // Array of encrypted observations
  Headers: X-API-Key: <key>
  → { "received": 5, "stored": 5 }

GET /api/observations?user_id=<uuid>
  → { observations: [...] }  // For student viewing own data

GET /api/observations?classroom=<id>
  → { observations: [...] }  // For teacher dashboard
  
GET /api/observations/metadata?classroom=<id>
  → { observations: [...] }  // Metadata only (no encrypted blobs)
```

### 5.2 Database Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  first_name_encrypted TEXT NOT NULL,
  last_name_encrypted TEXT NOT NULL,
  classroom TEXT NOT NULL,
  public_key TEXT NOT NULL,
  data_consent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Observations table  
CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  timestamp TIMESTAMP NOT NULL,
  skill_path TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  classroom TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  student_key_blob TEXT NOT NULL,
  teacher_key_blob TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_observations_user_id ON observations(user_id);
CREATE INDEX idx_observations_classroom ON observations(classroom);
CREATE INDEX idx_observations_skill_path ON observations(skill_path);
CREATE INDEX idx_observations_timestamp ON observations(timestamp);
```

### 5.3 Security

- HTTPS only (via Cloudflare)
- API key validation for POST requests
- Origin header validation
- Rate limiting (optional, for abuse prevention)
- No sensitive data in logs

---

## 6. Teacher Dashboard

### 6.1 Authentication

Simple password protection for v1:
- Single teacher password
- Stored as bcrypt hash in config
- Session cookie after login

### 6.2 Views

**All Classrooms Overview:**
- List of classrooms
- Student count, participation rate, avg accuracy per classroom
- Click to drill into classroom

**Classroom Detail:**
- List of students in classroom
- Per-student: last active, sessions this week, accuracy, trend indicator
- Class skill profile (which areas strong/weak)
- Recommended focus area

**Student Detail:**
- Overall proficiency chart (radar or bar)
- Skill breakdown with percentages
- Trend graph over time
- Recent errors list (click to see deal details)
- Participation stats

### 6.3 Data Processing

Dashboard decrypts observations client-side:
1. Teacher enters password → unlocks private key (stored encrypted in browser or entered each session)
2. Fetch observations via API
3. Decrypt each observation
4. Aggregate and display

---

## 7. Non-Functional Requirements

### 7.1 Performance
- App loads in <3 seconds on 3G
- Bidding response <100ms
- Encryption/decryption <50ms per observation

### 7.2 Compatibility
- Modern browsers: Chrome, Safari, Firefox, Edge (last 2 versions)
- Mobile responsive (students may use tablets)
- Works offline after initial load

### 7.3 Accessibility
- Large, readable fonts (senior users)
- High contrast mode option
- Keyboard navigable

### 7.4 Data Retention
- Observations stored indefinitely
- User can request data deletion (GDPR-style)
