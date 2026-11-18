import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1000,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(''+APP+'');pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(400)
    pg.evaluate("""()=>{LS.set('pst_ship',{A:{code:'A',mode:'sea',bl:'',cont:'',car:'',from:'a',to:'b',sd:'',eta:'',freight:'',cur:'$',notes:'',st:'tr',hist:[],costs:[],cons:[{id:'a',cust:'x',goods:'g',pk:'5',cbm:'1',kg:'1',sm:'',inv:'',dl:[],custOk:true}],ts:1}})}""")
    pg.evaluate("shOpen()");pg.click('[data-hr="A"]');pg.wait_for_timeout(300)
    print('screen visible:',pg.is_visible('.ops-warn'))
    pg.emulate_media(media='print');print('print visible:',pg.is_visible('.ops-warn'))
    pg.emulate_media(media='screen');pg.evaluate("document.body.classList.add('cap')");print('pdf-capture visible:',pg.is_visible('.ops-warn'))
    print(errs);b.close()
