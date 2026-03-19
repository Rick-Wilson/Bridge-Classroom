# Bridge Classroom — Teacher Features Implementation Spec

## Overview

Bridge Classroom is a Vue 3 web app (Composition API, `<script setup>`) for bridge bidding practice. It currently supports ~60 users with a SQLite database, served from a Mac Mini. This spec adds teacher features: classrooms, exercises, assignments, and role-based lobby views.

The existing schema has: `users`, `observations`, `sharing_grants`, `convention_cards`, `user_convention_cards`, `recovery_tokens`, `viewers`.

Key columns in existing tables:
- `users`: id, first_name, last_name, email, classroom, data_consent, created_at, updated_at, recovery_encrypted_key
- `observations`: id, user_id, timestamp, skill_path, correct, classroom, deal_subfolder, deal_number, encrypted_data, iv, created_at
- `sharing_grants`: id, grantor_id, grantee_id, encrypted_payload, granted_at, expires_at

---

## 1. Database Schema

### New Tables

```sql
-- EXERCISES: A named, ordered collection of boards.
-- Curriculum exercises (created_by NULL) are shared reference content.
-- Teacher-created exercises are private by default.
CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT REFERENCES users(id),
    curriculum_path TEXT,                        -- e.g. "beginner/month3/week2"
    visibility TEXT NOT NULL DEFAULT 'public',   -- 'public' | 'private'
    created_at TEXT NOT NULL
);

CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_exercises_curriculum ON exercises(curriculum_path);
CREATE INDEX idx_exercises_visibility ON exercises(visibility);

-- EXERCISE_BOARDS: Junction table for boards in an exercise.
-- References deal_subfolder/deal_number, same identifiers used in observations.
CREATE TABLE exercise_boards (
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    deal_subfolder TEXT NOT NULL,
    deal_number INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (exercise_id, deal_subfolder, deal_number)
);

CREATE INDEX idx_exercise_boards_deal ON exercise_boards(deal_subfolder, deal_number);

-- CLASSROOMS: A named group of students associated with a teacher.
-- No active/completed status. Teacher creates a new classroom for each
-- offering (e.g. "Beginning Bridge Spring 2026").
CREATE TABLE classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    teacher_id TEXT NOT NULL REFERENCES users(id),
    join_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX idx_classrooms_join_code ON classrooms(join_code);

-- CLASSROOM_MEMBERS: Joining auto-creates a sharing_grant (in app logic).
-- Removing a member does NOT revoke the sharing_grant.
CREATE TABLE classroom_members (
    classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id),
    joined_at TEXT NOT NULL,
    PRIMARY KEY (classroom_id, student_id)
);

CREATE INDEX idx_classroom_members_student ON classroom_members(student_id);

-- ASSIGNMENTS: A teacher assigns an exercise to a classroom or individual.
-- Set classroom_id for group, student_id for individual. Never both.
CREATE TABLE assignments (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    classroom_id TEXT REFERENCES classrooms(id),
    student_id TEXT REFERENCES users(id),
    assigned_by TEXT NOT NULL REFERENCES users(id),
    assigned_at TEXT NOT NULL,
    due_at TEXT,
    sort_order INTEGER,
    CHECK (
        (classroom_id IS NOT NULL AND student_id IS NULL) OR
        (classroom_id IS NULL AND student_id IS NOT NULL)
    )
);

CREATE INDEX idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_exercise ON assignments(exercise_id);
CREATE INDEX idx_assignments_assigned_by ON assignments(assigned_by);

-- Supporting index on existing observations table
CREATE INDEX IF NOT EXISTS idx_observations_deal_user
    ON observations(deal_subfolder, deal_number, user_id);
```

### Schema Changes to Existing Tables

Add `role` column to `users` table if not already present:

```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student';
-- Values: 'student' | 'teacher' | 'admin'
```

Add `teacher_terms_accepted_at` to track when a user accepted the teacher agreement:

```sql
ALTER TABLE users ADD COLUMN teacher_terms_accepted_at TEXT;
```

### Key Design Decisions

