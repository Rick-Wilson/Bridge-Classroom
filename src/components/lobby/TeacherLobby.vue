<template>
  <div class="teacher-lobby">
    <div class="welcome-section">
      <h2 class="welcome-title">Welcome back, {{ userName }}</h2>
      <p class="welcome-subtitle">Your teacher dashboard is being built. In the meantime, you can still access your student features below.</p>
    </div>

    <div class="quick-actions">
      <a v-if="hasLegacyDashboard" :href="legacyDashboardUrl" class="action-btn legacy">
        Open Legacy Dashboard
      </a>
    </div>

    <CollectionGrid @select-collection="$emit('select-collection', $event)" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../../composables/useUserStore.js'
import CollectionGrid from './CollectionGrid.vue'

defineEmits(['select-collection'])

const userStore = useUserStore()

const userName = computed(() => {
  const user = userStore.currentUser.value
  return user ? user.firstName : ''
})

// Legacy teacher dashboard is available if ?mode=teacher works
const hasLegacyDashboard = true
const legacyDashboardUrl = computed(() => {
  return `${window.location.origin}${window.location.pathname}?mode=teacher`
})
</script>

<style scoped>
.teacher-lobby {
  padding: 20px 0;
}

.welcome-section {
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  margin-bottom: 24px;
}

.welcome-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 28px;
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 8px;
}

.welcome-subtitle {
  color: var(--text-secondary, #6b7280);
  max-width: 500px;
  margin: 0 auto;
}

.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.action-btn.legacy {
  background: var(--green-pale, #d8f3dc);
  color: var(--green-dark, #2d6a4f);
}

.action-btn.legacy:hover {
  background: var(--green-light, #b7e4c7);
}
</style>
