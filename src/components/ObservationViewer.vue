<template>
  <div
    class="obs-viewer"
    :style="{ left: posX + 'px', top: posY + 'px', zIndex: zIndex }"
    @mousedown="$emit('focus')"
  >

    <!-- ── Header (draggable) ── -->
    <div class="obs-header" @mousedown.prevent="startDrag">
      <div class="obs-header-left">
        <span class="suit-icon">&spades;</span>
        <span class="obs-title">Observation Detail</span>
        <span class="obs-id">{{ shortId }}</span>
      </div>
      <div class="obs-header-right">
        <span class="timestamp">{{ formattedTime }}</span>
        <span class="result-badge" :class="correct ? 'correct' : 'incorrect'">
          {{ correct ? '\u2713 Correct' : '\u2717 Incorrect' }}
        </span>
        <button class="close-btn" @click="$emit('close')" title="Close">&times;</button>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="obs-body">

      <!-- Left column: Hands -->
      <div class="obs-col">
        <div class="card">
          <div class="card-title"><span class="suit-icon-sm">&clubs;</span> Hands</div>

          <div class="hands-grid">

            <!-- Row 1: deal meta top-left | N | empty -->
            <div class="deal-meta-top">
              <div class="meta-row">
                <span class="meta-label">Lesson</span>
                <span class="meta-value">{{ deal.subfolder }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Deal</span>
                <span class="meta-value">#{{ deal.deal_number }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Dealer</span>
                <span class="meta-value">{{ deal.dealer }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Vul</span>
                <span class="meta-value">{{ deal.vulnerability }}</span>
              </div>
            </div>

            <div class="compass-north">
              <div class="hand-cell" :class="{ student: studentSeat === 'N' }">
                <div class="seat-label">N <span v-if="studentSeat === 'N'" class="you-tag">YOU</span></div>
                <template v-if="parseSuits(hands.north)">
                  <div v-for="s in parseSuits(hands.north)" :key="s.suit" class="holding-row">
                    <span class="suit-pip" :class="s.color">{{ s.suit }}</span>
                    <span class="cards">{{ s.cards || '\u2014' }}</span>
                  </div>
                </template>
                <span v-else class="hidden-hand">Hidden</span>
              </div>
            </div>

            <div /><!-- empty top-right -->

            <!-- Row 2: W | compass rose | E -->
            <div class="hand-cell" :class="{ student: studentSeat === 'W' }">
              <div class="seat-label">W <span v-if="studentSeat === 'W'" class="you-tag">YOU</span></div>
              <template v-if="parseSuits(hands.west)">
                <div v-for="s in parseSuits(hands.west)" :key="s.suit" class="holding-row">
                  <span class="suit-pip" :class="s.color">{{ s.suit }}</span>
                  <span class="cards">{{ s.cards || '\u2014' }}</span>
                </div>
              </template>
              <span v-else class="hidden-hand">Hidden</span>
            </div>

            <div class="compass-center">
              <div class="compass-rose">
                <span class="cr-n">N</span>
                <span class="cr-w">W</span>
                <span class="cr-e">E</span>
                <span class="cr-s">S</span>
              </div>
            </div>

            <div class="hand-cell" :class="{ student: studentSeat === 'E' }">
              <div class="seat-label">E <span v-if="studentSeat === 'E'" class="you-tag">YOU</span></div>
              <template v-if="parseSuits(hands.east)">
                <div v-for="s in parseSuits(hands.east)" :key="s.suit" class="holding-row">
                  <span class="suit-pip" :class="s.color">{{ s.suit }}</span>
                  <span class="cards">{{ s.cards || '\u2014' }}</span>
                </div>
              </template>
              <span v-else class="hidden-hand">Hidden</span>
            </div>

            <!-- Row 3: contract meta | S | empty -->
            <div class="deal-meta-bottom">
              <div class="meta-row">
                <span class="meta-label">Contract</span>
                <span class="meta-contract">{{ deal.contract }} by {{ deal.declarer }}</span>
              </div>
            </div>

            <div class="compass-south">
              <div class="hand-cell" :class="{ student: studentSeat === 'S' }">
                <div class="seat-label">S <span v-if="studentSeat === 'S'" class="you-tag">YOU</span></div>
                <template v-if="parseSuits(hands.south)">
                  <div v-for="s in parseSuits(hands.south)" :key="s.suit" class="holding-row">
                    <span class="suit-pip" :class="s.color">{{ s.suit }}</span>
                    <span class="cards">{{ s.cards || '\u2014' }}</span>
                  </div>
                </template>
                <span v-else class="hidden-hand">Hidden</span>
              </div>
            </div>

            <div /><!-- empty bottom-right -->

          </div><!-- /hands-grid -->
        </div><!-- /card -->
      </div><!-- /left col -->

      <!-- Right column: Auction + Result -->
      <div class="obs-col">

        <!-- Auction card -->
        <div class="card">
          <div class="card-title"><span class="suit-icon-sm">&hearts;</span> Auction</div>

          <div class="prompt-meta">
            <span class="prompt-meta-label">Prompt {{ promptIndex + 1 }} of {{ totalPrompts }}</span>
            <span class="prompt-meta-sep">&middot;</span>
            <span class="prompt-meta-auction">
              Auction so far: <span class="prompt-meta-bids">{{ auctionSoFar.join('  ') }}</span>
            </span>
          </div>

          <div class="auction-header">
            <span v-for="d in ['W','N','E','S']" :key="d" class="auction-dir">{{ d }}</span>
          </div>

          <div v-for="(row, rowIdx) in auctionRows" :key="rowIdx" class="auction-row">
            <template v-for="(bid, colIdx) in row" :key="colIdx">
              <!-- Student slot -->
              <div v-if="rowIdx * 4 + colIdx === studentIdx" class="split-cell">
                <span class="pill-expected">{{ expectedBid }}</span>
                <span v-if="!correct" class="pill-student">{{ studentBid }}</span>
              </div>
              <!-- Normal bid -->
              <span
                v-else
                class="auction-bid"
                :class="{ future: rowIdx * 4 + colIdx > studentIdx }"
              >{{ bid || '' }}</span>
            </template>
          </div>

          <div class="auction-legend">
            <span class="legend-item"><span class="legend-dot green" /> Expected</span>
            <span v-if="!correct" class="legend-item"><span class="legend-dot red" /> Student bid</span>
            <span class="legend-item"><span class="legend-dot gray" /> After this point</span>
          </div>
        </div>

        <!-- Result & Meta card -->
        <div class="card">
          <div class="card-title"><span class="suit-icon-sm">&diams;</span> Result &amp; Meta</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Attempt #</span>
              <span class="info-value">{{ result.attempt_number }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Time Taken</span>
              <span class="info-value">{{ result.time_taken_ms === 0 ? 'n/a' : result.time_taken_ms + ' ms' }}</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">Skill Path</span>
              <span class="info-value mono">{{ obs.skill_path }}</span>
            </div>
          </div>
        </div>

      </div><!-- /right col -->
    </div><!-- /obs-body -->
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const props = defineProps({
  obs: { type: Object, required: true },
  initialX: { type: Number, default: 100 },
  initialY: { type: Number, default: 100 },
  zIndex: { type: Number, default: 3000 },
})

const emit = defineEmits(['close', 'focus'])

const posX = ref(props.initialX)
const posY = ref(props.initialY)

// Drag state
let dragging = false
let dragOffsetX = 0
let dragOffsetY = 0

function startDrag(e) {
  dragging = true
  dragOffsetX = e.clientX - posX.value
  dragOffsetY = e.clientY - posY.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  emit('focus')
}

function onDrag(e) {
  if (!dragging) return
  posX.value = e.clientX - dragOffsetX
  posY.value = e.clientY - dragOffsetY
}

function stopDrag() {
  dragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

console.log('[ObservationViewer] obs received:', JSON.stringify(props.obs, null, 2)?.slice(0, 2000))

// Computed data from observation
const deal        = computed(() => props.obs.deal       || {})
const prompt      = computed(() => props.obs.bid_prompt || {})
const result      = computed(() => props.obs.result     || {})
const correct     = computed(() => result.value.correct)
const hands       = computed(() => deal.value.hands || {})
const studentSeat = computed(() => deal.value.student_seat)

const expectedBid  = computed(() => prompt.value.expected_bid)
const studentBid   = computed(() => result.value.student_bid)
const auctionSoFar = computed(() => prompt.value.auction_so_far || [])
const promptIndex  = computed(() => prompt.value.prompt_index ?? 0)
const totalPrompts = computed(() => prompt.value.total_prompts)

const shortId = computed(() => ((props.obs.observation_id || props.obs.id || '') + '').slice(0, 8) + '\u2026')

const formattedTime = computed(() => {
  if (!props.obs.timestamp) return ''
  return new Date(props.obs.timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
})

const SEATS = ['W', 'N', 'E', 'S']

const paddedAuction = computed(() => {
  const fa = deal.value.full_auction
  const bids = (typeof fa === 'string' ? fa : Array.isArray(fa) ? fa.join(' ') : '').split(' ').filter(Boolean)
  const startIdx = SEATS.indexOf(deal.value.dealer)
  return [...Array(Math.max(0, startIdx)).fill(null), ...bids]
})

const studentIdx = computed(() =>
  SEATS.indexOf(deal.value.dealer) + auctionSoFar.value.length
)

const auctionRows = computed(() => {
  const rows = []
  for (let i = 0; i < paddedAuction.value.length; i += 4)
    rows.push(paddedAuction.value.slice(i, i + 4))
  return rows
})

function parseSuits(hand) {
  if (!hand || typeof hand !== 'string') return null
  const parts = hand.split('.')
  if (parts.length < 4) return null
  const [s, h, d, c] = parts
  return [
    { suit: '\u2660', cards: s, color: 'black' },
    { suit: '\u2665', cards: h, color: 'red'   },
    { suit: '\u2666', cards: d, color: 'red'   },
    { suit: '\u2663', cards: c, color: 'black' },
  ]
}
</script>

<style scoped>
.obs-viewer {
  --felt:            #1a2e1a;
  --felt-mid:        #223322;
  --card-bg:         #f8f5ee;
  --card-border:     #d4c9a8;
  --text-primary:    #1c1810;
  --text-secondary:  #5a5240;
  --text-label:      #8a7d60;
  --gold:            #c9a227;
  --red:             #c0392b;
  --green:           #27ae60;
  --correct-bg:      #eaf7ee;
  --incorrect-bg:    #fdf0ee;
  --correct-border:  #a8d5b5;
  --incorrect-border:#f5bbb4;

  position: fixed;
  font-family: 'DM Sans', var(--font-body, sans-serif);
  background: var(--felt);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.45);
  max-width: 960px;
  width: 680px;
  user-select: none;
}

*, *::before, *::after { box-sizing: border-box; }

/* Header */
.obs-header {
  background: var(--felt-mid);
  border-bottom: 2px solid var(--gold);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: grab;
}
.obs-header:active { cursor: grabbing; }
.obs-header-left, .obs-header-right { display: flex; align-items: center; gap: 8px; }
.suit-icon    { font-size: 1.1rem;  color: var(--gold); line-height: 1; }
.suit-icon-sm { font-size: 0.9rem;  color: var(--gold); line-height: 1; }
.obs-title {
  font-family: var(--font-heading, 'Crimson Pro', Georgia, serif);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--gold);
  letter-spacing: 0.03em;
}
.obs-id {
  font-family: monospace;
  font-size: 0.68rem;
  color: #7a9a7a;
  background: rgba(255,255,255,0.06);
  padding: 2px 6px;
  border-radius: 4px;
}
.timestamp { font-family: monospace; font-size: 0.75rem; color: #8aaa8a; }
.result-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.04em;
}
.result-badge.correct   { background: var(--correct-bg);   color: var(--green); border: 1px solid var(--correct-border); }
.result-badge.incorrect { background: var(--incorrect-bg); color: var(--red);   border: 1px solid var(--incorrect-border); }

.close-btn {
  background: none;
  border: none;
  color: #8aaa8a;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.close-btn:hover { color: #fff; }

/* Body layout */
.obs-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
}
@media (max-width: 680px) { .obs-body { grid-template-columns: 1fr; } }
.obs-col { display: flex; flex-direction: column; gap: 10px; }

/* Cards */
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.card-title {
  font-family: var(--font-heading, 'Crimson Pro', Georgia, serif);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Hands 3x3 grid */
.hands-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 4px;
  align-items: center;
  justify-items: center;
}
.compass-north, .compass-south { display: flex; justify-content: center; }
.compass-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70px;
  width: 100%;
}
.compass-rose { position: relative; width: 48px; height: 48px; }
.cr-n, .cr-s, .cr-w, .cr-e {
  position: absolute;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-label);
}
.cr-n { top: 0;    left: 50%;  transform: translateX(-50%); }
.cr-s { bottom: 0; left: 50%;  transform: translateX(-50%); }
.cr-w { left: 0;   top: 50%;   transform: translateY(-50%); }
.cr-e { right: 0;  top: 50%;   transform: translateY(-50%); }

/* Deal meta */
.deal-meta-top {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-self: end;
  justify-self: start;
  padding-right: 6px;
}
.deal-meta-bottom {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-self: start;
  justify-self: start;
  padding-right: 6px;
  padding-top: 4px;
  border-top: 1px dashed var(--card-border);
}
.meta-row     { display: flex; flex-direction: column; line-height: 1.2; }
.meta-label   { font-size: 0.55rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-label); }
.meta-value   { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.meta-contract {
  font-family: var(--font-heading, 'Crimson Pro', Georgia, serif);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

/* Hand cells */
.hand-cell {
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.75rem;
  min-width: 80px;
}
.hand-cell.student {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px rgba(201,162,39,0.25);
  background: #fffdf5;
}
.seat-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-label);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.you-tag {
  font-size: 0.55rem;
  background: var(--gold);
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  letter-spacing: 0.06em;
}
.holding-row { display: flex; align-items: baseline; gap: 3px; line-height: 1.4; }
.suit-pip    { font-size: 0.8rem; line-height: 1; }
.suit-pip.red   { color: var(--red); }
.suit-pip.black { color: var(--text-primary); }
.cards {
  font-family: monospace;
  font-size: 0.72rem;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}
.hidden-hand { font-size: 0.7rem; color: var(--text-label); font-style: italic; }

/* Auction */
.prompt-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--card-border);
  flex-wrap: wrap;
}
.prompt-meta-label   { font-size: 0.68rem; font-weight: 600; color: var(--gold); letter-spacing: 0.04em; }
.prompt-meta-sep     { color: var(--text-label); font-size: 0.7rem; }
.prompt-meta-auction { font-size: 0.68rem; color: var(--text-label); }
.prompt-meta-bids    { font-family: monospace; color: var(--text-secondary); font-weight: 500; }

