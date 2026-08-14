<template>
  <div class="meter-detail">
    <div class="meter-detail-header">
      <span class="meter-kind">Water meter</span>
      <h2 class="meter-id">
        Meter #{{ meter.meterId }}
      </h2>
    </div>

    <div class="hero">
      <span class="hero-label">Current reading</span>
      <div class="hero-value">
        <span class="hero-number">{{ volumeValue }}</span>
        <span class="hero-unit">{{ volumeUnit }}</span>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat">
        <span class="stat-label">Flow rate</span>
        <span class="stat-value">{{ flowValue }} {{ flowUnit }}</span>
      </div>
    </div>

    <div
      class="freshness"
      :class="isLive ? 'is-live' : 'is-stale'"
    >
      <span class="dot" />
      <span>{{ isLive ? 'Live' : 'Stale' }} · updated {{ relativeUpdatedAt }}</span>
    </div>
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

const LIVE_WINDOW_MS = 60 * 60 * 1000

const volumeValue = computed(() => meter.savedVolume ?? '—')
const volumeUnit = computed(() => meter.savedVolume != null ? 'm³' : '')

const flowValue = computed(() => meter.flowRate ?? '—')
const flowUnit = computed(() => meter.flowRate != null ? 'L/min' : '')

const updatedAtMs = computed(() => {
  const raw = meter.updatedAt
  return raw ? new Date(raw).getTime() : null
})

const isLive = computed(() => {
  if (!updatedAtMs.value) return false
  return Date.now() - updatedAtMs.value < LIVE_WINDOW_MS
})

const relativeUpdatedAt = computed(() => {
  if (!updatedAtMs.value) return 'unknown'
  const diffMs = Date.now() - updatedAtMs.value
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  const years = Math.floor(months / 12)
  return `${years} yr ago`
})
</script>

<style scoped>
.meter-detail {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 24px;
  background-color: var(--surface-card);
  border: 1px solid var(--border-hairline);
  border-radius: 12px;
}

.meter-detail-header {
  margin-bottom: 24px;
}

.meter-kind {
  display: block;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
  margin-bottom: 4px;
}

.meter-id {
  margin: 0;
  font-size: 1.2em;
  color: var(--ink-primary);
}

.hero {
  text-align: center;
  padding: 24px 0;
  border-top: 1px solid var(--border-hairline);
  border-bottom: 1px solid var(--border-hairline);
  margin-bottom: 20px;
}

.hero-label {
  display: block;
  font-size: 0.8em;
  color: var(--ink-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.hero-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
}

.hero-number {
  font-size: 3em;
  font-weight: 600;
  color: var(--ink-primary);
  line-height: 1;
}

.hero-unit {
  font-size: 1.1em;
  color: var(--ink-secondary);
}

.stat-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.75em;
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  font-size: 1.05em;
  color: var(--ink-primary);
}

.freshness {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
  color: var(--ink-secondary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.is-live .dot {
  background-color: var(--status-good);
  box-shadow: 0 0 6px var(--status-good);
}

.is-stale .dot {
  background-color: var(--status-warning);
}
</style>