- **Observations table is unchanged.** Assignment completion is inferred by joining `exercise_boards` with `observations` WHERE `o.timestamp >= a.assigned_at`. No `exercise_id` or `assignment_id` on observations.
- **Multiple attempts per board** are stored in observations. Queries should use the most recent attempt per board for summary views.
- **Classrooms have no lifecycle state** (no active/completed/archived). When a teacher restarts a course, they create a new classroom. Old classrooms remain queryable.
- **Joining a classroom auto-creates a `sharing_grant`** so the teacher can view the student's observations. Leaving a classroom does NOT revoke the grant. Students can revoke manually via existing sharing settings.
- **Exercises are curriculum content**, not teacher content. They exist independently of any teacher or classroom. A teacher assigns an existing exercise; they don't "create assignments" from scratch (though they can create custom private exercises).

---

## 2. User Roles & Personas

Three user personas with distinct lobby views, plus an admin view:

### Casual User (role: 'student', no classroom memberships, no assignments)
- Sees: Lesson Collections, Curriculum Exercises
- No assignments panel, no teacher panel
- This is the default experience for new users

### Student (role: 'student', has classroom memberships or assignments)
- Sees: My Assignments (at top), Lesson Collections, Curriculum Exercises
- Assignments panel appears dynamically when assignments exist
- Shows assignment name, board count, due date, teacher name, progress bar, status (new/in-progress/complete)

### Teacher (role: 'teacher')
- Sees: A fundamentally different dashboard layout
- Welcome message with summary stats ("2 active classrooms, 3 open assignments")
- Quick actions: + New Assignment, + New Classroom, Create Exercise, Browse Collections
- Left column: Classroom cards showing student count, open assignments, avg completion rate, per-assignment completion bars
- Right column: "Needs Attention" panel (upcoming due dates with lagging students, low-scoring students, new joins) and Recent Activity feed
- Teachers still have access to all student features (lessons, exercises, their own practice)

### Admin (role: 'admin')
- System dashboard: total users, 7d active users, 7d observation count, today's active
- Popular lessons table (plays, users, accuracy)
- Database panel (SQLite file size, per-table row counts and sizes)
- API calls chart (hourly for last 24h) with endpoint breakdown (calls, avg response time)
- System health: uptime, disk, memory, last backup, SSL cert, Cloudflare status

### Role Determination Logic

The lobby view is computed dynamically:

```javascript
// Pseudo-logic for lobby view selection
if (user.role === 'admin') → show admin dashboard
else if (user.role === 'teacher') → show teacher dashboard
else if (userHasAssignments || userHasClassrooms) → show student view (with assignments)
else → show casual user view
```

---

## 3. Become a Teacher Flow

Accessible from avatar dropdown menu → "Become a Teacher".

### Three-step modal flow:

**Step 1 — Overview:**
- Shows teacher capabilities: Create Classrooms, Assign Exercises, Track Progress
- Notes: "Still a Student Too" — teacher keeps full student access
- Actions: "Not Now" (closes modal), "Continue →"

**Step 2 — Agreement:**
- Scrollable disclaimer box with these sections:
  - **Service Availability**: Provided as-is, no uptime guarantee, may be discontinued
  - **Data & Storage**: No warranty on data preservation, export encouraged
  - **Student Data & Privacy**: Teacher sees practice observations for their assignments/classrooms. Must use data for educational purposes only. Must not share publicly. Students can revoke access.
  - **Your Responsibilities**: Teacher manages own classrooms and communication
  - **No Warranty**: Standard "as is" disclaimer
  - **Open Source**: Code available on GitHub
- Checkbox: "I have read and agree to the terms above. I understand that Bridge Classroom is a free, as-is service with no guarantees of uptime or data preservation."
- "Activate Teacher Account" button disabled until checkbox checked
- Actions: "← Back", "Activate Teacher Account"

**Step 3 — Confirmation:**
- Success animation
- "You're a Teacher!" with next steps:
  1. Create your first classroom from the teacher dashboard
  2. Share the invite link with your students
  3. Browse exercises and assign them to your class
- Links to Discord and GitHub documentation
- "Go to Dashboard →" button

### Backend:
- `PATCH /api/users/me` — sets `role = 'teacher'` and `teacher_terms_accepted_at = NOW()`
- Only upgrades student → teacher. Cannot downgrade.

---

## 4. Classroom Invitation Flow

Teachers do NOT get a free view of enrolled users. Invitation is via a shareable link. The teacher sends the link through their own email system.

### Teacher Side

