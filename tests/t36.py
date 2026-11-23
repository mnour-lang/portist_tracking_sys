import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
SEED="""()=>{const t=new Date(),ym=k=>{const d=new Date(t.getFullYear(),t.getMonth()-k,5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-05'};
 const inv={'F-1':{rcv:'A Co',st:'sent',t:2000,pd:500,cur:'$',date:ym(3),due:'2020-01-01'},'F-2':{rcv:'B Co',st:'paid',t:1500,pd:1500,cur:'$',date:ym(2)},'F-3':{rcv:'C Co',st:'partial',t:3000,pd:1000,cur:'$',date:ym(0),ship:'SH-2'},'F-4':{rcv:'B Co',st:'draft',t:777,pd:0,cur:'$',date:ym(0)},'F-9':{rcv:'E Co',st:'sent',t:400,pd:0,cur:'€',date:ym(0)}};
 const rc={'RC-1':{rcv:'A Co',type:'money',t:500,cur:'$',date:ym(0),items:[]},'RC-2':{rcv:'C Co',type:'money',t:1000,cur:'$',date:ym(0),items:[]}};
 LS.set('pst_inv',inv);LS.set('pst_rc',rc);ALL={I:inv,Rc:rc};IXV++;
 const C=CU.get();['A Co','B Co','C Co','E Co'].forEach(n=>{const id=newCid();C[id]={id:id,name:n,aliases:[],phone:'',code:'',ts:1}});CU.set(C);
 SHS.set({'SH-2':{code:'SH-2',cur:'$',freight:500,st:'ar',eta:'2099-01-01',sd:ym(0),hist:[],costs:[{type:'تخليص جمركي',amt:200,cur:'$',pd:false}],cons:[{id:'c',cust:'C Co',cbm:2,pk:4}]},'SH-3':{code:'SH-3',cur:'$',st:'tr',eta:'2020-01-01',sd:ym(0),hist:[],costs:[],cons:[]}})}"""
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1360,'height':1100});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(800)
    ok('dashboard is the landing page',pg.evaluate("S.mode")=='d' and pg.evaluate("location.hash")=='#/dashboard' and pg.is_visible('#dash'))
    ok('empty state shows welcome',pg.evaluate("!!document.querySelector('.dWel')"))
    pg.evaluate(SEED);pg.evaluate("setMode('h')");pg.evaluate("setMode('d')");pg.wait_for_timeout(700)
    D=pg.evaluate("(()=>{const D=dashData();return {cu:D.cu,rev:D.rev,col:D.col,recv:D.recv,odAmt:D.odAmt,odN:D.odN,net:D.net,pay:D.pay,late:D.late,active:D.shActive,curs:D.curs}})()")
    ok('default currency = most used ($)',D['cu']=='$' and D['curs']==['$','€'])
    ok('revenue this month = 3000 (draft excluded)',D['rev']==3000)
    ok('collected this month = 1500',D['col']==1500)
    ok('receivable follows statement logic: A 2000-500-500 + C 3000-1000-1000 = 2000',D['recv']==2000)
    ok('overdue capped by customer balance: A 1000, 1 invoice',D['odAmt']==1000 and D['odN']==1)
    ok('shipment profit: 3000 - (500+200) = 2300',D['net']==2300)
    ok('payables 200 (manual unpaid costs)',D['pay']==200)
    ok('active shipments 2, 1 late',D['active']==2 and D['late']==1)
    ok('chart + pipeline + lists rendered',pg.evaluate("!!document.querySelector('#dash svg')&&document.querySelectorAll('#dash .dK').length>=5&&document.querySelectorAll('#dash [data-st]').length==5"))
    pg.click('#dash [data-dc="€"]');pg.wait_for_timeout(200)
    ok('currency chip switches to EUR (rev 400)',pg.evaluate("dashData().rev")==400)
    pg.click('#dash [data-dc="$"]');pg.click('#dash [data-dp="a"]');pg.wait_for_timeout(200)
    ok('period all-time revenue 6500',pg.evaluate("dashData().rev")==6500)
    pg.click('#dash [data-st="tr"]');pg.wait_for_timeout(500)
    ok('pipeline click filters shipments list',pg.evaluate("S.mode")=='h' and pg.evaluate("$('shfs').value")=='tr')
    pg.evaluate("setMode('d')");pg.wait_for_timeout(500)
    pg.click('#dash [data-cs]');pg.wait_for_timeout(700)
    ok('debtor click opens customer statement',pg.evaluate("S.mode")=='s')
    pg.go_back();pg.wait_for_timeout(600)
    pg.evaluate("routeTo('#/dashboard')");pg.wait_for_timeout(400)
    ok('deep link #/dashboard',pg.evaluate("S.mode")=='d')
    # permissions: ops-only user sees no financial cards
    pg.evaluate("ME.admin=false;ME.perms=['ship'];dashDraw()");pg.wait_for_timeout(200)
    ok('ops-only user: no revenue/profit/payables cards',pg.evaluate("document.querySelector('#dash [data-go=acc]')===null&&document.querySelector('#dash [data-go=profit]')===null")and pg.evaluate("!!document.querySelector('#dash [data-go=ship]')"))
    ok('no page errors',not errs)
    if errs:print(errs)
    b.close()
