/* ==========================================================================
   SafeBeef v84 — Database Reset
   Truncates all SQL tables (if DATABASE_URL is set) and clears the in-memory
   fallback store. Use this to wipe corrupted/auth state and start fresh.
   ========================================================================== */
'use strict';

const { reset, isDbAvailable } = require('./service.js');

(async () => {
  console.log('[reset] DATABASE_URL:', isDbAvailable() ? 'set (truncating SQL tables)' : 'not set (clearing in-memory store only)');
  try {
    const result = await reset();
    console.log('[reset] Done:', JSON.stringify(result));
    process.exit(0);
  } catch (e) {
    console.error('[reset] Failed:', e.message);
    process.exit(1);
  }
})();
