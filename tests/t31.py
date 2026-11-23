import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
def inv(pg,rcv,cref,amt):
    pg.evaluate("setMode('i');newInv()");pg.wait_for_timeout(120)
    pg.fill('#rcv',rcv)
    if cref is not None:pg.fill('#cref',cref)
    pg.evaluate("S.rows=[{name:'شحن',ship:%d}];render();calc()"%amt)
    pg.evaluate("saveInv()");pg.wait_for_timeout(250)
    if pg.is_visible('#mIssue'):pg.click('#isYes');pg.wait_for_timeout(250)
    return pg.evaluate("$('code').value")
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500);pg.evaluate("shOpen()");pg.wait_for_timeout(300)
    # عميل بكود ثابت
    pg.evaluate("setMode('c')");pg.click('#cNew');pg.fill('#cf_name','شركة الأمل');pg.fill('#cf_code','GIB-777');pg.fill('#cf_phone','0555');pg.click('#cf_save');pg.wait_for_timeout(200)
    cid=pg.evaluate("Object.values(CU.get())[0].id")
    # فاتورتان: واحدة باسمه، وأخرى باسم مختلف لكن بنفس الكود -> نفس العميل (الاسم الجديد يصير لقباً)
    i1=inv(pg,'شركة الأمل',None,100)
    i2=inv(pg,'Al Amal Trading','GIB-777',250)
    ok('same code, different spelling -> same customer (alias, no duplicate)',pg.evaluate("Object.keys(CU.get()).length")==1 and 'Al Amal Trading' in pg.evaluate("Object.values(CU.get())[0].aliases"))
    # فاتورة لعميل آخر ولا تدخل
    inv(pg,'عميل آخر',None,70)
    # حمولة بكتابة الكود بدل الاسم
    pg.evaluate("shOpen()");pg.wait_for_timeout(300);pg.click('#shNew');pg.wait_for_timeout(200);pg.click('#sh_cm');pg.wait_for_timeout(200)
    r=pg.locator('#cmBody tbody tr').nth(0);r.locator('[data-k=cust]').fill('GIB-777');r.locator('[data-k=cust]').press('Tab');r.locator('[data-k=goods]').fill('ملابس');r.locator('[data-k=pk]').fill('4')
    ok('consignment typed by code resolves to the customer name',r.locator('[data-k=cust]').input_value()=='شركة الأمل')
    pg.fill('#sh_fr','100');pg.evaluate("shReadHead()");pg.click('#cm_save');pg.wait_for_timeout(900)
    # وصل موزع على الفاتورة الأولى
    pg.evaluate("setMode('r');rnew()");pg.wait_for_timeout(200);pg.fill('#r_from','GIB-777');pg.press('#r_from','Tab');pg.fill('#r_amt','60')
    ok('receipt party typed by code resolves',pg.input_value('#r_from')=='شركة الأمل')
    pg.evaluate("rid('inv').value='%s'"%i1);pg.wait_for_timeout(150);pg.evaluate("rsave()");pg.wait_for_timeout(500)
    # صفحة العملاء: البحث بالكود أو الاسم + Enter يفتح الكشف
    pg.evaluate("setMode('c')");pg.wait_for_timeout(600)
    pg.fill('#cq','gib-777');pg.wait_for_timeout(200)
    ok('customers table finds by code and shows counters',pg.locator('#cList .lsC:not(.h)').count()==1 and '2' in pg.inner_text('#cList') and 'GIB-777' in pg.inner_text('#cList'))
    pg.press('#cq','Enter');pg.wait_for_timeout(900)
    t=pg.inner_text('#spaper')
    ok('Enter on a code opens that customer statement',pg.evaluate("S.mode")=='s' and 'شركة الأمل' in t and 'GIB-777' in t)
    ok('statement has both invoices (name + code match)',i1 in t and i2 in t)
    ok('other customer excluded',pg.locator('#spaper').inner_text().count('عميل آخر')==0)
    ok('statement has the receipt',any(('RC-' in l) for l in t.split()))
    ok('statement has the consignment',('SH-' in t) and 'ملابس' in t)
    # بالاسم
    pg.evaluate("setMode('c')");pg.wait_for_timeout(300);pg.fill('#cq','الأمل');pg.press('#cq','Enter');pg.wait_for_timeout(900)
    ok('Enter on a name opens the statement too',pg.evaluate("S.mode")=='s' and 'ملابس' in pg.inner_text('#spaper'))
    # حذف العميل محظور مع حمولات
    pg.evaluate("setMode('c')");pg.wait_for_timeout(300);pg.fill('#cq','');pg.evaluate("cEdit('%s')"%cid);pg.click('#cf_del');pg.click('#cf_del');pg.wait_for_timeout(300)
    ok('cannot delete customer with documents',pg.evaluate("Object.keys(CU.get()).includes('%s')"%cid))
    # كود لعميل آخر مرفوض
    pg.evaluate("cEdit('')");pg.fill('#cf_name','زيد');pg.fill('#cf_code','GIB-777');pg.click('#cf_save');pg.wait_for_timeout(200)
    ok('duplicate customer code refused',pg.evaluate("!Object.values(CU.get()).some(c=>c.name==='زيد')"))
    ok('no page errors',not errs)
    if errs:print(errs[:3])
