import { Pool } from "pg";
import bcrypt from "bcrypt";

const postgresHost = process.env.POSTGRES_HOST || process.env.DB_HOST || "localhost";
const postgresPort = process.env.POSTGRES_PORT || "5432";
const postgresUser = process.env.POSTGRES_USER || "postgres";
const postgresPassword = process.env.POSTGRES_PASSWORD || "supersecurepassword";
const postgresDb = process.env.POSTGRES_DB || "htn26db";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  `postgresql://${postgresUser}:${encodeURIComponent(postgresPassword)}@${postgresHost}:${postgresPort}/${postgresDb}`;

export const pool = new Pool({
  connectionString,
  max: 3,
});

let booted = false;
let useFallback = false;
let fallbackStore: {
  users: Array<{
    id: number;
    username: string;
    password: string;
    role: string;
    full_name: string;
    nic: string;
    email: string;
    created_at: string;
  }>;
  accounts: Array<{
    id: number;
    user_id: number;
    account_number: string;
    account_name: string;
    balance: number;
    pin: string;
  }>;
  transactions: Array<{
    id: number;
    from_account: string;
    to_account: string;
    amount: number;
    description: string;
    status: string;
    created_by: number;
    created_at: string;
  }>;
  nextUserId: number;
  nextAccountId: number;
  nextTransactionId: number;
} = {
  users: [],
  accounts: [],
  transactions: [],
  nextUserId: 4,
  nextAccountId: 5,
  nextTransactionId: 4,
};

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  nic TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  account_number TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  pin TEXT NOT NULL DEFAULT '0000'
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

function formatError(reason: unknown) {
  if (reason instanceof Error) {
    return {
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
      ...(reason as any).errors && { errors: (reason as any).errors },
      ...(reason as any).code && { code: (reason as any).code },
    };
  }
  if (typeof reason === "object" && reason !== null) {
    return JSON.parse(JSON.stringify(reason, Object.getOwnPropertyNames(reason)));
  }
  return { message: String(reason) };
}

function buildFallbackData(users: Array<{id:number;username:string;password:string;role:string;full_name:string;nic:string;email:string;}>,
  accounts: Array<{user_id:number;account_number:string;account_name:string;balance:number;pin:string;}>,
  transactions: Array<{from_account:string;to_account:string;amount:number;description:string;created_by:number;}>) {
  fallbackStore.users = users.map((u) => ({
    ...u,
    created_at: new Date().toISOString(),
  }));
  fallbackStore.accounts = accounts.map((a, index) => ({
    id: index + 1,
    ...a,
  }));
  fallbackStore.transactions = transactions.map((t, index) => ({
    id: index + 1,
    from_account: t.from_account,
    to_account: t.to_account,
    amount: t.amount,
    description: t.description,
    status: "SUCCESS",
    created_by: t.created_by,
    created_at: new Date().toISOString(),
  }));
}

async function initFallbackStore() {
  const users = [
    {
      id: 1,
      username: "dilara",
      password: await bcrypt.hash("password123", 10),
      role: "customer",
      full_name: "Dilara Perera",
      nic: "200112345678",
      email: "dilara@example.test",
    },
    {
      id: 2,
      username: "kasun",
      password: await bcrypt.hash("kasun", 10),
      role: "customer",
      full_name: "Kasun Wickramanayake",
      nic: "199812345678",
      email: "kasun@example.test",
    },
    {
      id: 3,
      username: "admin",
      password: await bcrypt.hash("admin", 10),
      role: "admin",
      full_name: "Platform Administrator",
      nic: "000000000000",
      email: "root@example.test",
    },
  ];
  const accounts = [
    {
      user_id: 1,
      account_number: "1000003423",
      account_name: "Dilara Savings",
      balance: 100000.0,
      pin: "1234",
    },
    {
      user_id: 1,
      account_number: "1000004876",
      account_name: "Dilara Expenses",
      balance: 42000.0,
      pin: "1234",
    },
    {
      user_id: 2,
      account_number: "2000006754",
      account_name: "Kasun Current",
      balance: 9870.0,
      pin: "0000",
    },
    {
      user_id: 3,
      account_number: "9999999999",
      account_name: "Admin Vault",
      balance: 9999999.99,
      pin: "9999",
    },
  ];
  const transactions = [
    {
      from_account: "1000003423",
      to_account: "2000006754",
      amount: 4500.0,
      description: "Lunch money",
      created_by: 1,
    },
    {
      from_account: "1000004876",
      to_account: "9999999999",
      amount: 10000.0,
      description: "Totally normal fee",
      created_by: 1,
    },
    {
      from_account: "2000006754",
      to_account: "1000003423",
      amount: 9870.0,
      description: "Refund maybe",
      created_by: 2,
    },
  ];
  buildFallbackData(users, accounts, transactions);
  fallbackStore.nextUserId = users.length + 1;
  fallbackStore.nextAccountId = accounts.length + 1;
  fallbackStore.nextTransactionId = transactions.length + 1;
}

