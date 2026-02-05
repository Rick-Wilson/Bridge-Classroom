<template>
  <div class="student-detail">
    <!-- Header with back navigation -->
    <header class="detail-header">
      <button class="back-btn" @click="$emit('back')">
        ← Back
      </button>
      <div class="header-content">
        <div class="student-avatar large">{{ initials }}</div>
        <div class="header-info">
          <h1>{{ studentName }}</h1>
          <span class="classroom">{{ classroomName }}</span>
          <span class="last-active" v-if="stats.lastPractice">
            Last active: {{ formatDate(stats.lastPractice) }}
          </span>
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading student data...</p>
    </div>

    <!-- Student stats overview -->
    <section v-else class="stats-overview">
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalObservations }}</div>
          <div class="stat-label">Total Bids</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ stats.accuracy }}%</div>
          <div class="stat-label">Overall Accuracy</div>
        </div>
        <div class="stat-card streak">
          <div class="stat-value">{{ stats.streak }}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>

      <div class="period-stats">
        <div class="period">
          <h4>Today</h4>
          <div class="period-numbers">
            <span class="total">{{ stats.todayCount }} bids</span>
            <span class="correct">{{ stats.todayCorrect }} correct</span>
            <span class="accuracy" v-if="stats.todayCount > 0">
              {{ Math.round((stats.todayCorrect / stats.todayCount) * 100) }}%
            </span>
          </div>
        </div>
        <div class="period">
          <h4>This Week</h4>
          <div class="period-numbers">
            <span class="total">{{ stats.weekCount }} bids</span>
            <span class="correct">{{ stats.weekCorrect }} correct</span>
            <span class="accuracy" v-if="stats.weekCount > 0">
              {{ Math.round((stats.weekCorrect / stats.weekCount) * 100) }}%
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Skill breakdown -->
    <section class="skill-section" v-if="sortedSkills.length > 0">
      <h2>Skill Breakdown</h2>
      <div class="skill-list">
        <div
          v-for="skill in sortedSkills"
          :key="skill.path"
          class="skill-row"
        >
          <div class="skill-info">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-category">{{ skill.category }}</span>
          </div>
          <div class="skill-bar-container">
            <div
              class="skill-bar"
              :style="{ width: skill.accuracy + '%' }"
              :class="getAccuracyClass(skill.accuracy)"
            ></div>
          </div>
          <div class="skill-stats">
            <span class="accuracy" :class="getAccuracyClass(skill.accuracy)">
              {{ skill.accuracy }}%
            </span>
            <span class="count">{{ skill.total }} bids</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent errors (areas needing work) -->
    <section class="errors-section" v-if="recentErrors.length > 0">
      <h2>Recent Errors</h2>
      <p class="section-description">These are the most recent incorrect bids that may need review.</p>
      <div class="error-list">
        <div
          v-for="error in recentErrors"
          :key="error.id"
          class="error-card"
        >
          <div class="error-header">
            <span class="error-skill">{{ getSkillName(error.skill_path) }}</span>
            <span class="error-date">{{ formatDate(error.timestamp) }}</span>
          </div>
          <div class="error-details" v-if="error.student_bid || error.expected_bid">
            <div class="bid-comparison">
              <span class="bid wrong">{{ error.student_bid || '?' }}</span>
              <span class="arrow">→</span>
              <span class="bid correct">{{ error.expected_bid || '?' }}</span>
            </div>
          </div>
          <div class="error-context" v-if="error.deal_subfolder">
            Deal #{{ error.deal_number || '?' }} from {{ error.deal_subfolder }}
          </div>
        </div>
      </div>
    </section>

    <!-- Recommendations -->
    <section class="recommendations-section" v-if="recommendations.length > 0">
      <h2>Recommended Practice</h2>
      <div class="recommendation-list">
        <div
          v-for="rec in recommendations"
          :key="rec.skill"
          class="recommendation-card"
        >
          <div class="rec-skill">{{ rec.name }}</div>
          <div class="rec-reason">{{ rec.reason }}</div>
          <div class="rec-stats">
            <span>{{ rec.accuracy }}% accuracy</span>
            <span>{{ rec.total }} attempts</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useTeacherDashboard } from '../../composables/useTeacherDashboard.js'
import { getSkillFromPath } from '../../utils/skillPath.js'

const props = defineProps({
  studentId: {
    type: String,
    required: true
  }
})

defineEmits(['back'])

const dashboard = useTeacherDashboard()
const loading = ref(false)
const decryptedObservations = ref([])

// Get student info
const student = computed(() =>
  dashboard.students.value.find(s => s.id === props.studentId)
)

const studentName = computed(() =>
  student.value ? `${student.value.first_name} ${student.value.last_name}` : 'Unknown Student'
)

const initials = computed(() => {
  if (!student.value) return '?'
  const first = student.value.first_name?.charAt(0) || ''
  const last = student.value.last_name?.charAt(0) || ''
  return (first + last).toUpperCase()
})

const classroomName = computed(() =>
  dashboard.formatClassroomName(student.value?.classroom)
)

const stats = computed(() => dashboard.getStudentStats(props.studentId))

// Sorted skills by total attempts
const sortedSkills = computed(() => {
  const skillStats = stats.value.skillStats || {}
  return Object.entries(skillStats)
    .map(([path, data]) => ({ path, ...data }))
    .filter(s => s.path !== 'unknown' && s.path !== 'unknown/unknown')
    .sort((a, b) => b.total - a.total)
})

