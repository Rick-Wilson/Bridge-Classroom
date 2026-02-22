/**
 * Client-side diagnostic logging.
 * Buffers events and sends them to the server in batches.
 * Falls back silently if the server is unreachable (the whole point
 * is to log errors — we don't want logging itself to cause errors).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const FLUSH_INTERVAL_MS = 5000
const MAX_BUFFER_SIZE = 20

let buffer = []
let flushTimer = null

/**
 * Log a diagnostic event.
 * @param {string} event - Short event name, e.g. 'registration_email_check_failed'
 * @param {string} context - Human-readable context, e.g. 'checkEmailOnServer'
 * @param {Error|string|null} error - The error object or message
 */
export function logDiagnostic(event, context, error = null) {
  const entry = {
    event,
    context,
    error: error instanceof Error ? `${error.name}: ${error.message}` : error ? String(error) : null,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString()
  }

  // Always log to console for local debugging
  console.warn(`[diagnostic] ${event}:`, context, error || '')

  buffer.push(entry)

  // Flush immediately if buffer is full
  if (buffer.length >= MAX_BUFFER_SIZE) {
    flush()
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS)
  }
}

/**
 * Flush buffered events to the server.
 * Called automatically on timer or when buffer is full.
 * Also exported so callers can force a flush (e.g. before navigation).
 */
export async function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  if (buffer.length === 0) return

  const events = buffer.splice(0)

  try {
    await fetch(`${API_URL}/diagnostics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    })
  } catch {
    // If we can't reach the server, put events back so they aren't lost.
    // But cap the buffer so it doesn't grow forever.
    buffer.unshift(...events)
    if (buffer.length > MAX_BUFFER_SIZE * 2) {
      buffer = buffer.slice(-MAX_BUFFER_SIZE)
    }
  }
}
