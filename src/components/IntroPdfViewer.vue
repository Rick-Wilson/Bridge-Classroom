<template>
  <div
    v-if="visible"
    class="intro-pdf-viewer"
    :style="{ left: pos.x + 'px', top: pos.y + 'px', width: size.w + 'px', height: size.h + 'px' }"
  >
    <div class="viewer-titlebar" @pointerdown="startDrag">
      <span class="viewer-title">Lesson Introduction</span>
      <div class="viewer-controls">
        <a :href="url" target="_blank" class="viewer-btn" title="Open in new tab">&#8599;</a>
        <button class="viewer-btn close" @click="$emit('close')" title="Close">&times;</button>
      </div>
    </div>
    <iframe :src="url" class="viewer-iframe"></iframe>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

defineProps({
  url: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const pos = reactive({ x: 80, y: 80 })
const size = reactive({ w: 550, h: 700 })
const dragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

function startDrag(e) {
  // Don't drag if clicking a button/link
  if (e.target.closest('a, button')) return

  dragging.value = true
  dragOffset.x = e.clientX - pos.x
  dragOffset.y = e.clientY - pos.y
  document.addEventListener('pointermove', onDrag)
  document.addEventListener('pointerup', stopDrag)
}

function onDrag(e) {
  if (!dragging.value) return
  pos.x = Math.max(0, e.clientX - dragOffset.x)
  pos.y = Math.max(0, e.clientY - dragOffset.y)
}

function stopDrag() {
  dragging.value = false
  document.removeEventListener('pointermove', onDrag)
  document.removeEventListener('pointerup', stopDrag)
}
</script>

<style scoped>
.intro-pdf-viewer {
  position: fixed;
  z-index: 900;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 320px;
  min-height: 300px;
}

.viewer-titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}

.viewer-titlebar:active {
  cursor: grabbing;
}

.viewer-title {
  font-size: 14px;
  font-weight: 600;
}

.viewer-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.viewer-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  text-decoration: none;
  opacity: 0.8;
}

.viewer-btn:hover {
  opacity: 1;
}

.viewer-btn.close {
  font-size: 22px;
}

.viewer-iframe {
  flex: 1;
  border: none;
  width: 100%;
}
</style>
