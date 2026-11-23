import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    # فاتورة 2000 مدفوع منها 500؛ تكلفة خدمة 400 + رسوم نيابة 300 أُعيدت فوترتها بـ 350
    pg.evaluate("""()=>{const inv={'F-1':{rcv:'A',st:'issued',t:2000,pd:500,cur:'$',ship:'SH-1',date:'2026-01-02'}};LS.set('pst_inv',inv);ALL={I:inv,Rc:{}};IXV++;
      SHS.set({'SH-1':{code:'SH-1',cur:'$',date:'2026-01-01',st:'ld',hist:[],
        costs:[{id:'a',type:'تخليص جمركي',amt:400,cur:'$',pd:true},{id:'b',type:'رسوم وضرائب',amt:300,cur:'$',rb:true,rba:'350'}],
        cons:[{id:'c1',cust:'A',cbm:1,pk:1}]}})}""")
    ok('default policy is cash',pg.evaluate("revPol()")=='cash')
    F=pg.evaluate("shFin(SHS.get()['SH-1'])");T=F['T']
    ok('cash: recognized revenue = collected 500; invoiced 2000',T['rev']==500 and T['inv']==2000 and T['col']==500)
    ok('realized net = 500-700 = -200; expected = 2000-700 = 1300',T['net']==-200 and T['netE']==1300)
    ok('pass-through 350 recognized proportionally (25%) = 87.5; service revenue 412.5',T['pt']==350 and T['ptR']==87.5 and T['svc']==412.5)
    ok('outstanding uses invoiced',T['out']==1500)
    pg.evaluate("LS.set('pst_revpol','inv')")
    F=pg.evaluate("shFin(SHS.get()['SH-1'])");T=F['T']
    ok('inv policy: revenue 2000 net 1300; service revenue 1650; margin 78.8%',T['rev']==2000 and T['net']==1300 and T['svc']==1650 and abs(T['mg']-78.8)<.1)
    # واجهة: إضافة تكلفة نيابة
    pg.evaluate("LS.set('pst_revpol','cash');routeTo('#/costs/shipment/SH-1')");pg.wait_for_timeout(900)
    ok('detail shows realized and expected KPIs',('الربح المُحقَّق' in pg.inner_text('#cc')) and ('الربح المتوقع' in pg.inner_text('#cc')))
    pg.click('[data-ca=addhere]');pg.wait_for_timeout(200)
    ok('rebill amount hidden until switch',not pg.is_visible('#cc_rba'))
    pg.fill('#cc_amt','100');pg.click('#cc_rb+i');pg.fill('#cc_rba','120');pg.click('#cc_save');pg.wait_for_timeout(700)
    c=pg.evaluate("SHS.get()['SH-1'].costs[2]")
    ok('saved rb + rba',c.get('rb') is True and c.get('rba')=='120')
    ok('row tag shown',('نيابة عن العميل' in pg.inner_text('#cc')))
    # الإعدادات
    pg.evaluate("routeTo('#/settings')");pg.wait_for_timeout(500);pg.select_option('#gRev','inv');pg.wait_for_timeout(200)
    ok('settings switch persists policy',pg.evaluate("revPol()")=='inv')
    ok('no page errors',not errs)
    if errs:print(errs)
    b.close()
