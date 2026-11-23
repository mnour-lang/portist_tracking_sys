import os,json;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
H={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}
ER={'result':'success','time_last_update_unix':1795000000,'rates':{'USD':1,'EUR':0.8,'TRY':40,'GBP':0.75,'AED':3.6725,'SAR':3.75,'EGP':50,'JOD':0.709,'CNY':7.2,'JPY':150}}
FR={'date':'2026-11-20','rates':{'EUR':0.9,'TRY':41,'GBP':0.8,'CNY':7,'JPY':149,'AUD':1.5}}
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    mode={'er':'ok'}
    def er(r):
        if mode['er']=='ok':r.fulfill(status=200,headers=H,body=json.dumps(ER))
        else:r.fulfill(status=503,headers=H,body='{}')
    pg.route('https://open.er-api.com/**',er)
    pg.route('https://api.frankfurter.dev/**',lambda r:r.fulfill(status=200,headers=H,body=json.dumps(FR)) if mode['er']!='dead' else r.abort())
    pg.goto(APP);pg.wait_for_timeout(400)
    pg.fill('#lgName','م');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_timeout(600)
    pg.evaluate("routeTo('#/settings')");pg.click('#gNav [data-g=cur]');pg.wait_for_timeout(300)
    # mark SYP-like custom: make EGP fixed
    pg.evaluate("document.querySelector('#gCur tr:has(input[value=EGP]) input[data-cf=fix]').click()");pg.wait_for_timeout(200)
    ok('fixed flag stored',pg.evaluate("curGet('ج.م').fix")==1)
    pg.click('#fx_upd');pg.wait_for_timeout(1200)
    ok('review modal opens',pg.evaluate("$('mFx').classList.contains('on')"))
    ok('SYP reported missing (not in source)',pg.evaluate("$('fx_src').textContent.includes('SYP')"))
    ok('EGP fixed => unchecked',not pg.evaluate("[...document.querySelectorAll('#fx_tb tbody tr')].find(r=>r.cells[1].textContent.trim().startsWith('EGP')).querySelector('input').checked"))
    ok('attribution link shown',pg.evaluate("$('fx_attr').textContent.includes('Exchange Rate API')"))
    pg.click('#fx_apply');pg.wait_for_timeout(400)
    r=pg.evaluate("({eur:curGet('€').rate,try:curGet('₺').rate,egp:curGet('ج.م').rate,usd:curGet('$').rate})")
    ok('EUR 1/0.8=1.25 (USD per EUR)',abs(float(r['eur'])-1.25)<1e-9)
    ok('TRY 1/40 = 0.025',abs(float(r['try'])-0.025)<1e-9)
    ok('fixed EGP untouched',not (float(r['egp'] or 0)>0))
    ok('USD stays 1',float(r['usd'])==1)
    ok('cross rate 1 EUR = 50 TRY',abs(pg.evaluate("curRate('€','₺')")-50)<1e-6)
    ok('last-update stamp shown',pg.evaluate("$('gCur').textContent.includes('open.er-api.com')"))
    # fallback to frankfurter when primary fails
    mode['er']='bad';pg.evaluate("localStorage.removeItem('pst_fxat')")
    pg.click('#fx_upd');pg.wait_for_timeout(1500)
    ok('fallback source used',pg.evaluate("$('fx_src').textContent.includes('frankfurter')"))
    pg.evaluate("$('mFx').classList.remove('on')")
    # both fail -> no change, error toast
    mode['er']='dead';before=pg.evaluate("curGet('€').rate")
    pg.click('#fx_upd');pg.wait_for_timeout(1500)
    ok('both sources dead: nothing changed, modal closed',pg.evaluate("curGet('€').rate")==before and not pg.evaluate("$('mFx').classList.contains('on')"))
    # inverse display in the review table
    mode['er']='ok';pg.evaluate("localStorage.setItem('pst_fxdir','i')")
    pg.click('#fx_upd');pg.wait_for_timeout(1200)
    ok('review shows inverse (40 TRY per USD)',pg.evaluate("[...document.querySelectorAll('#fx_tb tbody tr')].find(r=>r.cells[1].textContent.trim().startsWith('TRY')).textContent.includes('40')"))
    pg.evaluate("$('mFx').classList.remove('on');localStorage.setItem('pst_fxdir','d')")
    # auto daily: stale -> auto applies (non-fixed), toggled on
    pg.evaluate("(()=>{const M=curMap();M['€'].rate='0.5';M['ج.م'].rate='0.01';curSave(M);localStorage.setItem('pst_fxat','1')})()")
    pg.evaluate("localStorage.setItem('pst_fxauto','1');fxAutoTick()");pg.wait_for_timeout(1500)
    ok('auto update applies to non-fixed',abs(float(pg.evaluate("curGet('€').rate"))-1.25)<1e-9)
    ok('auto update skips fixed',pg.evaluate("curGet('ج.م').rate")=='0.01')
    pg.evaluate("curGet;(()=>{const M=curMap();M['€'].rate='0.5';curSave(M)})()");pg.evaluate("fxAutoTick()");pg.wait_for_timeout(600)
    ok('no re-run within 20h',pg.evaluate("curGet('€').rate")=='0.5')
    ok('no page errors',not errs)
    if errs:print(errs)
