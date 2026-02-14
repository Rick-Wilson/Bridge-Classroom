<template>
  <div class="teacher-student-detail">
    <header class="detail-header">
      <button class="back-btn" @click="$emit('back')">&larr; Students</button>
      <div class="student-info">
        <div class="avatar">{{ initials }}</div>
        <div>
          <h2>{{ studentName }}</h2>
          <span class="last-active">Last active: {{ lastActiveText }}</span>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading student data...</p>
    </div>

    <!-- Content -->
    <div v-else class="detail-content">
      <!-- Summary stats -->
      <div v-if="summary.total > 0" class="stats-row">
        <div class="stat stat-green">{{ summary.green }} Green</div>
        <div v-if="summary.orange" class="stat stat-orange">{{ summary.orange }} Orange</div>
        <div v-if="summary.yellow" class="stat stat-yellow">{{ summary.yellow }} Yellow</div>
        <div v-if="summary.red" class="stat stat-red">{{ summary.red }} Red</div>
        <div v-if="summary.grey" class="stat stat-grey">{{ summary.grey }} Grey</div>
      </div>

      <!-- Lesson mastery strips -->
      <section class="mastery-section">
        <h3>Lesson Mastery</h3>
        <div v-if="lessonMasteryList.length === 0" class="no-data">
          No lesson data available yet.
        </div>
        <div v-else class="lesson-list">
          <div v-for="lesson in lessonMasteryList" :key="lesson.subfolder" class="lesson-row">
            <div class="lesson-header">
              <button class="lesson-name lesson-link" @click="emit('navigate-to-lesson', lesson.subfolder)">{{ formatLessonName(lesson.subfolder) }}</button>
              <span
                v-if="lesson.achievement !== 'none'"
                :class="['achievement-badge', lesson.achievement]"
              >
                &#9733; {{ lesson.achievement === 'gold' ? 'Gold' : 'Silver' }}
              </span>
            </div>
            <div class="mastery-strip">
              <div
                v-for="board in lesson.boardMastery"
                :key="board.boardNumber"
                class="board-circle"
                :class="'status-' + board.status"
                :title="getTooltip(board)"
              >
                <span
                  v-if="board.achievement === 'gold'"
                  class="medal gold-medal"
                >&#9733;</span>
                <span
                  v-else-if="board.achievement === 'silver'"
                  class="medal silver-medal"
                >&#9733;</span>
                <span class="board-num">{{ board.boardNumber }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Day-by-day progress -->
      <section class="progress-section">
        <h3>Recent Activity</h3>
        <div v-if="dailyProgress.length === 0" class="no-data">
          No activity recorded yet.
        </div>
        <div v-else>
          <div v-for="day in dailyProgress" :key="day.date" class="day-card">
            <div class="day-header">
              <span class="day-date">{{ formatDate(day.date) }}</span>
              <span class="day-summary">{{ day.totalBoards }} board{{ day.totalBoards !== 1 ? 's' : '' }}</span>
            </div>
            <div class="day-lessons">
              <div v-for="lesson in day.lessons" :key="lesson.subfolder" class="day-lesson-row">
                <button class="day-lesson-name lesson-link" @click="emit('navigate-to-lesson', lesson.subfolder)">{{ formatLessonName(lesson.subfolder) }}</button>
                <div class="day-lesson-counts">
                  <span v-if="lesson.correctCount" class="count count-correct">{{ lesson.correctCount }}</span>
                  <span v-if="lesson.incorrectCount" class="count count-incorrect">{{ lesson.incorrectCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useTeacherRole } from '../composables/useTeacherRole.js'
import { useBoardMastery } from '../composables/useBoardMastery.js'
import { useAccomplishments } from '../composables/useAccomplishments.js'

const props = defineProps({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true }
})

const emit = defineEmits(['back', 'navigate-to-lesson'])

const teacherRole = useTeacherRole()
const mastery = useBoardMastery()
const accomplishments = useAccomplishments()
const loading = ref(false)

const initials = computed(() => {
  const parts = props.studentName.split(' ')
  return parts.map(p => p[0] || '').join('').toUpperCase()
})

onMounted(async () => {
  // Ensure we have this student's observations
  const obs = teacherRole.studentObservations.value[props.studentId]
  if (!obs) {
    loading.value = true
    await teacherRole.fetchStudentObservations(props.studentId)
    loading.value = false
  }
})

const observations = computed(() => {
  return teacherRole.studentObservations.value[props.studentId] || []
})

const summary = computed(() => {
  return teacherRole.getStudentMasterySummary(props.studentId)
})

const lastActiveText = computed(() => {
  return teacherRole.formatTimeSince(summary.value.lastObservationTime)
})

/**
 * Lesson mastery strips — same pattern as AccomplishmentsView
 */
const lessonMasteryList = computed(() => {
  const obs = observations.value
  if (obs.length === 0) return []

  const lessons = mastery.extractLessonsFromObservations(obs)

  return lessons
    .map(lesson => {
      const boardMasteryResults = mastery.computeBoardMastery(
        obs,
        lesson.subfolder,
        lesson.boardNumbers
      )
      const lessonAchievement = mastery.computeLessonAchievement(boardMasteryResults)
      return {
        ...lesson,
        boardMastery: boardMasteryResults,
        achievement: lessonAchievement.achievement
      }
    })
    .sort((a, b) => formatLessonName(a.subfolder).localeCompare(formatLessonName(b.subfolder)))
})

// Fetch board counts for any uncached lessons
watch(lessonMasteryList, (lessons) => {
  mastery.fetchMissingBoardCounts(lessons.map(l => l.subfolder))
}, { immediate: true })

/**
 * Day-by-day progress — same pattern as ProgressDashboard
 */
const dailyProgress = computed(() => {
  const obs = observations.value
  if (obs.length === 0) return []

  // Group by date
  const byDate = {}
  for (const o of obs) {
    const date = o.timestamp.split('T')[0]
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(o)
  }

  const dates = Object.keys(byDate).sort().reverse().slice(0, 10)

  return dates.map(date => {
    const dayObs = byDate[date]
    const lessonMap = {}
    for (const o of dayObs) {
      const subfolder = o.deal_subfolder
      const boardNum = o.deal_number
      if (!subfolder || boardNum == null) continue
      if (!lessonMap[subfolder]) lessonMap[subfolder] = {}
      if (!lessonMap[subfolder][boardNum]) lessonMap[subfolder][boardNum] = []
      lessonMap[subfolder][boardNum].push(o)
    }

    const lessons = Object.entries(lessonMap)
      .map(([subfolder, boards]) => {
        let correctCount = 0
        let incorrectCount = 0
        for (const boardObs of Object.values(boards)) {
          if (boardObs.every(o => o.correct)) correctCount++
          else incorrectCount++
        }
        return { subfolder, correctCount, incorrectCount }
      })
      .sort((a, b) => formatLessonName(a.subfolder).localeCompare(formatLessonName(b.subfolder)))

    const totalBoards = lessons.reduce((sum, l) => sum + l.correctCount + l.incorrectCount, 0)
    return { date, lessons, totalBoards }
  })
})

function formatLessonName(folderName) {
  return accomplishments.formatLessonName(folderName)
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function getTooltip(board) {
  const statusLabels = {
    grey: 'Not attempted',
    red: 'Incorrect',
    yellow: 'Corrected today',
    orange: 'Ready to retry',
    green: 'Correct'
  }
  return `Board ${board.boardNumber}: ${statusLabels[board.status]}`
}
</script>

<style scoped>
.teacher-student-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.detail-header {
  margin-bottom: 24px;
}

.back-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  margin-bottom: 12px;
  display: inline-block;
}

.back-btn:hover {
  color: #5a6fd6;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.student-info h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.last-active {
  font-size: 13px;
  color: #999;
}

/* Loading */
.loading-state {
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stats row */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.stat {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.stat-green { background: #e8f5e9; color: #2e7d32; }
.stat-orange { background: #fff3e0; color: #e65100; }
.stat-yellow { background: #fffde7; color: #f57f17; }
.stat-red { background: #ffebee; color: #c62828; }
.stat-grey { background: #f5f5f5; color: #757575; }

/* Sections */
.mastery-section,
.progress-section {
  margin-bottom: 28px;
}

.mastery-section h3,
.progress-section h3 {
  font-size: 14px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 20px;
}

/* Lesson mastery */
.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lesson-row {
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
}

.lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.lesson-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}

.lesson-link:hover {
  text-decoration: underline;
  color: #667eea;
}

.lesson-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.achievement-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.achievement-badge.gold {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #5d4037;
}

.achievement-badge.silver {
  background: linear-gradient(135deg, #e0e0e0, #bdbdbd);
  color: #424242;
}

/* Mastery strip (inline circles, same visual as BoardMasteryStrip) */
.mastery-strip {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.board-circle {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
}

.status-grey { background: #ccc; color: #666; }
.status-red { background: #ef5350; color: white; }
.status-yellow { background: #ffc107; color: #333; }
.status-orange { background: #ff9800; color: white; }
.status-green { background: #4caf50; color: white; }

.medal {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 14px;
  z-index: 1;
  line-height: 1;
}

.gold-medal {
  color: #ffd700;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

.silver-medal {
  color: #c0c0c0;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

.board-num {
  position: relative;
  z-index: 0;
}

/* Day-by-day progress */
.day-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.day-date {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.day-summary {
  font-size: 12px;
  color: #999;
}

.day-lessons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-lesson-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
}

.day-lesson-name {
  font-size: 13px;
  color: #555;
}

.day-lesson-counts {
  display: flex;
  gap: 6px;
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
}

.count-correct { background: #4caf50; color: white; }
.count-incorrect { background: #ef5350; color: white; }

/* Responsive */
@media (max-width: 600px) {
  .teacher-student-detail {
    padding: 0 12px;
  }

  .board-circle {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .medal {
    font-size: 12px;
    top: -5px;
    right: -5px;
  }
}
</style>
