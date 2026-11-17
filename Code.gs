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
    if (q.pw !== PASSWORD) return out({ err: 'كلمة السر غير صحيحة' });
    // ---- المستخدمون والصلاحيات: تُفرض هنا في السيرفر متى وُجد مستخدمون في ورقة Users ----
    if (q.a === 'usalt') { const x = findUser(q.user); return out({ salt: x && x.active !== false ? x.salt : '' }); }
    const au = authUser(q);
    if (!au) return out({ err: 'دخول غير مصرّح — سجّل الدخول من جديد' });
    if (q.a === 'ulogin') return au.open ? out({ err: 'لا يوجد مستخدمون في الجدول بعد' }) : out({ user: au });
    if (!au.open) {
      const n = NEED[q.a];
      if (n && !au.admin && ![].concat(n).some(p => (au.perms || []).indexOf(p) >= 0)) return out({ err: 'لا تملك صلاحية هذه العملية' });
    }
    if (q.a === 'ulist' || q.a === 'usave' || q.a === 'udel') return usersApi(q, au);
    if (String(q.a).indexOf('sh') === 0) return shipments(q);   // shipments actions: shlist / shsave / shdel
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
function shipments(q) {
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
    if (q.a === 'shlist') return out({ items: v.map(r => { try { return { code: String(r[0]), d: JSON.parse(r[5]) }; } catch (e) { return null; } }).filter(Boolean) });
    if (q.a === 'shsave') {
      const d = q.d, cu = (d.cons || []).map(c => c.cust).join('، ');
      const row = [q.code, d.stat || d.st || '', cu, d.eta || '', new Date().getTime(), JSON.stringify(d)];
      if (idx >= 0) s.getRange(idx + 2, 1, 1, 6).setValues([row]); else s.appendRow(row);
      return out({ ok: 1 });
    }
    if (q.a === 'shdel') { if (idx >= 0) s.deleteRow(idx + 2); return out({ ok: 1 }); }
    return out({ err: 'أمر غير معروف' });
  } finally { lock.releaseLock(); }
}

// ---- Users sheet: المستخدمون وصلاحياتهم ----
// كل عملية تتطلب إحدى الصلاحيات المذكورة أمامها. العمليات غير المذكورة (قراءة الشحنات) تكفيها هوية مستخدم فعّال.
const NEED = { list: ['inv', 'rc', 'cust', 'bal', 'cost', 'audit'], get: ['inv', 'rc', 'cust', 'bal', 'cost', 'audit'], rlist: ['rc', 'cust', 'audit'], rget: ['rc', 'cust', 'audit'],
  save: 'inv', next: 'inv', del: 'inv_cancel', adj: 'rc', rsave: 'rc', rnext: 'rc', rdel: 'rc_void',
  shsave: ['ship', 'deliver', 'cost'], shdel: 'ship_del', udel: 'users' };
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
function authUser(q) {
  const us = loadUsers();
  if (!us.length) return { open: true, admin: true, perms: [] };   // لا مستخدمين بعد: يعمل الجدول بكلمة سر الربط فقط
  const k = String(q.u || '').toLowerCase();
  const u = us.filter(x => String(x.user).toLowerCase() === k)[0];
  if (!u || u.active === false || !q.uh || u.hash !== q.uh) return null;
  return u;
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
    if (q.a === 'ulist') return out({ items: isMgr ? us : us.filter(x => x.id === au.id) });
    if (q.a === 'usave') {
      const u = q.user;
      if (!u || !u.id || !u.user) return out({ err: 'بيانات المستخدم ناقصة' });
      const i = rowOf(u.id), old = i >= 0 ? us[i] : null;
      if (!isMgr) {   // غير المدير يغيّر كلمة سره فقط
        if (!old || old.id !== au.id) return out({ err: 'لا تملك صلاحية إدارة المستخدمين' });
        u.admin = old.admin; u.perms = old.perms; u.active = old.active; u.user = old.user; u.name = old.name;
      }
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
