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
    const { searchParams } = new URL(request.url);
    const session = parseSession(request);
    if (!session) {
      return Response.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const account = asText(searchParams.get("account") || "");
    if (!account) {
      return Response.json(
        { ok: false, message: "account parameter required" },
        { status: 400 },
      );
    }

    // Check account ownership (unless admin)
    const accRes = await pool.query(
      "SELECT user_id FROM accounts WHERE account_number = $1 LIMIT 1",
      [account],
    );
    if (!accRes.rows[0]) {
      return Response.json(
        { ok: false, message: "Account not found" },
        { status: 404 },
      );
    }
    const ownerId = Number(accRes.rows[0].user_id);
    const requesterId = Number(session.id);
    if (session.role !== "admin" && ownerId !== requesterId) {
      return Response.json(
        { ok: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const txRes = await pool.query(
      "SELECT * FROM transactions WHERE from_account = $1 OR to_account = $1 ORDER BY created_at DESC",
      [account],
    );

    return Response.json({
      ok: true,
      account,
      transactions: txRes.rows,
    });
  } catch (reason) {
    return serviceFailure(reason);
  }
}