**Create Classroom:**
- Form with: Classroom Name (required), Description (optional)
- On create: generates a unique `join_code` (e.g., "BRG-4821"), stores classroom in DB
- Returns the invite link: `https://bridge-classroom.com/join/{join_code}`

**Invite Link Panel:**
- Shows the classroom name, status badge, and invite link with copy button
- Includes a **pre-written email template** the teacher can copy/paste into their email:

```
Subject: Join our Bridge Classroom for practice exercises

Hi everyone,

I've set up an online practice tool for our bridge class. You can work through
bidding exercises at your own pace, and I'll be able to see your progress to
help guide our lessons.

To join, click this link:
https://bridge-classroom.com/join/BRG-4821

You'll need to create a free account (just your name and email). Once you've
joined, you'll see any exercises I assign in your lobby.

The tool works on any device — computer, tablet, or phone — and you can
practice offline too.

See you in class!
```

- **Class Roster** table below showing: Name, Email, Status (Joined), Join Date, Remove button

**Roster management:**
- Teacher can remove a student from the classroom
- Removing does NOT revoke the sharing_grant (teacher may still have independent sharing permission)
- No "pending" state — students either joined or haven't yet

### Student Side

**Route: `/join/{join_code}`**

**If not logged in:**
- Landing page showing classroom name and teacher name
- Two buttons: "Sign In to Join" and "Create an Account"
- After auth, redirect back to the join confirmation page

**If logged in:**
- Confirmation page showing:
  - Classroom name and teacher name
  - Student's own account info (name, email)
  - Explicit note: "Your teacher will be able to see your practice results (which exercises you've completed and your accuracy) for assignments in this classroom. You can leave the classroom or revoke access at any time from your settings."
- Two buttons: "Decline" and "Join Classroom"

**On join:**
1. Insert row into `classroom_members`
2. Auto-create `sharing_grant` (student grants teacher viewing access)
3. Redirect to success page

**Success page:**
- "You're In!" with classroom name
- Info items:
  - Assignments from your teacher will appear in your lobby
  - Your teacher can see your practice progress for assigned exercises
  - You can leave this classroom or change sharing at any time from Settings
- "Go to Lobby →" button

### API Endpoints

```
POST   /api/classrooms                    — Create classroom (teacher only)
GET    /api/classrooms                    — List teacher's classrooms
GET    /api/classrooms/:id                — Get classroom detail with members
GET    /api/join/:join_code               — Get classroom info for join page (public)
POST   /api/join/:join_code               — Join classroom (authenticated)
DELETE /api/classrooms/:id/members/:uid   — Remove member (teacher only)
POST   /api/classrooms/:id/members/leave  — Student leaves classroom
```

---

## 5. Exercises & Curriculum

### Two types of exercises:

**Curriculum exercises** (system-level):
- `created_by = NULL`, `visibility = 'public'`
- Organized by `curriculum_path` into browsable series
- Available to all users for self-study
- Created by admin; curated board collections from existing lessons

**Teacher exercises** (custom):
- `created_by = teacher_id`, `visibility = 'private'` (or 'public' if they want to share)
- Teacher picks boards from existing collections to build a custom exercise
- Used when the standard curriculum exercises don't match their teaching needs

### Curriculum organization:

Exercises are grouped into series (displayed as cards in the lobby). A series is implicitly defined by the `curriculum_path` prefix. For example:

- `beginner/nt_openings/1` → "Beginner: NT Openings & Responses" series, exercise 1
- `beginner/nt_openings/2` → same series, exercise 2
- `intermediate/competitive/1` → "Intermediate: Competitive Bidding" series

### Lesson Collections vs Curriculum Exercises:

- **Lesson Collections** (Baker Bridge, Rowberg, ACBL Bridge Series, Grant Robinson Series, Two Over One Series) are the raw board collections organized in a tree structure. These already exist.
- **Curriculum Exercises** are curated subsets of boards from those collections, designed as practice sets. These are new.

Both appear on the lobby. Collections are for browsing/exploring. Exercises are for structured practice with progress tracking.

### API Endpoints

```
GET    /api/exercises                     — List exercises (filterable by curriculum_path, visibility, created_by)
GET    /api/exercises/:id                 — Get exercise detail with board list
POST   /api/exercises                     — Create exercise (teacher or admin)
PUT    /api/exercises/:id                 — Update exercise (owner only)
DELETE /api/exercises/:id                 — Delete exercise (owner only)
GET    /api/exercises/:id/progress/:uid   — Get user's progress on exercise
```

