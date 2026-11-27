/* ===== توزيع الدفعات على الفواتير ===== */
const rcAlMap=d=>{const m={};if(Array.isArray(d.alApplied)){d.alApplied.forEach(x=>m[x.inv]=r2((m[x.inv]||0)+num(x.amt)))}else if(d.applied&&String(d.inv||'').trim()){m[String(d.inv).trim()]=num(d.t!=null?d.t:d.amt)}return m};
const rcEnt=d=>Array.isArray(d.alApplied)?d.alApplied:[];
/* قيمة القبض بعملة الشحنة وقت الحفظ (لحساب فروق العملة المحققة): تُسجَّل فقط عندما تكون الفاتورة بعملة غير عملة الشحنة */
function rcFxSv(code,amt,rc){const d=shAI()[code]||lsInv()[code];if(!d||!d.ship||!(amt>0))return null;const h=(SHS.get()||{})[d.ship];if(!h)return null;const S=h.cur||'$',ic=d.cur||'$';if(ic===S)return null;if(rc===S)return{sv:r2(amt),scu:S,est:0};const r=curRate(rc,S);return r>0?{sv:r2(amt*r),scu:S,est:1}:null}
function rcSvMap(){const Rc=Object.assign({},RCL(),(typeof ALL!=='undefined'&&ALL&&ALL.Rc)||{}),m={};Object.keys(Rc).forEach(k=>{const d=Rc[k];if(!d||d.void||d.st==='void'||!Array.isArray(d.alApplied))return;d.alApplied.forEach(e=>{if(e.sv==null||!e.scu)return;const o=(m[e.inv]=m[e.inv]||{}),s=(o[e.scu]=o[e.scu]||{sv:0,cv:0,est:0});s.sv=r2(s.sv+num(e.sv));s.cv=r2(s.cv+(e.cv!=null?num(e.cv):num(e.amt)));if(e.est)s.est=1})});return m}
const rcCvMap=d=>{const m=rcAlMap(d);if(!Array.isArray(d.alApplied))return m;const o={};d.alApplied.forEach(x=>o[x.inv]=r2((o[x.inv]||0)+(x.cv!=null?num(x.cv):num(x.amt))));return o};
const rcFor=d=>rcEnt(d).filter(x=>x.icu&&x.icu!==(d.cur||'$'));
function rConv(k,amt){const x=R.alx[k]||{},eq=num(x.eq),r=num(x.rate);return eq>0?r2(eq):r>0?r2(amt*r):null}
const rcIsMoney=d=>d.type!=='goods',rcValid=d=>!(d.void||d.st==='void');
const rcUn=d=>{if(!rcValid(d)||!rcIsMoney(d))return 0;return Math.max(0,r2(num(d.t)-Object.values(rcAlMap(d)).reduce((a,b)=>a+b,0)))};
const isNote=d=>!!d&&(d.note==='cr'||d.note==='db');
let CRC={ref:null,v:-1,m:null};
function crMap(AI){AI=AI||shAI();if(CRC.ref===AI&&CRC.v===IXV)return CRC.m;const m={};for(const k in AI){const x=AI[k];if(x&&x.note==='cr'&&x.ref&&x.st!=='void'&&(x.st||'draft')!=='draft')m[x.ref]=r2((m[x.ref]||0)+Math.abs(num(x.t)))}CRC={ref:AI,v:IXV,m:m};return m}
const invCr=code=>crMap()[code]||0,invRem=(code,d)=>r2(num(d.t)-num(d.pd)-invCr(code)),hasNotes=k=>Object.values(shAI()).some(x=>x&&isNote(x)&&x.ref===k&&x.st!=='void');
async function adjInvoice(code,delta,no,keep){
  try{const D=LS.get('pst_inv',{});let d=D[code];
    if(CL.u()){let srv=null;try{srv=(await api('adj',{code:code,delta:delta,no:no,keep:!!keep})).d}catch(e){if(!/أمر غير معروف/.test(e.message)){msg((_t("تعذر تحديث الفاتورة")+" ")+code+': '+e.message);return false}}
      if(srv){D[code]=srv;LS.set('pst_inv',D);if($('code').value===code)S.bv=+srv.ver||0;if(ALL&&ALL.I)ALL.I[code]=Object.assign({},ALL.I[code]||{},{pd:srv.pd,st:srv.st});if($('code').value===code){$('paid').value=srv.pd;$('st').value=srv.st;S.rcs=srv.rcs;calc()}return true}
      try{d=(await api('get',{code:code})).d}catch(e){}}
    if(!d){msg((_t("الفاتورة")+" ")+code+(" "+_t("غير موجودة")+" — "+_t("لم يُحدَّث المدفوع فيها")));return false}
    d.pd=Math.max(0,r2(num(d.pd)+delta));const t=num(d.t)-invCr(code);
    if((d.st||'draft')!=='draft')d.st=d.pd>=t-0.005?'paid':d.pd>0.004?'partial':'sent';
    d.rcs=(d.rcs||[]).filter(x=>x!==no).concat(keep?[no]:[]);d.ts=Date.now();
    D[code]=d;LS.set('pst_inv',D);if(ALL&&ALL.I)ALL.I[code]=Object.assign({},ALL.I[code]||{},{pd:d.pd,st:d.st});
    if(CL.u())await api('save',{code:code,d:d,isNew:false});
    if($('code').value===code){$('paid').value=d.pd;$('st').value=d.st;S.rcs=d.rcs;calc()}
    return true}catch(e){msg((_t("تعذر تحديث الفاتورة")+" ")+code+': '+e.message);return false}}
