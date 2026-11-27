/* مراقبة الأخطاء: تُرسل أخطاء المتصفح غير الملتقطة للخادم (محدودة) لتظهر في الإعدادات */
{let n=0;const rep=(m,s)=>{if(!ME||!ME.tok||n>=5||!navigator.onLine)return;n++;api('errrep',{msg:String(m||'').slice(0,300),stack:String(s||'').slice(0,1200)}).catch(()=>{})};
 window.addEventListener('error',e=>rep(e.message,(e.filename||'')+':'+e.lineno+':'+e.colno));
 window.addEventListener('unhandledrejection',e=>{const x=e.reason;rep(x&&x.message||x,x&&x.stack)})}
const fmtTs=t=>new Date(t).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'});
async function blDraw(){const B=$('snBlob');if(!B||!SRV.on)return;
  try{const j=await api('blobstat'),n=(j.photos||0)+(j.files||0);
    B.innerHTML='<b>'+_t('تخزين الملفات')+'</b><p class="hint" style="margin:4px 0 8px">'+(j.on?esc(_t('صور البضاعة وملفات التصدير تُحفظ في تخزين خاص (Vercel Blob) خارج قاعدة البيانات.')):esc(_t('تخزين Blob غير مفعّل: الملفات تُحفظ داخل قاعدة البيانات.')))+(j.on?' — '+esc(String(j.inBlob||0))+' '+_t('ملف في Blob'):'')+'</p>'+(j.on&&n?`<button class="b2" id="blMig" type="button">${_t('نقل الملفات القديمة إلى Blob')} (${n})</button> <span class="hint" id="blSt"></span>`:'')}
  catch(e){B.innerHTML=''}}
async function snDraw(){blDraw();const L=$('snList');if(!L||!SRV.on)return;L.innerHTML='<p class="hint">'+_t('جارٍ التحميل')+'...</p>';
  try{const j=await api('snaplist'),K={auto:_t('تلقائية'),manual:_t('يدوية'),'pre-restore':_t('قبل استعادة')};
    L.innerHTML=(j.items||[]).length?j.items.map(x=>`<div class="lsG" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--bd,#ddd)"><span dir="ltr">${fmtTs(x.ts)}</span><span class="mu">${esc(K[x.kind]||x.kind)}</span><span class="mu">${Math.round(x.size/1024)} KB</span><span class="mu">${Object.keys(x.n||{}).length?esc((x.n.invoices||0)+' '+_t('فاتورة')+' · '+(x.n.receipts||0)+' '+_t('وصل')+' · '+(x.n.shipments||0)+' '+_t('شحنة')):''}</span><span style="flex:1"></span><button class="b3 sm" data-sd="${esc(x.id)}" type="button">${_t('تنزيل')}</button>${ME&&ME.admin?`<button class="b3 sm" data-sr="${esc(x.id)}" type="button">${_t('استعادة')}</button>`:''}</div>`).join(''):'<div class="empty">'+_t('لا نسخ بعد')+'.</div>'}
  catch(e){L.innerHTML='<p class="hint">'+esc(e.message)+'</p>'}}
async function syDraw(){const L=$('syList');if(!L||!SRV.on)return;L.innerHTML='<p class="hint">'+_t('جارٍ التحميل')+'...</p>';
  try{const j=await api('syslog');L.innerHTML=(j.items||[]).length?j.items.map(x=>`<details style="padding:6px 0;border-bottom:1px solid var(--bd,#ddd)"><summary><span dir="ltr" class="mu">${fmtTs(x.ts)}</span> <b>${x.kind==='client'?_t('المتصفح'):_t('الخادم')}</b> ${esc(x.a||'')} ${x.who?'· '+esc(x.who):''} — ${esc(x.msg)}</summary><pre dir="ltr" style="white-space:pre-wrap;font-size:11px;margin:6px 0">${esc(x.info||'')}</pre></details>`).join(''):'<div class="empty">'+_t('لا أخطاء مسجلة')+'.</div>'}
  catch(e){L.innerHTML='<p class="hint">'+esc(e.message)+'</p>'}}