---

## 6. Assignments

### Creating an assignment:

Teacher selects an exercise and a classroom (or individual student), optionally sets a due date and sort order.

### Assignment status (computed, not stored):

Status is derived at query time from the student's observations:

- **New**: No observations for any board in the exercise since `assigned_at`
- **In Progress**: Some boards attempted, not all
- **Complete**: All boards in the exercise have at least one observation since `assigned_at`
- **Overdue**: Due date has passed and status is not Complete

### Key queries:

**Student's assignment list with progress:**

```sql
SELECT
    a.id AS assignment_id,
    e.name AS exercise_name,
    a.assigned_at,
    a.due_at,
    COUNT(DISTINCT eb.deal_subfolder || '/' || eb.deal_number) AS total_boards,
    COUNT(DISTINCT CASE WHEN o.id IS NOT NULL
          THEN eb.deal_subfolder || '/' || eb.deal_number END) AS attempted_boards,
    COUNT(DISTINCT CASE WHEN o.correct = 1
          THEN eb.deal_subfolder || '/' || eb.deal_number END) AS correct_boards
FROM assignments a
JOIN exercises e ON e.id = a.exercise_id
JOIN exercise_boards eb ON eb.exercise_id = a.exercise_id
LEFT JOIN observations o
    ON o.user_id = ?
    AND o.deal_subfolder = eb.deal_subfolder
    AND o.deal_number = eb.deal_number
    AND o.timestamp >= a.assigned_at
WHERE a.student_id = ?
   OR a.classroom_id IN (
       SELECT classroom_id FROM classroom_members WHERE student_id = ?
   )
GROUP BY a.id
ORDER BY a.assigned_at DESC;
```

**Teacher's class performance on an assignment (most recent attempt per board):**

```sql
SELECT
    u.first_name, u.last_name,
    eb.deal_subfolder, eb.deal_number, eb.sort_order,
    o.correct, o.timestamp
FROM assignments a
JOIN exercise_boards eb ON eb.exercise_id = a.exercise_id
JOIN classroom_members cm ON cm.classroom_id = a.classroom_id
JOIN users u ON u.id = cm.student_id
LEFT JOIN observations o
    ON o.user_id = cm.student_id
    AND o.deal_subfolder = eb.deal_subfolder
    AND o.deal_number = eb.deal_number
    AND o.timestamp >= a.assigned_at
    AND o.timestamp = (
        SELECT MAX(o2.timestamp)
        FROM observations o2
        WHERE o2.user_id = o.user_id
        AND o2.deal_subfolder = o.deal_subfolder
        AND o2.deal_number = o.deal_number
        AND o2.timestamp >= a.assigned_at
    )
WHERE a.id = ?
ORDER BY u.last_name, eb.sort_order;
```

### API Endpoints

```
POST   /api/assignments                   — Create assignment (teacher only)
GET    /api/assignments                   — List assignments (for current user or teacher's classrooms)
GET    /api/assignments/:id               — Get assignment detail with per-student progress
DELETE /api/assignments/:id               — Delete assignment (teacher only)
```

---

## 7. Lobby Page Component Architecture

The lobby is a single Vue route that renders different layouts based on user role and state.

### Suggested component tree:

```
LobbyView.vue
├── AnnouncementBanner.vue              — Collapsible, dismissible
├── TeacherDashboard.vue                — v-if="user.role === 'teacher'"
│   ├── TeacherWelcome.vue              — Greeting + summary stats
│   ├── QuickActions.vue                — Action buttons
│   ├── ClassroomCard.vue (v-for)       — Per-classroom stats + assignment progress
│   ├── NeedsAttention.vue              — Flagged items
│   └── RecentActivity.vue              — Activity feed
├── AdminDashboard.vue                  — v-if="user.role === 'admin'"
│   ├── AdminStatsRow.vue               — Top-level metric cards
│   ├── PopularLessons.vue              — Table
│   ├── DatabasePanel.vue               — Table sizes
│   ├── ApiCallsChart.vue               — Bar chart + endpoint table
│   └── SystemHealth.vue                — Status rows
├── AssignmentsList.vue                 — v-if="hasAssignments" (student/casual)
│   └── AssignmentCard.vue (v-for)      — Individual assignment with progress
├── CollectionGrid.vue                  — Lesson collection cards (always shown for students)
│   └── CollectionCard.vue (v-for)
└── ExerciseSeriesGrid.vue              — Curriculum exercise series (always shown for students)
    └── ExerciseSeriesCard.vue (v-for)
```

