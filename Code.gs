// Portist Invoices & Receipts - Google Sheets backend
const PASSWORD = 'غيّر-كلمة-السر-هنا';   // غيّرها قبل النشر
const HEAD = ['code', 'receiver', 'date', 'total', 'currency', 'updated', 'data', 'status', 'paid'];

function sh(name) {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange('A:C').setNumberFormat('@');
    s.appendRow(HEAD);
    s.setFrozenRows(1);
  }
  return s;
}
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return out({ ok: 1 }); }

function doPost(e) {
  try {
    const q = JSON.parse(e.postData.contents);
    if (PASSWORD === 'غيّر-كلمة-السر-هنا') return out({ err: 'لم تُغيَّر كلمة سر الربط في Code.gs بعد — غيّرها ثم أعد النشر' });
    if (q.pw !== PASSWORD) return out({ err: 'كلمة السر غير صحيحة' });
    // ---- المستخدمون والصلاحيات: تُفرض هنا في السيرفر متى وُجد مستخدمون في ورقة Users ----
    if (q.a === 'usalt') { const x = findUser(q.user); return out({ salt: x && x.active !== false ? x.salt : h2('salt|' + String(q.user || '').toLowerCase()).slice(0, 16) }); }   // ملح وهمي ثابت لمن لا وجود له: لا كشف لأسماء المستخدمين
    const au = authUser(q);
    if (!au) return out({ err: 'دخول غير مصرّح — سجّل الدخول من جديد' });
    if (q.a === 'ulogin') return au.open ? out({ err: 'لا يوجد مستخدمون في الجدول بعد' }) : out({ user: au });
    if (!au.open) {
      const n = NEED[q.a];
      if (n && !au.admin && ![].concat(n).some(p => (au.perms || []).indexOf(p) >= 0)) return out({ err: 'لا تملك صلاحية هذه العملية' });
    }
    if (q.a === 'ulist' || q.a === 'usave' || q.a === 'udel') return usersApi(q, au);
    if (String(q.a).indexOf('sh') === 0 ) return shipments(q, au);   // shipments actions: shlist / shsave / shdel / shnext
    const R = ['rsave', 'rlist', 'rget', 'rdel', 'rnext'].indexOf(q.a) >= 0;   // receipts actions
    const act = R ? q.a.slice(1) : q.a;
    const prefix = R ? 'RC' : 'PST';
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const s = sh(R ? 'Receipts' : 'Invoices');
      const v = s.getDataRange().getValues(); v.shift();
      const idx = v.findIndex(r => String(r[0]) === q.code);
      switch (act) {
        case 'ping': return out({ ok: 1 });
        case 'next': {
          let m = 0;
          const re = new RegExp('^' + prefix + '-(\\d+)$', 'i');
          v.forEach(r => { const x = re.exec(String(r[0])); if (x) m = Math.max(m, +x[1]); });
          return out({ code: prefix + '-' + String(m + 1).padStart(4, '0') });
        }
        case 'list':
          return out({ items: v.map(r => ({ code: String(r[0]), rcv: r[1], date: r[2], t: r[3], cur: r[4], ts: r[5], st: r[7] || (R ? 'valid' : 'draft'), pd: r[8] || 0 })).reverse() });
        case 'get':
          return idx < 0 ? out({ err: 'غير موجود' }) : out({ d: JSON.parse(v[idx][6]) });
        case 'save': {
          if (idx >= 0 && q.isNew) return out({ err: 'exists' });
          const d = q.d;
          const row = [q.code, d.rcv || '', d.date || '', d.t || 0, d.cur || '', new Date().getTime(), JSON.stringify(d), d.st || (R ? 'valid' : 'draft'), d.pd || 0];
          if (idx >= 0) s.getRange(idx + 2, 1, 1, 9).setValues([row]); else s.appendRow(row);
          return out({ ok: 1 });
        }
        case 'del':
          if (idx >= 0) s.deleteRow(idx + 2);
          return out({ ok: 1 });
        case 'adj': {   // تعديل «المدفوع» ذرّياً داخل السيرفر: يمنع ضياع دفعة عند التسجيل من جهازين معاً
          if (idx < 0) return out({ err: 'الفاتورة ' + q.code + ' غير موجودة' });
          const d = JSON.parse(v[idx][6]);
          const r2 = x => Math.round((+x || 0) * 100) / 100;
          d.pd = Math.max(0, r2((+d.pd || 0) + (+q.delta || 0)));
          const t = +d.t || 0;
          if ((d.st || 'draft') !== 'draft' && d.st !== 'void') d.st = d.pd >= t - 0.005 ? 'paid' : d.pd > 0.004 ? 'partial' : 'sent';
          d.rcs = (d.rcs || []).filter(x => x !== q.no).concat(q.keep ? [q.no] : []);
          d.ts = new Date().getTime();
          s.getRange(idx + 2, 1, 1, 9).setValues([[q.code, d.rcv || '', d.date || '', d.t || 0, d.cur || '', d.ts, JSON.stringify(d), d.st || 'draft', d.pd || 0]]);
          return out({ ok: 1, d: d });
        }
      }
      return out({ err: 'أمر غير معروف' });
    } finally { lock.releaseLock(); }
  } catch (err) { return out({ err: String(err) }); }
}

