/**
 * Student Progress Data Processing
 *
 * Pure functions extracted from the React StudentProgress prototype.
 * Framework-agnostic — used by Vue components for lesson-level
 * progress visualization with sparklines, mastery bars, and detail views.
 */

import { getTaxonomyEntry } from './bakerBridgeTaxonomy.js'
import { getSkillFromPath } from './skillPath.js'

const ONE_HOUR = 3600000

/**
 * Classify a deal's mastery status based on attempt history.
 * @param {Array} attempts - [{correct: boolean, ts: Date}] sorted by time
 * @returns {'mastered'|'progressing'|'struggling'|'untried'}
 */
export function classifyDeal(attempts) {
  if (!attempts || attempts.length === 0) return 'untried'
  const sorted = [...attempts].sort((a, b) => a.ts - b.ts)
  const lastCorrect = sorted[sorted.length - 1].correct

  if (!lastCorrect) return 'struggling'

  const last = sorted[sorted.length - 1]
  const recentFail = sorted.slice(0, -1).reverse()
    .find(a => !a.correct && (last.ts - a.ts) < ONE_HOUR)
  const lastClean = !recentFail

  const recent = sorted.slice(-5)
  const recentCorrect = recent.filter(a => a.correct).length
  const recentFails = recent.length - recentCorrect

  if (lastClean && recentCorrect / recent.length >= 0.8 && recentFails <= 1) return 'mastered'

  const recentClean = recent.filter(a => {
    if (!a.correct) return false
    const prevFail = sorted.filter(p => p.ts < a.ts).reverse()
      .find(p => !p.correct && (a.ts - p.ts) < ONE_HOUR)
    return !prevFail
  }).length

  if (recentClean >= 1) return 'progressing'

  return 'struggling'
}

/**
 * Process raw observation data into per-lesson summaries with sparkline data.
 * @param {Array} rawData - [{id, timestamp, skill_path, correct, deal_subfolder, deal_number}]
 * @param {Object} lessonTotals - {skill_path: totalBoardCount}
 * @param {Object} lessonNames - {skill_path: "Display Name"}
 * @returns {Array} Lesson objects sorted by last activity desc
 */
export function processData(rawData, lessonTotals = {}, lessonNames = {}) {
  const byLesson = {}
  rawData.forEach(r => {
    if (!byLesson[r.skill_path]) byLesson[r.skill_path] = {}
    const dn = r.deal_number
    if (!byLesson[r.skill_path][dn]) byLesson[r.skill_path][dn] = []
    byLesson[r.skill_path][dn].push({ correct: r.correct, ts: new Date(r.timestamp), board_result: r.board_result })
  })

  const lessons = Object.entries(byLesson).map(([path, deals]) => {
    const dealNums = Object.keys(deals).map(Number).sort((a, b) => a - b)

    let mastered = 0, progressing = 0, struggling = 0
    dealNums.forEach(dn => {
      const cls = classifyDeal(deals[dn])
      if (cls === 'mastered') mastered++
      else if (cls === 'progressing') progressing++
      else struggling++
    })
    const tried = dealNums.length

    const allAttempts = []
    dealNums.forEach(dn => {
      deals[dn].forEach(a => allAttempts.push({ ...a, dealNum: dn }))
    })
    allAttempts.sort((a, b) => a.ts - b.ts)

    const MIN_SPREAD = 2 * ONE_HOUR

    const boardLines = dealNums.map(dn => {
      const attempts = deals[dn].slice().sort((a, b) => a.ts - b.ts)
      const status = classifyDeal(attempts)
      const lastCorrect = attempts[attempts.length - 1]?.correct ?? false

      const points = attempts.map((a, i) => {
        // Use board_result when available (preferred)
        if (a.board_result === 'corrected') return { ts: a.ts, y: 0.5, correct: a.correct }
        if (a.board_result === 'failed') return { ts: a.ts, y: 0.0, correct: false }

        if (a.correct) {
          const recentFail = attempts.slice(0, i)
            .reverse()
            .find(p => (p.board_result ? p.board_result !== 'correct' : !p.correct) && (a.ts - p.ts) < ONE_HOUR)
          return { ts: a.ts, y: recentFail ? 0.75 : 1.0, correct: true }
        } else {
          const nextSuccess = attempts.slice(i + 1)
            .find(p => p.correct && (p.ts - a.ts) < ONE_HOUR)
          return { ts: a.ts, y: nextSuccess ? 0.5 : 0.0, correct: false }
        }
      })

      // Spread tight clusters so points don't overlap on X
      const CLUSTER_GAP = 5 * 60 * 1000
      const spreadPts = points.map(p => ({ ...p, vts: p.ts.getTime(), rawTs: p.ts.getTime() }))
      let i = 0
      while (i < spreadPts.length) {
        let j = i
        while (j + 1 < spreadPts.length &&
               spreadPts[j + 1].vts - spreadPts[j].vts < CLUSTER_GAP) j++
        if (j > i) {
          const clusterSpan = spreadPts[j].vts - spreadPts[i].vts
          const targetSpan = Math.max(clusterSpan, MIN_SPREAD)
          const scale = clusterSpan > 0 ? targetSpan / clusterSpan : 1
          const base = spreadPts[i].vts
          for (let k = i; k <= j; k++) {
            spreadPts[k].vts = base + (spreadPts[k].vts - base) * scale
          }
        }
        i = j + 1
      }

      return { dealNum: dn, status, lastCorrect, points: spreadPts }
    })

    // Global time range based on real timestamps (rawTs)
    const allRawTs = boardLines.flatMap(bl => bl.points.map(p => p.rawTs))
    const tMin = allRawTs.length ? Math.min(...allRawTs) : 0
    const tMax = allRawTs.length ? Math.max(...allRawTs) : 1
    const tRange = tMax - tMin || 1

    // Normalize x to [0,1] using real timestamps
    boardLines.forEach(bl => {
      bl.points = bl.points.map(p => ({ ...p, x: (p.rawTs - tMin) / tRange }))
    })

    // Recent accuracy: last 5 attempts per board, averaged
    const recentRate = (() => {
      const boardAttempts = Object.values(deals)
      if (boardAttempts.length === 0) return 0
      const totalCorrect = boardAttempts.reduce((sum, atts) => {
        const recent = atts.slice(-5)
        return sum + recent.filter(a => a.correct).length
      }, 0)
      const totalRecent = boardAttempts.reduce((sum, atts) => sum + Math.min(atts.length, 5), 0)
      return totalRecent > 0 ? Math.round(totalCorrect / totalRecent * 100) : 0
    })()

    return {
      path,
      name: lessonNames[path] || path.split('/').pop().replace(/_/g, ' '),
      tried,
      mastered,
      progressing,
      struggling,
      totalBoards: lessonTotals[path] ?? tried,
      totalAttempts: allAttempts.length,
      recentRate,
      boardLines,
      firstActivity: allAttempts[0]?.ts,
      lastActivity: allAttempts[allAttempts.length - 1]?.ts,
    }
  })

  return lessons.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
}

