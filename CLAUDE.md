# Claude Code Notes

## Git Configuration

- Use SSH for all git operations (not HTTPS)
- Remote: git@github.com:Rick-Wilson/Bridge-Classroom.git

## Project Context

This is a bridge teaching platform that tracks student progress. See `docs/CLAUDE_CODE_QUICKSTART.md` for full context.

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

- **Frontend**: GitHub Pages at https://bridge-classroom.com
- **Backend API**: Rust server running locally on Mac at port 3000
- **Tunnel**: Cloudflare Tunnel routes https://api.bridge-classroom.com → localhost:3000
- **Database**: SQLite at `bridge-classroom-api/data/bridge_classroom.db`
- **API logs**: `~/Library/Logs/bridge-classroom-api.log`
- **Tunnel logs**: `~/Library/Logs/cloudflared-tunnel.log`
- **Service management**: `launchctl list | grep -E "bridge|cloudflare"`
- See `docs/cloudflare-setup.md` for full details

## Key Implementation Details

- Classrooms are dynamic via URL parameters, not hardcoded
- Users can belong to multiple classrooms
- Assignments/homework are tracked with completion progress
- URL params silently merge with existing config on revisit
- Hand visibility driven by `[show ...]` tags from PBN, not inferred
