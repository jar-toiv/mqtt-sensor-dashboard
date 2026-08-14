<template>
  <div
    class="meter-card"
    role="button"
    tabindex="0"
    @click="$emit('select', meter)"
    @keydown.enter="$emit('select', meter)"
  >
    <span class="meter-label">Meter #{{ meter.meterId }}</span>
    <p
      v-if="volume != null"
      class="meter-reading"
    >
      {{ volume }} <span class="unit">m³</span>
    </p>
    <p
      v-else
      class="meter-reading meter-reading-empty"
    >
      No volume data
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const { meter } = defineProps({
  meter: {
    type: Object,
    required: true
  }
})

defineEmits(['select'])

const volume = computed(() => meter.savedVolume)
</script>

<style scoped>
.meter-card {
  flex: auto;
  min-width: 140px;
  background-color: var(--surface-card);
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  padding: 14px;
  margin: 6px;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  font-size: 0.7em;
}

.meter-card:hover,
.meter-card:focus-visible {
  border-color: var(--accent);
  background-color: var(--surface-card-hover);
  outline: none;
}

.meter-label {
  display: block;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-muted);
  margin-bottom: 6px;
}

.meter-reading {
  margin: 0;
  font-size: 1.3em;
  font-weight: 600;
  color: var(--ink-primary);
}

.meter-reading-empty {
  font-size: 0.9em;
  font-weight: 400;
  color: var(--ink-muted);
}

.unit {
  font-size: 0.8em;
  font-weight: 400;
  color: var(--ink-secondary);
}
</style>