/**
 * Monotone cubic spline interpolation (Fritsch-Carlson).
 * Returns an SVG path string through the given [{px,py}] points.
 * @param {Array} pts - [{px, py}] pixel coordinates
 * @returns {string|null} SVG path d attribute
 */
export function monoCubicPath(pts) {
  const n = pts.length
  if (n === 1) return null
  if (n === 2) {
    return `M${pts[0].px.toFixed(1)},${pts[0].py.toFixed(1)} L${pts[1].px.toFixed(1)},${pts[1].py.toFixed(1)}`
  }

  const dx = [], dy = [], m = [], slope = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].px - pts[i].px
    dy[i] = pts[i + 1].py - pts[i].py
    slope[i] = dy[i] / dx[i]
  }
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = (slope[i - 1] + slope[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-10) { m[i] = m[i + 1] = 0; continue }
    const alpha = m[i] / slope[i]
    const beta = m[i + 1] / slope[i]
    const mag = alpha * alpha + beta * beta
    if (mag > 9) {
      const tau = 3 / Math.sqrt(mag)
      m[i] = tau * alpha * slope[i]
      m[i + 1] = tau * beta * slope[i]
    }
  }

  let d = `M${pts[0].px.toFixed(1)},${pts[0].py.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const cx1 = pts[i].px + dx[i] / 3
    const cy1 = pts[i].py + m[i] * dx[i] / 3
    const cx2 = pts[i + 1].px - dx[i] / 3
    const cy2 = pts[i + 1].py - m[i + 1] * dx[i] / 3
    d += ` C${cx1.toFixed(1)},${cy1.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${pts[i + 1].px.toFixed(1)},${pts[i + 1].py.toFixed(1)}`
  }
  return d
}

/**
 * Build lessonTotals and lessonNames from observations using the Baker Bridge taxonomy.
 * Replaces the React component's explicit props with automatic lookup.
 * @param {Array} observations - Raw observation array
 * @returns {{lessonTotals: Object, lessonNames: Object}}
 */
export function buildLessonMeta(observations) {
  const paths = new Set(observations.map(o => o.skill_path).filter(Boolean))
  const lessonTotals = {}
  const lessonNames = {}
  for (const path of paths) {
    const entry = getTaxonomyEntry(path)
    if (entry) {
      lessonTotals[path] = entry.dealCount
      lessonNames[path] = entry.name
    } else {
      const info = getSkillFromPath(path)
      lessonNames[path] = info.name
    }
  }
  return { lessonTotals, lessonNames }
}

/** Status → color mapping for sparklines and mastery bars */
export const STATUS_COLORS = {
  mastered: '#10b981',
  progressing: '#3b82f6',
  struggling: '#f59e0b',
  untried: '#d1d5db',
}

/** Attempt quality → dot color */
export function yColor(y) {
  if (y >= 0.9) return '#10b981'  // clean correct (green)
  if (y >= 0.6) return '#3b82f6'  // recent correct (blue) — correct after fail within 1 hr
  if (y >= 0.4) return '#f59e0b'  // corrected (orange) — errors fixed within same board
  return '#f43f5e'                 // fail (red) — uncorrected
}
