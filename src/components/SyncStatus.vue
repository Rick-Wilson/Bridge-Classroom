<template>
  <div class="sync-status" :class="statusClass" @click="handleClick">
    <!-- Syncing indicator -->
    <div v-if="dataSync.isSyncing.value" class="status-content">
      <span class="spinner"></span>
      <span class="status-text">Syncing...</span>
    </div>

    <!-- Offline indicator -->
    <div v-else-if="dataSync.isOffline.value" class="status-content offline">
      <span class="icon">&#9888;</span>
      <span class="status-text">Offline</span>
      <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
    </div>

    <!-- Error state -->
    <div v-else-if="dataSync.hasError.value" class="status-content error">
      <span class="icon">&#10006;</span>
      <span class="status-text">{{ errorText }}</span>
      <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
      <button class="retry-btn" @click.stop="handleRetry">Retry</button>
    </div>

    <!-- Pending observations -->
    <div v-else-if="pendingCount > 0" class="status-content pending">
      <span class="icon">&#8635;</span>
      <span class="status-text">{{ pendingCount }} pending</span>
    </div>

    <!-- All synced -->
    <div v-else class="status-content synced">
      <span class="icon">&#10003;</span>
      <span class="status-text">Synced</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDataSync } from '../composables/useDataSync.js'
import { useObservationStore } from '../composables/useObservationStore.js'

const dataSync = useDataSync()
const observationStore = useObservationStore()

const pendingCount = computed(() => observationStore.pendingCount.value)

const errorText = computed(() => {
  if (dataSync.registrationFailed.value) return 'Not registered'
  return 'Sync failed'
})

const statusClass = computed(() => {
  if (dataSync.isSyncing.value) return 'syncing'
  if (dataSync.isOffline.value) return 'offline'
  if (dataSync.hasError.value) return 'error'
  if (pendingCount.value > 0) return 'pending'
  return 'synced'
})

function handleClick() {
  if (!dataSync.isSyncing.value && pendingCount.value > 0) {
    dataSync.forceSync()
  }
}

function handleRetry() {
  dataSync.retrySync()
}
</script>

<style scoped>
.sync-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.sync-status:hover {
  transform: scale(1.02);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon {
  font-size: 14px;
}

.status-text {
  white-space: nowrap;
}

.badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* Syncing state */
.sync-status.syncing {
  background: #e3f2fd;
  color: #1976d2;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #90caf9;
  border-top-color: #1976d2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Offline state */
.sync-status.offline {
  background: #fff3e0;
  color: #e65100;
}

/* Error state */
.sync-status.error {
  background: #ffebee;
  color: #c62828;
}

.retry-btn {
  background: #c62828;
  color: white;
  border: none;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  margin-left: 4px;
}

.retry-btn:hover {
  background: #b71c1c;
}

/* Pending state */
.sync-status.pending {
  background: #fff8e1;
  color: #f57f17;
}

/* Synced state */
.sync-status.synced {
  background: #e8f5e9;
  color: #2e7d32;
}

/* Make it more subtle when synced */
.sync-status.synced {
  opacity: 0.7;
}

.sync-status.synced:hover {
  opacity: 1;
}
</style>
