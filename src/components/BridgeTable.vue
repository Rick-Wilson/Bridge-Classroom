<template>
  <div class="bridge-table" :class="{ compact: compact }">
    <!-- North - spans all columns, centered -->
    <div class="position north">
      <HandDisplay
        :hand="hands.N"
        seat="N"
        :hidden="hiddenSeats.includes('N')"
        :showHcp="showHcp"
      />
    </div>

    <!-- West -->
    <div class="position west">
      <HandDisplay
        :hand="hands.W"
        seat="W"
        :hidden="hiddenSeats.includes('W')"
        :showHcp="showHcp"
      />
    </div>

    <!-- Center (empty slot for dealer/vul indicator if needed) -->
    <div class="center">
      <slot name="center"></slot>
    </div>

    <!-- East -->
    <div class="position east">
      <HandDisplay
        :hand="hands.E"
        seat="E"
        :hidden="hiddenSeats.includes('E')"
        :showHcp="showHcp"
      />
    </div>

    <!-- South - spans all columns, centered -->
    <div class="position south">
      <HandDisplay
        :hand="hands.S"
        seat="S"
        :hidden="hiddenSeats.includes('S')"
        :showHcp="showHcp"
      />
    </div>
  </div>
</template>

<script setup>
import HandDisplay from './HandDisplay.vue'

defineProps({
  hands: {
    type: Object,
    required: true,
    default: () => ({ N: null, E: null, S: null, W: null })
  },
  hiddenSeats: {
    type: Array,
    default: () => []
  },
  showHcp: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.bridge-table {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: auto auto auto;
  gap: 8px;
  padding: 16px;
  min-width: 320px;
}

/* North spans all columns, centered */
.position.north {
  grid-column: 1 / -1;
  justify-self: center;
}

/* West in left column, aligned right */
.position.west {
  grid-column: 1;
  grid-row: 2;
  justify-self: end;
}

/* Center in middle column */
.center {
  grid-column: 2;
  grid-row: 2;
  min-width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* East in right column, aligned left */
.position.east {
  grid-column: 3;
  grid-row: 2;
  justify-self: start;
}

/* South spans all columns, centered */
.position.south {
  grid-column: 1 / -1;
  justify-self: center;
}

/* Compact mode for desktop two-column layout */
.bridge-table.compact {
  gap: 4px;
  padding: 8px;
  min-width: 280px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .bridge-table {
    gap: 8px;
    padding: 8px;
    min-width: 260px;
  }
}
</style>
