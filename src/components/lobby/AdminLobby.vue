<template>
  <div class="admin-lobby">
    <div class="admin-header">
      <button class="back-btn" @click="$emit('back')">← Back to Dashboard</button>
      <h2 class="admin-title">Admin Dashboard</h2>
      <p v-if="admin.stats.value" class="admin-subtitle">
        {{ admin.stats.value.total_observations.toLocaleString() }} total observations across {{ admin.stats.value.total_users }} users
      </p>
    </div>

    <!-- Loading -->
    <div v-if="admin.loading.value && !admin.stats.value" class="loading-state">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>

    <!-- Error -->
    <div v-else-if="admin.error.value" class="error-state">
      <p>{{ admin.error.value }}</p>
      <button class="retry-btn" @click="loadData">Retry</button>
    </div>

    <template v-else-if="admin.stats.value">
      <!-- Announcement Management -->
      <div class="announcement-section">
        <h3 class="section-title">Site Announcement</h3>
        <div v-if="ann.announcement.value" class="current-announcement" :class="ann.announcement.value.type">
          <div class="announcement-info">
            <span class="announcement-type-badge" :class="ann.announcement.value.type">{{ ann.announcement.value.type }}</span>
            <span class="announcement-message">{{ ann.announcement.value.message }}</span>
            <span v-if="ann.announcement.value.expires_at" class="announcement-expires">
              Expires: {{ formatExpiry(ann.announcement.value.expires_at) }}
            </span>
            <span v-else class="announcement-expires">No expiration</span>
          </div>
          <button class="clear-btn" @click="handleClear" :disabled="clearing">
            {{ clearing ? 'Clearing...' : 'Clear' }}
          </button>
        </div>
        <div v-else class="announcement-form">
          <input
            v-model="newMessage"
            type="text"
            class="announcement-input"
            placeholder="Enter announcement message..."
            @keydown.enter="handlePublish"
          />
          <div class="form-row">
            <select v-model="newType" class="type-select">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              v-model="newExpiry"
              type="datetime-local"
              class="expiry-input"
              title="Optional expiration date"
            />
            <button class="publish-btn" @click="handlePublish" :disabled="!newMessage.trim() || publishing">
              {{ publishing ? 'Publishing...' : 'Publish' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stats row -->
      <AdminStatsRow :stats="admin.stats.value" />

      <!-- Two-column: Popular Lessons + Database -->
      <div class="content-grid">
        <PopularLessons :lessons="admin.popularLessons.value" />
        <DatabasePanel :database="admin.database.value" />
      </div>

      <!-- System Health -->
      <SystemHealth
        :health="admin.health.value"
        :refreshing="refreshing"
        @refresh="handleRefresh"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAdminDashboard } from '../../composables/useAdminDashboard.js'
import { useAnnouncement } from '../../composables/useAnnouncement.js'
import AdminStatsRow from './AdminStatsRow.vue'
import PopularLessons from './PopularLessons.vue'
import DatabasePanel from './DatabasePanel.vue'
import SystemHealth from './SystemHealth.vue'

defineEmits(['back'])

const admin = useAdminDashboard()
const ann = useAnnouncement()
const refreshing = ref(false)

// Announcement form state
const newMessage = ref('')
const newType = ref('info')
const newExpiry = ref('')
const publishing = ref(false)
const clearing = ref(false)

async function handlePublish() {
  if (!newMessage.value.trim()) return
  publishing.value = true
  try {
    const expiresAt = newExpiry.value ? new Date(newExpiry.value).toISOString() : null
    await ann.setAnnouncement(newMessage.value.trim(), newType.value, expiresAt)
    newMessage.value = ''
    newType.value = 'info'
    newExpiry.value = ''
  } catch (err) {
    console.error('Failed to publish announcement:', err)
  } finally {
    publishing.value = false
  }
}

async function handleClear() {
  clearing.value = true
  try {
    await ann.clearAnnouncement()
  } catch (err) {
    console.error('Failed to clear announcement:', err)
  } finally {
    clearing.value = false
  }
}

function formatExpiry(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

async function loadData() {
  await Promise.all([admin.loadStats(), admin.loadHealth()])
}

async function handleRefresh() {
  refreshing.value = true
  await admin.refreshAll()
  refreshing.value = false
}

onMounted(loadData)
</script>

<style scoped>
.admin-lobby {
  padding: 20px 0;
}

.admin-header {
  position: relative;
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  margin-bottom: 24px;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  background: none;
  border: 1px solid var(--card-border, #e0ddd7);
  border-radius: var(--radius-button, 6px);
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  font-family: var(--font-body, 'DM Sans', sans-serif);
  transition: all 0.2s;
}

.back-btn:hover {
  background: #f3f4f6;
  color: var(--text-primary, #1a1a1a);
}

.admin-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 28px;
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 8px;
}

.admin-subtitle {
  color: var(--text-secondary, #6b7280);
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #2d6a4f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: 40px;
  color: #d32f2f;
}

.retry-btn {
  margin-top: 12px;
  padding: 8px 20px;
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  cursor: pointer;
}

.content-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 24px;
  margin-bottom: 24px;
}

/* Announcement management */
.announcement-section {
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  padding: 20px;
  margin-bottom: 24px;
}

.section-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 18px;
  color: var(--green-dark, #2d6a4f);
  margin: 0 0 16px 0;
}

.current-announcement {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-button, 6px);
}

.current-announcement.info {
  background: #e3f2fd;
  border-left: 3px solid #1565c0;
}

.current-announcement.warning {
  background: #fff8e1;
  border-left: 3px solid #e65100;
}

.current-announcement.urgent {
  background: #ffebee;
  border-left: 3px solid #c62828;
}

.announcement-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.announcement-type-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  width: fit-content;
  padding: 1px 8px;
  border-radius: 10px;
}

.announcement-type-badge.info { background: #bbdefb; color: #1565c0; }
.announcement-type-badge.warning { background: #ffe082; color: #e65100; }
.announcement-type-badge.urgent { background: #ef9a9a; color: #c62828; }

.announcement-message {
  font-size: 14px;
  color: var(--text-primary, #1a1a1a);
}

.announcement-expires {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
}

.clear-btn {
  padding: 6px 16px;
  background: #ef5350;
  color: white;
  border: none;
  border-radius: var(--radius-button, 6px);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.clear-btn:hover { background: #d32f2f; }
.clear-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.announcement-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.announcement-input {
  padding: 10px 14px;
  border: 1px solid var(--card-border, #e0ddd7);
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  font-family: var(--font-body, 'DM Sans', sans-serif);
  width: 100%;
}

.announcement-input:focus {
  outline: none;
  border-color: var(--green-mid, #40916c);
}

.form-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.type-select {
  padding: 8px 12px;
  border: 1px solid var(--card-border, #e0ddd7);
  border-radius: var(--radius-button, 6px);
  font-size: 13px;
  font-family: var(--font-body, 'DM Sans', sans-serif);
  background: white;
}

.expiry-input {
  padding: 8px 12px;
  border: 1px solid var(--card-border, #e0ddd7);
  border-radius: var(--radius-button, 6px);
  font-size: 13px;
  font-family: var(--font-body, 'DM Sans', sans-serif);
  flex: 1;
}

.publish-btn {
  padding: 8px 20px;
  background: var(--green-mid, #40916c);
  color: white;
  border: none;
  border-radius: var(--radius-button, 6px);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.publish-btn:hover { background: var(--green-dark, #2d6a4f); }
.publish-btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
  }
}
</style>