.auction-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 3px;
}
.auction-dir {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-label);
  text-align: center;
}
.auction-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  margin-bottom: 2px;
}
.auction-bid {
  font-family: monospace;
  font-size: 0.75rem;
  text-align: center;
  padding: 2px;
  border-radius: 4px;
  color: var(--text-primary);
  min-height: 1.5em;
}
.auction-bid.future { color: #b8ad96; opacity: 0.45; }

.split-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 1px 0;
}
.pill-expected {
  font-family: monospace;
  font-size: 0.68rem;
  font-weight: 700;
  color: #1e7a3e;
  background: #d4f0dd;
  border: 1px solid #a8d5b5;
  border-radius: 4px;
  padding: 1px 4px;
  line-height: 1.5;
  white-space: nowrap;
}
.pill-student {
  font-family: monospace;
  font-size: 0.68rem;
  font-weight: 700;
  color: #a52a1e;
  background: #fde8e6;
  border: 1px solid #f5bbb4;
  border-radius: 4px;
  padding: 1px 4px;
  line-height: 1.5;
  white-space: nowrap;
}

.auction-legend {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--card-border);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.62rem;
  color: var(--text-label);
  letter-spacing: 0.03em;
}
.legend-dot { width: 7px; height: 7px; border-radius: 2px; display: inline-block; }
.legend-dot.green { background: #a8d5b5; }
.legend-dot.red   { background: #f5bbb4; }
.legend-dot.gray  { background: #c8bfa6; opacity: 0.5; }

/* Result & Meta */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 14px;
}
.info-item { display: flex; flex-direction: column; gap: 1px; }
.info-item.full-width { grid-column: 1 / -1; }
.info-label {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-label);
}
.info-value { font-size: 0.82rem; color: var(--text-primary); font-weight: 500; }
.info-value.mono {
  font-family: monospace;
  font-size: 0.68rem;
  color: var(--text-secondary);
  word-break: break-all;
}
</style>
