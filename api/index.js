const { neon } = require('@neondatabase/serverless');
const { makeHandler } = require('../lib/core');
let H = null;
module.exports = async (req, res) => {
  if (!H) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const db = url ? neon(url) : null;
    H = makeHandler({ sql: async (t, p) => { if (!db) throw new Error('DATABASE_URL غير مضبوط'); return db.query(t, p || []); } });
  }
  return H.handler(req, res);
};
