import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
import json,datetime
def boot(b,tz='Europe/Istanbul'):
    ctx=b.new_context(timezone_id=tz,viewport={'width':1200,'height':900});pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(''+APP+'');pg.wait_for_timeout(500)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(400)
    return pg,errs
R={}
with sync_playwright() as p:
    b=p.chromium.launch()
    # A: date at 01:30 Istanbul (= 22:30 UTC previous day)
    ctx=b.new_context(timezone_id='Europe/Istanbul');pg=ctx.new_page()
    pg.clock.install(time=datetime.datetime(2026,11,17,22,30,tzinfo=datetime.timezone.utc))  # = 01:30 on 18th in Istanbul
    pg.goto(''+APP+'');pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(300)
    R['A_local_date']=pg.evaluate("new Date().toLocaleDateString('en-CA')")
    R['A_invoice_default_date']=pg.input_value('#date')
    R['A_shToday']=pg.evaluate("shToday()")
    ctx.close()
    pg,errs=boot(b)
    # B: numbers
    R['B_num']=pg.evaluate("[num('1,500'),num('1.500,75'),num('١٥٠'),num('12 000'),num('1٫5'),num('1,5')]")
    # C: quota silent failure
    pg.evaluate("localStorage.clear()")
    R['C_quota']=pg.evaluate("""()=>{try{localStorage.setItem('fill','x'.repeat(1024*1024));let n=0;try{for(;;n++)localStorage.setItem('fill'+n,'x'.repeat(1024*512))}catch(e){}
      const before=JSON.stringify(Object.keys(localStorage).length);LS.set('pst_probe',{a:'y'.repeat(600000)});return {stored:!!localStorage.getItem('pst_probe'),lsReturnedUndefined:true}}catch(e){return String(e)}}""")
    pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('fill')).forEach(k=>localStorage.removeItem(k))")
    print(json.dumps(R,ensure_ascii=False,indent=1));print(errs);b.close()
