<template>
  <div
    v-if="isVisible"
    class="modal"
    @click.self="close"
  >
    <div class="modal-content">
      <span
        class="close"
        @click="close"
      >&times;</span>

      <h2 class="panel-title">
        Access management
      </h2>

      <!-- Mode Selection -->
      <div
        v-if="mode === 'menu'"
        class="mode-selection"
      >
        <button
          class="btn-add"
          @click="setMode('add')"
        >
          Add user
        </button>
        <button
          class="btn-remove"
          @click="setMode('manage')"
        >
          Remove user
        </button>
      </div>

      <!-- Add user: email only. The invitee picks their own password on first login. -->
      <form
        v-if="mode === 'add'"
        @submit.prevent="handleInvite"
      >
        <label for="invite-email">New user email:</label>
        <input
          id="invite-email"
          v-model="inviteEmail"
          type="email"
          placeholder="name@example.com"
          required
        >
        <p class="hint">
          The account is created without a password. The user chooses one the first
          time they log in.
        </p>

        <div class="form-actions">
          <button
            class="btn-add"
            type="submit"
          >
            Add user
          </button>
          <button
            type="button"
            @click="setMode('menu')"
          >
            Back
          </button>
        </div>
      </form>

      <!-- Remove user: select a row, then confirm. Deactivates rather than deletes. -->
      <div v-if="mode === 'manage'">
        <input
          v-model="search"
          type="search"
          class="search-box"
          placeholder="Search users by email…"
        >

        <p
          v-if="usersStore.loading"
          class="hint"
        >
          Loading users…
        </p>

        <ul
          v-else-if="visibleUsers.length"
          class="user-list"
        >
          <li
            v-for="user in visibleUsers"
            :key="user._id"
            :class="['user-row', { selected: selectedId === user._id, disabled: isSelf(user) }]"
            @click="toggleSelect(user)"
          >
            <span class="user-email">
              {{ user.email }}
              <em
                v-if="user.pendingInvite"
                class="badge"
              >invite pending</em>
              <em
                v-if="user.role === 'admin'"
                class="badge badge-admin"
              >admin</em>
              <em
                v-if="isSelf(user)"
                class="badge"
              >you</em>
            </span>
          </li>
        </ul>

        <p
          v-else
          class="hint"
        >
          {{ search ? 'No users match that search.' : 'No active users.' }}
        </p>

        <p
          v-if="selectedUser"
          class="hint selected-note"
        >
          Selected <strong>{{ selectedUser.email }}</strong>. Their account will be
          disabled, not deleted — you can restore it by adding them again.
        </p>

        <div class="form-actions">
          <button
            class="btn-remove"
            type="button"
            :disabled="!selectedUser"
            @click="handleDeactivate"
          >
            Delete
          </button>
          <button
            type="button"
            @click="setMode('menu')"
          >
            Back
          </button>
        </div>
      </div>

      <p
        v-if="feedback"
        :class="['feedback', feedbackOk ? 'ok' : 'bad']"
      >
        {{ feedback }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useUsersStore } from '../../store/users'
import { useAuthStore } from '../../store/auth'

// Header drives visibility through this prop; declaring it as a local ref would mean
// the modal could never open.
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update'])

const usersStore = useUsersStore()
const authStore = useAuthStore()

const mode = ref('menu')
const inviteEmail = ref('')
const search = ref('')
const selectedId = ref(null)
const feedback = ref('')
const feedbackOk = ref(false)

const isSelf = user => user._id === authStore.user?._id

const visibleUsers = computed(() => {
  const term = search.value.trim().toLowerCase()
  return usersStore.activeUsers
    .filter(user => !term || user.email.toLowerCase().includes(term))
    .slice()
    .sort((a, b) => a.email.localeCompare(b.email))
})

const selectedUser = computed(
  () => visibleUsers.value.find(user => user._id === selectedId.value) || null
)

