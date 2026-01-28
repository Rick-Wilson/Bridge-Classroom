# Data Schemas & Taxonomy

## 1. User Schema

### localStorage Structure
```javascript
{
  "bridgePractice": {
    "currentUserId": "uuid-string",
    "users": {
      "uuid-string": {
        "id": "uuid-string",
        "firstName": "Margaret",
        "lastName": "Thompson",
        "classroom": "tuesday-am",
        "dataConsent": true,
        "publicKey": "base64-encoded-spki-public-key",
        "privateKey": "base64-encoded-pkcs8-private-key",
        "serverRegistered": true,
        "createdAt": "2026-01-29T10:00:00Z",
        "updatedAt": "2026-01-29T10:00:00Z"
      }
    },
    "teacherPublicKey": "base64-encoded-spki-public-key",
    "pendingObservations": [
      // Array of encrypted observation objects awaiting sync
    ]
  }
}
```

### Classroom IDs
```javascript
const CLASSROOMS = [
  { id: 'tuesday-am', name: 'Tuesday AM' },
  { id: 'tuesday-pm', name: 'Tuesday PM' },
  { id: 'thursday-zoom', name: 'Thursday Zoom' },
  { id: 'private-ladies', name: 'Private Lesson - Ladies' },
  { id: 'private-nancies', name: 'Private Lesson - Nancies' }
]
```

---

## 2. Observation Schema

### Full Observation (Before Encryption)
```javascript
{
  // Identity
  "observation_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-01-29T14:30:00.000Z",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "session_id": "550e8400-e29b-41d4-a716-446655440002",
  
  // Deal Information
  "deal": {
    "subfolder": "Stayman",
    "filename": "deal005.html",
    "deal_number": 5,
    "kind": "BID+NEXT",  // or "BID+NEXT+ROTATE"
    "dealer": "N",       // N, E, S, W
    "vulnerability": "None",  // None, NS, EW, Both
    "student_seat": "S",
    "hands": {
      "north": "S:AQ5 H:74 D:Q962 C:AJT8",
      "east": "S:KT H:QJT982 D:83 C:652",
      "south": "S:872 H:K6 D:AKJ4 C:KQ74",
      "west": "S:J9643 H:A53 D:T75 C:93"
    },
    "full_auction": "1NT pass 2C pass 2S pass 3NT pass pass pass",
    "contract": "3NT",
    "declarer": "S",
    "lead": "H3"
  },
  
  // Bid Prompt Context
  "bid_prompt": {
    "prompt_index": 0,          // 0-based index of bid prompts in this deal
    "total_prompts": 2,         // Total bid prompts in this deal
    "auction_so_far": ["1NT", "Pass"],
    "expected_bid": "2C",
    "student_hand": "S:872 H:K6 D:AKJ4 C:KQ74"
  },
  
  // Result
  "result": {
    "student_bid": "2NT",       // What they actually bid
    "correct": false,
    "attempt_number": 1,        // 1 = first try, 2+ = retry
    "time_taken_ms": 8500       // Time from prompt display to bid
  },
  
  // Classification
  "skill_path": "bidding_conventions/stayman"
}
```

### Encrypted Observation (Sent to Server)
```javascript
{
  // Encrypted payload
  "encrypted_data": "base64-encoded-aes-gcm-ciphertext",
  "iv": "base64-encoded-12-byte-iv",
  "student_key_blob": "base64-encoded-rsa-oaep-encrypted-symmetric-key",
  "teacher_key_blob": "base64-encoded-rsa-oaep-encrypted-symmetric-key",
  
  // Plaintext metadata (for server-side queries)
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
```

---

## 3. Baker Bridge Taxonomy

