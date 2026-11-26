// Vercel serverless entry. Reuses the existing Express app from server.js.
// server.js only calls listen() when run directly, so importing it here is safe.
const app = require('../server.js');

module.exports = app;