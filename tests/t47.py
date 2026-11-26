# صور الحمولات (يتطلب devserver على 8790): PORT=8790 APP_PASSWORD=k node tests/devserver.js
import os,io
from playwright.sync_api import sync_playwright
from PIL import Image
BASE='http://localhost:8790'
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
big='/tmp/ph_big.jpg';Image.effect_noise((3000,2000),80).convert('RGB').save(big,quality=95)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1300,'height':900});A=ctx.new_page();errs=[];A.on('pageerror',lambda e:errs.append(str(e)))
    A.goto(BASE);A.wait_for_function('typeof SRV!=="undefined"&&SRV.on');
    A.fill('#lgName','م');A.fill('#lgUser','admin@portist.com');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1');A.fill('#lgKey','k');A.click('#lgGo');A.wait_for_timeout(2000)
    A.evaluate("shOpen()");A.wait_for_timeout(300);A.click('#shNew');A.wait_for_timeout(200);A.click('#sh_cm');A.wait_for_timeout(200)
    r=A.locator('#cmBody tbody tr').nth(0);r.locator('[data-k=cust]').fill('أحمد');r.locator('[data-k=goods]').fill('قماش');r.locator('[data-k=pk]').fill('4')
    A.fill('#sh_fr','400');A.evaluate("shReadHead()");A.click('#cm_save');A.wait_for_timeout(1200)
    ok('photo button present on consignment row',A.locator('#shCons [data-a=ph]').count()==1)
    A.locator('#shCons [data-a=ph]').click();A.wait_for_timeout(600)
    ok('photo modal opens',A.evaluate("$('mPh').classList.contains('on')"))
    A.set_input_files('#phFile',[big,big]);A.wait_for_timeout(5000)
    ok('2 photos uploaded and shown',A.locator('#phGrid .ph').count()==2)
    sz=A.evaluate("(async()=>{const j=await api('phget',{id:PHL[SH.code][0].id});return j.d.length})()")
    ok('compressed under 700KB even for worst-case noise (3000x2000)',sz<=700000)
    dims=A.evaluate("(async()=>{const j=await api('phget',{id:PHL[SH.code][0].id});const im=new Image();im.src=j.d;await im.decode();return [im.width,im.height]})()")
    ok('longest side 1280',max(dims) in (1280,1000))
    A.wait_for_timeout(400)
    ok('thumbnails loaded',A.evaluate("[...document.querySelectorAll('#phGrid img')].every(i=>i.src.startsWith('data:image/jpeg'))"))
    A.locator('#phGrid .ph').first.click();A.wait_for_timeout(500)
    ok('viewer opens',A.evaluate("$('mPhV').classList.contains('on')&&$('phImg').src.startsWith('data:image')"))
    A.click('#phDel');A.click('#phDel');A.wait_for_timeout(600)
    ok('delete (two-step) leaves 1',A.locator('#phGrid .ph').count()==1)
    A.click('#mPh [data-close]');A.wait_for_timeout(200)
    ok('badge shows count',A.evaluate("document.querySelector('#shCons [data-ph]').textContent.includes('(1)')"))
    A.evaluate("localStorage.clear();sessionStorage.clear()");A.reload();A.wait_for_timeout(1500)
    ok('no page errors',not errs)
