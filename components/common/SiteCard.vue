<template>
  <div
    class="site-card"
    role="button"
    tabindex="0"
    @click="$emit('select', site)"
    @keydown.enter="$emit('select', site)"
  >
    {{ site.siteName }}
  </div>
</template>

<script setup>
const { site } = defineProps({
  site: {
    type: Object,
    required: true
  }
})

defineEmits(['select'])
</script>

<style scoped>
.site-card {
  flex: 0 0 auto;
  width: 160px;
  min-width: 140px;
  background-color: var(--surface-card);
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  padding: 16px;
  margin: 6px;
  cursor: pointer;
  color: var(--ink-primary);
  font-weight: 500;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8em;
}

.site-card:hover,
.site-card:focus-visible {
  border-color: var(--accent);
  background-color: var(--surface-card-hover);
  outline: none;
}
</style>
