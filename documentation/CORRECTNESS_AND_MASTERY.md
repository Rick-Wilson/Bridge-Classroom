# Correctness and Mastery

This document defines the vocabulary and rules behind the colored
status circles, the silver/gold star badges, and the "in the wild"
paw badges.

It is the contract for issue #2 ("Finalize state and color scheme")
and the design constraint for issues #3 (achievements), #4
(positivity / UX feedback), and #11 (Jungle / "in the wild" mode).

When the doc and the code disagree, the doc is right and the code is
a bug.

## 1. Why this doc exists

The system has four notions of student progress that have to play
nicely together:

1. **Current state of a board** — the colored circle. Did the most
   recent play go well?
2. **Star achievement** — a board-level achievement for sustained,
   spaced-out clean practice (silver/gold).
3. **Paw achievement** — a board-level achievement for clean
   recognition out of context (Recent/Fresh).
4. **Lesson mastery** — a per-lesson tier (Exploring → Learning →
   Retaining → Mastering) computed from board achievements across
   the lesson.

Stars and paws are *board achievements*. The lesson tier is
*mastery*. Both are part of a broader "Achievements" surface
(see §3) that also includes lesson achievements (milestones at
lesson scope, e.g. "all boards clean_correct") and player
achievements (account-scope milestones). Lesson and player
achievements catalogs live in `ACHIEVEMENTS.md`; this doc defines
the underlying state they read from.

## 2. Concepts at a glance

| Concept                   | Stored on              | Granularity | Permanent?                                                                                |
| ------------------------- | ---------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| Current state             | `board_status`         | per board   | No — moves with each play. Decays color over time.                                       |
| Star (board achievement)  | `board_status`         | per board   | `max_stars` is permanent. `star_count` (current) resets on a tame mistake.                |
| Paw (board achievement)   | `board_status`         | per board   | Yes. `Recent → Fresh` is one-way; never lost.                                             |
| Wilderness flag           | every observation      | per play    | Frozen at insert time. Surfaces on `board_status` as the wilderness of the most recent play. |
| Lesson mastery tier       | derived, not stored    | per lesson  | n/a — recomputed from board achievements on demand.                                       |

## 3. Vocabulary

- **Observation** — one row in the `observations` table representing
  one *play* of a board, including any back-button corrections
  within that play. Identified by `id`. **Not** one row per call —
  per-play. If the student bids three times on a board (one
  correct, one wrong, one back-button-corrected), that's a single
  observation with one set of outcomes.
- **Board** — one specific deal within a lesson, identified by
  `(deal_subfolder, deal_number)`.
- **Lesson** — a named collection of boards sharing a pedagogical
  theme (e.g. "Negative Doubles"). Identified by `deal_subfolder`.
- **Play** — a single attempt to play a board, start to finish.
  Produces exactly one observation row.
- **Cooldown** — the time window during which a recent error is
  still considered "recent" enough to colour the next state. Today
  **1 hour**.
- **Spacing** — the minimum days between two qualifying clean plays
  to count toward higher mastery. Today **6 days**. Used for both
  the star track and the wild achievement promotion.
- **Tame** — the wilderness flag value for a play in regular
  lesson-style practice on a single convention.
- **Wild** — the wilderness flag value for a play where the student
  encountered the board out of context (Jungle mode, or an exercise
  whose boards are <25% from the same lesson).

The terms `correct`, `corrected`, and `failed` come from the
lesson's own end-of-board verdict. They describe how the play
went, not the student's identity.

### 3.1 Achievement categories

"Achievement" is an umbrella term covering three scopes:

| Category               | Examples                                                                                  | Defined in                       |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| Board achievements     | Silver/gold star on a specific board; Recent/Fresh paw on a specific board.               | This doc (§6, §7).               |
| Lesson achievements    | "All boards corrected in Stayman"; "First Fresh paw in Negative Doubles"; etc.            | `ACHIEVEMENTS.md` catalog.       |
| Player achievements    | "Practiced 7 distinct days"; "100 deals completed"; etc.                                  | `ACHIEVEMENTS.md` catalog.       |