// ---- Shipments sheet: one row per shipment, full JSON in column data ----
// تكاليف الشحنة وأرباحها لا تُرسَل ولا تُعدَّل إلا لمن يملك صلاحية «cost».
const can_ = (au, p) => !!au && (au.open || au.admin || (au.perms || []).indexOf(p) >= 0);
function shView(d, au) {
  if (can_(au, 'cost')) return d;
  const x = JSON.parse(JSON.stringify(d));
  delete x.costs;
  return x;
}
function shipments(q, au) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let s = SpreadsheetApp.getActive().getSheetByName('Shipments');
    if (!s) {
      s = SpreadsheetApp.getActive().insertSheet('Shipments');
      s.getRange('A:A').setNumberFormat('@');
      s.appendRow(['code', 'status', 'customers', 'eta', 'updated', 'data']);
      s.setFrozenRows(1);
    }
    const v = s.getDataRange().getValues(); v.shift();
    const idx = v.findIndex(r => String(r[0]) === q.code);
    if (q.a === 'shlist') return out({ items: v.map(r => { try { return { code: String(r[0]), d: shView(JSON.parse(r[5]), au) }; } catch (e) { return null; } }).filter(Boolean) });
    if (q.a === 'shnext') {
      let m = 0;
      v.forEach(r => { const x = /^SH-(\d+)$/i.exec(String(r[0])); if (x) m = Math.max(m, +x[1]); });
      return out({ code: 'SH-' + String(m + 1).padStart(4, '0') });
    }
    if (q.a === 'shsave') {
      const nd = q.d || {};
      let d = nd;
      if (idx >= 0) {
        if (q.isNew) return out({ err: 'exists' });
        const old = JSON.parse(v[idx][5]);
        if ((+nd.ver || 0) !== (+old.ver || 0) && !q.force) return out({ err: 'conflict', d: shView(old, au), ver: +old.ver || 0 });
        const canShip = can_(au, 'ship'), canDl = can_(au, 'deliver'), canCost = can_(au, 'cost'), canPost = can_(au, 'post');
        const locked = !!old.posted || old.stat === 'dn' || old.st === 'dn';
        const nOld = JSON.parse(JSON.stringify(old)), nNew = JSON.parse(JSON.stringify(nd));
        const dlOf = {}; (nNew.cons || []).forEach(c => dlOf[c.id] = c.dl);
        const oldDl = {}; (nOld.cons || []).forEach(c => oldDl[c.id] = c.dl);
        // ما يملك المستخدم تعديله يؤخذ من الجديد، وغيره من القديم
        d = canShip ? nNew : nOld;
        if (!canShip && canDl) { d.st = nNew.st; d.stat = nNew.stat; d.hist = nNew.hist; }
        if (canShip || canDl) {
          const base = (canShip && !locked) ? nNew.cons : nOld.cons;   // الحمولات نفسها مقفلة بعد الترحيل/التسليم أو لمن لا يملك «ship»
          d.cons = (base || []).map(c => Object.assign({}, c, { dl: canDl ? (c.id in dlOf ? dlOf[c.id] : c.dl) : (c.id in oldDl ? oldDl[c.id] : (canShip && !locked ? [] : c.dl)) }));
        } else d.cons = nOld.cons;
        if (locked) { d.freight = old.freight; d.cur = old.cur; }
        if (!canCost) d.costs = old.costs;
        else if (!canShip) d.costs = nNew.costs;
        if (!canPost) { d.posted = old.posted; d.postedAt = old.postedAt; d.postedBy = old.postedBy; }
        else { d.posted = nNew.posted; d.postedAt = nNew.postedAt; d.postedBy = nNew.postedBy; }
      } else if (!can_(au, 'ship')) {
        return out({ err: 'لا تملك صلاحية إنشاء شحنة' });
      }
      d.ver = (idx >= 0 ? (+JSON.parse(v[idx][5]).ver || 0) : 0) + 1;
      d.ts = new Date().getTime();
      const cu = (d.cons || []).map(c => c.cust).join('، ');
      const row = [q.code, d.stat || d.st || '', cu, d.eta || '', d.ts, JSON.stringify(d)];
      if (idx >= 0) s.getRange(idx + 2, 1, 1, 6).setValues([row]); else s.appendRow(row);
      return out({ ok: 1, ver: d.ver, ts: d.ts, d: shView(d, au) });
    }
    if (q.a === 'shdel') {
      if (idx >= 0) {
        const old = JSON.parse(v[idx][5]);
        if (old.posted) return out({ err: 'الشحنة مُرحَّلة — ألغِ الترحيل أولاً' });
        if ((old.cons || []).some(c => (c.dl || []).length)) return out({ err: 'لا يمكن حذف شحنة فيها تسليمات مسجلة' });
        s.deleteRow(idx + 2);
      }
      return out({ ok: 1 });
    }
    return out({ err: 'أمر غير معروف' });
  } finally { lock.releaseLock(); }
}

