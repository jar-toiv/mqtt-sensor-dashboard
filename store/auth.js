import { defineStore } from 'pinia'
import { apiService } from '../server/service/apiService'
import { useCookie, useRouter } from '#imports'
import { $fetch } from 'ofetch'

import logger from '../utils/clientLogger'

export const useAuthStore = defineStore('authStore', {
  state: () => ({
    isLoggedIn: false,
    token: null,
    user: null,
    userRole: null,
  }),

  actions: {
    applySession(data) {
      this.token = data.token
      this.user = data.user
      this.userRole = data.user.role

      const tokenCookie = useCookie('auth-token')
      tokenCookie.value = data.token

      this.isLoggedIn = !!data.token
    },

    async login(credentials) {
      try {
        const data = await apiService.auth.login(credentials)

        if (data.firstLogin) {
          return { firstLogin: true, email: data.email }
        }

        this.applySession(data)
        return { ok: true }
      } catch (error) {
        logger.error('[Auth Store] Login error:', error.message)
        return { ok: false, message: error.message }
      }
    },

    async setPassword({ email, password }) {
      try {
        const data = await apiService.auth.setPassword({ email, password })
        this.applySession(data)
        return { ok: true }
      } catch (error) {
        logger.error('[Auth Store] Set password error:', error.message)
        return { ok: false, message: error.message }
      }
    },

    async restoreSession(customFetch) {
      try {
        const fetcher = customFetch || $fetch
        const { user } = await fetcher('/api/me')
        this.user = user
        this.userRole = user.role
        this.isLoggedIn = true
        return true
      } catch (error) {
        logger.debug('No session to restore:', error.message)
        this.user = null
        this.userRole = null
        this.isLoggedIn = false
        return false
      }
    },
    
    async logout() {
      try {
        await apiService.logout()

        this.isLoggedIn = false
        this.token = null
        this.user = null
        this.userRole = null

        const router = useRouter()
        router.push('/')
      } catch (error) {
        logger.error('[Auth Store] Logout error:', error.message)
      }
    }

  }
})
