import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    pg.evaluate("""()=>{LS.set('pst_revpol','cash');ensureCust('A','');const inv={
      'PST-0001':{code:'PST-0001',rcv:'A',st:'sent',t:1000,pd:0,cur:'€',date:'2026-01-02',ship:'SH-1',rows:[],cols:[]},
      'PST-0002':{code:'PST-0002',rcv:'A',st:'sent',t:300,pd:0,cur:'€',date:'2026-01-03',ship:'SH-1',rows:[],cols:[]},
      'PST-0003':{code:'PST-0003',rcv:'A',st:'sent',t:200,pd:0,cur:'$',date:'2026-01-04',ship:'SH-1',rows:[],cols:[]}};
      LS.set('pst_inv',inv);ALL={I:inv,Rc:{}};
      SHS.set({'SH-1':{code:'SH-1',cur:'$',date:'2026-01-01',st:'ld',hist:[],costs:[{id:'k1',type:'تخليص جمركي',amt:100,cur:'$'}],cons:[{id:'c1',cust:'A',cbm:1,pk:1}],fin:{fxe:{'PST-0001':'1100','PST-0002':'330'}}}});IXV++;
      const M=curMap();M['€'].on=1;M['€'].rate='1.1';curSave(M)}""")
    def rc(cur,amt,inv,rate=None):
        pg.evaluate("setMode('r');rnew()");pg.wait_for_timeout(250)
        pg.evaluate("([c,a])=>{rid('from').value='A';rid('amt').value=a;rid('cur').value=c;rdraw()}",[cur,str(amt)]);pg.wait_for_timeout(300)
        pg.evaluate("([i,a,r])=>{R.al={[i]:a};R.alx[i]={rate:r||'',eq:''};R.alTouched=true}",[inv,amt,rate]);pg.evaluate("rsave()");pg.wait_for_timeout(700)
    # case 1: invoice in EUR paid in USD (=shipment currency): exact value
    rc('$',1050,'PST-0001','0.952381')
    I=pg.evaluate("LS.get('pst_inv',{})['PST-0001']");ok('invoice credited ~1000 EUR',abs(I['pd']-1000)<0.01)
    e=pg.evaluate("Object.values(LS.get('pst_rc',{}))[0].alApplied[0]")
    ok('allocation stores sv=1050 exact in shipment currency',e.get('sv')==1050 and e.get('scu')=='$' and not e.get('est'))
    F=pg.evaluate("(()=>{const F=shFin(SHS.get()['SH-1']);return{fx:F.T.fx,net:F.T.net,col:F.T.col,est:F.fxEst,cash:F.T.cashNet}})()")
    ok('fx = 1050 - 1100 = -50',abs(F['fx']+50)<.01)
    ok('collected booked at 1100, net = 1100-50-100 = 950',abs(F['col']-1100)<.01 and abs(F['net']-950)<.01 and not F['est'])
    # case 2: invoice in EUR paid in EUR, table rate moved to 1.2 -> estimated gain
    pg.evaluate("(()=>{const M=curMap();M['€'].rate='1.2';curSave(M)})()")
    rc('€',300,'PST-0002')
    e2=pg.evaluate("Object.values(LS.get('pst_rc',{})).map(d=>d.alApplied[0]).find(x=>x.inv==='PST-0002')")
    ok('EUR receipt on EUR invoice: sv=360 estimated',e2.get('sv')==360 and e2.get('est')==1)
    F=pg.evaluate("(()=>{const F=shFin(SHS.get()['SH-1']);return{fx:F.T.fx,est:F.fxEst,net:F.T.net}})()")
    ok('total fx = -50 + 30 = -20 flagged estimated',abs(F['fx']+20)<.01 and F['est'])
    # case 3: invoice in shipment currency paid in EUR -> no fx recorded
    pg.evaluate("(()=>{const M=curMap();M['€'].rate='1.1';curSave(M)})()")
    rc('€',100,'PST-0003','1.1')
    e3=pg.evaluate("Object.values(LS.get('pst_rc',{})).map(d=>d.alApplied[0]).find(x=>x.inv==='PST-0003')")
    ok('shipment-currency invoice: no fx entry',e3.get('sv') is None)
    F=pg.evaluate("shFin(SHS.get()['SH-1']).T.fx");ok('fx unchanged -20',abs(F+20)<.01)
    # editing without change keeps historic sv even if table moves
    pg.evaluate("(()=>{const M=curMap();M['€'].rate='1.5';curSave(M)})()")
    pg.evaluate("()=>0");pg.evaluate("(()=>{const no=Object.keys(LS.get('pst_rc',{})).find(k=>LS.get('pst_rc',{})[k].alApplied[0].inv==='PST-0002');setMode('r');rload(LS.get('pst_rc',{})[no])})()");pg.wait_for_timeout(500)
    pg.evaluate("rsave()");pg.wait_for_timeout(700)
    e2=pg.evaluate("Object.values(LS.get('pst_rc',{})).map(d=>d.alApplied[0]).find(x=>x.inv==='PST-0002')")
    ok('resave keeps recorded sv=360 (not recomputed at 1.5)',e2.get('sv')==360)
    # income statement shows the line
    pg.evaluate("routeTo('#/costs/shipment/SH-1')");pg.wait_for_timeout(700)
    ok('fx line in shipment report',pg.evaluate("shFin(SHS.get()['SH-1']),document.body.innerText.includes('فروق عملة')"))
    # void receipt entries are ignored
    pg.evaluate("(()=>{const R0=LS.get('pst_rc',{});Object.keys(R0).forEach(k=>{if(R0[k].alApplied[0].inv==='PST-0001'){R0[k].void=true;R0[k].st='void'}});LS.set('pst_rc',R0);ALL={I:LS.get('pst_inv',{}),Rc:R0}})()")
    F=pg.evaluate("shFin(SHS.get()['SH-1']).T.fx");ok('voided receipt drops its fx (+30 remains)',abs(F-30)<.01)
    ok('no page errors',not errs)
    if errs:print(errs)
