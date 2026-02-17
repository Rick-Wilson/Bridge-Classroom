<template>
  <div class="classroom-detail">
    <!-- Header with back navigation -->
    <header class="detail-header">
      <button class="back-btn" @click="$emit('back')">
        ← Back to Classrooms
      </button>
      <div class="header-info">
        <h1>{{ classroomName }}</h1>
        <span class="student-count">{{ students.length }} students</span>
      </div>
    </header>

    <!-- Classroom stats summary -->
    <section class="stats-summary">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalObservations }}</div>
        <div class="stat-label">Total Bids</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-value">{{ stats.accuracy }}%</div>
        <div class="stat-label">Class Accuracy</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.activeStudents }}</div>
        <div class="stat-label">Active Students</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.weekCount }}</div>
        <div class="stat-label">This Week</div>
      </div>
    </section>

    <!-- Skill profile for the class -->
    <section class="skill-profile" v-if="Object.keys(classSkillStats).length > 0">
      <h2>Class Skill Profile</h2>
      <div class="skill-bars">
        <div
          v-for="(skillData, skillPath) in sortedSkillStats"
          :key="skillPath"
          class="skill-bar-row"
        >
          <div class="skill-info">
            <span class="skill-name">{{ skillData.name }}</span>
            <span class="skill-count">{{ skillData.total }} bids</span>
          </div>
          <div class="skill-bar-container">
            <div
              class="skill-bar"
              :style="{ width: skillData.accuracy + '%' }"
              :class="getAccuracyClass(skillData.accuracy)"
            ></div>
            <span class="skill-accuracy">{{ skillData.accuracy }}%</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Student list -->
    <section class="students-section">
      <div class="section-header">
        <h2>Students</h2>
        <div class="sort-controls">
          <label>Sort by:</label>
          <select v-model="sortBy">
            <option value="name">Name</option>
            <option value="accuracy">Accuracy</option>
            <option value="recent">Recently Active</option>
            <option value="total">Total Bids</option>
          </select>
        </div>
      </div>

      <div class="student-grid">
        <div
          v-for="student in sortedStudents"
          :key="student.id"
          class="student-card"
          @click="$emit('selectStudent', student.id)"
        >
          <div class="student-header">
            <div class="student-avatar">{{ anon.displayInitials(student) }}</div>
            <div class="student-name-container">
              <span class="student-name">{{ anon.displayFullName(student) }}</span>
              <span class="last-active" v-if="student.stats.lastPractice">
                Last active: {{ formatDate(student.stats.lastPractice) }}
              </span>
              <span class="last-active never" v-else>No practice yet</span>
            </div>
          </div>

          <div class="student-stats">
            <div class="stat">
              <span class="value">{{ student.stats.totalObservations }}</span>
              <span class="label">bids</span>
            </div>
            <div class="stat">
              <span class="value" :class="getAccuracyClass(student.stats.accuracy)">
                {{ student.stats.accuracy }}%
              </span>
              <span class="label">accuracy</span>
            </div>
            <div class="stat">
              <span class="value">{{ student.stats.streak }}</span>
              <span class="label">streak</span>
            </div>
          </div>

          <div class="student-activity">
            <span v-if="student.stats.todayCount > 0" class="activity today">
              {{ student.stats.todayCount }} today
            </span>
            <span v-if="student.stats.weekCount > 0" class="activity week">
              {{ student.stats.weekCount }} this week
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="students.length === 0" class="empty-state">
        <p>No students in this classroom yet.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTeacherDashboard } from '../../composables/useTeacherDashboard.js'
import { useAnonymizer } from '../../composables/useAnonymizer.js'
import { getSkillFromPath } from '../../utils/skillPath.js'

const props = defineProps({
  classroomId: {
    type: String,
    required: true
  }
})

defineEmits(['back', 'selectStudent'])

const dashboard = useTeacherDashboard()
const anon = useAnonymizer()
const sortBy = ref('name')

const classroomName = computed(() => dashboard.formatClassroomName(props.classroomId))

const students = computed(() => {
  const rawStudents = dashboard.getStudentsByClassroom(props.classroomId)
  return rawStudents.map(student => ({
    ...student,
    stats: dashboard.getStudentStats(student.id)
  }))
})

const stats = computed(() => dashboard.getClassroomStats(props.classroomId))

