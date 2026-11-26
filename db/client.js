/* ==========================================================================
   SafeBeef v84 — Neon/PostgreSQL Database Client
   Works with Vercel serverless and local development
   ========================================================================== */
'use strict';

const { neon } = require('@neondatabase/serverless');

let sql = null;
let isConnected = false;

function getSql() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('[db] DATABASE_URL not set — database features disabled');
      return null;
    }
    sql = neon(databaseUrl);
    isConnected = true;
  }
  return sql;
}

function isDbAvailable() {
  return !!process.env.DATABASE_URL;
}

async function testConnection() {
  const db = getSql();
  if (!db) return false;
  try {
    await db`SELECT 1`;
    return true;
  } catch (e) {
    console.error('[db] Connection test failed:', e.message);
    return false;
  }
}

module.exports = { getSql, isDbAvailable, testConnection };