### Complete Mapping
```javascript
const BAKER_BRIDGE_TAXONOMY = {
  // ═══════════════════════════════════════════════════════════════
  // BASIC BIDDING
  // ═══════════════════════════════════════════════════════════════
  'Major': {
    path: 'basic_bidding/major_suit_openings',
    name: 'Major Suit Openings',
    category: 'Basic Bidding',
    description: 'Opening 1♥ and 1♠, responses and rebids'
  },
  'Minor': {
    path: 'basic_bidding/minor_suit_openings',
    name: 'Minor Suit Openings',
    category: 'Basic Bidding',
    description: 'Opening 1♣ and 1♦, responses and rebids'
  },
  'Notrump': {
    path: 'basic_bidding/notrump_openings',
    name: 'Notrump Openings',
    category: 'Basic Bidding',
    description: 'Opening 1NT, 2NT, responses'
  },

  // ═══════════════════════════════════════════════════════════════
  // BIDDING CONVENTIONS
  // ═══════════════════════════════════════════════════════════════
  '2over1': {
    path: 'bidding_conventions/two_over_one',
    name: '2-Over-1 Game Force',
    category: 'Bidding Conventions',
    description: '2/1 game forcing responses'
  },
  '2Club': {
    path: 'bidding_conventions/strong_2c',
    name: 'Strong 2♣ Bids',
    category: 'Bidding Conventions',
    description: 'Strong artificial 2♣ opening and responses'
  },
  'Blackwood': {
    path: 'bidding_conventions/blackwood',
    name: 'Blackwood',
    category: 'Bidding Conventions',
    description: '4NT ace-asking convention'
  },
  'Drury': {
    path: 'bidding_conventions/reverse_drury',
    name: 'Reverse Drury',
    category: 'Bidding Conventions',
    description: '2♣ response to third/fourth seat major opening'
  },
  'FSF': {
    path: 'bidding_conventions/fourth_suit_forcing',
    name: 'Fourth Suit Forcing',
    category: 'Bidding Conventions',
    description: 'Bidding the fourth suit to create a force'
  },
  'Help': {
    path: 'bidding_conventions/help_suit_game_try',
    name: 'Help Suit Game Try',
    category: 'Bidding Conventions',
    description: 'Game tries after major suit agreement'
  },
  'Jacoby': {
    path: 'bidding_conventions/jacoby_2nt_splinters',
    name: 'Jacoby 2NT / Splinters',
    category: 'Bidding Conventions',
    description: 'Forcing major raises and splinter bids'
  },
  'NMF': {
    path: 'bidding_conventions/new_minor_forcing',
    name: 'New Minor Forcing',
    category: 'Bidding Conventions',
    description: 'Checkback after 1NT rebid'
  },
  'Ogust': {
    path: 'bidding_conventions/ogust',
    name: 'Ogust',
    category: 'Bidding Conventions',
    description: '2NT inquiry after weak two opening'
  },
  'Preempt': {
    path: 'bidding_conventions/preemptive_bids',
    name: 'Preemptive Bids',
    category: 'Bidding Conventions',
    description: 'Three-level and four-level preempts'
  },
  'Reverse': {
    path: 'bidding_conventions/reverse_bids',
    name: 'Reverse Bids',
    category: 'Bidding Conventions',
    description: 'Opener\'s reverse showing extra values'
  },
  'Roman': {
    path: 'bidding_conventions/roman_keycard',
    name: 'Roman Key Card Blackwood',
    category: 'Bidding Conventions',
    description: 'RKCB 1430 or 0314'
  },
  'Stayman': {
    path: 'bidding_conventions/stayman',
    name: 'Stayman',
    category: 'Bidding Conventions',
    description: '2♣ asking for majors over 1NT'
  },
  'Transfers': {
    path: 'bidding_conventions/jacoby_transfers',
    name: 'Jacoby Transfers',
    category: 'Bidding Conventions',
    description: 'Transfer bids over 1NT/2NT'
  },
  'Weak2': {
    path: 'bidding_conventions/weak_2s',
    name: 'Weak 2-Bids',
    category: 'Bidding Conventions',
    description: 'Weak two openings and responses'
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPETITIVE BIDDING
  // ═══════════════════════════════════════════════════════════════
  'Cue-bid': {
    path: 'competitive_bidding/support_cuebids',
    name: 'Support Cue-bids',
    category: 'Competitive Bidding',
    description: 'Cue-bidding opponent\'s suit to show support'
  },
  'DONT': {
    path: 'competitive_bidding/dont',
    name: 'DONT',
    category: 'Competitive Bidding',
    description: 'Disturbing Opponent\'s Notrump'
  },
  'Leben': {
    path: 'competitive_bidding/lebensohl',
    name: 'Lebensohl',
    category: 'Competitive Bidding',
    description: 'Lebensohl convention after interference'
  },
  'Michaels': {
    path: 'competitive_bidding/michaels_unusual',
    name: 'Michaels / Unusual NT',
    category: 'Competitive Bidding',
    description: 'Two-suited overcalls'
  },
  'Negative': {
    path: 'competitive_bidding/negative_doubles',
    name: 'Negative Doubles',
    category: 'Competitive Bidding',
    description: 'Doubles after opponent overcalls'
  },
  'Overcalls': {
    path: 'competitive_bidding/overcalls',
    name: 'Overcalls',
    category: 'Competitive Bidding',
    description: 'Simple and jump overcalls'
  },
  'Takeout': {
    path: 'competitive_bidding/takeout_doubles',
    name: 'Takeout Doubles',
    category: 'Competitive Bidding',
    description: 'Takeout doubles and responses'
  },

  // ═══════════════════════════════════════════════════════════════
  // DECLARER PLAY
  // ═══════════════════════════════════════════════════════════════
  'Eliminations': {
    path: 'declarer_play/elimination_plays',
    name: 'Elimination Plays',
    category: 'Declarer Play',
    description: 'Strip and endplay techniques'
  },
  'Entries': {
    path: 'declarer_play/entry_management',
    name: 'Entry Management',
    category: 'Declarer Play',
    description: 'Preserving and creating entries'
  },
  'Establishment': {
    path: 'declarer_play/suit_establishment',
    name: 'Suit Establishment',
    category: 'Declarer Play',
    description: 'Setting up long suits'
  },
  'Finesse': {
    path: 'declarer_play/finessing',
    name: 'Finessing',
    category: 'Declarer Play',
    description: 'Finesse techniques and combinations'
  },
  'Holdup': {
    path: 'declarer_play/holdup_plays',
    name: 'Holdup Plays',
    category: 'Declarer Play',
    description: 'Holding up winners to break communication'
  },
  'Squeeze': {
    path: 'declarer_play/squeeze_plays',
    name: 'Squeeze Plays',
    category: 'Declarer Play',
    description: 'Simple and compound squeezes'
  },
  'Trumpmgmt': {
    path: 'declarer_play/trump_management',
    name: 'Trump Management',
    category: 'Declarer Play',
    description: 'Drawing trumps, ruffs, and trump control'
  },

  // ═══════════════════════════════════════════════════════════════
  // DEFENSE
  // ═══════════════════════════════════════════════════════════════
  'OLead': {
    path: 'defense/opening_leads',
    name: 'Opening Leads',
    category: 'Defense',
    description: 'Choosing and making opening leads'
  },
  'SecondHand': {
    path: 'defense/second_hand_play',
    name: 'Second Hand Play',
    category: 'Defense',
    description: 'Second hand low and exceptions'
  },
  'Signals': {
    path: 'defense/defensive_signals',
    name: 'Defensive Signals',
    category: 'Defense',
    description: 'Attitude, count, and suit preference'
  },
  'ThirdHand': {
    path: 'defense/third_hand_play',
    name: 'Third Hand Play',
    category: 'Defense',
    description: 'Third hand high and exceptions'
  },

  // ═══════════════════════════════════════════════════════════════
  // PRACTICE DEALS
  // ═══════════════════════════════════════════════════════════════
  '100Deals': {
    path: 'practice_deals/100_miscellaneous',
    name: '100 Miscellaneous Deals',
    category: 'Practice Deals',
    description: 'Mixed practice deals covering various topics'
  },
  '100NT': {
    path: 'practice_deals/100_notrump',
    name: '100 Notrump Deals',
    category: 'Practice Deals',
    description: 'Notrump bidding and play practice'
  },

  // ═══════════════════════════════════════════════════════════════
  // PARTNERSHIP BIDDING
  // ═══════════════════════════════════════════════════════════════
  'Bidpractice/Set1': {
    path: 'partnership_bidding/set_01',
    name: 'Partnership Bidding Set 1',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 1'
  },
  'Bidpractice/Set2': {
    path: 'partnership_bidding/set_02',
    name: 'Partnership Bidding Set 2',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 2'
  },
  'Bidpractice/Set3': {
    path: 'partnership_bidding/set_03',
    name: 'Partnership Bidding Set 3',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 3'
  },
  'Bidpractice/Set4': {
    path: 'partnership_bidding/set_04',
    name: 'Partnership Bidding Set 4',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 4'
  },
  'Bidpractice/Set5': {
    path: 'partnership_bidding/set_05',
    name: 'Partnership Bidding Set 5',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 5'
  },
  'Bidpractice/Set6': {
    path: 'partnership_bidding/set_06',
    name: 'Partnership Bidding Set 6',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 6'
  },
  'Bidpractice/Set7': {
    path: 'partnership_bidding/set_07',
    name: 'Partnership Bidding Set 7',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 7'
  },
  'Bidpractice/Set8': {
    path: 'partnership_bidding/set_08',
    name: 'Partnership Bidding Set 8',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 8'
  },
  'Bidpractice/Set9': {
    path: 'partnership_bidding/set_09',
    name: 'Partnership Bidding Set 9',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 9'
  },
  'Bidpractice/Set10': {
    path: 'partnership_bidding/set_10',
    name: 'Partnership Bidding Set 10',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 10'
  },
  'Bidpractice/Set11': {
    path: 'partnership_bidding/set_11',
    name: 'Partnership Bidding Set 11',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 11'
  },
  'Bidpractice/Set12': {
    path: 'partnership_bidding/set_12',
    name: 'Partnership Bidding Set 12',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 12'
  }
}
```

