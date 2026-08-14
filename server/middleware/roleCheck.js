// /server/middleware/roleCheck.js
import jwt from 'jsonwebtoken'
import { useRuntimeConfig, defineEventHandler, createError } from '#imports'
import User from '../models/User'
import logger from '../utils/logger'

//! You can open /api/register if you want to insert user via curl incase you lose access.
/*
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpass123","role":"admin"}'
**/

const openRoutes = ['', '/', ' ', '/api/login', '/api/set-password']

const adminOnlyPrefixes = ['/api/users/', '/api/register']

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const url = event.req.url || ''
  const pathname = url.split('?')[0]

  if (!pathname.startsWith('/api/')) {
    return
  }

  if (openRoutes.includes(pathname)) {
    return
  }

  const token = extractTokenFromCookie(event.req.headers.cookie)

  if (!token) {
    logger.warn(`Unauthorized: no token provided for ${pathname}`)

    return new Response(JSON.stringify({ message: 'No token provided' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)

    if (!isRoleAllowed(decoded.role, pathname)) {
      logger.warn(`Access denied: role '${decoded.role}' may not call ${pathname}`)
      throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
    }

    if (pathname.startsWith('/api/')) {
      const account = await User.findById(decoded.userId).select('isActive role')

      if (!account || !account.isActive) {
        logger.warn(`Access revoked mid-session for user ${decoded.userId} on ${pathname}`)
        return sendUnauthorizedResponse('Account is no longer active')
      }

      decoded.role = account.role
    }

    event.context.user = decoded
  } catch (error) {
    if (error.statusCode === 403) {
      return sendUnauthorizedResponse('Not authorized')
    }

    logger.warn(`Authorization failed for ${pathname}: ${error.message}`)

    if (error.name === 'TokenExpiredError' && openRoutes.includes(pathname)) {
      logger.debug('Token expired but route is open, allowing request')
      return;
    }

    return sendUnauthorizedResponse('Unauthorized due to error: ' + error.message);
  }
});

function extractTokenFromCookie(cookieHeader) {
  const match = cookieHeader?.match(/auth-token=([^;]+)/)
  return match ? match[1] : undefined
}

function isRoleAllowed(role, pathname) {
  if (role === 'admin') return true

  return !adminOnlyPrefixes.some(prefix => pathname.startsWith(prefix))
}

function sendUnauthorizedResponse(message = 'Unauthorized') {
  return new Response(JSON.stringify({ message }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

