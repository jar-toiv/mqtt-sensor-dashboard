import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api'
})

const messageFrom = (error, fallback) => {
  const data = error.response?.data
  if (data) return data.statusMessage || data.message || fallback
  if (error.request) return 'No response from server'
  return fallback
}

export const apiService = {
  auth: {
    async login(credentials) {
      try {
        const response = await apiClient.post('/login', {
          email: credentials.email,
          password: credentials.password
        })
        return response.data
      } catch (error) {
        throw new Error(messageFrom(error, 'Login failed'))
      }
    },

    // Claims an invited account by setting its first password.
    async setPassword({ email, password }) {
      try {
        const response = await apiClient.post('/set-password', { email, password })
        return response.data
      } catch (error) {
        throw new Error(messageFrom(error, 'Could not set password'))
      }
    },

    async me() {
      const response = await apiClient.get('/me')
      return response.data
    }
  },

  user: {
    async register(userData) {
      const response = await apiClient.post('register', userData)
      return response.data
    },
  },

  // Admin-only account management behind the header gear menu.
  admin: {
    async listUsers() {
      try {
        const response = await apiClient.get('/users/users')
        return response.data
      } catch (error) {
        throw new Error(messageFrom(error, 'Could not load users'))
      }
    },

    async inviteUser(email) {
      try {
        const response = await apiClient.post('/users/invite', { email })
        return response.data
      } catch (error) {
        throw new Error(messageFrom(error, 'Could not invite user'))
      }
    },

    async deactivateUser(userId) {
      try {
        const response = await apiClient.post('/users/deactivate', { userId })
        return response.data
      } catch (error) {
        throw new Error(messageFrom(error, 'Could not deactivate user'))
      }
    }
  },

  async logout() {
    try {
      const response = await apiClient.post('/logout')
      return response.data
    } catch (error) {
      throw new Error(messageFrom(error, 'Logout failed'))
    }
  }
}
