-- Bridge Classroom - New Tables for Exercises, Classrooms, and Assignments
-- Designed to extend existing schema (users, observations, sharing_grants, etc.)
-- 
-- Key design decisions:
--   - Observations table is unchanged; assignment completion is inferred by
--     joining exercise_boards with observations WHERE timestamp >= assigned_at
--   - Classrooms are deliberately simple (no lifecycle/status); teachers create
--     a new classroom when restarting a course
--   - Joining a classroom auto-grants viewing permission (handled in app logic,
--     creates a sharing_grants row); leaving does NOT revoke it
--   - Exercises can be system/curriculum (created_by NULL, visibility 'public')
--     or teacher-created (visibility 'private' or 'public')
--   - Assignments target a classroom OR an individual student, not both

-- ============================================================================
-- EXERCISES
-- ============================================================================

-- An exercise is a named, ordered collection of boards.
-- Curriculum exercises (created_by NULL) are shared reference content.
-- Teacher-created exercises are private by default.
CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                          -- "Jacoby Transfers Practice 1"
    description TEXT,
    created_by TEXT REFERENCES users(id),         -- NULL for system/curriculum
    curriculum_path TEXT,                         -- e.g. "beginner/month3/week2"
    visibility TEXT NOT NULL DEFAULT 'public',    -- 'public' | 'private'
    created_at TEXT NOT NULL
);

CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_exercises_curriculum ON exercises(curriculum_path);
CREATE INDEX idx_exercises_visibility ON exercises(visibility);

-- Junction table: which boards are in an exercise, and in what order.
-- References the same deal_subfolder/deal_number used in observations.
CREATE TABLE exercise_boards (
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    deal_subfolder TEXT NOT NULL,
    deal_number INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (exercise_id, deal_subfolder, deal_number)
);

CREATE INDEX idx_exercise_boards_deal ON exercise_boards(deal_subfolder, deal_number);

-- ============================================================================
-- CLASSROOMS
-- ============================================================================

-- A classroom is a named group of students associated with a teacher.
-- No active/completed status. Teacher creates a new classroom for each
-- offering (e.g. "Beginning Bridge Spring 2026").
CREATE TABLE classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                          -- "Beginning Bridge Spring 2026"
    teacher_id TEXT NOT NULL REFERENCES users(id),
    join_code TEXT NOT NULL UNIQUE,              -- short code students use to join
    created_at TEXT NOT NULL
);

CREATE INDEX idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX idx_classrooms_join_code ON classrooms(join_code);

-- Classroom membership. Joining auto-creates a sharing_grant (app logic).
-- Removing a member does NOT revoke the sharing_grant.
CREATE TABLE classroom_members (
    classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id),
    joined_at TEXT NOT NULL,
    PRIMARY KEY (classroom_id, student_id)
);

CREATE INDEX idx_classroom_members_student ON classroom_members(student_id);

-- ============================================================================
-- ASSIGNMENTS
-- ============================================================================

-- A teacher assigns an exercise to a classroom or an individual student.
-- Set classroom_id for group assignments, student_id for individual.
-- Do not set both.
CREATE TABLE assignments (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    classroom_id TEXT REFERENCES classrooms(id),  -- NULL if individual assignment
    student_id TEXT REFERENCES users(id),          -- NULL if classroom assignment
    assigned_by TEXT NOT NULL REFERENCES users(id),
    assigned_at TEXT NOT NULL,
    due_at TEXT,                                    -- optional due date
    sort_order INTEGER,                            -- position in a sequence
    CHECK (
        (classroom_id IS NOT NULL AND student_id IS NULL) OR
        (classroom_id IS NULL AND student_id IS NOT NULL)
    )
);

CREATE INDEX idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_exercise ON assignments(exercise_id);
CREATE INDEX idx_assignments_assigned_by ON assignments(assigned_by);

-- ============================================================================
-- SUPPORTING INDEX ON EXISTING TABLE
-- ============================================================================

-- Compound index on observations to optimize the key join:
-- exercise_boards × observations by deal identity and user
CREATE INDEX IF NOT EXISTS idx_observations_deal_user 
    ON observations(deal_subfolder, deal_number, user_id);

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- 1. Student's assignment list with progress summary
--
-- SELECT 
--     a.id AS assignment_id,
--     e.name AS exercise_name,
--     a.assigned_at,
--     a.due_at,
--     COUNT(DISTINCT eb.deal_subfolder || '/' || eb.deal_number) AS total_boards,
--     COUNT(DISTINCT CASE WHEN o.id IS NOT NULL 
--           THEN eb.deal_subfolder || '/' || eb.deal_number END) AS attempted_boards,
--     COUNT(DISTINCT CASE WHEN o.correct = 1 
--           THEN eb.deal_subfolder || '/' || eb.deal_number END) AS correct_boards
-- FROM assignments a
-- JOIN exercises e ON e.id = a.exercise_id
-- JOIN exercise_boards eb ON eb.exercise_id = a.exercise_id
-- LEFT JOIN observations o 
--     ON o.user_id = ?
--     AND o.deal_subfolder = eb.deal_subfolder
--     AND o.deal_number = eb.deal_number
--     AND o.timestamp >= a.assigned_at
-- WHERE a.student_id = ?
--    OR a.classroom_id IN (
--        SELECT classroom_id FROM classroom_members WHERE student_id = ?
--    )
-- GROUP BY a.id
-- ORDER BY a.assigned_at DESC;

-- 2. Teacher's class performance on an assignment (most recent attempt per board)
--
-- SELECT 
--     u.first_name, u.last_name,
--     eb.deal_subfolder, eb.deal_number, eb.sort_order,
--     o.correct, o.timestamp
-- FROM assignments a
-- JOIN exercise_boards eb ON eb.exercise_id = a.exercise_id
-- JOIN classroom_members cm ON cm.classroom_id = a.classroom_id
-- JOIN users u ON u.id = cm.student_id
-- LEFT JOIN observations o 
--     ON o.user_id = cm.student_id
--     AND o.deal_subfolder = eb.deal_subfolder
--     AND o.deal_number = eb.deal_number
--     AND o.timestamp >= a.assigned_at
--     AND o.timestamp = (
--         SELECT MAX(o2.timestamp) 
--         FROM observations o2 
--         WHERE o2.user_id = o.user_id 
--         AND o2.deal_subfolder = o.deal_subfolder 
--         AND o2.deal_number = o.deal_number
--         AND o2.timestamp >= a.assigned_at
--     )
-- WHERE a.id = ?
-- ORDER BY u.last_name, eb.sort_order;
