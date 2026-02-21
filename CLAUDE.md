# Claude Code Notes

## Git Configuration

- Use SSH for all git operations (not HTTPS)
- Remote: git@github.com:Rick-Wilson/Bridge-Classroom.git

## Project Context

Bridge Classroom is a bridge (card game) teaching platform with role-based dashboards, classroom management, lesson assignments, and student progress tracking.

**Tech Stack:**
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite, plain CSS
- **Backend**: Rust (Axum 0.7), SQLite (sqlx), single-binary server
- **Deployment**: GitHub Pages (frontend in `docs/`), Cloudflare Tunnel to localhost:3000

---

## Division of Labor: Baker-Bridge vs Bridge-Classroom

### Baker-Bridge (Content Generation)
- Produces PBN files with ALL instructions for display and interaction
- Generates `[show ...]`, `[PLAY ...]`, `[BID ...]`, `[NEXT]` etc. directives
- Determines hand visibility from actual HTML content
- Single source of truth for lesson behavior
- **Local PBN files**: `/Users/rick/Development/GitHub/Baker-Bridge/Package/` (all practice lessons live here)

### Bridge-Classroom (Dumb Renderer)
- Reads PBN files and follows instructions exactly
- Does NOT make decisions based on presence/absence of tags
- Does NOT infer visibility from lesson type or mode
- If PBN says `[show S]`, app shows only South - no fallbacks, no defaults

### Key Principle
**The PBN provides explicit instructions; the app follows them.**

If something needs to be shown or hidden, the PBN says so explicitly. The app doesn't try to be smart about what "should" be visible based on lesson type.

---

## Deployment Architecture

- **Website**: https://bridge-classroom.com
- **Discord**: https://discord.gg/7PGejFZn
- **Frontend**: GitHub Pages (served from `docs/` directory)
- **Backend API**: Rust server running locally on Mac at port 3000
- **Tunnel**: Cloudflare Tunnel routes https://api.bridge-classroom.com → localhost:3000
- **Database**: SQLite at `bridge-classroom-api/data/bridge_classroom.db`
- **Database backups**: Nightly at 2AM Pacific via `com.bridgeclassroom.backup` launchd job
  - Script: `bridge-classroom-api/scripts/backup-db.sh`
  - Uses `sqlite3 .backup` for safe snapshots (handles WAL correctly)
  - Local backups: `bridge-classroom-api/data/bridge_classroom_backup_YYYYMMDD.db`
  - Google Drive backups: `My Drive/Bridge Classroom/Backups/`
  - Retention: 14 most recent in each location
  - Logs: `~/Library/Logs/bridge-classroom-backup.log`
- **API logs**: `~/Library/Logs/bridge-classroom-api.log`
- **Tunnel logs**: `~/Library/Logs/cloudflared-tunnel.log`
- **Service management**: `launchctl list | grep -E "bridge|cloudflare"`
- **Restart backend**: `launchctl kickstart -k gui/$(id -u)/com.bridgeclassroom.api`
- **Build & deploy frontend**: `npx vite build && cp -r dist/* docs/` then commit and push
- See `docs/cloudflare-setup.md` for full details

---

## Application Architecture

### Role-Based Lobby System

Users have one of three roles: `student`, `teacher`, `admin`. The lobby view (`src/views/LobbyView.vue`) routes to the appropriate lobby component:

| Role | Default View | Notes |
|------|-------------|-------|
| `admin` | TeacherLobby (with Admin Panel button) | Admin is a superset of teacher |
| `teacher` | TeacherLobby | Full classroom/assignment management |
| `student` (with classrooms/assignments) | StudentLobby | Assignment-focused view |
| `student` (casual) | CasualLobby | Browse lesson collections |

**Admin users** see the TeacherLobby by default with a purple "Admin Panel" button to toggle to AdminLobby. This ensures admins retain all teacher functionality.

### User Role Sync

- User data (including role) is cached in localStorage (`bridgePractice` key)
- On app startup, `syncRole()` in `useUserStore.js` fetches the server-side role via `GET /api/users/:user_id` and updates localStorage if it changed
- `checkTeacherStatus()` in `useTeacherRole.js` only upgrades `student` → `teacher`, never downgrades `admin`

### Classroom & Assignment System

- **Classrooms**: Teachers create classrooms with auto-generated join codes (format: `BRG-XXXX`). Students join via `/join/:code` URL.
- **Exercises**: Teachers create exercises from lesson collections. Each exercise has boards from `exercise_boards` table.
- **Assignments**: Link an exercise to a classroom with an optional due date. Progress is computed server-side from observations.

### Dashboard Architecture

