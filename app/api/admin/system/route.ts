import { serviceFailure, pool } from "@/lib/platform-db";
import crypto from "crypto";

function parseSession(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|; )session=([^;]+)/);
  if (!match) return null;
  const val = match[1];
  const parts = val.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const secret = process.env.SESSION_SECRET || "dev-session-secret";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig)))
      return null;
  } catch (_) {
    return null;
  }
  try {
    const session = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf8"),
    );
    if (session.exp && Date.now() > session.exp) return null;
    return session;
  } catch (_) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const session = parseSession(request);
    if (!session || session.role !== "admin") {
      return Response.json(
        { ok: false, message: "Admin authentication required" },
        { status: 401 },
      );
    }

    // Do not return sensitive fields like passwords or environment variables
    const users = await pool.query(
      `SELECT id, username, role, full_name, nic, email, created_at FROM users ORDER BY id`,
    );
    const accounts = await pool.query(
      `SELECT id, user_id, account_number, account_name, balance, created_at FROM accounts ORDER BY id`,
    );
    const logs = await pool.query(
      `SELECT id, event, payload, created_at FROM audit_logs ORDER BY id DESC LIMIT 10`,
    );

    return Response.json({
      ok: true,
      message: "System overview.",
      users: users.rows,
      accounts: accounts.rows,
      auditLogs: logs.rows,
    });
  } catch (reason) {
    return serviceFailure(reason);
  }
}
