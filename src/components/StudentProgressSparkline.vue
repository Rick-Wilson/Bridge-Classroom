<template>
  <div v-if="!boardLines || boardLines.length === 0" class="sparkline-empty">
    No data
  </div>
  <svg v-else :width="width" :height="height" style="overflow: visible">
    <!-- Y gridlines at quality levels -->
    <line
      v-for="q in QUALITY_LEVELS"
      :key="q"
      :x1="pad.l" :y1="gridY(q)" :x2="pad.l + chartW" :y2="gridY(q)"
      :stroke="q === 0.5 ? '#d1d5db' : '#e5e7eb'"
      :stroke-width="q === 0.5 ? 1 : 0.5"
      :stroke-dasharray="q === 0.5 ? '3,3' : 'none'"
    />

    <!-- Connecting lines per board -->
    <path
      v-for="(bs, bi) in boardSequences"
      :key="'line-' + bi"
      v-show="bs.pts.length >= 2"
      :d="bs.pathD"
      fill="none"
      :stroke="bs.color"
      stroke-width="1"
      stroke-linejoin="round"
      stroke-linecap="round"
      opacity="0.35"
    />

    <!-- Bubbles -->
    <circle
      v-for="(b, i) in bubbles"
      :key="'bubble-' + i"
      :cx="b.px" :cy="b.py"
      :r="BASE_R * Math.sqrt(b.n)"
      :fill="yColor(b.y)"
      stroke="#fff" stroke-width="0.8"
      opacity="0.85"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { STATUS_COLORS, yColor } from '../utils/studentProgressData.js'

const props = defineProps({
  boardLines: { type: Array, required: true },
  width: { type: Number, default: 280 },
  height: { type: Number, default: 70 },
})

const QUALITY_LEVELS = [1.0, 0.5, 0.0]
const MERGE_R = 5
const BASE_R = 2.5
const pad = { l: 4, r: 4, t: 8, b: 8 }

const chartW = computed(() => props.width - pad.l - pad.r)
const chartH = computed(() => props.height - pad.t - pad.b)

const xRange = computed(() => {
  const allX = props.boardLines.flatMap(bl => bl.points.map(p => p.x))
  const xMin = Math.min(...allX)
  const xMax = Math.max(...allX)
  return { min: xMin, max: xMax, span: xMax - xMin || 1 }
})

function gridY(q) {
  return pad.t + (1 - q) * chartH.value
}

function toSvg(x, y) {
  const yMapped = y >= 0.9 ? 1.0 : y > 0.0 ? 0.5 : 0.0
  return {
    px: pad.l + ((x - xRange.value.min) / xRange.value.span) * chartW.value,
    py: pad.t + (1 - yMapped) * chartH.value,
    yMapped,
  }
}

const boardSequences = computed(() => {
  return props.boardLines.map(bl => {
    const color = STATUS_COLORS[bl.status] || '#6b7280'
    const pts = bl.points.filter(p => p.y !== 0.75).map(p => toSvg(p.x, p.y))
    const pathD = pts.length >= 2
      ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ')
      : ''
    return { color, pts, pathD }
  })
})

const bubbles = computed(() => {
  const allPts = props.boardLines.flatMap(bl =>
    bl.points.filter(p => p.y !== 0.75).map(p => ({ ...toSvg(p.x, p.y), y: p.y }))
  )

  const used = new Array(allPts.length).fill(false)
  const result = []
  allPts.forEach((pt, i) => {
    if (used[i]) return
    const cluster = [pt]
    used[i] = true
    allPts.forEach((other, j) => {
      if (used[j]) return
      const dx = other.px - pt.px, dy = other.py - pt.py
      if (Math.sqrt(dx * dx + dy * dy) < MERGE_R) {
        cluster.push(other)
        used[j] = true
      }
    })
    const avgPx = cluster.reduce((s, p) => s + p.px, 0) / cluster.length
    const avgPy = cluster.reduce((s, p) => s + p.py, 0) / cluster.length
    const dominantY = cluster.sort((a, b) => b.yMapped - a.yMapped)[0].yMapped
    result.push({ px: avgPx, py: avgPy, y: dominantY, n: cluster.length })
  })
  return result
})
</script>

<style scoped>
.sparkline-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #9ca3af);
  font-size: 11px;
  height: 70px;
}
</style>
