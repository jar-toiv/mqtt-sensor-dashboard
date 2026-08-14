import { defineEventHandler, readBody, createError } from '#imports'
import validator from 'validator'
import User from '../../../models/User'
import publicUser from '../../../utils/publicUser'
import logger from '../../../utils/logger'

export default defineEventHandler(async event => {
  if (event.context.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const { email } = await readBody(event)

  if (!email || !validator.isEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid email is required' })
  }

  const normalized = email.toLowerCase().trim()
  const existing = await User.findOne({ email: normalized })

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true
      existing.firstLogin = true
      existing.password = undefined
      existing.salt = undefined
      await existing.save()

      logger.info(`Re-invited previously deactivated user ${normalized}`)
      return { status: 'reinvited', user: publicUser(existing) }
    }

    throw createError({ statusCode: 409, statusMessage: 'That user already exists' })
  }

  const user = new User({ email: normalized, role: 'basic', firstLogin: true })
  await user.save()

  logger.info(`Invited new basic user ${normalized}`)
  return { status: 'invited', user: publicUser(user) }
})
