import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    ok('default arabic rtl',pg.evaluate("document.documentElement.dir")=='rtl' and 'حساب' in pg.inner_text('#lgT'))
    pg.select_option('#login .uiSel','en');pg.wait_for_function("document.documentElement.dir==='ltr'");pg.wait_for_timeout(300)
    ok('login switched to english ltr',pg.evaluate("document.documentElement.dir")=='ltr' and pg.inner_text('#lgT')=='Create admin account')
    pg.fill('#lgName','Admin');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    ok('sidebar english',pg.inner_text('#sd_h')=='Shipments' and pg.inner_text('#sd_a')=='Accounting')
    pg.evaluate("LS.set('pst_ship',{'SH-0001':{code:'SH-0001',mode:'sea',st:'ar',hist:[{st:'ld',date:'2026-10-20'}],costs:[],cons:[{id:'k1',cust:'Acme',goods:'x',pk:4,cbm:1,kg:1,dl:[],custOk:true}],ts:1,ver:1,from:'A',to:'B',eta:'2026-11-25'}})")
    pg.evaluate("shOpen()");pg.wait_for_timeout(400)
    ok('doc lang follows ui',pg.evaluate("S.lang")=='en')
    pg.evaluate("shOpsReport0&&0");
    pg.click('[data-hr]');pg.wait_for_timeout(500)
    t=pg.inner_text('#spaper');ok('status sheet english',('Route' in t or 'Shipment status' in t.replace('SHIPMENT STATUS','Shipment status')) and not any('؀'<=c<='ۿ' for c in t.replace('Acme','')))
    ok('sheet dir ltr',pg.evaluate("document.getElementById('sheet').dir")=='ltr')
    # status names via proxy follow doc language
    ok('SHN proxy',pg.evaluate("SHN.ar")=='Arrived' and pg.evaluate("plA(3,'a','b','c','d')").endswith('d'))
    # settings language card switches to turkish and persists
    pg.evaluate("setMode('g')");pg.select_option('.gUiSel','tr');pg.wait_for_function("document.documentElement.lang==='tr'");pg.wait_for_timeout(400)
    ok('turkish persisted after reload',pg.evaluate("UIL")=='tr' and pg.evaluate("document.documentElement.lang")=='tr' and pg.inner_text('#sd_h')=='Sevkiyatlar')
    # arabic doc inside an english UI keeps arabic sheet
    pg.evaluate("setLang('ar')");pg.evaluate("shOpen()");pg.wait_for_timeout(300);pg.click('[data-hr]');pg.wait_for_timeout(500)
    t=pg.inner_text('#spaper');ok('arabic doc under turkish ui',any('؀'<=c<='ۿ' for c in t) and pg.evaluate("document.getElementById('sheet').dir")=='rtl')
    ok('no errors',not errs);print(errs);b.close()
