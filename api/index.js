// Vercel Function — كل الطلبات إلى /api. التحميل كسول داخل try كي يظهر سبب أي خلل كنص JSON بدل 500 صامت.
let H = null, ERR = null;
function boot() {
  if (H || ERR) return;
  try {
    const { neon } = require('@neondatabase/serverless');
    const { makeHandler, dbUrl } = require('../lib/core');
    const url = dbUrl(process.env);
    const db = url ? neon(url) : null;
    H = makeHandler({ sql: async (t, p) => { if (!db) throw new Error('DATABASE_URL غير مضبوط'); return db.query(t, p || []); } });
  } catch (e) { ERR = e; }
}
module.exports = async (req, res) => {
  boot();
  if (ERR) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: 0, error: 'تعذر تشغيل الخادم: ' + ERR.message + ' — تأكد أن package.json و lib/core.js مرفوعان إلى GitHub (git add -A)' }));
  }
  try { return await H.handler(req, res); }
  catch (e) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ ok: 0, error: String(e && e.message || e) })); }
};
