import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Singleton state
const announcement = ref(null)
const loading = ref(false)
const dismissed = ref(null) // stores the dismissed announcement ID (session-only)

async function loadAnnouncement() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/announcements/active`)
    if (!res.ok) return
    const data = await res.json()
    const prev = announcement.value
    announcement.value = data.announcement || null

    // Reset dismissed state if the announcement changed
    if (announcement.value && (!prev || prev.id !== announcement.value.id)) {
      dismissed.value = null
    }
  } catch {
    // Best-effort — don't block the app
  } finally {
    loading.value = false
  }
}

async function setAnnouncement(message, type = 'info', expiresAt = null) {
  const body = { message, type }
  if (expiresAt) body.expires_at = expiresAt

  const res = await fetch(`${API_URL}/admin/announcement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`Failed to set announcement: ${res.status}`)
  const data = await res.json()
  announcement.value = data.announcement || null
  dismissed.value = null
  return data
}

async function clearAnnouncement() {
  const res = await fetch(`${API_URL}/admin/announcement`, {
    method: 'DELETE',
    headers: { 'x-api-key': API_KEY }
  })
  if (!res.ok) throw new Error(`Failed to clear announcement: ${res.status}`)
  announcement.value = null
  dismissed.value = null
}

function dismiss() {
  if (announcement.value) {
    dismissed.value = announcement.value.id
  }
}

export function useAnnouncement() {
  return {
    announcement,
    loading,
    dismissed,
    loadAnnouncement,
    setAnnouncement,
    clearAnnouncement,
    dismiss
  }
}
