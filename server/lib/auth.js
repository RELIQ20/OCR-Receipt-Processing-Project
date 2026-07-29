const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "replace-with-a-long-random-string";
const SESSION_COOKIE = "lifeReceiptSession";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

function signSession(userId, role) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

function verifySession(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function toPublicUser(account) {
  return {
    id: account._id?.toString ? account._id.toString() : String(account._id ?? account.id),
    username: account.username,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    role: account.role,
    status: account.status,
  };
}

module.exports = {
  signSession,
  verifySession,
  toPublicUser,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
};