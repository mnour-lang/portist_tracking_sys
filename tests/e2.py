import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'e1.py')).read().split("with sync_playwright()")[0])
with sync_playwright() as p:
    b=p.chromium.launch()
    A,ea=newdev(b)
    A.fill('#lgName','المدير');A.fill('#lgUser','admin');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1');A.click('#lgGo');A.wait_for_timeout(500)
    A.evaluate("LS.set('pst_url','%s');LS.set('pst_pw','k')"%URL);A.evaluate("syncUsers()");A.wait_for_timeout(600)
    B,eb=newdev(b)
    B.click('#lgCloud summary');B.fill('#lgUrl',URL);B.fill('#lgCpw','k');B.fill('#lgUser','admin');B.fill('#lgPass','secret1');B.click('#lgCloudGo');B.wait_for_timeout(1000)
    mkship(A)  # SH-0003 or next on server
    first=A.evaluate("Object.keys(SHS.get())[0]")
    down['v']=True;B.evaluate("shOpen()");B.wait_for_timeout(500);down['v']=False   # B stays unaware
    B.evaluate("shNew()");B.wait_for_timeout(100)
    code0=B.evaluate("SH.code");ok('B proposes the already-used code %s'%code0,code0==first)
    B.click('#sh_cm');B.wait_for_timeout(200);r=B.locator('#cmBody tbody tr').nth(0);r.locator('[data-k=cust]').fill('عميل');r.locator('[data-k=pk]').fill('1');B.click('#cm_save');B.wait_for_timeout(900)
    codes=sorted(B.evaluate("Object.keys(SHS.get())"));ok('collision => renumbered %s'%codes,B.evaluate("SH.code")!=first)
    srv=B.evaluate("api('shlist').then(j=>j.items.map(x=>x.code+':'+x.d.cons[0].cust))");print(srv)
    ok('server has both, first not overwritten',len(srv)==2 and any(x.startswith(first+':أحمد') for x in srv))
    print([ea,eb]);b.close()
