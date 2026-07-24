const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "lifewood_db";

if (!uri) {
  throw new Error("MONGO_URI environment variable is required.");
}

let client = null;

async function connectClient() {
  if (client) return client;
  client = new MongoClient(uri);
  await client.connect();
  return client;
}

async function getDb() {
  const client = await connectClient();
  return client.db(dbName);
}

module.exports = { getDb };