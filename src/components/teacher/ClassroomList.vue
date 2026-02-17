<template>
  <div class="classroom-list">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <h1>Teacher Dashboard</h1>
        <span class="last-updated" v-if="dashboard.lastFetchedAt.value">
          Updated {{ formatTimeAgo(dashboard.lastFetchedAt.value) }}
        </span>
      </div>
      <div class="header-actions">
        <button class="anon-btn" :class="{ active: anon.isAnonymized.value }" @click="anon.toggleAnonymize()">
          {{ anon.isAnonymized.value ? 'Clear' : 'Anon' }}
        </button>
        <button class="refresh-btn" @click="refresh" :disabled="dashboard.isLoading.value">
          {{ dashboard.isLoading.value ? 'Loading...' : 'Refresh' }}
        </button>
        <button class="logout-btn" @click="handleLogout">Logout</button>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="dashboard.isLoading.value && !dashboard.hasData.value" class="loading">
      <div class="spinner"></div>
      <p>Loading dashboard data...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="dashboard.hasError.value" class="error-state">
      <p>Failed to load dashboard: {{ dashboard.error.value }}</p>
      <button @click="refresh">Try Again</button>
    </div>

    <!-- Dashboard content -->
    <div v-else class="dashboard-content">
      <!-- Overall stats -->
      <section class="overall-stats">
        <div class="stat-card">
          <div class="stat-value">{{ dashboard.totalStudents.value }}</div>
          <div class="stat-label">Total Students</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dashboard.totalObservations.value }}</div>
          <div class="stat-label">Total Bids</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ dashboard.overallAccuracy.value }}%</div>
          <div class="stat-label">Overall Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dashboard.classrooms.value.length }}</div>
          <div class="stat-label">Classrooms</div>
        </div>
      </section>

      <!-- Classroom cards -->
      <section class="classrooms-section">
        <h2>Classrooms</h2>
        <div class="classroom-grid">
          <div
            v-for="classroom in dashboard.classrooms.value"
            :key="classroom.id"
            class="classroom-card"
            @click="$emit('selectClassroom', classroom.id)"
          >
            <div class="classroom-header">
              <h3>{{ classroom.name }}</h3>
              <span class="student-count">{{ classroom.studentCount }} students</span>
            </div>
            <div class="classroom-stats">
              <div class="mini-stat">
                <span class="value">{{ getStats(classroom.id).totalObservations }}</span>
                <span class="label">bids</span>
              </div>
              <div class="mini-stat">
                <span class="value accuracy" :class="getAccuracyClass(getStats(classroom.id).accuracy)">
                  {{ getStats(classroom.id).accuracy }}%
                </span>
                <span class="label">accuracy</span>
              </div>
              <div class="mini-stat">
                <span class="value">{{ getStats(classroom.id).activeStudents }}</span>
                <span class="label">active</span>
              </div>
            </div>
            <div class="classroom-activity">
              <span class="activity-badge" v-if="getStats(classroom.id).todayCount > 0">
                {{ getStats(classroom.id).todayCount }} today
              </span>
              <span class="activity-badge week" v-if="getStats(classroom.id).weekCount > 0">
                {{ getStats(classroom.id).weekCount }} this week
              </span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="dashboard.classrooms.value.length === 0" class="empty-state">
          <p>No classrooms found. Students will appear here once they register.</p>
        </div>
      </section>

      <!-- Quick access: Recent activity -->
      <section class="recent-section" v-if="recentStudents.length > 0">
        <h2>Recently Active Students</h2>
        <div class="recent-list">
          <div
            v-for="student in recentStudents"
            :key="student.id"
            class="recent-item"
            @click="$emit('selectStudent', student.id)"
          >
            <div class="student-avatar">{{ anon.displayInitials(student) }}</div>
            <div class="student-info">
              <span class="student-name">{{ anon.displayFullName(student) }}</span>
              <span class="student-classroom">{{ dashboard.formatClassroomName(student.classroom) }}</span>
            </div>
            <div class="student-quick-stats">
              <span class="accuracy" :class="getAccuracyClass(getStudentAccuracy(student.id))">
                {{ getStudentAccuracy(student.id) }}%
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useTeacherDashboard } from '../../composables/useTeacherDashboard.js'
import { useTeacherAuth } from '../../composables/useTeacherAuth.js'
import { useAnonymizer } from '../../composables/useAnonymizer.js'

const emit = defineEmits(['selectClassroom', 'selectStudent', 'logout'])

