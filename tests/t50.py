# تعارض الحفظ: فاتورة/وصل فُتحا ثم عُدّلا من جهة أخرى -> لا كتابة فوق التعديل الأحدث
from playwright.sync_api import sync_playwright
BASE='http://localhost:8790'
ok=lambda n,v:print(('PASS ' if v else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1300,'height':900});A=ctx.new_page();errs=[];A.on('pageerror',lambda e:errs.append(str(e)))
    A.goto(BASE);A.wait_for_function('typeof SRV!=="undefined"&&document.getElementById("login").style.display===""',timeout=15000);A.wait_for_timeout(800)
    A.fill('#lgName','المدير');A.fill('#lgUser','admin@portist.com');A.fill('#lgPass','secret1');A.fill('#lgPass2','secret1');A.fill('#lgKey','k');A.click('#lgGo')
    A.wait_for_function('typeof ME!=="undefined"&&!!ME',timeout=15000);A.wait_for_timeout(1200)
    msgs=[];dec={'v':True}
    def hd(d):
        msgs.append(d.message[:40]);d.accept() if dec['v'] else d.dismiss()
    A.on('dialog',hd)
    # فاتورة جديدة
    A.evaluate("setMode('i')");A.wait_for_timeout(400)
    A.fill('#rcv','أحمد');A.evaluate("$('code').value='PST-0001'")
    A.evaluate("S.rows=[{name:'قماش',qty:1,price:100}];if(typeof render==='function')render()");A.wait_for_timeout(200)
    A.evaluate("S.issueOk=true;saveInv()");A.wait_for_timeout(1500)
    ok('first save ok, base version 1',A.evaluate("S.opened==='PST-0001'&&S.bv===1"))
    # جهاز آخر يعدّل نفس الفاتورة
    A.evaluate("(async()=>{const d=(await api('get',{code:'PST-0001'})).d;d.rcv='عن جهاز آخر';await api('save',{code:'PST-0001',d:d,isNew:false,bv:d.ver})})()");A.wait_for_timeout(800)
    A.fill('#rcv','تعديلي');A.evaluate("S.issueOk=true;saveInv()");A.wait_for_timeout(1500)
    ok('conflict dialog was shown',len(msgs)==1)
    ok('accepting loads the server version into the editor',A.input_value('#rcv')=='عن جهاز آخر' and A.evaluate("S.bv")==2)
    ok('server kept the other device edit',A.evaluate("api('get',{code:'PST-0001'}).then(j=>j.d.rcv)")=='عن جهاز آخر')
    # الرفض: تبقى تعديلاتي على الشاشة ولا شيء يُحفظ
    A.evaluate("(async()=>{const d=(await api('get',{code:'PST-0001'})).d;d.rcv='ثانٍ من آخر';await api('save',{code:'PST-0001',d:d,isNew:false,bv:d.ver})})()");A.wait_for_timeout(800)
    dec['v']=False;A.fill('#rcv','تعديلي 2');A.evaluate("S.issueOk=true;saveInv()");A.wait_for_timeout(1500)
    ok('declining keeps my edits on screen',A.input_value('#rcv')=='تعديلي 2')
    ok('and nothing was overwritten on the server',A.evaluate("api('get',{code:'PST-0001'}).then(j=>j.d.rcv)")=='ثانٍ من آخر')
    # دفعة تصل من جهة أخرى ثم حفظ من نسخة قديمة لا يمحوها
    dec['v']=True
    A.evaluate("api('adj',{code:'PST-0001',delta:30,no:'RC-9',keep:true})");A.wait_for_timeout(600)
    A.fill('#rcv','بعد الدفعة');A.evaluate("S.issueOk=true;saveInv()");A.wait_for_timeout(1500)
    ok('stale editor cannot erase a payment (conflict, paid still 30)',A.evaluate("api('get',{code:'PST-0001'}).then(j=>j.d.pd)")==30)
    # وصل
    A.evaluate("setMode('r')");A.wait_for_timeout(400)
    A.evaluate("rid('from').value='أحمد';rid('amt').value='50';rid('no').value='RC-0001';rsave()");A.wait_for_timeout(1800)
    ok('receipt saved with base version',A.evaluate("R.opened==='RC-0001'&&R.bv>=1"))
    n0=len(msgs)
    A.evaluate("(async()=>{const d=(await api('rget',{code:'RC-0001'})).d;d.notes='من جهاز آخر';await api('rsave',{code:'RC-0001',d:d,isNew:false,bv:d.ver})})()");A.wait_for_timeout(800)
    A.evaluate("rid('notes').value='تعديلي';rsave()");A.wait_for_timeout(1800)
    ok('receipt conflict dialog shown and server version loaded',len(msgs)==n0+1 and A.evaluate("rid('notes').value")=='من جهاز آخر')
    ok('no page errors',not errs)
    b.close()
