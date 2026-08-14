import { defineEventHandler, readBody, createError, useRuntimeConfig, setCookie } from '#imports'
import jwt from 'jsonwebtoken'
import User from '~/server/models/User'
import logger from '../../utils/logger'

const MIN_PASSWORD_LENGTH = 8

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    })
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'No invitation found for that email' })
  }

  if (!user.isActive) {
    throw createError({ statusCode: 403, statusMessage: 'Account has been deactivated' })
  }

  if (user.password) {
    logger.warn(`Rejected set-password on already-claimed account ${user.email}`)
    throw createError({ statusCode: 409, statusMessage: 'This account has already been set up' })
  }

  user.password = password
  user.firstLogin = false
  await user.save()

  const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpires
  })

  setCookie(event, 'auth-token', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax'
  })

  logger.info(`Account claimed and password set for ${user.email}`)

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
})
