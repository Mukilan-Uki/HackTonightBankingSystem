import { asText, ensureDatabase, pool, serviceFailure } from '@/lib/platform-db'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    await ensureDatabase()
    const body = await request.json().catch(() => ({}))

    const username = asText(body.username)
    const fullName = asText(body.fullName)
    const branch = asText(body.branch)
    const email = asText(body.email)
    const password = asText(body.password)

    console.error('Signup recieved body:', {
      username,
      fullName,
      branch,
      email,
      passwordSet: Boolean(password),
    })

    if (!username || !fullName || !email || !password) {
      return Response.json(
        { ok: false, message: 'Username, full name, email, and password are required.' },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1 LIMIT 1',
        [username],
      )

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK')
        return Response.json(
          { ok: false, message: 'Username already exists. Choose a different username.' },
          { status: 409 },
        )
      }

      const userRes = await client.query(
        `INSERT INTO users (username, password, role, full_name, nic, email)
         VALUES ($1, $2, 'customer', $3, $4, $5)
         RETURNING id, username, role, full_name, email`,
        [username, hashedPassword, fullName, branch, email],
      )

      const user = userRes.rows[0]
      if (!user) {
        await client.query('ROLLBACK')
        return Response.json(
          { ok: false, message: 'Failed to create user account.' },
          { status: 500 },
        )
      }

      await client.query(
        `INSERT INTO accounts (user_id, account_number, account_name, balance, pin)
         VALUES ($1, $2, $3, 0, '0000')`,
        [user.id, username, fullName],
      )

      await client.query('COMMIT')

      const session = {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        exp: Date.now() + 24 * 3600 * 1000,
      }
      const payload = Buffer.from(JSON.stringify(session)).toString('base64')
      const sig = crypto
        .createHmac('sha256', process.env.SESSION_SECRET || 'dev-session-secret')
        .update(payload)
        .digest('hex')
      const cookieValue = `${payload}.${sig}`

      const headers = new Headers()
      headers.append(
        'set-cookie',
        `session=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 3600}`,
      )

      return Response.json({ ok: true, user }, { headers })
    } catch (error: unknown) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Signup rollback error:', rollbackError)
      }
      console.error('Signup internal error:', error)
      return serviceFailure(error)
    } finally {
      client.release()
    }
  } catch (reason: unknown) {
    console.error('Signup route error:', reason)
    return serviceFailure(reason)
  }
}
