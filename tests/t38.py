import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    pg.evaluate("""()=>{const inv={'PST-0001':{rcv:'A',st:'sent',t:1000,pd:0,cur:'$',date:'2026-01-02'},'PST-0002':{rcv:'A',st:'sent',t:500,pd:0,cur:'€',date:'2026-01-03'}};LS.set('pst_inv',inv);ALL={I:inv,Rc:{}};IXV++;
      const M=curMap();M['€'].on=1;M['€'].rate='1.1';curSave(M)}""")
    pg.evaluate("setMode('r');rnew()");pg.wait_for_timeout(300)
    pg.evaluate("""()=>{rid('from').value='A';rid('amt').value='600';rid('cur').value='€';rdraw()}""");pg.wait_for_timeout(400)
    rows=pg.evaluate("rAllocRows().map(x=>[x.code,x.icu])")
    ok('allocation rows include other currency invoices',len(rows)==2)
    # PST-0001 (USD) by rate 1.1: 600 EUR -> 660 USD ; nothing to PST-0002
    pg.evaluate("""()=>{R.al={'PST-0001':600};R.alx['PST-0001']={rate:'1.1',eq:''};R.alTouched=true}""")
    pg.evaluate("rsave()");pg.wait_for_timeout(700)
    d=pg.evaluate("LS.get('pst_inv',{})['PST-0001']")
    ok('USD invoice credited 660',abs(d['pd']-660)<.01 and d['st']=='partial')
    rc=pg.evaluate("Object.values(LS.get('pst_rc',{}))[0]")
    ok('receipt keeps 600 EUR and cv 660',rc['alApplied'][0]['amt']==600 and abs(rc['alApplied'][0]['cv']-660)<.01 and rc['alApplied'][0]['icu']=='$')
    ok('no unallocated credit',pg.evaluate("rcUn(Object.values(LS.get('pst_rc',{}))[0])")==0)
    # statement ledger USD shows credit of 660 and no manual payment line
    L=pg.evaluate("""()=>{const c=Object.values(CU.get())[0]||{id:cKey('A'),name:'A'};const A=ALL||{I:{},Rc:{}};ALL={I:LS.get('pst_inv',{}),Rc:LS.get('pst_rc',{})};const D=docsOf({id:cKey('A'),name:'A'},ALL);return[ledgerOf(D,'$').map(e=>[e.dr,e.cr]),ledgerOf(D,'€').map(e=>[e.dr,e.cr]),sumOf(D)]}""")
    ok('USD ledger: invoice 1000 dr, receipt 660 cr',L[0]==[[1000,0],[0,660]] or (len(L[0])==2 and L[0][1][1]==660))
    ok('EUR ledger: no EUR credit (receipt applied abroad)',sum(e[1] for e in L[1])==0 and L[1][0]==[500,0])
    ok('sumOf USD bal 340, EUR bal 500',abs(L[2]['$']['bal']-340)<.01 and abs(L[2]['€']['bal']-500)<.01)
    # edit: change rate to 1.2 -> 720
    pg.evaluate("""()=>{const no=Object.keys(LS.get('pst_rc',{}))[0];rload(LS.get('pst_rc',{})[no]);}""");pg.wait_for_timeout(500)
    pg.evaluate("""()=>{R.alx['PST-0001']={rate:'1.2',eq:''}}""");pg.evaluate("rsave()");pg.wait_for_timeout(700)
    ok('rate edit re-credits to 720',abs(pg.evaluate("LS.get('pst_inv',{})['PST-0001'].pd")-720)<.01)
    # missing rate refused
    pg.evaluate("rnew()");pg.evaluate("""()=>{rid('from').value='A';rid('amt').value='100';rid('cur').value='€';rdraw();R.al={'PST-0001':100};R.alx['PST-0001']={rate:'',eq:''};R.alTouched=true}""");pg.evaluate("rsave()");pg.wait_for_timeout(400)
    ok('missing rate refused (no new receipt)',pg.evaluate("Object.keys(LS.get('pst_rc',{})).length")==1)
    ok('no page errors',not errs)
    if errs:print(errs)
    b.close()
