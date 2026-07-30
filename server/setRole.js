require('dotenv').config();
const { getDb } = require('./lib/mongodb');

async function setRole() {
  const usernameOrEmail = process.argv[2];
  const role = process.argv[3];

  if (!usernameOrEmail || !role) {
    console.log("Usage: node setRole.js <username_or_email> <role>");
    console.log("Example: node setRole.js john.doe superadmin");
    process.exit(1);
  }

  try {
    const db = await getDb();
    const accounts = db.collection('Accounts');

    const result = await accounts.updateOne(
      { $or: [{ username: usernameOrEmail }, { email: usernameOrEmail.toLowerCase() }] },
      { $set: { role: role.toLowerCase() } }
    );

    if (result.matchedCount === 0) {
      console.log(`No user found matching "${usernameOrEmail}"`);
    } else if (result.modifiedCount === 0) {
      console.log(`User found, but role is already "${role}"`);
    } else {
      console.log(`Successfully updated role to "${role}" for user "${usernameOrEmail}"`);
    }
  } catch (err) {
    console.error("Error updating role:", err);
  } finally {
    process.exit(0);
  }
}

setRole();