Board achievements are **state attached to a board** (rows in
`board_status`). Lesson and player achievements are **event-fired
milestones** (rows in a separate `achievements_earned`-style table,
defined alongside the catalog in `ACHIEVEMENTS.md`). The two have
different storage shapes but appear together in the achievement
UI (issue #3), à la WoW's categorised achievements panel.

Lesson **mastery** (§13) is a different thing from lesson
achievements. Mastery is a single tier per lesson, derived from
board achievements. Lesson achievements are plural and binary
(earned / not earned). A lesson tile may show *both* — "Learning •
4/12 achievements earned."

## 4. Wilderness (per observation)

Every observation carries a `wilderness` field with one of two
values:

| Wilderness | When                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `Tame`     | Regular self-directed lesson practice. The student chose to drill this convention.                    |
| `Wild`     | Jungle mode (issue #11), OR an exercise / assignment whose boards are **less than 25%** from the same lesson as this board. |

Wilderness is **frozen at observation insert time**. If a teacher
later edits an exercise to add or remove boards, observations
already recorded keep the wilderness they had when they were
inserted. This protects history from silently changing under the
student.

`board_status.wilderness` mirrors the wilderness of **the most
recent observation** for that board. It is informational — the
display logic mostly reads the `wilderness` of the observation
being rendered, not the board-level summary.

## 5. Board state (the colored circle)

Each `(user, board)` has one row in `board_status` carrying the
current state. The state captures **how the most recent play
went**, with cooldown decay applied for color display.

### 5.1 Stored values of `board_status.status`

| Stored          | When                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `not_attempted` | No observations have ever been recorded for this `(user, board)`.                                                       |
| `failed`        | Most recent play had errors and the student did **not** correct them via the back button.                               |
| `corrected`     | Most recent play had errors, and the student used the back button to correct them within this same play.                |
| `close_correct` | Most recent play had no errors, **but** `now - last_error_date < cooldown` at the time of the play (recent prior errors). |
| `clean_correct` | Most recent play had no errors, and `last_error_date` is either null or more than cooldown ago.                         |

`failed`, `corrected`, and the prior-error condition for
`close_correct` all reference the per-play verdict supplied by
the lesson, not the per-call `correct` flag of individual bids.

### 5.2 The `last_error_date` field

`board_status.last_error_date` is set to the observation's
`timestamp` whenever an observation lands with `status` in
`{failed, corrected}` (i.e. there was an error during the play).

It is **not** cleared when a subsequent clean play arrives — it
stays as the timestamp of the most recent erroneous play
indefinitely. That history is what makes the next play
distinguishable as `close_correct` vs `clean_correct`, and what
drives the yellow→orange color decay.

### 5.3 Display color, with decay on read

The color shown is computed at read time from `(status,
last_error_date)`:

| Stored state         | If `now - last_error_date < cooldown` | Otherwise |
| -------------------- | ------------------------------------- | --------- |
| `not_attempted`      | grey                                  | grey      |
| `failed`             | red                                   | red       |
| `corrected`          | yellow                                | orange    |
| `close_correct`      | yellow                                | orange    |
| `clean_correct`      | green                                 | green     |

The two yellow→orange decays share a single rule. The DB row is
the moment-of-observation truth; the API layer projects forward in
time. No scheduler is needed; the value ages on read.

Note: `corrected` and `close_correct` share their color schedule
but are kept as **distinct stored values** because they mean
different things pedagogically — `corrected` is active
self-correction within a play; `close_correct` is recovery from a
past error in a subsequent play. Drilldown displays may want to
distinguish them in text even if the circle color is the same.

### 5.4 When does decay apply?

The yellow → orange decay applies **only on the live tile** —
the colored circle shown for a board the student is currently
looking at. The point of yellow vs orange is to tell the live
student "you can try for green again right now if you act soon."
Once the cooldown has elapsed, that affordance is gone and the
correct signal is orange.

For **drilldown / history views** the decay is irrelevant. A
historical observation that landed as `close_correct` or
`corrected` is always rendered orange in drilldown — never
yellow — because by definition the moment-of-action freshness
has passed. The drilldown is about what *happened*, not what is
currently actionable.

This means the API returns slightly different colors for the same
stored state depending on context:

- Live tile endpoint: yellow if within cooldown, orange after.
- Drilldown endpoint: orange unconditionally for both states.

## 6. Stars — a board achievement (silver/gold)

Stars are a board-level achievement (see §3.1). They measure
sustained, spaced-out clean practice — the intent is to reward "I
learned this and can still do it a week later."

### 6.1 Stored fields on `board_status`

- `star_count` — current stars (resets on a tame mistake).
- `max_stars` — highest `star_count` ever reached for this
  `(user, board)`. Never decreases.
- `last_star_update` — timestamp of the most recent event that
  advanced or initiated the star track. Null if not currently on
  the track.

`star_count > 0` and `max_stars > 0` are separate concepts:
`max_stars` is what's displayed (a permanent badge), `star_count`
is the live progression toward the next star.

"On the star track" is a **derived** flag: `last_star_update IS
NOT NULL`. We don't store it separately.

### 6.2 Transitions, in detail

On each observation insert, the (status, wilderness) of the
observation drives the update:

| Observation status & wilderness | Effect on stars                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `failed`, Tame                  | `star_count = 0`. `last_star_update = NULL`. `max_stars` unchanged.                                            |
| `corrected`, Tame               | Same as above. **Back-button corrections take you out of the star track.**                                     |
| `failed` or `corrected`, Wild   | No change. Wild outcomes are bonus-only; they never break the star track.                                       |
| `close_correct`, any wilderness | No change.                                                                                                     |
| `clean_correct`, any wilderness | See §6.3 below.                                                                                                |
| `not_attempted`                 | Cannot occur as an observation; this state means "no observations yet."                                         |

### 6.3 The clean_correct rule

On a `clean_correct` observation (any wilderness):

1. **If `last_star_update IS NULL`**: set `last_star_update = obs.timestamp`. `star_count` stays at 0. (The track has just been initiated. No star is awarded yet.)
2. **Else if `obs.timestamp - last_star_update >= spacing` (6 days)**: `star_count += 1`. `last_star_update = obs.timestamp`. `max_stars = max(max_stars, star_count)`. (A new star is earned.)
3. **Else**: no change. (Another clean play within the spacing window — keeps the track alive, but the 6-day requirement isn't met yet.)

A consequence the design accepts: the first visible star can only
appear at least 6 days after the first ever `clean_correct` on
this board. Earlier practice doesn't earn a badge.

### 6.4 Display

The star badge in the corner of the board tile shows
`max_stars`, capped at gold:

| `max_stars` | Badge displayed     |
| ----------- | ------------------- |
| 0           | (none)              |
| 1           | silver star         |
| 2 or more   | gold star (capped)  |

Earning star #1 sets `max_stars = 1` — silver, the first visible
reward (the first repetition of a clean_correct, ≥6 days after
the original). Star #2 promotes to gold. The badge stays gold no
matter how many more stars accumulate.

The internal counter continues to grow past 2 (so subsequent
clean_corrects on a Gold board still update `last_star_update`
and `star_count`), but the visible badge doesn't change beyond
gold.

### 6.5 Why wild plays can advance stars but wild mistakes cannot break the track

Stars are framed as a tame-mode achievement (sustained recall of
material in the context you practiced it). Wild mode is bonus
material — random encounters out of context. We let wild
successes credit the star track because they *demonstrate* the
mastery the stars represent. But we don't punish wild failures,
because the student didn't choose that test, and breaking their
star track on an unsolicited stumble would feel unfair.

The asymmetry — wild credits but doesn't debit — is the design.

## 7. Paws — a wild-mode board achievement (Recent/Fresh)

The paw is a separate board-level achievement (see §3.1) for "I
can do this board in the wild." Different concept from stars,
different corner of the tile.

### 7.1 Stored field on `board_status`

`board_status.wild_achievement` with three values:

| Value    | Meaning                                                                                                                            | Paw color   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `null`   | The student has never had a `clean_correct` observation with `wilderness = Wild` on this board.                                     | (no paw)    |
| `Recent` | They have had a wild clean_correct on this board, but at least one other observation on the board occurred within the spacing window beforehand. | yellow paw  |
| `Fresh`  | They have had a wild clean_correct on this board, and **no other observations** on the board occurred within the spacing window beforehand. | green paw   |

`wild_achievement` is **permanent**. `Fresh` supersedes `Recent`
(once Fresh, always Fresh). Wild failures, wild correcteds, and
wild close_corrects do not change `wild_achievement`.

The promotion to Fresh is **not** "wild-to-wild" like the star
track. It is "wild after a cooling-off period." The pedagogical
question Fresh answers is: *the student hadn't been practicing
this board at all for a week, then encountered it out of context
and got it right — they've genuinely retained the convention, not
just recently drilled it.*

### 7.2 Transitions

On each observation insert with `status = clean_correct` and
`wilderness = Wild`:

1. If `wild_achievement = Fresh`: no change. (Terminal.)
2. Else, check whether the board is **cold**: are there any other
   observations for this `(user, board)` whose timestamp is in
   `[obs.timestamp - spacing, obs.timestamp)`? (The current
   observation is excluded from this check; "any other
   observation" means any wilderness, any status.)
   - **Cold** (no other observations in the window): set
     `wild_achievement = Fresh`. Note: this includes the case
     where the wild clean_correct is the very first observation
     ever on this board.
   - **Not cold** (at least one other observation in the window):
     - If `wild_achievement IS NULL`: set `wild_achievement = Recent`.
     - Else (`wild_achievement = Recent`): no change.

All other observations (any non-clean wild plays, all tame plays,
and any observation that doesn't satisfy clean_correct + Wild)
leave the wild achievement unchanged.

A consequence worth flagging: a student who practices a board
heavily and gets many wild successes will stay at Recent until
they take a week-long break and then encounter it wild. The
design rewards spaced retention, not volume.

## 8. Per-observation snapshot fields

To make drilldown displays cheap, each observation row also
carries:

- `observations.status` — the value the board_status was set to
  *as a result of* this observation. (Equals the new
  `board_status.status` after the recompute.)
- `observations.wilderness` — the wilderness this observation was
  recorded with (see §4).

These let the observation-history view render every past play with
the same circle/badge logic as the live board tile, by reading
each observation row directly. The GUI never has to re-derive
state from raw bid/play data.

## 9. The composite display

The board tile shows three things, composited:

1. **Circle color** — from §5.3, using `board_status.status` and
   `last_error_date`.
2. **Star badge** (corner A) — from §6.4, using
   `board_status.max_stars`.
3. **Paw badge** (corner B) — from §7.1, using
   `board_status.wild_achievement`.

The most decorated board possible: green circle + gold star + green
paw — sustained clean lesson-mode mastery *and* demonstrated
recall in the wild. That's the visible end-state of board-level
progress, and the destination this whole model points students
toward.

## 10. Where computations live

| Computation                                | Where    | Notes                                                                                          |
| ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| Per-call correctness flash during play     | Frontend | Instant feedback, no round-trip tolerable.                                                     |
| Optimistic board state for the just-finished play | Frontend | Frontend may compute the *upcoming* board_status (so the colored circle changes immediately when the play ends), but must defer to the backend's value on the next sync. |
| Stored `board_status.status` recompute     | Backend  | Fires on every observation insert. Single source of truth.                                     |
| Display color decay (yellow → orange)      | Backend (API layer) | Applied only when rendering the **live tile**. Drilldown views ignore decay and display the post-decay color (orange) unconditionally for `close_correct` and `corrected` — see §5.4. |
| Stars (`star_count`, `max_stars`)          | Backend  | Updated on each observation insert per §6.2/§6.3.                                              |
| Wild achievement                           | Backend  | Updated on each observation insert per §7.2.                                                   |
| Lesson mastery tier                        | Backend (derived) | Computed on demand from board_status rows for the lesson's boards. Not stored. See §13. |
| Lesson achievements (event milestones)     | Backend           | Fired on observation insert based on transitions defined in this doc; catalog and event table live in `ACHIEVEMENTS.md`. |

The frontend does **not** independently compute stars,
wild_achievement, or `last_error_date`. The whole architectural
fix for the "yellow turned green on sync" bug from issue #2 is
exactly that: state lives in the DB; the frontend renders.

## 11. Wilderness composition rule (the 25% threshold)

Wilderness is computed by the **backend, at observation insert
time**, and frozen on the row. Later edits to the exercise's
board list do not retroactively change recorded observations.

### 11.1 What the frontend provides

The backend doesn't infer "why the user is playing this board"
from the play itself; the frontend must tell it. Three context
fields are added to the observation's clear metadata:

| Field           | Type             | Set when…                                          |
| --------------- | ---------------- | -------------------------------------------------- |
| `exercise_id`   | text, nullable   | The play is inside an exercise.                    |
| `assignment_id` | text, nullable   | The play is inside an assignment. (Assignments wrap exercises.) |
| `jungle`        | boolean, default false | The play came from Jungle mode (issue #11). |

If none of the three are set, the play is regular self-directed
lesson practice. The frontend is responsible for tagging each
observation correctly — there is no other signal in the data that
tells the backend the user's intent.

These three fields are stored on the `observations` row as
clear-text columns. They are persistent context for the
observation, not just inputs to the wilderness calc; downstream
work (teacher views, exercise scoring, jungle analytics) reads
them too.

### 11.2 Backend rule on insert

On each observation insert, the backend assigns wilderness as
follows:

1. If `jungle = true` → `wilderness = Wild`. Done.
2. Else if `exercise_id` is set → look up the exercise's boards
   via `exercise_boards`, apply the 25% rule (below), assign Wild
   or Tame. Done.
3. Else if `assignment_id` is set → resolve the assignment to its
   underlying exercise, then apply the same rule as step 2.
4. Else → `wilderness = Tame`.

The 25% rule:

- Let `N` = number of boards in the exercise.
- Let `M` = number of those boards whose `deal_subfolder` matches
  the board being recorded.
- If `M / N < 0.25`, the observation is `Wild`. Otherwise `Tame`.

Examples:
- 8-board exercise where this board is the only one from "Stayman"
  and the others are mixed: `1/8 = 12.5% < 25%` → Wild.
- 8-board exercise where 3 of the boards are "Stayman" including
  this one: `3/8 = 37.5% ≥ 25%` → Tame.
- 4-board exercise of all "Negative Doubles": `4/4 = 100%` → Tame.
- Jungle mode: always Wild, irrespective of pool composition.

### 11.3 Optimistic frontend wilderness

The frontend may pre-compute wilderness using the same rule so the
colored circle (and any paw indication) renders immediately after
the play. The frontend already knows the exercise's board list
when it served the user this board, so the data is local. Backend
canonicalizes on insert and the next sync overwrites the
optimistic value if they ever disagree.

This is the same architectural pattern as the optimistic
board-state recompute described in §10: frontend may speak first,
backend always speaks last.

### 11.4 Pre-existing observations

Observations recorded before this work shipped have none of the
three context fields populated, and recomputing their wilderness
would require decrypting their original `assignment` payload. The
backfill assigns `wilderness = Tame` to them and leaves the
context fields null. This is safe: no Jungle observations exist
yet (issue #11 isn't built), and no Fresh paws have ever been
awarded, so no historical achievement state is at risk.

## 12. What's stored vs. encrypted

The `observations` table stores the following fields **in the
clear**, because the backend needs them to compute state and
mastery:

```
id, user_id, timestamp, skill_path, classroom,
deal_subfolder, deal_number,
board_result,       -- correct | corrected | failed (the lesson's verdict)
status,             -- the board_status.status as of this play
wilderness,         -- Tame or Wild
exercise_id,        -- nullable, set when inside an exercise   (see §11.1)
assignment_id,      -- nullable, set when inside an assignment
jungle,             -- bool, true for Jungle-mode plays
created_at
```

The encrypted blob (`encrypted_data` + `iv`) holds the rest: hand
contents, the auction, the student's actual bid choices, the
expected bids, prompt details, time-taken, etc.

Mastery and state computation **never decrypt anything** — every
field they need is in the clear. The server keeps state
consistent without holding decryption material.

A separate review of whether the encrypted blob still earns its
keep is planned for the future. None of the rules in this doc
depend on that review.

## 13. Lesson mastery

Each lesson has one **mastery tier**, shown on the lesson tile.
The tier is a derived value computed from the board achievements
across every board in the lesson. Five possible values:

| Tier         | Criterion                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| *(none)*     | No observations exist for any board in this lesson.                                                                  |
| Exploring    | At least one observation exists for at least one board in the lesson.                                                |
| Learning     | ≥ **50%** of the lesson's boards have `max_stars ≥ 1` (silver-or-better).                                            |
| Retaining    | ≥ **80%** of the lesson's boards have `max_stars ≥ 2` (gold star).                                                   |
| Mastering    | ≥ **80%** of the lesson's boards have `max_stars ≥ 2` **OR** `wild_achievement = 'Fresh'`, **AND** ≥ **25%** of the lesson's boards have `wild_achievement = 'Fresh'`. |

### 13.1 What "the lesson's boards" means

The denominator in every percentage is the count of boards
*declared in the lesson*, not the count the student has attempted.
A 25-board lesson where the student has 20 gold-starred boards
but has never played the other 5 is at 20 / 25 = 80% gold → just
barely Retaining. They cannot reach a higher tier by perfecting
the boards they've practiced; they have to broaden coverage.

This is by design. Mastery is a claim about a *body of material*,
not about a curated subset.

### 13.2 Why the thresholds are what they are

- **Learning (50% silver)** — celebrates real spaced retention
  emerging across half the lesson. Not nothing, but not yet
  comprehensive.
- **Retaining (80% gold)** — broad sustained mastery. This is the
  standard "you've got it" tier. Eighty percent rather than 100%
  acknowledges that some boards in a lesson are fussy and the
  student may legitimately struggle with a couple while still
  owning the convention.
- **Mastering (80% gold-or-Fresh, plus 25% Fresh)** — the
  two-pronged threshold is the design rule that closes the
  "knows it in class, forgets it in real games" gap. A student
  cannot reach Mastering by single-context drilling alone. They
  have to demonstrate recall out of context on at least a quarter
  of the lesson's boards. Fresh paw on a board can substitute for
  gold star there because Fresh is the harder achievement (it
  requires success in Wild mode, which depends on having
  encountered the board out of context at all).

### 13.3 Storage and computation

Lesson mastery is **not stored**. It is computed on demand from
`board_status` rows for the lesson's boards. The query is cheap
(one read per board, simple aggregation). If a future hot path
makes this expensive, cache; do not prematurely persist.

### 13.4 Relationship to lesson achievements

Lesson **mastery** is a single tier per lesson (this section).
Lesson **achievements** are plural binary milestones at lesson
scope ("first Fresh paw in this lesson", "every board in the
lesson has at least one observation", etc.) — see §3.1 and
`ACHIEVEMENTS.md`. They coexist. A lesson tile may show its
mastery tier *and* a count of lesson achievements earned.

## 14. Query patterns

A guiding rule for everything that follows: **the GUI never asks
for observations spanning more than one student at a time.**
Observation rows are the most expensive thing in the DB; teacher
views aggregating across a classroom of 30 students must not be
built on top of raw observation queries.

### 14.1 Three tiers of read access

| Tier                        | Reads from                       | Use case                                                                                              |
| --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Roster / teacher dashboard  | `student_summary` (see §14.2)    | "Show me my classroom — for each student, where do they stand?"                                       |
| Single-student drilldown    | `board_status` (filtered to one user) | "Show me Alice's lesson tiles, with each board's circle/star/paw."                                |
| Single-board drilldown      | `observations` (filtered to one user, one board) | "Show me the history of plays for board #5 in Stayman for Alice."                       |

The cost of each tier is roughly:

- Tier 1: one row per student.
- Tier 2: one row per (board) for one student, ~hundreds at most.
- Tier 3: rows for one (user, board), ~tens at most.

There is no fourth tier that pulls observations across multiple
students.

### 14.2 The `student_summary` table

A denormalised per-student rollup, updated whenever an observation
lands. Columns (sketch — refine in the migration PR):

```
student_summary
---------------
user_id                  PRIMARY KEY
last_observation_at      DATETIME
total_observations       INT
distinct_lessons         INT
distinct_boards_seen     INT

-- Board-state distribution (each = count of boards in that state)
boards_not_attempted     INT
boards_failed            INT
boards_corrected         INT
boards_close_correct     INT
boards_clean_correct     INT

-- Star achievement distribution (using max_stars; see §6.4)
boards_silver            INT   -- max_stars = 1
boards_gold              INT   -- max_stars >= 2
on_star_track            INT   -- max_stars > 0 OR last_star_update IS NOT NULL

-- Paw achievement distribution
boards_recent_paw        INT
boards_fresh_paw         INT

-- Lesson mastery distribution (derived counts)
lessons_exploring        INT
lessons_learning         INT
lessons_retaining        INT
lessons_mastering        INT
```

Two things to note:

- This is a **cache**, not a source of truth. If it drifts, it can
  be rebuilt from `board_status` and `observations` at any time.
  A nightly self-heal job is reasonable.
- The teacher's classroom roster query joins this table to
  `classroom_members` and returns one row per student. No
  observation rows are touched.

### 14.3 What teachers see today vs. after this work

Today, the teacher dashboard pulls observations across all
students. That is the cause of the existing perf complaints with
~10k observations and small N students. After this work, the
teacher dashboard reads `student_summary` for the roster, lets
the teacher click into a student for a Tier-2 view, and only
fetches observations on Tier-3 drilldowns.

## 15. Open questions

These are deliberately unresolved and will be settled before the
implementation PR (or as design follow-ups).

- **Exact set of `student_summary` columns.** The sketch in §14.2
  covers what we know is needed; the migration PR may shorten or
  extend it. Anything added must be re-derivable from
  `board_status` + `observations` so the table stays a pure cache.
- **Update strategy for `student_summary`.** Two reasonable
  options: (a) recompute affected counts in the same transaction
  as the observation insert; (b) mark the row dirty and recompute
  asynchronously. (a) is simpler and almost certainly fast enough
  at our scale; (b) is the fallback if it isn't.

## 16. Migration / name changes

For implementers migrating existing code:

| Old                                       | New                                                            |
| ----------------------------------------- | -------------------------------------------------------------- |
| `board_status.achievement` (column)       | Split into `board_status.max_stars` + `board_status.wild_achievement` |
| Status values `fresh_correct`, `recently_corrected` (proposed earlier) | Dropped. `close_correct` and `corrected` use decay-on-read instead. |
| Frontend `useBoardMastery.calculateCurrentStatus` | Removed. Frontend optimistically renders board_status from a backend-shaped object after each play, but does not run mastery math. |
| Frontend `useBoardMastery.calculateAchievement`   | Removed.                                                       |
| `session_id` use in state/mastery         | Removed. Not used by either the circle, the stars, or the paw. |
| Implicit per-bid-prompt observations      | Now per-play. One observation per board attempt, including back-button corrections within it. |
| Teacher dashboard queries over all students' observations | Removed. Teacher dashboard reads `student_summary` (§14.2); per-student / per-board drilldowns hit `board_status` and `observations` respectively. |

New columns to add to `board_status`:

- `wilderness` TEXT (`Tame` | `Wild`)
- `last_error_date` DATETIME nullable
- `star_count` INTEGER default 0
- `max_stars` INTEGER default 0
- `last_star_update` DATETIME nullable
- `wild_achievement` TEXT nullable (`Recent` | `Fresh`)

New columns to add to `observations`:

- `status` TEXT — the post-recompute `board_status.status`
- `wilderness` TEXT (`Tame` | `Wild`)
- `exercise_id` TEXT nullable — set when the play is inside an exercise (see §11.1).
- `assignment_id` TEXT nullable — set when the play is inside an assignment.
- `jungle` BOOLEAN default false — true when the play came from Jungle mode.

The clear `assignment_id` replaces the encrypted `assignment.id`
sub-field that lived in the observation blob. The blob may keep
the human-readable name/teacher-name fields if useful for replay,
but the ID is now in the clear so the backend can use it.

New table: `student_summary` — see §14.2.

## 17. Out of scope for this doc

- The **lesson achievement catalog** and the **player achievement
  catalog** — defined in `ACHIEVEMENTS.md`. This doc defines the
  data those catalogs read from (board_status fields, observation
  fields). Issue #3 owns the catalog content and the UI panel that
  surfaces all categories together.
- The **achievement event notification system** (issue #3) — the
  "you just earned X!" toasts, the achievements panel UI, points,
  display rules. This doc says when a board-level achievement
  *changes value* (e.g. `max_stars` increments, `wild_achievement`
  promotes to Fresh); #3 says how that gets surfaced to the user.
- The **Jungle UI flow** (issue #11) — board selection algorithm,
  scoring screens, surprise reveals. Jungle's data contract is
  just `wilderness = Wild` on its observations; everything else is
  its own design.
- **Engagement / positivity surface area** (issue #4) — how and
  where the circle, stars, paws, and lesson mastery tier are shown.
  This doc says what they *mean*; #4 says what we do with them in
  the UI.
