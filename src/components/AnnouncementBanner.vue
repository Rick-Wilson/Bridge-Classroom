<template>
  <div
    v-if="ann.announcement.value && ann.dismissed.value !== ann.announcement.value.id"
    class="announcement-banner"
    :class="ann.announcement.value.type"
  >
    <span class="announcement-text" v-html="renderMessage(ann.announcement.value.message)"></span>
    <button class="dismiss-btn" @click="ann.dismiss()" title="Dismiss">&times;</button>
  </div>
</template>

<script setup>
import { useAnnouncement } from '../composables/useAnnouncement.js'

const ann = useAnnouncement()

const circleColors = {
  red: { bg: '#ef5350', fg: 'white' },
  yellow: { bg: '#ffeb3b', fg: '#333' },
  orange: { bg: '#ff9800', fg: 'white' },
  green: { bg: '#4caf50', fg: 'white' },
  grey: { bg: '#ccc', fg: '#666' }
}

function renderMessage(message) {
  // Escape HTML first, then replace :color: tokens with inline circles
  const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/:(\w+):/g, (match, color) => {
    const c = circleColors[color.toLowerCase()]
    if (!c) return match
    return `<span class="ann-circle" style="background:${c.bg};color:${c.fg}"></span>`
  })
}
</script>

<style scoped>
.announcement-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 40px 10px 16px;
  font-size: 14px;
  font-family: var(--font-body, 'DM Sans', sans-serif);
  position: relative;
}

.announcement-banner.info {
  background: #e3f2fd;
  color: #1565c0;
  border-bottom: 1px solid #bbdefb;
}

.announcement-banner.warning {
  background: #fff8e1;
  color: #e65100;
  border-bottom: 1px solid #ffe082;
}

.announcement-banner.urgent {
  background: #ffebee;
  color: #c62828;
  border-bottom: 1px solid #ef9a9a;
}

.announcement-text {
  text-align: center;
  line-height: 1.4;
}

.announcement-text :deep(.ann-circle) {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  vertical-align: middle;
  margin: 0 1px;
}

.dismiss-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.6;
  padding: 0 4px;
  line-height: 1;
  color: inherit;
}

.dismiss-btn:hover {
  opacity: 1;
}
</style>
