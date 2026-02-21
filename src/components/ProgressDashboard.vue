<template>
  <div class="progress-dashboard">
    <header class="dashboard-header">
      <h2>Learning Progress</h2>
      <button class="close-btn" @click="$emit('close')">&times;</button>
    </header>

    <!-- Loading state -->
    <div v-if="learning.isLoading.value" class="loading">
      <div class="spinner"></div>
      <p>Loading your progress...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="learning.hasError.value" class="error-state">
      <p>Failed to load progress: {{ learning.error.value }}</p>
      <button @click="refresh">Try Again</button>
    </div>

    <!-- Not enough data -->
    <div v-else-if="!learning.learningData.value" class="empty-state">
      <h3>Not Enough Data Yet</h3>
      <p>Keep practicing the same boards and you'll see your learning trends here!</p>
      <p class="empty-hint">Boards need at least 3 attempts to show a trend.</p>
      <button class="primary-btn" @click="$emit('close')">Start Practicing</button>
    </div>

    <!-- Learning content -->
    <div v-else class="dashboard-content">
      <!-- Overall summary -->
      <div class="overall-summary">
        <div class="overall-label">Overall</div>
        <div class="overall-trend">
          <span class="pct early">{{ data.overallEarlyPct }}%</span>
          <span class="arrow">&#8594;</span>
          <span class="pct recent">{{ data.overallRecentPct }}%</span>
          <span class="delta" :class="deltaClass(data.overallRecentPct - data.overallEarlyPct)">
            {{ formatDelta(data.overallRecentPct - data.overallEarlyPct) }}
          </span>
        </div>
        <div class="overall-bars">
          <div class="bar-pair">
            <div class="bar-label">Early</div>
            <div class="bar-track"><div class="bar-fill early" :style="{ width: data.overallEarlyPct + '%' }"></div></div>
          </div>
          <div class="bar-pair">
            <div class="bar-label">Now</div>
            <div class="bar-track"><div class="bar-fill recent" :style="{ width: data.overallRecentPct + '%' }"></div></div>
          </div>
        </div>
        <div class="overall-count">{{ data.totalBoardsAnalyzed }} boards analyzed</div>
      </div>

      <!-- Per-skill cards -->
      <div v-for="skill in data.skillLearning" :key="skill.skillPath" class="skill-card">
        <div class="skill-header" @click="toggleSkill(skill.skillPath)">
          <div class="skill-info">
            <span class="skill-name">{{ skill.skillName }}</span>
            <span class="skill-meta">{{ skill.boardCount }} board{{ skill.boardCount !== 1 ? 's' : '' }} &middot; {{ skill.earlyPct }}% &#8594; {{ skill.recentPct }}%</span>
          </div>
          <span class="skill-delta" :class="deltaClass(skill.improvement)">
            {{ formatDelta(skill.improvement) }}
          </span>
        </div>

        <!-- Board details (expanded) -->
        <div v-if="expandedSkills.has(skill.skillPath)" class="skill-boards">
          <div
            v-for="board in skill.boards"
            :key="board.subfolder + board.number"
            class="board-row"
          >
            <span class="board-name">{{ formatLesson(board.subfolder) }} #{{ board.number }}</span>
            <span class="board-attempts">{{ board.attempts }}x</span>
            <span class="board-trend">{{ board.earlyPct }}% &#8594; {{ board.recentPct }}%</span>
            <span class="board-delta" :class="deltaClass(board.improvement)">
              {{ formatDelta(board.improvement) }}
            </span>
          </div>
        </div>

        <!-- Collapsed preview: top improved boards -->
        <div v-else-if="skill.boards.length > 0" class="skill-preview">
          <div
            v-for="board in topBoards(skill.boards)"
            :key="board.subfolder + board.number"
            class="preview-row"
          >
            <span class="preview-name">{{ formatLesson(board.subfolder) }} #{{ board.number }}:</span>
            <span class="preview-trend">{{ board.earlyPct }}% &#8594; {{ board.recentPct }}%</span>
          </div>
          <div v-if="skill.boards.length > 3" class="preview-more" @click="toggleSkill(skill.skillPath)">
            +{{ skill.boards.length - 3 }} more boards...
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="dashboard-actions">
        <button class="secondary-btn" @click="refresh">Refresh Data</button>
        <button class="primary-btn" @click="$emit('close')">Continue Practicing</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLearningProgress } from '../composables/useLearningProgress.js'
import { useAccomplishments } from '../composables/useAccomplishments.js'

defineEmits(['close'])

const learning = useLearningProgress()
const accomplishments = useAccomplishments()
const expandedSkills = ref(new Set())

const data = computed(() => learning.learningData.value)

onMounted(async () => {
  await learning.fetchProgress()
})

async function refresh() {
  await learning.fetchProgress(true)
}

function toggleSkill(skillPath) {
  const next = new Set(expandedSkills.value)
  if (next.has(skillPath)) {
    next.delete(skillPath)
  } else {
    next.add(skillPath)
  }
  expandedSkills.value = next
}

function topBoards(boards) {
  return boards.slice(0, 3)
}

function formatLesson(subfolder) {
  return accomplishments.formatLessonName(subfolder)
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
  border-radius: 12px 12px 0 0;
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
  to { transform: rotate(360deg); }
}

.error-state { color: #d32f2f; }
.error-state button {
  margin-top: 16px;
  padding: 8px 16px;
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state h3 { color: #666; margin-bottom: 8px; }
.empty-state p { color: #999; margin-bottom: 8px; }
.empty-hint { font-size: 13px; margin-bottom: 20px; }

/* Overall summary */
.overall-summary {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.overall-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999;
  margin-bottom: 6px;
}

.overall-trend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.pct {
  font-size: 22px;
  font-weight: 700;
}

.pct.early { color: #999; }
.pct.recent { color: #333; }

.arrow {
  color: #bbb;
  font-size: 18px;
}

.delta {
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.delta.positive { background: #e8f5e9; color: #2e7d32; }
.delta.negative { background: #ffebee; color: #c62828; }
.delta.neutral { background: #f5f5f5; color: #999; }

.overall-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.bar-pair {
  display: flex;
  align-items: center;
  gap: 8px;
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

.overall-count {
  font-size: 12px;
  color: #999;
  text-align: center;
}

/* Skill cards */
.skill-card {
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.skill-header:hover {
  background: #f0f0f0;
}

.skill-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.skill-meta {
  font-size: 12px;
  color: #999;
}

.skill-delta {
  font-size: 14px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

.skill-delta.positive { background: #e8f5e9; color: #2e7d32; }
.skill-delta.negative { background: #ffebee; color: #c62828; }
.skill-delta.neutral { background: #f5f5f5; color: #999; }

/* Board details (expanded) */
.skill-boards {
  padding: 0 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.board-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
  font-size: 13px;
}

.board-name {
  flex: 1;
  color: #555;
}

.board-attempts {
  color: #bbb;
  font-size: 11px;
}

.board-trend {
  color: #666;
  font-size: 12px;
}

.board-delta {
  font-size: 12px;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

.board-delta.positive { color: #2e7d32; }
.board-delta.negative { color: #c62828; }
.board-delta.neutral { color: #999; }

/* Collapsed preview */
.skill-preview {
  padding: 0 14px 10px;
}

.preview-row {
  font-size: 12px;
  color: #777;
  padding: 2px 0;
}

.preview-name {
  color: #999;
}

.preview-trend {
  color: #555;
}

.preview-more {
  font-size: 12px;
  color: #667eea;
  cursor: pointer;
  padding-top: 2px;
}

.preview-more:hover {
  text-decoration: underline;
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