### Category Summary
```javascript
const CATEGORIES = [
  {
    id: 'basic_bidding',
    name: 'Basic Bidding',
    subfolders: ['Major', 'Minor', 'Notrump'],
    count: 3
  },
  {
    id: 'bidding_conventions',
    name: 'Bidding Conventions',
    subfolders: ['2over1', '2Club', 'Blackwood', 'Drury', 'FSF', 'Help', 
                 'Jacoby', 'NMF', 'Ogust', 'Preempt', 'Reverse', 'Roman',
                 'Stayman', 'Transfers', 'Weak2'],
    count: 15
  },
  {
    id: 'competitive_bidding',
    name: 'Competitive Bidding',
    subfolders: ['Cue-bid', 'DONT', 'Leben', 'Michaels', 'Negative', 
                 'Overcalls', 'Takeout'],
    count: 7
  },
  {
    id: 'declarer_play',
    name: 'Declarer Play',
    subfolders: ['Eliminations', 'Entries', 'Establishment', 'Finesse',
                 'Holdup', 'Squeeze', 'Trumpmgmt'],
    count: 7
  },
  {
    id: 'defense',
    name: 'Defense',
    subfolders: ['OLead', 'SecondHand', 'Signals', 'ThirdHand'],
    count: 4
  },
  {
    id: 'practice_deals',
    name: 'Practice Deals',
    subfolders: ['100Deals', '100NT'],
    count: 2
  },
  {
    id: 'partnership_bidding',
    name: 'Partnership Bidding',
    subfolders: ['Bidpractice/Set1', 'Bidpractice/Set2', 'Bidpractice/Set3',
                 'Bidpractice/Set4', 'Bidpractice/Set5', 'Bidpractice/Set6',
                 'Bidpractice/Set7', 'Bidpractice/Set8', 'Bidpractice/Set9',
                 'Bidpractice/Set10', 'Bidpractice/Set11', 'Bidpractice/Set12'],
    count: 12
  }
]

// Total: 49 subfolders, 1,173 deals
```

