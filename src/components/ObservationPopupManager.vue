<template>
  <Teleport to="body">
    <ObservationViewer
      v-for="viewer in openViewers"
      :key="viewer.id"
      :obs="viewer.obs"
      :initial-x="viewer.x"
      :initial-y="viewer.y"
      :z-index="viewer.zIndex"
      @close="closeViewer(viewer.id)"
      @focus="bringToFront(viewer.id)"
    />
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import ObservationViewer from './ObservationViewer.vue'

const openViewers = ref([])
let nextId = 0
let topZ = 3000

const STAGGER = 30 // px offset for each new viewer

function openObservation(obs, clickEvent) {
  // Position near the click, staggered if multiple open
  const offset = openViewers.value.length * STAGGER
  const x = clickEvent ? Math.min(clickEvent.clientX + 20 + offset, window.innerWidth - 700) : 60 + offset
  const y = clickEvent ? Math.min(clickEvent.clientY - 40 + offset, window.innerHeight - 400) : 60 + offset

  topZ++
  openViewers.value.push({
    id: nextId++,
    obs,
    x: Math.max(10, x),
    y: Math.max(10, y),
    zIndex: topZ,
  })
}

function closeViewer(id) {
  openViewers.value = openViewers.value.filter(v => v.id !== id)
}

function bringToFront(id) {
  topZ++
  const viewer = openViewers.value.find(v => v.id === id)
  if (viewer) viewer.zIndex = topZ
}

function closeAll() {
  openViewers.value = []
}

defineExpose({ openObservation, closeAll })
</script>
