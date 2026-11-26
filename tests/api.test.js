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
  // صور الحمولات
  {
    const J = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    await call({ a: 'shsave', code: 'SH-7001', isNew: true, d: { stat: 'ld', cons: [{ id: 'c1', cust: 'x', pk: '1', dl: [] }] } });
    ck('photo: add', (await call({ a: 'phadd', ship: 'SH-7001', cid: 'c1', name: 'a.jpg', d: J, t: J })).ok === 1);
    ck('photo: unknown consignment refused', !!(await call({ a: 'phadd', ship: 'SH-7001', cid: 'zz', d: J, t: J })).err);
    ck('photo: non-jpeg refused', !!(await call({ a: 'phadd', ship: 'SH-7001', cid: 'c1', d: 'data:text/html;base64,AAAA', t: J })).err);
    const l = (await call({ a: 'phlist', ship: 'SH-7001' })).items;
    ck('photo: list has 1 without image data', l.length === 1 && l[0].cid === 'c1' && !l[0].d);
    ck('photo: get full and thumb', (await call({ a: 'phget', id: l[0].id })).d === J && (await call({ a: 'phget', id: l[0].id, th: 1 })).d === J);
    ck('photo: delete', (await call({ a: 'phdel', id: l[0].id })).ok === 1 && (await call({ a: 'phlist', ship: 'SH-7001' })).items.length === 0);
    await call({ a: 'phadd', ship: 'SH-7001', cid: 'c1', d: J, t: J });
    await call({ a: 'shdel', code: 'SH-7001' });
    ck('photo: removed with the shipment', (await call({ a: 'phlist', ship: 'SH-7001' })).items.length === 0);
  }
  // نظام ستوك التصديرات (مستقل)
  {
    const inv = (o) => Object.assign({ a: 'xssave', k: 'inv', d: Object.assign({ no: 'A-1', supplier: 'مورد', customer: 'عميل', kind: 'exp', date: '2026-01-10', due: '2026-04-10', cur: 'USD', total: 1000 }, o || {}) });
    let r = await call(inv());
    ck('xs: save export-intended invoice', r.ok === 1 && r.d.id === 'XI-0001');
    ck('xs: duplicate supplier+no refused', !!(await call(inv())).err);
    ck('xs: customer required', !!(await call(inv({ no: 'A-2', customer: '' }))).err);
    ck('xs: issue date required', !!(await call(inv({ no: 'A-2', date: '' }))).err);
    ck('xs: export needs due', !!(await call(inv({ no: 'A-2', due: '' }))).err);
    r = await call(inv({ no: 'D-1', kind: 'dom', due: '2026-09-09' }));
    ck('xs: domestic keeps no due', r.ok === 1 && r.d.due === '');
    const E = (lines, o) => ({ a: 'xssave', k: 'exp', d: Object.assign({ ref: 'SH-X1', date: '2026-02-01', decl: 'D123', lines }, o || {}) });
    { const x = await call(E([{ inv: r.d.id, mode: 'full' }])); ck('xs: domestic invoice can be exported too', x.ok === 1); await call({ a: 'xsdel', k: 'exp', id: x.d.id }); }
    ck('xs: partial needs out+rest', !!(await call(E([{ inv: 'XI-0001', mode: 'part', out: 'x' }]))).err);
    r = await call(E([{ inv: 'XI-0001', mode: 'part', out: '60 كرتون', rest: '40 كرتون' }]));
    ck('xs: save export record XE-0001', r.ok === 1 && r.d.id === 'XE-0001');
    ck('xs: list returns both', (await call({ a: 'xslist' })).exp.length === 1 && (await call({ a: 'xslist' })).inv.length === 2);
    ck('xs: cannot delete invoice used in a record', !!(await call({ a: 'xsdel', k: 'inv', id: 'XI-0001' })).err);
    r = await call({ a: 'xsclose', id: 'XI-0001', how: 'local', note: 'حُوّل' });
    ck('xs: close invoice', r.ok === 1 && r.d.closed && r.d.closed.how === 'local');
    r = await call({ a: 'xsclose', id: 'XI-0001', open: 1 });
    ck('xs: reopen invoice', r.ok === 1 && !r.d.closed);
    const J = Buffer.from('%PDF-1.4 test').toString('base64');
    r = await call({ a: 'xsfput', name: 'a.pdf', mime: 'application/pdf', d: J });
    ck('xs: file upload', r.ok === 1);
    ck('xs: bad mime refused', !!(await call({ a: 'xsfput', name: 'a.exe', mime: 'application/x-msdownload', d: J })).err);
    const fid = r.file.id;
    await call({ a: 'xssave', k: 'exp', id: 'XE-0001', d: Object.assign(E([{ inv: 'XI-0001', mode: 'full' }]).d, { files: [r.file], ver: 1 }) });
    ck('xs: file attached then readable', (await call({ a: 'xsfget', id: fid })).d === J);
    ck('xs: stale ver => conflict', (await call({ a: 'xssave', k: 'exp', id: 'XE-0001', d: Object.assign(E([{ inv: 'XI-0001', mode: 'full' }]).d, { ver: 1 }) })).err === 'conflict');
    {
      const cur = (await call({ a: 'xslist' })).exp.find(x => x.id === 'XE-0001');
      let r = await call({ a: 'xspost', id: 'XE-0001', post: 1 });
      ck('xs: post locks the record', r.ok === 1 && r.d.posted === true && !!r.d.postedAt);
      r = await call({ a: 'xssave', k: 'exp', id: 'XE-0001', d: Object.assign({}, cur, { ref: 'HACK', decl: 'DECL-1', lines: [], ver: r.d.ver }) });
      ck('xs: posted record only accepts declaration/notes/files', r.ok === 1 && r.d.decl === 'DECL-1' && r.d.ref !== 'HACK' && r.d.lines.length === 1);
      ck('xs: posted record cannot be deleted', !!(await call({ a: 'xsdel', k: 'exp', id: 'XE-0001' })).err);
      const e2 = await call({ a: 'xssave', k: 'exp', d: { ref: 'SH-2', date: '2026-03-01', lines: [{ inv: 'XI-0001', mode: 'full' }] } });
      ck('xs: second draft can hold the same invoice', e2.ok === 1);
      ck('xs: cannot post when the invoice is already fully exported', !!(await call({ a: 'xspost', id: e2.d.id, post: 1 })).err);
      await call({ a: 'xsdel', k: 'exp', id: e2.d.id });
      r = await call({ a: 'xspost', id: 'XE-0001', post: 0 });
      ck('xs: unpost', r.ok === 1 && !r.d.posted);
    }
    ck('xs: delete export record removes its file', (await call({ a: 'xsdel', k: 'exp', id: 'XE-0001' })).ok === 1 && !!(await call({ a: 'xsfget', id: fid })).err);
    ck('xs: now invoice deletable', (await call({ a: 'xsdel', k: 'inv', id: 'XI-0001' })).ok === 1);
    // استقلال: لا يظهر شيء من ستوك التصديرات في فواتير النظام أو شحناته
    ck('xs: independent from main invoices/shipments', (await call({ a: 'list' })).items.every(x => !/^XI-/.test(x.code)) && (await call({ a: 'shlist' })).items.every(x => !/^X[IE]-/.test(x.code)));
  }
  // الإشعارات الدائنة: تدخل في حساب حالة الفاتورة الأصلية على الخادم
  {
    const base = { rcv: 'n', date: '2026-01-01', cur: '$' };
    await call({ a: 'save', code: 'PST-8001', isNew: true, d: Object.assign({ t: 500, pd: 0, st: 'sent' }, base) });
    await call({ a: 'save', code: 'CN-0001', isNew: true, d: Object.assign({ t: -200, st: 'sent', note: 'cr', ref: 'PST-8001', reason: 'r' }, base) });
    const l = (await call({ a: 'list' })).items.find(x => x.code === 'CN-0001');
    ck('list exposes note/ref/reason', l && l.note === 'cr' && l.ref === 'PST-8001' && l.reason === 'r');
    let r = await call({ a: 'adj', code: 'PST-8001', delta: 300, no: 'RC-9', keep: true });
    ck('paid 300 + credit 200 = settled (paid)', r.d && r.d.st === 'paid');
    r = await call({ a: 'adj', code: 'PST-8001', delta: -100, no: 'RC-9', keep: true });
    ck('paid 200 + credit 200 < 500 => partial', r.d && r.d.st === 'partial');
    await call({ a: 'save', code: 'CN-0001', isNew: false, d: Object.assign({ t: -200, st: 'void', note: 'cr', ref: 'PST-8001', reason: 'r' }, base) });
    r = await call({ a: 'adj', code: 'PST-8001', delta: 0, no: '', keep: false });
    ck('void credit note ignored in status', r.d && r.d.st === 'partial' && r.d.pd === 200);
  }
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
  r = await call({ a: 'shsave', code: 'SH-0001', fin: 1, d: Object.assign({}, await sh(), { costs: [{ id: 'k1', amt: '10' }, { id: 'k2', amt: '25' }], fin: { alloc: 'pk' } }), ...A });
  ck('fin flag + cost perm writes costs and fin', r.ok && (await sh()).costs.length === 2 && (await sh()).fin.alloc === 'pk');
  r = await call({ a: 'shsave', code: 'SH-0001', d: Object.assign({}, await sh(), { costs: [], fin: { alloc: 'eq' } }), ...A });
  ck('admin shipment save WITHOUT fin flag does not touch costs/fin', r.ok && (await sh()).costs.length === 2 && (await sh()).fin.alloc === 'pk');
  r = await call({ a: 'shsave', code: 'SH-0001', fin: 1, d: Object.assign({}, await sh(), { costs: [{ amt: '1' }] }), ...S2 });
  ck('fin flag without cost permission is ignored', (await sh()).costs.length === 2);
  ck('shlist hides fin from ship-only', (await call({ a: 'shlist', ...S2 })).items[0].d.fin === undefined);
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
  // كود العميل يتكرر في أكثر من فاتورة؛ رقم الفاتورة وحده فريد
  await H.run({ a: 'save', code: 'CR-1', isNew: true, d: { rcv: 'عميل ك', cref: 'GIB-9', date: '2026-01-01', t: 10, st: 'draft' }, ...A });
  await H.run({ a: 'save', code: 'CR-2', isNew: true, d: { rcv: 'عميل ك', cref: 'GIB-9', date: '2026-01-02', t: 20, st: 'draft' }, ...A });
  const crl = (await H.run({ a: 'list', ...A })).items.filter(x => x.cref === 'GIB-9');
  ck('same customer code on two invoices (list returns cref)', crl.length === 2);
  ck('duplicate invoice number still refused by the server', (await H.run({ a: 'save', code: 'CR-1', isNew: true, d: { rcv: 'x', date: '2026-01-03', t: 1 }, ...A })).err === 'exists');
  // التخزين المشترك + التوقيع اللحظي
  const g0 = (await H.run({ a: 'sig', ...A })).sig;
  ck('sig returns a string', typeof g0 === 'string' && g0.split('|').length === 5);
  ck('kvput map entries + scalar', (await H.run({ a: 'kvput', ...A, ops: [{ k: 'pst_cust', id: 'c1', v: { id: 'c1', name: 'أحمد' } }, { k: 'pst_cust', id: 'c2', v: { id: 'c2', name: 'ب' } }, { k: 'pst_foot', id: '', v: 'شكراً' }] })).n === 3);
  const g1 = (await H.run({ a: 'sig', ...A })).sig;
  ck('sig changes after kv write', g1 !== g0);
  const kv = (await H.run({ a: 'kvget', since: 0, ...A })).items;
  ck('kvget returns all rows', kv.length === 3 && kv.find(x => x.id === 'c1').v.name === 'أحمد');
  await new Promise(r => setTimeout(r, 5));
  await H.run({ a: 'kvput', ...A, ops: [{ k: 'pst_cust', id: 'c2', del: 1 }] });
  const kv2 = (await H.run({ a: 'kvget', since: Math.max(...kv.map(x => x.u)) + 1, ...A })).items;
  ck('delete = tombstone visible incrementally', kv2.length === 1 && kv2[0].del === true && kv2[0].id === 'c2');
  ck('sig changes after delete', (await H.run({ a: 'sig', ...A })).sig !== g1);
  await H.run({ a: 'kvput', ...A, ops: [{ k: 'pst_dseq', id: '', v: 5, max: 1 }] });
  await H.run({ a: 'kvput', ...A, ops: [{ k: 'pst_dseq', id: '', v: 3, max: 1 }] });
  ck('max counter never goes down', (await H.run({ a: 'kvget', since: 0, ...A })).items.find(x => x.k === 'pst_dseq').v === 5);
  await H.run({ a: 'kvput', ...A, ops: [{ k: 'pst_cust', id: 'c1', v: { name: 'نسخة قديمة' }, isNew: true }, { k: 'pst_cust', id: 'c2', v: { name: 'مرفوض' }, isNew: true }] });
  const kv3 = (await H.run({ a: 'kvget', since: 0, ...A })).items;
  ck('isNew never overwrites existing or deleted', kv3.find(x => x.id === 'c1').v.name === 'أحمد' && kv3.find(x => x.id === 'c2').del === true);
  ck('unknown key ignored', (await H.run({ a: 'kvput', ...A, ops: [{ k: 'evil', id: 'x', v: 1 }] })).n === 0);
  ck('kv requires login', !!(await H.run({ a: 'kvget', since: 0 })).err && !!(await H.run({ a: 'sig', u: 'admin', uh: 'bad' })).err);
  // fail-open
  await sql('DELETE FROM users');
  ck('users table emptied after AUTH => refused (no fail-open)', !!(await call({ a: 'list' })).err);
  console.log(fails ? 'FAILED: ' + fails : 'API OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
