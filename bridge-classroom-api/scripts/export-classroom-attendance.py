#!/usr/bin/env python3
"""Nightly bridge-classroom → Bridge-Attendance export.

Produces the dated JSON file consumed by the Bridge-Attendance dashboard, per
docs/bridge-classroom-export-spec.md in the Bridge-Attendance repo.

Lifecycle (mirrors the groups.io refresh pattern):
  * The exporter writes a DATED file each run, atomically.
  * The dashboard ingests it, renames it to the stable name, and deletes
    leftovers. A dated file still present at the start of our NEXT run means
    the dashboard never ingested the last one -> Pushover alert.
  * We never delete dated files ourselves (that would erase the failure signal).

The target folder ~/Library/Application Support/Bridge/ is launchd-writable
(no TCC prompt), so unlike the groups.io script we write there directly with
no Finder/AppleScript copy.
"""

from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# --- Paths -------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
DB_PATH = SCRIPT_DIR.parent / "data" / "bridge_classroom.db"
SESSION_MAP_PATH = SCRIPT_DIR / "classroom-sessions.json"

EXPORT_DIR = Path.home() / "Library" / "Application Support" / "Bridge"
DATED_GLOB = "bridge-classroom-export-*.json"
DATED_PREFIX = "bridge-classroom-export-"
DATED_SUFFIX = ".json"

# The dashboard (ingester) may only run weekly, so a dated file lingering for a
# few days is normal — not a failed ingest. Only alert once the OLDEST
# un-ingested export is this many days old, meaning nothing has been picked up
# in over a week.
STALE_INGEST_DAYS = 9

NOTIFY_BIN = Path("/Users/rick/bin/notify")

VALID_SESSIONS = {"Morning", "Afternoon", None}


# --- Pushover ----------------------------------------------------------------

def pushover_notify(title: str, message: str) -> None:
    """Send a Pushover notification via Rick's `notify` CLI. `notify` loads the
    Pushover keys from ~/.config/pushover/env itself, so this works under
    launchd (where the shell profile isn't sourced) with no key handling here."""
    if not NOTIFY_BIN.exists():
        print(f"  ! {NOTIFY_BIN} not found; skipping notification", file=sys.stderr)
        return
    env = os.environ.copy()
    env["NOTIFY_TITLE"] = title
    try:
        result = subprocess.run(
            [str(NOTIFY_BIN), message],
            env=env, capture_output=True, text=True, timeout=15,
        )
    except Exception as e:
        print(f"  ! notify failed: {e}", file=sys.stderr)
        return
    if result.returncode == 0:
        print(f"  ✓ pushover sent: {title}")
    else:
        print(f"  ! notify failed (rc={result.returncode}): {result.stderr.strip()}", file=sys.stderr)


# --- Session mapping ---------------------------------------------------------

