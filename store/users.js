import { defineStore } from 'pinia'
import { apiService } from '../server/service/apiService'
import logger from '../utils/clientLogger'

export const useUsersStore = defineStore('usersStore', {
  state: () => ({
    users: [],
    loading: false,
    error: null
  }),

  getters: {
    activeUsers: state => state.users.filter(user => user.isActive),
    pendingInvites: state => state.users.filter(user => user.isActive && user.pendingInvite)
  },

  actions: {
    async fetchUsers() {
      this.loading = true
      this.error = null
      try {
        this.users = await apiService.admin.listUsers()
        logger.debug(`Loaded ${this.users.length} users`)
      } catch (error) {
        this.error = error.message
        logger.error('Error fetching users', error.message)
      } finally {
        this.loading = false
      }
    },

    async inviteUser(email) {
      this.error = null
      try {
        const { user } = await apiService.admin.inviteUser(email)

        const index = this.users.findIndex(u => u._id === user._id)
        if (index === -1) {
          this.users.unshift(user)
        } else {
          this.users[index] = user
        }

        logger.info(`Invited ${email}`)
        return { ok: true, user }
      } catch (error) {
        this.error = error.message
        logger.error('Error inviting user', error.message)
        return { ok: false, message: error.message }
      }
    },

    async deactivateUser(userId) {
      this.error = null
      try {
        const { user } = await apiService.admin.deactivateUser(userId)

        const index = this.users.findIndex(u => u._id === user._id)
        if (index !== -1) this.users[index] = user

        logger.info(`Deactivated ${user.email}`)
        return { ok: true }
      } catch (error) {
        this.error = error.message
        logger.error('Error deactivating user', error.message)
        return { ok: false, message: error.message }
      }
    }
  }
})
