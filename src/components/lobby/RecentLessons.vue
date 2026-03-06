<template>
  <div v-if="hasRecentLessons" class="recent-lessons">
    <div class="section-header">
      <h3 class="section-title">Pick up where you left off</h3>
      <button
        v-if="totalStartedLessons > recentLessons.length"
        class="view-all-link"
        @click="$emit('show-progress')"
      >
        All started lessons &rarr;
      </button>
    </div>

    <div class="lesson-cards">
      <div
        v-for="lesson in recentLessons"
        :key="lesson.subfolder"
        class="lesson-card"
      >
        <div class="card-top">
          <div class="card-titles">
            <span v-if="lesson.collectionName" class="collection-label">
              {{ lesson.collectionName.toUpperCase() }}
            </span>
            <span class="lesson-name">{{ lesson.displayName }}</span>
            <span class="board-count">{{ boardProgressText(lesson) }}</span>
          </div>
          <div class="card-right">
            <span class="relative-time">{{ lesson.relativeTime }}</span>
            <button
              class="resume-btn"
              @click.stop="$emit('resume-lesson', {
                subfolder: lesson.subfolder,
                dealNumber: lesson.resumeDealNumber
              })"
            >
              Resume
            </button>
          </div>
        </div>

        <div v-if="lesson.untried > 0" class="untried-badge">
          {{ lesson.untried }} untried board{{ lesson.untried !== 1 ? 's' : '' }}
        </div>

        <div class="mastery-bar">
          <div
            class="segment mastered"
            :style="{ width: segmentPct(lesson, 'mastered') }"
          ></div>
          <div
            class="segment progressing"
            :style="{ width: segmentPct(lesson, 'progressing') }"
          ></div>
        </div>

        <div class="mastery-counts">
          <span v-if="lesson.mastered" class="count mastered-dot">
            {{ lesson.mastered }} Mastered
          </span>
          <span v-if="lesson.progressing" class="count progressing-dot">
            {{ lesson.progressing }} Progressing
          </span>
          <span v-if="lesson.untried" class="count untried-dot">
            {{ lesson.untried }} Untried
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRecentLessons } from '../../composables/useRecentLessons.js'

defineEmits(['resume-lesson', 'show-progress'])

const { recentLessons, hasRecentLessons, totalStartedLessons, ensureBoardCounts } = useRecentLessons()

function segmentPct(lesson, type) {
  if (lesson.totalBoards === 0) return '0%'
  const count = type === 'mastered' ? lesson.mastered : lesson.progressing
  return (count / lesson.totalBoards * 100) + '%'
}

function boardProgressText(lesson) {
  const tried = lesson.mastered + lesson.progressing
  return `${tried} of ${lesson.totalBoards} tried`
}

onMounted(() => {
  ensureBoardCounts()
})
</script>

<style scoped>
.recent-lessons {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 20px;
  color: var(--green-dark, #2d6a4f);
  margin: 0;
}

.view-all-link {
  background: none;
  border: none;
  color: var(--green-dark, #2d6a4f);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
}

.view-all-link:hover {
  text-decoration: underline;
}

.lesson-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.lesson-card {
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  padding: 16px 20px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.card-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.collection-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #6b7280);
}

.lesson-name {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  line-height: 1.2;
}

.board-count {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  margin-top: 2px;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.relative-time {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
}

.resume-btn {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: var(--green-dark, #2d6a4f);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.resume-btn:hover {
  background: var(--green-mid, #40916c);
}

.untried-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  color: #b45309;
  background: #fef3c7;
  padding: 2px 10px;
  border-radius: 10px;
  margin-bottom: 8px;
}

.mastery-bar {
  display: flex;
  height: 8px;
  background: #ddd;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.segment {
  height: 100%;
  transition: width 0.3s ease;
}

.segment.mastered {
  background: #4caf50;
}

.segment.progressing {
  background: #42a5f5;
}

.mastery-counts {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.count::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}

.mastered-dot::before {
  background: #4caf50;
}

.progressing-dot::before {
  background: #42a5f5;
}

.untried-dot::before {
  background: #ccc;
}

@media (max-width: 600px) {
  .lesson-cards {
    grid-template-columns: 1fr;
  }

  .card-top {
    flex-direction: column;
    gap: 8px;
  }

  .card-right {
    flex-direction: row;
    align-items: center;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