def load_session_map() -> dict:
    """Return {classroom_id: {"session": str|None, "active": bool, "name": str}}."""
    try:
        raw = json.loads(SESSION_MAP_PATH.read_text())
    except FileNotFoundError:
        print(f"Warning: {SESSION_MAP_PATH} not found; all classrooms -> session=null", file=sys.stderr)
        return {}
    except json.JSONDecodeError as e:
        print(f"Error: {SESSION_MAP_PATH} is not valid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    return raw.get("classrooms", {})


# --- Database ----------------------------------------------------------------

def open_db_readonly() -> sqlite3.Connection:
    if not DB_PATH.exists():
        print(f"Error: database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)
    uri = f"file:{DB_PATH}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=15)
    conn.row_factory = sqlite3.Row
    return conn


def build_payload(conn: sqlite3.Connection, session_map: dict, generated_at: str):
    """Return (payload dict, list of unclassified classroom names)."""
    classroom_rows = conn.execute(
        "SELECT id, name FROM classrooms ORDER BY created_at"
    ).fetchall()

    # student_id -> [classroom_id, ...]   (the many-to-many enrollment)
    member_rows = conn.execute(
        "SELECT classroom_id, student_id FROM classroom_members"
    ).fetchall()
    enrollments: dict[str, list[str]] = {}
    counts: dict[str, int] = {}
    for r in member_rows:
        enrollments.setdefault(r["student_id"], []).append(r["classroom_id"])
        counts[r["classroom_id"]] = counts.get(r["classroom_id"], 0) + 1

    classrooms = []
    unclassified: list[str] = []
    for c in classroom_rows:
        cfg = session_map.get(c["id"])
        if cfg is None:
            unclassified.append(c["name"])
            session, active = None, True
        else:
            session = cfg.get("session")
            active = bool(cfg.get("active", True))
            if session not in VALID_SESSIONS:
                print(
                    f"  ! classroom {c['name']!r} has invalid session "
                    f"{session!r}; coercing to null",
                    file=sys.stderr,
                )
                session = None
        classrooms.append({
            "id": c["id"],
            "name": c["name"],
            "session": session,
            "active": active,
            "user_count": counts.get(c["id"], 0),
        })

    user_rows = conn.execute(
        "SELECT id, first_name, last_name, email FROM users ORDER BY created_at"
    ).fetchall()
    users = []
    for u in user_rows:
        name = f"{u['first_name']} {u['last_name']}".strip()
        users.append({
            "id": u["id"],
            "name": name,
            "email": u["email"] or "",
            "classroom_ids": enrollments.get(u["id"], []),
        })

    payload = {
        "generated_at": generated_at,
        "source": "bridge-classroom",
        "classrooms": classrooms,
        "users": users,
    }
    return payload, unclassified


# --- Atomic write ------------------------------------------------------------

def write_atomic(payload: dict, dest: Path) -> None:
    """Write to a temp file in the same dir, fsync, then rename(2) over dest."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(
        dir=str(dest.parent), prefix=f".{dest.name}.", suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_name, dest)  # atomic within the same filesystem
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


# --- Main --------------------------------------------------------------------

def leftover_date(path: Path):
    """Parse the UTC date embedded in a dated export filename, or None if the
    name doesn't match the expected bridge-classroom-export-YYYY-MM-DD.json form."""
    name = path.name
    if not (name.startswith(DATED_PREFIX) and name.endswith(DATED_SUFFIX)):
        return None
    stamp = name[len(DATED_PREFIX):-len(DATED_SUFFIX)]
    try:
        return datetime.strptime(stamp, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def main() -> None:
    now = datetime.now(timezone.utc)
    generated_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    today = now.strftime("%Y-%m-%d")  # UTC date, per spec

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Detect a stalled ingester. The dashboard deletes dated files when it
    #    ingests, so any leftovers mean nothing has been picked up since the
    #    oldest one was written. The ingester may only run weekly, so a few
    #    days of buildup is normal — only alert once the OLDEST un-ingested
    #    file is older than STALE_INGEST_DAYS (i.e. nothing ingested in >1 week).
    dated = [(d, p) for p in EXPORT_DIR.glob(DATED_GLOB)
             if (d := leftover_date(p)) is not None]
    if dated:
        dated.sort()
        oldest_date = dated[0][0]
        age_days = (now - oldest_date).days
        names = ", ".join(p.name for _, p in dated)
        if age_days >= STALE_INGEST_DAYS:
            msg = (
                f"{len(dated)} un-ingested export(s) in the Bridge folder; the "
                f"oldest is {age_days} days old (≥{STALE_INGEST_DAYS}d) — the "
                f"dashboard hasn't picked anything up in over a week:\n{names}"
            )
            print(f"  ! {msg}", file=sys.stderr)
            pushover_notify("bridge-classroom export alert", msg)
        else:
            print(
                f"  · {len(dated)} un-ingested export(s) present, oldest {age_days}d "
                f"old (< {STALE_INGEST_DAYS}d threshold) — not alerting",
                file=sys.stderr,
            )

    # 2. Build the payload from the live database.
    session_map = load_session_map()
    conn = open_db_readonly()
    try:
        payload, unclassified = build_payload(conn, session_map, generated_at)
    finally:
        conn.close()

    # 3. Write the new dated file atomically. We do NOT delete old dated files.
    dest = EXPORT_DIR / f"bridge-classroom-export-{today}.json"
    write_atomic(payload, dest)
    print(
        f"✓ {dest.name}: {len(payload['classrooms'])} classrooms, "
        f"{len(payload['users'])} users"
    )

    # 4. Nudge if any classroom is missing from the session map (so the
    #    dashboard can't move-detect it until it's classified).
    if unclassified:
        names = ", ".join(unclassified)
        msg = (
            f"{len(unclassified)} classroom(s) not in classroom-sessions.json — "
            f"exported with session=null:\n{names}\n"
            f"Edit {SESSION_MAP_PATH} to classify them."
        )
        print(f"  ! {msg}", file=sys.stderr)
        pushover_notify("bridge-classroom: unclassified classroom", msg)


if __name__ == "__main__":
    main()
