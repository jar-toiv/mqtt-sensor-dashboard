import { createError } from '#imports'
import User from '../../models/User'
import {defineEventHandler, readBody} from '#imports'
import logger from '../../utils/logger'

export default defineEventHandler(async event => {
  try {
    const { email, password, role } = await readBody(event)
    const user = new User({ email, password, role })
    await user.save()
    logger.info(`Registered user ${email} (role: ${user.role})`)
    return { status: 'success' }
  } catch (error) {
    logger.error('Registration failed', error)
    throw createError({ statusCode: 400, statusMessage: 'Registration failed' })
  }
})