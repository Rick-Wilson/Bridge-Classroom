# Convention Card System

## Overview

A companion webapp for creating, editing, and sharing bridge convention cards, integrated with Bridge Classroom to track student proficiency relative to their actual partnership agreements.

## Goals

1. **Create & Edit** — Web-based convention card editor with print layout
2. **Save & Share** — Store cards, share with partners and teachers
3. **PDF Export** — Generate printable convention cards
4. **Integration** — Link cards to Bridge Classroom profiles
5. **Focused Learning** — Track proficiency only for conventions the student actually plays

## Two Applications

### 1. Convention Card Editor (Standalone Webapp)
```
cards.harmonicsystems.com
```
- Create and edit convention cards
- Visual editor matching print layout
- PDF generation
- Share cards with others
- No account required for basic use
- Account optional for saving/sharing

### 2. Bridge Classroom Integration
```
practice.harmonicsystems.com
```
- Link convention cards to student profile
- Filter proficiency view by "conventions I play"
- Teacher sees student performance vs their card
- Suggest practice areas based on card gaps

---

## Convention Card Standards

### ACBL Convention Card (Current)
The widely-used format with sections for:
- General Approach
- Notrump Opening Bids
- Major Openings
- Minor Openings
- 2-Level Openings
- Other Conventional Calls
- Special Doubles
- Defensive and Competitive
- Leads and Signals

### ACBL "New" Convention Card (2023)
Attempted modernization, limited adoption. We'll support both.

### WBF Convention Card
International format, similar sections.

---

## Convention Card Data Model

