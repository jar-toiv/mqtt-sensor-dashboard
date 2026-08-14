import { defineNuxtPlugin, useRequestFetch } from '#imports'
import { useAuthStore } from '../store/auth'

export default defineNuxtPlugin(async () => {
  const requestFetch = useRequestFetch()
  const authStore = useAuthStore()

  if (authStore.isLoggedIn) return

  await authStore.restoreSession(requestFetch)
})