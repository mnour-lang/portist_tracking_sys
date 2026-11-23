import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    pg.evaluate("""()=>{LS.set('pst_revpol','inv');ensureCust('عميل','');
      LS.set('pst_inv',{'PST-0001':{code:'PST-0001',rcv:'عميل',date:'2026-02-01',cur:'$',t:1000,pd:600,st:'partial',ship:'SH-1',ts:1,rows:[],cols:[],offno:'F-77'}});
      SHS.set({'SH-1':{code:'SH-1',cur:'$',date:'2026-01-01',st:'ld',hist:[],costs:[],cons:[{id:'c1',cust:'عميل',cbm:1,pk:1}]}});IXV++}""")
    pg.evaluate("setMode('a');listInv()");pg.wait_for_timeout(500)
    ok('note button on issued invoice',pg.locator('[data-n="PST-0001"]').count()==1)
    pg.click('[data-n="PST-0001"]');pg.wait_for_timeout(500)
    ok('modal opens',pg.evaluate("$('mNote').classList.contains('on')"))
    pg.fill('#nt_amt','1200');pg.fill('#nt_why','x');pg.click('#nt_save');pg.wait_for_timeout(300)
    ok('credit above invoice refused',pg.evaluate("Object.keys(LS.get('pst_inv',{})).length")==1)
    pg.fill('#nt_amt','300');pg.fill('#nt_why','');pg.click('#nt_save');pg.wait_for_timeout(300)
    ok('reason required',pg.evaluate("Object.keys(LS.get('pst_inv',{})).length")==1)
    pg.fill('#nt_why','خصم متفق عليه');pg.click('#nt_save');pg.wait_for_timeout(900)
    I=pg.evaluate("LS.get('pst_inv',{})")
    n=I.get('CN-0001') or {}
    ok('CN-0001 created negative, linked, sent',n.get('t')==-300 and n.get('ref')=='PST-0001' and n.get('st')=='sent' and n.get('ship')=='SH-1' and n.get('refOff')=='F-77')
    ok('original stays partial (100 left)',I['PST-0001']['st']=='partial')
    ok('credit sheet shown',pg.evaluate("S.mode")=='s' and 'CREDIT NOTE' in pg.inner_html('#spaper'))
    pg.evaluate("S.sheetFn=null;setMode('a');listInv()");pg.wait_for_timeout(400)
    ok('list shows note row without copy button',pg.locator('[data-c="CN-0001"]').count()==0 and pg.locator('[data-o="CN-0001"]').count()==2)
    R=pg.evaluate("""async()=>{await loadAll();const c=Object.values(CU.get()).find(x=>x.name==='عميل'),d=docsOf(c,ALL),M=sumOf(d)['$'],E=ledgerOf(d,'$'),F=shFin(SHS.get()['SH-1']);
      return{bal:M.bal,E:E.map(e=>[e.code,e.dr,e.cr,e.bal]),inv:F.T.inv,col:F.T.col,rem:invRem('PST-0001',ALL.I['PST-0001'])}}""")
    ok('customer balance = 1000-300-600 = 100',R['bal']==100)
    ok('ledger shows credit line',any(e[0]=='CN-0001' and e[2]==300 and e[1]==0 for e in R['E']) and R['E'][-1][3]==100)
    ok('shipment invoiced net 700, collected 600',R['inv']==700 and R['col']==600)
    ok('invoice remaining 100',R['rem']==100)
    # second credit closes invoice
    pg.evaluate("noteOpen('PST-0001')");pg.wait_for_timeout(500)
    ok('max shown accounts for prior credit',pg.evaluate("$('nt_hint').textContent").find('700')>=0)
    pg.fill('#nt_amt','100');pg.fill('#nt_why','مرتجع');pg.click('#nt_save');pg.wait_for_timeout(900)
    I=pg.evaluate("LS.get('pst_inv',{})")
    ok('CN-0002 and original becomes paid',I.get('CN-0002',{}).get('t')==-100 and I['PST-0001']['st']=='paid')
    pg.evaluate("S.sheetFn=null;setMode('a');listInv()");pg.wait_for_timeout(300)
    # void original blocked
    pg.click('[data-v="PST-0001"]');pg.click('[data-v="PST-0001"]');pg.wait_for_timeout(500)
    ok('cannot void invoice with active notes',pg.evaluate("LS.get('pst_inv',{})['PST-0001'].st")=='paid')
    # void CN-0002 -> original partial again
    pg.click('[data-v="CN-0002"]');pg.click('[data-v="CN-0002"]');pg.wait_for_timeout(800)
    I=pg.evaluate("LS.get('pst_inv',{})")
    ok('voiding note reopens invoice',I['CN-0002']['st']=='void' and I['PST-0001']['st']=='partial')
    # debit note
    pg.evaluate("noteOpen('PST-0001')");pg.wait_for_timeout(500)
    pg.select_option('#nt_type','db');pg.fill('#nt_amt','50');pg.fill('#nt_why','رسوم إضافية');pg.click('#nt_save');pg.wait_for_timeout(900)
    I=pg.evaluate("LS.get('pst_inv',{})");d=I.get('DN-0001',{})
    ok('DN-0001 positive',d.get('t')==50 and d.get('note')=='db')
    R=pg.evaluate("""async()=>{await loadAll();const c=Object.values(CU.get()).find(x=>x.name==='عميل'),d=docsOf(c,ALL),M=sumOf(d)['$'],E=ledgerOf(d,'$');return{bal:M.bal,dn:E.find(e=>e.code==='DN-0001')}}""")
    ok('balance 100+50',R['bal']==150 and R['dn']['dr']==50)
    csv=pg.evaluate("EXP.inv(ALL).map(r=>r.join('|'))") if pg.evaluate("typeof EXP!=='undefined'") else None
    ok('no page errors',not errs)
    if errs:print(errs)
