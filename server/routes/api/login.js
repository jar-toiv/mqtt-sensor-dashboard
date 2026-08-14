import { defineEventHandler, readBody, setCookie, createError, useRuntimeConfig } from '#imports'
import jwt from 'jsonwebtoken'
import User from '~/server/models/User'
import logger from '../../utils/logger'

const config = useRuntimeConfig()
const options = { expiresIn: config.jwtExpires }

export default defineEventHandler(async event => {
  if (event.req.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  try {
    const { email, password } = await readBody(event)

    const user = await User.findOne({ email }).select('+password +salt')

    if (!user) {
      logger.warn(`Login failed: no account for ${email}`)
      throw createError({ statusCode: 401, statusMessage: 'Authentication failed' })
    }

    if (!user.isActive) {
      logger.warn(`Login blocked: deactivated account ${email}`)
      throw createError({ statusCode: 403, statusMessage: 'Account has been deactivated' })
    }

    if (!user.password) {
      logger.info(`First-login challenge issued for ${email}`)
      return { firstLogin: true, email: user.email }
    }

    if (!password || !user.verifyPassword(password)) {
      logger.warn(`Login failed: bad password for ${email}`)
      throw createError({ statusCode: 401, statusMessage: 'Authentication failed' })
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, options)

    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax'
    })

    logger.info(`Login succeeded for ${email} (role: ${user.role})`)

    return {
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        firstLogin: user.firstLogin
      }
    }
  } catch (error) {
    if (error.statusCode) throw error

    logger.error('Login error', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
