import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1000,'height':800})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
    pg.goto(''+APP+'');pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(400)
    ok('first-run login',pg.is_visible('.bar'))
    # restart browser simulation: clear sessionStorage
    def restart():
        pg.evaluate("sessionStorage.clear()");pg.reload();pg.wait_for_timeout(500)
    restart();ok('without remember: login screen',not pg.is_visible('.bar') and pg.input_value('#lgUser')=='')
    pass
    pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.check('#lgRem');pg.click('#lgGo');pg.wait_for_timeout(400)
    ok('login w/ remember',pg.is_visible('.bar') and pg.evaluate("!!localStorage.getItem('pst_rem')"))
    ok('password NOT stored anywhere','secret1' not in pg.evaluate("JSON.stringify(Object.assign({},localStorage))+JSON.stringify(Object.assign({},sessionStorage))"))
    restart();ok('restart: still inside',pg.is_visible('.bar'))
    ok('idle timer disabled when remembered',pg.evaluate("REMEMBERED===true"))
    # logout
    pg.evaluate("logout()");pg.wait_for_timeout(300)
    ok('after logout: remember token gone, username prefilled',pg.evaluate("!localStorage.getItem('pst_rem')") and pg.input_value('#lgUser')=='admin' and pg.is_checked('#lgRem'))
    restart();ok('restart after logout: login screen',not pg.is_visible('.bar'))
    # remember again then password change invalidates
    pg.fill('#lgPass','secret1');pg.click('#lgGo');pg.wait_for_timeout(400)
    pg.evaluate("""()=>{const U=US.get(),u=U[ME.id];u.salt=newSalt();u.hash=pwHash(u.salt,'newpass9');US.set(U)}""")
    restart();ok('password changed => remembered session invalid',not pg.is_visible('.bar'))
    # expired
    pg.fill('#lgPass','newpass9');pg.click('#lgGo');pg.wait_for_timeout(400)
    pg.evaluate("""()=>{const r=LS.get('pst_rem');r.until=Date.now()-1;LS.set('pst_rem',r)}""")
    restart();ok('expired => login screen',not pg.is_visible('.bar'))
    # unchecked clears
    pg.fill('#lgPass','newpass9');pg.uncheck('#lgRem');pg.click('#lgGo');pg.wait_for_timeout(400)
    ok('unchecked clears token+username',pg.evaluate("!localStorage.getItem('pst_rem')&&!localStorage.getItem('pst_lgu')"))
    print(errs);b.close()