async function ensureFallbackStore() {
  if (!fallbackStore.users.length) {
    await initFallbackStore();
  }
}

export async function ensureDatabase() {
  if (booted) return;
  try {
    await pool.query(schema);
  } catch (error: unknown) {
    useFallback = true;
    console.error("Postgres unavailable, using in-memory fallback data:", formatError(error));
  }

  if (useFallback) {
    await ensureFallbackStore();
  } else {
    // Seed users with hashed passwords (avoid storing plaintext passwords)
    const users = [
      {
        id: 1,
        username: "dilara",
        password: "password123",
        role: "customer",
        full_name: "Dilara Perera",
        nic: "200112345678",
        email: "dilara@example.test",
      },
      {
        id: 2,
        username: "kasun",
        password: "kasun",
        role: "customer",
        full_name: "Kasun Wickramanayake",
        nic: "199812345678",
        email: "kasun@example.test",
      },
      {
        id: 3,
        username: "admin",
        password: "admin",
        role: "admin",
        full_name: "Platform Administrator",
        nic: "000000000000",
        email: "root@example.test",
      },
    ];
    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 10);
      await pool.query(
        `INSERT INTO users (id, username, password, role, full_name, nic, email)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username, hashed, u.role, u.full_name, u.nic, u.email],
      );
    }

    // Seed accounts
    const accounts = [
      {
        user_id: 1,
        account_number: "1000003423",
        account_name: "Dilara Savings",
        balance: 100000.0,
        pin: "1234",
      },
      {
        user_id: 1,
        account_number: "1000004876",
        account_name: "Dilara Expenses",
        balance: 42000.0,
        pin: "1234",
      },
      {
        user_id: 2,
        account_number: "2000006754",
        account_name: "Kasun Current",
        balance: 9870.0,
        pin: "0000",
      },
      {
        user_id: 3,
        account_number: "9999999999",
        account_name: "Admin Vault",
        balance: 9999999.99,
        pin: "9999",
      },
    ];
    for (const a of accounts) {
      await pool.query(
        `INSERT INTO accounts (user_id, account_number, account_name, balance, pin)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (account_number) DO NOTHING`,
        [a.user_id, a.account_number, a.account_name, a.balance, a.pin],
      );
    }

    // Seed transactions
    const transactions = [
      {
        from_account: "1000003423",
        to_account: "2000006754",
        amount: 4500.0,
        description: "Lunch money",
        created_by: 1,
      },
      {
        from_account: "1000004876",
        to_account: "9999999999",
        amount: 10000.0,
        description: "Totally normal fee",
        created_by: 1,
      },
      {
        from_account: "2000006754",
        to_account: "1000003423",
        amount: 9870.0,
        description: "Refund maybe",
        created_by: 2,
      },
    ];
    for (const t of transactions) {
      await pool.query(
        `INSERT INTO transactions (from_account, to_account, amount, description, created_by)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [t.from_account, t.to_account, t.amount, t.description, t.created_by],
      );
    }
  }

  booted = true;
}

export function isFallbackActive() {
  return useFallback;
}

export function getConnectionInfo() {
  return {
    host: postgresHost,
    port: postgresPort,
    user: postgresUser,
    database: postgresDb,
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  };
}

