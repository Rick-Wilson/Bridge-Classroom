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
      <!-- Lesson Mastery Strips -->
      <section class="mastery-section">
        <h3>Lesson Mastery</h3>
        <div v-if="lessonMasteryList.length === 0" class="no-data">
          No lesson data available yet.
        </div>
        <div v-else class="lesson-list">
          <div v-for="lesson in lessonMasteryList" :key="lesson.subfolder" class="lesson-row">
            <div class="lesson-header">
              <span class="lesson-name">{{ formatLessonName(lesson.subfolder) }}</span>
              <span
                v-if="lesson.achievement !== 'none'"
                :class="['achievement-badge', lesson.achievement]"
              >
                &#9733; {{ lesson.achievement === 'gold' ? 'Gold' : 'Silver' }}
              </span>
            </div>
            <BoardMasteryStrip
              :boardNumbers="lesson.boardNumbers"
              :lessonSubfolder="lesson.subfolder"
              :currentIndex="-1"
              :alignLeft="true"
              @goto="(boardIndex) => onBoardClick(lesson.subfolder, lesson.boardNumbers[boardIndex])"
            />
          </div>
        </div>
      </section>

      <!-- Recent Skills -->
      <section class="recent-section" v-if="recentSkills.length > 0">
        <h3>Recent Skills</h3>
        <div class="recent-skills">
          <div v-for="skill in recentSkills" :key="skill.subfolder" class="skill-card">
            <div class="skill-name">{{ formatLessonName(skill.subfolder) }}</div>
            <div class="skill-counts">
              <span v-if="skill.greenCount" class="count count-green">{{ skill.greenCount }}</span>
              <span v-if="skill.orangeCount" class="count count-orange">{{ skill.orangeCount }}</span>
              <span v-if="skill.yellowCount" class="count count-yellow">{{ skill.yellowCount }}</span>
              <span v-if="skill.redCount" class="count count-red">{{ skill.redCount }}</span>
              <span v-if="skill.greyCount" class="count count-grey">{{ skill.greyCount }}</span>
            </div>
            <div class="skill-time">{{ formatRelativeTime(skill.lastActivity) }}</div>
          </div>
        </div>
      </section>

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
import { computed, onMounted, watch } from 'vue'
import { useStudentProgress } from '../composables/useStudentProgress.js'
import { useBoardMastery } from '../composables/useBoardMastery.js'
import { useAccomplishments } from '../composables/useAccomplishments.js'
import BoardMasteryStrip from './BoardMasteryStrip.vue'

const emit = defineEmits(['close', 'navigate-to-deal'])

const progress = useStudentProgress()
const mastery = useBoardMastery()
const accomplishments = useAccomplishments()

onMounted(async () => {
  await progress.fetchProgress()
})

async function refresh() {
  await progress.fetchProgress(true)
}

/**
 * All lessons with mastery data, sorted alphabetically
 */
const lessonMasteryList = computed(() => {
  const observations = mastery.getObservations()
  const lessons = mastery.extractLessonsFromObservations(observations)

  return lessons
    .map(lesson => {
      const boardMasteryResults = mastery.computeBoardMastery(
        observations,
        lesson.subfolder,
        lesson.boardNumbers
      )
      const lessonAchievement = mastery.computeLessonAchievement(boardMasteryResults)
      return {
        ...lesson,
        achievement: lessonAchievement.achievement
      }
    })
    .sort((a, b) => formatLessonName(a.subfolder).localeCompare(formatLessonName(b.subfolder)))
})

// Fetch board counts from GitHub for any lessons not in cache
watch(lessonMasteryList, (lessons) => {
  mastery.fetchMissingBoardCounts(lessons.map(l => l.subfolder))
})

/**
 * Last 5 most recently practiced lessons with status counts
 */
const recentSkills = computed(() => {
  const observations = mastery.getObservations()
  const lessons = mastery.extractLessonsFromObservations(observations)

  // Sort by most recent activity, take 5
  const recent = lessons
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
    .slice(0, 5)

  return recent.map(lesson => {
    const boardMasteryResults = mastery.computeBoardMastery(
      observations,
      lesson.subfolder,
      lesson.boardNumbers
    )

    const counts = { green: 0, orange: 0, yellow: 0, red: 0, grey: 0 }
    for (const board of boardMasteryResults) {
      counts[board.status] = (counts[board.status] || 0) + 1
    }

    return {
      subfolder: lesson.subfolder,
      lastActivity: lesson.lastActivity,
      greenCount: counts.green,
      orangeCount: counts.orange,
      yellowCount: counts.yellow,
      redCount: counts.red,
      greyCount: counts.grey
    }
  })
})

function onBoardClick(subfolder, dealNumber) {
  emit('navigate-to-deal', { subfolder, dealNumber })
}

function formatLessonName(folderName) {
  return accomplishments.formatLessonName(folderName)
}

function formatRelativeTime(timestamp) {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}
</script>

<style scoped>
.progress-dashboard {
  background: white;
  border-radius: 12px;
  max-width: 600px;
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
  padding: 20px;
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

/* Mastery section */
.mastery-section,
.recent-section {
  margin-bottom: 24px;
}

.mastery-section h3,
.recent-section h3 {
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

/* Recent Skills */
.recent-skills {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fafafa;
  border-radius: 8px;
}

.skill-name {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.skill-counts {
  display: flex;
  gap: 6px;
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.count-green {
  background: #4caf50;
  color: white;
}

.count-orange {
  background: #ff9800;
  color: white;
}

.count-yellow {
  background: #ffc107;
  color: #333;
}

.count-red {
  background: #ef5350;
  color: white;
}

.count-grey {
  background: #ccc;
  color: #666;
}

.skill-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

/* Actions */
.dashboard-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
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