### Card Structure
```javascript
{
  "card_id": "uuid",
  "version": "1.0",
  "format": "acbl_standard",  // acbl_standard, acbl_new, wbf
  
  "metadata": {
    "name": "Margaret & Robert - 2/1",
    "description": "Our main partnership card",
    "created_at": "2026-02-01T10:00:00Z",
    "updated_at": "2026-02-15T14:30:00Z",
    "owner_id": "user-uuid",
    "visibility": "shared",  // private, shared, public
    "shared_with": ["partner-uuid", "teacher-uuid"]
  },
  
  "players": {
    "player1": {
      "name": "Margaret Thompson",
      "acbl_number": "K123456"
    },
    "player2": {
      "name": "Robert Thompson", 
      "acbl_number": "K654321"
    }
  },
  
  "general": {
    "system": "2/1 Game Force",
    "opened_light": { "frequently": false, "rarely": true, "never": false },
    "third_fourth_seat_light": true
  },
  
  "notrump": {
    "one_nt": {
      "range_min": 15,
      "range_max": 17,
      "five_card_major": "sometimes",  // always, sometimes, never
      "system_on_over": {
        "double": true,
        "two_clubs": true,
        "two_diamonds": false
      }
    },
    "two_nt": {
      "range_min": 20,
      "range_max": 21,
      "puppet_stayman": false
    },
    "three_nt": {
      "meaning": "gambling",
      "range_min": null,
      "range_max": null
    },
    "stayman": {
      "forcing": true,
      "puppet": false,
      "garbage": true
    },
    "transfers": {
      "jacoby": true,
      "texas": true,
      "minor_suit": false,
      "four_way": false
    },
    "lebensohl": {
      "over_interference": true,
      "over_weak_twos": false,
      "over_reverse": false
    }
  },
  
  "major_openings": {
    "five_card_majors": true,
    "expected_min_length": 5,
    "one_nt_response": {
      "forcing": true,      // 2/1 style
      "semi_forcing": false,
      "range_min": 6,
      "range_max": 12
    },
    "two_over_one": {
      "game_force": true,
      "promises_rebid": false
    },
    "raises": {
      "single_raise": { "min": 6, "max": 10, "support": 3 },
      "limit_raise": { "min": 10, "max": 12, "support": 3 },
      "forcing_raise": "jacoby_2nt",  // jacoby_2nt, splinter, 3nt, other
      "preemptive_raise": true
    },
    "jacoby_2nt": {
      "play": true,
      "responses": {
        "new_suit": "singleton_void",
        "four_of_major": "minimum",
        "three_nt": "18_19_balanced",
        "three_of_major": "strong_no_shortness"
      }
    },
    "splinters": {
      "play": true,
      "by_responder": true,
      "by_opener": true
    },
    "drury": {
      "play": true,
      "reverse": true,
      "two_way": false
    }
  },
  
  "minor_openings": {
    "one_club": {
      "min_length": 3,
      "could_be_short": true
    },
    "one_diamond": {
      "min_length": 3,
      "could_be_short": false
    },
    "responses": {
      "inverted_minors": {
        "play": true,
        "on_over_interference": false
      },
      "one_nt_range": { "min": 6, "max": 10 },
      "two_nt_range": { "min": 13, "max": 15 },
      "three_nt_range": { "min": 16, "max": 17 }
    }
  },
  
  "two_level": {
    "two_clubs": {
      "meaning": "strong",  // strong, natural, precision
      "min_hcp": 22,
      "waiting_response": "2D",
      "negative_response": { "second_negative": "3C", "play": true }
    },
    "two_diamonds": {
      "meaning": "weak",  // weak, mini_roman, flannery, natural, multi
      "min_hcp": 5,
      "max_hcp": 11,
      "suit_length": { "min": 6, "max": 6 },
      "suit_quality": "two_of_top_three"
    },
    "two_hearts": {
      "meaning": "weak",
      "min_hcp": 5,
      "max_hcp": 11,
      "suit_length": { "min": 6, "max": 6 }
    },
    "two_spades": {
      "meaning": "weak",
      "min_hcp": 5,
      "max_hcp": 11,
      "suit_length": { "min": 6, "max": 6 }
    },
    "ogust": {
      "play": true,
      "responses": {
        "three_clubs": "bad_hand_bad_suit",
        "three_diamonds": "bad_hand_good_suit",
        "three_hearts": "good_hand_bad_suit",
        "three_spades": "good_hand_good_suit",
        "three_nt": "solid_suit"
      }
    },
    "feature_asking": {
      "play": false
    }
  },
  
  "other_conventions": {
    "blackwood": {
      "standard": false,
      "rkcb_1430": true,
      "rkcb_0314": false,
      "minorwood": false,
      "kickback": false,
      "queen_ask": true,
      "specific_king_ask": true
    },
    "gerber": {
      "play": true,
      "over": "1nt_2nt_only"
    },
    "control_bids": {
      "style": "italian",  // italian (1st/2nd round), french (aces first)
      "skip_allowed": false
    },
    "new_minor_forcing": {
      "play": true,
      "two_way": false
    },
    "fourth_suit_forcing": {
      "play": true,
      "game_forcing": true,
      "one_round": false
    },
    "help_suit_game_tries": {
      "play": true,
      "short_suit_tries": false
    }
  },
  
  "competitive": {
    "overcalls": {
      "one_level": { "min_hcp": 8, "max_hcp": 16, "suit_length": 5 },
      "two_level": { "min_hcp": 10, "max_hcp": 16, "suit_length": 5 },
      "jump_overcall": "weak",  // weak, intermediate, strong
      "one_nt_overcall": { "min": 15, "max": 18, "systems_on": true }
    },
    "takeout_doubles": {
      "style": "classic",
      "reopening_lighter": true
    },
    "negative_doubles": {
      "through": "3S",  // level through which negative doubles apply
      "responsive_doubles": true,
      "maximal_doubles": false
    },
    "michaels": {
      "play": true,
      "strength": "weak_or_strong",  // weak, intermediate, strong, weak_or_strong
      "over_minors": "both_majors",
      "over_majors": "other_major_plus_minor"
    },
    "unusual_2nt": {
      "play": true,
      "shows": "two_lower_unbid"
    },
    "dont": {
      "play": false
    },
    "cappelletti": {
      "play": false
    },
    "support_doubles": {
      "play": true,
      "support_redoubles": true
    },
    "fit_showing_jumps": {
      "play": false
    }
  },
  
  "defensive": {
    "opening_leads": {
      "vs_suits": {
        "ace_from_ak": false,
        "fourth_best": true,
        "third_fifth": false,
        "attitude": false
      },
      "vs_nt": {
        "fourth_best": true,
        "third_fifth": false,
        "attitude": false
      },
      "honor_sequence": "top_of_sequence"
    },
    "signals": {
      "attitude": {
        "standard": true,  // high encouraging
        "upside_down": false
      },
      "count": {
        "standard": true,  // high even
        "upside_down": false
      },
      "suit_preference": {
        "play": true,
        "obvious_situations": true
      },
      "smith_echo": {
        "play": false
      },
      "trump_suit_preference": {
        "play": false
      }
    },
    "discards": {
      "standard": true,
      "upside_down": false,
      "lavinthal": false,
      "odd_even": false
    }
  }
}
```

