import { defineEventHandler, createError } from '#imports'
import User from '../../models/User'
import publicUser from '../../utils/publicUser'

export default defineEventHandler(async event => {
  const session = event.context.user

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const user = await User.findById(session.userId).select('+password')

  if (!user || !user.isActive) {
    throw createError({ statusCode: 401, statusMessage: 'Session is no longer valid' })
  }

    return { user: publicUser(user) }
})