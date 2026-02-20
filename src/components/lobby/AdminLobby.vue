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
import AdminStatsRow from './AdminStatsRow.vue'
import PopularLessons from './PopularLessons.vue'
import DatabasePanel from './DatabasePanel.vue'
import SystemHealth from './SystemHealth.vue'

defineEmits(['back'])

const admin = useAdminDashboard()
const refreshing = ref(false)

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

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
