<template>
  <div class="casual-lobby">
    <RecentLessons @resume-lesson="$emit('resume-lesson', $event)" @show-progress="$emit('show-progress')" />
    <CollectionGrid @select-collection="$emit('select-collection', $event)" @load-file="$emit('load-file', $event)" />
  </div>
</template>

<script setup>
import CollectionGrid from './CollectionGrid.vue'
import RecentLessons from './RecentLessons.vue'

defineEmits(['select-collection', 'show-become-teacher', 'load-file', 'resume-lesson', 'show-progress'])
</script>

<style scoped>
.casual-lobby {
  padding: 20px 0;
}
</style>
