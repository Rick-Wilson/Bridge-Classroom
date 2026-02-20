<template>
  <div class="admin-lobby">
    <div class="admin-placeholder">
      <h2 class="admin-title">Admin Dashboard</h2>
      <p class="admin-subtitle">System metrics and monitoring coming in Phase 4.</p>
    </div>
  </div>
</template>

<style scoped>
.admin-lobby {
  padding: 20px 0;
}

.admin-placeholder {
  text-align: center;
  padding: 48px 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
}

.admin-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 28px;
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 8px;
}

.admin-subtitle {
  color: var(--text-secondary, #6b7280);
}
</style>