const dashboard = useTeacherDashboard()
const teacherAuth = useTeacherAuth()
const anon = useAnonymizer()

onMounted(async () => {
  await dashboard.initialize()
})

async function refresh() {
  await dashboard.loadDashboard(true)
}

function handleLogout() {
  teacherAuth.logout()
  dashboard.clearCache()
  emit('logout')
}

function getStats(classroomId) {
  return dashboard.getClassroomStats(classroomId)
}

function getStudentAccuracy(userId) {
  const stats = dashboard.getStudentStats(userId)
  return stats.accuracy
}

// Get recently active students (sorted by last practice)
const recentStudents = computed(() => {
  const studentsWithStats = dashboard.students.value.map(student => ({
    ...student,
    stats: dashboard.getStudentStats(student.id)
  }))

  return studentsWithStats
    .filter(s => s.stats.lastPractice)
    .sort((a, b) => new Date(b.stats.lastPractice) - new Date(a.stats.lastPractice))
    .slice(0, 5)
})

function getInitials(student) {
  const first = student.first_name?.charAt(0) || ''
  const last = student.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || '?'
}

function formatTimeAgo(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString()
}

function getAccuracyClass(accuracy) {
  if (accuracy >= 80) return 'excellent'
  if (accuracy >= 60) return 'good'
  if (accuracy >= 40) return 'fair'
  return 'needs-work'
}
</script>

<style scoped>
.classroom-list {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-left h1 {
  font-size: 28px;
  color: #1e3a5f;
  margin-bottom: 4px;
}

.last-updated {
  font-size: 13px;
  color: #888;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.anon-btn, .refresh-btn, .logout-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn {
  background: #e3f2fd;
  color: #1e3a5f;
  border: none;
}

.refresh-btn:hover:not(:disabled) {
  background: #bbdefb;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.anon-btn {
  background: white;
  color: #666;
  border: 1px solid #ddd;
}

.anon-btn.active {
  background: #fff3e0;
  color: #e65100;
  border-color: #ffcc80;
}

.anon-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.anon-btn.active:hover {
  background: #ffe0b2;
}

.logout-btn {
  background: white;
  color: #666;
  border: 1px solid #ddd;
}

.logout-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.loading, .error-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #1e3a5f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: #c00;
}

.error-state button {
  margin-top: 16px;
  padding: 10px 20px;
  background: #c00;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* Overall stats */
.overall-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card.accent {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: white;
}

.stat-card .stat-value {
  font-size: 32px;
  font-weight: 700;
}

.stat-card .stat-label {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.stat-card.accent .stat-label {
  color: rgba(255, 255, 255, 0.8);
}

/* Classrooms section */
.classrooms-section {
  margin-bottom: 40px;
}

.classrooms-section h2, .recent-section h2 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

.classroom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.classroom-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.classroom-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.classroom-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}

.classroom-header h3 {
  font-size: 18px;
  color: #1e3a5f;
  margin: 0;
}

.student-count {
  font-size: 13px;
  color: #888;
}

.classroom-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
}

.mini-stat {
  display: flex;
  flex-direction: column;
}

.mini-stat .value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.mini-stat .value.accuracy.excellent { color: #2e7d32; }
.mini-stat .value.accuracy.good { color: #558b2f; }
.mini-stat .value.accuracy.fair { color: #f57c00; }
.mini-stat .value.accuracy.needs-work { color: #c62828; }

.mini-stat .label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
}

.classroom-activity {
  display: flex;
  gap: 8px;
}

.activity-badge {
  padding: 4px 8px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.activity-badge.week {
  background: #e3f2fd;
  color: #1565c0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #888;
}

/* Recent students section */
.recent-section {
  margin-bottom: 40px;
}

.recent-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item:hover {
  background: #f8f9fa;
}

.student-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.student-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: 500;
  color: #333;
}

.student-classroom {
  font-size: 13px;
  color: #888;
}

.student-quick-stats .accuracy {
  font-weight: 600;
  font-size: 16px;
}

.accuracy.excellent { color: #2e7d32; }
.accuracy.good { color: #558b2f; }
.accuracy.fair { color: #f57c00; }
.accuracy.needs-work { color: #c62828; }

@media (max-width: 600px) {
  .classroom-list {
    padding: 16px;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 16px;
  }

  .overall-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .classroom-grid {
    grid-template-columns: 1fr;
  }
}
</style>
