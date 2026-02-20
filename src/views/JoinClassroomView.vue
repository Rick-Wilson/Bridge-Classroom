<template>
  <div class="join-page">
    <div class="join-card">
      <h1>Join a Classroom</h1>
      <p>Classroom join flow coming soon.</p>
      <p class="join-code">Code: {{ $route.params.joinCode }}</p>
      <router-link to="/" class="back-link">Back to Bridge Classroom</router-link>
    </div>
  </div>
</template>

<style scoped>
.join-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-warm, #f5f3ef);
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.join-card {
  background: white;
  padding: 48px;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  text-align: center;
  max-width: 480px;
}

.join-card h1 {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 12px;
}

.join-card p {
  color: var(--text-secondary, #6b7280);
  margin-bottom: 8px;
}

.join-code {
  font-family: monospace;
  font-size: 18px;
  color: var(--text-primary, #1a1a1a);
  margin: 16px 0;
}

.back-link {
  display: inline-block;
  margin-top: 16px;
  color: var(--green-mid, #40916c);
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
