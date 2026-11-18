import os;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
import json
exec(open('a1.py').read().split("R={}")[0])
res=[]
def ok(n,v,extra=''):
    res.append(bool(v));print(('PASS ' if v else 'FAIL ')+n+(' '+str(extra) if extra!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch();pg,errs=boot(b)
    pg.evaluate("setMode('i');newInv()");pg.wait_for_timeout(200)
    pg.fill('#rcv','أحمد التاجر')
    pg.evaluate("S.rows=[{name:'شحن',ship:'1,500'}];render&&render();calc&&calc()")
    inp=pg.locator('#rows tr').first.locator('[data-k=ship]')
    print('total after render:',pg.evaluate("S.total"))
    pg.evaluate("S.rows[0].ship=1500;render();calc()");ok('invoice total',pg.evaluate("S.total")>=1500,pg.evaluate("S.total"))
    pg.evaluate("saveInv()");pg.wait_for_timeout(300)
    if pg.is_visible('#mIssue'):pg.click('#isYes');pg.wait_for_timeout(400)
    code=pg.evaluate("$('code').value")
    inv=pg.evaluate(f"LS.get('pst_inv',{{}})['{code}']")
    ok('invoice saved & issued',inv and inv['st']!='draft',(code,inv and inv['st'],inv and inv['t']))
    # receipt with allocation
    pg.evaluate("setMode('r');rnew()");pg.wait_for_timeout(200)
    pg.fill('#r_from','أحمد التاجر');pg.fill('#r_amt','500')
    
    pg.evaluate(f"rv('inv');rid('inv').value='{code}'");pg.wait_for_timeout(200)
    pg.evaluate("rsave()");pg.wait_for_timeout(600)
    inv2=pg.evaluate(f"LS.get('pst_inv',{{}})['{code}']")
    ok('payment applied to invoice',inv2 and abs((inv2.get('pd') or 0)-500)<0.01,(inv2 or {}).get('pd'))
    print('errs',errs[:3]);print(sum(res),'/',len(res));b.close()
