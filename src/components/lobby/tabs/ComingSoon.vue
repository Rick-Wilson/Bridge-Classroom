<template>
  <div class="coming-soon">
    <p class="coming-soon-title">{{ title }}</p>
    <p class="coming-soon-desc">Coming soon.</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true }
})
</script>

<style scoped>
.coming-soon {
  text-align: center;
  padding: 48px 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px dashed var(--card-border, #e0ddd7);
  margin: 20px 0;
}

.coming-soon-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 22px;
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 8px;
}

.coming-soon-desc {
  color: var(--text-secondary, #6b7280);
  font-size: 15px;
}
</style>