export async function findUserByUsername(username: string) {
  await ensureDatabase();
  if (!useFallback) {
    const result = await pool.query(
      `SELECT id, username, password, role, full_name, nic, email
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username],
    );
    return result.rows[0];
  }
  return fallbackStore.users.find((user) => user.username === username);
}

export async function insertUser(user: {
  username: string;
  password: string;
  role: string;
  full_name: string;
  nic?: string;
  email?: string;
}) {
  await ensureDatabase();
  if (!useFallback) {
    const result = await pool.query(
      `INSERT INTO users (username, password, role, full_name, nic, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, role, full_name, nic, email`,
      [user.username, user.password, user.role, user.full_name, user.nic || "", user.email || ""],
    );
    return result.rows[0];
  }
  const existing = fallbackStore.users.find((item) => item.username === user.username);
  if (existing) {
    return null;
  }
  const newUser = {
    id: fallbackStore.nextUserId++,
    username: user.username,
    password: user.password,
    role: user.role,
    full_name: user.full_name,
    nic: user.nic || "",
    email: user.email || "",
    created_at: new Date().toISOString(),
  };
  fallbackStore.users.push(newUser);
  return newUser;
}

export async function findAccountsByUserId(userId: number) {
  await ensureDatabase();
  if (!useFallback) {
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.account_number, a.account_name, a.balance, a.pin, u.username, u.full_name, u.email
       FROM accounts a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1
       ORDER BY a.id`,
      [userId],
    );
    return result.rows;
  }
  return fallbackStore.accounts
    .filter((account) => account.user_id === userId)
    .map((account) => {
      const owner = fallbackStore.users.find((user) => user.id === account.user_id);
      return {
        ...account,
        username: owner?.username || "",
        full_name: owner?.full_name || "",
        email: owner?.email || "",
      };
    });
}

export async function findAccountByNumber(accountNumber: string) {
  await ensureDatabase();
  if (!useFallback) {
    const result = await pool.query(
      `SELECT id, user_id, account_number, account_name, balance, pin FROM accounts WHERE account_number = $1 LIMIT 1`,
      [accountNumber],
    );
    return result.rows[0];
  }
  return fallbackStore.accounts.find((account) => account.account_number === accountNumber);
}

export async function createAccountForUser(userId: number, accountNumber: string, accountName: string) {
  await ensureDatabase();
  if (!useFallback) {
    const result = await pool.query(
      `INSERT INTO accounts (user_id, account_number, account_name, balance, pin)
       VALUES ($1, $2, $3, 0, '0000')
       ON CONFLICT (account_number) DO NOTHING
       RETURNING *`,
      [userId, accountNumber, accountName],
    );
    return result.rows[0];
  }

  const existing = fallbackStore.accounts.find((account) => account.account_number === accountNumber);
  if (existing) return null;
  const account = {
    id: fallbackStore.nextAccountId++,
    user_id: userId,
    account_number: accountNumber,
    account_name: accountName,
    balance: 0,
    pin: "0000",
  };
  fallbackStore.accounts.push(account);
  return account;
}

export async function updateAccountName(accountNumber: string, accountName: string) {
  await ensureDatabase();
  if (!useFallback) {
    const result = await pool.query(
      "UPDATE accounts SET account_name = $1 WHERE account_number = $2 RETURNING *",
      [accountName, accountNumber],
    );
    return result.rows[0];
  }
  const account = fallbackStore.accounts.find((item) => item.account_number === accountNumber);
  if (!account) return null;
  account.account_name = accountName;
  return account;
}

export async function deleteAccount(accountNumber: string) {
  await ensureDatabase();
  if (!useFallback) {
    await pool.query("DELETE FROM accounts WHERE account_number = $1", [accountNumber]);
    return true;
  }
  const index = fallbackStore.accounts.findIndex((item) => item.account_number === accountNumber);
  if (index === -1) return false;
  fallbackStore.accounts.splice(index, 1);
  fallbackStore.transactions = fallbackStore.transactions.filter(
    (transaction) =>
      transaction.from_account !== accountNumber && transaction.to_account !== accountNumber,
  );
  return true;
}

export async function findTransactionsByAccount(accountNumber: string) {
  await ensureDatabase();
  if (!useFallback) {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE from_account = $1 OR to_account = $1 ORDER BY created_at DESC",
      [accountNumber],
    );
    return result.rows;
  }
  return fallbackStore.transactions
    .filter(
      (transaction) =>
        transaction.from_account === accountNumber || transaction.to_account === accountNumber,
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function transferFunds(
  fromAccount: string,
  toAccount: string,
  amount: number,
  description: string,
  createdBy: number,
) {
  await ensureDatabase();
  if (!useFallback) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const fromRes = await client.query(
        "SELECT id, user_id, balance FROM accounts WHERE account_number = $1 FOR UPDATE",
        [fromAccount],
      );
      const toRes = await client.query(
        "SELECT id, balance FROM accounts WHERE account_number = $1 FOR UPDATE",
        [toAccount],
      );
      if (!fromRes.rows[0] || !toRes.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }
      if (Number(fromRes.rows[0].balance) < amount) {
        await client.query("ROLLBACK");
        return null;
      }
      await client.query("UPDATE accounts SET balance = balance - $1 WHERE account_number = $2", [amount, fromAccount]);
      await client.query("UPDATE accounts SET balance = balance + $1 WHERE account_number = $2", [amount, toAccount]);
      const insertRes = await client.query(
        "INSERT INTO transactions (from_account, to_account, amount, description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [fromAccount, toAccount, amount, description, createdBy],
      );
      await client.query("COMMIT");
      return insertRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const fromAccountRecord = fallbackStore.accounts.find((account) => account.account_number === fromAccount);
  const toAccountRecord = fallbackStore.accounts.find((account) => account.account_number === toAccount);
  if (!fromAccountRecord || !toAccountRecord) return null;
  if (fromAccountRecord.balance < amount) return null;

  fromAccountRecord.balance -= amount;
  toAccountRecord.balance += amount;
  const transaction = {
    id: fallbackStore.nextTransactionId++,
    from_account: fromAccount,
    to_account: toAccount,
    amount,
    description,
    status: "SUCCESS",
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };
  fallbackStore.transactions.unshift(transaction);
  return transaction;
}

export function asText(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function serviceFailure(reason: unknown) {
  const issue = reason as {
    message?: string;
    code?: string;
    detail?: string;
    stack?: string;
    errors?: unknown[];
  };

  // Log detailed error information server-side for debugging, but do
  // not expose internals (stack, DB connection strings) to clients.
  console.error("Database/service error:", {
    message: issue.message,
    code: issue.code,
    detail: issue.detail,
    errors: issue.errors,
    stack: issue.stack,
  });
  return Response.json(
    { ok: false, message: "Internal server error" },
    { status: 500 },
  );
}