function rAllocRows(){const A=ALL?ALL.I:LS.get('pst_inv',{}),k=cKey(rv('from')),cu=rv('cur')||'$',prim=(rv('inv').split(/[,+\s]+/)[0]||'').trim();
  return Object.keys(A).map(c=>Object.assign({},A[c],{code:c})).filter(x=>!['draft','void'].includes(x.st||'draft')&&cKey(x.rcv)===k).map(x=>({code:x.code,date:x.date||'',t:num(x.t),icu:x.cur||'$',rem:r2(num(x.t)-num(x.pd)-(crMap(A)[x.code]||0)+(R.alCv[x.code]!=null?R.alCv[x.code]:(R.alApplied[x.code]||0)))})).filter(x=>x.rem>.004||R.al[x.code]!=null)
   .sort((a,b)=>{const pr=x=>{if(x.code===prim)return -1;const i=(R.prio||[]).indexOf(x.code);return i<0?999:i};return pr(a)-pr(b)||String(a.date).localeCompare(String(b.date))})}
function rAuto(){let left=r2(rv('amt'));R.al={};const rc0=rv('cur')||'$';rAllocRows().filter(x=>x.icu===rc0).forEach(x=>{const a=Math.min(left,x.rem);if(a>.004){R.al[x.code]=r2(a);left=r2(left-a)}})}
function rAllocFill(){document.querySelectorAll('#r_alloc [data-ai]').forEach(i=>i.value=R.al[i.dataset.ai]!=null?R.al[i.dataset.ai]:'');document.querySelectorAll('#r_alloc [data-ax]').forEach(i=>{const x=R.alx[i.dataset.ax]||{};i.value=num(x.eq)>0?'':fxOut(x.rate||'')});document.querySelectorAll('#r_alloc [data-ae]').forEach(i=>{const x=R.alx[i.dataset.ae]||{};i.value=x.eq||''});rAllocSum()}
function rAllocSum(){const el=$('r_alsum');if(!el)return;const sum=r2(Object.values(R.al).reduce((a,b)=>a+num(b),0)),amt=r2(rv('amt')),un=r2(amt-sum);
  el.innerHTML='<div class="albar"><i style="width:'+(amt>0?Math.min(100,Math.round(sum/amt*100)):0)+("%\"></i></div>"+_t("الموزَّع")+" <b>")+f(sum)+("</b> "+_t("من")+" <b>")+f(amt)+'</b> '+(un>.004?("— "+_t("غير موزَّع")+" <b>")+f(un)+("</b> "+_t("يُسجَّل رصيداً دائناً للعميل")):un<-.004?("<span style=\"color:#c0392b\">— "+_t("الموزَّع أكبر من المبلغ المستلم")+"</span>"):("— "+_t("لا يوجد مبلغ غير موزَّع")));
  const codes=Object.keys(R.al).filter(k=>num(R.al[k])>.004);if(codes.length&&rid('inv').value!==codes.join(', '))rid('inv').value=codes.join(', ')}
function rAlloc(){const box=$('r_alloc'),t=rv('type'),cu0=rv('cur')||'$';R.sig=[rv('from'),rv('cur'),t].join('|');
  if(t==='goods'||!rv('from').trim()){box.innerHTML='';return}
  const rows=rAllocRows();
  box.innerHTML=("<h3>"+_t("توزيع الدفعة على فواتير العميل"))+(R.fromStmt?(" <button class=\"b2\" type=\"button\" data-ra=\"back\" style=\"float:left\">"+_t("العودة إلى كشف الحساب")+"</button>"):'')+(R.fromShip?(" <button class=\"b2\" type=\"button\" data-ra=\"ship\" style=\"float:left\">"+_t("العودة إلى الشحنة")+" ")+esc(R.fromShip)+'</button>':'')+'</h3>'+(rows.length?("<table class=\"rc-tb\"><thead><tr><th>"+_t("الفاتورة")+"</th><th>"+_t("التاريخ")+"</th><th>"+_t("الإجمالي")+"</th><th>"+_t("المتبقي")+"</th><th>"+_t("المبلغ الموزَّع")+"</th><th>"+_t("سعر الصرف / المعادل")+" "+FXSW+"</th></tr></thead><tbody>")+rows.map(x=>{const fo=x.icu!==cu0;R.alIcu[x.code]=x.icu;if(fo&&!R.alx[x.code]){const sg=curRate(cu0,x.icu);R.alx[x.code]={rate:sg?String(sg):'',eq:''}}return `<tr><td dir="ltr">${esc(x.code)}</td><td>${esc(x.date)}</td><td>${f(x.t)}${fo?' '+esc(x.icu):''}</td><td>${f(x.rem)}${fo?' '+esc(x.icu):''}</td><td><input data-ai="${esc(x.code)}" inputmode="decimal" dir="ltr"></td><td>${fo?`<span class="fxc"><input data-ax="${esc(x.code)}" inputmode="decimal" dir="ltr" placeholder="${esc(fxLbl(cu0,x.icu))}"><input data-ae="${esc(x.code)}" inputmode="decimal" dir="ltr" placeholder="${_t("أو المعادل")} (${esc(x.icu)})"></span>`:'—'}</td></tr>`}).join('')+'</tbody></table>':("<p class=\"hint\">"+_t("لا توجد فواتير غير مسدّدة لهذا العميل. سيُسجَّل المبلغ كله رصيداً دائناً يُخصم في كشف الحساب")+".</p>"))+("<div id=\"r_alsum\"></div><div class=\"cr\" style=\"border:0\"><button class=\"b2\" type=\"button\" data-ra=\"auto\">"+_t("توزيع تلقائي على الأقدم")+"</button><button class=\"b2\" type=\"button\" data-ra=\"clear\">"+_t("مسح التوزيع")+"</button></div>");
  rAllocFill()}
function rAllocTick(){const sig=[rv('from'),rv('cur'),rv('type')].join('|');
  if(R.sig!==sig){if(!R.alTouched&&rv('type')!=='goods')rAuto();rAlloc();R.autoAmt=rv('amt');return}
  if(!R.alTouched&&R.autoAmt!==rv('amt')){R.autoAmt=rv('amt');rAuto();rAllocFill()}else rAllocSum()}
