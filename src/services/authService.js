const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { query } = require("../db");

const SALT_ROUNDS = 12;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateCredentials(email, password) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (password.length > 200) {
    return { ok: false, message: "Password is too long." };
  }
  return { ok: true, email: normalized };
}

function publicUser(row) {
  return { id: String(row.id), email: row.email, displayName: row.display_name };
}

async function createUser({ email, password, displayName }) {
  const check = validateCredentials(email, password);
  if (!check.ok) {
    return { ok: false, status: 400, message: check.message };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const name = displayName ? String(displayName).trim().slice(0, 80) : null;

  try {
    const { rows } = await query(
      `INSERT INTO public.users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name`,
      [check.email, passwordHash, name]
    );
    return { ok: true, user: publicUser(rows[0]) };
  } catch (err) {
    if (err && err.code === "23505") {
      return { ok: false, status: 409, message: "An account with this email already exists." };
    }
    throw err;
  }
}

async function verifyUser({ email, password }) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized) || typeof password !== "string" || !password) {
    return { ok: false, status: 401, message: "Invalid email or password." };
  }

  const { rows } = await query(
    `SELECT id, email, password_hash, display_name FROM public.users WHERE email = $1`,
    [normalized]
  );

  const row = rows[0];
  // Always run a compare to reduce timing signal on whether the email exists.
  const hash = row ? row.password_hash : "$2a$12$0000000000000000000000000000000000000000000000000000";
  const match = await bcrypt.compare(password, hash);

  if (!row || !match) {
    return { ok: false, status: 401, message: "Invalid email or password." };
  }
  return { ok: true, user: publicUser(row) };
}

async function createSession(userId, { rememberMe = true } = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const ttl = rememberMe ? SESSION_TTL_MS : 1000 * 60 * 60 * 12; // 12h if not remembered
  const expiresAt = new Date(Date.now() + ttl);
  await query(
    `INSERT INTO public.sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );
  return { token, expiresAt };
}

async function getSession(token) {
  if (!token) return null;
  const { rows } = await query(
    `SELECT s.token, s.expires_at, u.id, u.email, u.display_name
     FROM public.sessions s
     JOIN public.users u ON u.id = s.user_id
     WHERE s.token = $1`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  return { token: row.token, user: publicUser(row) };
}

async function destroySession(token) {
  if (!token) return;
  await query(`DELETE FROM public.sessions WHERE token = $1`, [token]);
}

module.exports = {
  createUser,
  verifyUser,
  createSession,
  getSession,
  destroySession,
  SESSION_TTL_MS,
};