### Additional page components:

```
BecomeTeacherModal.vue                  — Three-step modal (overview → agreement → success)
ClassroomCreateModal.vue                — Create classroom form
ClassroomInvitePanel.vue                — Invite link, email template, roster
JoinClassroomView.vue                   — Route: /join/:joinCode
```

---

## 8. Announcement Banner

A simple, data-driven collapsible banner at the top of the lobby.

- Content can be a static JSON object or fetched from a simple endpoint
- Stores dismissed state in localStorage by announcement ID
- Supports: date, text content, optional link (e.g., to Discord)
- Styling: amber/warm background, dismiss X button

---

## 9. Communications & Footer

### Footer bar on all lobby views:

```
Bridge Classroom · Free educational tool · Provided as-is
                                          About | Terms | GitHub | Discord
```

### Channel purposes:
- **Lobby announcement banner**: Status updates, new features, known issues
- **Discord**: Community dialog, Q&A, teacher discussions
- **GitHub Issues**: Bug reports, feature requests

---

## 10. Implementation Order

Recommended build sequence — each step is independently useful:

### Phase 1: Foundation
1. **Database migration** — Add new tables and indexes. Add `role` and `teacher_terms_accepted_at` columns to users.
2. **Become a Teacher flow** — Modal component, role upgrade endpoint.
3. **Lobby refactor** — Split lobby into role-based views. Casual and student views first (just showing existing collections in the new layout).

### Phase 2: Classrooms
4. **Classroom CRUD** — Create classroom, generate join code, list teacher's classrooms.
5. **Join flow** — `/join/:joinCode` route, confirmation page, auto-grant sharing_grant.
6. **Classroom management** — Invite link panel, email template, roster, remove member.

### Phase 3: Exercises & Assignments
7. **Exercise schema & API** — CRUD for exercises, exercise_boards junction table.
8. **Curriculum exercises** — Seed initial curriculum exercises from existing Baker Bridge collections.
9. **Exercise browser** — Curriculum exercise series grid on lobby, exercise detail/play view with progress tracking.
10. **Assignment CRUD** — Create, list, delete assignments. Teacher assigns exercise to classroom or individual.
11. **Student assignment view** — "My Assignments" panel on student lobby with progress bars and status.
12. **Teacher assignment dashboard** — Per-classroom assignment progress, per-student drill-down.

### Phase 4: Teacher Dashboard
13. **Teacher lobby** — Classroom cards with stats, needs attention panel, recent activity feed.
14. **Admin dashboard** — Usage metrics, database stats, API monitoring, system health.

### Phase 5: Polish
15. **Announcement banner** — Collapsible, data-driven.
16. **Footer** — About/Terms/GitHub/Discord links.
17. **Data export** — Let students download their observation history as CSV/JSON.
18. **Automated backup** — Nightly cron job for SQLite backup to offsite location.

---

## 11. UI Reference Mockups

HTML mockups are provided as separate files for visual reference:

- `lobby-three-views.html` — Lobby layouts for casual, student, teacher, and admin personas
- `become-teacher-flow.html` — Three-step teacher enrollment modal
- `classroom-invite-flow.html` — Teacher invite link/roster + student join confirmation flow

These mockups use the design system described below and can be used as pixel-reference when building the Vue components.

### Design System Notes

- **Fonts**: Source Serif 4 (headings), DM Sans (body)
- **Color palette**: Green-focused (--green-dark: #2d6a4f, --green-mid: #40916c, --green-accent: #52b788) with blue, purple, amber accents
- **Background**: Warm off-white (#f5f3ef)
- **Cards**: White with subtle border (#e0ddd7) and light shadows
- **Status badges**: Blue (new), Amber (in progress), Green (complete), Red (overdue)
- **Collection cards**: Gradient backgrounds per collection
- **Border radius**: 10px for cards, 6px for buttons/inputs
