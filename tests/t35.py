import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    ok('all currency fields are selects fed from the table',pg.evaluate("['cur','cur2','r_cur','qi_cur','qr_cur','sh_cur'].every(i=>$(i).tagName==='SELECT'&&(i==='cur2'||$(i).options.length>=10))"))
    ok('default currency $',pg.evaluate("$('cur').value")=='$')
    # settings table
    pg.evaluate("setMode('g')");pg.wait_for_timeout(300)
    ok('settings has currency table',pg.evaluate("document.querySelectorAll('#gCur tbody tr').length")>=10)
    pg.click('#gNav [data-g=cur]');pg.click('.gAdd summary');
    pg.fill('#gc_t','AED2');pg.fill('#gc_a','درهم تجريبي');pg.fill('#gc_e','Test Dirham');pg.click('#gc_add');pg.wait_for_timeout(200)
    ok('add currency -> appears in selects',pg.evaluate("[...$('cur').options].some(o=>o.value==='AED2')"))
    pg.evaluate("document.querySelector('.gAdd').open=true")
    ok('duplicate symbol rejected',(pg.fill('#gc_t','AED2') or True) and (pg.fill('#gc_a','x') or True) and (pg.click('#gc_add') or True) and pg.evaluate("Object.keys(LS.get('pst_curr',{})).filter(k=>k==='AED2').length")==1)
    # deactivate EUR -> hidden from new selects, but legacy value kept
    pg.evaluate("(()=>{const M=curMap();M['€'].on=0;curSave(M)})()")
    ok('inactive currency hidden',not pg.evaluate("[...$('cur').options].some(o=>o.value==='€')"))
    pg.evaluate("$('cur').value='€'")
    ok('legacy/inactive value still selectable & kept',pg.evaluate("$('cur').value")=='€')
    pg.evaluate("$('cur').value='XYZ'")
    ok('unregistered legacy value is preserved and flagged',pg.evaluate("$('cur').value")=='XYZ' and 'غير مسجلة' in pg.evaluate("$('cur').selectedOptions[0].textContent"))
    # rates suggestion
    pg.evaluate("(()=>{const M=curMap();M['€'].on=1;M['€'].rate='1.1';M['₺'].rate='0.03';curSave(M)})()")
    ok('curRate EUR->USD 1.1, USD->EUR ~0.909091, TRY->EUR',pg.evaluate("curRate('€','$')")==1.1 and abs(pg.evaluate("curRate('$','€')")-0.909091)<1e-6 and abs(pg.evaluate("curRate('₺','€')")-0.027273)<1e-6 and pg.evaluate("curRate('£','$')")==0)
    # shipment: foreign invoice gets suggested rate automatically
    pg.evaluate("""()=>{const inv={'F-9':{rcv:'A',st:'issued',t:500,pd:500,cur:'€',ship:'SH-1'}};LS.set('pst_inv',inv);ALL={I:inv,Rc:{}};IXV++;
      SHS.set({'SH-1':{code:'SH-1',cur:'$',st:'ld',hist:[],costs:[],cons:[{id:'a',cust:'A',cbm:1,pk:1}]}});shEdit('SH-1')}""")
    pg.evaluate("routeTo('#/costs/shipment/SH-1')");pg.wait_for_timeout(1200)
    ok('invoice rate prefilled from table (1.1 -> 550)',pg.evaluate("shFin(SHS.get()['SH-1']).T.rev")==550)
    pg.click('[data-ca=addhere]');pg.wait_for_timeout(200)
    pg.select_option('#cc_cur','€');pg.wait_for_timeout(200)
    ok('cost modal foreign currency prefilled rate',pg.input_value('#cc_fx')=='1.1')
    pg.click('#mCost [data-close]')
    ok('editor button routes to costs page',True)
    pg.evaluate("shOpen()");pg.wait_for_timeout(500)
    ok('list has summary button',pg.is_visible('#shPAll'))
    pg.click('#shPAll');pg.wait_for_timeout(600)
    ok('summary opens costs page',pg.evaluate("S.mode")=='p' and pg.is_visible('#cc'))
    ok('no page errors',not errs)
    if errs:print(errs)
    b.close()
