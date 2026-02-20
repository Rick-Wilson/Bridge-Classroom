<template>
  <div class="system-health">
    <div class="health-header">
      <h3 class="panel-title">System Health</h3>
      <button class="refresh-btn" @click="$emit('refresh')" :disabled="refreshing">
        {{ refreshing ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>
    <div v-if="!health" class="empty-state">Loading...</div>
    <div v-else class="health-rows">
      <div class="health-row">
        <span class="status-dot green"></span>
        <span class="health-label">API Server</span>
        <span class="health-value">Up {{ formatUptime(health.uptime_seconds) }}</span>
      </div>
      <div class="health-row">
        <span class="status-dot" :class="health.database_writable ? 'green' : 'red'"></span>
        <span class="health-label">Database</span>
        <span class="health-value">{{ health.database_writable ? 'Writable' : 'Error' }}</span>
      </div>
      <div class="health-row">
        <span class="status-dot" :class="health.last_observation_at ? 'green' : 'yellow'"></span>
        <span class="health-label">Last Observation</span>
        <span class="health-value">{{ health.last_observation_at ? formatTimeSince(health.last_observation_at) : 'None' }}</span>
      </div>
      <div class="health-row">
        <span class="status-dot green"></span>
        <span class="health-label">Disk</span>
        <span class="health-value">{{ health.disk_available_gb }} GB / {{ health.disk_total_gb }} GB available</span>
      </div>
      <div class="health-row">
        <span class="status-dot blue"></span>
        <span class="health-label">API Version</span>
        <span class="health-value">v{{ health.api_version }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAdminDashboard } from '../../composables/useAdminDashboard.js'

defineProps({
  health: { type: Object, default: null },
  refreshing: { type: Boolean, default: false }
})

defineEmits(['refresh'])

const { formatUptime } = useAdminDashboard()

function formatTimeSince(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>

<style scoped>
.system-health {
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  padding: 20px;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 18px;
  color: var(--green-dark, #2d6a4f);
  margin: 0;
}

.refresh-btn {
  padding: 6px 14px;
  background: white;
  color: var(--green-mid, #40916c);
  border: 1px solid var(--green-mid, #40916c);
  border-radius: var(--radius-button, 6px);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.refresh-btn:hover:not(:disabled) {
  background: var(--green-pale, #d8f3dc);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
  text-align: center;
  padding: 24px;
}

.health-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.health-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.green { background: #4caf50; }
.status-dot.red { background: #ef5350; }
.status-dot.yellow { background: #ff9800; }
.status-dot.blue { background: #1565c0; }

.health-label {
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
  min-width: 120px;
}

.health-value {
  color: var(--text-secondary, #6b7280);
}
</style>
