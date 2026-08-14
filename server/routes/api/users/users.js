import { defineEventHandler, createError } from '#imports'
import User from '../../../models/User'
import publicUser from '../../../utils/publicUser'
import logger from '../../../utils/logger'

export default defineEventHandler(async event => {
  if (event.context.user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const users = await User.find().select('+password').sort({ createdAt: -1 })
  logger.debug(`Admin listed ${users.length} users`)

  return users.map(publicUser)
})
