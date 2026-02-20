<template>
  <div class="popular-lessons">
    <h3 class="panel-title">Popular Lessons</h3>
    <div v-if="!lessons.length" class="empty-state">No lesson data yet.</div>
    <div v-else class="table-wrap">
      <table class="lessons-table">
        <thead>
          <tr>
            <th>Lesson</th>
            <th class="num-col">Plays</th>
            <th class="num-col">Users</th>
            <th class="num-col">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lesson in lessons.slice(0, 15)" :key="lesson.deal_subfolder">
            <td class="lesson-name">{{ formatLessonName(lesson.deal_subfolder) }}</td>
            <td class="num-col">{{ lesson.play_count.toLocaleString() }}</td>
            <td class="num-col">{{ lesson.unique_users }}</td>
            <td class="num-col">
              <span class="accuracy-badge" :class="accuracyClass(lesson.accuracy_pct)">
                {{ lesson.accuracy_pct }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  lessons: { type: Array, default: () => [] }
})

function formatLessonName(subfolder) {
  if (!subfolder) return 'Unknown'
  // Convert "BakerBridge/Opening-1NT" to "Opening 1NT"
  const parts = subfolder.split('/')
  const last = parts[parts.length - 1]
  return last.replace(/-/g, ' ')
}

function accuracyClass(pct) {
  if (pct >= 70) return 'high'
  if (pct >= 50) return 'mid'
  return 'low'
}
</script>

<style scoped>
.popular-lessons {
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  padding: 20px;
}

.panel-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 18px;
  color: var(--green-dark, #2d6a4f);
  margin: 0 0 16px 0;
}

.empty-state {
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
  text-align: center;
  padding: 24px;
}

.table-wrap {
  overflow-x: auto;
}

.lessons-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.lessons-table thead th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid #eee;
  font-size: 11px;
  text-transform: uppercase;
  color: #999;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.lessons-table tbody td {
  padding: 8px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.num-col {
  text-align: right;
  white-space: nowrap;
}

.lesson-name {
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
}

.accuracy-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.accuracy-badge.high {
  background: #e8f5e9;
  color: #2e7d32;
}

.accuracy-badge.mid {
  background: #fff3e0;
  color: #e65100;
}

.accuracy-badge.low {
  background: #ffebee;
  color: #c62828;
}
</style>
