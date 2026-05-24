/**
 * Shared time-duration formatter used by the assignment grid (per-user
 * Time column), the assignment list stat chips, and the observation
 * detail panel (Total Time field). Keeping it in one place so the row
 * and the detail can't show different numbers for the same underlying
 * value (issue #7).
 *
 * Inputs are in milliseconds. The formatter rounds to the nearest
 * second, then picks the unit by magnitude:
 *
 *   < 1 second   → "Nms" (rare; only useful for very fast prompts)
 *   < 1 minute   → "Ns"
 *   < 1 hour     → "mm:ss"
 *   ≥ 1 hour     → "hh:mm:ss"
 *
 * Returns the supplied empty string for null / zero / negative ms so
 * callers can decide whether to render "—" or hide the field.
 */
export function formatDurationMs(ms, { empty = '—' } = {}) {
  if (ms == null) return empty
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return empty
  if (n < 1000) return `${Math.round(n)}ms`

  const totalSec = Math.round(n / 1000)
  if (totalSec < 60) return `${totalSec}s`

  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  if (hours > 0) {
    return `${hours}:${pad2(mins)}:${pad2(secs)}`
  }
  return `${mins}:${pad2(secs)}`
}

function pad2(n) {
  return n < 10 ? `0${n}` : String(n)
}