const setMode = newMode => {
  mode.value = newMode
  feedback.value = ''
  selectedId.value = null
  search.value = ''
  if (newMode === 'manage') usersStore.fetchUsers()
}

const toggleSelect = user => {
  // An admin cannot deactivate their own account, so do not let it be selected.
  if (isSelf(user)) return
  selectedId.value = selectedId.value === user._id ? null : user._id
}

const close = () => {
  emit('update')
}

// Reset to a clean panel each time it is reopened.
watch(
  () => props.isVisible,
  visible => {
    if (!visible) return
    mode.value = 'menu'
    inviteEmail.value = ''
    search.value = ''
    selectedId.value = null
    feedback.value = ''
  }
)

const handleInvite = async () => {
  const email = inviteEmail.value
  const result = await usersStore.inviteUser(email)
  feedbackOk.value = result.ok
  feedback.value = result.ok ? `Added ${email}` : result.message
  if (result.ok) inviteEmail.value = ''
}

const handleDeactivate = async () => {
  const user = selectedUser.value
  if (!user) return

  const result = await usersStore.deactivateUser(user._id)
  feedbackOk.value = result.ok
  feedback.value = result.ok ? `Removed ${user.email}` : result.message
  if (result.ok) selectedId.value = null
}
</script>

<style scoped>
/* Shared with the header controls so the panel reads as part of the same app:
   green = active/affirmative, blue = current selection, red = destructive. */
.modal {
  --accent-green: rgb(65, 199, 32);
  --accent-blue: #186bc4;
  --accent-red: #d32f2f;

  display: block;
  position: fixed;
  z-index: 1002;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
}

.modal-content {
  background-color: #ffffff;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 50%;
  min-width: 320px;
  font-family: 'Arial', sans-serif;
  color: #333;
  border-radius: 10px;
  position: relative;
}

.panel-title {
  margin: 0 0 15px;
  font-size: 1.2em;
}

.mode-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.form-actions {
  margin-top: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hint {
  font-size: 0.8em;
  color: #666;
  margin: 8px 0;
}

.selected-note {
  color: #444;
}

.search-box {
  width: 100%;
  padding: 10px;
  margin: 8px 0;
  border: 1px solid #ccc;
  box-sizing: border-box;
  border-radius: 5px;
}

.user-list {
  list-style: none;
  padding: 0;
  margin: 10px 0;
  max-height: 260px;
  overflow-y: auto;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-row:hover {
  background-color: #f5f5f5;
}

/* Selection uses the header's blue, kept translucent so the email stays readable. */
.user-row.selected {
  background-color: rgba(24, 107, 196, 0.15);
  border-left-color: var(--accent-blue);
}

.user-row.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.user-row.disabled:hover {
  background-color: transparent;
}

.user-email {
  font-size: 0.9em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  font-size: 0.7em;
  font-style: normal;
  background-color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 5px;
  margin-left: 6px;
  color: #555;
}

.badge-admin {
  background-color: var(--accent-blue);
  color: #fff;
}

.feedback {
  font-size: 0.85em;
  margin-top: 12px;
}

.feedback.ok {
  color: #2e7d32;
}

.feedback.bad {
  color: var(--accent-red);
}

button {
  background-color: rgb(161, 161, 161);
  color: rgb(255, 255, 255);
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  margin: 0px 5px 10px;
  cursor: pointer;
  min-width: 100px;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: rgb(109, 109, 109);
}

.btn-add {
  background-color: var(--accent-green);
}

.btn-add:hover {
  background-color: rgb(52, 168, 24);
}

.btn-remove {
  background-color: var(--accent-red);
}

.btn-remove:hover {
  background-color: #9a2020;
}

button:disabled,
button:disabled:hover {
  background-color: #ddd;
  color: #999;
  cursor: not-allowed;
}

.close {
  color: #aaa;
  position: absolute;
  top: 10px;
  right: 20px;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

input[type='email'],
input[type='password'] {
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid #ccc;
  box-sizing: border-box;
  border-radius: 5px;
}
</style>
