# ستوك التصديرات داخل النسخة الاحتياطية (devserver على 8790)
import json,datetime
from playwright.sync_api import sync_playwright
BASE='http://localhost:8790'
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
T=datetime.date.today().strftime('%Y-%m-%d')
pdf='/tmp/xs_b.pdf';open(pdf,'wb').write(b'%PDF-1.4\nbackup test\n%%EOF')
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1300,'height':900},accept_downloads=True);A=ctx.new_page();errs=[];A.on('pageerror',lambda e:errs.append(str(e)))
    A.goto(BASE);A.wait_for_function('typeof SRV!=="undefined"&&SRV.on')
    A.fill('#lgName','م');A.fill('#lgUser','admin@portist.com');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1');A.fill('#lgKey','k');A.click('#lgGo');A.wait_for_timeout(2000)
    A.click('#sd_x');A.wait_for_timeout(600)
    for no,k in [('B-1','exp'),('B-2','dom')]:
        A.click('[data-xa=ni]');A.select_option('#xiKind',k);A.fill('#xiSup','مورد');A.fill('#xiCus','عميل');A.fill('#xiNo',no);A.fill('#xiDate',T);A.dispatch_event('#xiDate','change');A.fill('#xiTot','500')
        if no=='B-1':
            with A.expect_file_chooser() as fc:A.click('#mXi [data-xa=fi]')
            fc.value.set_files(pdf);A.wait_for_timeout(1000)
        A.click('[data-xa=si]');A.wait_for_timeout(700)
    A.click('[data-xa=ne]');A.fill('#xeRef','CONT-B');A.click('[data-xa=pk]');A.wait_for_timeout(200)
    A.locator('#xpL .xpRow[data-id=XI-0001] input[type=checkbox]').check();A.click('#xpOk');A.wait_for_timeout(200)
    with A.expect_file_chooser() as fc:A.click('#mXe [data-xa=fe]')
    fc.value.set_files(pdf);A.wait_for_timeout(1000)
    A.click('[data-xa=se]');A.wait_for_timeout(800);A.evaluate("$('mXe').classList.remove('on')")
    ok('seed: 2 invoices, 1 record, 2 files',A.evaluate("XS.inv.length===2&&XS.exp.length===1&&XS.inv[0].files.length+XS.exp[0].files.length===2"))
    # export backup
    with A.expect_download() as dl:A.evaluate("bkExport()")
    path=dl.value.path();o=json.load(open(path))
    ok('backup file contains xs section',('xs' in o) and len(o['xs']['inv'])==2 and len(o['xs']['exp'])==1)
    ok('backup carries the attached files (base64)',len(o['xs']['files'])==2 and all(f['d'] for f in o['xs']['files']))
    ok('backup still has the main data keys',isinstance(o['data'],dict))
    # damage server data then restore with MERGE
    A.evaluate("api('xsdel',{k:'exp',id:'XE-0001'})");A.wait_for_timeout(400)
    A.evaluate("api('xssave',{k:'inv',d:{no:'NEW-1',supplier:'s',customer:'c',kind:'dom',date:'%s',cur:'USD',total:1}})"%T);A.wait_for_timeout(500)
    A.evaluate("$('mBackup').classList.add('on')");A.set_input_files('#bkFile',path);A.wait_for_timeout(500)
    ok('import preview mentions xs counts',A.evaluate("$('bkStats').innerText.includes('2')&&$('bkStats').innerText.includes('ستوك')"))
    A.click('#bkMerge');A.wait_for_timeout(2500)
    j=A.evaluate("api('xslist')")
    ok('merge restored the deleted record',any(e['id']=='XE-0001' for e in j['exp']))
    ok('merge kept data added after the backup',any(v['no']=='NEW-1' for v in j['inv']))
    ok('merge restored the record file',A.evaluate("(async()=>{const r=(await api('xslist')).exp[0];const g=await api('xsfget',{id:r.files[0].id});return g.d.length>10})()"))
    # REPLACE: data added after backup disappears
    A.evaluate("$('mBackup').classList.add('on')");A.set_input_files('#bkFile',path);A.wait_for_timeout(500)
    A.click('#bkReplace');A.click('#bkReplace');A.wait_for_timeout(4000)
    A.wait_for_function('typeof SRV!=="undefined"&&SRV.on',timeout=15000);A.wait_for_timeout(1500)
    if A.evaluate("!ME"):
        A.fill('#lgUser','admin@portist.com');A.fill('#lgPass','secret1');A.click('#lgGo');A.wait_for_timeout(2000)
    j=A.evaluate("api('xslist')")
    ok('replace: back to exactly the backup content',len(j['inv'])==2 and len(j['exp'])==1 and not any(v['no']=='NEW-1' for v in j['inv']))
    ok('replace: files intact',A.evaluate("(async()=>{const l=await api('xslist');const f=l.inv[0].files[0]||l.exp[0].files[0];return (await api('xsfget',{id:f.id})).d.length>10})()"))
    # an OLD backup without xs must not touch xs data
    old={'app':'portist','v':1,'at':'2020-01-01T00:00:00','data':{}}
    json.dump(old,open('/tmp/old_bk.json','w'))
    A.evaluate("$('mBackup').classList.add('on')");A.set_input_files('#bkFile','/tmp/old_bk.json');A.wait_for_timeout(400)
    A.click('#bkReplace');A.click('#bkReplace');A.wait_for_timeout(4000)
    A.wait_for_function('typeof SRV!=="undefined"&&SRV.on',timeout=15000)
    if A.evaluate("!ME"):
        A.fill('#lgUser','admin@portist.com');A.fill('#lgPass','secret1');A.click('#lgGo');A.wait_for_timeout(2000)
    j=A.evaluate("api('xslist')")
    ok('old backup without xs leaves xs untouched',len(j['inv'])==2 and len(j['exp'])==1)
    ok('no page errors',not errs)
