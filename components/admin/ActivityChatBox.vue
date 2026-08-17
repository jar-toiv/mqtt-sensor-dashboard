<template>
  <div
    class="chat-box"
    :class="{ 'is-flashing': isFlashing, 'is-collapsed': isCollapsed }"
    :style="isCollapsed ? {} : { width: boxWidth + 'px', height: boxHeight + 'px' }"
    @animationend="isFlashing = false"
  >
    <div
      v-if="!isCollapsed"
      class="resize-handle"
      @mousedown="startResize"
    />
    <div class="chat-header">
      <span>Live Activity</span>
      <div class="chat-header-actions">
        <span class="chat-count">{{ activityStore.entries.length }}</span>
        <button
          type="button"
          class="chat-toggle-btn"
          :aria-label="isCollapsed ? 'Open activity chat' : 'Close activity chat'"
          @click="toggleCollapsed"
        >
          <FontAwesomeIcon :icon="isCollapsed ? faComments : faXmark" />
        </button>
      </div>
    </div>
    <ul
      v-if="!isCollapsed"
      class="chat-list"
    >
      <li
        v-for="entry in activityStore.entries"
        :key="entry.id"
        class="chat-entry"
      >
        <span class="chat-time">{{ formatTime(entry.timestamp) }}</span>
        <span class="chat-text">{{ describe(entry) }}</span>
      </li>
      <li
        v-if="!activityStore.entries.length"
        class="chat-empty"
      >
        Waiting for updates…
      </li>
    </ul>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faComments, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useActivityStore } from '../../store/activity'

const props = defineProps({
  isConnected: {
    type: Boolean,
    default: true
  }
})

const activityStore = useActivityStore()
const isFlashing = ref(false)

const COLLAPSE_KEY = 'activityChatBox.collapsed'
const isCollapsed = ref(typeof localStorage !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === 'true')

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(COLLAPSE_KEY, String(isCollapsed.value))
  }
}

const STORAGE_KEY = 'activityChatBox.size'
const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 480

const MIN_WIDTH = 240
const MAX_WIDTH = 800
const MIN_HEIGHT = 200
const MAX_HEIGHT = 800

const loadStoredSize = () => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

const storedSize = loadStoredSize()
const boxWidth = ref(storedSize?.width ?? DEFAULT_WIDTH)
const boxHeight = ref(storedSize?.height ?? DEFAULT_HEIGHT)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const saveSize = () => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ width: boxWidth.value, height: boxHeight.value }))
}

const startResize = event => {
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = boxWidth.value
  const startHeight = boxHeight.value

const onMouseMove = moveEvent => {
    boxWidth.value = clamp(startWidth + (startX - moveEvent.clientX), MIN_WIDTH, MAX_WIDTH)
    boxHeight.value = clamp(startHeight + (startY - moveEvent.clientY), MIN_HEIGHT, MAX_HEIGHT)
  }


  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    saveSize()
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
watch(
  () => activityStore.entries[0]?.id,
  async newId => {
    if (!newId || !props.isConnected) return
    isFlashing.value = false
    await nextTick()
    isFlashing.value = true
  }
)

const operationVerb = {
  insert: 'created',
  update: 'updated',
  replace: 'replaced',
  delete: 'deleted'
}

const HIDDEN_FIELDS = new Set(['__v', 'updatedAt', 'createdAt'])
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/

const formatFieldName = key =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase())

const formatValue = value => {
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'string' && OBJECT_ID_PATTERN.test(value)) return `…${value.slice(-6)}`
  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) return new Date(value).toLocaleString()
  return value
}

const formatTime = timestamp => new Date(timestamp).toLocaleTimeString()

const describe = entry => {
  const verb = operationVerb[entry.operationType] || entry.operationType
  const shortId = entry.documentId ? entry.documentId.slice(-6) : 'unknown'
  const label = entry.documentName || `…${shortId}`
  const fields = entry.updatedFields
    ? Object.entries(entry.updatedFields)
        .filter(([key]) => !HIDDEN_FIELDS.has(key))
        .map(([key, value]) => `${formatFieldName(key)}: ${formatValue(value)}`)
        .join(', ')
    : ''

  return fields
    ? `${entry.collection} ${label} ${verb} — ${fields}`
    : `${entry.collection} ${label} ${verb}`
}
</script>

<style scoped>
.chat-box {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  background-color: var(--surface-card);
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  overflow: hidden;
  z-index: 500;
}

.resize-handle {
  position: absolute;
  top: -4px;
  left: -4px;
  width:  18px;
  height: 18px;
  cursor: nwse-resize;
  z-index: 2;
}

.chat-box.is-collapsed {
  width: auto;
  height: auto;
}

.chat-box.is-flashing {
  animation: chat-blink 0.6s ease-in-out 1;
}

@keyframes chat-blink {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(110, 224, 110, 0);
    border-color: var(--border-hairline);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(110, 224, 110, 0.25), 0 0 8px rgba(110, 224, 110, 0.2);
    border-color: #a3d9a3;
  }
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-hairline);
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-muted);
  white-space: nowrap;
}

.chat-box.is-collapsed .chat-header {
  border-bottom: none;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-count {
  background-color: var(--surface-card-hover);
  border-radius: 10px;
  padding: 1px 8px;
  color: var(--ink-secondary);
}

.chat-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--border-hairline);
  border-radius: 50%;
  background-color: var(--surface-card-hover);
  color: var(--ink-secondary);
  font-size: 0.85em;
  cursor: pointer;
  color:rgb(79, 80, 80)
}

.chat-toggle-btn:hover {
  background-color: var(--surface-card);
  color: var(--ink-primary);
}

.chat-list {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  overflow-y: auto;
}

.chat-entry {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 14px;
  font-size: 0.7em;
  border-bottom: 1px solid var(--border-hairline);
}

.chat-entry:last-child {
  border-bottom: none;
}

.chat-time {
  color: var(--ink-muted);
  font-size: 0.7em;
}

.chat-text {
  color: var(--ink-primary);
}

.chat-empty {
  padding: 14px;
  color: var(--ink-muted);
  font-size: 0.8em;
  text-align: center;
}
</style>