// ---- Users sheet: المستخدمون وصلاحياتهم ----
// كل عملية تتطلب إحدى الصلاحيات المذكورة أمامها. العمليات غير المذكورة (قراءة الشحنات) تكفيها هوية مستخدم فعّال.
const NEED = { list: ['inv', 'rc', 'cust', 'bal', 'cost', 'audit'], get: ['inv', 'rc', 'cust', 'bal', 'cost', 'audit'], rlist: ['rc', 'cust', 'audit'], rget: ['rc', 'cust', 'audit'],
  save: 'inv', next: 'inv', del: 'inv_cancel', adj: 'rc', rsave: 'rc', rnext: 'rc', rdel: 'rc_void',
  shsave: ['ship', 'deliver', 'cost'], shnext: 'ship', shdel: 'ship_del', udel: 'users' };
const UHEAD = ['id', 'user', 'name', 'admin', 'active', 'updated', 'data'];
function usersSheet() {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName('Users');
  if (!s) { s = ss.insertSheet('Users'); s.getRange('A:B').setNumberFormat('@'); s.appendRow(UHEAD); s.setFrozenRows(1); }
  return s;
}
function loadUsers() {
  const v = usersSheet().getDataRange().getValues(); v.shift();
  return v.map(r => { try { return JSON.parse(r[6]); } catch (e) { return null; } }).filter(Boolean);
}
function findUser(name) {
  const k = String(name || '').toLowerCase();
  return loadUsers().filter(x => String(x.user).toLowerCase() === k)[0] || null;
}
// ---- كلمات السر: الجدول لا يحتوي بصمة صالحة للدخول. يُخزَّن hash2 = SHA-256(PEPPER|بصمة العميل) والـPEPPER سرّ في Script Properties ----
function pepper() {
  const P = PropertiesService.getScriptProperties();
  let x = P.getProperty('PEPPER');
  if (!x) { x = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('PEPPER', x); }
  return x;
}
function h2(x) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pepper() + '|' + x, Utilities.Charset.UTF_8)
    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function strip(u) { const x = Object.assign({}, u); delete x.hash; delete x.hash2; return x; }
