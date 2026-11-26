/* ==========================================================================
   SafeBeef v84 — Database Migration
   Creates all tables for persistent storage
   ========================================================================== */
'use strict';

const { getSql, isDbAvailable } = require('./client.js');

async function migrate() {
  if (!isDbAvailable()) {
    console.log('[migrate] DATABASE_URL not set, skipping');
    return;
  }

  const sql = getSql();
  console.log('[migrate] Running database migration...');

  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        avatar TEXT DEFAULT '?',
        color TEXT DEFAULT '#4d9dff',
        name_color TEXT,
        avatar_shape TEXT DEFAULT 'circle',
        font_style TEXT DEFAULT 'default',
        banner_pattern TEXT DEFAULT 'gradient',
        profile_effect TEXT DEFAULT 'none',
        presence TEXT DEFAULT 'online',
        status_text TEXT,
        status_expires TEXT DEFAULT 'never',
        status_expires_at BIGINT,
        bio TEXT,
        pronouns TEXT,
        bio_visibility TEXT DEFAULT 'everyone',
        show_online BOOLEAN DEFAULT true,
        show_last_seen BOOLEAN DEFAULT true,
        allow_mod_dms BOOLEAN DEFAULT true,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;

    // ensure role column exists
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;

    // Bans table
    await sql`
      CREATE TABLE IF NOT EXISTS bans (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        reason TEXT,
        banned_by TEXT,
        duration_ms BIGINT,
        expires_at BIGINT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        is_permanent BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_bans_username ON bans(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bans_active ON bans(is_active) WHERE is_active = true`;

    // IP Bans table
    await sql`
      CREATE TABLE IF NOT EXISTS ip_bans (
        id BIGSERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        fingerprint TEXT,
        reason TEXT,
        banned_by TEXT,
        duration_ms BIGINT,
        expires_at BIGINT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        is_permanent BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_ip_bans_ip ON ip_bans(ip)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ip_bans_fingerprint ON ip_bans(fingerprint)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ip_bans_active ON ip_bans(is_active) WHERE is_active = true`;

    // Push subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        last_used_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_push_subs_username ON push_subscriptions(username)`;

    // Warnings table
    await sql`
      CREATE TABLE IF NOT EXISTS warnings (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        reason TEXT,
        warned_by TEXT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        expires_at BIGINT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_warnings_username ON warnings(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_warnings_expires ON warnings(expires_at)`;

    // Frozen users table
    await sql`
      CREATE TABLE IF NOT EXISTS frozen_users (
        username TEXT PRIMARY KEY,
        frozen_by TEXT,
        reason TEXT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;

    // Maintenance state table
    await sql`
      CREATE TABLE IF NOT EXISTS maintenance_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        enabled BOOLEAN DEFAULT false,
        message TEXT,
        enabled_by TEXT,
        enabled_at BIGINT,
        until BIGINT,
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;
    // Insert default row
    await sql`INSERT INTO maintenance_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;

    // Slow mode table
    await sql`
      CREATE TABLE IF NOT EXISTS slow_mode (
        username TEXT PRIMARY KEY,
        seconds INTEGER NOT NULL,
        since BIGINT NOT NULL,
        set_by TEXT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;

    // Chat messages table (for persistence across devices)
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGSERIAL PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL,
        from_username TEXT NOT NULL,
        to_username TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        text TEXT,
        data JSONB,
        sent_at BIGINT NOT NULL,
        delivered_at BIGINT,
        read_at BIGINT,
        edited_at BIGINT,
        deleted BOOLEAN DEFAULT false,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_pair ON chat_messages(from_username, to_username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_to ON chat_messages(to_username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_id ON chat_messages(message_id)`;

    // Blocks table
    await sql`
      CREATE TABLE IF NOT EXISTS blocks (
        blocker TEXT NOT NULL,
        blocked TEXT NOT NULL,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        PRIMARY KEY (blocker, blocked)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked)`;

    // Pinned messages table
    await sql`
      CREATE TABLE IF NOT EXISTS pinned_messages (
        id BIGSERIAL PRIMARY KEY,
        user1 TEXT NOT NULL,
        user2 TEXT NOT NULL,
        message_id TEXT NOT NULL,
        text TEXT,
        from_username TEXT NOT NULL,
        pinned_by TEXT NOT NULL,
        pinned_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_pinned_pair ON pinned_messages(user1, user2)`;

    // Settings table (for user preferences)
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        username TEXT PRIMARY KEY,
        settings JSONB DEFAULT '{}',
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;

    // Reports table
    await sql`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGSERIAL PRIMARY KEY,
        reporter TEXT NOT NULL,
        reported TEXT NOT NULL,
        reason TEXT,
        message_id TEXT,
        status TEXT DEFAULT 'pending',
        handled_by TEXT,
        handled_at BIGINT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`;

    console.log('[migrate] Migration completed successfully');
  } catch (e) {
    console.error('[migrate] Migration failed:', e);
    throw e;
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };