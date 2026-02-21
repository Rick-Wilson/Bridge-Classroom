<template>
  <div
    v-if="ann.announcement.value && ann.dismissed.value !== ann.announcement.value.id"
    class="announcement-banner"
    :class="ann.announcement.value.type"
  >
    <span class="announcement-text">{{ ann.announcement.value.message }}</span>
    <button class="dismiss-btn" @click="ann.dismiss()" title="Dismiss">&times;</button>
  </div>
</template>

<script setup>
import { useAnnouncement } from '../composables/useAnnouncement.js'

const ann = useAnnouncement()
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
