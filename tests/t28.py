# تغطية الترجمة: لا يجب أن يبقى نص عربي في الواجهة عند اللغة الإنجليزية/التركية (البيانات المُدخلة لاتينية)
import os,sys,json;APP='file://'+os.environ.get('PST_HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','portist_invoice.html'))
from playwright.sync_api import sync_playwright
SEED="""()=>{LS.set('pst_cust',{c1:{id:'c1',name:'Acme Co',phone:'0933',addr:'Aleppo',notes:'',ts:1}});
LS.set('pst_inv',{'PST-0001':{rcv:'Acme Co',date:'2026-11-01',t:2400,pd:500,st:'partial',cur:'$',ts:1,cols:S.cols,rows:[{name:'Fabric',w:'5',ship:'100'}],rcs:[],ship:'SH-0001'},'PST-0002':{rcv:'Bob',date:'2026-11-02',t:100,pd:0,st:'draft',cur:'$',ts:1,cols:S.cols,rows:[{}],rcs:[]}});
LS.set('pst_rc',{'RC-0001':{rcv:'Acme Co',date:'2026-11-05',t:300,cur:'$',type:'money',st:'valid',items:[],ts:1,no:'RC-0001',code:'RC-0001',from:'Acme Co',amt:'300',method:'cash'}});
LS.set('pst_ship',{'SH-0001':{code:'SH-0001',mode:'sea',bl:'BLX9',cont:'MSKU1',car:'MSC',from:'Shanghai',to:'Latakia',sd:'2026-10-20',eta:'2026-11-25',freight:'5000',cur:'$',st:'ar',hist:[{st:'ld',date:'2026-10-20'},{st:'tr',date:'2026-10-22'},{st:'ar',date:'2026-11-10'}],costs:[{type:'تخزين',desc:'x',amt:'300',cur:'$'}],cons:[{id:'k1',cust:'Acme Co',goods:'Fabric',pk:40,cbm:12,kg:3000,sm:'2400',inv:'PST-0001',dl:[],rcC:'Aleppo',custOk:true},{id:'k2',cust:'Bob',goods:'Shoes',pk:25,cbm:8,kg:900,sm:'1500',dl:[],rcC:'Damascus',custOk:true}],ts:1,ver:1}});ALL=null}"""
AR=r"[؀-ۿ]+"
SCAN="""(()=>{const out=[];const re=/[\\u0600-\\u06FF]+/;
const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode;if(/^(SCRIPT|STYLE)$/.test(p.nodeName)||p.closest('[data-noi18n]'))return 2;return re.test(n.nodeValue)?1:3}});
while(w.nextNode()){const n=w.currentNode,p=n.parentElement;out.push((p.id||p.className||p.tagName)+': '+n.nodeValue.trim().slice(0,70))}
document.querySelectorAll('[placeholder],[title],[aria-label],[data-l]').forEach(e=>{if(e.closest('[data-noi18n]'))return;['placeholder','title','aria-label','data-l'].forEach(a=>{const v=e.getAttribute(a);if(v&&re.test(v))out.push('@'+a+': '+v.slice(0,70))})});
return out})()"""
miss={}
def note(lang,where,items):
    for i in items:miss.setdefault(lang,{}).setdefault(i,set()).add(where)
with sync_playwright() as p:
    b=p.chromium.launch()
    for lang in sys.argv[1:] or ['en','tr']:
        ctx=b.new_context(viewport={'width':1366,'height':900})
        pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(APP);pg.evaluate("localStorage.setItem('pst_ui','\"%s\"');localStorage.setItem('pst_lang','\"%s\"')"%(lang,lang));pg.reload();pg.wait_for_timeout(500)
        note(lang,'login',pg.evaluate(SCAN))
        pg.fill('#lgName','Admin');pg.fill('#lgUser','admin');pg.fill('#lgPass','secret1');pg.fill('#lgPass2','secret1');pg.click('#lgGo');pg.wait_for_function("typeof ME!=='undefined'&&!!ME");pg.wait_for_timeout(300)
        pg.evaluate(SEED);pg.reload();pg.wait_for_function("typeof ME!=='undefined'&&!!ME");pg.wait_for_timeout(500)
        def scan(w,js=None):
            if js:pg.evaluate(js);pg.wait_for_timeout(450)
            note(lang,w,pg.evaluate(SCAN))
        scan('ships','shOpen()')
        scan('ship-edit',"shEdit('SH-0001')")
        scan('cons-modal',"cmOpen()");pg.evaluate("document.getElementById('mCons').classList.remove('on')")
        scan('acc',"setMode('a')");pg.evaluate("ACT='r';accTab('r')");scan('acc-r')
        pg.evaluate("setMode('i');load(LS.get('pst_inv',{})['PST-0001']);S.opened='PST-0001'");scan('invoice')
        pg.evaluate("setMode('r');rload(LS.get('pst_rc',{})['RC-0001'])");scan('receipt')
        scan('customers',"cOpen()");
        pg.evaluate("sOpen('c1')");scan('statement')
        scan('settings',"setMode('g')")
        for m in ['mUsers','mLog','mAudit','mBackup','mPass','mCols','mIssue','mConf','mPty']:
            try:
                if m=='mUsers':pg.evaluate("$('bUsers').click()")
                elif m=='mLog':pg.evaluate("$('bLog').click()")
                elif m=='mAudit':pg.evaluate("$('bAudit').click()")
                elif m=='mBackup':pg.evaluate("$('bBackup').click()")
                elif m=='mPass':pg.evaluate("$('bPass').click()")
                elif m=='mCols':pg.evaluate("$('bCols').click()")
                else:continue
                pg.wait_for_timeout(450);note(lang,m,pg.evaluate(SCAN));pg.evaluate("document.querySelectorAll('.modal.on').forEach(x=>x.classList.remove('on'))")
            except Exception as e:print('ERR',m,e)
        scan('quick',"enterQuick()");pg.evaluate("exitQuick()")
        pg.evaluate("shEdit('SH-0001')");pg.evaluate("shStatusSheet&&0");
        for fn in ["shOpsReport0","shStatusSheet"]:pass
        pg.evaluate("shOpen()");pg.wait_for_timeout(300)
        scan('ship-todo')
        try:
            pg.click('[data-hr]');pg.wait_for_timeout(500);scan('status-sheet')
            pg.evaluate("S.shBack&&S.shBack()");pg.wait_for_timeout(200)
        except Exception as e:print('ERR hr',str(e)[:80])
        pg.evaluate("shEdit('SH-0001')");pg.wait_for_timeout(400)
        for sel in ['#sh_ops','#sh_rep','[data-sheet]','#sh_dl','[data-dl]','[data-pty]','#sh_pty','[data-ni]','[data-nv]']:
            try:
                if pg.locator(sel).count():
                    pg.locator(sel).first.click(timeout=1500);pg.wait_for_timeout(500);scan('click '+sel);pg.evaluate("document.querySelectorAll('.modal.on').forEach(x=>x.classList.remove('on'))")
            except Exception as e:pass
        scan('menu',"setMode('h');$('bMore').click()")
        print(lang,'errors',errs)
for lang,d in miss.items():
    print('==',lang,len(d));
    for k,v in sorted(d.items()):print('  ',k,'<-',','.join(sorted(v))[:60])
# فشل الاختبار إن بقي نص عربي غير مترجم
import sys as _s
if any(miss.get(l) for l in miss):print('FAIL untranslated text remains');
