<template>
  <div class="casual-lobby">
    <CollectionGrid @select-collection="$emit('select-collection', $event)" @load-file="$emit('load-file', $event)" />
  </div>
</template>

<script setup>
import CollectionGrid from './CollectionGrid.vue'

defineEmits(['select-collection', 'show-become-teacher', 'load-file'])
</script>

<style scoped>
.casual-lobby {
  padding: 20px 0;
}
</style>
