# Claude Code Notes

## Git Configuration

- Use SSH for all git operations (not HTTPS)
- Remote: git@github.com:Rick-Wilson/Bridge-Classroom.git

## Project Context

This is a bridge teaching platform that tracks student progress. See `docs/CLAUDE_CODE_QUICKSTART.md` for full context.

## Key Implementation Details

- Classrooms are dynamic via URL parameters, not hardcoded
- Users can belong to multiple classrooms
- Assignments/homework are tracked with completion progress
- URL params silently merge with existing config on revisit
