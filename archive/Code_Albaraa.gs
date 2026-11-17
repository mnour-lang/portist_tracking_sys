// Albaraa Logistic Invoices - Google Sheets backend
const PASSWORD = 'غيّر-كلمة-السر-هنا';   // غيّرها قبل النشر
const SHEET = 'Invoices';

function sh() {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(SHEET);
  if (!s) {
    s = ss.insertSheet(SHEET);
    s.getRange('A:C').setNumberFormat('@');
    s.appendRow(['code', 'receiver', 'date', 'total', 'currency', 'updated', 'data']);
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
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const s = sh();
      const v = s.getDataRange().getValues(); v.shift();
      const idx = v.findIndex(r => String(r[0]) === q.code);
      switch (q.a) {
        case 'ping': return out({ ok: 1 });
        case 'next': {
          let m = 0;
          v.forEach(r => { const x = /^ALB-(\d+)$/i.exec(String(r[0])); if (x) m = Math.max(m, +x[1]); });
          return out({ code: 'ALB-' + String(m + 1).padStart(4, '0') });
        }
        case 'list':
          return out({ items: v.map(r => ({ code: String(r[0]), rcv: r[1], date: r[2], t: r[3], cur: r[4], ts: r[5] })).reverse() });
        case 'get':
          return idx < 0 ? out({ err: 'الفاتورة غير موجودة' }) : out({ d: JSON.parse(v[idx][6]) });
        case 'save': {
          if (idx >= 0 && q.isNew) return out({ err: 'exists' });
          const d = q.d;
          const row = [q.code, d.rcv || '', d.date || '', d.t || 0, d.cur || '', new Date().getTime(), JSON.stringify(d)];
          if (idx >= 0) s.getRange(idx + 2, 1, 1, 7).setValues([row]); else s.appendRow(row);
          return out({ ok: 1 });
        }
        case 'del':
          if (idx >= 0) s.deleteRow(idx + 2);
          return out({ ok: 1 });
      }
      return out({ err: 'أمر غير معروف' });
    } finally { lock.releaseLock(); }
  } catch (err) { return out({ err: String(err) }); }
}
