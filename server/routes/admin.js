const express = require("express");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../lib/mongodb");
const { verifySession, toPublicUser } = require("../lib/auth");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware to enforce superadmin access for all /api/admin routes
router.use((req, res, next) => {
  const token = req.cookies?.lifeReceiptSession;
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const payload = verifySession(token);
  if (!payload || payload.role !== "superadmin") {
    return res.status(403).json({ error: "forbidden" });
  }

  req.user = payload;
  next();
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// GET all users
router.get("/users", async (req, res) => {
  try {
    const db = await getDb();
    const accounts = await db.collection("Accounts").find({}).toArray();
    res.json({ users: accounts.map(toPublicUser) });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST create new user directly
router.post("/users", async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body ?? {};

    if (!username || !email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: "missing_fields" });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "invalid_email" });
    }

    const db = await getDb();
    const accounts = db.collection("Accounts");

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await accounts.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });
    if (existing) {
      return res.status(409).json({ error: "account_exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const doc = {
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      firstName: normalizeString(firstName),
      lastName: normalizeString(lastName),
      role: normalizeString(role).toLowerCase(),
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const result = await accounts.insertOne(doc);
    const account = { ...doc, _id: result.insertedId };
    
    res.status(201).json({ user: toPublicUser(account) });
  } catch (err) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// PATCH update user role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: "missing_role" });
    }

    const db = await getDb();
    const result = await db.collection("Accounts").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { role: role.toLowerCase() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ error: "user_not_found" });
    }

    res.json({ user: toPublicUser(result) });
  } catch (err) {
    console.error("Failed to update role:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// DELETE a user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === req.user.sub) {
      return res.status(400).json({ error: "cannot_delete_self" });
    }

    const db = await getDb();
    const result = await db.collection("Accounts").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