async function rsave(){if(!need('rc'))return;if(rid('void').checked&&!need('rc_void'))return;const no=rv('no').trim();if(!validRc(no))return;ensureCust(rv('from'),rv('phone'));
  const amt=r2(rv('amt')),isM=rv('type')!=='goods',vd=rid('void').checked,want={};
  if(isM&&!vd)Object.entries(R.al).forEach(([k,v])=>{const a=r2(v);if(a>.004)want[k]=a});
  if(r2(Object.values(want).reduce((a,b)=>a+b,0))>amt+.004){toast((_t("الموزَّع على الفواتير أكبر من المبلغ المستلم")),'err');return}
  const rem={},ic={},rc0=rv('cur')||'$',wantCv={};rAllocRows().forEach(x=>{rem[x.code]=x.rem;ic[x.code]=x.icu});
  for(const k of Object.keys(want)){const same=ic[k]==null||ic[k]===rc0,cv=same?want[k]:rConv(k,want[k]);if(cv==null){toast(_t("أدخل سعر الصرف أو المعادل للفاتورة")+' '+k,'err');return}wantCv[k]=cv;R.alIcu[k]=ic[k]||rc0}
  for(const k of Object.keys(want)){if(rem[k]==null||wantCv[k]>rem[k]+.004){toast((_t("المبلغ الموزَّع على")+" ")+k+(" "+_t("أكبر من المتبقي فيها")),'err');return}}
  const D=RCL();let d=rsnap(),note='';
  if(CL.u()){msg((_t("جارٍ الحفظ على الخادم")+"..."));
    try{const rj=await api('rsave',Object.assign({code:no,d:d,isNew:no!==R.opened},no===R.opened?{bv:R.bv}:{}));R.opened=no;if(rj&&rj.ver!=null)R.bv=rj.ver}
    catch(e){if(e.message==='conflict'&&e.j&&e.j.d){if(confirm(_t('عُدّل هذا الوصل من جهة أخرى بعد فتحه. موافق = تحميل النسخة الحالية (تُفقد تعديلاتك غير المحفوظة)، إلغاء = إبقاء تعديلاتك على الشاشة دون حفظ.'))){rload(e.j.d);R.opened=no;msg(_t('حُمّلت النسخة الحالية من الخادم'))}else msg(_t('لم يُحفظ — الوصل تغيّر على الخادم وتعديلاتك ما زالت على الشاشة'));return}if(e.message==='exists'&&no!==R.opened&&!rsave._r){rsave._r=1;try{const n=(await api('rnext')).code;rid('no').value=n;toast(no+' '+_t('مستخدم لوصل آخر — أُعطي هذا الوصل الرقم')+' '+n);await rsave()}catch(e2){msg(e2.message)}finally{rsave._r=0}return}if(e.message==='exists'){bad(rid('no'),(_t("الرقم مستخدم لوصل آخر")+" — "+_t("غيّره ثم احفظ")));return}if(e.net)qAdd('rsave',no,Object.assign({d:d,isNew:no!==R.opened},no===R.opened?{bv:R.bv}:{}));note=(" ("+_t("تعذر الاتصال بالخادم")+": ")+e.message+(e.net?(" — "+_t("سيُرسل تلقائياً")):'')+')'}}
  D[no]=d;LS.set('pst_rc',D);R.opened=no;const m=no.match(/^RC-(\d+)$/i);if(m&&+m[1]>LS.get('pst_rseq',0))LS.set('pst_rseq',+m[1]);
  const have=Object.assign({},R.alApplied),fin=Object.assign({},have),haveCv=Object.assign({},have,R.alCv),finCv=Object.assign({},haveCv);
  for(const k of new Set(Object.keys(want).concat(Object.keys(have)))){const dl=r2((wantCv[k]||0)-(haveCv[k]||0));if(Math.abs(dl)<.005)continue;
    if(await adjInvoice(k,dl,no,!!want[k])){if(want[k]){fin[k]=want[k];finCv[k]=wantCv[k]}else{delete fin[k];delete finCv[k]}}}
  R.alApplied=fin;R.alCv=finCv;d=rsnap();D[no]=d;LS.set('pst_rc',D);if(CL.u()){try{const rj2=await api('rsave',{code:no,d:d,isNew:false});if(rj2&&rj2.ver!=null)R.bv=rj2.ver;{const Q=QS.get();if(Q['rsave|'+no]){delete Q['rsave|'+no];QS.set(Q);qBadge()}}}catch(e){if(e.net)qAdd('rsave',no,{d:d,isNew:false})}}
  const on=Object.keys(fin),rv2=Object.keys(have).filter(k=>!fin[k]);
  if(on.length)note+=(" — "+_t("وُزّعت على")+": ")+on.map(k=>k+' ('+f(fin[k])+')').join((_t("،")+" "));
  const un=rcUn(d);if(un>.004)note+=(" — "+_t("رصيد دائن للعميل")+" ")+fm(un,rv('cur'));
  if(vd&&rv2.length)note+=(" — "+_t("عُكس أثر الوصل على الفواتير"));
  logAct(vd?'إلغاء وصل':'حفظ وصل',no+' · '+fm(amt,rv('cur')));refInv();rInvInfo();R.sig='';rAllocTick();setClean('r',true);msg((_t("تم حفظ الوصل")+" ")+no+(CL.u()?(" "+_t("على الخادم")):(" "+_t("على هذا الجهاز")))+note)}
