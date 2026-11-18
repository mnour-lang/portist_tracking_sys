import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1000,'height':1200})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(''+APP+'');pg.wait_for_timeout(600)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(500)
    ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
    pg.evaluate("""()=>{const c=(i,n,g,pk,cbm,kg,x)=>Object.assign({id:i,cust:n,goods:g,pk:pk,cbm:cbm,kg:kg,sm:'',inv:'PST-0001',dl:[],custOk:true},x||{});
     LS.set('pst_ship',{'SH-0001':{code:'SH-0001',mode:'sea',bl:'MSK123',cont:'MSKU1234567',car:'MSC Aria',from:'Shanghai',to:'Mersin',sd:'2026-10-01',eta:'2026-11-05',freight:'5000',cur:'$',notes:'حاوية 40 قدم',st:'cu',hist:[{st:'ld',date:'2026-10-01'},{st:'tr',date:'2026-10-03'},{st:'ar',date:'2026-11-08'},{st:'cu',date:'2026-11-10'}],costs:[{type:'x',amt:'700',cur:'$'}],
      cons:[c('a','أحمد التاجر','قماش','10','5','800',{snN:'Guangzhou Textile',snP:'+86 20 1234',snA:'غوانزو',rcN:'أحمد التاجر',rcP:'+90 555 111',rcC:'دمشق',rcA:'المزة - شارع 5',nt:'هش لا يُكدَّس',dl:[{no:'DL-0001',date:'2026-11-12',pk:'4',by:'سامر',idn:'123'}]}),
            c('b','سعيد وشركاه','أحذية','6','2','300',{rcN:'سعيد',rcP:'0999',rcC:'حلب',rcA:'الفرقان'}),
            c('c','نور','لعب','3','1','50',{rcN:'نور',rcP:'0988',rcC:'دمشق ',rcA:'كفرسوسة',dl:[{no:'DL-0002',date:'2026-11-11',pk:'3',by:'نور'}]}),
            c('d','كمال','عدد','5','2','90',{})],ts:1}})}""")
    pg.evaluate("shOpen()");pg.wait_for_timeout(300)
    ok('global button removed',pg.locator('#shDist').count()==0)
    pg.click('[data-hr="SH-0001"]');pg.wait_for_timeout(400)
    t=pg.inner_text('#spaper');pg.locator('#spaper').screenshot(path='j_rep.png')
    print('cities:',pg.locator('.dst-h h3').all_inner_texts())
    ok('4 groups: دمشق حلب غير محدّدة',pg.locator('.dst-c').count()==3)
    bad=[w for w in ['$','5000','700','PST-0001','فاتورة','تكلفة','رصيد'] if w in t]
    ok('no financial '+str(bad),not bad)
    ok('missing warning lists كمال','كمال' in pg.inner_text('.ops-warn') and 'مدينة التسليم' in pg.inner_text('.ops-warn'))
    pg.evaluate("setMode('h');shEdit('SH-0001')");pg.wait_for_timeout(300);pg.click('#sh_rep');pg.wait_for_timeout(300)
    ok('editor button works','توزيع الشحنة' in pg.inner_text('#spaper'))
    print(errs);b.close()
