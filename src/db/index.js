const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set. Database features will fail until it is configured.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client", err);
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
