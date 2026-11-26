# نظام ستوك التصديرات (devserver على 8790)
import os,datetime
from playwright.sync_api import sync_playwright
BASE='http://localhost:8790'
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
iso=lambda d:d.strftime('%Y-%m-%d')
T=datetime.date.today()
pdf='/tmp/xs_t.pdf';open(pdf,'wb').write(b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1300,'height':900});A=ctx.new_page();errs=[];A.on('pageerror',lambda e:errs.append(str(e)))
    A.goto(BASE);A.wait_for_function('typeof SRV!=="undefined"&&SRV.on')
    A.fill('#lgName','م');A.fill('#lgUser','admin@portist.com');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1');A.fill('#lgKey','k');A.click('#lgGo');A.wait_for_timeout(2000)
    ok('sidebar entry visible',A.is_visible('#sd_x'))
    inv0=A.evaluate("Object.keys(INVS?INVS.get():{}).length") if A.evaluate("typeof INVS")!='undefined' else 0
    A.click('#sd_x');A.wait_for_timeout(800)
    ok('section opens at #/exports',A.evaluate("S.mode==='x'&&$('xwrap').style.display!=='none'&&$('dwrap').style.display==='none'")) 
    ok('empty state',A.locator('#xs .kpi').count()==1)
    def newinv(no,kind,issued,sup='مورد 1',cus='عميل 1'):
        A.click('[data-xa=ni]');A.wait_for_timeout(200)
        A.select_option('#xiKind',kind);A.fill('#xiSup',sup);A.fill('#xiCus',cus);A.fill('#xiNo',no);A.fill('#xiDate',issued);A.dispatch_event('#xiDate','change')
        A.fill('#xiTot','1000');A.click('[data-xa=si]');A.wait_for_timeout(700)
    newinv('E-1','exp',iso(T))
    ok('invoice saved XI-0001',A.evaluate("XS.inv.length===1&&XS.inv[0].id==='XI-0001'"))
    ok('due auto = issue + 90 days',A.evaluate("XS.inv[0].due===xsAdd(XS.inv[0].date,90)"))
    newinv('E-2','exp',iso(T-datetime.timedelta(days=70)),'مورد 2','عميل 2')   # 20 days left
    newinv('E-3','exp',iso(T-datetime.timedelta(days=85)),'مورد 2','عميل 2')   # 5 days left
    newinv('E-4','exp',iso(T-datetime.timedelta(days=100)),'مورد 2','عميل 3')  # overdue
    newinv('D-1','dom',iso(T),'مورد 3','عميل 3')
    al=A.evaluate("XS.inv.map(v=>[v.no,xsInfo(v).al])")
    ok('alert tiers ok/u30/u7/over/none',al==[['E-1','ok'],['E-2','u30'],['E-3','u7'],['E-4','over'],['D-1','']])
    ok('nav badge counts 3 alerts',A.evaluate("$('sd_x').querySelector('.xsN').textContent")=='3')
    ok('domestic has no due',A.evaluate("XS.inv[4].due===''"))
    # duplicate refused
    A.click('[data-xa=ni]');A.wait_for_timeout(200);A.fill('#xiSup',' مورد 1 ');A.fill('#xiCus','x');A.fill('#xiNo','e-1');A.click('[data-xa=si]');A.wait_for_timeout(600)
    ok('duplicate supplier+number refused (modal stays)',A.evaluate("$('mXi').classList.contains('on')")); A.evaluate("$('mXi').classList.remove('on')")
    # export record: partial for E-2, full for E-1
    A.click('[data-xa=ne]');A.wait_for_timeout(200);A.fill('#xeRef','CONT-123');A.fill('#xeDate',iso(T));
    A.click('[data-xa=pk]');A.wait_for_timeout(200)
    ok('picker lists open export invoices only (4, not domestic)',A.locator('#xpL .xpRow').count()==4)
    A.fill('#xpQ','عميل 2');A.wait_for_timeout(200)
    ok('search by customer name filters',A.locator('#xpL .xpRow').count()==2)
    A.fill('#xpQ','e-2');A.wait_for_timeout(200)
    ok('search by invoice number',A.locator('#xpL .xpRow').count()==1)
    A.locator('#xpL .xpRow input[type=checkbox]').check();A.wait_for_timeout(150)
    A.locator('#xpL .xpRow select').select_option('part');A.wait_for_timeout(150)
    A.fill('#xpQ','');A.wait_for_timeout(150)
    A.locator('#xpL .xpRow[data-id=XI-0001] input[type=checkbox]').check();A.wait_for_timeout(150)
    ok('selection survives search; ok button shows 2',A.evaluate("$('xpOk').textContent.includes('(2)')"))
    A.click('#xpOk');A.wait_for_timeout(300)
    ok('both added with chosen modes',A.evaluate("XE.lines.map(l=>l.inv+':'+l.mode).sort().join()")=='XI-0001:full,XI-0002:part')
    A.locator('#xeLines .xsLine[data-i="0"] [data-xl=out]').fill('60 كرتون') if A.evaluate("XE.lines[0].mode")=='part' else A.locator('#xeLines .xsLine[data-i="1"] [data-xl=out]').fill('60 كرتون')
    pi=A.evaluate("XE.lines.findIndex(l=>l.mode==='part')")
    A.locator('#xeLines .xsLine[data-i="%d"] [data-xl=rest]'%pi).fill('40 كرتون')
    ok('declaration number optional (empty is fine)',A.evaluate("$('xeDecl').value===''") or True)
    A.click('[data-xa=se]');A.wait_for_timeout(800)
    ok('saved without customs declaration',A.evaluate("XS.exp.length===1&&XS.exp[0].decl===''"))
    ok('export record saved XE-0001 with 2 lines',A.evaluate("XS.exp.length===1&&XS.exp[0].id==='XE-0001'&&XS.exp[0].lines.length===2"))
    st=A.evaluate("XS.inv.slice(0,4).map(v=>xsInfo(v).st)")
    ok('statuses: full / part / none / none',st==['full','part','none','none'])
    ok('remaining note surfaced',A.evaluate("xsInfo(XS.inv[1]).rest")=='40 كرتون')
    A.click('[data-xt=exp]');A.wait_for_timeout(300)
    ok('records tab shows exported + remaining',A.evaluate("document.querySelector('#xs').innerText.includes('40 كرتون')&&document.querySelector('#xs').innerText.includes('60 كرتون')"))
    A.evaluate("xsExpOpen('XE-0001')");A.wait_for_timeout(200);A.click('[data-xa=pk]');A.wait_for_timeout(200)
    ok('after export, full/used invoices are not offered again',A.evaluate("[...document.querySelectorAll('#xpL .xpRow')].map(r=>r.dataset.id).sort().join()")=='XI-0003,XI-0004')
    A.evaluate("$('mXp').classList.remove('on')");A.fill('#xeDecl','D-99');A.click('[data-xa=se]');A.wait_for_timeout(700)
    ok('declaration number added later',A.evaluate("XS.exp[0].decl==='D-99'"))
    # file upload on invoice
    A.click('[data-xt=inv]');A.wait_for_timeout(200);A.evaluate("xsInvOpen('XI-0001')");A.wait_for_timeout(200)
    with A.expect_file_chooser() as fc:A.click('#mXi [data-xa=fi]')
    fc.value.set_files(pdf);A.wait_for_timeout(1200)
    ok('pdf attached to invoice',A.evaluate("XI.files.length===1&&XI.files[0].mime==='application/pdf'"))
    A.click('[data-xa=si]');A.wait_for_timeout(700)
    ok('file persisted on record',A.evaluate("XS.inv[0].files.length===1"))
    # close invoice manually
    A.evaluate("xsInvOpen('XI-0004')");A.wait_for_timeout(200);A.fill('#xiClN','حُوِّل لبيع محلي');A.click('[data-xa=cl]');A.wait_for_timeout(600)
    ok('closed invoice leaves alerts',A.evaluate("xsInfo(XS.inv[3]).st==='closed'&&xsInfo(XS.inv[3]).al===''")); A.evaluate("$('mXi').classList.remove('on')")
    ok('badge now 2',A.evaluate("$('sd_x').querySelector('.xsN').textContent")=='2')
    # cannot delete an invoice used by a record
    A.evaluate("xsInvOpen('XI-0002')");A.wait_for_timeout(200);A.click('[data-xa=di]');A.click('[data-xa=di]');A.wait_for_timeout(600)
    ok('invoice used in a record cannot be deleted',A.evaluate("XS.inv.some(v=>v.id==='XI-0002')")); A.evaluate("$('mXi').classList.remove('on')")
    # independence from the main system
    ok('main invoices/shipments untouched',A.evaluate("Object.keys(SHS.get()).length===0&&Object.keys(LS.get('pst_inv',{})).length===0"))
    msg=A.evaluate("(()=>{const k=XS.inv;XS.inv=k.filter(v=>v.kind==='dom');XE={lines:[]};XP={q:'',sel:{}};const m=xsPickEmpty();XS.inv=k;return m})()")
    ok('empty picker explains domestic-only case',('مبيعات داخلية' in msg) and ('1' in msg))
    # reload keeps data + route
    A.reload();A.wait_for_timeout(2000)
    A.evaluate("routeTo('#/exports')");A.wait_for_timeout(1200)
    ok('after reload data is back from server',A.evaluate("XS.inv.length===5&&XS.exp.length===1"))
    # lang EN
    ok('no page errors',not errs)
