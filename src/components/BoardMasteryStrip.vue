<template>
  <div class="board-mastery-strip" :class="{ 'justify-start': alignLeft }" v-if="boardNumbers.length > 0">
    <button
      v-if="introUrl"
      class="intro-btn"
      @click="emit('open-intro', introUrl)"
      title="View lesson introduction"
    >
      Intro
    </button>
    <div
      v-for="(board, index) in boardMastery"
      :key="board.boardNumber"
      class="board-indicator"
      :class="[
        `status-${board.status}`,
        { active: index === currentIndex },
        { 'has-medal': board.achievement !== 'none' },
        { 'medal-gold': board.achievement === 'gold' },
        { 'medal-silver': board.achievement === 'silver' }
      ]"
      @click="emit('goto', index)"
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
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useBoardStatus } from '../composables/useBoardStatus.js'
import { useBoardMastery } from '../composables/useBoardMastery.js'
import { useUserStore } from '../composables/useUserStore.js'

const props = defineProps({
  boardNumbers: {
    type: Array,
    required: true
  },
  lessonSubfolder: {
    type: String,
    required: true
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  forceBoardStatus: {
    type: Object,
    default: null
  },
  introUrl: {
    type: String,
    default: null
  },
  alignLeft: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['goto', 'open-intro'])

const boardStatusApi = useBoardStatus()
const mastery = useBoardMastery()
const userStore = useUserStore()
const apiBoards = ref([])
const useApi = ref(false)

// Fetch board status from API
async function loadBoardStatus() {
  const uid = props.userId || userStore.currentUser.value?.id
  if (!uid || !props.lessonSubfolder) return

  try {
    const boards = await boardStatusApi.fetchBoardStatus(uid, props.lessonSubfolder)
    if (boards.length > 0) {
      apiBoards.value = boards
      useApi.value = true
    }
  } catch {
    // Fall back to local computation
  }
}

onMounted(loadBoardStatus)
watch(() => props.lessonSubfolder, loadBoardStatus)
watch(() => boardStatusApi.cacheVersion.value, loadBoardStatus)

const boardMastery = computed(() => {
  let results

  if (useApi.value && apiBoards.value.length > 0) {
    // API path: use server-computed board status
    results = boardStatusApi.buildBoardMastery(apiBoards.value, props.boardNumbers)
    // Overlay local pending observations
    boardStatusApi.mergeLocalPending(results, props.lessonSubfolder)
  } else {
    // Fallback: local computation (offline or no API data yet)
    results = mastery.computeBoardMastery(
      mastery.getObservations(),
      props.lessonSubfolder,
      props.boardNumbers
    )
  }

  // Local override: force a board status during mid-board play
  if (props.forceBoardStatus) {
    const board = results.find(b => b.boardNumber === props.forceBoardStatus.board)
    if (board) board.status = props.forceBoardStatus.status
  }
  return results
})

function getTooltip(board) {
  const statusLabels = {
    grey: 'Not attempted',
    red: 'Failed',
    yellow: 'Corrected (recent)',
    orange: 'Corrected \u2014 ready to retry',
    blue: 'Correct (try again after cooldown)',
    green: 'Clean correct'
  }
  const achievementLabels = {
    none: '',
    silver: ' | Silver star',
    gold: ' | Gold star'
  }
  return `Board ${board.boardNumber}: ${statusLabels[board.status] || board.status}${achievementLabels[board.achievement] || ''}`
}
</script>

<style scoped>
.board-mastery-strip {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.board-mastery-strip.justify-start {
  justify-content: flex-start;
}

.intro-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
  letter-spacing: 0.3px;
}

.intro-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.board-indicator {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
}

.board-indicator:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Current status colors */
.status-grey {
  background: #ccc;
  color: #666;
}

.status-red {
  background: #ef5350;
  color: white;
}

.status-yellow {
  background: #ffeb3b;
  color: #333;
}

.status-orange {
  background: #ff9800;
  color: white;
}

.status-blue {
  background: #42a5f5;
  color: white;
}

.status-green {
  background: #4caf50;
  color: white;
}

/* Active board highlight — pseudo-element ring avoids outline layout quirks */
.board-indicator.active::before {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 3px solid #1976d2;
  pointer-events: none;
}

/* Medal overlay */
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

/* Medal + bad status: add a colored ring to make both visible */
.has-medal.status-red {
  box-shadow: 0 0 0 2px white, 0 0 0 4px #ef5350;
}

.has-medal.status-yellow {
  box-shadow: 0 0 0 2px white, 0 0 0 4px #ffc107;
}

.has-medal.status-orange {
  box-shadow: 0 0 0 2px white, 0 0 0 4px #ff9800;
}

.has-medal.status-blue {
  box-shadow: 0 0 0 2px white, 0 0 0 4px #42a5f5;
}

/* Board number text */
.board-num {
  position: relative;
  z-index: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .board-mastery-strip {
    gap: 4px;
    padding: 6px 8px;
  }

  .board-indicator {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .intro-btn {
    height: 28px;
    padding: 0 10px;
    border-radius: 14px;
    font-size: 11px;
  }

  .board-indicator.active::before {
    inset: -4px;
    border-width: 2px;
  }

  .medal {
    font-size: 12px;
    top: -5px;
    right: -5px;
  }
}
</style>
