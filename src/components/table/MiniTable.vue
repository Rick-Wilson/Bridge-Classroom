<template>
  <div class="mt">
    <!-- Head: identity + state at a glance -->
    <div class="mt-head">
      <button class="mt-name" title="Open the full live view of this table" @click="$emit('kibitz')">
        {{ name }}
      </button>
      <span class="mt-chip">Bd {{ t.board_no }}</span>
      <span v-if="t.contract" class="mt-chip mt-chip-contract">
        <span v-html="suitHtml(t.contract.text)"></span> by {{ t.contract.declarer }}
      </span>
      <span v-else class="mt-chip" :class="'mt-phase-' + t.phase">{{ t.phase }}</span>
      <span v-if="t.phase !== 'bidding'" class="mt-chip">NS {{ t.tricks.ns }} · EW {{ t.tricks.ew }}</span>
      <span class="mt-head-spacer"></span>
      <button
        class="mt-icon"
        title="Move this table to its next board now, skipping the ready check"
        @click="$emit('advance')"
      >⏭</button>
    </div>

    <!-- Four one-line hands -->
    <div class="mt-hands">
      <div
        v-for="seat in SEAT_ORDER"
        :key="seat"
        class="mt-hand"
        :class="{ 'mt-hand-turn': isOnTurn(seat), 'mt-hand-declarer': isDeclarerSide(seat) }"
      >
        <span class="mt-seat">{{ seat }}{{ isOnTurn(seat) ? '▸' : '' }}</span>
        <button class="mt-player" :title="playerTitle(seat)" @click="$emit('seat-click', seat)">
          {{ playerName(seat) }}<span
            v-if="isHuman(seat)"
            class="mt-dot"
            :class="{ 'mt-dot-off': !t.seats[seat].connected }"
          ></span><span v-if="t.ready.includes(seat)" class="mt-ready">✓</span>
        </button>
        <span class="mt-cards" v-html="handHtml(seat)"></span>
      </div>
    </div>

    <!-- Auction: micro grid, dealer-aligned -->
    <div v-if="auctionRows.length" class="mt-auction">
      <div class="mt-auction-row mt-auction-header">
        <span v-for="s in SEAT_ORDER_WNES" :key="s">{{ s }}</span>
      </div>
      <div v-for="(row, i) in auctionRows" :key="i" class="mt-auction-row">
        <span
          v-for="(call, j) in row"
          :key="j"
          :class="{ 'mt-call-last': i === auctionRows.length - 1 && j === lastCallCol }"
          v-html="call === null ? '' : suitHtml(call)"
        ></span>
      </div>
    </div>

    <!-- Trick in progress / result -->
    <div v-if="t.phase === 'play'" class="mt-foot">
      <template v-if="t.current_trick && t.current_trick.plays.length">
        <span class="mt-foot-label">trick</span>
        <span
          v-for="p in t.current_trick.plays"
          :key="p.seat"
          class="mt-trick-card"
        >{{ p.seat }}&thinsp;<span v-html="cardHtml(p.card)"></span></span>
      </template>
      <span v-else class="mt-foot-label">{{ t.next_to_act }} to lead</span>
    </div>
    <div v-else-if="t.phase === 'complete'" class="mt-foot mt-foot-result">
      <template v-if="t.result && t.result.contract">
        <span v-html="suitHtml(t.result.contract.text)"></span>&nbsp;by
        {{ t.result.contract.declarer }} —
        {{ t.result.contract.made ? 'made' : 'down' }},
        {{ t.result.contract.declarer_tricks }} tricks
      </template>
      <template v-else-if="t.result && t.result.passed_out">Passed out</template>
      <template v-else>Complete</template>
    </div>
  </div>
</template>

<script setup>
// MiniTable — one live table panel in the teacher's multi-table monitor.
// Pure presentation over the enriched lobby feed (sessions::lobby_json):
// four one-line hands (denser than Shark's card-image rows or the kibitz
// view's stacked suits), a micro auction grid, and the trick in progress.
// All interaction is emitted; the console owns menus and kibitz.
import { computed } from 'vue'

const SEAT_ORDER = ['N', 'E', 'S', 'W']
const SEAT_ORDER_WNES = ['W', 'N', 'E', 'S']
const SUIT_ORDER = ['S', 'H', 'D', 'C']
const SUIT_SYM = { S: '♠', H: '♥', D: '♦', C: '♣' }
const RANK_VALUE = { A: 14, K: 13, Q: 12, J: 11, T: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2 }

const props = defineProps({
  t: { type: Object, required: true },
  name: { type: String, required: true },
})
defineEmits(['kibitz', 'advance', 'seat-click'])

function isHuman(seat) {
  return props.t.seats?.[seat]?.kind === 'human'
}

function playerName(seat) {
  return isHuman(seat) ? props.t.seats[seat].name : 'Bot'
}

function playerTitle(seat) {
  return isHuman(seat)
    ? `${props.t.seats[seat].name} — seat actions`
    : 'Empty seat (bot) — seat actions'
}

function isOnTurn(seat) {
  return props.t.next_to_act === seat && props.t.phase !== 'complete'
}

