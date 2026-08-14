import { defineEventHandler, readBody, createError } from '#imports'
import User from '../../../models/User'
import publicUser from '../../../utils/publicUser'
import { forceLogout } from '../../../utils/realtime'
import logger from '../../../utils/logger'

export default defineEventHandler(async event => {
  const actor = event.context.user

  if (actor?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const { userId } = await readBody(event)

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId is required' })
  }

  if (String(userId) === String(actor.userId)) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot deactivate your own account' })
  }

  const user = await User.findById(userId).select('+password')

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (user.role === 'admin') {
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true })
    if (activeAdmins <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot deactivate the last active admin' })
    }
  }

  user.isActive = false
  await user.save()

  forceLogout(user._id.toString(), 'Your account has been deactivated')

  logger.info(`Admin ${actor.userId} deactivated user ${user.email}`)
  return { status: 'deactivated', user: publicUser(user) }
})
