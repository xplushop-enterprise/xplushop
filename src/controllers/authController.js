const authService = require("../services/authService");
const { SESSION_COOKIE } = require("../middleware/auth");

function cookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: expiresAt,
    path: "/",
  };
}

async function signup(req, res, next) {
  try {
    const { email, password, displayName } = req.body || {};
    const result = await authService.createUser({ email, password, displayName });
    if (!result.ok) {
      res.status(result.status || 400).json({ error: result.message });
      return;
    }
    const { token, expiresAt } = await authService.createSession(result.user.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
    res.status(201).json({ user: result.user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body || {};
    const result = await authService.verifyUser({ email, password });
    if (!result.ok) {
      res.status(result.status || 401).json({ error: result.message });
      return;
    }
    const { token, expiresAt } = await authService.createSession(result.user.id, {
      rememberMe: rememberMe !== false,
    });
    res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
    res.json({ user: result.user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[SESSION_COOKIE] : null;
    await authService.destroySession(token);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.json({ user: req.user || null });
}

module.exports = { signup, login, logout, me };
