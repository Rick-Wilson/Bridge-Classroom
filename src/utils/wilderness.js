/**
 * Wilderness derivation for an in-progress exercise.
 *
 * Mirrors `derive_wilderness()` in
 * `bridge-classroom-api/src/routes/board_status.rs` so the Exercise
 * Editor can show teachers which boards will be Wild *before* the
 * exercise is saved and any observations are recorded.
 *
 * Per CORRECTNESS_AND_MASTERY.md §11.2 (25% rule):
 *   Let N = total boards in the exercise.
 *   Let M = boards in the exercise sharing this board's deal_subfolder.
 *   If M / N < 0.25 → 'Wild', else 'Tame'.
 *
 * The backend is still authoritative — wilderness is frozen on each
 * observation at insert time, not derived from this helper. This is a
 * display-only convenience.
 *
 * @param {Array<{deal_subfolder: string}>} boards
 * @returns {Array<'Wild'|'Tame'>} same length as `boards`, in the same order
 */
export function deriveWildernessForBoardList(boards) {
  if (!boards || boards.length === 0) return []
  const total = boards.length

  const counts = {}
  for (const b of boards) {
    const sf = b.deal_subfolder || ''
    counts[sf] = (counts[sf] || 0) + 1
  }

  return boards.map(b => {
    const sf = b.deal_subfolder || ''
    const same = counts[sf] || 0
    return same / total < 0.25 ? 'Wild' : 'Tame'
  })
}
