// اختبارات الخادم (Postgres): تشغَّل على PGlite (Postgres حقيقي داخل node): node tests/api.test.js
const { PGlite } = require('@electric-sql/pglite');
const { makeHandler } = require('../lib/core');
(async () => {
  const pg = new PGlite();
  const sql = async (t, p) => (await pg.query(t, p || [])).rows;
  const H = makeHandler({ sql, env: { APP_PASSWORD: 'k', __TEST: 1 } });
  const call = o => H.run(Object.assign({ pw: 'k' }, o));
  let fails = 0;
  const ck = (t, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + t); };
  const A = { u: 'admin', uh: 'h1' };
  const mkU = (id, user, hash, perms, extra) => Object.assign({ id, user, name: user, salt: 's' + id, hash, admin: false, perms, active: true }, extra || {});

  ck('wrong link password refused', !!(await H.run({ pw: 'no', a: 'list' })).err);
  ck('no APP_PASSWORD configured refused', !!(await makeHandler({ sql, env: {} }).run({ pw: '', a: 'list' })).err);
  ck('open mode (no users) save invoice', (await call({ a: 'save', code: 'PST-0001', isNew: true, d: { rcv: 'x', t: 100, st: 'sent', date: '2026-01-01', cur: '$' } })).ok === 1);
  ck('duplicate isNew => exists', (await call({ a: 'save', code: 'PST-0001', isNew: true, d: { t: 1 } })).err === 'exists');
  ck('next invoice PST-0002', (await call({ a: 'next' })).code === 'PST-0002');
  ck('bootstrap non-admin refused', !!(await call({ a: 'usave', user: mkU('e', 'emp', 'h2', ['ship']) })).err);
  ck('bootstrap admin ok', (await call({ a: 'usave', user: mkU('a', 'admin', 'h1', [], { admin: true }) })).ok === 1);
  ck('anonymous refused after first user', !!(await call({ a: 'list' })).err);
  ck('login ok / wrong refused', !!(await call({ a: 'ulogin', ...A })).user && !!(await call({ a: 'ulogin', u: 'admin', uh: 'bad' })).err);
  const raw = (await sql('SELECT data FROM users')).map(r => r.data);
  ck('DB never stores raw client hash', raw.every(u => !u.hash && u.hash2 && u.hash2 !== 'h1'));
  ck('ulist/ulogin leak no hash', (await call({ a: 'ulist', ...A })).items.every(u => !u.hash && !u.hash2) && !('hash2' in (await call({ a: 'ulogin', ...A })).user));
  const f1 = await call({ a: 'usalt', user: 'ghost' }), f2 = await call({ a: 'usalt', user: 'ghost' });
  ck('fake salt stable, differs per name, real salt for admin', f1.salt && f1.salt === f2.salt && f1.salt !== (await call({ a: 'usalt', user: 'g2' })).salt && (await call({ a: 'usalt', user: 'admin' })).salt === 'sa');
  // users + perms
  await call({ a: 'usave', ...A, user: mkU('e', 'emp', 'h2', ['ship']) });
  await call({ a: 'usave', ...A, user: mkU('S', 'shp', 'sh', ['ship', 'cost']) });
  await call({ a: 'usave', ...A, user: mkU('D', 'drv', 'dh', ['deliver']) });
  await call({ a: 'usave', ...A, user: mkU('R', 'rcp', 'rh', ['rc', 'inv']) });
  const E = { u: 'emp', uh: 'h2' }, SC = { u: 'shp', uh: 'sh' }, DR = { u: 'drv', uh: 'dh' }, RC = { u: 'rcp', uh: 'rh' };
  ck('emp cannot list invoices', !!(await call({ a: 'list', ...E })).err);
  ck('emp cannot adj/save invoices', !!(await call({ a: 'adj', code: 'PST-0001', delta: 5, no: 'RC-1', keep: true, ...E })).err && !!(await call({ a: 'save', code: 'PST-0009', isNew: true, d: {}, ...E })).err);
  ck('emp ulist only self', (await call({ a: 'ulist', ...E })).items.map(x => x.user).join() === 'emp');
  await call({ a: 'usave', ...E, user: { id: 'e', user: 'emp', name: 'E', salt: 'se', hash: 'h3', admin: true, perms: ['users'], active: true } });
  ck('emp self-escalation ignored, pw change works', (await call({ a: 'ulogin', u: 'emp', uh: 'h3' })).user.admin === false && !!(await call({ a: 'ulogin', ...E })).err);
  E.uh = 'h3';
  ck('admin cannot disable/delete last admin or self', !!(await call({ a: 'usave', ...A, user: mkU('a', 'admin', null, [], { admin: true, active: false }) })).err && !!(await call({ a: 'udel', id: 'a', ...A })).err);
  ck('rename keeps password when no hash sent', !!(await call({ a: 'usave', ...A, user: Object.assign(mkU('S', 'shp', null, ['ship', 'cost']), { name: 'S2' }) })).ok && !!(await call({ a: 'ulogin', ...SC })).user);
  // invoices / receipts / adj
  const adj = await call({ a: 'adj', code: 'PST-0001', delta: 40, no: 'RC-1', keep: true, ...RC });
  ck('adj partial pd=40', adj.ok && adj.d.pd === 40 && adj.d.st === 'partial');
  const adjs = await Promise.all([1, 2, 3, 4, 5].map(i => call({ a: 'adj', code: 'PST-0001', delta: 10, no: 'RC-' + (i + 1), keep: true, ...RC })));
  ck('5 concurrent adj => no lost update (pd=90)', adjs.every(x => x.ok) && (await call({ a: 'get', code: 'PST-0001', ...A })).d.pd === 90);
  ck('list returns invoice', (await call({ a: 'list', ...A })).items.some(x => x.code === 'PST-0001' && x.pd === 90));
  ck('receipt save/list/get/next', (await call({ a: 'rsave', code: 'RC-0001', isNew: true, d: { rcv: 'x', t: 5 }, ...RC })).ok && (await call({ a: 'rnext', ...RC })).code === 'RC-0002' && (await call({ a: 'rlist', ...A })).items.length === 1 && (await call({ a: 'rget', code: 'RC-0001', ...A })).d.t === 5);
  ck('ping ok', (await call({ a: 'ping', ...A })).ok === 1);
  // shipments
  const base = { code: 'SH-0001', st: 'ld', freight: '500', cur: '$', costs: [{ amt: '10' }], cons: [{ id: 'c1', cust: 'A', pk: 5, dl: [] }, { id: 'c2', cust: 'B', pk: 3, dl: [] }], hist: [{ st: 'ld' }] };
  ck('deliver-only cannot create', !!(await call({ a: 'shsave', code: 'SH-0009', isNew: true, d: base, ...DR })).err);
  let r = await call({ a: 'shsave', code: 'SH-0001', isNew: true, d: base, ...SC });
  ck('create ver=1', r.ok && r.ver === 1 && r.d.costs.length === 1);
  ck('isNew duplicate => exists', (await call({ a: 'shsave', code: 'SH-0001', isNew: true, d: base, ...SC })).err === 'exists');
  r = await call({ a: 'shsave', code: 'SH-0001', d: Object.assign({}, base, { ver: 0, notes: 'x' }), ...SC });
  ck('stale ver => conflict with server copy', r.err === 'conflict' && r.ver === 1 && r.d);
  r = await call({ a: 'shsave', code: 'SH-0001', d: Object.assign({}, base, { ver: 1, notes: 'x' }), ...SC });
  ck('matching ver => ver 2', r.ok && r.ver === 2);
  r = await call({ a: 'shsave', code: 'SH-0001', force: 1, d: Object.assign({}, base, { ver: 0, notes: 'forced' }), ...SC });
  ck('force => ver 3', r.ok && r.ver === 3);
  const sh = async () => (await sql("SELECT data FROM shipments WHERE code='SH-0001'"))[0].data;
  const S2 = { u: 'emp', uh: 'h3' };   // ship only
  r = await call({ a: 'shsave', code: 'SH-0001', d: Object.assign({}, base, { ver: 3, costs: [{ amt: '999' }] }), ...S2 });
  ck('ship-only cannot overwrite costs', r.ok && (await sh()).costs[0].amt === '10');
  ck('shlist hides costs from ship-only, shows to cost', (await call({ a: 'shlist', ...S2 })).items[0].d.costs === undefined && (await call({ a: 'shlist', ...A })).items[0].d.costs.length === 1);
  let cur = (await call({ a: 'shlist', ...DR })).items[0].d; const dd = JSON.parse(JSON.stringify(cur));
  dd.cons[0].dl = [{ n: 'D-1', pk: 2 }]; dd.cons[0].cust = 'HACK'; dd.notes = 'hack'; dd.st = 'cu';
  r = await call({ a: 'shsave', code: 'SH-0001', d: dd, ...DR });
  ck('deliver-only: dl+status saved, cust/notes protected', r.ok && (await sh()).cons[0].dl.length === 1 && (await sh()).cons[0].cust === 'A' && (await sh()).st === 'cu');
  const pd = Object.assign({}, (await sh()), { posted: true, postedAt: '2026-01-01' });
  r = await call({ a: 'shsave', code: 'SH-0001', d: pd, ...S2 });
  ck('ship-only cannot post', !(await sh()).posted);
  pd.ver = (await sh()).ver; r = await call({ a: 'shsave', code: 'SH-0001', d: pd, ...A });
  ck('admin posts', !!(await sh()).posted);
  const ld = Object.assign({}, await sh()); ld.cons = ld.cons.map(c => Object.assign({}, c)); ld.cons[0].pk = 999; ld.cons.push({ id: 'c9', cust: 'N', pk: 1, dl: [] }); ld.freight = '1'; ld.notes = 'after post';
  await call({ a: 'shsave', code: 'SH-0001', d: ld, ...A });
  ck('posted: consignments+freight locked server-side, notes editable', (await sh()).cons.length === 2 && (await sh()).cons[0].pk === 5 && (await sh()).freight === '500' && (await sh()).notes === 'after post');
  ck('delete posted/with deliveries refused', !!(await call({ a: 'shdel', code: 'SH-0001', ...A })).err);
  ck('shnext SH-0002', (await call({ a: 'shnext', ...A })).code === 'SH-0002');
  const par = await Promise.all([1, 2, 3].map(i => call({ a: 'shsave', code: 'SH-0007', isNew: true, d: Object.assign({}, base, { code: 'SH-0007' }), ...A })));
  ck('concurrent create: exactly one wins', par.filter(x => x.ok).length === 1 && par.filter(x => x.err === 'exists').length === 2);
  // الدخول العادي بدون رمز ربط + تقييد المحاولات
  ck('normal login/use needs NO link password', !!(await H.run({ a: 'ulogin', ...A })).user && !!(await H.run({ a: 'ulist', ...A })).items);
  ck('wrong user hash without pw refused', !!(await H.run({ a: 'ulist', u: 'admin', uh: 'zzz' })).err);
  await call({ a: 'usave', ...A, user: mkU('V', 'vic', 'hv', ['inv']) });
  for (let i = 0; i < 8; i++) await H.run({ a: 'ulogin', u: 'vic', uh: 'bad' + i });
  const lk = await H.run({ a: 'ulogin', u: 'vic', uh: 'hv' });
  ck('lockout after 8 failures even with correct password', /محاولات/.test(lk.err || ''));
  ck('lockout is per user (admin unaffected)', !!(await H.run({ a: 'ulogin', ...A })).user);
  // fail-open
  await sql('DELETE FROM users');
  ck('users table emptied after AUTH => refused (no fail-open)', !!(await call({ a: 'list' })).err);
  console.log(fails ? 'FAILED: ' + fails : 'API OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
