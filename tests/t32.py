import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1300,'height':900});pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    dlg=[];pg.on('dialog',lambda d:(dlg.append(d.message),d.dismiss()))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(700)
    H=lambda:pg.evaluate("location.hash")
    ok('landing page has a route',H().startswith('#/'))
    pg.click('#sd_c');pg.wait_for_timeout(500);ok('customers -> #/customers',H()=='#/customers')
    pg.click('#sd_g');pg.wait_for_timeout(500);ok('settings -> #/settings',H()=='#/settings')
    pg.click('#sd_ai');pg.wait_for_timeout(500);ok('invoices -> #/accounting/invoices',H()=='#/accounting/invoices')
    pg.click('#sd_ar');pg.wait_for_timeout(500);ok('receipts -> #/accounting/receipts',H()=='#/accounting/receipts')
    # فاتورة جديدة ثم حفظ
    pg.evaluate("setMode('i');newInv()");pg.wait_for_timeout(400);ok('new invoice route',H()=='#/invoice/new')
    pg.fill('#rcv','شركة الأمل');pg.fill('#cref','GIB-777')
    pg.evaluate("S.rows=[{name:'شحن',ship:100}];render();calc();saveInv()");pg.wait_for_timeout(300)
    if pg.is_visible('#mIssue'):pg.click('#isYes');pg.wait_for_timeout(300)
    pg.wait_for_timeout(500);ok('saved invoice has its own link',H()=='#/invoice/PST-0001')
    # الرجوع
    pg.go_back();pg.wait_for_timeout(700);ok('back button leaves the invoice',pg.evaluate("S.mode")!='i' or H()=='#/invoice/new')
    pg.go_back();pg.wait_for_timeout(700);ok('back again reaches receipts list',H()=='#/accounting/receipts' and pg.evaluate("S.mode")=='a')
    pg.go_forward();pg.wait_for_timeout(700);ok('forward works',H() in('#/invoice/new','#/invoice/PST-0001'))
    # التحديث يبقيك في نفس الفاتورة
    pg.goto(APP+'#/invoice/PST-0001');pg.reload();pg.wait_for_timeout(1500)
    ok('refresh keeps the opened invoice',pg.evaluate("S.mode")=='i' and pg.input_value('#code')=='PST-0001' and pg.input_value('#rcv')=='شركة الأمل')
    # رابط مباشر لكشف عميل بالكود
    pg.goto(APP+'#/customer/GIB-777');pg.reload();pg.wait_for_timeout(1800)
    ok('deep link to a customer statement by code',pg.evaluate("S.mode")=='s' and 'شركة الأمل' in pg.inner_text('#spaper') and H()=='#/customer/GIB-777')
    # رابط شحنة غير موجودة / صفحة غير معروفة
    pg.goto(APP+'#/nope');pg.reload();pg.wait_for_timeout(1500)
    ok('unknown route does not break the app',pg.evaluate("!!ME")and len(errs)==0)
    # حماية التعديلات غير المحفوظة عند الرجوع
    pg.evaluate("setMode('i');newInv()");pg.wait_for_timeout(400);pg.fill('#rcv','تعديل');pg.wait_for_timeout(200)
    pg.evaluate("history.back()");pg.wait_for_timeout(900)
    ok('unsaved changes ask before leaving (stay on the page)',len(dlg)>=1 and pg.evaluate("S.mode")=='i' and pg.input_value('#rcv')=='تعديل')
    # نسخ الرابط
    pg.evaluate("document.getElementById('bCopyLink').click()");pg.wait_for_timeout(300)
    ok('copy-link button exists',pg.evaluate("!!document.getElementById('bCopyLink')"))
    ok('no page errors',not errs)
    if errs:print(errs[:3])