let RLISTD={},rCloud=false;
async function rlist(){let D=RCL();rCloud=false;
  if(CL.u()){if(!LQUIET)$('rList').innerHTML=("<p>"+_t("جارٍ التحميل من الخادم")+"...</p>");try{const j=await api('rlist');D={};j.items.forEach(x=>D[x.code]=x);rCloud=true}catch(e){msg((_t("تعذر الاتصال")+": ")+e.message+(" — "+_t("تُعرض وصولات هذا الجهاز")))}}
  RLISTD=D;rdrawList()}
function rdrawList(){const q=$('rq').value.trim().toLowerCase(),D=RLISTD,ks=Object.keys(D).filter(k=>!q||(k+' '+(D[k].rcv||'')).toLowerCase().includes(q)).sort((a,b)=>D[b].ts-D[a].ts);
  const head=("<div class=\"lsG lsR h\"><span>"+_t("الرقم")+"</span><span>"+_t("استلمنا من")+"</span><span>"+_t("التاريخ")+"</span><span>"+_t("المبلغ")+"</span><span>"+_t("الحالة")+"</span><span></span></div>");
  $('rList').innerHTML=ks.length?head+ks.map(k=>{const d=D[k],vd=d.st==='void';
    return `<div class="lsG lsR"><button class="b2" data-o="${esc(k)}" style="font-weight:700"><span dir="ltr">${esc(k)}</span></button><span data-l="${_t("استلمنا من")}"><b>${esc(d.rcv||'—')}</b></span><span data-l="${_t("التاريخ")}" dir="ltr" class="mu" style="text-align:start">${esc(d.date||'—')}</span><span data-l="${_t("المبلغ")}"><b${vd?' style="text-decoration:line-through"':''}>${fm(num(d.t),esc(d.cur||''))}</b></span><span data-l="${_t("الحالة")}">${vd?("<span class=\"bd\" style=\"background:#fdeaed;color:#c0392b\">"+_t("ملغى")+"</span>"):("<span class=\"bd s-paid\">"+_t("مسجَّل")+"</span>")}</span><span class="acts"><button class="b2" data-o="${esc(k)}">${_t("فتح")}</button><button class="b2" data-c="${esc(k)}">${_t("نسخ")}</button></span></div>`}).join(''):("<div class=\"empty\">"+_t("لا توجد وصولات مطابقة")+".</div>")}
function setMode(m){if(m==='g'&&typeof curSet==='function')setTimeout(curSet,0);S.mode=m;const nav=m==='h'||m==='a'||m==='c'||m==='g'||m==='q';document.body.classList.toggle('mode-r',m==='r');document.body.classList.toggle('mode-h',nav);$('tabH').classList.toggle('on',m==='h');$('tabA').classList.toggle('on',m==='a'||m==='i'||m==='r');$('tabC').classList.toggle('on',m==='c'||m==='s');$('tabI').classList.toggle('on',m==='i');$('tabR').classList.toggle('on',m==='r');$('hwrap').style.display=m==='h'?'':'none';$('awrap').style.display=m==='a'?'':'none';$('cwrap').style.display=m==='c'?'':'none';$('gwrap').style.display=m==='g'?'':'none';$('qwrap').style.display=m==='q'?'':'none';document.body.classList.toggle('qprev',document.body.classList.contains('quick')&&(m==='i'||m==='r'));if(m==='h'||m==='a'||m==='c')LS.set('pst_land',m);
  document.body.classList.toggle('mode-s',m==='s');$('iwrap').style.display=m==='i'?'':'none';$('rwrap').style.display=m==='r'?'':'none';$('swrap').style.display=m==='s'?'':'none';{const x=rfit();document.body.classList.toggle('rfit',x);document.documentElement.classList.toggle('rfit',x)}setLand(S.land);if(m==='r'){refInv();rdraw();loadAll().then(()=>{if(S.mode==='r'){R.sig='';rAllocTick()}})}if(m==='h')shDraw();if(m==='a')accInit();if(m==='c')cPage();if(m==='q')qInit();sideSync();fitZoom();upd()}
const DIRTY={i:false,r:false},SAVED={i:false,r:false};
function upd(){const el=$('saveState'),m=S.mode,d=DIRTY[m];if(m==='h'||m==='a'||m==='c'||m==='g'||m==='q'){el.className='ss';el.textContent='';return}if(m==='s'){el.className='ss';el.textContent=(_t("كشف حساب"));return}el.className='ss '+(d?'dirty':SAVED[m]?'ok':'');el.textContent=d?("● "+_t("تعديلات غير محفوظة")):SAVED[m]?("✓ "+_t("محفوظ")):(m==='r'?(_t("وصل جديد")):(_t("فاتورة جديدة")))}
function setClean(m,saved){DIRTY[m]=false;SAVED[m]=saved;upd()}
function markDirty(){DIRTY[S.mode]=true;upd()}
function toast(t,k){const el=$('toast');el.textContent=t;el.className='toast show '+(k||(/^تم|✓/.test(t)?'ok':/تعذر|فشل|مستخدم|خطأ|مطلوب|أكبر|اكتب|أضف|غير موجود|تنبيه|⚠|✗/.test(t)?'err':''));clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),4200)}
function bad(el,m){const f=el.closest('.field')||el.closest('label')||el.parentElement;f.classList.add('bad');let e=f.querySelector('.fe');if(!e){e=document.createElement('small');e.className='fe';f.appendChild(e)}e.textContent=m;try{el.focus();el.scrollIntoView({block:'center',behavior:'smooth'})}catch(x){}toast(m,'err')}
function validInv(code){
  if(!code){bad($('code'),(_t("كود الفاتورة مطلوب")));return false}
  if(!$('rcv').value.trim()){bad($('rcv'),(_t("اسم المستلم مطلوب")));return false}
  if(!$('date').value){bad($('date'),(_t("التاريخ مطلوب")));return false}
  if(!S.total&&!S.rows.some(r=>r.name&&r.name.trim())){toast((_t("أضف بنداً واحداً على الأقل")),'err');const i=document.querySelector('#rows input');i&&i.focus();return false}
  if(S.total<0){toast((_t("الإجمالي بالسالب")+" — "+_t("راجع قيمة الخصم")),'err');return false}
  if(num($('paid').value)>S.total+0.005){bad($('paid'),(_t("المدفوع أكبر من الإجمالي")));return false}
  if(!CL.u()&&S.opened&&code!==S.opened&&LS.get('pst_inv',{})[code]){bad($('code'),(_t("الكود مستخدم لفاتورة محفوظة")+" — "+_t("غيّره")));return false}
  return true}
