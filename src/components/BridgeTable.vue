<template>
  <div class="bridge-table">
    <!-- North -->
    <div class="position north">
      <HandDisplay
        :hand="hands.N"
        seat="N"
        :hidden="hiddenSeats.includes('N')"
        :showHcp="showHcp"
      />
    </div>

    <!-- West and East row -->
    <div class="middle-row">
      <div class="position west">
        <HandDisplay
          :hand="hands.W"
          seat="W"
          :hidden="hiddenSeats.includes('W')"
          :showHcp="showHcp"
        />
      </div>

      <div class="center">
        <slot name="center">
          <!-- Dealer/Vul indicator can go here -->
        </slot>
      </div>

      <div class="position east">
        <HandDisplay
          :hand="hands.E"
          seat="E"
          :hidden="hiddenSeats.includes('E')"
          :showHcp="showHcp"
        />
      </div>
    </div>

    <!-- South -->
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
  }
})
</script>

<style scoped>
.bridge-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.middle-row {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  justify-content: center;
}

.center {
  min-width: 80px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.position {
  display: flex;
  justify-content: center;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .middle-row {
    gap: 10px;
  }

  .bridge-table {
    gap: 8px;
    padding: 8px;
  }
}
</style>
