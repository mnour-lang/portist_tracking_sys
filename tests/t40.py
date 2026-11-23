import os,csv,io;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
def rows(dl):
    t=open(dl.path(),encoding='utf-8-sig').read();return list(csv.reader(io.StringIO(t)))
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1300,'height':900});pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    # حقل رقم الفاتورة الرسمية
    pg.evaluate("setMode('i');newInv()");pg.wait_for_timeout(300)
    ok('official number field present',pg.is_visible('#offno'))
    pg.fill('#offno','EA-2026-000123')
    ok('snap carries offno',pg.evaluate("snap().offno")=='EA-2026-000123')
    pg.evaluate("""()=>{const inv={'PST-0001':{rcv:'A',st:'partial',t:1000,pd:660,cur:'$',date:'2026-01-02',offno:'EA-1',ship:'SH-1'},'PST-0002':{rcv:'A',st:'draft',t:50,pd:0,cur:'$',date:'2026-01-05'}};LS.set('pst_inv',inv);
      const rc={'RC-0001':{code:'RC-0001',rcv:'A',from:'A',type:'money',method:'cash',t:600,cur:'€',date:'2026-01-04',st:'valid',alApplied:[{inv:'PST-0001',amt:600,icu:'$',cv:660,rate:'1.1'}],items:[{}]}};LS.set('pst_rc',rc);ALL={I:inv,Rc:rc};IXV++;
      const C=CU.get();C['a']={id:cKey('A'),name:'A',code:'C1'};CU.set(C)}""")
    pg.evaluate("setClean('i',true);routeTo('#/settings')");pg.wait_for_timeout(500);pg.click('#gNav [data-g=acx]')
    ok('export card in nav',pg.evaluate("[...document.querySelectorAll('#gNav button')].some(b=>b.textContent.includes('المحاسب'))"))
    with pg.expect_download() as d: pg.click('[data-acx=inv]')
    r=rows(d.value);ok('invoices csv: header+2 rows, official no and balance',len(r)==3 and r[1][1]=='EA-1' and r[1][10]=='340.0' or r[1][10]=='340')
    ok('draft balance 0',r[2][10] in('0','0.0'))
    with pg.expect_download() as d: pg.click('[data-acx=rc]')
    r=rows(d.value);ok('receipts csv shows cross-currency application',len(r)==2 and '600' in r[1][8] and '660' in r[1][8] and r[1][5]=='€')
    with pg.expect_download() as d: pg.click('[data-acx=bal]')
    r=rows(d.value);ok('balances csv per currency',len(r)>=2 and r[1][2]=='$' and r[1][6] in('340','340.0'))
    pg.fill('#acx_from','2026-01-05')
    with pg.expect_download() as d: pg.click('[data-acx=inv]')
    ok('date filter applies',len(rows(d.value))==2)
    ok('no page errors',not errs)
    if errs:print(errs)
    b.close()
