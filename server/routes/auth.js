const express = require("express");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../lib/mongodb");
const {
  signSession,
  verifySession,
  toPublicUser,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} = require("../lib/auth");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body ?? {};

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "missing_fields" });
    }
    if (typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ error: "invalid_username" });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "invalid_email" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "weak_password" });
    }

    const db = await getDb();
    const accounts = db.collection("Accounts");

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await accounts.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });
    if (existing) {
      const field = existing.username === normalizedUsername ? "username" : "email";
      return res.status(409).json({ error: "account_exists", field });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const doc = {
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      firstName: normalizeString(firstName),
      lastName: normalizeString(lastName),
      role: "user",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const result = await accounts.insertOne(doc);
    const account = { ...doc, _id: result.insertedId };

    const token = signSession(account._id.toString(), account.role);
    res.cookie(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res.status(201).json({ user: toPublicUser(account) });
  } catch (err) {
    console.error("Signup failed:", err);
    return res.status(500).json({
      error: "signup_failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};

    if (!identifier || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const db = await getDb();
    const accounts = db.collection("Accounts");

    const normalized = String(identifier).trim().toLowerCase();
    const account = await accounts.findOne({
      $or: [{ username: String(identifier).trim() }, { email: normalized }],
    });

    if (!account) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (String(account.status).trim().toLowerCase() !== "active") {
      return res.status(403).json({ error: "account_inactive", status: account.status });
    }

    const token = signSession(account._id.toString(), account.role);
    res.cookie(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res.json({ user: toPublicUser(account) });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({
      error: "login_failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      return res.json({ user: null });
    }

    const payload = verifySession(token);
    if (!payload) {
      return res.json({ user: null });
    }

    const db = await getDb();
    const accounts = db.collection("Accounts");
    const account = await accounts.findOne({ _id: new ObjectId(payload.sub) });

    if (!account || String(account.status).trim().toLowerCase() !== "active") {
      return res.json({ user: null });
    }

    return res.json({ user: toPublicUser(account) });
  } catch (err) {
    console.error("Session check failed:", err);
    return res.json({ user: null });
  }
});

module.exports = router;