<template>
  <div class="teacher-lobby">
    <!-- Welcome section -->
    <div class="welcome-section">
      <h2 class="welcome-title">Welcome back, {{ userName }}</h2>
      <p class="welcome-subtitle">{{ welcomeSubtitle }}</p>
    </div>

    <!-- Quick actions -->
    <div class="quick-actions">
      <button class="action-btn create" @click="showCreateModal = true">
        + New Classroom
      </button>
      <button class="action-btn assign" @click="showAssignModal = true">
        + New Assignment
      </button>
      <a v-if="hasLegacyDashboard" :href="legacyDashboardUrl" class="action-btn legacy">
        Legacy Dashboard
      </a>
    </div>

    <!-- Loading -->
    <div v-if="dashboard.lobbyLoading.value && !dashboard.lobbyClassrooms.value.length" class="loading-state">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>

    <!-- Two-column layout -->
    <div v-else class="dashboard-grid">
      <!-- Left column: Classrooms -->
      <div class="left-column">
        <div v-if="dashboard.lobbyClassrooms.value.length" class="classrooms-section">
          <h3 class="section-title">My Classrooms</h3>
          <div class="classroom-cards">
            <ClassroomCard
              v-for="classroom in dashboard.lobbyClassrooms.value"
              :key="classroom.id"
              :classroom="classroom"
              :expanded="expandedId === classroom.id"
              @toggle="toggleExpand(classroom.id)"
              @member-removed="refreshData"
            />
          </div>
        </div>

        <div v-else class="empty-state">
          <p class="empty-title">No classrooms yet</p>
          <p class="empty-desc">Create a classroom and share the invite link with your students.</p>
        </div>
      </div>

      <!-- Right column: Attention + Activity -->
      <div class="right-column">
        <NeedsAttention :items="dashboard.needsAttention.value" />
        <RecentActivity :events="dashboard.recentActivity.value" />
      </div>
    </div>

    <!-- Lesson collections (teachers keep student features) -->
    <div class="collections-section">
      <h3 class="section-title">Lesson Collections</h3>
      <CollectionGrid @select-collection="$emit('select-collection', $event)" />
    </div>

    <!-- Create classroom modal -->
    <ClassroomCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @classroom-created="handleClassroomCreated"
    />

    <!-- Create assignment modal -->
    <AssignmentCreateModal
      v-if="showAssignModal"
      @close="showAssignModal = false"
      @assignment-created="handleAssignmentCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../composables/useUserStore.js'
import { useTeacherDashboard } from '../../composables/useTeacherDashboard.js'
import CollectionGrid from './CollectionGrid.vue'
import ClassroomCard from './ClassroomCard.vue'
import ClassroomCreateModal from './ClassroomCreateModal.vue'
import AssignmentCreateModal from './AssignmentCreateModal.vue'
import NeedsAttention from './NeedsAttention.vue'
import RecentActivity from './RecentActivity.vue'

defineEmits(['select-collection'])

const userStore = useUserStore()
const dashboard = useTeacherDashboard()

const showCreateModal = ref(false)
const showAssignModal = ref(false)
const expandedId = ref(null)

const userName = computed(() => {
  const user = userStore.currentUser.value
  return user ? user.firstName : ''
})

const welcomeSubtitle = computed(() => {
  const stats = dashboard.summaryStats.value
  if (!stats || stats.classroomCount === 0) {
    return 'Get started by creating your first classroom.'
  }
  const parts = []
  parts.push(`${stats.classroomCount} active ${stats.classroomCount === 1 ? 'classroom' : 'classrooms'}`)
  if (stats.openAssignmentCount > 0) {
    parts.push(`${stats.openAssignmentCount} open ${stats.openAssignmentCount === 1 ? 'assignment' : 'assignments'}`)
  }
  return parts.join(', ') + '.'
})

// Legacy teacher dashboard
const hasLegacyDashboard = true
const legacyDashboardUrl = computed(() => {
  return `${window.location.origin}${window.location.pathname}?mode=teacher`
})

function toggleExpand(classroomId) {
  expandedId.value = expandedId.value === classroomId ? null : classroomId
}

function handleClassroomCreated(classroom) {
  showCreateModal.value = false
  expandedId.value = classroom.id
  refreshData()
}

function handleAssignmentCreated() {
  showAssignModal.value = false
  refreshData()
}

function refreshData() {
  const user = userStore.currentUser.value
  if (user) {
    dashboard.loadTeacherLobbyData(user.id, true)
  }
}

onMounted(() => {
  const user = userStore.currentUser.value
  if (user) {
    dashboard.loadTeacherLobbyData(user.id)
  }
})
</script>

<style scoped>
.teacher-lobby {
  padding: 20px 0;
}

.welcome-section {
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  margin-bottom: 24px;
}

.welcome-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 28px;
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 8px;
}

.welcome-subtitle {
  color: var(--text-secondary, #6b7280);
  max-width: 500px;
  margin: 0 auto;
}

.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.action-btn.create {
  background: var(--green-mid, #40916c);
  color: white;
}

.action-btn.create:hover {
  background: var(--green-dark, #2d6a4f);
}

.action-btn.assign {
  background: #e3f2fd;
  color: #1565c0;
}

.action-btn.assign:hover {
  background: #bbdefb;
}

.action-btn.legacy {
  background: var(--green-pale, #d8f3dc);
  color: var(--green-dark, #2d6a4f);
}

.action-btn.legacy:hover {
  background: var(--green-light, #b7e4c7);
}

/* Two-column dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 24px;
  margin-bottom: 32px;
}

.section-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 20px;
  color: var(--green-dark, #2d6a4f);
  margin: 0 0 16px 0;
}

.classrooms-section {
  margin-bottom: 0;
}

.classroom-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.collections-section {
  margin-top: 8px;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  grid-column: 1 / -1;
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

.empty-state {
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px dashed var(--card-border, #e0ddd7);
}

.empty-title {
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 4px;
}

.empty-desc {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
}

/* Responsive: collapse to single column on mobile */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
