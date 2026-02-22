<template>
  <div class="student-progress-panel">
    <!-- Empty state -->
    <div v-if="lessons.length === 0" class="sp-empty">
      <p>No practice data to display yet.</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="sp-header">
        <div class="sp-header-row">
          <span v-if="studentName" class="sp-name-badge">{{ studentName }}</span>
          <span class="sp-meta">{{ lessons.length }} lesson{{ lessons.length !== 1 ? 's' : '' }} &middot; Click any panel to drill down</span>
        </div>
      </div>

      <!-- Activity Chart -->
      <div v-if="activityChartData" class="sp-activity-chart">
        <div class="sp-activity-header">
          Daily practice activity
          <span class="sp-activity-meta">
            {{ totalBoards }} boards &middot; {{ totalObs }} observations
          </span>
        </div>
        <div class="sp-activity-body">
          <div class="sp-activity-svg-wrap">
            <svg width="100%" :viewBox="`0 0 ${activityChartData.svgW} ${activityChartData.barH + 26}`" :style="{ display: 'block', height: activityChartData.barH + 26 + 'px' }">
              <!-- Y axis labels -->
              <text :x="activityChartData.yAxisW - 3" y="12" text-anchor="end" font-size="10" fill="#6b7280">{{ activityChartData.maxCount }}</text>
              <text :x="activityChartData.yAxisW - 3" :y="activityChartData.barH" text-anchor="end" font-size="10" fill="#9ca3af">0</text>
              <line :x1="activityChartData.yAxisW" y1="0" :x2="activityChartData.yAxisW" :y2="activityChartData.barH" stroke="#e5e7eb" stroke-width="1"/>

              <!-- Stacked bars -->
              <g v-for="day in activityChartData.days" :key="day.dayKey">
                <rect
                  v-for="(seg, si) in day.segments" :key="si"
                  :x="day.x" :y="seg.y"
                  :width="activityChartData.barW" :height="seg.h"
                  :fill="seg.color" opacity="0.85" rx="1"
                >
                  <title>{{ seg.name }}: {{ seg.count }} on {{ day.dateLabel }}</title>
                </rect>
              </g>

              <!-- Date labels -->
              <text :x="activityChartData.yAxisW" :y="activityChartData.barH + 18" font-size="10" fill="#6b7280">
                {{ activityChartData.firstLabel }}
              </text>
              <text :x="activityChartData.yAxisW + activityChartData.chartW" :y="activityChartData.barH + 18" text-anchor="end" font-size="10" fill="#6b7280">
                {{ activityChartData.lastLabel }}
              </text>
            </svg>
          </div>
          <!-- Legend -->
          <div class="sp-activity-legend">
            <span v-for="(lesson, li) in lessons" :key="lesson.path" class="sp-activity-legend-item">
              <span class="sp-legend-dot" :style="{ backgroundColor: lessonColor(li) }"></span>
              {{ lesson.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="sp-legend">
        <span v-for="l in legend" :key="l.label" class="sp-legend-item">
          <span class="sp-legend-dot" :style="{ backgroundColor: l.color }"></span>
          {{ l.label }}
        </span>
        <span class="sp-legend-hint">line color = mastery status</span>
      </div>

      <!-- Lesson card grid -->
      <div class="sp-grid">
        <div
          v-for="lesson in lessons" :key="lesson.path"
          class="sp-lesson-card"
          @click="selectedLesson = lesson"
        >
          <!-- Card header -->
          <div class="sp-card-header">
            <div class="sp-card-info">
              <div class="sp-card-name">{{ lesson.name }}</div>
              <div class="sp-card-meta">
                {{ lesson.tried }} boards &middot; {{ lesson.totalAttempts }} attempts &middot;
                last {{ formatDate(lesson.lastActivity) }}{{ formatSpan(lesson) ? ` &middot; span ${formatSpan(lesson)}` : '' }}
              </div>
            </div>
            <div class="sp-card-rate">
              <div class="sp-rate-value" :style="{ color: rateColor(lesson.recentRate) }">
                {{ lesson.recentRate }}%
              </div>
              <div class="sp-rate-label">recent accuracy</div>
            </div>
          </div>

          <!-- Sparkline -->
          <div class="sp-card-sparkline">
            <StudentProgressSparkline :boardLines="lesson.boardLines" :width="280" :height="70" />
          </div>

          <!-- Mastery bar -->
          <div class="sp-mastery">
            <div class="sp-mastery-track">
              <div
                v-for="seg in masterySegments(lesson)" :key="seg.label"
                class="sp-mastery-segment"
                :style="{ width: seg.pct, backgroundColor: seg.color }"
                :title="`${seg.label}: ${seg.count}`"
              ></div>
            </div>
            <div class="sp-mastery-legend">
              <span v-for="seg in masterySegments(lesson)" :key="seg.label" class="sp-mastery-item">
                <span class="sp-legend-dot" :style="{ backgroundColor: seg.color }"></span>
                {{ seg.count }} {{ seg.label }}
              </span>
            </div>
          </div>

          <!-- Click hint -->
          <div class="sp-card-hint">details &rarr;</div>
        </div>
      </div>
    </template>

    <!-- Details modal -->
    <StudentProgressDetails
      v-if="selectedLesson"
      :lesson="selectedLesson"
      :rawData="observations"
      @close="selectedLesson = null"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { processData, buildLessonMeta, STATUS_COLORS } from '../utils/studentProgressData.js'
import StudentProgressSparkline from './StudentProgressSparkline.vue'
import StudentProgressDetails from './StudentProgressDetails.vue'

const props = defineProps({
  observations: { type: Array, required: true },
  studentName: { type: String, default: '' },
})

const selectedLesson = ref(null)

const lessons = computed(() => {
  if (!props.observations || props.observations.length === 0) return []
  const { lessonTotals, lessonNames } = buildLessonMeta(props.observations)
  return processData(props.observations, lessonTotals, lessonNames)
})

const totalBoards = computed(() => lessons.value.reduce((s, l) => s + l.tried, 0))
const totalObs = computed(() => lessons.value.reduce((s, l) => s + l.totalAttempts, 0))

const legend = [
  { color: '#10b981', label: 'Success (clean)' },
  { color: '#f59e0b', label: 'Corrected (fail then fix within 1 hr)' },
  { color: '#f43f5e', label: 'Fail (uncorrected)' },
]

function lessonColor(index) {
  return `hsl(${Math.round(index * 360 / lessons.value.length)}, 65%, 55%)`
}

function rateColor(rate) {
  if (rate >= 75) return '#10b981'
  if (rate >= 50) return '#f59e0b'
  return '#f43f5e'
}

function formatDate(d) {
  if (!d) return '\u2014'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSpan(lesson) {
  if (!lesson.firstActivity || !lesson.lastActivity) return null
  const ms = lesson.lastActivity - lesson.firstActivity
  const mins = ms / 60000
  const hours = ms / 3600000
  const days = ms / 86400000
  if (mins < 90) return `${Math.round(mins)} min`
  if (hours < 48) return `${Math.round(hours)} hr`
  if (days < 14) return `${Math.round(days)} days`
  return `${Math.round(days / 7)} wks`
}

function masterySegments(lesson) {
  const untried = Math.max(0, (lesson.totalBoards || 0) - lesson.tried)
  const segments = [
    { count: lesson.mastered, color: STATUS_COLORS.mastered, label: 'Mastered' },
    { count: lesson.progressing, color: STATUS_COLORS.progressing, label: 'Progressing' },
    { count: lesson.struggling, color: STATUS_COLORS.struggling, label: 'Struggling' },
    { count: untried, color: STATUS_COLORS.untried, label: 'Untried' },
  ].filter(s => s.count > 0)
  const sum = segments.reduce((s, seg) => s + seg.count, 0)
  segments.forEach(s => { s.pct = `${(s.count / sum * 100).toFixed(1)}%` })
  return segments
}

// Activity chart data (stacked bars by day per lesson)
const activityChartData = computed(() => {
  if (lessons.value.length === 0) return null

  const DAY = 86400000
  const Y_AXIS_W = 28
  const CHART_W = 700
  const BAR_H = 120

  const allDays = new Set()
  const lessonDays = lessons.value.map(lesson => {
    const buckets = {}
    lesson.boardLines.forEach(bl => {
      bl.points.forEach(p => {
        const dk = Math.floor((p.rawTs ?? 0) / DAY)
        if (dk > 0) {
          buckets[dk] = (buckets[dk] || 0) + 1
          allDays.add(dk)
        }
      })
    })
    return buckets
  })

  if (allDays.size === 0) return null

  const dayKeys = [...allDays].sort()
  const firstDay = dayKeys[0]
  const lastDay = dayKeys[dayKeys.length - 1]
  const spanDays = lastDay - firstDay + 1

  const dayTotals = dayKeys.map(dk =>
    lessonDays.reduce((s, b) => s + (b[dk] || 0), 0)
  )
  const maxCount = Math.max(...dayTotals)
  const barW = Math.max(1, (CHART_W / spanDays) * 0.75)

  const days = dayKeys.map(dk => {
    const x = Y_AXIS_W + ((dk - firstDay) / spanDays) * CHART_W
    let yOffset = BAR_H
    const segments = []
    lessons.value.forEach((lesson, li) => {
      const count = lessonDays[li][dk] || 0
      if (!count) return
      const h = (count / maxCount) * BAR_H
      yOffset -= h
      segments.push({
        y: yOffset,
        h,
        count,
        color: lessonColor(li),
        name: lesson.name,
      })
    })
    return {
      dayKey: dk,
      x,
      segments,
      dateLabel: new Date(dk * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })

  return {
    days,
    maxCount,
    barW,
    barH: BAR_H,
    chartW: CHART_W,
    svgW: Y_AXIS_W + CHART_W,
    yAxisW: Y_AXIS_W,
    firstLabel: new Date(firstDay * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    lastLabel: new Date(lastDay * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
})
</script>

<style scoped>
.student-progress-panel {
  padding: 4px 0;
}

.sp-empty {
  text-align: center;
  color: var(--text-muted, #9ca3af);
  padding: 40px 20px;
}

/* Header */
.sp-header {
  margin-bottom: 16px;
}

.sp-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sp-name-badge {
  font-size: 11px;
  background: var(--bg-warm, #f5f3ef);
  color: var(--text-secondary, #6b7280);
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid var(--card-border, #e0ddd7);
}

.sp-meta {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

/* Legend */
.sp-legend {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.sp-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary, #6b7280);
}

.sp-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.sp-legend-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted, #9ca3af);
}

/* Activity chart */
.sp-activity-chart {
  margin-bottom: 20px;
  background: #fafafa;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid var(--card-border, #e0ddd7);
}

.sp-activity-header {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  font-weight: 500;
  margin-bottom: 10px;
}

.sp-activity-meta {
  font-weight: 400;
  color: var(--text-muted, #9ca3af);
  margin-left: 10px;
}

.sp-activity-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.sp-activity-svg-wrap {
  flex: 1;
  min-width: 0;
}

.sp-activity-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.sp-activity-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
}

/* Lesson card grid */
.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.sp-lesson-card {
  background: #fafafa;
  border: 1px solid var(--card-border, #e0ddd7);
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.sp-lesson-card:hover {
  border-color: var(--blue, #3b82f6);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
}

.sp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.sp-card-info {
  flex: 1;
  min-width: 0;
}

.sp-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  line-height: 1.3;
}

.sp-card-meta {
  font-size: 10px;
  color: var(--text-muted, #9ca3af);
  margin-top: 2px;
}

.sp-card-rate {
  text-align: right;
  flex-shrink: 0;
  margin-left: 12px;
}

.sp-rate-value {
  font-size: 18px;
  font-weight: 700;
  font-family: monospace;
}

.sp-rate-label {
  font-size: 9px;
  color: var(--text-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sp-card-sparkline {
  margin-bottom: 10px;
}

/* Mastery bar */
.sp-mastery-track {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  gap: 1px;
}

.sp-mastery-segment {
  transition: width 0.5s ease;
}

.sp-mastery-legend {
  display: flex;
  gap: 10px;
  margin-top: 5px;
  flex-wrap: wrap;
}

.sp-mastery-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--text-muted, #9ca3af);
}

.sp-card-hint {
  position: absolute;
  bottom: 6px;
  right: 10px;
  font-size: 9px;
  color: var(--text-muted, #9ca3af);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Responsive */
@media (max-width: 700px) {
  .sp-grid {
    grid-template-columns: 1fr;
  }

  .sp-activity-body {
    flex-direction: column;
  }

  .sp-legend-hint {
    margin-left: 0;
    width: 100%;
  }
}
</style>