### Helper Functions
```javascript
/**
 * Get skill info from Baker Bridge subfolder
 */
function getSkillFromSubfolder(subfolder) {
  return BAKER_BRIDGE_TAXONOMY[subfolder] || {
    path: `unknown/${subfolder.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: subfolder,
    category: 'Unknown',
    description: ''
  }
}

/**
 * Get all skills in a category
 */
function getSkillsByCategory(categoryId) {
  return Object.entries(BAKER_BRIDGE_TAXONOMY)
    .filter(([_, skill]) => skill.category.toLowerCase().replace(/ /g, '_') === categoryId)
    .map(([subfolder, skill]) => ({ subfolder, ...skill }))
}

/**
 * Get category from skill path
 */
function getCategoryFromPath(skillPath) {
  const [category] = skillPath.split('/')
  return category
}

/**
 * Group observations by category
 */
function groupObservationsByCategory(observations) {
  const groups = {}
  for (const obs of observations) {
    const category = getCategoryFromPath(obs.skill_path)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(obs)
  }
  return groups
}
```

---

## 4. API Request/Response Schemas

### POST /api/users
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

### POST /api/observations
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
        "timestamp": "ISO8601",
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

### GET /api/observations
**Query Parameters:**
- `user_id` (optional) - Filter by user
- `classroom` (optional) - Filter by classroom
- `skill_path` (optional) - Filter by skill (prefix match)
- `correct` (optional) - Filter by correct/incorrect
- `from` (optional) - ISO8601 start date
- `to` (optional) - ISO8601 end date
- `limit` (optional, default 100)
- `offset` (optional, default 0)

**Response:**
```json
{
  "observations": [
    {
      "encrypted_data": "base64...",
      "iv": "base64...",
      "student_key_blob": "base64...",
      "teacher_key_blob": "base64...",
      "metadata": { ... }
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### GET /api/observations/metadata
Same query parameters, but response contains only metadata (no encrypted blobs):
```json
{
  "observations": [
    {
      "observation_id": "uuid",
      "user_id": "uuid",
      "timestamp": "ISO8601",
      "skill_path": "bidding_conventions/stayman",
      "correct": false,
      "classroom": "tuesday-am"
    }
  ],
  "total": 150
}
```

### GET /api/keys/teacher
**Response:**
```json
{
  "public_key": "base64-encoded-spki-key"
}
```

### GET /api/users/:user_id/public-key
**Response:**
```json
{
  "user_id": "uuid",
  "public_key": "base64-encoded-spki-key"
}
```
