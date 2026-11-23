// Portist — الخادم: نفس بروتوكول Code.gs لكن فوق Postgres (Neon). يُستدعى من api/index.js
// sql(text, params) => Promise<rows[]>
const crypto = require('crypto');

const NEED = { list: ['inv', 'rc', 'cust', 'bal', 'cost', 'audit'], get: ['inv', 'rc', 'cust', 'bal', 'cost', 'audit'], rlist: ['rc', 'cust', 'audit'], rget: ['rc', 'cust', 'audit'],
  save: 'inv', next: 'inv', del: 'inv_cancel', adj: 'rc', rsave: 'rc', rnext: 'rc', rdel: 'rc_void',
  shsave: ['ship', 'deliver', 'cost'], shnext: 'ship', shdel: 'ship_del', udel: 'users' };
const AUTH_ERR = 'دخول غير مصرّح — سجّل الدخول من جديد';
const can_ = (au, p) => !!au && (au.open || au.admin || (au.perms || []).indexOf(p) >= 0);
const strip = u => { const x = Object.assign({}, u); delete x.hash; delete x.hash2; return x; };
const r2 = x => Math.round((+x || 0) * 100) / 100;
const safeEq = (a, b) => { const x = Buffer.from(String(a == null ? '' : a)), y = Buffer.from(String(b == null ? '' : b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// أول رابط قاعدة بيانات موجود: DATABASE_URL/POSTGRES_URL أو أي متغير ينتهي بهما (إن استُعملت بادئة مخصصة مثل STORAGE_DATABASE_URL)
const dbUrl = env => { if (env.DATABASE_URL) return env.DATABASE_URL; if (env.POSTGRES_URL) return env.POSTGRES_URL; const k = Object.keys(env).find(x => /(^|_)DATABASE_URL$/.test(x) && env[x]) || Object.keys(env).find(x => /(^|_)POSTGRES_URL$/.test(x) && env[x]); return k ? env[k] : ''; };
const sha = t => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

function makeHandler({ sql, env = process.env }) {
  let ready = null, PEPPER = null;
  const init = () => ready || (ready = (async () => {
    const T = 'code text primary key, rcv text, date text, total double precision, cur text, updated double precision, data jsonb, status text, paid double precision';
    await sql('CREATE TABLE IF NOT EXISTS invoices(' + T + ')');
    await sql('CREATE TABLE IF NOT EXISTS receipts(' + T + ')');
    await sql('CREATE TABLE IF NOT EXISTS shipments(code text primary key, status text, customers text, eta text, updated double precision, data jsonb)');
    await sql('CREATE TABLE IF NOT EXISTS users(id text primary key, username text unique, data jsonb)');
    await sql('CREATE TABLE IF NOT EXISTS props(k text primary key, v text)');
    await sql('CREATE TABLE IF NOT EXISTS kv(k text NOT NULL, id text NOT NULL, v jsonb, del boolean DEFAULT false, updated double precision, PRIMARY KEY(k,id))');
  })().catch(e => { ready = null; throw e; }));
  const getProp = async k => { const r = await sql('SELECT v FROM props WHERE k=$1', [k]); return r[0] ? r[0].v : null; };
  const setProp = (k, v) => sql('INSERT INTO props(k,v) VALUES($1,$2) ON CONFLICT(k) DO UPDATE SET v=$2', [k, v]);
  async function pepper() {
    if (PEPPER) return PEPPER;
    if (env.PEPPER) return (PEPPER = env.PEPPER);
    await sql('INSERT INTO props(k,v) VALUES($1,$2) ON CONFLICT(k) DO NOTHING', ['PEPPER', crypto.randomUUID() + crypto.randomUUID()]);
    return (PEPPER = await getProp('PEPPER'));
  }
  const h2 = async x => sha((await pepper()) + '|' + x);
  const loadUsers = async () => (await sql('SELECT data FROM users')).map(r => r.data);
  const findUser = async name => { const k = String(name || '').toLowerCase(); return (await loadUsers()).filter(x => String(x.user).toLowerCase() === k)[0] || null; };

  // تقييد المحاولات الفاشلة لكل اسم دخول (8 محاولات / 10 دقائق)
  const LOCK_N = 8, LOCK_MS = 600000;
  const failKey = u => 'fail|' + String(u || '').toLowerCase().slice(0, 80);
  async function failState(u) { const r = await getProp(failKey(u)); const [n, ts] = String(r || '0|0').split('|').map(Number); return { n: Date.now() - ts > LOCK_MS ? 0 : n, ts }; }
  async function authUser(q) {
    const us = await loadUsers();
    if (!us.length) {
      if ((await getProp('AUTH')) === '1') return null;   // لا فتح عند الفشل بعد تفعيل المستخدمين
      return { open: true, admin: true, perms: [] };
    }
    await setProp('AUTH', '1');
    const k = String(q.u || '').toLowerCase();
    const u = us.filter(x => String(x.user).toLowerCase() === k)[0];
    const st = await failState(k);
    if (st.n >= LOCK_N) return { locked: true };
    const bad = async () => { await setProp(failKey(k), (st.n + 1) + '|' + Date.now()); return null; };
    if (!u || u.active === false || !q.uh || !u.hash2) return bad();
    if (u.hash2 !== await h2(q.uh)) return bad();
    if (st.n) await setProp(failKey(k), '0|0');
    return strip(u);
  }

  // ---------- الفواتير والوصولات ----------
  async function docs(q, R) {
    const tb = R ? 'receipts' : 'invoices', prefix = R ? 'RC' : 'PST';
    const act = R ? q.a.slice(1) : q.a;
    const rowOf = async c => (await sql('SELECT * FROM ' + tb + ' WHERE code=$1', [c]))[0];
    switch (act) {
      case 'ping': return { ok: 1 };
      case 'next': {
        let m = 0; const re = new RegExp('^' + prefix + '-(\\d+)$', 'i');
        (await sql('SELECT code FROM ' + tb)).forEach(r => { const x = re.exec(r.code); if (x) m = Math.max(m, +x[1]); });
        return { code: prefix + '-' + String(m + 1).padStart(4, '0') };
      }
      case 'list':
        return { items: (await sql('SELECT * FROM ' + tb + ' ORDER BY updated ASC')).map(r => ({ code: r.code, rcv: r.rcv, date: r.date, t: r.total, cur: r.cur, ts: r.updated, st: r.status || (R ? 'valid' : 'draft'), pd: r.paid || 0, cref: (r.data && r.data.cref) || '', ship: (r.data && r.data.ship) || '', due: (r.data && r.data.due) || '', offno: (r.data && r.data.offno) || '', note: (r.data && r.data.note) || '', ref: (r.data && r.data.ref) || '', reason: (r.data && r.data.reason) || '' })).reverse() };
      case 'get': { const r = await rowOf(q.code); return r ? { d: r.data } : { err: 'غير موجود' }; }
      case 'save': {
        const d = q.d || {}, st = d.st || (R ? 'valid' : 'draft');
        const vals = [q.code, d.rcv || '', d.date || '', +d.t || 0, d.cur || '', Date.now(), JSON.stringify(d), st, +d.pd || 0];
        if (q.isNew) {
          const ins = await sql('INSERT INTO ' + tb + '(code,rcv,date,total,cur,updated,data,status,paid) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) ON CONFLICT(code) DO NOTHING RETURNING code', vals);
          return ins.length ? { ok: 1 } : { err: 'exists' };
        }
        await sql('INSERT INTO ' + tb + '(code,rcv,date,total,cur,updated,data,status,paid) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) ON CONFLICT(code) DO UPDATE SET rcv=$2,date=$3,total=$4,cur=$5,updated=$6,data=$7::jsonb,status=$8,paid=$9', vals);
        return { ok: 1 };
      }
      case 'del': await sql('DELETE FROM ' + tb + ' WHERE code=$1', [q.code]); return { ok: 1 };
      case 'adj': {   // تعديل «المدفوع» ذرّياً (تفاؤلياً مع إعادة محاولة)
        for (let i = 0; i < 6; i++) {
          const r = await rowOf(q.code);
          if (!r) return { err: 'الفاتورة ' + q.code + ' غير موجودة' };
          const d = r.data;
          d.pd = Math.max(0, r2((+d.pd || 0) + (+q.delta || 0)));
          let cr = 0;
          if (!R) { const c = await sql("SELECT coalesce(sum(-total),0) AS s FROM invoices WHERE data->>'ref'=$1 AND data->>'note'='cr' AND coalesce(status,'') NOT IN ('void','draft')", [q.code]); cr = +(c[0] && c[0].s) || 0; }
          const t = (+d.t || 0) - cr;
          if ((d.st || 'draft') !== 'draft' && d.st !== 'void') d.st = d.pd >= t - 0.005 ? 'paid' : d.pd > 0.004 ? 'partial' : 'sent';
          d.rcs = (d.rcs || []).filter(x => x !== q.no).concat(q.keep ? [q.no] : []);
          d.ts = Date.now() > r.updated ? Date.now() : r.updated + 1;
          const u = await sql('UPDATE ' + tb + ' SET rcv=$2,date=$3,total=$4,cur=$5,updated=$6,data=$7::jsonb,status=$8,paid=$9 WHERE code=$1 AND updated=$10 RETURNING code',
            [q.code, d.rcv || '', d.date || '', +d.t || 0, d.cur || '', d.ts, JSON.stringify(d), d.st || 'draft', +d.pd || 0, r.updated]);
          if (u.length) return { ok: 1, d };
        }
        return { err: 'تعذر تحديث الفاتورة بسبب ازدحام — أعد المحاولة' };
      }
    }
    return { err: 'أمر غير معروف' };
  }

  // ---------- الشحنات ----------
  function shView(d, au) {
    if (can_(au, 'cost')) return d;
    const x = JSON.parse(JSON.stringify(d)); delete x.costs; delete x.fin; delete x.alloc; delete x.fxi; delete x.fxe; return x;
  }
  async function shipments(q, au) {
    const rowOf = async c => (await sql('SELECT * FROM shipments WHERE code=$1', [q.code]))[0];
    if (q.a === 'shlist') return { items: (await sql('SELECT code,data FROM shipments')).map(r => ({ code: r.code, d: shView(r.data, au) })) };
    if (q.a === 'shnext') {
      let m = 0;
      (await sql('SELECT code FROM shipments')).forEach(r => { const x = /^SH-(\d+)$/i.exec(r.code); if (x) m = Math.max(m, +x[1]); });
      return { code: 'SH-' + String(m + 1).padStart(4, '0') };
    }
    if (q.a === 'shdel') {
      const r = await rowOf();
      if (r) {
        const old = r.data;
        if (old.posted) return { err: 'الشحنة مُرحَّلة — ألغِ الترحيل أولاً' };
        if ((old.cons || []).some(c => (c.dl || []).length)) return { err: 'لا يمكن حذف شحنة فيها تسليمات مسجلة' };
        await sql('DELETE FROM shipments WHERE code=$1', [q.code]);
      }
      return { ok: 1 };
    }
    if (q.a === 'shsave') {
      for (let attempt = 0; attempt < 6; attempt++) {
        const r = await rowOf(), nd = q.d || {};
        let d = nd, oldVer = 0;
        if (r) {
          if (q.isNew) return { err: 'exists' };
          const old = r.data; oldVer = +old.ver || 0;
          if ((+nd.ver || 0) !== oldVer && !q.force) return { err: 'conflict', d: shView(old, au), ver: oldVer };
          const canShip = can_(au, 'ship'), canDl = can_(au, 'deliver'), canCost = can_(au, 'cost'), canPost = can_(au, 'post');
          const locked = !!old.posted || old.stat === 'dn' || old.st === 'dn';
          const nOld = JSON.parse(JSON.stringify(old)), nNew = JSON.parse(JSON.stringify(nd));
          const dlOf = {}; (nNew.cons || []).forEach(c => dlOf[c.id] = c.dl);
          const oldDl = {}; (nOld.cons || []).forEach(c => oldDl[c.id] = c.dl);
          d = canShip ? nNew : nOld;
          if (!canShip && canDl) { d.st = nNew.st; d.stat = nNew.stat; d.hist = nNew.hist; }
          if (canShip || canDl) {
            const base = (canShip && !locked) ? nNew.cons : nOld.cons;
            d.cons = (base || []).map(c => Object.assign({}, c, { dl: canDl ? (c.id in dlOf ? dlOf[c.id] : c.dl) : (c.id in oldDl ? oldDl[c.id] : (canShip && !locked ? [] : c.dl)) }));
          } else d.cons = nOld.cons;
          if (locked) { d.freight = old.freight; d.cur = old.cur; }
          if (canCost && q.fin) { d.costs = nNew.costs; d.fin = nNew.fin; delete d.alloc; delete d.fxi; delete d.fxe; } else { d.costs = old.costs; d.fin = old.fin; d.alloc = old.alloc; d.fxi = old.fxi; d.fxe = old.fxe; }
          if (!canPost) { d.posted = old.posted; d.postedAt = old.postedAt; d.postedBy = old.postedBy; }
          else { d.posted = nNew.posted; d.postedAt = nNew.postedAt; d.postedBy = nNew.postedBy; }
        } else if (!q.isNew) return { err: 'deleted' };   // حُذفت من جهاز آخر: لا تُعاد بحفظ قديم
        else if (!can_(au, 'ship')) return { err: 'لا تملك صلاحية إنشاء شحنة' };
        d.ver = oldVer + 1;
        d.ts = r ? Math.max(Date.now(), r.updated + 1) : Date.now();
        const cu = (d.cons || []).map(c => c.cust).join('، ');
        const vals = [q.code, d.stat || d.st || '', cu, d.eta || '', d.ts, JSON.stringify(d)];
        let ok;
        if (r) ok = (await sql('UPDATE shipments SET status=$2,customers=$3,eta=$4,updated=$5,data=$6::jsonb WHERE code=$1 AND updated=$7 RETURNING code', vals.concat([r.updated]))).length;
        else ok = (await sql('INSERT INTO shipments(code,status,customers,eta,updated,data) VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(code) DO NOTHING RETURNING code', vals)).length;
        if (ok) return { ok: 1, ver: d.ver, ts: d.ts, d: shView(d, au) };
      }
      return { err: 'تعذر الحفظ بسبب ازدحام — أعد المحاولة' };
    }
    return { err: 'أمر غير معروف' };
  }

  // ---------- المستخدمون ----------
  async function usersApi(q, au) {
    const us = await loadUsers();
    const isMgr = au.open || au.admin || (au.perms || []).indexOf('users') >= 0;
    const admins = ex => us.filter(x => x.admin && x.active !== false && x.id !== ex).length;
    const rowOf = id => us.findIndex(x => x.id === id);
    if (q.a === 'ulist') return { items: (isMgr ? us : us.filter(x => x.id === au.id)).map(strip) };
    if (q.a === 'usave') {
      const u = q.user;
      if (!u || !u.id || !u.user) return { err: 'بيانات المستخدم ناقصة' };
      const i = rowOf(u.id), old = i >= 0 ? us[i] : null;
      if (!isMgr) {
        if (!old || old.id !== au.id) return { err: 'لا تملك صلاحية إدارة المستخدمين' };
        u.admin = old.admin; u.perms = old.perms; u.active = old.active; u.user = old.user; u.name = old.name;
      }
      if (u.hash) { u.hash2 = await h2(u.hash); delete u.hash; }
      else if (old) { u.hash2 = old.hash2; if (old.salt && u.salt !== old.salt) u.salt = old.salt; }
      if (!u.hash2) return { err: 'كلمة السر مطلوبة' };
      delete u.hash;
      if (us.some(x => x.id !== u.id && String(x.user).toLowerCase() === String(u.user).toLowerCase())) return { err: 'اسم الدخول مستخدم' };
      if (old && old.admin && old.active !== false && (!u.admin || u.active === false) && !admins(old.id)) return { err: 'لا يمكن إيقاف آخر مدير' };
      if (!us.length && !u.admin) return { err: 'أول مستخدم يجب أن يكون مديراً' };
      u.ts = Date.now();
      await sql('INSERT INTO users(id,username,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO UPDATE SET username=$2,data=$3::jsonb', [u.id, String(u.user).toLowerCase(), JSON.stringify(u)]);
      return { ok: 1 };
    }
    if (q.a === 'udel') {
      const i = rowOf(q.id);
      if (i < 0) return { ok: 1 };
      if (us[i].id === au.id) return { err: 'لا يمكنك حذف حسابك' };
      if (us[i].admin && us[i].active !== false && !admins(us[i].id)) return { err: 'لا يمكن حذف آخر مدير' };
      await sql('DELETE FROM users WHERE id=$1', [q.id]);
      return { ok: 1 };
    }
    return { err: 'أمر غير معروف' };
  }

  // ---------- التخزين المشترك (العملاء، المنتجات، القوالب، الإعدادات، السجل…) + توقيع التغيّر للمزامنة اللحظية ----------
  const KV_KEYS = ['pst_cust', 'pst_prod', 'pst_tpl', 'pst_cols', 'pst_foot', 'pst_stamp', 'pst_lang', 'pst_rpage', 'pst_dseq', 'pst_log', 'pst_curr', 'pst_revpol'];
  async function sharedApi(q) {
    if (q.a === 'sig') {
      const r = (await sql(`SELECT
        (SELECT count(*)||':'||coalesce(max(updated),0) FROM invoices) AS a,
        (SELECT count(*)||':'||coalesce(max(updated),0) FROM receipts) AS b,
        (SELECT count(*)||':'||coalesce(max(updated),0) FROM shipments) AS c,
        (SELECT count(*)||':'||coalesce(max((data->>'ts')::float8),0) FROM users) AS d,
        (SELECT count(*)||':'||coalesce(max(updated),0) FROM kv) AS e`))[0];
      return { sig: [r.a, r.b, r.c, r.d, r.e].join('|') };
    }
    if (q.a === 'kvget') {
      const since = +q.since || 0;
      const rows = await sql('SELECT k,id,v,del,updated FROM kv WHERE updated>=$1 ORDER BY updated ASC', [since]);
      return { items: rows.map(r => ({ k: r.k, id: r.id, v: r.v, del: !!r.del, u: r.updated })) };
    }
    if (q.a === 'kvput') {
      const ops = Array.isArray(q.ops) ? q.ops.slice(0, 500) : []; let n = 0;
      for (const o of ops) {
        if (!o || KV_KEYS.indexOf(o.k) < 0) continue;
        const id = String(o.id == null ? '' : o.id).slice(0, 200), now = Date.now();
        if (o.del) { await sql('INSERT INTO kv(k,id,v,del,updated) VALUES($1,$2,NULL,true,$3) ON CONFLICT(k,id) DO UPDATE SET v=NULL,del=true,updated=$3', [o.k, id, now]); n++; continue; }
        const v = JSON.stringify(o.v === undefined ? null : o.v);
        if (o.max) await sql(`INSERT INTO kv(k,id,v,del,updated) VALUES($1,$2,$3::jsonb,false,$4) ON CONFLICT(k,id) DO UPDATE SET v=to_jsonb(GREATEST((kv.v#>>'{}')::float8,($3::jsonb#>>'{}')::float8)),del=false,updated=$4`, [o.k, id, v, now]);
        else if (o.isNew) await sql('INSERT INTO kv(k,id,v,del,updated) VALUES($1,$2,$3::jsonb,false,$4) ON CONFLICT(k,id) DO NOTHING', [o.k, id, v, now]);
        else await sql('INSERT INTO kv(k,id,v,del,updated) VALUES($1,$2,$3::jsonb,false,$4) ON CONFLICT(k,id) DO UPDATE SET v=$3::jsonb,del=false,updated=$4', [o.k, id, v, now]);
        n++;
      }
      return { ok: 1, n };
    }
    return { err: 'أمر غير معروف' };
  }

  async function run(q) {
    await init();
    // الدخول العادي بالمستخدم وكلمة سره فقط. رمز الإعداد (APP_PASSWORD) يُطلب فقط قبل وجود أي مستخدم (إنشاء أول مدير)
    const nUsers = (await sql('SELECT count(*)::int AS n FROM users'))[0].n;
    if (!nUsers) {
      if (!env.APP_PASSWORD) return { err: 'لم يُضبط APP_PASSWORD (رمز الإعداد) في إعدادات Vercel (Environment Variables)' };
      if (!safeEq(q.pw, env.APP_PASSWORD)) return { err: 'رمز الإعداد غير صحيح' };
    }
    if (q.a === 'usalt') { const x = await findUser(q.user); return { salt: x && x.active !== false ? x.salt : (await h2('salt|' + String(q.user || '').toLowerCase())).slice(0, 16) }; }
    const au = await authUser(q);
    if (au && au.locked) return { err: 'محاولات كثيرة — حاول بعد 10 دقائق' };
    if (!au) return { err: AUTH_ERR };
    if (q.a === 'ulogin') return au.open ? { err: 'لا يوجد مستخدمون في القاعدة بعد' } : { user: au };
    if (!au.open) {
      const n = NEED[q.a];
      if (n && !au.admin && ![].concat(n).some(p => (au.perms || []).indexOf(p) >= 0)) return { err: 'لا تملك صلاحية هذه العملية' };
    }
    if (q.a === 'sig' || q.a === 'kvget' || q.a === 'kvput') return sharedApi(q);
    if (q.a === 'ulist' || q.a === 'usave' || q.a === 'udel') return usersApi(q, au);
    if (String(q.a).indexOf('sh') === 0) return shipments(q, au);
    return docs(q, ['rsave', 'rlist', 'rget', 'rdel', 'rnext'].indexOf(q.a) >= 0);
  }

  // معالج HTTP (Vercel/Node)
  async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (o, code) => { res.statusCode = code || 200; res.end(JSON.stringify(o)); };
    try {
      if (req.method === 'GET') {   // فحص توفر الخادم (تستعمله الواجهة لاكتشاف الربط التلقائي)
        if (!dbUrl(env) && !env.__TEST) return send({ ok: 0, err: 'قاعدة البيانات غير مربوطة' });
        await init(); const n = (await sql('SELECT count(*)::int AS n FROM users'))[0].n;
        return send({ ok: 1, app: 'portist', users: n > 0 });
      }
      if (req.method !== 'POST') return send({ err: 'method' }, 405);
      let body = req.body;
      if (body === undefined || body === null) { body = ''; for await (const c of req) body += c; }
      if (Buffer.isBuffer(body)) body = body.toString('utf8');
      const q = typeof body === 'string' ? JSON.parse(body || '{}') : body;
      return send(await run(q));
    } catch (e) { return send({ err: String(e && e.message || e) }); }
  }
  return { handler, run };
}
module.exports = { makeHandler, dbUrl };
