<template>
  <nav
    class="breadcrumb"
    aria-label="Breadcrumb"
  >
    <template
      v-for="(crumb, index) in crumbs"
      :key="index"
    >
      <button
        v-if="!crumb.active"
        type="button"
        class="crumb crumb-link"
        @click="crumb.onClick && crumb.onClick()"
      >
        {{ crumb.label }}
      </button>
      <span
        v-else
        class="crumb crumb-current"
      >{{ crumb.label }}</span>
      <span
        v-if="index < crumbs.length - 1"
        class="separator"
      >›</span>
    </template>
  </nav>
</template>

<script setup>
defineProps({
  crumbs: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 20px;
  font-size: 0.85em;
  flex-wrap: wrap;
}

.crumb {
  font-family: inherit;
}

.crumb-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--ink-secondary);
  cursor: pointer;
  font-size: 1em;
}

.crumb-link:hover {
  color: var(--accent);
}

.crumb-current {
  color: var(--ink-primary);
  font-weight: 600;
}

.separator {
  color: var(--ink-muted);
}
</style>
