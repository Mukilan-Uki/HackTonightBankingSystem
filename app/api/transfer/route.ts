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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = parseSession(request);
    if (!session) {
      return Response.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const fromAccount = asText(body.fromAccount || body.from || "");
    const toAccount = asText(body.toAccount || body.to || "");
    const amountRaw = asText(body.amount || "0");
    const description = asText(body.description || "");

    if (!fromAccount || !toAccount) {
      return Response.json(
        { ok: false, message: "from and to account required" },
        { status: 400 },
      );
    }
    if (fromAccount === toAccount) {
      return Response.json(
        { ok: false, message: "from and to must differ" },
        { status: 400 },
      );
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json(
        { ok: false, message: "amount must be a positive number" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock the source account row
      const fromRes = await client.query(
        "SELECT id, user_id, balance FROM accounts WHERE account_number = $1 FOR UPDATE",
        [fromAccount],
      );
      if (!fromRes.rows[0]) {
        await client.query("ROLLBACK");
        return Response.json(
          { ok: false, message: "source account not found" },
          { status: 404 },
        );
      }

      const ownerId = Number(fromRes.rows[0].user_id);
      const requesterId = Number(session.id);
      if (session.role !== "admin" && ownerId !== requesterId) {
        await client.query("ROLLBACK");
        return Response.json(
          { ok: false, message: "Forbidden" },
          { status: 403 },
        );
      }

      const fromBalance = Number(fromRes.rows[0].balance);
      if (fromBalance < amount) {
        await client.query("ROLLBACK");
        return Response.json(
          { ok: false, message: "Insufficient funds" },
          { status: 400 },
        );
      }

      // Lock the destination account row (must exist)
      const toRes = await client.query(
        "SELECT id, balance FROM accounts WHERE account_number = $1 FOR UPDATE",
        [toAccount],
      );
      if (!toRes.rows[0]) {
        await client.query("ROLLBACK");
        return Response.json(
          { ok: false, message: "destination account not found" },
          { status: 404 },
        );
      }

      // Perform balance updates
      await client.query(
        "UPDATE accounts SET balance = balance - $1 WHERE account_number = $2",
        [amount, fromAccount],
      );
      await client.query(
        "UPDATE accounts SET balance = balance + $1 WHERE account_number = $2",
        [amount, toAccount],
      );

      const createdBy = requesterId;
      const insertRes = await client.query(
        "INSERT INTO transactions (from_account, to_account, amount, description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [fromAccount, toAccount, amount, description, createdBy],
      );

      await client.query("COMMIT");

      return Response.json({
        ok: true,
        message: "Transfer accepted.",
        transaction: insertRes.rows[0],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (reason) {
    return serviceFailure(reason);
  }
}
