import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
import os
from playwright.sync_api import sync_playwright
BASE='http://localhost:8790'
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
def dev(b):
    ctx=b.new_context(viewport={'width':1300,'height':900});pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(BASE);pg.wait_for_function('typeof SRV!=="undefined"&&document.getElementById("login").style.display===""',timeout=8000);pg.wait_for_timeout(800);return pg,errs
with sync_playwright() as p:
    b=p.chromium.launch()
    A,ea=dev(b)
    ok('server detected: setup form with setup key, no manual link fields',A.is_visible('#lgKey') and not A.is_visible('#lgCloud') and A.evaluate("SRV.on&&!SRV.users"))
    A.fill('#lgName','المدير');A.fill('#lgUser','admin@portist.com');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1')
    A.fill('#lgKey','wrongkey');A.click('#lgGo');A.wait_for_timeout(1200)
    ok('A: wrong setup key refused',A.evaluate("!ME"))
    A.fill('#lgKey','k');A.click('#lgGo');A.wait_for_timeout(2000)
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
    ok('B: plain login form (email + password only)',B.is_visible('#lgUser') and B.is_visible('#lgPass') and not B.is_visible('#lgKeyL') and not B.is_visible('#lgNameL') and not B.is_visible('#lgCloud') and B.evaluate("SRV.on&&SRV.users"))
    B.fill('#lgUser','admin@portist.com');B.fill('#lgPass','wrongpass');B.click('#lgGo');B.wait_for_timeout(1200)
    ok('B: wrong password refused',B.evaluate("!ME"))
    B.fill('#lgPass','secret1');B.click('#lgGo');B.wait_for_timeout(2000)
    ok('B: signed in from another browser with email + password only',B.evaluate("!!ME&&ME.user==='admin@portist.com'&&CL.u()==='/api'"))
    B.reload();B.wait_for_timeout(1500)
    ok('B: session restored after reload',B.evaluate("!!ME"))
    B.evaluate("shOpen()");B.wait_for_timeout(1200)
    ok('B: sees the shipment created on A',B.evaluate("Object.keys(SHS.get()).includes('%s')"%code))
    # edit on B, then A sees it after reload
    B.evaluate("shEdit('%s')"%code);B.wait_for_timeout(200);B.fill('#sh_notes','from B');B.evaluate("shReadHead()");B.evaluate("shSave()");B.wait_for_timeout(900)
    A.evaluate("shOpen()");A.wait_for_timeout(1200)
    ok('A sees B edit',A.evaluate("SHS.get()['%s'].notes"%code)=='from B' and A.evaluate("SHS.get()['%s'].ver"%code)==2)
    print([ea,eb]);b.close()
