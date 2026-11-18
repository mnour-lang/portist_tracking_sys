import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
import os
from playwright.sync_api import sync_playwright
BASE='http://localhost:8790'
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
def dev(b):
    ctx=b.new_context(viewport={'width':1300,'height':900});pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(BASE);pg.wait_for_timeout(700);return pg,errs
with sync_playwright() as p:
    b=p.chromium.launch()
    A,ea=dev(b)
    ok('probe: server URL auto-filled as /api',A.input_value('#lgUrl')=='/api')
    A.fill('#lgName','المدير');A.fill('#lgUser','admin');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1')
    A.fill('#lgCpw','k');A.click('#lgGo');A.wait_for_timeout(1500)
    ok('A: signed in and linked to server',A.evaluate("!!ME&&CL.u()==='/api'"))
    A.evaluate("shOpen()");A.wait_for_timeout(300);A.click('text=+ شحنة جديدة');A.wait_for_timeout(200);A.click('#sh_cm');A.wait_for_timeout(200)
    r=A.locator('#cmBody tbody tr').nth(0);r.locator('[data-k=cust]').fill('أحمد');r.locator('[data-k=goods]').fill('قماش');r.locator('[data-k=pk]').fill('4')
    A.fill('#sh_fr','400');A.evaluate("shReadHead()");A.click('#cm_save');A.wait_for_timeout(1200)
    code=A.evaluate("Object.keys(SHS.get())[0]")
    ok('A: shipment saved to Postgres (ver=1)',A.evaluate("SHS.get()['%s'].ver"%code)==1)
    # invoice save to server
    A.evaluate("setMode('i')");A.wait_for_timeout(300)
    A.fill('#rcv','أحمد');A.evaluate("$('code').value='PST-0001'")
    A.evaluate("S.rows=[{name:'قماش',qty:1,price:100}];if(typeof render==='function')render()")
    # B: second device
    B,eb=dev(b)
    ok('B: server has users => cloud section opened with hint',B.evaluate("document.getElementById('lgCloud').open")==True and 'يوجد حساب على الخادم' in B.inner_text('#lgErr'))
    B.fill('#lgCpw','wrong');B.fill('#lgUser','admin');B.fill('#lgPass','secret1');B.click('#lgCloudGo');B.wait_for_timeout(1000)
    ok('B: wrong link password refused',B.evaluate("!ME"))
    B.fill('#lgCpw','k');B.click('#lgCloudGo');B.wait_for_timeout(1500)
    ok('B: signed in from another browser',B.evaluate("!!ME&&ME.user==='admin'"))
    B.evaluate("shOpen()");B.wait_for_timeout(1200)
    ok('B: sees the shipment created on A',B.evaluate("Object.keys(SHS.get()).includes('%s')"%code))
    # edit on B, then A sees it after reload
    B.evaluate("shEdit('%s')"%code);B.wait_for_timeout(200);B.fill('#sh_notes','from B');B.evaluate("shReadHead()");B.evaluate("shSave()");B.wait_for_timeout(900)
    A.evaluate("shOpen()");A.wait_for_timeout(1200)
    ok('A sees B edit',A.evaluate("SHS.get()['%s'].notes"%code)=='from B' and A.evaluate("SHS.get()['%s'].ver"%code)==2)
    print([ea,eb]);b.close()