function authUser(q) {
  const us = loadUsers();
  const P = PropertiesService.getScriptProperties();
  if (!us.length) {
    // منع الفتح عند الفشل: إن سبق تفعيل المستخدمين ثم اختفى الجدول/فرغ فلا يُفتح النظام بصمت
    if (P.getProperty('AUTH') === '1') return null;
    return { open: true, admin: true, perms: [] };   // لا مستخدمين بعد: يعمل الجدول بكلمة سر الربط فقط
  }
  P.setProperty('AUTH', '1');
  const k = String(q.u || '').toLowerCase();
  const u = us.filter(x => String(x.user).toLowerCase() === k)[0];
  if (!u || u.active === false || !q.uh) return null;
  if (u.hash2) { if (u.hash2 !== h2(q.uh)) return null; }
  else if (u.hash && u.hash === q.uh) upgradeUser(u, q.uh);   // مستخدم قديم: يُرقّى إلى hash2 عند أول دخول ناجح
  else return null;
  return strip(u);
}
function upgradeUser(u, uh) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = usersSheet(), v = s.getDataRange().getValues(); v.shift();
    const i = v.findIndex(r => String(r[0]) === u.id);
    if (i < 0) return;
    const x = JSON.parse(v[i][6]); x.hash2 = h2(uh); delete x.hash;
    s.getRange(i + 2, 7, 1, 1).setValues([[JSON.stringify(x)]]);
  } finally { lock.releaseLock(); }
}
function usersApi(q, au) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = usersSheet();
    const us = loadUsers();
    const isMgr = au.open || au.admin || (au.perms || []).indexOf('users') >= 0;
    const admins = ex => us.filter(x => x.admin && x.active !== false && x.id !== ex).length;
    const rowOf = id => us.findIndex(x => x.id === id);
    if (q.a === 'ulist') return out({ items: (isMgr ? us : us.filter(x => x.id === au.id)).map(strip) });
    if (q.a === 'usave') {
      const u = q.user;
      if (!u || !u.id || !u.user) return out({ err: 'بيانات المستخدم ناقصة' });
      const i = rowOf(u.id), old = i >= 0 ? us[i] : null;
      if (!isMgr) {   // غير المدير يغيّر كلمة سره فقط
        if (!old || old.id !== au.id) return out({ err: 'لا تملك صلاحية إدارة المستخدمين' });
        u.admin = old.admin; u.perms = old.perms; u.active = old.active; u.user = old.user; u.name = old.name;
      }
      // بصمة العميل → hash2؛ دون بصمة جديدة تبقى كلمة السر القديمة
      if (u.hash) { u.hash2 = h2(u.hash); delete u.hash; } else if (old) { u.hash2 = old.hash2; if (!u.hash2 && old.hash) u.hash2 = h2(old.hash); if (old.salt && u.salt !== old.salt) u.salt = old.salt; }
      if (!u.hash2) return out({ err: 'كلمة السر مطلوبة' });
      if (us.some(x => x.id !== u.id && String(x.user).toLowerCase() === String(u.user).toLowerCase())) return out({ err: 'اسم الدخول مستخدم' });
      if (old && old.admin && old.active !== false && (!u.admin || u.active === false) && !admins(old.id)) return out({ err: 'لا يمكن إيقاف آخر مدير' });
      if (!us.length && !u.admin) return out({ err: 'أول مستخدم يجب أن يكون مديراً' });
      const row = [u.id, u.user, u.name || '', u.admin ? 1 : 0, u.active === false ? 0 : 1, new Date().getTime(), JSON.stringify(u)];
      if (i >= 0) s.getRange(i + 2, 1, 1, 7).setValues([row]); else s.appendRow(row);
      return out({ ok: 1 });
    }
    if (q.a === 'udel') {
      const i = rowOf(q.id);
      if (i < 0) return out({ ok: 1 });
      if (us[i].id === au.id) return out({ err: 'لا يمكنك حذف حسابك' });
      if (us[i].admin && us[i].active !== false && !admins(us[i].id)) return out({ err: 'لا يمكن حذف آخر مدير' });
      s.deleteRow(i + 2);
      return out({ ok: 1 });
    }
    return out({ err: 'أمر غير معروف' });
  } finally { lock.releaseLock(); }
}
