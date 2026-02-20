<template>
  <button class="collection-card" @click="$emit('click')">
    <span class="collection-icon">{{ collection.icon }}</span>
    <span class="collection-name">{{ collection.name }}</span>
    <span class="collection-desc">{{ collection.description }}</span>
  </button>
</template>

<script setup>
defineProps({
  collection: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])
</script>

<style scoped>
.collection-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  background: linear-gradient(135deg, var(--green-mid, #40916c) 0%, var(--green-dark, #2d6a4f) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-card, 12px);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 200px;
}

.collection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(45, 106, 79, 0.4);
}

.collection-icon {
  font-size: 48px;
  line-height: 1;
}

.collection-name {
  font-size: 20px;
  font-weight: 600;
}

.collection-desc {
  font-size: 13px;
  opacity: 0.9;
  max-width: 180px;
}
</style>
