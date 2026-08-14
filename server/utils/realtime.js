import logger from './logger'

let ioRef = null

export const registerIo = io => {
  ioRef = io
}

export const userRoom = userId => `user:${userId}`

export const forceLogout = (userId, reason = 'Your access has been revoked') => {
  if (!ioRef) {
    logger.warn(`forceLogout(${userId}) skipped — socket server not available`)
    return false
  }

  ioRef.to(userRoom(userId)).emit('force-logout', { reason })
  logger.info(`Pushed force-logout to user ${userId}`)
  return true
}
