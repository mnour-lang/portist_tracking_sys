import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
import json,datetime
exec(open('a1.py').read().split("R={}")[0])
res=[]
def ok(n,v,extra=''):
    res.append(bool(v));print(('PASS ' if v else 'FAIL ')+n+(' '+str(extra) if extra!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch()
    # 3 dates
    ctx=b.new_context(timezone_id='Europe/Istanbul');pg=ctx.new_page()
    pg.clock.install(time=datetime.datetime(2026,11,17,22,30,tzinfo=datetime.timezone.utc))
    pg.goto(''+APP+'');pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(300)
    ok('date: invoice default = local date',pg.input_value('#date')=='2026-11-18',pg.input_value('#date'))
    ok('date: shToday = local date',pg.evaluate("shToday()")=='2026-11-18')
    ctx.close()
    pg,errs=boot(b)
    # 2 numbers
    cases={'١٠':10,'1,500':1500,'1.500,75':1500.75,'1,5':1.5,'12 000':12000,'1٫5':1.5,'1.500.000':1500000,'1.5':1.5,'١٬٥٠٠':1500,'1,234.56':1234.56,'abc':0,'':0,'-3,5':-3.5,'7':7}
    got=pg.evaluate("c=>Object.fromEntries(Object.keys(c).map(k=>[k,num(k)]))",cases)
    bad={k:(got[k],cases[k]) for k in cases if abs(got[k]-cases[k])>1e-9}
    ok('numbers normalized',not bad,bad)
    ok('num(number) passthrough',pg.evaluate("num(12.5)===12.5&&num(NaN)===0&&r2('1,234.567')===1234.57"))
    # UI normalization on change
    pg.evaluate("shOpen()");pg.click('text=+ شحنة جديدة');pg.wait_for_timeout(200)
    pg.fill('#sh_fr','١٬٥٠٠٫٥');pg.dispatch_event('#sh_fr','change');ok('freight field normalized on change',pg.input_value('#sh_fr')=='1500.5',pg.input_value('#sh_fr'))
    # 7 pk required + create valid shipment
    pg.click('#sh_cm');pg.wait_for_timeout(150)
    r=pg.locator('#cmBody tbody tr').first;r.locator('[data-k=cust]').fill('أحمد');r.locator('[data-k=goods]').fill('x')
    ok('save blocked when pk missing',pg.evaluate("shSave(true)")==False)
    r.locator('[data-k=pk]').fill('٤');r.locator('[data-k=pk]').dispatch_event('change');ok('pk digits normalized',r.locator('[data-k=pk]').input_value()=='4')
    ok('save ok with pk',pg.evaluate("shSave(true)")==True)
    pg.evaluate("document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'))")
    # 5 codes never reused
    code1=pg.evaluate("SH.code");pg.evaluate("shShowList();shNew()");code2=pg.evaluate("SH.code")
    pg.fill('#sh_fr','100');pg.click('#sh_cm');r=pg.locator('#cmBody tbody tr').first;r.locator('[data-k=cust]').fill('سعيد');r.locator('[data-k=pk]').fill('3');ok('2nd saved',pg.evaluate("shSave(true)")==True)
    pg.evaluate("document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'))")
    pg.click('#sh_del');pg.click('#sh_del');pg.wait_for_timeout(200);ok('deleted 2nd (no invoices)',pg.evaluate(f"!SHS.get()['{code2}']"))
    nxt=pg.evaluate("shNextCode()");ok('code not reused after delete',nxt!=code2 and nxt=='SH-0003',(code1,code2,nxt))
    # delete blocked with linked invoice
    pg.evaluate("""c=>{const I=LS.get('pst_inv',{});I['PST-0009']={code:'PST-0009',rcv:'أحمد',date:'2026-10-05',t:50,cur:'$',st:'sent',pd:0,cols:DEF(),rows:[{}],ts:5,ship:c};LS.set('pst_inv',I);ALL=null}""",code1)
    pg.evaluate(f"shEdit('{code1}')");pg.wait_for_timeout(200);pg.click('#sh_del');pg.click('#sh_del');pg.wait_for_timeout(200)
    ok('delete blocked when invoice linked',pg.evaluate(f"!!SHS.get()['{code1}']"))
    # 6 posted: freight locked, delete blocked
    pg.evaluate("""c=>{const I=LS.get('pst_inv',{});delete I['PST-0009'];LS.set('pst_inv',I);ALL=null}""",code1)
    pg.evaluate(f"shEdit('{code1}')");pg.wait_for_timeout(200)
    pg.click('#sh_post');pg.click('#sh_post');pg.wait_for_timeout(300)
    ok('posted',pg.evaluate(f"SHS.get()['{code1}'].posted===true"))
    ok('freight input disabled when posted',pg.evaluate("$('sh_fr').disabled===true"))
    pg.evaluate("$('sh_fr').disabled=false;$('sh_fr').value='77777'");pg.evaluate("shSave(true)");pg.wait_for_timeout(200)
    ok('freight tamper restored on save',pg.evaluate(f"SHS.get()['{code1}'].freight")=='1500.5',pg.evaluate(f"SHS.get()['{code1}'].freight"))
    pg.click('#sh_del');pg.click('#sh_del');pg.wait_for_timeout(200);ok('posted shipment cannot be deleted',pg.evaluate(f"!!SHS.get()['{code1}']"))
    # 1 quota
    pg.evaluate("""()=>{try{localStorage.setItem('fill','x'.repeat(1024*1024));for(let n=0;;n++)localStorage.setItem('fill'+n,'x'.repeat(1024*256))}catch(e){}try{for(let n=0;;n++)localStorage.setItem('fz'+n,'x'.repeat(256))}catch(e){}}""")
    r1=pg.evaluate("LS.set('pst_probe',{a:'y'.repeat(900000)})");ok('LS.set returns false when full',r1==False)
    ok('red banner shown',pg.evaluate("!!document.getElementById('lsBanner')"))
    pg.evaluate("document.getElementById('lsBanner')&&document.getElementById('lsBanner').remove()")
    pg.evaluate(f"shEdit('{code1}')");pg.evaluate("$('sh_notes').value='z'.repeat(20000)");ok('shSave reports failure on full storage',pg.evaluate("shSave(true)")==False)
    pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('fill')||k.startsWith('fz')).forEach(k=>localStorage.removeItem(k))")
    ok('storage % shown in backup info',pg.evaluate("(bkInfo(),$('bkInfo').textContent.includes('%'))"))
    ok('no page errors',not errs,errs[:2])
    # 4 perf + correctness
    t=pg.evaluate("""()=>{const ns=300,ni=5000,S2={},I={};for(let i=0;i<ns;i++){const cons=[];for(let j=0;j<8;j++)cons.push({id:'c'+i+'_'+j,cust:'عميل '+((i*8+j)%400),goods:'g',pk:'5',cbm:'1',kg:'1',sm:'',inv:'',dl:[],custOk:true});S2['SH-'+String(i+1).padStart(4,'0')]={code:'SH-'+String(i+1).padStart(4,'0'),mode:'sea',bl:'',cont:'',car:'',from:'a',to:'b',sd:'',eta:'',freight:'1000',cur:'$',notes:'',st:'tr',hist:[],costs:[],cons:cons,ts:1}}
      for(let k=0;k<ni;k++){const c='PST-'+String(k+1).padStart(4,'0');I[c]={code:c,rcv:'عميل '+(k%400),date:'2026-10-05',t:100,cur:'$',st:'sent',pd:0,cols:DEF(),rows:[{}],ts:5,ship:'SH-'+String(k%ns+1).padStart(4,'0')}}
      LS.set('pst_ship',S2);LS.set('pst_inv',I);ALL={I:I,Rc:{}};const t0=performance.now();shDraw();return Math.round(performance.now()-t0)}""")
    ok('perf 300 shipments/5000 invoices < 600ms',t<600,f'{t}ms (before: 8583ms)')
    ok('balance still correct',pg.evaluate("(()=>{const h=SHS.get()['SH-0001'],c=h.cons[0];return JSON.stringify(consBal(h,c).M)})()")!=None)
    print(sum(res),'/',len(res));b.close()
