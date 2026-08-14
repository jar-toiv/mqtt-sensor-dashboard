<template>
  <div class="login-popup">
    <!-- Step 1: normal sign in -->
    <form
      v-if="step === 'login'"
      @submit.prevent="handleLogin"
    >
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
      >
      <!-- Not required: an invited user has no password yet and only needs their email. -->
      <input
        v-model="password"
        type="password"
        placeholder="Password"
      >
      <button
        id="submit-button"
        type="submit"
      >
        Login
      </button>
    </form>

    <!-- Step 2: invited account claiming itself by choosing a first password -->
    <form
      v-else
      @submit.prevent="handleSetPassword"
    >
      <p class="first-login-note">
        Welcome, <strong>{{ email }}</strong>. Choose a password to finish setting up
        your account.
      </p>
      <input
        v-model="newPassword"
        type="password"
        placeholder="New password"
        required
      >
      <input
        v-model="confirmPassword"
        type="password"
        placeholder="Confirm password"
        required
      >
      <button
        id="submit-button"
        type="submit"
      >
        Set password
      </button>
      <button
        type="button"
        class="secondary"
        @click="backToLogin"
      >
        Cancel
      </button>
    </form>

    <p
      v-if="error"
      class="login-error"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../../store/auth'

  const MIN_PASSWORD_LENGTH = 8

  const emit = defineEmits(['close'])
  const step = ref('login')
  const email = ref('')
  const password = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const error = ref('')
  const authStore = useAuthStore()
  const router = useRouter()

  const finish = () => {
    router.push('/dashboard')
    emit('close')
  }

  const handleLogin = async () => {
    error.value = ''
    const result = await authStore.login({
      email: email.value,
      password: password.value
    })

    if (result.firstLogin) {
      // Unclaimed invite: collect a password instead of reporting a failure.
      step.value = 'firstLogin'
      password.value = ''
      return
    }

    if (result.ok) {
      finish()
    } else {
      error.value = result.message || 'Invalid email or password'
    }
    password.value = ''
  }

  const handleSetPassword = async () => {
    error.value = ''

    if (newPassword.value !== confirmPassword.value) {
      error.value = 'Passwords do not match'
      return
    }

    if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
      error.value = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      return
    }

    const result = await authStore.setPassword({
      email: email.value,
      password: newPassword.value
    })

    if (result.ok) {
      finish()
    } else {
      error.value = result.message || 'Could not set password'
    }

    newPassword.value = ''
    confirmPassword.value = ''
  }

  const backToLogin = () => {
    step.value = 'login'
    error.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
</script>

<style scoped>
  .login-popup {
    position: absolute;
    top: 100%;
    right: 0;
    width: 200px;
    background-color: white;
    padding: 15px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 1001;
    border-radius: 8px;
  }

  input[type='email'],
  input[type='password'] {
    width: 100%;
    height: 10px;
    padding: 10px;
    margin: 5px 0;
    display: inline-block;
    border: 1px solid #ccc;
    box-sizing: border-box;
    border-radius: 3px;
  }

  button {
    color: white;
    padding: 8px;
    margin: 8px 0px;
    border: 1px solid rgb(255, 255, 255);
    border-radius: 3px;
    cursor: pointer;
    width: 100%;
  }

  button:hover {
    opacity: 0.8;
  }

  #submit-button {
    background-color: rgb(65, 199, 32);
    color: white;
  }

  button.secondary {
    background-color: rgb(161, 161, 161);
  }

  .first-login-note {
    font-size: 0.75em;
    color: #444;
    margin: 0 0 8px;
    line-height: 1.4;
  }

  .login-error {
    font-size: 0.75em;
    color: #c62828;
    margin: 8px 0 0;
  }
</style>
