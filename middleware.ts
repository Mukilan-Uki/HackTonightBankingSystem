import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const protectedRoutes = [
  '/dashboard',
  '/bank-accounts',
  '/bank-transfer',
  '/pay-bills',
  '/e-statement',
  '/smart-spend',
]
const authPages = ['/login', '/sign-up']

function parseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value || ''
  if (!sessionCookie) return null

  const parts = sessionCookie.split('.')
  if (parts.length !== 2) return null

  const [payloadB64, sig] = parts
  const secret = process.env.SESSION_SECRET || 'dev-session-secret'
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex')

  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return null
    }
  } catch {
    return null
  }

  try {
    const session = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'))
    if (session.exp && Date.now() > session.exp) return null
    return session
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const rawPath = request.nextUrl.pathname
  const pathname = rawPath.replace(/\/$/, '') || '/'
  const session = parseSession(request)
  const isLoggedIn = Boolean(session)

  if (pathname === '/') {
    return NextResponse.redirect(new URL(isLoggedIn ? '/dashboard' : '/login', request.url))
  }

  if (authPages.includes(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/sign-up',
    '/dashboard/:path*',
    '/bank-accounts/:path*',
    '/bank-transfer/:path*',
    '/pay-bills/:path*',
    '/e-statement/:path*',
    '/smart-spend/:path*',
  ],
}
