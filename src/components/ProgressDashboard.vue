<template>
  <div class="progress-dashboard">
    <header class="dashboard-header">
      <h2>Your Progress</h2>
      <button class="close-btn" @click="$emit('close')">&times;</button>
    </header>

    <!-- Loading state -->
    <div v-if="progress.isLoading.value" class="loading">
      <div class="spinner"></div>
      <p>Loading your progress...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="progress.hasError.value" class="error-state">
      <p>Failed to load progress: {{ progress.error.value }}</p>
      <button @click="refresh">Try Again</button>
    </div>

    <!-- No data state -->
    <div v-else-if="!progress.hasData.value" class="empty-state">
      <h3>No Practice Data Yet</h3>
      <p>Complete some practice deals to see your progress here!</p>
      <button class="primary-btn" @click="$emit('close')">Start Practicing</button>
    </div>

    <!-- Dashboard content -->
    <div v-else class="dashboard-content">
      <div v-for="day in dailyProgress" :key="day.date" class="day-card">
        <div class="day-header">
          <span class="day-date">{{ formatDate(day.date) }}</span>
          <span class="day-summary">{{ day.totalBoards }} board{{ day.totalBoards !== 1 ? 's' : '' }} practiced</span>
        </div>
        <div class="day-lessons">
          <div v-for="lesson in day.lessons" :key="lesson.subfolder" class="day-lesson-row">
            <span class="day-lesson-name">{{ formatLessonName(lesson.subfolder) }}</span>
            <div class="day-lesson-counts">
              <span v-if="lesson.correctCount" class="count count-correct">{{ lesson.correctCount }}</span>
              <span v-if="lesson.incorrectCount" class="count count-incorrect">{{ lesson.incorrectCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="observation-total">{{ progress.totalObservations.value }} observations</div>

      <!-- Actions -->
      <div class="dashboard-actions">
        <button class="secondary-btn" @click="refresh">
          Refresh Data
        </button>
        <button class="primary-btn" @click="$emit('close')">
          Continue Practicing
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStudentProgress } from '../composables/useStudentProgress.js'
import { useAccomplishments } from '../composables/useAccomplishments.js'

const emit = defineEmits(['close'])

const progress = useStudentProgress()
const accomplishments = useAccomplishments()

onMounted(async () => {
  await progress.fetchProgress()
})

async function refresh() {
  await progress.fetchProgress(true)
}

/**
 * Day-by-day progress: for each practice day, show lessons and per-board correct/incorrect.
 * Only counts each board once per day (correct if all observations for that board that day were correct).
 * Limited to 10 most recent practice days.
 */
const dailyProgress = computed(() => {
  const byDate = progress.getObservationsByDate()
  const dates = Object.keys(byDate).sort().reverse().slice(0, 10)

  return dates.map(date => {
    const dayObs = byDate[date]

    // Group by subfolder, then by board number
    const lessonMap = {}
    for (const obs of dayObs) {
      const subfolder = obs.deal_subfolder || obs.deal?.subfolder
      const boardNum = obs.deal_number ?? obs.deal?.deal_number
      if (!subfolder || boardNum == null) continue

      if (!lessonMap[subfolder]) {
        lessonMap[subfolder] = {}
      }
      if (!lessonMap[subfolder][boardNum]) {
        lessonMap[subfolder][boardNum] = []
      }
      lessonMap[subfolder][boardNum].push(obs)
    }

    // For each lesson, count boards correct vs incorrect for that day
    const lessons = Object.entries(lessonMap)
      .map(([subfolder, boards]) => {
        let correctCount = 0
        let incorrectCount = 0
        for (const boardObs of Object.values(boards)) {
          // A board is "correct" for the day if all observations that day were correct
          const allCorrect = boardObs.every(o => o.correct)
          if (allCorrect) {
            correctCount++
          } else {
            incorrectCount++
          }
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
</script>

<style scoped>
.progress-dashboard {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.dashboard-content {
  padding: 16px 20px;
}

.loading,
.error-state,
.empty-state {
  padding: 40px 20px;
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
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  color: #d32f2f;
}

.error-state button {
  margin-top: 16px;
  padding: 8px 16px;
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state h3 {
  color: #666;
  margin-bottom: 8px;
}

.empty-state p {
  color: #999;
  margin-bottom: 20px;
}

/* Day cards */
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

.count-correct {
  background: #4caf50;
  color: white;
}

.count-incorrect {
  background: #ef5350;
  color: white;
}

.observation-total {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 12px;
}

/* Actions */
.dashboard-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.primary-btn,
.secondary-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.secondary-btn {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.secondary-btn:hover {
  background: #f5f7ff;
}
</style>
