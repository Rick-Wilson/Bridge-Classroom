# Bridge Classroom — GUI Taxonomy

## Navigation Structure

```
MainLayout (src/views/MainLayout.vue)
├── Header bar: Lobby / Progress / Accomplishments / Students buttons
├── LobbyView (src/views/LobbyView.vue)
│   ├── CasualLobby (src/components/lobby/CasualLobby.vue)
│   ├── StudentLobby (src/components/lobby/StudentLobby.vue)
│   ├── TeacherLobby (src/components/lobby/TeacherLobby.vue)
│   └── AdminLobby (src/components/lobby/AdminLobby.vue)
├── LessonPlayerView (src/views/LessonPlayerView.vue)
├── Student Progress (src/components/StudentProgressPanel.vue)
├── Accomplishments (src/components/AccomplishmentsView.vue)
├── My Students (src/components/TeacherStudentList.vue)
└── JoinClassroomView (src/views/JoinClassroomView.vue)
```

---

## 1. Lobbies

### Casual Lobby
**File:** `src/components/lobby/CasualLobby.vue`
Browse lesson collections. Default for students with no classrooms.

- CollectionGrid (`src/components/lobby/CollectionGrid.vue`) — card grid of lesson sets

### Student Lobby
**File:** `src/components/lobby/StudentLobby.vue`
Assignment-focused view for students enrolled in classrooms.

- AssignmentPanel (`src/components/lobby/AssignmentPanel.vue`) — assignment cards with progress bars
- CollectionGrid

### Teacher Lobby
**File:** `src/components/lobby/TeacherLobby.vue`
Two-column dashboard (classrooms left, alerts right).

- ClassroomCard (`src/components/lobby/ClassroomCard.vue`) — expandable card: join code, members, assignment completion bars
- NeedsAttention (`src/components/lobby/NeedsAttention.vue`) — due-soon / low-score alerts
- RecentActivity (`src/components/lobby/RecentActivity.vue`) — activity feed

### Admin Lobby
**File:** `src/components/lobby/AdminLobby.vue`
System-wide stats and health. Accessed via Admin Panel button (admin users see TeacherLobby by default).

- AdminStatsRow (`src/components/lobby/AdminStatsRow.vue`) — metric cards
- PopularLessons (`src/components/lobby/PopularLessons.vue`) — lessons ranked by observation count
- DatabasePanel (`src/components/lobby/DatabasePanel.vue`) — table sizes
- SystemHealth (`src/components/lobby/SystemHealth.vue`) — uptime, disk, DB writable

---

## 2. Lesson Player

**File:** `src/views/LessonPlayerView.vue`
PBN-driven lesson playback. Core state machine: `useDealPractice` (`src/composables/useDealPractice.js`).

- BridgeTable (`src/components/BridgeTable.vue`) — card table with four HandDisplay seats
- HandDisplay (`src/components/HandDisplay.vue`) — single hand (suit pips + cards)
- BiddingBox (`src/components/BiddingBox.vue`) — level/strain/pass/dbl/rdbl input
- AuctionTable (`src/components/AuctionTable.vue`) — bidding history (W/N/E/S columns)
- DealInfo (`src/components/DealInfo.vue`) — board number, dealer, vulnerability, contract
- DealNavigator (`src/components/DealNavigator.vue`) — prev/next board buttons
- BoardMasteryStrip (`src/components/BoardMasteryStrip.vue`) — horizontal strip of board circles (colored by status)
- FeedbackPanel (`src/components/FeedbackPanel.vue`) — learning feedback indicator

---

## 3. Student Progress

**File:** `src/components/StudentProgressPanel.vue`
Composable: `useStudentProgress` (`src/composables/useStudentProgress.js`)

### Activity Chart
**Location:** `StudentProgressPanel.vue` (lines ~18–62, computed `activityChartData`)
Stacked bar chart showing observations per day, colored by lesson.

### Mastery Plots (per lesson)
**Location:** `StudentProgressPanel.vue` — lesson cards with sparklines
Sparkline: `StudentProgressSparkline` (`src/components/StudentProgressSparkline.vue`)

Clicking a lesson card opens the **Lesson Timeline**:

### Lesson Timeline (scatterplot)
**File:** `src/components/StudentProgressDetails.vue`
Scatterplot: Y-axis = board numbers, X-axis = time, dots colored by outcome (green=correct, orange=corrected, red=fail). Includes stats (days active, boards tried, total observations).

Key logic: `positionedDots` computed property — collision spreading for overlapping dots.

Clicking a dot opens the **Observation Detail**:

### Observation Detail
**File:** `src/components/ObservationViewer.vue`
Manager: `ObservationPopupManager` (`src/components/ObservationPopupManager.vue`)

Draggable floating panel showing: lesson/deal header, four-hand compass layout, auction trace, play trace, metadata. Multiple viewers can be open simultaneously (staggered z-index).

---

## 4. Accomplishments

**File:** `src/components/AccomplishmentsView.vue`
Composable: `useAccomplishments` (`src/composables/useAccomplishments.js`)

Tabbed modal with two tabs:

### Current State by Lesson (Lessons tab)
Board mastery strips per lesson showing colored circles for each board status (grey/red/yellow/orange/green) with gold/silver achievement medals.

- BoardMasteryStrip (`src/components/BoardMasteryStrip.vue`)

### Summary by Taxon (Taxons tab)
**Location:** `AccomplishmentsView.vue` (lines ~95–113)
Skill category cards: name, correct/incorrect counts, totals. Computed via `filteredTaxonStats`.

- AccomplishmentsTable (`src/components/AccomplishmentsTable.vue`) — sortable table with success rate bars

---

## 5. My Students (Teacher View)

**File:** `src/components/TeacherStudentList.vue`
Table: avatar, name, mastery pills (green/orange/yellow/red counts), last active, recent lessons. Filterable by classroom dropdown.

Clicking a student row opens:

### Student Detail
**File:** `src/components/TeacherStudentDetail.vue`
Two tabs:
- **Progress** — embeds StudentProgressPanel (Activity chart + Mastery Plots)
- **Mastery** — BoardMasteryStrips with achievement badges per lesson

---

## 6. Modals

| Modal | File |
|-------|------|
| Create Classroom | `src/components/lobby/ClassroomCreateModal.vue` |
| Create Assignment | `src/components/lobby/AssignmentCreateModal.vue` |
| Become Teacher | `src/components/BecomeTeacherModal.vue` |
| Manage Classroom | `src/components/ClassroomManagePanel.vue` |
| Key Backup | `src/components/KeyBackupModal.vue` |
| Intro PDF Viewer | `src/components/IntroPdfViewer.vue` |
| Settings | `src/components/SettingsPanel.vue` |
| Welcome / Login | `src/components/WelcomeScreen.vue` |

---

## 7. Shared Components

| Component | File | Used In |
|-----------|------|---------|
| CollectionGrid | `src/components/lobby/CollectionGrid.vue` | CasualLobby, StudentLobby, TeacherLobby |
| BoardMasteryStrip | `src/components/BoardMasteryStrip.vue` | LessonPlayer, Accomplishments, TeacherStudentDetail |
| BoardMasteryGrid | `src/components/BoardMasteryGrid.vue` | Lesson detail views |
| SkillChart | `src/components/SkillChart.vue` | Progress views |
| PracticeHistory | `src/components/PracticeHistory.vue` | Session history |
| AnnouncementBanner | `src/components/AnnouncementBanner.vue` | All lobbies |
| SyncStatus | `src/components/SyncStatus.vue` | Header bar |
