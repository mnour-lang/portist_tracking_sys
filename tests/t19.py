import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1000,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(''+APP+'');pg.wait_for_timeout(600)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    pg.evaluate("""()=>{const c=(i,n,pk)=>({id:i,cust:n,goods:'x',pk:pk,cbm:'1',kg:'1',sm:'',inv:'',dl:[],custOk:true,rcC:'دمشق'});
     const sh=(code,f,t)=>({code:code,mode:'sea',bl:'B',cont:'C',car:'x',from:f,to:t,sd:'2026-10-01',eta:'2026-11-25',freight:'',cur:'$',notes:'',st:'tr',hist:[{st:'ld',date:'2026-10-01'},{st:'tr',date:'2026-10-03'}],costs:[],cons:[c('a','x','5')],ts:1});
     LS.set('pst_ship',{A:sh('A','ist','syr'),B:sh('B','إسطنبول','دمشق')})}""")
    for lang in ['ar','en']:
        pg.evaluate(f"setLang('{lang}')");pg.evaluate("shOpen()");pg.wait_for_timeout(300)
        for k in 'AB':
            pg.click(f'[data-hr="{k}"]');pg.wait_for_timeout(300)
            pg.locator('#spaper').screenshot(path=f'm_{lang}_{k}.png')
            print(lang,k,'route text:',pg.inner_text('#spaper .st-cu >> text=%s >> xpath=..'%('المسار' if lang=='ar' else 'Route')).replace('\n',' | '))
            pg.evaluate("S.shBack&&S.shBack()");pg.wait_for_timeout(200)
    print(errs);b.close()