**Teacher Dashboard** (`GET /api/teacher/dashboard?teacher_id=X`):
- Single aggregated endpoint returning all dashboard data in one round-trip
- Classrooms with per-assignment completion stats
- "Needs Attention" items: `due_soon`, `low_score`
- "Recent Activity" events: `assignment_completed`, `student_joined`
- Two-column layout: classrooms (left 3fr) + attention/activity (right 2fr)

**Admin Dashboard** (`GET /api/admin/stats`, `GET /api/admin/health`):
- Stats: total users, 7-day active, observation counts, popular lessons, DB table sizes
- Health: uptime (from `AppState.started_at`), disk space, DB writable, API version

---

## Key Files

### Frontend Structure
```
src/
├── views/
│   ├── MainLayout.vue          # Top-level app shell, route orchestration
│   ├── LobbyView.vue           # Role-based lobby routing
│   └── JoinClassroomView.vue   # /join/:code handler
├── components/
│   ├── lobby/
│   │   ├── TeacherLobby.vue    # Teacher dashboard (two-column layout)
│   │   ├── AdminLobby.vue      # Admin dashboard (stats, health, popular lessons)
│   │   ├── StudentLobby.vue    # Student assignment view
│   │   ├── CasualLobby.vue     # Browse collections
│   │   ├── ClassroomCard.vue   # Expandable classroom card with completion bars
│   │   ├── NeedsAttention.vue  # Teacher attention alerts
│   │   ├── RecentActivity.vue  # Teacher activity feed
│   │   ├── AdminStatsRow.vue   # Admin metric cards
│   │   ├── PopularLessons.vue  # Admin lesson table
│   │   ├── DatabasePanel.vue   # Admin DB stats
│   │   ├── SystemHealth.vue    # Admin health indicators
│   │   ├── CollectionGrid.vue  # Lesson collection browser
│   │   └── ClassroomCreateModal.vue / AssignmentCreateModal.vue
│   ├── BridgeTable.vue         # Main card table rendering
│   ├── BiddingBox.vue          # Bidding input
│   └── ...                     # Other game components
├── composables/
│   ├── useUserStore.js         # User management (localStorage + server sync)
│   ├── useTeacherDashboard.js  # Teacher lobby data (classrooms, attention, activity)
│   ├── useAdminDashboard.js    # Admin stats and health
│   ├── useTeacherRole.js       # Legacy teacher/student grant-based role check
│   ├── useClassrooms.js        # Classroom CRUD
│   ├── useExercises.js         # Exercise CRUD
│   ├── useAssignments.js       # Assignment CRUD + student progress
│   ├── useDataSync.js          # Observation sync to server
│   ├── useObservationStore.js  # Local observation storage
│   ├── useDealPractice.js      # Core practice state machine
│   └── useBoardMastery.js      # Board mastery computation
└── utils/
    ├── pbnParser.js            # PBN file parsing
    ├── crypto.js               # E2E encryption for sharing grants
    └── cardFormatting.js       # Card display utilities
```

### Backend Structure
```
bridge-classroom-api/src/
├── main.rs                     # Axum server setup, routes, AppState
├── routes/
│   ├── users.rs                # User CRUD + single-user lookup
│   ├── classrooms.rs           # Classroom CRUD, join, members
│   ├── exercises.rs            # Exercise + board management
│   ├── assignments.rs          # Assignment CRUD + progress
│   ├── teacher_dashboard.rs    # Aggregated teacher dashboard
│   ├── admin.rs                # Admin stats + health
│   ├── observations.rs         # Observation ingestion + query
│   ├── recovery.rs             # Account recovery flow
│   └── ...                     # grants, viewers, keys, auth, cards
├── models/
│   ├── user.rs                 # User, UserInfo, CreateUserRequest
│   └── ...                     # Other model definitions
└── config.rs                   # Environment configuration
```

### Database Tables
Core tables: `users`, `observations`, `classrooms`, `classroom_members`, `exercises`, `exercise_boards`, `assignments`

---

## Composable Pattern

All composables use the **singleton pattern** — state is declared at module scope (outside the exported function) so it's shared across all component instances:

```javascript
const myState = ref([])  // Module-level singleton

export function useMyComposable() {
  return { myState, /* methods */ }
}
```

---

## Key Implementation Details

- Classrooms are dynamic via URL parameters, not hardcoded
- Users can belong to multiple classrooms
- Assignments/homework are tracked with server-side completion progress
- URL params silently merge with existing config on revisit
- Hand visibility driven by `[show ...]` tags from PBN, not inferred
- API key header: `x-api-key` on all authenticated endpoints
- Frontend env vars: `VITE_API_URL`, `VITE_API_KEY`
