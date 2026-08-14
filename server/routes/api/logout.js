import { defineEventHandler, setCookie } from '#imports'

export default defineEventHandler(event => {
  setCookie(event, 'auth-token', '', {
    httpOnly: true,
    path: '/',
    maxAge: -1
  })

  return { status: 'logged-out' }
})