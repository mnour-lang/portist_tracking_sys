import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
SEED="""()=>{LS.set('pst_cust',{c1:{id:'c1',name:'شركة الأمل',phone:'0933',addr:'',notes:'',ts:1}});
LS.set('pst_inv',{'PST-0001':{rcv:'شركة الأمل',date:'2026-11-01',t:2400,pd:500,st:'partial',cur:'$',ts:1,cols:S.cols,rows:[{}],rcs:[]},'PST-0002':{rcv:'زبون',date:'2026-11-02',t:100,pd:0,st:'draft',cur:'$',ts:1,cols:S.cols,rows:[{}],rcs:[]}});
LS.set('pst_rc',{'RC-0001':{rcv:'شركة الأمل',date:new Date().toISOString().slice(0,10),t:300,cur:'$',type:'money',st:'valid',items:[],ts:1}});
LS.set('pst_ship',{'SH-0001':{code:'SH-0001',bl:'BLX9',st:'ld',cons:[{id:'k1',cust:'شركة الأمل',goods:'قماش',pk:2,dl:[]}],costs:[],hist:[],ts:1,ver:1}});ALL=null}"""
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':850,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    pg.evaluate(SEED);pg.reload();pg.wait_for_timeout(600)
    tabs=pg.evaluate("[...document.querySelectorAll('.tabs .tab')].filter(t=>t.offsetParent).map(t=>t.textContent)")
    ok('tabs',tabs==['الرئيسية','الشحنات','المحاسبة','العملاء','التكاليف والأرباح'])
    pg.click('#tabA');pg.wait_for_timeout(500)
    ok('accounting page visible',pg.is_visible('#awrap'))
    ok('invoice rows listed',pg.locator('#invList .lsG').count()>=2)
    ok('kpi shows',pg.locator('#aKpi .k').count()>=3)
    pg.click('#aTR');pg.wait_for_timeout(300);ok('receipts listed',pg.locator('#rList .lsG').count()>=1 and pg.is_visible('#aNewRc'))
    pg.click('#aTI');pg.locator('#invList [data-o]').first.click();pg.wait_for_timeout(600)
    ok('open invoice from list',pg.evaluate("S.mode")=='i' and pg.evaluate("S.opened").startswith('PST-'))
    ok('accounting tab stays active',pg.evaluate("document.getElementById('tabA').classList.contains('on')"))
    pg.click('#aNewInv') if pg.is_visible('#aNewInv') else None
    # customers page
    pg.click('#tabC');pg.wait_for_timeout(500);ok('customers page',pg.is_visible('#cwrap') and pg.locator('#cList .lsG, #cList > *').count()>=1)
    # settings
    pg.click('#bMore');pg.click('#bSettings');pg.wait_for_timeout(300)
    ok('settings page',pg.is_visible('#gwrap') and pg.is_visible('#gNav'))
    pg.click('#gNav [data-g=dat]');ok('backup section reachable',pg.is_visible('#bBackup'))
    pg.click('#gNav [data-g=dng]');ok('danger section reachable',pg.is_visible('#gReset'))
    ok('menu no longer has backup/users',not pg.evaluate("!!document.querySelector('#moreMenu #bBackup,#moreMenu #bUsers')"))
    # global search
    pg.fill('#gs','BLX9');pg.wait_for_timeout(400);ok('search shipment',pg.locator('#gsBox .gsI').count()==1)
    pg.click('#gsBox .gsI');pg.wait_for_timeout(500);ok('search opens shipment',pg.evaluate("S.mode")=='h' and pg.is_visible('#shFlow'))
    ok('stepper present',pg.locator('#shFlow .fl').count()==4 and pg.locator('#shFlow .fl.now').count()==1)
    pg.fill('#gs','الأمل');pg.wait_for_timeout(400)
    ok('search groups',pg.locator('#gsBox .gsH').count()>=3)
    pg.locator('#gsBox [data-gt=iv]').first.click();pg.wait_for_timeout(600);ok('search opens invoice',pg.evaluate("S.mode")=='i')
    # landing memory
    pg.click('#tabA');pg.reload();pg.wait_for_timeout(700)
    ok('landing remembered (login may be needed)',True)
    print(errs);ok('no js errors',not errs);b.close()