---

## Convention to Skill Mapping

Map convention card settings to Baker Bridge taxonomy for proficiency tracking:

```javascript
const CONVENTION_TO_SKILLS = {
  // Notrump Conventions
  "notrump.stayman.forcing": [
    "bidding_conventions/stayman"
  ],
  "notrump.transfers.jacoby": [
    "bidding_conventions/jacoby_transfers"
  ],
  "notrump.lebensohl.over_interference": [
    "competitive_bidding/lebensohl"
  ],
  
  // Major Opening Conventions  
  "major_openings.jacoby_2nt.play": [
    "bidding_conventions/jacoby_2nt_splinters"
  ],
  "major_openings.splinters.play": [
    "bidding_conventions/jacoby_2nt_splinters"
  ],
  "major_openings.drury.play": [
    "bidding_conventions/reverse_drury"
  ],
  "major_openings.two_over_one.game_force": [
    "bidding_conventions/two_over_one"
  ],
  
  // Two-Level Openings
  "two_level.two_clubs.meaning=strong": [
    "bidding_conventions/strong_2c"
  ],
  "two_level.two_diamonds.meaning=weak": [
    "bidding_conventions/weak_2s"
  ],
  "two_level.ogust.play": [
    "bidding_conventions/ogust"
  ],
  
  // Slam Conventions
  "other_conventions.blackwood.standard": [
    "bidding_conventions/blackwood"
  ],
  "other_conventions.blackwood.rkcb_1430": [
    "bidding_conventions/roman_keycard"
  ],
  
  // Other Conventions
  "other_conventions.new_minor_forcing.play": [
    "bidding_conventions/new_minor_forcing"
  ],
  "other_conventions.fourth_suit_forcing.play": [
    "bidding_conventions/fourth_suit_forcing"
  ],
  "other_conventions.help_suit_game_tries.play": [
    "bidding_conventions/help_suit_game_try"
  ],
  
  // Competitive
  "competitive.negative_doubles.through": [
    "competitive_bidding/negative_doubles"
  ],
  "competitive.michaels.play": [
    "competitive_bidding/michaels_unusual"
  ],
  "competitive.unusual_2nt.play": [
    "competitive_bidding/michaels_unusual"
  ],
  "competitive.dont.play": [
    "competitive_bidding/dont"
  ],
  "competitive.takeout_doubles.style": [
    "competitive_bidding/takeout_doubles"
  ],
  "competitive.overcalls": [
    "competitive_bidding/overcalls"
  ],
  
  // Defense
  "defensive.opening_leads": [
    "defense/opening_leads"
  ],
  "defensive.signals": [
    "defense/defensive_signals"
  ]
}
```

### Extract Relevant Skills from Card
```javascript
function getSkillsFromCard(card) {
  const skills = new Set()
  
  for (const [path, skillPaths] of Object.entries(CONVENTION_TO_SKILLS)) {
    const value = getNestedValue(card, path)
    
    // Check if convention is enabled
    if (value === true || 
        (typeof value === 'string' && path.includes('=') && path.endsWith(`=${value}`)) ||
        (typeof value === 'object' && value !== null)) {
      skillPaths.forEach(skill => skills.add(skill))
    }
  }
  
  return Array.from(skills)
}
```

---

## Convention Card Editor UI

