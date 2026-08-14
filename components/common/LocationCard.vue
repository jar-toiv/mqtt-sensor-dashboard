<template>
  <div
    class="location-card"
    role="button"
    tabindex="0"
    @click="$emit('select', location)"
    @keydown.enter="$emit('select', location)"
  >
    {{ location.locationName }}
  </div>
</template>

<script setup>
const { location } = defineProps({
  location: {
    type: Object,
    required: true
  }
})

defineEmits(['select'])
</script>

<style scoped>
.location-card {
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
  font-size: 1.0em;
}

.location-card:hover,
.location-card:focus-visible {
  border-color: var(--accent);
  background-color: var(--surface-card-hover);
  outline: none;
}
</style>