function isDeclarerSide(seat) {
  const d = props.t.contract?.declarer
  if (!d) return false
  return seat === d || SEAT_ORDER[(SEAT_ORDER.indexOf(d) + 2) % 4] === seat
}

function sym(suitChar) {
  const red = suitChar === 'H' || suitChar === 'D'
  return `<span class="${red ? 'mt-red' : 'mt-black'}">${SUIT_SYM[suitChar]}</span>`
}

// ["SA","ST","H4",...] → ♠A10 ♥4 …, ranks high→low, T shown as 10.
function handHtml(seat) {
  const cards = props.t.hands?.[seat] || []
  const bySuit = { S: [], H: [], D: [], C: [] }
  for (const c of cards) bySuit[c[0]]?.push(c[1])
  return SUIT_ORDER.map((s) => {
    const ranks = bySuit[s].sort((a, b) => RANK_VALUE[b] - RANK_VALUE[a])
      .map((r) => (r === 'T' ? '10' : r)).join('')
    return `${sym(s)}${ranks || '—'}`
  }).join(' ')
}

function cardHtml(code) {
  return `${sym(code[0])}${code[1] === 'T' ? '10' : code[1]}`
}

// "1H" → 1♥ with color; "3N"/"3NX" → 3NT/3NTX; Pass → P; X/XX as-is.
function suitHtml(call) {
  if (call === 'Pass') return '<span class="mt-pass">P</span>'
  const m = String(call).match(/^(\d)([SHDCN])(X{0,2})$/)
  if (!m) return String(call)
  const body = m[2] === 'N' ? 'NT' : sym(m[2])
  return `${m[1]}${body}${m[3]}`
}

// Auction rows in fixed W N E S columns (nulls pad before the dealer).
const auctionRows = computed(() => {
  const calls = props.t.auction || []
  if (!calls.length) return []
  const offset = SEAT_ORDER_WNES.indexOf(props.t.dealer || 'N')
  const cells = new Array(offset).fill(null).concat(calls)
  const rows = []
  for (let i = 0; i < cells.length; i += 4) {
    const row = cells.slice(i, i + 4)
    while (row.length < 4) row.push(null)
    rows.push(row)
  }
  return rows
})

const lastCallCol = computed(() => {
  const rows = auctionRows.value
  if (!rows.length) return -1
  const last = rows[rows.length - 1]
  for (let j = last.length - 1; j >= 0; j--) if (last[j] !== null) return j
  return -1
})
</script>

<style scoped>
.mt {
  background: #fff;
  border: 1px solid #dde3e8;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.mt-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.mt-name {
  border: none;
  background: none;
  font-weight: 700;
  font-size: 13.5px;
  color: #1d4e89;
  cursor: pointer;
  padding: 0;
}
.mt-name:hover { text-decoration: underline; }
.mt-chip {
  background: #f0f3f6;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  color: #445;
  white-space: nowrap;
}
.mt-chip-contract { background: #e8f1fb; font-weight: 600; }
.mt-phase-bidding { background: #fdf3d8; }
.mt-phase-play { background: #e3f2ec; }
.mt-phase-complete { background: #ece8f6; }
.mt-head-spacer { flex: 1; }
.mt-icon {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
  opacity: 0.55;
}
.mt-icon:hover { opacity: 1; }
.mt-hands { display: flex; flex-direction: column; gap: 1px; }
.mt-hand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 1px 4px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
}
.mt-hand-turn { background: #fff7dd; }
.mt-seat { font-weight: 700; width: 20px; flex: none; color: #333; }
.mt-hand-declarer .mt-seat { color: #1d4e89; }
.mt-player {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 11px;
  color: #667;
  width: 74px;
  flex: none;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mt-player:hover { color: #1d4e89; text-decoration: underline; }
.mt-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #2fa572;
  margin-left: 3px;
  vertical-align: middle;
}
.mt-dot-off { background: #d33; }
.mt-ready { color: #2fa572; font-weight: 700; margin-left: 2px; }
.mt-cards {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mt-cards :deep(.mt-red), .mt-foot :deep(.mt-red), .mt-chip :deep(.mt-red), .mt-auction :deep(.mt-red) { color: #c62828; }
.mt-cards :deep(.mt-black), .mt-foot :deep(.mt-black), .mt-chip :deep(.mt-black), .mt-auction :deep(.mt-black) { color: #111; }
.mt-auction {
  border-top: 1px dashed #e3e8ec;
  padding-top: 4px;
  font-size: 11.5px;
}
.mt-auction-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  text-align: center;
}
.mt-auction-header { color: #99a; font-size: 10px; }
.mt-auction :deep(.mt-pass) { color: #9aa; }
.mt-call-last { background: #eef6ff; border-radius: 3px; font-weight: 600; }
.mt-foot {
  border-top: 1px dashed #e3e8ec;
  padding-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: #445;
}
.mt-foot-label { color: #99a; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; }
.mt-trick-card { font-family: ui-monospace, Menlo, monospace; }
.mt-foot-result { font-weight: 600; color: #333; }
</style>
