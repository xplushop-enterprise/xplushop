const authService = require("../services/authService");

const SESSION_COOKIE = "xps_session";

// Populates req.session/req.user when a valid session cookie is present.
async function attachUser(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[SESSION_COOKIE] : null;
    const session = await authService.getSession(token);
    req.session = session;
    req.user = session ? session.user : null;
  } catch (err) {
    next(err);
    return;
  }
  next();
}

// Guards routes that require an authenticated user.
function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}

module.exports = { attachUser, requireAuth, SESSION_COOKIE };