document.addEventListener('click',async e=>{const t=e.target.closest&&e.target.closest('#gNav [data-g],#blMig,#snNow,#snRef,#syRef,#syClr,[data-sd],[data-sr]');if(!t)return;
  try{if(t.dataset.g==='snp')snDraw();else if(t.dataset.g==='sys')syDraw();
    else if(t.id==='blMig'){t.disabled=true;try{let m;do{m=await api('blobmigrate');$('blSt').textContent=_t('المتبقي')+': '+((m.photos||0)+(m.files||0));if(!m.moved)break}while((m.photos||0)+(m.files||0)>0);toast((m.photos||0)+(m.files||0)?_t('تعذر نقل بعض الملفات — راجع سجل الأخطاء'):_t('تم نقل كل الملفات'),(m.photos||0)+(m.files||0)?'err':undefined)}finally{t.disabled=false}blDraw()}
    else if(t.id==='snRef')snDraw();else if(t.id==='syRef')syDraw();
    else if(t.id==='snNow'){t.disabled=true;try{await api('snapnow');toast(_t('تم أخذ النسخة'))}finally{t.disabled=false}snDraw()}
    else if(t.id==='syClr'){if(!confirm(_t('مسح سجل الأخطاء؟')))return;await api('sysclear');syDraw()}
    else if(t.dataset.sd){const j=await api('snapget',{id:t.dataset.sd});dlFile(new File([Uint8Array.from(atob(j.gz),c=>c.charCodeAt(0))],'portist-server-'+t.dataset.sd+'.json.gz',{type:'application/gzip'}))}
    else if(t.dataset.sr){if(!confirm(_t('ستُستبدل بيانات الخادم بمحتوى هذه النسخة (تؤخذ نسخة أمان قبلها). متابعة؟')))return;const j=await api('snaprestore',{id:t.dataset.sr});toast(_t('تمت الاستعادة')+' — '+_t('أعد تحميل الصفحة'));snDraw()}
  }catch(x){toast(x.message,'err')}});
