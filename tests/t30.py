import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
def mk(pg,cust,cref,code=None):
    pg.evaluate("setMode('i');newInv()");pg.wait_for_timeout(150)
    pg.fill('#rcv',cust)
    if code is not None:pg.fill('#code',code)
    if cref is not None:pg.fill('#cref',cref)
    pg.evaluate("S.rows=[{name:'شحن',ship:100}];render();calc()")
    pg.evaluate("saveInv()");pg.wait_for_timeout(300)
    if pg.is_visible('#mIssue'):pg.click('#isYes');pg.wait_for_timeout(300)
    return pg.evaluate("$('code').value")
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    c1=mk(pg,'شركة الأمل','GIB-777')
    c2=mk(pg,'شركة الأمل',None)
    inv=pg.evaluate("LS.get('pst_inv',{})")
    ok('two invoices, same customer, same customer code',c1!=c2 and len(inv)==2 and inv[c1]['cref']==inv[c2]['cref']=='GIB-777')
    ok('invoice numbers stay unique & sequential',c1=='PST-0001' and c2=='PST-0002')
    # new invoice typed with a number already taken -> next free number, no error, nothing overwritten
    c3=mk(pg,'شركة الأمل',None,code='PST-0001')
    inv=pg.evaluate("LS.get('pst_inv',{})")
    ok('taken invoice number auto-replaced by next free',c3=='PST-0003' and len(inv)==3 and inv['PST-0001']['t']==100)
    # customer code stored on the customer and auto-filled for the next invoice
    ok('customer record keeps the fixed code',pg.evaluate("Object.values(CU.get()).find(c=>c.name=='شركة الأمل').code")=='GIB-777')
    pg.evaluate("setMode('i');newInv()");pg.fill('#rcv','شركة الأمل');pg.press('#rcv','Tab');pg.wait_for_timeout(200)
    ok('picking the customer fills its code',pg.input_value('#cref')=='GIB-777')
    # renaming an OPENED invoice to an existing number is still refused
    pg.evaluate("load(LS.get('pst_inv',{})['PST-0002']);S.opened='PST-0002';setILock(false)");pg.fill('#code','PST-0001');pg.evaluate("saveInv()");pg.wait_for_timeout(300)
    if pg.is_visible('#mIssue'):pg.click('#isYes');pg.wait_for_timeout(300)
    inv=pg.evaluate("LS.get('pst_inv',{})")
    ok('rename to a taken number refused',len(inv)==3 and 'PST-0002' in inv)
    # list shows + searches by customer code
    pg.evaluate("setMode('i');document.getElementById('bList').click()");pg.wait_for_timeout(400)
    pg.fill('#q','gib-777');pg.wait_for_timeout(300)
    ok('list searchable by customer code',pg.locator('#invList .lsI:not(.h)').count()==3 and 'GIB-777' in pg.inner_text('#invList'))
    # customer form has the code field
    pg.evaluate("setMode('c')");pg.wait_for_timeout(300);pg.evaluate("cEdit('%s')"%pg.evaluate("Object.values(CU.get())[0].id"))
    ok('customer form shows code',pg.input_value('#cf_code')=='GIB-777')
    ok('no page errors',not errs)
    if errs:print(errs[:3])
