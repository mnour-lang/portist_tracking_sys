import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    ok('dist 100 in 3 equal -> sums to 100.00',pg.evaluate("dist(100,[1,1,1])")==[33.34,33.33,33.33] and abs(pg.evaluate("dist(100,[1,1,1]).reduce((a,b)=>a+b,0)")-100)<1e-9)
    ok('dist weighted keeps total',abs(pg.evaluate("dist(1000.01,[3,1,1,1]).reduce((a,b)=>a+b,0)")-1000.01)<1e-9)
    ok('dist zero weights -> equal',pg.evaluate("dist(10,[0,0])")==[5,5])
    pg.evaluate("""()=>{LS.set('pst_revpol','inv');SHS.set({'S':{code:'S',cur:'$',date:'2026-01-01',st:'ld',hist:[],alloc:'cbm',costs:[{id:'a',type:'تخليص جمركي',amt:100,cur:'$'}],cons:[{id:'a',cust:'A',cbm:1,pk:1},{id:'b',cust:'B',cbm:1,pk:1},{id:'c',cust:'C',cbm:1,pk:1}]}})}""")
    F=pg.evaluate("shFin(SHS.get()['S'])")
    ok('shared cost sums exactly 100.00 across 3',abs(sum(x['shared'] for x in F['per'])-100)<1e-9 and F['T']['shared']==100)
    # aging
    pg.evaluate("""()=>{const t=shToday(),d=n=>{const x=new Date(t);x.setDate(x.getDate()-n);return x.toISOString().slice(0,10)};
      const inv={'I1':{rcv:'A',st:'sent',t:100,pd:0,cur:'$',date:d(5),due:d(-10)},'I2':{rcv:'A',st:'sent',t:200,pd:50,cur:'$',date:d(60),due:d(45)},'I3':{rcv:'B',st:'sent',t:300,pd:0,cur:'$',date:d(200),due:d(120)}};
      LS.set('pst_inv',inv);ALL={I:inv,Rc:{}};IXV++}""")
    A=pg.evaluate("dashData().age")
    ok('aging buckets',A==[['nd',100],['d30',0],['d60',150],['d90',0],['d91',300]])
    pg.evaluate("setMode('d')");pg.wait_for_timeout(600)
    ok('aging card rendered',('أعمار الديون' in pg.inner_text('#dash')))
    ok('no page errors',not errs)
    if errs:print(errs)
    b.close()