function dlFile(f){const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove()}
async function sharePdf(){const b=$('bShare');
  const go=async f=>{try{await navigator.share({files:[f],title:f.name});pendingPdf=null;b.querySelector('span').textContent=(_t("مشاركة"));msg((_t("تمت المشاركة")))}
    catch(e){if(e.name==='AbortError'){msg((_t("أُلغيت المشاركة")))}else if(e.name==='NotAllowedError'&&pendingPdf!==f){pendingPdf=f;b.querySelector('span').textContent=(_t("جاهز")+" — "+_t("اضغط للمشاركة"));msg((_t("الملف جاهز، اضغط الزر مرة أخرى")))}else if(e.name==='NotAllowedError'){pendingPdf=null;b.querySelector('span').textContent=(_t("مشاركة"));dlFile(f);msg((_t("المشاركة المباشرة غير متاحة هنا")+" — "+_t("تم تنزيل الملف، أرفقه في واتساب")))}else throw e}};
  if(pendingPdf){await go(pendingPdf);return}
  msg((_t("جارٍ تجهيز ملف PDF")+"..."));
  try{const doc=await makePdf(),name=(docName().trim()||'document').replace(/[\\/:*?"<>|]/g,'_'),file=new File([doc.output('blob')],name+'.pdf',{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[file]}))await go(file);
    else{dlFile(file);msg((_t("تم تنزيل الملف")+" — "+_t("أرفقه في واتساب من التنزيلات")))}
  }catch(e){msg((_t("تعذر إنشاء الملف")+": ")+e.message)}}
function refreshProds(){const P=LS.get('pst_prod',{});$('prods').innerHTML=Object.keys(P).map(n=>`<option value="${esc(n)}">`).join('')}
const CL={u:()=>LS.get('pst_url',''),p:()=>LS.get('pst_pw','')};
let cloudList=false;S.opened='';
async function api(a,d){let j;const usedTok=!!(ME&&ME.tok);try{const r=await fetch(CL.u(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({pw:CL.p(),a:a,u:ME?ME.user:''},ME&&ME.tok?{tok:ME.tok}:{uh:ME?ME.hash:''},d||{}))});j=await r.json()}catch(x){const e=new Error(x.message||(_t("تعذر الاتصال")));e.net=true;throw e}
  if(j.err){const e=new Error(j.err);e.j=j;if(usedTok&&ME&&ME.tok&&/مصرّح|Unauthorized|Yetkisiz/.test(j.err)&&a!=='errrep'){setTimeout(()=>{if(ME&&ME.tok)logout(_t('انتهت الجلسة')+' — '+_t('سجّل الدخول من جديد'))},0)}throw e}return j}
/* طابور المزامنة: ما تعذّر إرساله بسبب انقطاع الاتصال يُحفظ ويُعاد إرساله تلقائياً */
const QS={get:()=>LS.get('pst_q',{}),set:v=>LS.set('pst_q',v)};
function qAdd(a,code,pl){const Q=QS.get(),k=a+'|'+code,o=Q[k];Q[k]={a:a,code:code,pl:pl,t:Date.now(),isNew:o?o.isNew:!!pl.isNew};QS.set(Q);qBadge()}
function qBadge(){const b=$('qBadge');if(!b)return;const Q=Object.values(QS.get()),n=Q.length,bad=Q.filter(x=>x.err).length;b.style.display=n?'':'none';b.textContent=(bad?'⚠ ':'⟳ ')+n+(" "+_t("بانتظار المزامنة"));b.className='ss '+(bad?'dirty':'');b.title=bad?(_t("بعضها يحتاج تدخلك")+" — "+_t("اضغط للتفاصيل")):(_t("سيُعاد الإرسال تلقائياً عند توفر الاتصال")+" — "+_t("اضغط للمحاولة الآن"))}
let QBUSY=false;
async function qFlush(manual){if(QBUSY||!CL.u()||!ME)return;QBUSY=true;let done=0,fail=[];
  try{const Q=QS.get();for(const k of Object.keys(Q)){const x=Q[k];if(x.err&&!manual)continue;
    try{const pl=Object.assign({},x.pl,{code:x.code,isNew:x.isNew});if(x.a==='shsave'){const old=SHS.get()[x.code];if(old&&old.ver!=null)pl.d=Object.assign({},pl.d,{ver:pl.d.ver!=null?pl.d.ver:old.ver})}
      const j=await api(x.a,pl);const Q2=QS.get();delete Q2[k];QS.set(Q2);done++;
      if(x.a==='shsave'&&j.ver!=null){const D=SHS.get();if(D[x.code]){D[x.code].ver=j.ver;SHS.set(D)}if(SH&&SH.code===x.code)SH.ver=j.ver}}
    catch(e){if(e.net)break;const Q2=QS.get();if(Q2[k]){Q2[k].err=e.message==='conflict'?(_t("تعارض: عُدّلت هذه الشحنة من جهاز آخر")):e.message==='exists'?(_t("الرقم مستخدم لسجل آخر على السيرفر")):e.message;QS.set(Q2)}fail.push(x.code+': '+(e.message==='conflict'?(_t("تعارض مع تعديل من جهاز آخر")):e.message))}}
  }finally{QBUSY=false;qBadge()}
  if(done)toast((_t("تمت مزامنة")+" ")+done+(" "+_t("عنصر مع الخادم")));
  if(fail.length&&manual)toast((_t("تعذّرت مزامنة")+": ")+fail.join(' | '),'err')}
document.addEventListener('DOMContentLoaded',()=>{});
window.addEventListener('online',()=>qFlush());setInterval(()=>qFlush(),60000);
async function saveInv(){if(!need('inv'))return;if(ILOCK){toast((_t("الفاتورة مقفلة")+" — "+_t("فُكَّ القفل أولاً للتعديل")),'err');return}let code=$('code').value.trim();if(code&&!S.opened&&!CL.u()&&LS.get('pst_inv',{})[code]){const old=code;code=nextCode();$('code').value=code;toast(old+' '+_t('مستخدم لفاتورة أخرى — أُعطيت هذه الفاتورة الرقم')+' '+code)}if(!validInv(code))return;const ok0=S.issueOk;S.issueOk=false;if(!ok0&&($('st').value||'draft')==='draft'&&S.total>0&&(code!==S.opened||S.ship)){$('mIssue').classList.add('on');$('isYes').focus();return}ensureCust($('rcv').value,'',$('cref').value);
  const d=JSON.parse(JSON.stringify(snap())),D=LS.get('pst_inv',{});const PR=LS.get('pst_prod',{});S.rows.forEach(r=>{if(r.name&&r.name.trim()){const o=Object.assign({},r);delete o.name;PR[r.name.trim()]=o}});LS.set('pst_prod',PR);refreshProds();D[code]=d;if(!LS.set('pst_inv',D)){msg((_t("لم تُحفظ الفاتورة: مساحة التخزين ممتلئة")));return}
  const m=code.match(/^PST-(\d+)$/i);if(m&&+m[1]>LS.get('pst_seq',0))LS.set('pst_seq',+m[1]);
  const lockAfter=()=>{if(($('st').value||'draft')!=='draft')setILock(true)};if(!CL.u()){S.opened=code;setClean('i',true);lockAfter();logAct('حفظ فاتورة',code+' · '+$('st').value);msg((_t("تم الحفظ على هذا الجهاز فقط")+": ")+code);return}
  msg((_t("جارٍ الحفظ على الخادم")+"..."));
  try{await api('save',{code:code,d:d,isNew:code!==S.opened});S.opened=code;setClean('i',true);lockAfter();logAct('حفظ فاتورة',code+' · '+$('st').value);msg((_t("تم الحفظ على الخادم")+": ")+code)}
  catch(e){if(e.message==='exists'&&!S.opened&&!saveInv._r){saveInv._r=1;try{const old=code,n=(await api('next')).code;$('code').value=n;toast(old+' '+_t('مستخدم لفاتورة أخرى — أُعطيت هذه الفاتورة الرقم')+' '+n);S.issueOk=true;await saveInv()}catch(e2){msg(e2.message)}finally{saveInv._r=0}return}if(e.message==='exists')bad($('code'),(_t("الكود مستخدم لفاتورة أخرى")+" — "+_t("غيّره ثم احفظ")));else{if(e.net){qAdd('save',code,{d:d,isNew:code!==S.opened});S.opened=code;setClean('i',true);lockAfter()}msg((_t("تعذر الاتصال بالخادم")+" (")+e.message+(") — "+_t("حُفظت نسخة على هذا الجهاز"))+(e.net?(" "+_t("وستُرسل تلقائياً عند عودة الاتصال")):''))}}}
let LISTD={};
async function listInv(){let D=LS.get('pst_inv',{});cloudList=false;
  if(CL.u()){if(!LQUIET)$('invList').innerHTML=("<p>"+_t("جارٍ التحميل من الخادم")+"...</p>");
    try{const j=await api('list');D={};j.items.forEach(x=>D[x.code]=x);cloudList=true}catch(e){msg((_t("تعذر الاتصال")+": ")+e.message+(" — "+_t("تُعرض فواتير هذا الجهاز")))}}
  LISTD=D;drawList()}
function drawList(){const q=$('q').value.trim().toLowerCase(),fs=$('fst').value,D=LISTD,un={},CM=crMap(D);
  const ks=Object.keys(D).filter(k=>(!q||(k+' '+(D[k].rcv||'')+' '+(D[k].cref||'')).toLowerCase().includes(q))&&(!fs||(D[k].st||'draft')===fs)).sort((a,b)=>D[b].ts-D[a].ts);
  ks.forEach(k=>{const d=D[k],st0=d.st||'draft';if(st0!=='paid'&&st0!=='void'&&st0!=='draft')un[d.cur||'']=(un[d.cur||'']||0)+Math.max(0,(d.t||0)-(d.pd||0)-(CM[k]||0))});
  $('unpaid').textContent=Object.keys(un).length?(_t("غير محصّل")+": ")+Object.entries(un).map(([c,v])=>fm(v,c)).join(' · '):'';
  const head=("<div class=\"lsG lsI h\"><span>"+_t("رقم الفاتورة")+"</span><span>"+_t("المستلم")+" / "+_t("كود العميل")+"</span><span>"+_t("التاريخ")+"</span><span>"+_t("المبلغ")+"</span><span>"+_t("الحالة")+"</span><span></span></div>");
  $('invList').innerHTML=ks.length?head+ks.map(k=>{const d=D[k],st=d.st||'draft',rm=Math.max(0,num(d.t)-num(d.pd)-(CM[k]||0));
    return `<div class="lsG lsI"><button class="b2" data-o="${esc(k)}" style="font-weight:700"><span dir="ltr">${esc(k)}</span>${isNote(d)?`<br><span class="mu" style="font-weight:400">${esc(_t(d.note==='cr'?"إشعار دائن":"إشعار مدين"))}${d.ref?' · '+esc(d.ref):''}</span>`:''}</button><span data-l="${_t("المستلم")}"><b>${esc(d.rcv||'—')}</b>${d.cref?`<br><span class="mu" dir="ltr">${esc(d.cref)}</span>`:''}</span><span data-l="${_t("التاريخ")}" dir="ltr" class="mu" style="text-align:start">${esc(d.date||'—')}</span><span data-l="${_t("المبلغ")}"><b${st==='void'?' style="text-decoration:line-through;color:var(--muted)"':''}>${fm(d.t||0,esc(d.cur||''))}</b>${st==='partial'?`<br><span class="mu">${_t("المتبقي")} ${f(rm)}</span>`:''}</span><span data-l="${_t("الحالة")}"><span class="bd s-${st}">${esc(_t(STN[st][0]))}</span></span><span class="acts"><button class="b2" data-o="${esc(k)}">${_t("فتح")}</button>${isNote(d)?'':`<button class="b2" data-c="${esc(k)}">${_t("نسخ")}</button>`}${(isNote(d)||st==='draft'||st==='void')?'':`<button class="b2" data-n="${esc(k)}">${_t("إشعار")}</button>`}${st==='draft'?`<button class="b3" data-x="${esc(k)}">${_t("حذف")}</button>`:st==='void'?'':`<button class="b3" data-v="${esc(k)}">${_t("إلغاء")}</button>`}</span></div>`}).join(''):("<div class=\"empty\">"+_t("لا توجد فواتير مطابقة")+".</div>");}
async function fetchInv(k){return cloudList?(await api('get',{code:k})).d:LISTD[k]}
async function verify(){const p=$('vtxt').value.trim().split('|');if(p[0]!=='PORTIST'||p.length<5){msg((_t("نص QR غير صالح")));return}
  try{const d=CL.u()?(await api('get',{code:p[1]})).d:LS.get('pst_inv',{})[p[1]];if(!d){msg((_t("الفاتورة غير موجودة في النظام")));return}
  const ok=p[4]===hash({code:d.code,date:d.date,t:d.t||0,cur:d.cur})&&p[3]===(d.t||0).toFixed(2)+d.cur;msg(ok?("✓ "+_t("الفاتورة مطابقة للمحفوظة")):("✗ "+_t("البيانات لا تطابق الفاتورة المحفوظة")))}catch(e){msg((_t("تعذر التحقق")+": ")+e.message)}}

const RTX={title:['وصل استلام','Receipt voucher','Makbuz'],date:['التاريخ','Date','Tarih'],from:['استلمنا من السيد/السادة','Received from','Teslim alınan'],phone:['هاتف','Phone','Telefon'],amt:['المبلغ المستلم','Amount received','Alınan tutar'],method:['طريقة الدفع','Payment','Ödeme şekli'],inv:['الفاتورة','Invoice','Fatura'],bl:['بوليصة / تتبع','BL / Tracking','Konşimento / Takip'],for:['وذلك عن','Being','Açıklama'],notes:['ملاحظات','Notes','Notlar'],giver:['المُسلِّم','Delivered by','Teslim eden'],taker:['المُستلِم','Received by','Teslim alan'],desc:['الوصف','Description','Açıklama'],qty:['العدد','Qty','Adet'],wt:['الوزن (كغ)','Weight (kg)','Ağırlık (kg)'],cond:['الحالة','Condition','Durum'],good:['سليمة','Good','Sağlam'],rem:['بها ملاحظة','With remarks','Notlu'],tot:['المجموع','Total','Toplam'],cc:['نسخة العميل','Customer copy','Müşteri nüshası'],co:['نسخة الشركة','Company copy','Şirket nüshası'],void:['ملغى','VOID','İPTAL']};
const RM={cash:['نقداً','Cash','Nakit'],transfer:['حوالة بنكية','Bank transfer','Havale/EFT'],cheque:['شيك','Cheque','Çek'],card:['بطاقة','Card','Kart'],sham:['شام كاش','Sham Cash','Sham Cash']};
const R={items:[{}],applied:false,opened:'',al:{},alApplied:{},alCv:{},alIcu:{},alx:{},alSv:{},alTouched:false,sig:'',autoAmt:'',fromStmt:null};
const rid=k=>$('r_'+k),rv=k=>rid(k).value,RCL=()=>LS.get('pst_rc',{}),rnextNo=()=>'RC-'+pad(LS.get('pst_rseq',0)+1);
const RK=['no','date','from','phone','type','amt','cur','method','ref','for','inv','bl','emp','notes','why'];
const rfit=()=>S.mode==='r'&&rv('page')==='fit';
const r2=n=>Math.round(num(n)*100)/100;
function wl(T,cur){if(S.lang[0]!=='a'||T<=0)return '';const i=Math.floor(T+1e-9),c=Math.round((T-i)*100);return '<div class="wd">'+wordsAr(i)+' '+(CN[cur]||esc(cur))+(c?(" "+_t("و"))+c+'/100':'')+(" "+_t("فقط لا غير")+"</div>")}
wl=withDoc(wl);
function rcCopy(i,lay){
  const t=rv('type'),mn=t!=='goods',gd=t!=='money',amt=r2(rv('amt')),cur=rv('cur'),vd=rid('void').checked;
  const it=R.items.filter(x=>x.d||x.q||x.w),row=(k,v)=>v?`<div class="rc-row"><span>${L(...RTX[k])}</span><b>${v}</b></div>`:'';
  let h=`<div class="rc ${lay}"><img class="wm" src="${document.querySelector('header img').src}" alt=""><div class="rc-top"><img src="${document.querySelector('header img').src}" alt=""><div class="rc-t"><h1>${L(...RTX.title)}</h1><span class="rc-badge">${esc(rv('no'))||'—'}</span><div class="rc-d">${L(...RTX.date)}: <b>${esc(rv('date'))}</b></div></div></div>`;
  h+=`<div class="rc-row"><span>${L(...RTX.from)}</span><b>${esc(rv('from'))||'&nbsp;'}</b>${rv('phone')?`<span>${L(...RTX.phone)}</span><b dir="ltr" style="flex:none">${esc(rv('phone'))}</b>`:''}</div>`;
  if(mn)h+=`<div class="rc-amt"><div class="lb">${L(...RTX.amt)}</div><div class="n">${f(amt)} <small>${esc(cur)}</small></div>${wl(amt,cur)}</div>`;
  h+=`<div class="rc-g">${row('method',mn?esc(Lt(RM[rv('method')])+(rv('ref')?' — '+rv('ref'):'')):'')}${row('inv',esc(rv('inv')))}${row('bl',esc(rv('bl')))}</div>`+row('for',esc(rv('for')));
  if(gd){let q=0,w=0;const rows=it.map((x,k)=>{q+=num(x.q);w+=num(x.w);return `<tr><td>${k+1}</td><td>${esc(x.d)}</td><td>${esc(x.q)}</td><td>${esc(x.w)}</td><td>${esc(x.nt||Lt(x.c==='n'?RTX.rem:RTX.good))}</td></tr>`}).join('');
    h+=`<table class="rc-tb"><thead><tr><th>#</th><th>${L(...RTX.desc)}</th><th>${L(...RTX.qty)}</th><th>${L(...RTX.wt)}</th><th>${L(...RTX.cond)}</th></tr></thead><tbody>${rows||'<tr><td colspan="5">&nbsp;</td></tr>'}</tbody><tfoot><tr><td></td><td>${L(...RTX.tot)}</td><td>${q%1?f(q):q}</td><td>${f(w)}</td><td></td></tr></tfoot></table>`}
  h+=row('notes',esc(rv('notes')));
  if(vd&&rv('why'))h+=`<div class="rc-row"><span>${_t("سبب الإلغاء")}</span><b>${esc(rv('why'))}</b></div>`;
  h+=`<div class="rc-sig"><div><span>${L(...RTX.giver)}</span><i></i><span>${esc(rv('from'))}</span></div><div class="rc-st"><img src="${$('stampImg').getAttribute('src')||''}" alt=""></div><div><span>${L(...RTX.taker)}</span><i></i><span>${esc(rv('emp'))}</span></div></div>`;
  h+=`<div class="rc-ft"><div class="rqr"></div><div>${esc($('foot').value)}${$('foot').value?'<br>':''}<b>Portist Lojistik</b> · Import &amp; Export</div></div>`;
  if(vd)h+=`<div class="rc-void">${esc(Lt(RTX.void))}</div>`;
  return h+'</div>'}
rcCopy=withDoc(rcCopy);
function invData(c){return LS.get('pst_inv',{})[c]||LISTD[c]||null}
function rInvInfo(){const c=rv('inv').trim(),el=$('r_invinfo');if(!c||/[,+]/.test(c)){el.innerHTML='';return}const d=invData(c);
  if(!d){el.innerHTML=(_t("الفاتورة")+" ")+esc(c)+(" "+_t("غير موجودة في الفواتير المحفوظة")+".");return}
  const rm=Math.max(0,num(d.t)-num(d.pd));
  el.innerHTML=(_t("الفاتورة")+" ")+esc(c)+' — '+esc(d.rcv||'')+(" — "+_t("الإجمالي")+" <b>")+f(num(d.t))+' '+esc(d.cur||'')+("</b> — "+_t("المتبقي")+" <b>")+f(rm)+'</b> <button class="b2" type="button" id="r_fill" data-rm="'+rm+'" data-cur="'+esc(d.cur||'')+("\">"+_t("تعبئة المبلغ بالمتبقي")+"</button>")}
function refInv(){const ks=Object.keys(Object.assign({},LISTD,LS.get('pst_inv',{})));$('rinv').innerHTML=ks.map(k=>`<option value="${esc(k)}">`).join('')}
function rdraw(){
  const t=rv('type');{const x=rfit();document.body.classList.toggle('rfit',x);document.documentElement.classList.toggle('rfit',x)}LS.set('pst_rpage',rv('page'));
  document.querySelectorAll('#rform [data-k="m"]').forEach(e=>e.style.display=t==='goods'?'none':'');
  $('r_goods').style.display=t==='money'?'none':'';
  $('rpaper').innerHTML=rcCopy(0,'one');
  document.querySelectorAll('#rpaper .rqr').forEach(el=>{try{const a=r2(rv('amt')),c=rv('cur'),q=qrcode(0,'M');q.addData('PORTIST|'+rv('no')+'|'+rv('date')+'|'+a.toFixed(2)+c+'|'+hash({code:rv('no'),date:rv('date'),t:a,cur:c}));q.make();el.innerHTML=q.createSvgTag(2,0)}catch(e){el.innerHTML=''}});
  rInvInfo();rAllocTick();
}
function ritems(){$('r_itb').innerHTML=R.items.map((x,i)=>`<div class="cr" data-i="${i}"><input data-f="d" placeholder="${_t("وصف الصنف")}" value="${esc(x.d)}" style="flex:2;max-width:none"><input data-f="q" type="number" step="any" placeholder="${_t("العدد")}" value="${esc(x.q)}" style="width:70px"><input data-f="w" type="number" step="any" placeholder="${_t("الوزن كغ")}" value="${esc(x.w)}" style="width:85px"><select data-f="c"><option value="">${_t("سليمة")}</option><option value="n"${x.c==='n'?' selected':''}>${_t("بها ملاحظة")}</option></select><input data-f="nt" placeholder="${_t("ملاحظة الحالة")}" value="${esc(x.nt)}" style="width:130px"><button type="button" class="ib dl" data-rm="${i}" title="${_t("حذف الصنف")}">${IC.del}</button></div>`).join('')}
function rsnap(){const o={};RK.forEach(k=>o[k]=rv(k));o.void=rid('void').checked;o.items=JSON.parse(JSON.stringify(R.items));o.alApplied=Object.entries(R.alApplied||{}).map(([inv,amt])=>{const e={inv:inv,amt:amt},ic=R.alIcu[inv];if(ic&&ic!==(rv('cur')||'$')){e.icu=ic;e.cv=R.alCv[inv];const x=R.alx[inv]||{};if(num(x.eq)>0)e.eq=x.eq;else if(num(x.rate)>0)e.rate=x.rate}const cv0=e.cv!=null?num(e.cv):num(amt),old=R.alSv&&R.alSv[inv];let f=null;if(old&&Math.abs(num(old.amt)-num(amt))<.005&&Math.abs(num(old.cv)-cv0)<.005)f=old;else{f=rcFxSv(inv,num(amt),rv('cur')||'$');R.alSv=R.alSv||{};if(f)R.alSv[inv]={amt:amt,cv:cv0,sv:f.sv,scu:f.scu,est:f.est};else delete R.alSv[inv]}if(f&&f.sv!=null){e.sv=f.sv;e.scu=f.scu;if(f.est)e.est=1}return e});o.applied=o.alApplied.length>0;o.lang=S.lang;o.ts=Date.now();o.code=o.no;o.rcv=o.from;o.t=r2(o.amt);o.st=o.void?'void':'valid';o.pd=0;return o}
function rload(d){RK.forEach(k=>rid(k).value=d[k]==null?'':d[k]);rid('void').checked=!!d.void;rid('apply').checked=false;R.items=JSON.parse(JSON.stringify(d.items&&d.items.length?d.items:[{}]));R.applied=!!d.applied;R.alApplied=rcAlMap(d);R.alCv=rcCvMap(d);R.alIcu={};R.alx={};R.alSv={};rcEnt(d).forEach(e=>{if(e.sv!=null)R.alSv[e.inv]={amt:e.amt,cv:e.cv!=null?e.cv:e.amt,sv:e.sv,scu:e.scu,est:e.est};if(e.icu){R.alIcu[e.inv]=e.icu;R.alx[e.inv]={rate:e.rate||'',eq:e.eq||''}}});R.al=Object.assign({},R.alApplied);R.alTouched=true;R.sig='';if(d.lang&&d.lang!==S.lang)setLang(d.lang);ritems();rdraw();loadAll().then(()=>{if(S.mode==='r'){R.sig='';rAllocTick()}})}
function rnew(){['from','phone','amt','ref','for','inv','bl','notes','why'].forEach(k=>rid(k).value='');rid('type').value='money';rid('method').value='cash';rid('void').checked=false;rid('apply').checked=false;R.items=[{}];R.applied=false;R.opened='';R.al={};R.alApplied={};R.alCv={};R.alIcu={};R.alx={};R.alSv={};R.alTouched=false;R.sig='';R.autoAmt='';R.fromStmt=null;R.fromShip=null;R.prio=[];
  rid('date').value=todayStr();rid('no').value=rnextNo();rid('cur').value=$('cur').value||'$';rid('page').value=LS.get('pst_rpage','fit');
  if(CL.u())api('rnext').then(j=>{rid('no').value=j.code;rdraw()}).catch(()=>{});ritems();rdraw()}
