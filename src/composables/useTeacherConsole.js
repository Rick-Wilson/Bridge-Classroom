// useTeacherConsole — the teacher's side of a table session, layered over
// the same socket as useRemoteTable. The server recognizes the session
// owner (or any teacher-role ticket) at hello time and sends `lobby` frames
// (full session state: every table's board/phase/tricks/seats/ready plus
// the kibitzer roster) on join and on every change. This composable folds
// those frames and exposes the teacher control messages; per-table game
// state for the kibitzed table still flows through useRemoteTable (the
// teacher connection receives that table's snapshot + events after a
// {t:"kibitz"} request).
//
// Singleton pattern (module-level state) per project convention.

import { ref } from 'vue'
import { useTableSocket } from './useTableSocket.js'

const socket = useTableSocket()

// The latest lobby frame, parsed:
// { session_id, boards: {total, open},
//   tables: [{ table_id, board_no, board_index, phase, tricks: {ns, ew},
//              next_to_act, seats, ready: [] }],
//   kibitzers: [{ sub, name, table_id }] }
const lobby = ref(null)
// The table the console is currently kibitzing (table_id or null).
const kibitzTableId = ref(null)

let unsubscribe = null

function handleMessage(msg) {
  if (msg.t === 'lobby') {
    lobby.value = msg
  } else if (msg.t === 'event' && msg.kind === 'session_closed') {
    lobby.value = null
    kibitzTableId.value = null
  }
}

// Start folding lobby frames (idempotent). Call before/with the socket
// connect; useRemoteTable.join() owns the actual connection.
function attach() {
  if (!unsubscribe) unsubscribe = socket.onMessage(handleMessage)
}

function detach() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
  lobby.value = null
  kibitzTableId.value = null
}

// ── Teacher control messages ───────────────────────────────────────────
// All fire-and-forget: state changes come back as lobby frames / events;
// rejections come back as {t:"error"} frames (surfaced by useRemoteTable).

// Widen the open-board window to `count` (absolute; never narrows).
function openBoards(count) {
  return socket.send({ t: 'open_boards', count })
}

// Advance one table to its next board, skipping the ready/open checks.
function forceAdvance(tableId) {
  return socket.send({ t: 'force_advance', table: tableId })
}

// Seat a known participant (seated elsewhere or kibitzing) at table/seat.
function assignSeat(tableId, seat, sub) {
  return socket.send({ t: 'assign_seat', table: tableId, seat, sub })
}

// Vacate a seat (the seat becomes a bot; a live human keeps kibitzing).
function boot(tableId, seat) {
  return socket.send({ t: 'boot', table: tableId, seat })
}

// Watch one table: the server replies with a see-all snapshot and streams
// that table's events until we kibitz another.
function kibitz(tableId) {
  const ok = socket.send({ t: 'kibitz', table: tableId })
  if (ok) kibitzTableId.value = tableId
  return ok
}

function stopKibitz() {
  // Client-side only: the server keeps streaming the last kibitzed table's
  // events, but useRemoteTable drops frames for tables it isn't viewing.
  kibitzTableId.value = null
}

export function useTeacherConsole() {
  return {
    lobby,
    kibitzTableId,
    attach,
    detach,
    openBoards,
    forceAdvance,
    assignSeat,
    boot,
    kibitz,
    stopKibitz,
    // exposed for unit tests
    _handleMessage: handleMessage,
  }
}
