<template>
  <header class="header">
    <nav class="nav-right">
      <!-- Settings Button -->
      <div
        v-if="authStore.isLoggedIn"
        class="settings-button-container"
      >
        <button
          class="settings-button"
          @click="toggleSettings"
        >
          <font-awesome-icon
            class="settings-gear"
            :icon="['fas', 'gear']"
          />
        </button>
        <!-- Dynamic component based on user role -->
        <component
          :is="settingsComponent"
          :is-visible="isSettingsVisible"
          @update="toggleSettings"
        />
      </div>
      <!-- Login/Logout Button -->
      <div class="login-container">
        <button
          :class="['login-logout-button', buttonClass]"
          @click="toggleLoginForm"
        >
          <ClientOnly>
            <font-awesome-icon :icon="['fas', 'fa-user']" />
          </ClientOnly>
        </button>
        <LoginForm
          v-if="isLoginFormVisible"
          @close="isLoginFormVisible = false"
        />
      </div>
    </nav>
  </header>
</template>

<script setup>
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faUser, faGear } from '@fortawesome/free-solid-svg-icons'
  import { library } from '@fortawesome/fontawesome-svg-core' // If you're using VueUse for event emitting
  import { useAuthStore } from '../../store/auth'
  import { ref, computed } from 'vue'
  import { useRouter } from '#imports'
  import UserSettings from '../user/UserSettings.vue'
  import AdminSettings from '../admin/AdminSettings.vue'
  import LoginForm from './LoginForm.vue'

  const authStore = useAuthStore()
  const router = useRouter()
  const isLoginFormVisible = ref(false)
  const isSettingsVisible = ref(false)

  library.add(faUser, faGear)

  const buttonClass = computed(() => {
    if (authStore.isLoggedIn) {
      return { 'bg-green': true, 'logged-in': true }
    } else {
      return 'bg-light-blue'
    }
  })

  const toggleLoginForm = () => {
    if (authStore.isLoggedIn) {
      authStore.logout()
      router.push('/')
    } else {
      isLoginFormVisible.value = !isLoginFormVisible.value
    }
  }

  const toggleSettings = () => {
    isSettingsVisible.value = !isSettingsVisible.value
  }

  const settingsComponent = computed(() => {
    return authStore.userRole === 'admin' ? AdminSettings : UserSettings
  })
</script>

<style>
  html,
  body,
  span,
  iframe {
    margin: 0;
    padding: 0;
    border: 0;
  }

  * {
    box-sizing: border-box;
  }

  .header {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    background-color: var(--surface-card);
    border-bottom: 1px solid var(--border-hairline);
    padding: 10px;
    z-index: 1000;
  }
  .nav-right {
    display: flex;
    align-items: center;
  }

  /**
*   Login and logout buttons
*/
  .login-logout-button,
  .settings-button {
    border: none;
    margin-right: 5px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.5em;
    color: var(--ink-primary);
    background-color: var(--surface-card-hover);
    transition-delay: 0.1s;
    transition: box-shadow 0.3s ease, background-color 0.3s ease;
  }
  .login-logout-button.bg-light-blue {
    background-color: var(--accent);
  }

  .login-logout-button.logged-in {
    background-color: var(--status-good);
  }

  .login-logout-button.logged-in:hover {
    background-color: var(--status-critical);
  }

  .login-logout-button:hover {
    box-shadow: 0 0 0 1px var(--border-hairline);
  }

  /**
*   Settings button
*/
  .settings-button:hover {
    background-color: var(--surface-page);
    box-shadow: 0 0 0 1px var(--border-hairline);
  }

  .settings-button .settings-gear {
    transition: transform 0.5s ease;
  }

  .settings-button:hover .settings-gear {
    transform: rotate(180deg);
  }

  .login-container {
    position: relative;
  }
</style>
