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
                class="board-circle board-clickable"
                :class="'status-' + board.status"
                :title="getTooltip(board)"
                @click="emit('navigate-to-lesson', lesson.subfolder, board.boardNumber)"
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

      <!-- Learning progress -->
      <section class="progress-section">
        <h3>Learning Progress</h3>
        <div v-if="!learningData" class="no-data">
          Not enough repeat practice yet to show learning trends.
        </div>
        <div v-else>
          <!-- Overall summary -->
          <div class="learning-overall">
            <div class="learning-overall-trend">
              <span class="pct early">{{ learningData.overallEarlyPct }}%</span>
              <span class="arrow">&#8594;</span>
              <span class="pct recent">{{ learningData.overallRecentPct }}%</span>
              <span class="learning-delta" :class="deltaClass(learningData.overallRecentPct - learningData.overallEarlyPct)">
                {{ formatDelta(learningData.overallRecentPct - learningData.overallEarlyPct) }}
              </span>
            </div>
            <div class="learning-bar-row">
              <span class="bar-label">Early</span>
              <div class="bar-track"><div class="bar-fill early" :style="{ width: learningData.overallEarlyPct + '%' }"></div></div>
            </div>
            <div class="learning-bar-row">
              <span class="bar-label">Now</span>
              <div class="bar-track"><div class="bar-fill recent" :style="{ width: learningData.overallRecentPct + '%' }"></div></div>
            </div>
            <div class="learning-count">{{ learningData.totalBoardsAnalyzed }} boards analyzed</div>
          </div>

          <!-- Per-skill cards -->
          <div v-for="skill in learningData.skillLearning" :key="skill.skillPath" class="learning-skill-card">
            <div class="learning-skill-header" @click="toggleLearningSkill(skill.skillPath)">
              <div class="learning-skill-info">
                <span class="learning-skill-name">{{ skill.skillName }}</span>
                <span class="learning-skill-meta">{{ skill.boardCount }} board{{ skill.boardCount !== 1 ? 's' : '' }} &middot; {{ skill.earlyPct }}% &#8594; {{ skill.recentPct }}%</span>
              </div>
              <span class="learning-delta" :class="deltaClass(skill.improvement)">
                {{ formatDelta(skill.improvement) }}
              </span>
            </div>

            <!-- Expanded board details -->
            <div v-if="expandedLearningSkills.has(skill.skillPath)" class="learning-boards">
              <div
                v-for="board in skill.boards"
                :key="board.subfolder + board.number"
                class="learning-board-row"
              >
                <span class="learning-board-name">{{ formatLessonName(board.subfolder) }} #{{ board.number }}</span>
                <span class="learning-board-attempts">{{ board.attempts }}x</span>
                <span class="learning-board-trend">{{ board.earlyPct }}% &#8594; {{ board.recentPct }}%</span>
                <span class="learning-delta-sm" :class="deltaClass(board.improvement)">
                  {{ formatDelta(board.improvement) }}
                </span>
              </div>
            </div>

            <!-- Collapsed preview -->
            <div v-else-if="skill.boards.length > 0" class="learning-preview">
              <div
                v-for="board in skill.boards.slice(0, 3)"
                :key="board.subfolder + board.number"
                class="learning-preview-row"
              >
                <span class="learning-preview-name">{{ formatLessonName(board.subfolder) }} #{{ board.number }}:</span>
                <span class="learning-preview-trend">{{ board.earlyPct }}% &#8594; {{ board.recentPct }}%</span>
              </div>
              <div v-if="skill.boards.length > 3" class="learning-preview-more" @click="toggleLearningSkill(skill.skillPath)">
                +{{ skill.boards.length - 3 }} more boards...
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="observation-total">{{ observations.length }} observations</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useTeacherRole } from '../composables/useTeacherRole.js'
import { useBoardMastery } from '../composables/useBoardMastery.js'
import { useAccomplishments } from '../composables/useAccomplishments.js'
import { computeLearningData } from '../composables/useLearningProgress.js'

const props = defineProps({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true }
})

const emit = defineEmits(['back', 'navigate-to-lesson'])

const teacherRole = useTeacherRole()
const mastery = useBoardMastery()
const accomplishments = useAccomplishments()
const loading = ref(false)
const expandedLearningSkills = ref(new Set())

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

const learningData = computed(() => {
  return computeLearningData(observations.value)
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

function toggleLearningSkill(skillPath) {
  const next = new Set(expandedLearningSkills.value)
  if (next.has(skillPath)) {
    next.delete(skillPath)
  } else {
    next.add(skillPath)
  }
  expandedLearningSkills.value = next
}

function formatDelta(value) {
  if (value > 0) return '+' + value
  if (value < 0) return '' + value
  return '0'
}

function deltaClass(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

function formatLessonName(folderName) {
  return accomplishments.formatLessonName(folderName)
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

.board-clickable {
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.board-clickable:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.status-grey { background: #ccc; color: #666; }
.status-red { background: #ef5350; color: white; }
.status-yellow { background: #ffeb3b; color: #333; }
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
  color: #e8e8e8;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.board-num {
  position: relative;
  z-index: 0;
}

/* Learning progress */
.learning-overall {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}

.learning-overall-trend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.pct { font-size: 20px; font-weight: 700; }
.pct.early { color: #999; }
.pct.recent { color: #333; }
.arrow { color: #bbb; font-size: 16px; }

.learning-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.bar-label {
  font-size: 11px;
  color: #999;
  width: 32px;
  text-align: right;
}

.bar-track {
  flex: 1;
  height: 8px;
  background: #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.bar-fill.early { background: #bdbdbd; }
.bar-fill.recent { background: #4caf50; }

.learning-count {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin-top: 6px;
}

.learning-delta {
  font-size: 14px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

.learning-delta.positive { background: #e8f5e9; color: #2e7d32; }
.learning-delta.negative { background: #ffebee; color: #c62828; }
.learning-delta.neutral { background: #f5f5f5; color: #999; }

.learning-skill-card {
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.learning-skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.learning-skill-header:hover { background: #f0f0f0; }

.learning-skill-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.learning-skill-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.learning-skill-meta {
  font-size: 12px;
  color: #999;
}

.learning-boards {
  padding: 0 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.learning-board-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
  font-size: 13px;
}

.learning-board-name { flex: 1; color: #555; }
.learning-board-attempts { color: #bbb; font-size: 11px; }
.learning-board-trend { color: #666; font-size: 12px; }

.learning-delta-sm {
  font-size: 12px;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

.learning-delta-sm.positive { color: #2e7d32; }
.learning-delta-sm.negative { color: #c62828; }
.learning-delta-sm.neutral { color: #999; }

.learning-preview { padding: 0 14px 10px; }

.learning-preview-row {
  font-size: 12px;
  color: #777;
  padding: 2px 0;
}

.learning-preview-name { color: #999; }
.learning-preview-trend { color: #555; }

.learning-preview-more {
  font-size: 12px;
  color: #667eea;
  cursor: pointer;
  padding-top: 2px;
}

.learning-preview-more:hover { text-decoration: underline; }

.observation-total {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 12px;
}

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