// Aggregate skill stats for the classroom
const classSkillStats = computed(() => {
  const skillStats = {}
  const classroomObs = dashboard.observations.value.filter(obs => {
    if (props.classroomId === 'ad-hoc') {
      return !obs.classroom
    }
    return obs.classroom === props.classroomId
  })

  for (const obs of classroomObs) {
    const skill = obs.skill_path || 'unknown'
    if (!skillStats[skill]) {
      const skillInfo = getSkillFromPath(skill)
      skillStats[skill] = {
        name: skillInfo.name,
        category: skillInfo.category,
        total: 0,
        correct: 0
      }
    }
    skillStats[skill].total++
    if (obs.correct) skillStats[skill].correct++
  }

  // Calculate accuracy
  for (const skill in skillStats) {
    const s = skillStats[skill]
    s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
  }

  return skillStats
})

// Sort skill stats by total attempts
const sortedSkillStats = computed(() => {
  const entries = Object.entries(classSkillStats.value)
  entries.sort((a, b) => b[1].total - a[1].total)
  return Object.fromEntries(entries.slice(0, 8)) // Top 8 skills
})

// Sorted students based on selected sort option
const sortedStudents = computed(() => {
  const studentsCopy = [...students.value]

  switch (sortBy.value) {
    case 'accuracy':
      return studentsCopy.sort((a, b) => b.stats.accuracy - a.stats.accuracy)
    case 'recent':
      return studentsCopy.sort((a, b) => {
        if (!a.stats.lastPractice) return 1
        if (!b.stats.lastPractice) return -1
        return new Date(b.stats.lastPractice) - new Date(a.stats.lastPractice)
      })
    case 'total':
      return studentsCopy.sort((a, b) => b.stats.totalObservations - a.stats.totalObservations)
    case 'name':
    default:
      return studentsCopy.sort((a, b) => {
        const nameA = anon.displayFullName(a).toLowerCase()
        const nameB = anon.displayFullName(b).toLowerCase()
        return nameA.localeCompare(nameB)
      })
  }
})

function getInitials(student) {
  const first = student.first_name?.charAt(0) || ''
  const last = student.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || '?'
}

function formatDate(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
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
</script>

<style scoped>
.classroom-detail {
  padding: 24px;
  max-width: 1000px;
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
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.back-btn:hover {
  color: #1e3a5f;
}

.header-info {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.header-info h1 {
  font-size: 28px;
  color: #1e3a5f;
  margin: 0;
}

.student-count {
  font-size: 14px;
  color: #888;
}

/* Stats summary */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
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
  font-size: 28px;
  font-weight: 700;
}

.stat-card .stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.stat-card.accent .stat-label {
  color: rgba(255, 255, 255, 0.8);
}

/* Skill profile */
.skill-profile {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.skill-profile h2 {
  font-size: 18px;
  color: #333;
  margin-bottom: 20px;
}

.skill-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-bar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skill-info {
  flex: 0 0 160px;
  display: flex;
  flex-direction: column;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.skill-count {
  font-size: 11px;
  color: #888;
}

.skill-bar-container {
  flex: 1;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.skill-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease;
}

.skill-bar.excellent { background: linear-gradient(90deg, #4caf50 0%, #81c784 100%); }
.skill-bar.good { background: linear-gradient(90deg, #8bc34a 0%, #aed581 100%); }
.skill-bar.fair { background: linear-gradient(90deg, #ffc107 0%, #ffca28 100%); }
.skill-bar.needs-work { background: linear-gradient(90deg, #ff9800 0%, #ffb74d 100%); }

.skill-accuracy {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

/* Students section */
.students-section h2 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-controls label {
  font-size: 13px;
  color: #666;
}

.sort-controls select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.student-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.student-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.student-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.student-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.student-name-container {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: 600;
  color: #333;
}

.last-active {
  font-size: 12px;
  color: #888;
}

.last-active.never {
  color: #bbb;
  font-style: italic;
}

.student-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.student-stats .stat {
  display: flex;
  flex-direction: column;
}

.student-stats .stat .value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.student-stats .stat .value.excellent { color: #2e7d32; }
.student-stats .stat .value.good { color: #558b2f; }
.student-stats .stat .value.fair { color: #f57c00; }
.student-stats .stat .value.needs-work { color: #c62828; }

.student-stats .stat .label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
}

.student-activity {
  display: flex;
  gap: 8px;
}

.activity {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.activity.today {
  background: #e8f5e9;
  color: #2e7d32;
}

.activity.week {
  background: #e3f2fd;
  color: #1565c0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #888;
}

@media (max-width: 600px) {
  .classroom-detail {
    padding: 16px;
  }

  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .student-grid {
    grid-template-columns: 1fr;
  }

  .skill-bar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .skill-info {
    flex: unset;
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: 4px;
  }
}
</style>
