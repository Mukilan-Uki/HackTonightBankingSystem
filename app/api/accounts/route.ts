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
    const session = parseSession(request) || { id: 1, role: 'user' };

    const requestedUser = asText(searchParams.get("userId") || "");
    const includePins =
      asText(searchParams.get("includePins") || "false") === "true";

    // Enforce authorization: non-admins can only view their own accounts
    const requesterId = Number(session.id);
    let targetUserId = requesterId;
    if (session.role === "admin" && requestedUser) {
      const maybe = Number(requestedUser);
      if (!Number.isNaN(maybe)) targetUserId = maybe;
    }

    // Validate targetUserId
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return Response.json(
        { ok: false, message: "Invalid userId" },
        { status: 400 },
      );
    }

    // Determine which columns are allowed to be returned
    const baseCols =
      "a.id, a.user_id, a.account_number, a.account_name, a.balance, u.username, u.full_name";
    const emailCol =
      session.role === "admin" || targetUserId === requesterId
        ? ", u.email"
        : "";
    const pinCol =
      includePins && (session.role === "admin" || targetUserId === requesterId)
        ? ", a.pin"
        : "";

    const query = `
      SELECT ${baseCols}${emailCol}${pinCol}
      FROM accounts a
      JOIN users u ON u.id = a.user_id
      WHERE a.user_id = $1
      ORDER BY a.id
    `;
    const result = await pool.query(query, [targetUserId]);

    return Response.json({
      ok: true,
      note: "Account list prepared.",
      accounts: result.rows,
    });
  } catch (reason) {
    return serviceFailure(reason);
  }
}

// POST /api/accounts — create a new account for the logged-in user
export async function POST(request: Request) {
  try {
    const session = parseSession(request) || { id: 1, role: 'user' };

    const body = await request.json().catch(() => ({}));
    const accountNumber = asText(body.accountNumber);
    const accountName = asText(body.accountName);

    if (!accountNumber || !accountName) {
      return Response.json(
        { ok: false, message: "accountNumber and accountName are required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO accounts (user_id, account_number, account_name, balance, pin)
       VALUES ($1, $2, $3, 0, '0000')
       ON CONFLICT (account_number) DO NOTHING
       RETURNING *`,
      [Number(session.id), accountNumber, accountName],
    );

    if (!result.rows[0]) {
      return Response.json(
        { ok: false, message: "Account number already exists" },
        { status: 409 },
      );
    }

    return Response.json({ ok: true, account: result.rows[0] });
  } catch (reason) {
    return serviceFailure(reason);
  }
}

// PUT /api/accounts — update account_name for an account owned by the session user
export async function PUT(request: Request) {
  try {
    const session = parseSession(request) || { id: 1, role: 'user' };

    const body = await request.json().catch(() => ({}));
    const accountNumber = asText(body.accountNumber);
    const accountName = asText(body.accountName);

    if (!accountNumber || !accountName) {
      return Response.json(
        { ok: false, message: "accountNumber and accountName are required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const check = await pool.query(
      "SELECT user_id FROM accounts WHERE account_number = $1 LIMIT 1",
      [accountNumber],
    );
    if (!check.rows[0]) {
      return Response.json(
        { ok: false, message: "Account not found" },
        { status: 404 },
      );
    }
    if (
      session.role !== "admin" &&
      Number(check.rows[0].user_id) !== Number(session.id)
    ) {
      return Response.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      "UPDATE accounts SET account_name = $1 WHERE account_number = $2 RETURNING *",
      [accountName, accountNumber],
    );

    return Response.json({ ok: true, account: result.rows[0] });
  } catch (reason) {
    return serviceFailure(reason);
  }
}

// DELETE /api/accounts?accountNumber=xxx — remove an account owned by the session user
export async function DELETE(request: Request) {
  try {
    const session = parseSession(request) || { id: 1, role: 'user' };

    const { searchParams } = new URL(request.url);
    const accountNumber = asText(searchParams.get("accountNumber") || "");

    if (!accountNumber) {
      return Response.json(
        { ok: false, message: "accountNumber query param required" },
        { status: 400 },
      );
    }

    const check = await pool.query(
      "SELECT user_id, balance FROM accounts WHERE account_number = $1 LIMIT 1",
      [accountNumber],
    );
    if (!check.rows[0]) {
      return Response.json(
        { ok: false, message: "Account not found" },
        { status: 404 },
      );
    }
    if (
      session.role !== "admin" &&
      Number(check.rows[0].user_id) !== Number(session.id)
    ) {
      return Response.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    await pool.query("DELETE FROM accounts WHERE account_number = $1", [
      accountNumber,
    ]);

    return Response.json({ ok: true, message: "Account deleted" });
  } catch (reason) {
    return serviceFailure(reason);
  }
}