function validRc(no){
  if(!no){bad(rid('no'),(_t("رقم الوصل مطلوب")));return false}
  if(!rv('date')){bad(rid('date'),(_t("التاريخ مطلوب")));return false}
  if(!rv('from').trim()){bad(rid('from'),(_t("اسم المُسلِّم مطلوب")));return false}
  const t=rv('type');
  if(t!=='goods'&&!(r2(rv('amt'))>0)){bad(rid('amt'),(_t("اكتب مبلغاً أكبر من صفر")));return false}
  if(t!=='money'&&!R.items.some(x=>x.d&&x.d.trim())){toast((_t("أضف صنفاً واحداً على الأقل")),'err');const i=document.querySelector('#r_itb input[data-f="d"]');i&&i.focus();return false}
  if(!CL.u()&&no!==R.opened&&RCL()[no]){bad(rid('no'),(_t("الرقم مستخدم لوصل محفوظ")+" — "+_t("غيّره")));return false}
  return true}
IC.edit=sv('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>');
const CU={get:()=>LS.get('pst_cust',{}),set:v=>LS.set('pst_cust',v)};
const nk=n=>String(n==null?'':n).replace(/[ً-ٟـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim().toLowerCase();
const newCid=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
/* هوية العميل: الاسم الحالي + الأسماء البديلة (الأسماء القديمة بعد إعادة التسمية) تشير كلها إلى معرّف واحد */
let CKM={v:-1,m:null};
const byCode=v=>{const k=nk(v);if(!k)return null;return Object.values(CU.get()).find(c=>c.code&&nk(c.code)===k)||null};
function resolveCust(v){const k=nk(v);if(!k)return[];const C=Object.values(CU.get()),ex=findCust(v)||byCode(v);if(ex)return[ex];return C.filter(c=>nk([c.name].concat(c.aliases||[],[c.code||'',c.phone||'']).join(' ')).includes(k))}
function custMap(){if(CKM.v===IXV)return CKM.m;const m={},C=CU.get();Object.keys(C).forEach(id=>{const c=C[id];[c.name].concat(c.aliases||[]).forEach(n=>{const k=nk(n);if(k&&!m[k])m[k]=id})});CKM={v:IXV,m:m};return m}
const cKey=n=>{const k=nk(n);return custMap()[k]||k};
function findCust(n){const k=nk(n);if(!k)return null;const id=custMap()[k];return id?CU.get()[id]||null:null}
function ensureCust(n,ph,cr){n=String(n||'').trim();if(!n)return;const D=CU.get(),c=findCust(n);cr=String(cr||'').trim();
  {const bc=cr&&!c?byCode(cr):null;if(bc){D[bc.id].aliases=(D[bc.id].aliases||[]).concat([n]);CU.set(D);refCust();return}}
  if(!c){const id=newCid();D[id]={id:id,name:n,phone:ph||'',code:cr,addr:'',notes:'',ts:Date.now()}}
  else if(cr&&!c.code&&!byCode(cr)){D[c.id].code=cr}
  else if(ph&&!c.phone){D[c.id].phone=ph}else return;
  CU.set(D);refCust()}
function refCust(){$('custs').innerHTML=Object.values(CU.get()).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${esc(c.name)}">${esc(c.phone||'')}</option>`+(c.code?`<option value="${esc(c.code)}">${esc(c.name)}</option>`:'')).join('')}
let ALL=null;
async function loadAll(){const I=Object.assign({},LS.get('pst_inv',{})),Rc=Object.assign({},RCL());
  if(CL.u()){const Qa=QS.get(),prune=SRV.on&&!LS.get('pst_keep',0);try{const L1=(await api('list')).items;if(prune){const h=new Set(L1.map(x=>x.code));Object.keys(I).forEach(k=>{if(!h.has(k)&&!Qa['save|'+k])delete I[k]})}L1.forEach(x=>I[x.code]=Object.assign({},I[x.code]||{},x))}catch(e){msg((_t("تعذر الاتصال بالخادم")+" — "+_t("تُعرض بيانات هذا الجهاز")))}
    try{const L2=(await api('rlist')).items;if(prune){const h=new Set(L2.map(x=>x.code));Object.keys(Rc).forEach(k=>{if(!h.has(k)&&!Qa['rsave|'+k])delete Rc[k]})}L2.forEach(x=>Rc[x.code]=Object.assign({},Rc[x.code]||{},x))}catch(e){}
    const need=Object.keys(Rc).filter(k=>Rc[k].items===undefined);for(let i=0;i<need.length;i+=6)await Promise.all(need.slice(i,i+6).map(async k=>{try{Object.assign(Rc[k],(await api('rget',{code:k})).d,{code:k})}catch(e){}}))}
  return ALL={I:I,Rc:Rc}}
function docsOf(c,A){const ck=c.code?nk(c.code):'',cmp=(a,b)=>String(a.date).localeCompare(String(b.date));
  const inv=Object.keys(A.I).map(x=>Object.assign({},A.I[x],{code:x})).filter(d=>cKey(d.rcv)===c.id||(ck&&nk(d.cref)===ck)).sort(cmp),ic=new Set(inv.map(x=>x.code));
  const rc=Object.keys(A.Rc).map(x=>Object.assign({},A.Rc[x],{code:x})).filter(d=>{if(cKey(d.rcv)===c.id)return true;try{return Object.keys(rcAlMap(d)).some(k=>ic.has(k))}catch(e){return false}}).sort(cmp);
  const cons=[];Object.values(SHS.get()).forEach(h=>(h.cons||[]).forEach(x=>{if(cKey(x.cust)===c.id)cons.push({h:h,c:x})}));
  cons.sort((a,b)=>String(b.h.date||b.h.ts||'').localeCompare(String(a.h.date||a.h.ts||'')));
  return{inv:inv,rc:rc,cons:cons}}
function sumOf(d){const M={},g=cu=>M[cu||'$']||(M[cu||'$']={tot:0,paid:0,rc:0,cr:0});
  d.inv.forEach(x=>{const st0=x.st||'draft';if(st0==='draft'||st0==='void')return;const m=g(x.cur);m.tot+=num(x.t);m.paid+=num(x.pd)});
  d.rc.forEach(x=>{if(!rcValid(x)||!rcIsMoney(x))return;const m=g(x.cur);m.rc+=num(x.t);m.cr+=rcUn(x)});
  Object.values(M).forEach(m=>m.bal=r2(m.tot-m.paid-m.cr));return M}
function cDraw(){const q=nk($('cq').value),A=ALL||{I:{},Rc:{}},C=Object.values(CU.get()).filter(c=>!q||nk(c.name+' '+(c.aliases||[]).join(' ')+' '+(c.code||'')+' '+c.phone).includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  const head=("<div class=\"lsG lsC h\"><span>"+_t("العميل")+"</span><span>"+_t("كود العميل")+"</span><span>"+_t("الهاتف")+"</span><span>"+_t("الرصيد")+"</span><span></span></div>");
  $('cList').innerHTML=C.length?head+C.map(c=>{const DD=docsOf(c,A),M=sumOf(DD),bal=Object.entries(M).map(([cu,m])=>({cu:cu,b:m.bal})).filter(x=>Math.abs(x.b)>.004);
    return `<div class="lsG lsC"><span><b>${esc(c.name)}</b>${(c.aliases||[]).length?`<br><span class="mu">${_t("سابقاً")}: ${esc(c.aliases.join((_t("،")+" ")))}</span>`:''}<br><span class="mu">${_t("الفواتير")}: ${DD.inv.length} · ${_t("الوصولات")}: ${DD.rc.length} · ${_t("الحمولات")}: ${DD.cons.length}</span></span><span data-l="${_t("كود العميل")}" dir="ltr" class="mu" style="text-align:start">${esc(c.code||'—')}</span><span data-l="${_t("الهاتف")}" dir="ltr" class="mu" style="text-align:start">${esc(c.phone||'—')}</span><span data-l="${_t("الرصيد")}">${bal.length?bal.map(x=>`<span class="bd ${x.b>0?'s-partial':'s-paid'}">${x.b>0?(_t("عليه")):(_t("له"))} ${fm(Math.abs(x.b),esc(x.cu))}</span>`).join(' '):("<span class=\"bd s-paid\">"+_t("لا ذمم")+"</span>")}</span><span class="acts"><button class="b2" data-st="${c.id}">${_t("كشف حساب")}</button><button class="b2" data-pm="inv" data-ni="${c.id}">${_t("فاتورة")}</button><button class="b2" data-pm="rc" data-nr="${c.id}">${_t("وصل")}</button><button class="ib" data-ed="${c.id}" title="${_t("تعديل بيانات العميل")}">${IC.edit}</button></span></div>`}).join(''):("<div class=\"empty\">"+_t("لا يوجد عملاء بعد")+".<br><span>"+_t("يُضاف العميل تلقائياً عند حفظ فاتورة أو وصل باسمه")+".</span></div>")}
async function cOpen(){if(!need('cust'))return;setMode('c')}
async function cPage(){$('cForm').style.display='none';cDraw();await loadAll();if(S.mode==='c')cDraw()}
function cEdit(id){const c=id?CU.get()[id]:{};$('cForm').style.display='';$('cf_id').value=id||'';$('cf_name').value=c.name||'';$('cf_name').readOnly=false;$('cf_phone').value=c.phone||'';$('cf_code').value=c.code||'';$('cf_addr').value=c.addr||'';$('cf_notes').value=c.notes||'';$('cf_del').style.display=id?'':'none';(id?$('cf_phone'):$('cf_name')).focus()}
function cSaveForm(){const id=$('cf_id').value,n=$('cf_name').value.trim();if(!n){bad($('cf_name'),(_t("اسم العميل مطلوب")));return}
  const D=CU.get();{const ex=findCust(n);if(ex&&ex.id!==id){bad($('cf_name'),(_t("الاسم مستخدم لعميل آخر")+": «")+ex.name+'»');return}const cc=$('cf_code').value.trim(),bc=cc&&byCode(cc);if(bc&&bc.id!==id){bad($('cf_code'),(_t("كود العميل مستخدم لعميل آخر"))+": «"+bc.name+'»');return}}
  const k=id||newCid();let al=(D[k]&&D[k].aliases||[]).slice(),nm=n;
  if(id&&nk(D[k].name)!==nk(n)){al=al.filter(a=>nk(a)!==nk(n));al.push(D[k].name);logAct('إعادة تسمية عميل',D[k].name+' ← '+n)}
  D[k]=Object.assign(D[k]||{id:k,ts:Date.now()},{id:k,name:nm,aliases:al,phone:$('cf_phone').value.trim(),code:$('cf_code').value.trim(),addr:$('cf_addr').value.trim(),notes:$('cf_notes').value.trim()});
  CU.set(D);refCust();$('cForm').style.display='none';cDraw();toast((_t("تم حفظ بيانات العميل")))}
function cDelete(){const id=$('cf_id').value,D=CU.get(),c=D[id];if(!c)return;const dd=docsOf(c,ALL||{I:{},Rc:{}});
  if(dd.inv.length||dd.rc.length||dd.cons.length){toast((_t("لا يمكن حذف عميل له فواتير أو وصولات أو حمولات")),'err');return}
  const b=$('cf_del');if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("تأكيد الحذف؟"));setTimeout(()=>{b.dataset.arm='';b.textContent=(_t("حذف العميل"))},3000);return}
  b.dataset.arm='';b.textContent=(_t("حذف العميل"));delete D[id];CU.set(D);refCust();$('cForm').style.display='none';cDraw()}
function guardNew(b,kind){if(DIRTY[kind]&&!b.dataset.arm){b.dataset.arm='1';const o=b.textContent;b.textContent=(_t("سيُفرَّغ النموذج")+" — "+_t("اضغط للتأكيد"));setTimeout(()=>{b.dataset.arm='';b.textContent=o},3500);return false}b.dataset.arm='';return true}
const SX={cust:['العميل','Customer','Müşteri'],phone:['هاتف','Phone','Telefon'],addr:['العنوان','Address','Adres'],inv:['الفواتير','Invoices','Faturalar'],rc:['الوصولات المستلمة','Receipts','Makbuzlar'],tot:['إجمالي الفواتير','Total invoiced','Toplam fatura'],paid:['المدفوع','Paid','Ödenen'],bal:['الرصيد المستحق','Balance due','Kalan bakiye'],rcv:['إجمالي الوصولات المستلمة','Receipts total','Makbuz toplamı'],code:['الرقم','No.','No'],date:['التاريخ','Date','Tarih'],st:['الحالة','Status','Durum'],amt:['المبلغ','Amount','Tutar'],ref:['البيان','Reference','Açıklama'],left:['المتبقي','Balance','Kalan'],none:['لا توجد حركات','No records','Kayıt yok'],note:['لا تشمل المسودات','Drafts excluded','Taslaklar hariç'],pr:['تاريخ الإصدار','Issued','Düzenleme tarihi']};
function ledgerOf(d,cu){const E=[],al={};
  d.rc.forEach(x=>{if(rcValid(x)&&rcIsMoney(x))Object.entries(rcCvMap(x)).forEach(([k,v])=>al[k]=(al[k]||0)+v)});
  d.inv.forEach(x=>{if((x.cur||'$')!==cu)return;const vd0=x.st==='void',dr=(x.st||'draft')==='draft'||vd0;
    E.push({date:x.date||'',k:0,code:x.code,desc:(x.note==='cr'?L('إشعار دائن','Credit note','Alacak dekontu'):x.note==='db'?L('إشعار مدين','Debit note','Borç dekontu'):L('فاتورة','Invoice','Fatura'))+(x.ref?' · '+esc(x.ref):'')+(x.ship?' · '+L('شحنة','Shipment','Sevkiyat')+' '+esc(x.ship):''),dr:dr?0:(x.note==='cr'?0:num(x.t)),cr:(!dr&&x.note==='cr')?Math.abs(num(x.t)):0,muted:dr,vd:vd0,sub:vd0?L('ملغاة، لا تدخل في الرصيد','Canceled, not counted','İptal'):dr?L('مسودة، لا تدخل في الرصيد','Draft, not counted','Taslak'):''});
    const man=r2(num(x.pd)-(al[x.code]||0));if(!dr&&man>.004)E.push({date:x.date||'',k:1,code:'',desc:L('دفعة مسجلة على الفاتورة','Payment recorded on invoice','Faturaya kaydedilen ödeme')+' '+esc(x.code)+' '+L('بدون وصل','without receipt','makbuzsuz'),dr:0,cr:man})});
  d.rc.forEach(x=>{if(rcIsMoney(x)&&rcValid(x)&&(x.cur||'$')!==cu){const fe=rcFor(x).filter(e=>e.icu===cu);if(fe.length)E.push({date:x.date||'',k:2,code:x.code,desc:L('وصل استلام بعملة','Receipt in','Makbuz para birimi')+' '+esc(x.cur||'$')+(x.method&&RM[x.method]?' — '+esc(Lt(RM[x.method])):''),cr:r2(fe.reduce((a,e)=>a+num(e.cv!=null?e.cv:e.amt),0)),dr:0,sub:L('موزَّع على','Applied to','Dağıtım')+': '+fe.map(e=>esc(e.inv)+' ('+f(num(e.amt))+' '+esc(x.cur||'$')+' → '+f(num(e.cv))+' '+esc(cu)+')').join((_t('،')+' '))});return}
  if((x.cur||'$')!==cu||!rcIsMoney(x))return;const v=rcValid(x),m=rcAlMap(x),un=rcUn(x),ks=Object.keys(m),fa=rcFor(x).reduce((a,e)=>a+num(e.amt),0);
    E.push({date:x.date||'',k:2,code:x.code,desc:L('وصل استلام','Receipt','Makbuz')+(x.method&&RM[x.method]?' — '+esc(Lt(RM[x.method])):''),cr:v?r2(num(x.t)-fa):0,dr:0,muted:!v,vd:!v,
      sub:!v?L('ملغى','Void','İptal'):(ks.length?L('موزَّع على','Applied to','Dağıtım')+': '+ks.map(k=>esc(k)+' ('+f(m[k])+')').join((_t("،")+" ")):'')+(un>.004?(ks.length?' · ':'')+L('غير موزَّع','Unallocated','Dağıtılmamış')+' '+f(un)+' ('+L('رصيد دائن','credit','alacak')+')':'')});
  });
  E.sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.k-b.k||String(a.code).localeCompare(String(b.code)));
  let run=0;E.forEach(e=>{run=r2(run+e.dr-e.cr);e.bal=run});return E}
ledgerOf=withDoc(ledgerOf);
function sDraw(){$('bSPay').style.display=S.sheetFn?'none':'';if(S.sheetFn){$('spaper').innerHTML=S.sheetFn();return}const X=S.stmt;if(!X)return;const c=X.c,d=X.d,M=sumOf(d),T=k=>L(...SX[k]),today=new Date().toISOString().slice(0,10);
  let h=`<header><img src="${document.querySelector('header img').src}" alt=""><div class="title"><h1>STATEMENT</h1><p>${L('كشف حساب','Account statement','Hesap ekstresi')}</p></div></header>`;
  h+=`<div class="st-cu"><div><span>${T('cust')}</span><b>${esc(c.name)}</b></div>${c.code?`<div><span>${L('كود العميل','Customer code','Müşteri kodu')}</span><b dir="ltr">${esc(c.code)}</b></div>`:''}${c.phone?`<div><span>${T('phone')}</span><b dir="ltr">${esc(c.phone)}</b></div>`:'<div></div>'}<div><span>${T('pr')}</span><b>${today}</b></div>${c.addr?`<div class="w2"><span>${T('addr')}</span><b>${esc(c.addr)}</b></div>`:''}</div>`;
  const ents=Object.entries(M);
  h+=ents.length?ents.map(([cu,m])=>{const neg=m.bal<-.004;return `<div class="st-cards" style="grid-template-columns:repeat(${m.cr>.004?4:3},1fr)"><div class="st-c"><span>${T('tot')} (${esc(cu)})</span><b>${f(m.tot)}</b></div><div class="st-c"><span>${T('paid')}</span><b>${f(m.paid)}</b></div>${m.cr>.004?`<div class="st-c"><span>${L('دفعات غير موزعة','Unallocated payments','Dağıtılmamış ödemeler')}</span><b>${f(m.cr)}</b></div>`:''}<div class="st-c due"><span>${neg?L('رصيد دائن للعميل','Credit balance','Müşteri alacağı'):T('bal')}</span><b>${fm(Math.abs(m.bal),esc(cu))}</b></div></div>`}).join(''):`<p class="st-n">${T('none')}</p>`;
  ents.forEach(([cu])=>{const E=ledgerOf(d,cu);if(!E.length)return;
    h+=`<h3 class="st-h">${L('كشف الحركة','Statement of movements','Hesap hareketleri')} (${esc(cu)})</h3><table class="rc-tb lg-tb"><thead><tr><th>${T('date')}</th><th>${T('code')}</th><th>${L('البيان','Description','Açıklama')}</th><th>${L('مدين','Debit','Borç')}</th><th>${L('دائن','Credit','Alacak')}</th><th>${L('الرصيد','Balance','Bakiye')}</th></tr></thead><tbody>${E.map(e=>`<tr class="${e.muted?'mu':''} ${e.vd?'vd':''}"><td>${esc(e.date)}</td><td dir="ltr">${esc(e.code||'')}</td><td>${e.desc}${e.sub?`<small>${e.sub}</small>`:''}</td><td>${e.dr?f(e.dr):''}</td><td>${e.cr?f(e.cr):''}</td><td>${e.muted?'':f(e.bal)}</td></tr>`).join('')}</tbody></table>`});
  h+=`<p class="st-n" style="margin-top:8px">${L('الفواتير','Invoices','Faturalar')}: ${d.inv.length} · ${L('الوصولات المستلمة','Receipts','Makbuzlar')}: ${d.rc.length} · ${L('الحمولات','Consignments','Yükler')}: ${(d.cons||[]).length}</p>`;
  if((d.cons||[]).length)h+=`<h3 class="st-h">${L('الحمولات','Consignments','Yükler')}</h3><table class="rc-tb lg-tb"><thead><tr><th>${L('الشحنة','Shipment','Sevkiyat')}</th><th>${L('الحالة','Status','Durum')}</th><th>${L('البضاعة','Goods','Mal')}</th><th>${L('الطرود','Packages','Koli')}</th><th>CBM</th><th>${L('المسلَّم','Delivered','Teslim')}</th><th>${L('الفواتير','Invoices','Faturalar')}</th><th>${L('الشحن','Freight','Navlun')}</th></tr></thead><tbody>${d.cons.map(({h:sh,c:cn})=>{const hh=Object.assign({},sh,{cons:sh.cons||[]}),fx=num(sh.freight)?shShares(hh)[hh.cons.indexOf(cn)]:null,iv=consInvs(hh,cn).map(x=>esc(x.code)).join('، ');return `<tr><td dir="ltr">${esc(sh.code)}</td><td>${esc(SHN[shStat(hh)])}</td><td>${esc(cn.goods||'—')}</td><td>${esc(cn.pk||'0')}</td><td>${esc(cn.cbm||'—')}</td><td>${pkDone(cn)}/${esc(cn.pk||'0')}</td><td dir="ltr">${iv||'—'}</td><td dir="ltr">${fx==null||isNaN(fx)?'—':f(fx)+' '+esc(sh.cur||'')}</td></tr>`}).join('')}</tbody></table>`;
  h+=`<div class="st-ft">${esc($('foot').value)}${$('foot').value?'<br>':''}<b>Portist Lojistik</b> · Import &amp; Export · ${T('note')}</div>`;
  $('spaper').innerHTML=h}
sDraw=withDoc(sDraw);
async function sOpen(id){const c=CU.get()[id];if(!c)return;toast((_t("جارٍ تجهيز كشف الحساب")+"..."));await shLoad();const A=ALL;S.sheetFn=null;S.stmt={c:c,d:docsOf(c,A)};if(S.mode!=='s')S.prev=S.mode;setMode('s');sDraw();window.scrollTo(0,0)}
$('cur').addEventListener('input',calc);