// Recent errors from metadata (not decrypted)
const recentErrors = computed(() => {
  return dashboard.getRecentErrors(props.studentId, 5)
})

// Generate practice recommendations
const recommendations = computed(() => {
  const skills = sortedSkills.value
  const recs = []

  // Find skills with low accuracy but enough attempts
  for (const skill of skills) {
    if (skill.total >= 3 && skill.accuracy < 60) {
      recs.push({
        skill: skill.path,
        name: skill.name,
        accuracy: skill.accuracy,
        total: skill.total,
        reason: skill.accuracy < 40
          ? 'Struggling with this skill'
          : 'Room for improvement'
      })
    }
  }

  // Sort by accuracy (lowest first)
  return recs.sort((a, b) => a.accuracy - b.accuracy).slice(0, 3)
})

onMounted(async () => {
  await loadStudentData()
})

watch(() => props.studentId, async () => {
  await loadStudentData()
})

async function loadStudentData() {
  loading.value = true
  try {
    // For now, we use metadata. If we need decrypted data (like bid details),
    // we'd call dashboard.loadStudentObservations(props.studentId)
    // and store the result in decryptedObservations
  } finally {
    loading.value = false
  }
}

function formatDate(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getAccuracyClass(accuracy) {
  if (accuracy >= 80) return 'excellent'
  if (accuracy >= 60) return 'good'
  if (accuracy >= 40) return 'fair'
  return 'needs-work'
}

function getSkillName(skillPath) {
  if (!skillPath || skillPath === 'unknown') return 'General Practice'
  const skillInfo = getSkillFromPath(skillPath)
  return skillInfo.name
}
</script>

<style scoped>
.student-detail {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.detail-header {
  margin-bottom: 32px;
}

.back-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;
}

.back-btn:hover {
  color: #1e3a5f;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.student-avatar.large {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 28px;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-info h1 {
  font-size: 28px;
  color: #1e3a5f;
  margin: 0 0 4px 0;
}

.classroom {
  font-size: 14px;
  color: #666;
}

.last-active {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

/* Loading */
.loading {
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

/* Stats overview */
.stats-overview {
  margin-bottom: 32px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card.accent {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: white;
}

.stat-card.streak {
  background: linear-gradient(135deg, #ff9800 0%, #ffc107 100%);
  color: white;
}

.stat-card .stat-value {
  font-size: 36px;
  font-weight: 700;
}

.stat-card .stat-label {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.8;
}

.period-stats {
  display: flex;
  gap: 24px;
}

.period {
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.period h4 {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
  text-transform: uppercase;
}

.period-numbers {
  display: flex;
  gap: 16px;
  font-size: 14px;
}

.period-numbers .total {
  color: #333;
  font-weight: 500;
}

.period-numbers .correct {
  color: #4caf50;
}

.period-numbers .accuracy {
  color: #1e3a5f;
  font-weight: 600;
}

/* Skill section */
.skill-section, .errors-section, .recommendations-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.skill-section h2, .errors-section h2, .recommendations-section h2 {
  font-size: 18px;
  color: #333;
  margin: 0 0 20px 0;
}

.section-description {
  color: #666;
  font-size: 14px;
  margin: -12px 0 16px 0;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skill-info {
  flex: 0 0 180px;
  display: flex;
  flex-direction: column;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.skill-category {
  font-size: 11px;
  color: #888;
}

.skill-bar-container {
  flex: 1;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.skill-bar {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.skill-bar.excellent { background: linear-gradient(90deg, #4caf50 0%, #81c784 100%); }
.skill-bar.good { background: linear-gradient(90deg, #8bc34a 0%, #aed581 100%); }
.skill-bar.fair { background: linear-gradient(90deg, #ffc107 0%, #ffca28 100%); }
.skill-bar.needs-work { background: linear-gradient(90deg, #ff9800 0%, #ffb74d 100%); }

.skill-stats {
  flex: 0 0 100px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.skill-stats .accuracy {
  font-size: 16px;
  font-weight: 600;
}

.skill-stats .accuracy.excellent { color: #2e7d32; }
.skill-stats .accuracy.good { color: #558b2f; }
.skill-stats .accuracy.fair { color: #f57c00; }
.skill-stats .accuracy.needs-work { color: #c62828; }

.skill-stats .count {
  font-size: 12px;
  color: #888;
}

/* Errors section */
.error-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-card {
  padding: 16px;
  background: #fef9f9;
  border: 1px solid #fee;
  border-radius: 8px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.error-skill {
  font-weight: 500;
  color: #333;
}

.error-date {
  font-size: 13px;
  color: #888;
}

.error-details {
  margin-bottom: 8px;
}

.bid-comparison {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bid {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.bid.wrong {
  background: #ffebee;
  color: #c62828;
  text-decoration: line-through;
}

.bid.correct {
  background: #e8f5e9;
  color: #2e7d32;
}

.arrow {
  color: #888;
}

.error-context {
  font-size: 12px;
  color: #888;
}

/* Recommendations */
.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-card {
  padding: 16px;
  background: #e3f2fd;
  border-radius: 8px;
}

.rec-skill {
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 4px;
}

.rec-reason {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.rec-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}

@media (max-width: 600px) {
  .student-detail {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .stat-cards {
    grid-template-columns: 1fr;
  }

  .period-stats {
    flex-direction: column;
  }

  .skill-row {
    flex-direction: column;
    align-items: stretch;
  }

  .skill-info {
    flex: unset;
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .skill-stats {
    flex: unset;
    flex-direction: row;
    justify-content: space-between;
    margin-top: 4px;
  }
}
</style>
