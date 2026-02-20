<template>
  <div class="student-lobby">
    <!-- TODO Phase 3: My Assignments panel goes here -->
    <CollectionGrid @select-collection="$emit('select-collection', $event)" />
  </div>
</template>

<script setup>
import CollectionGrid from './CollectionGrid.vue'

defineEmits(['select-collection'])
</script>

<style scoped>
.student-lobby {
  padding: 20px 0;
}
</style>
