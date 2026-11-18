import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
import json,urllib.request
URL='https://script.google.com/macros/s/TEST/exec'
down={'v':False}
def route(r):
    if down['v']:
        r.abort();return
    req=urllib.request.Request('http://localhost:8787',data=r.request.post_data.encode(),method='POST')
    body=urllib.request.urlopen(req).read().decode()
    r.fulfill(status=200,body=body,content_type='application/json',headers={'access-control-allow-origin':'*'})
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
def newdev(b):
    ctx=b.new_context(viewport={'width':1300,'height':900});ctx.route('https://script.google.com/**',route);pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(''+APP+'');pg.wait_for_timeout(500);return pg,errs
def mkship(pg,cust='أحمد',pk='4'):
    pg.evaluate("shOpen()");pg.wait_for_timeout(300);pg.click('text=+ شحنة جديدة');pg.wait_for_timeout(200);pg.click('#sh_cm');pg.wait_for_timeout(200)
    r=pg.locator('#cmBody tbody tr').nth(0);r.locator('[data-k=cust]').fill(cust);r.locator('[data-k=goods]').fill('قماش');r.locator('[data-k=pk]').fill(pk)
    pg.fill('#sh_fr','400');pg.evaluate("shReadHead()");pg.click('#cm_save');pg.wait_for_timeout(600)
with sync_playwright() as p:
    b=p.chromium.launch()
    # Device A: first-run via cloud section
    A,ea=newdev(b)
    A.fill('#lgName','المدير');A.fill('#lgUser','admin');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1')
    A.click('#lgGo');A.wait_for_timeout(600)
    A.evaluate("LS.set('pst_url','%s');LS.set('pst_pw','k')"%URL)
    A.evaluate("syncUsers()");A.wait_for_timeout(800)
    mkship(A)
    code=A.evaluate("Object.keys(SHS.get())[0]")
    ok('A: shipment has ver=1 from server',A.evaluate("SHS.get()['%s'].ver"%code)==1)
    # Device B logs in through the cloud
    B,eb=newdev(b)
    B.click('#lgCloud summary');B.fill('#lgUrl',URL);B.fill('#lgCpw','k');B.fill('#lgUser','admin');B.fill('#lgPass','secret1');B.click('#lgCloudGo');B.wait_for_timeout(1200)
    ok('B: cloud login works (hash2 server-side)',B.evaluate("!!ME&&ME.user==='admin'"))
    ok('B: local copy kept hash for offline login',B.evaluate("!!ME.hash"))
    B.evaluate("shOpen()");B.wait_for_timeout(800)
    ok('B: sees shipment ver=1',B.evaluate("(SHS.get()['%s']||{}).ver"%code)==1)
    # wrong password refused
    C,ec=newdev(b)
    C.click('#lgCloud summary');C.fill('#lgUrl',URL);C.fill('#lgCpw','k');C.fill('#lgUser','admin');C.fill('#lgPass','wrongpw1');C.click('#lgCloudGo');C.wait_for_timeout(1000)
    ok('wrong password refused',C.evaluate("!ME")and 'غير صحيحة' in C.inner_text('#lgErr'))
    C.fill('#lgUser','ghost');C.click('#lgCloudGo');C.wait_for_timeout(1000)
    ok('unknown user: same generic message',('غير صحيحة' in C.inner_text('#lgErr')))
    # conflict: both edit
    for pg,name in((A,'A'),(B,'B')):
        pg.evaluate("shEdit('%s')"%code);pg.wait_for_timeout(200)
    A.fill('#sh_notes','from A');A.evaluate("shReadHead()");A.evaluate("shSave()");A.wait_for_timeout(700)
    ok('A saved ver=2',A.evaluate("SHS.get()['%s'].ver"%code)==2)
    B.fill('#sh_notes','from B');B.evaluate("shReadHead()");B.evaluate("shSave()");B.wait_for_timeout(700)
    ok('B: conflict modal shown',B.is_visible('#mConf'))
    pass
    B.click('[data-cf=srv]');B.wait_for_timeout(400)
    ok('B: loaded server copy (notes from A, ver 2)',B.input_value('#sh_notes')=='from A' and B.evaluate("SH.ver")==2)
    B.fill('#sh_notes','B after reload');B.evaluate("shReadHead()");B.evaluate("shSave()");B.wait_for_timeout(700)
    ok('B: save after reload ok ver=3',B.evaluate("SHS.get()['%s'].ver"%code)==3)
    # A stale -> overwrite with mine
    A.fill('#sh_notes','A forced');A.evaluate("shReadHead()");A.evaluate("shSave()");A.wait_for_timeout(700)
    ok('A: conflict',A.is_visible('#mConf'))
    A.click('[data-cf=mine]');A.wait_for_timeout(700)
    ok('A: forced over server ver=4',A.evaluate("SHS.get()['%s'].ver"%code)==4)
    # offline queue
    down['v']=True
    A.fill('#sh_notes','offline edit');A.evaluate("shReadHead()");A.evaluate("shSave()");A.wait_for_timeout(700)
    ok('offline: queued, badge visible',A.evaluate("Object.keys(QS.get()).length")==1 and A.is_visible('#qBadge'))
    A.fill('#sh_notes','offline edit 2');A.evaluate("shReadHead()");A.evaluate("shSave()");A.wait_for_timeout(500)
    ok('offline: still single queue entry',A.evaluate("Object.keys(QS.get()).length")==1)
    down['v']=False
    A.evaluate("qFlush(true)");A.wait_for_timeout(1000)
    ok('online: queue flushed',A.evaluate("Object.keys(QS.get()).length")==0 and not A.is_visible('#qBadge'))
    B.evaluate("shOpen()");B.wait_for_timeout(900)
    ok('B receives queued edit',B.evaluate("SHS.get()['%s'].notes"%code)=='offline edit 2')
    # lock enforced server-side: post from A, then edit consignments via tampered client
    A.evaluate("shEdit('%s')"%code);A.wait_for_timeout(200);A.click('#sh_post');A.click('#sh_post');A.wait_for_timeout(800)
    ok('A posted (server)',A.evaluate("SHS.get()['%s'].posted"%code)==True)
    A.evaluate("""()=>{SH.posted=true;SH.cons[0].pk=777;SH.cons[0].cust='HACK'}""")
    A.evaluate("api('shsave',{code:'%s',d:Object.assign({},SH,{ver:SHS.get()['%s'].ver})})"%(code,code));A.wait_for_timeout(500)
    srv=A.evaluate("api('shlist').then(j=>j.items.find(x=>x.code==='%s').d)"%code)
    ok('server ignored tampered consignment on posted shipment',srv['cons'][0]['pk']!=777 and srv['cons'][0]['cust']!='HACK')
    print([ea,eb,ec]);b.close()
