import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    # seed: customer, invoice, receipt, shipment consignment under old name
    pg.evaluate("""()=>{const id='c1';LS.set('pst_cust',{[id]:{id:id,name:'شركة الأمل',phone:'',addr:'',notes:'',ts:1}});
      LS.set('pst_inv',{'PST-0001':{rcv:'شركة الأمل',date:'2026-01-01',t:1000,pd:0,st:'sent',cur:'$',ship:'SH-0001',ts:1}});
      LS.set('pst_rc',{'RC-0001':{rcv:'شركة الأمل',date:'2026-01-02',t:300,cur:'$',type:'money',st:'valid',items:[],ts:1}});
      LS.set('pst_ship',{'SH-0001':{code:'SH-0001',st:'ld',cons:[{id:'k1',cust:'شركة الأمل',pk:2,dl:[]}],costs:[],hist:[],ts:1}});ALL=null}""")
    pg.evaluate("loadAll()");pg.wait_for_timeout(200)
    bal=lambda:pg.evaluate("(()=>{const c=CU.get().c1;const M=sumOf(docsOf(c,ALL));return JSON.stringify([Object.values(M).map(m=>m.bal),consBal(SHS.get()['SH-0001'],SHS.get()['SH-0001'].cons[0]).n])})()")
    pg.evaluate("loadAll()");b0=bal();print(b0)
    # rename via directory form
    pg.evaluate("cOpen()");pg.wait_for_timeout(300);pg.evaluate("cEdit('c1')");pg.fill('#cf_name','الأمل للتجارة الدولية');pg.click('#cf_save');pg.wait_for_timeout(200)
    c=pg.evaluate("CU.get().c1");ok('renamed, alias kept',c['name']=='الأمل للتجارة الدولية' and c['aliases']==['شركة الأمل'])
    pg.evaluate("loadAll()");pg.wait_for_timeout(200);ok('balance unchanged after rename',bal()==b0)
    ok('old name resolves to same customer',pg.evaluate("findCust('شركه الامل').id==='c1'"))
    # new invoice under the new name counts for the same customer; consignment lookup too
    pg.evaluate("""()=>{const I=LS.get('pst_inv',{});I['PST-0002']={rcv:'الأمل للتجارة الدولية',date:'2026-01-03',t:500,pd:0,st:'sent',cur:'$',ship:'SH-0001',ts:2};LS.set('pst_inv',I);ALL=null}""")
    pg.evaluate("loadAll()");pg.wait_for_timeout(200)
    r=pg.evaluate("(()=>{const h=SHS.get()['SH-0001'];return [consBal(h,h.cons[0]).n,docsOf(CU.get().c1,ALL).inv.length]})()")
    ok('consignment (old name) sees both invoices; statement has both',r==[2,2])
    # duplicate name refused
    pg.evaluate("""()=>{const C=CU.get();C.c2={id:'c2',name:'عميل ثان',ts:1};LS.set('pst_cust',C)}""")
    pg.evaluate("cEdit('c2')");pg.fill('#cf_name','شركة الأمل');pg.click('#cf_save');pg.wait_for_timeout(200)
    ok('rename to another customer\'s old name refused',pg.evaluate("CU.get().c2.name")=='عميل ثان')
    pg.evaluate("cEdit('c2')");pg.fill('#cf_name','عميل ثان معدّل');pg.click('#cf_save');pg.wait_for_timeout(200)
    ok('ordinary rename works',pg.evaluate("CU.get().c2.name")=='عميل ثان معدّل')
    ok('ensureCust with old name does not create duplicate',pg.evaluate("(()=>{ensureCust('شركة الأمل');return Object.keys(CU.get()).length})()")==2)
    # receipt allocation list uses identity
    pg.evaluate("setMode('r')");pg.wait_for_timeout(200)
    print(errs);b.close()