### Main Editor View
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Convention Card Editor                    [Save] [Export PDF] [Share]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Card Name: [Margaret & Robert - 2/1          ]                         │
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────────────────────────────────┐   │
│  │ SECTIONS        │ │                                             │   │
│  │                 │ │  NOTRUMP OPENING BIDS                       │   │
│  │ ○ General       │ │  ─────────────────────────────────────────  │   │
│  │ ● Notrump ←     │ │                                             │   │
│  │ ○ Major Opens   │ │  1NT Range: [15] - [17]                     │   │
│  │ ○ Minor Opens   │ │                                             │   │
│  │ ○ 2-Level       │ │  ☑ May have 5-card major                    │   │
│  │ ○ Other Convs   │ │                                             │   │
│  │ ○ Competitive   │ │  Responses:                                 │   │
│  │ ○ Defensive     │ │  ☑ Stayman    ☑ Garbage Stayman             │   │
│  │                 │ │  ☑ Jacoby Transfers  ☑ Texas Transfers      │   │
│  │                 │ │  ☐ 4-Way Transfers   ☐ Minor Suit Transfers │   │
│  │                 │ │                                             │   │
│  │                 │ │  System on over:                            │   │
│  │                 │ │  ☑ Double  ☑ 2♣  ☐ 2♦  ☐ All interference   │   │
│  │                 │ │                                             │   │
│  │                 │ │  Lebensohl:                                 │   │
│  │                 │ │  ☑ Over interference  ☐ Over weak twos      │   │
│  │                 │ │                                             │   │
│  │                 │ │  2NT Range: [20] - [21]                     │   │
│  │                 │ │  ☐ Puppet Stayman                           │   │
│  │                 │ │                                             │   │
│  └─────────────────┘ └─────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### PDF Preview/Export
```
┌─────────────────────────────────────────────────────────────────────────┐
│  PDF Preview                                      [Download] [Print]    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │          ACBL CONVENTION CARD                             │  │   │
│  │  │                                                           │  │   │
│  │  │  Names: Margaret Thompson - Robert Thompson               │  │   │
│  │  │  ACBL#: K123456            K654321                        │  │   │
│  │  │                                                           │  │   │
│  │  │  GENERAL APPROACH                                         │  │   │
│  │  │  ☑ 2/1 Game Force                                         │  │   │
│  │  │  ...                                                      │  │   │
│  │  │                                                           │  │   │
│  │  │  NOTRUMP OPENING BIDS                                     │  │   │
│  │  │  1NT 15-17  ☑ Stayman  ☑ Transfers                       │  │   │
│  │  │  ...                                                      │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Bridge Classroom Integration

### Student Profile - Linked Cards
```
┌─────────────────────────────────────────────────────────────────┐
│  My Convention Cards                                            │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📋 Margaret & Robert - 2/1            Primary Card      │   │
│  │    Partner: Robert Thompson                              │   │
│  │    Last updated: Feb 15, 2026                           │   │
│  │    [View] [Edit] [Set as Primary]                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 📋 Tuesday Class - SAYC                                 │   │
│  │    For classroom practice                                │   │
│  │    Last updated: Jan 20, 2026                           │   │
│  │    [View] [Edit] [Set as Primary]                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Create New Card]  [Import Card]  [Link Existing Card]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Filtered Proficiency View
```
┌─────────────────────────────────────────────────────────────────┐
│  My Progress                                                    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Showing: [▼ Margaret & Robert - 2/1 Card]  ☑ Only conventions  │
│                                              we play            │
│                                                                 │
│  CONVENTIONS WE PLAY                            Your Score      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Stayman                    ████████████████░░░░  82%    │   │
│  │ Jacoby Transfers           ██████████████████░░  91%    │   │
│  │ Jacoby 2NT                 ████████░░░░░░░░░░░░  43%  ⚠ │   │
│  │ 2/1 Game Force             ██████████████░░░░░░  68%    │   │
│  │ Weak 2-Bids                █████████████████░░░  85%    │   │
│  │ Ogust                      ██████████████░░░░░░  71%    │   │
│  │ RKCB 1430                  █████████░░░░░░░░░░░  47%  ⚠ │   │
│  │ Negative Doubles           ████████████████░░░░  78%    │   │
│  │ Michaels/Unusual           ██████████░░░░░░░░░░  52%    │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  CONVENTIONS NOT ON CARD (hidden)                               │
│  [Show All Conventions]                                         │
│                                                                 │
│  Suggested Focus: Jacoby 2NT, RKCB 1430                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Teacher Dashboard - Card View
```
┌─────────────────────────────────────────────────────────────────┐
│  Tuesday AM Class                                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  View by: ○ All Skills  ● Convention Cards  ○ Custom Filter     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Student          │ Card              │ Gap Areas        │   │
│  ├───────────────────────────────────────────────────────────   │
│  │ Margaret T.      │ 2/1 GF            │ Jacoby 2NT (43%) │   │
│  │                  │                   │ RKCB (47%)       │   │
│  ├───────────────────────────────────────────────────────────   │
│  │ Susan M.         │ SAYC              │ Stayman (52%)    │   │
│  │                  │                   │ Weak 2s (61%)    │   │
│  ├───────────────────────────────────────────────────────────   │
│  │ James K.         │ (no card linked)  │ —                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Common Gaps Across Class:                                      │
│  • Jacoby 2NT (avg 51%) — 4 students play this                 │
│  • RKCB (avg 55%) — 6 students play this                       │
│                                                                 │
│  Suggestion: Focus next lesson on Jacoby 2NT                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Convention Cards)

