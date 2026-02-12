<template>
  <div class="board-mastery-grid">
    <div class="grid-cards">
      <div
        v-for="board in boardMasteryList"
        :key="board.boardNumber"
        class="board-card"
        :class="[
          `status-${board.status}`,
          { 'has-medal': board.achievement !== 'none' }
        ]"
      >
        <div class="card-header">
          <span
            v-if="board.achievement === 'gold'"
            class="medal-icon gold"
          >&#9733;</span>
          <span
            v-else-if="board.achievement === 'silver'"
            class="medal-icon silver"
          >&#9733;</span>
          <span class="card-board-num">{{ board.boardNumber }}</span>
        </div>
        <div class="card-stats">
          <span class="attempt-count">{{ board.attemptCount }} {{ board.attemptCount === 1 ? 'attempt' : 'attempts' }}</span>
          <span v-if="board.lastAttemptTime" class="last-attempt">{{ formatRelativeTime(board.lastAttemptTime) }}</span>
          <span v-else class="last-attempt">Not attempted</span>
        </div>
      </div>
    </div>

    <!-- Sync hint when lesson has observations but board mastery is empty -->
    <div v-if="syncHint" class="sync-hint">
      <span class="sync-hint-icon">&#x26A0;</span>
      <span>{{ syncHint }}</span>
    </div>

    <!-- Lesson-level achievement -->
    <div v-if="lessonAchievement.achievement !== 'none'" class="lesson-achievement">
      <span :class="['achievement-badge', lessonAchievement.achievement]">
        {{ lessonAchievement.achievement === 'gold' ? '&#9733; Gold' : '&#9733; Silver' }} Achievement
      </span>
      <span class="achievement-text">All boards in this lesson!</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBoardMastery } from '../composables/useBoardMastery.js'

const props = defineProps({
  lessonSubfolder: {
    type: String,
    required: true
  },
  observations: {
    type: Array,
    required: true
  }
})

const mastery = useBoardMastery()

// Extract unique board numbers from observations for this lesson
const boardNumbers = computed(() => {
  const nums = new Set()
  for (const obs of props.observations) {
    const bn = obs.deal_number ?? obs.deal?.deal_number
    if (bn != null) nums.add(bn)
  }
  return [...nums].sort((a, b) => a - b)
})

const boardMasteryList = computed(() =>
  mastery.computeBoardMastery(
    mastery.getObservations(),
    props.lessonSubfolder,
    boardNumbers.value
  )
)

const lessonAchievement = computed(() =>
  mastery.computeLessonAchievement(boardMasteryList.value)
)

// Show hint when lesson has observations but board mastery shows no attempts
const syncHint = computed(() => {
  if (props.observations.length === 0) return null
  const totalAttempts = boardMasteryList.value.reduce((sum, b) => sum + b.attemptCount, 0)
  if (totalAttempts > 0) return null
  return 'Board-level mastery requires synced data. Please ensure your device is connected and data is synced.'
})

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
.board-mastery-grid {
  padding: 12px 0;
}

.grid-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.board-card {
  border-radius: 10px;
  padding: 10px 14px;
  min-width: 80px;
  text-align: center;
  transition: transform 0.15s;
}

.board-card:hover {
  transform: translateY(-2px);
}

/* Status colors */
.board-card.status-grey {
  background: #eee;
  color: #666;
}

.board-card.status-red {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

.board-card.status-yellow {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
}

.board-card.status-orange {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

.board-card.status-green {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 4px;
}

.card-board-num {
  font-size: 18px;
  font-weight: 700;
}

.medal-icon {
  font-size: 16px;
}

.medal-icon.gold {
  color: #ffd700;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
}

.medal-icon.silver {
  color: #aaa;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
}

/* Medal + bad status ring */
.board-card.has-medal.status-red {
  box-shadow: inset 0 0 0 2px #ef5350;
}

.board-card.has-medal.status-yellow {
  box-shadow: inset 0 0 0 2px #ffc107;
}

.board-card.has-medal.status-orange {
  box-shadow: inset 0 0 0 2px #ff9800;
}

.card-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attempt-count {
  font-size: 11px;
  font-weight: 500;
}

.last-attempt {
  font-size: 10px;
  opacity: 0.7;
}

/* Lesson-level achievement */
.lesson-achievement {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: #f5f5f5;
  border-radius: 8px;
}

.achievement-badge {
  font-weight: 600;
  font-size: 14px;
  padding: 4px 10px;
  border-radius: 16px;
}

.achievement-badge.gold {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #5d4037;
}

.achievement-badge.silver {
  background: linear-gradient(135deg, #e0e0e0, #bdbdbd);
  color: #424242;
}

.achievement-text {
  font-size: 13px;
  color: #666;
}

/* Sync hint */
.sync-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: #fff3e0;
  border: 1px solid #ffe0b2;
  border-radius: 8px;
  font-size: 13px;
  color: #e65100;
}

.sync-hint-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .board-card {
    min-width: 65px;
    padding: 8px 10px;
  }

  .card-board-num {
    font-size: 16px;
  }
}
</style>
