import { asText, serviceFailure, pool, ensureDatabase } from "@/lib/platform-db";
import bcrypt from "bcrypt";
import crypto from "crypto";

// NOTE: a GET handler used to live here returning every user's id, username,
// role, full_name, nic, and email with no authentication required at all
// ("Login reference data"). NIC numbers are sensitive PII. It has been
// removed — there is no legitimate unauthenticated use case for it, and the
// frontend never called it. If an admin-facing user list is needed, build it
// under /api/admin/* the same way app/api/admin/system/route.ts does, behind
// a session.role === "admin" check.

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await request.json().catch(() => ({}));
    const username = asText(body.username);
    const password = asText(body.password);

    if (!username || !password) {
      return Response.json(
        { ok: false, message: "Username and password required." },
        { status: 400 },
      );
    }

    // Fetch user by username only — never compare plaintext password in SQL
    // because the DB stores bcrypt hashes.
    const query = `
      SELECT id, username, password, role, full_name, email
      FROM users
      WHERE username = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [username]);
    const user = result.rows[0];

    // Verify password against stored hash using bcrypt
    const valid = user && (await bcrypt.compare(password, user.password));
    if (!valid) {
      return Response.json(
        { ok: false, message: "Invalid username or password." },
        { status: 401 },
      );
    }

    // Create a signed session cookie (HMAC). In production, set SESSION_SECRET.
    const secret = process.env.SESSION_SECRET || "dev-session-secret";
    const session = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      exp: Date.now() + 24 * 3600 * 1000,
    };
    const payload = Buffer.from(JSON.stringify(session)).toString("base64");
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const cookieValue = `${payload}.${sig}`;

    const headers = new Headers();
    headers.append(
      "set-cookie",
      `session=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 3600}`,
    );

    // Return user info (without password hash)
    const { password: _pw, ...safeUser } = user;
    return Response.json(
      { ok: true, token: cookieValue, user: safeUser },
      { headers },
    );
  } catch (reason) {
    return serviceFailure(reason);
  }
}
