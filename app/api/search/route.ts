import { asText, serviceFailure, pool } from "@/lib/platform-db";
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
    if (!session) {
      return Response.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = asText(searchParams.get("q"));

    const pattern = `%${q}%`;
    const sql = `
      SELECT 'user' AS type, id::text, username AS label, email AS detail FROM users
      WHERE username ILIKE $1 OR full_name ILIKE $1
      UNION ALL
      SELECT 'account' AS type, id::text, account_number AS label, account_name AS detail FROM accounts
      WHERE account_number ILIKE $1 OR account_name ILIKE $1
      UNION ALL
      SELECT 'transaction' AS type, id::text, from_account || ' -> ' || to_account AS label, description AS detail FROM transactions
      WHERE description ILIKE $1
      LIMIT 25
    `;
    const result = await pool.query(sql, [pattern]);

    return Response.json({
      ok: true,
      query: q,
      results: result.rows,
    });
  } catch (reason) {
    return serviceFailure(reason);
  }
}
