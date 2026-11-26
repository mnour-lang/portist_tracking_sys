// خادم تطوير محلي: الواجهة + /api فوق Postgres داخل الذاكرة (PGlite).
//   APP_PASSWORD=k PORT=8790 node tests/devserver.js
const http = require('http'), fs = require('fs'), path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const { makeHandler } = require('../lib/core');
(async () => {
  const pg = new PGlite();
  const H = makeHandler({ sql: async (t, p) => (await pg.query(t, p || [])).rows, env: { APP_PASSWORD: process.env.APP_PASSWORD || 'k', __TEST: 1, STRICT_AUTH: '1' } });
  const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'));
  http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/api') return H.handler(req, res);
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page);
  }).listen(+process.env.PORT || 8790, () => console.log('dev server up'));
})();