### Cards Table
```sql
CREATE TABLE convention_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL DEFAULT 'acbl_standard',
  owner_id TEXT REFERENCES users(id),          -- NULL for anonymous
  card_data JSON NOT NULL,                      -- Full card JSON
  visibility TEXT NOT NULL DEFAULT 'private',  -- private, shared, public
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cards_owner ON convention_cards(owner_id);
CREATE INDEX idx_cards_visibility ON convention_cards(visibility);
```

### Card Sharing Table
```sql
CREATE TABLE card_shares (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES convention_cards(id),
  shared_with_id TEXT NOT NULL REFERENCES users(id),
  can_edit BOOLEAN NOT NULL DEFAULT false,
  shared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(card_id, shared_with_id)
);

CREATE INDEX idx_card_shares_card ON card_shares(card_id);
CREATE INDEX idx_card_shares_user ON card_shares(shared_with_id);
```

### User-Card Links (Bridge Classroom)
```sql
CREATE TABLE user_convention_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL REFERENCES convention_cards(id),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  label TEXT,                                   -- e.g., "With Robert", "Tuesday Class"
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, card_id)
);

CREATE INDEX idx_user_cards_user ON user_convention_cards(user_id);
```

---

## API Endpoints (Convention Cards)

### Card CRUD
```
POST /api/cards
  Create a new convention card
  Body: { name, description, format, card_data, visibility }
  → { card_id }

GET /api/cards/:id
  Get a convention card
  → { card }

PUT /api/cards/:id
  Update a convention card
  Body: { name?, description?, card_data?, visibility? }
  → { success }

DELETE /api/cards/:id
  Delete a convention card
  → { success }

GET /api/cards?owner_id=<uuid>
  List user's cards
  → { cards: [...] }

GET /api/cards?visibility=public
  List public cards (templates, examples)
  → { cards: [...] }
```

### Card Sharing
```
POST /api/cards/:id/share
  Share card with another user
  Body: { user_id, can_edit }
  → { success }

DELETE /api/cards/:id/share/:user_id
  Remove sharing
  → { success }

GET /api/cards/shared-with-me
  List cards shared with current user
  → { cards: [...] }
```

### PDF Export
```
GET /api/cards/:id/pdf
  Generate PDF of convention card
  Query: ?format=acbl_standard
  → PDF file download
```

### Bridge Classroom Integration
```
POST /api/users/:id/cards
  Link a card to user's profile
  Body: { card_id, is_primary, label }
  → { success }

DELETE /api/users/:id/cards/:card_id
  Unlink a card
  → { success }

GET /api/users/:id/cards
  Get user's linked cards
  → { cards: [...] }

GET /api/users/:id/skills-from-cards
  Get skills relevant to user's cards
  → { skills: ["bidding_conventions/stayman", ...] }

GET /api/users/:id/proficiency?card_filter=<card_id>
  Get proficiency filtered by card conventions
  → { proficiency: { skill: percentage, ... } }
```

---

## PDF Generation

### Approach
Use a PDF library to render the card in standard ACBL format:

**Options:**
- **pdf-lib** (JavaScript) — Client-side PDF generation
- **puppeteer** (Node.js) — Render HTML to PDF
- **printpdf** (Rust) — Server-side generation

**Recommended:** Generate on server (Rust with printpdf or calling a Node service) for consistency.

### PDF Layout
Match official ACBL card layout:
- 8.5" x 11" portrait
- Standard sections in expected positions
- Checkboxes rendered as ☑ or ☐
- Printable, tournament-legal format

---

## Standard Card Templates

Provide pre-built templates users can start from:

1. **SAYC (Standard American Yellow Card)**
   - Default beginner-friendly system
   
2. **2/1 Game Force**
   - Common modern system
   
3. **Precision**
   - Strong club system
   
4. **ACBL Robot (BBO)**
   - Matches what robots play on BBO
   
5. **Blank**
   - Start from scratch

---

## Future Enhancements

1. **Partnership Linking** — Both partners edit same card
2. **Version History** — Track changes over time
3. **Card Comparison** — Compare two cards side-by-side
4. **Import/Export** — Import from other formats (BridgeBaron, etc.)
5. **AI Suggestions** — Suggest conventions based on skill level
6. **Tournament Integration** — Submit card electronically for tournaments
7. **Alert Generator** — Auto-generate alert list from card
