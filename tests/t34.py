import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    # شحنة: أجرة 1000 (CBM 3 و1)، تكلفة مشتركة 400، تكلفة مباشرة 100 على B
    pg.evaluate("""()=>{
      const inv={'F-1':{rcv:'A',st:'issued',t:2000,pd:500,cur:'$',ship:'SH-1',date:'2026-01-02'},'F-2':{rcv:'B',st:'issued',t:600,pd:600,cur:'$',ship:'SH-1',date:'2026-01-02'},'F-3':{rcv:'B',st:'draft',t:999,pd:0,cur:'$',ship:'SH-1',date:'2026-01-02'}};
      LS.set('pst_inv',inv);ALL={I:inv,Rc:{}};IXV++;
      SHS.set({'SH-1':{code:'SH-1',freight:1000,cur:'$',date:'2026-01-01',st:'ld',hist:[],alloc:'cbm',
        costs:[{type:'تخليص جمركي',amt:400,cur:'$',pd:true},{type:'نقل داخلي',amt:100,cur:'$',cid:'b',pd:false}],
        cons:[{id:'a',cust:'A',cbm:3,pk:5},{id:'b',cust:'B',cbm:1,pk:1}]}})}""")
    F=pg.evaluate("shFin(SHS.get()['SH-1'])")
    T=F['T'];A,B=F['per']
    ok('revenue excludes draft',T['rev']==2600)
    ok('collected',T['col']==1100)
    ok('auto freight counted once (1000)+400+100',T['cost']==1500 and F['autoFr'])
    ok('A: freight 750 + shared 300 = 1050; profit 950',A['direct']==750 and A['shared']==300 and A['net']==950)
    ok('B: freight 250 + direct 100 + shared 100 = 450; profit 150',B['direct']==350 and B['shared']==100 and B['net']==150)
    ok('net 1100, cash net 1100-400=700',T['net']==1100 and T['cashNet']==700 and T['unpaid']==1100)
    pg.evaluate("(()=>{const D=SHS.get();D['SH-1'].alloc='eq';SHS.set(D)})()")
    F2=pg.evaluate("shFin(SHS.get()['SH-1'])");ok('equal basis: shared 200 each',F2['per'][0]['shared']==200 and F2['per'][1]['shared']==200)
    pg.evaluate("(()=>{const D=SHS.get();D['SH-1'].costs.push({type:'أجرة الشحن الدولي',amt:900,cur:'$'});SHS.set(D)})()")
    F3=pg.evaluate("shFin(SHS.get()['SH-1'])");ok('manual freight line overrides auto field',not F3['autoFr'] and F3['T']['cost']==1400)
    # عملات: تكلفة EUR 100 بسعر 1.1، فاتورة EUR 500 (مدفوعة 500) على A
    pg.evaluate("""()=>{const inv=LS.get('pst_inv',{});inv['F-9']={rcv:'A',st:'issued',t:500,pd:500,cur:'EUR',ship:'SH-1',date:'2026-01-03'};LS.set('pst_inv',inv);ALL={I:inv,Rc:{}};IXV++;
      const D=SHS.get();D['SH-1'].alloc='cbm';D['SH-1'].costs=[{type:'تخليص جمركي',amt:400,cur:'$',pd:true},{type:'نقل داخلي',amt:100,cur:'$',cid:'b'},{type:'تخزين',amt:100,cur:'EUR'}];SHS.set(D)}""")
    G=pg.evaluate("shFin(SHS.get()['SH-1'])")
    ok('no rate: foreign invoice+cost excluded and flagged',G['T']['rev']==2600 and G['T']['cost']==1500 and 'EUR' in G['other'])
    pg.evaluate("(()=>{const D=SHS.get();D['SH-1'].fxi={'F-9':'1.1'};D['SH-1'].costs[2].fx='1.1';SHS.set(D)})()")
    G=pg.evaluate("shFin(SHS.get()['SH-1'])")
    ok('with rates: invoice 550 added, cost 110 added, nothing flagged',G['T']['rev']==3150 and G['T']['col']==1650 and G['T']['cost']==1610 and not G['other'])
    ok('converted cost line keeps original',any(l.get('orig')==100 and l.get('rate')==1.1 for l in G['lines']))
    # الطريقة الثانية: المعادل مباشرة بدل السعر
    pg.evaluate("(()=>{const D=SHS.get();delete D['SH-1'].fxi;D['SH-1'].fxe={'F-9':'520'};D['SH-1'].costs[2].fx='';D['SH-1'].costs[2].eq='105';SHS.set(D)})()")
    G=pg.evaluate("shFin(SHS.get()['SH-1'])")
    ok('equivalent method: invoice 520, cost 105',G['T']['rev']==3120 and G['T']['cost']==1605 and not G['other'])
    ok('equivalent method derives rate',any(abs(l.get('rate',0)-1.05)<1e-6 for l in G['lines']))
    # UI: صفحة التكاليف المستقلة
    pg.evaluate("routeTo('#/costs/shipment/SH-1')");pg.wait_for_timeout(1000)
    ok('independent page shown',pg.evaluate("S.mode")=='p' and pg.is_visible('#cc'))
    ok('alloc select + report button',pg.is_visible('#cc select[data-alloc]') and pg.is_visible('#cc [data-ca=rep]'))
    ok('cost rows listed with 3 lines',pg.evaluate("document.querySelectorAll('#cc tr[data-lid]').length")==3)
    # إضافة تكلفة عبر النافذة
    pg.click('[data-ca=addhere]');pg.wait_for_timeout(200)
    pg.fill('#cc_amt','50');pg.fill('#cc_sup','مورد س');pg.select_option('#cc_cid','b')
    pg.click('#cc_save');pg.wait_for_timeout(700)
    ok('cost added via modal',pg.evaluate("SHS.get()['SH-1'].costs.length")==4 and pg.evaluate("SHS.get()['SH-1'].costs[3].cid")=='b')
    # دفع
    pg.evaluate("document.querySelectorAll('#cc tr[data-lid] [data-cpd]')[1].click()");pg.wait_for_timeout(600)
    ok('mark paid persisted',pg.evaluate("SHS.get()['SH-1'].costs.filter(c=>c.pd).length==2"))
    pg.select_option('#cc select[data-alloc]','pk');pg.wait_for_timeout(600)
    ok('alloc stored in fin',pg.evaluate("SHS.get()['SH-1'].fin.alloc")=='pk')
    pg.click('#cc [data-ca=rep]');pg.wait_for_timeout(700)
    t=pg.inner_text('#spaper')
    ok('report has income statement + cash + per-consignment',('قائمة الدخل' in t) and ('الوضع النقدي' in t) and ('ربحية الحمولات' in t))
    pg.evaluate("document.querySelector('#shSheet [data-close],#spaper')&&0")
    # تبويبات: السجل والموردون
    pg.evaluate("routeTo('#/costs/ledger')");pg.wait_for_timeout(700)
    ok('ledger shows rows',pg.evaluate("document.querySelectorAll('#cc tr[data-lid]').length")>=4)
    pg.evaluate("routeTo('#/costs/suppliers')");pg.wait_for_timeout(700)
    ok('suppliers tab lists supplier',('مورد س' in pg.inner_text('#cc')))
    pg.evaluate("routeTo('#/costs')");pg.wait_for_timeout(700)
    ok('profit list shows SH-1',('SH-1' in pg.inner_text('#cc')))
    ok('no page errors',not errs)
    if errs:print(errs)
    b.close()
