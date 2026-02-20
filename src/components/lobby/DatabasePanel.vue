<template>
  <div class="database-panel">
    <h3 class="panel-title">Database</h3>
    <div v-if="!database" class="empty-state">Loading...</div>
    <template v-else>
      <div class="db-size">
        SQLite file: <strong>{{ formatBytes(database.file_size_bytes) }}</strong>
      </div>
      <table class="tables-table">
        <thead>
          <tr>
            <th>Table</th>
            <th class="num-col">Rows</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="table in database.tables" :key="table.name">
            <td class="table-name">{{ table.name }}</td>
            <td class="num-col">{{ table.row_count.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<script setup>
import { useAdminDashboard } from '../../composables/useAdminDashboard.js'

defineProps({
  database: { type: Object, default: null }
})

const { formatBytes } = useAdminDashboard()
</script>

<style scoped>
.database-panel {
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  padding: 20px;
}

.panel-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 18px;
  color: var(--green-dark, #2d6a4f);
  margin: 0 0 16px 0;
}

.empty-state {
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
  text-align: center;
  padding: 24px;
}

.db-size {
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: var(--radius-button, 6px);
}

.db-size strong {
  color: var(--text-primary, #1a1a1a);
}

.tables-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tables-table thead th {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 2px solid #eee;
  font-size: 11px;
  text-transform: uppercase;
  color: #999;
  font-weight: 600;
}

.tables-table tbody td {
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.num-col {
  text-align: right;
}

.table-name {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary, #1a1a1a);
}
</style>
