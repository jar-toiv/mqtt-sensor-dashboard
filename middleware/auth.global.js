import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuthStore } from '../store/auth'

const PUBLIC_ROUTES = ['/']

export default defineNuxtRouteMiddleware(to => {
  if (import.meta.server) return

  if (PUBLIC_ROUTES.includes(to.path)) return

  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) {
    return navigateTo('/')
  }
})