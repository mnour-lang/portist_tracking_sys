import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1000,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(''+APP+'');pg.wait_for_timeout(600)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    pg.evaluate("""()=>{const c=(i,n,pk,dl)=>({id:i,cust:n,goods:'x',pk:pk,cbm:'1',kg:'1',sm:'',inv:'',dl:dl||[],custOk:true,rcC:'دمشق'});
     const sh=(code,st,hist,cons)=>({code:code,mode:'sea',bl:'B',cont:'C',car:'x',from:'Shanghai',to:'Mersin',sd:'2026-10-01',eta:'2026-11-25',freight:'',cur:'$',notes:'',st:st,hist:hist,costs:[],cons:cons,ts:1});
     LS.set('pst_ship',{
      A:sh('A','tr',[{st:'ld',date:'2026-10-01'},{st:'tr',date:'2026-10-03'}],[c('a','x','5')]),
      B:sh('B','cu',[{st:'ld',date:'2026-10-01'},{st:'tr',date:'2026-10-03'},{st:'ar',date:'2026-11-08'},{st:'cu',date:'2026-11-10'}],[c('a','x','5',[{no:'D1',date:'2026-11-12',pk:'2',by:'q'}])]),
      C:sh('C','cu',[{st:'ld',date:'2026-10-01'},{st:'tr',date:'2026-10-03'},{st:'ar',date:'2026-11-08'},{st:'cu',date:'2026-11-10'},{st:'dn',date:'2026-11-14'}],[c('a','x','5',[{no:'D1',date:'2026-11-14',pk:'5',by:'q'}])])})}""")
    for k in 'ABC':
        pg.evaluate("shOpen()");pg.wait_for_timeout(200);pg.click(f'[data-hr="{k}"]');pg.wait_for_timeout(300)
        pg.locator('.tl').screenshot(path=f'k_{k}.png')
    print(errs);b.close()
