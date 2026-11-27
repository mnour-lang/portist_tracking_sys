/* ===== هيكلة التنقل: المحاسبة / العملاء / الإعدادات ===== */
{const mvAll=(sel,to,pick)=>{const m=document.querySelector(sel),mp=m.querySelector('.mp'),ch=[...mp.children].filter(c=>!c.classList.contains('mh'));ch.forEach((c,i)=>{const t=pick?pick(c,i):to;t.appendChild(c)});m.remove()};
  mvAll('#mList',$('aInvBody'),(c,i)=>(c.tagName==='DETAILS'?(c.querySelector('#vtxt')?$('gDat'):$('gConn')):$('aInvBody')));
  mvAll('#mRList',$('aRcBody'));mvAll('#mCust',$('cBody'));
  const nm=(el,to)=>{if(!el)return;el.classList.remove('inv-only');to.appendChild(el)};
  nm($('bCols'),$('gInv'));nm($('orient').closest('label'),$('gInv'));nm($('showBank').closest('.inv-only')||$('showBank').closest('div.opts').parentElement,$('gInv'));nm(document.querySelector('label.lb[data-pm=settings]'),$('gInv'));
  nm($('bUsers'),$('gUsr'));nm($('bLog'),$('gUsr'));nm($('bAudit'),$('gDat'));nm($('bBackup'),$('gDat'));
  [...document.querySelectorAll('#moreMenu .mh2')].forEach(h=>{if(h.textContent.trim()===_t('الإعدادات')||(!h.nextElementSibling))h.remove()});
  $('bBackup').textContent=(_t("نسخة احتياطية واستيراد"));
  $('aNewInv').addEventListener('click',()=>{if(!need('inv'))return;setMode('i');newInv()});$('aNewRc').addEventListener('click',()=>{if(!need('rc'))return;setMode('r');rnew()});
  $('aTI').addEventListener('click',()=>{ACT='i';accTab('i')});$('aTR').addEventListener('click',()=>{ACT='r';accTab('r')})}


/* ===== تصدير للمحاسب ===== */
{const csvDl=(name,rows)=>{const t='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
 const inR=d=>{const a=$('acx_from').value,b=$('acx_to').value,x=String(d||'');return(!a||x>=a)&&(!b||x<=b)};
 const stT={draft:'Draft',sent:'Sent',partial:'Partial',paid:'Paid',void:'Void',issued:'Issued',valid:'Valid'};
 const D={
  inv:A=>[['Invoice No','Official Invoice No','Date','Due Date','Customer','Customer Code','Status','Currency','Total','Paid','Balance','Shipment','Doc Type','Ref Invoice']].concat(Object.keys(A.I).map(k=>Object.assign({},A.I[k],{code:k})).filter(d=>inR(d.date)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.code.localeCompare(b.code)).map(d=>{const st=d.st||'draft',live=st!=='draft'&&st!=='void',t=num(d.t),pd=num(d.pd);return[d.code,d.offno||'',d.date||'',d.due||'',d.rcv||'',d.cref||'',stT[st]||st,d.cur||'$',t,pd,live?r2(t-pd):0,d.ship||'',d.note==='cr'?'Credit note':d.note==='db'?'Debit note':'Invoice',d.ref||'']})),
  rc:A=>[['Receipt No','Date','Received From','Method','Reference','Currency','Amount','Status','Applied To','Unallocated Credit']].concat(Object.keys(A.Rc).map(k=>Object.assign({},A.Rc[k],{code:k})).filter(d=>rcIsMoney(d)&&inR(d.date)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.code.localeCompare(b.code)).map(d=>{const cv=rcCvMap(d),m=rcAlMap(d);return[d.code,d.date||'',d.from||d.rcv||'',d.method||'',d.ref||'',d.cur||'$',num(d.t),rcValid(d)?'Valid':'Void',Object.keys(m).map(k=>k+':'+m[k]+(rcFor(d).some(e=>e.inv===k)?'→'+cv[k]+' '+(rcFor(d).find(e=>e.inv===k).icu):'')).join(' | '),rcUn(d)]})),
  bal:A=>{const o=[['Customer','Customer Code','Currency','Invoiced','Paid on Invoices','Unallocated Receipts (credit)','Balance Due (+) / Credit (-)']];Object.values(CU.get()).sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{const M=sumOf(docsOf(c,A));Object.keys(M).forEach(cu=>{const m=M[cu];if(Math.abs(m.tot)+Math.abs(m.paid)+Math.abs(m.cr)>.004)o.push([c.name,c.code||'',cu,r2(m.tot),r2(m.paid),r2(m.cr),m.bal])})});return o},
  cost:()=>[['Date','Shipment','Type','Description','Supplier','Amount','Currency','Equivalent in shipment currency','Shipment currency','Allocated to','On behalf of customer','Re-billed amount','Paid (full)','Paid amount','Remaining','Paid date']].concat(ccLines().filter(x=>inR(x.date)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).map(x=>{const eq=ccEq(x);return[x.date||'',x._h,x.type||'',x.desc||'',x.sup||'',num(x.amt),x.cur||x._c,eq==null?'':eq,x._c,x.cid?((x._cons.find(c=>c.id===x.cid)||{}).cust||''):'Shared',x.rb?'yes':'no',x.rb?(x.rba===''||x.rba==null?num(x.amt):num(x.rba)):'',x.pd?'yes':'no',cstPaid(x),cstRem(x),x.pdDate||'']}))};
 const FN={inv:'invoices',rc:'receipts',bal:'customer-balances',cost:'shipment-costs'};
 async function run(k){if(!need('backup'))return;const msg=$('acx_msg');msg.textContent=_t("جارٍ التحضير")+'...';let A;try{A=await loadAll();await shLoad()}catch(e){msg.textContent=_t("تعذر جلب البيانات");return}
  const ks=k==='all'?['inv','rc','bal'].concat(can('cost')?['cost']:[]):[k];
  for(const x of ks){if(x==='cost'&&!can('cost')){need('cost');return}const rows=D[x](A);csvDl('portist-'+FN[x]+'-'+shToday()+'.csv',rows);await new Promise(r=>setTimeout(r,350));}
  logAct('تصدير للمحاسب',ks.join(','));msg.textContent=_t("تم التنزيل")+' ('+ks.length+')'}
 $('gs_acx').addEventListener('click',e=>{const b=e.target.closest('[data-acx]');if(b)run(b.dataset.acx)})}
/* ===== الإعدادات: التنقل بين الأقسام ونمط النوافذ ===== */
{const GS=[['gen','عام'],['inv','الفاتورة والطباعة'],['acc','السياسة المحاسبية'],['cur','العملات'],['usr','المستخدمون والأمان'],['dat','البيانات والنسخ الاحتياطي'],['snp','النسخ التلقائي للخادم'],['sys','سجل أخطاء النظام'],['acx','تصدير للمحاسب'],['conn','الربط بالخادم'],['dng','منطقة الخطر']];
 const hid=c=>{const pm=(c.dataset.pm||'').split(' ').filter(Boolean);return pm.some(k=>document.body.classList.contains('np-'+k))};
 const gsShow=k=>{GS.forEach(([x])=>{const c=$('gs_'+x);if(c)c.classList.toggle('gOn',x===k)});[...$('gNav').children].forEach(b=>{const on=b.dataset.g===k;b.classList.toggle('on',on);b.setAttribute('aria-current',on?'page':'false')});try{localStorage.setItem('pst_gs',k)}catch(e){}};
 window.gsDraw=()=>{const nav=$('gNav');if(!nav)return;const ok=GS.filter(([k])=>{const c=$('gs_'+k);return c&&!hid(c)});nav.innerHTML=ok.map(([k,n])=>{const d=$('gs_'+k).querySelector('.gDesc');return `<button type="button" data-g="${k}" class="${k==='dng'?'dng':''}"><b>${_t(n)}</b>${d?`<small>${esc(d.textContent)}</small>`:''}</button>`}).join('');let cur='';try{cur=localStorage.getItem('pst_gs')||''}catch(e){}if(!ok.some(([k])=>k===cur))cur=ok.length?ok[0][0]:'';gsShow(cur)};
 $('gNav').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;const c=$('gs_'+b.dataset.g);if(!c)return;gsShow(b.dataset.g);window.scrollTo(0,0)});
 const mu=()=>{document.body.classList.toggle('mui-c',LS.get('pst_mui','m')==='c')};mu();
 $('gRev').value=revPol();$('gRev').addEventListener('change',()=>{if(!can('settings')){$('gRev').value=revPol();return}LS.set('pst_revpol',$('gRev').value);toast(_t("تم حفظ السياسة المحاسبية"));if(S.mode==='p')ccDraw()});
 $('gFxDir').value=FXD()?'i':'d';$('gFxDir').addEventListener('change',()=>{if(($('gFxDir').value==='i')!==FXD())fxFlip()});
 $('gMui').value=LS.get('pst_mui','m')==='c'?'c':'m';$('gMui').addEventListener('change',()=>{LS.set('pst_mui',$('gMui').value);mu();toast(_t("تم تغيير شكل النوافذ"))});
 document.querySelectorAll('.mh>[data-close]').forEach(b=>b.setAttribute('aria-label',b.textContent.trim()||'×'));
 const _sm2=setMode;setMode=function(m){_sm2.apply(this,arguments);if(m==='g')gsDraw()}}
let ACT='i';
function accTab(t){ACT=t;$('aTI').classList.toggle('on',t==='i');$('aTR').classList.toggle('on',t==='r');$('aInvP').style.display=t==='i'?'':'none';$('aRcP').style.display=t==='r'?'':'none';$('aNewInv').style.display=t==='i'&&can('inv')?'':'none';$('aNewRc').style.display=t==='r'&&can('rc')?'':'none'}
function accInit(){if(ACT==='i'&&!can('inv')&&can('rc'))ACT='r';if(ACT==='r'&&!can('rc')&&can('inv'))ACT='i';$('aTI').style.display=can('inv')?'':'none';$('aTR').style.display=can('rc')?'':'none';accTab(ACT);
  Promise.all([can('inv')?listInv():0,can('rc')?rlist():0]).then(()=>{if(S.mode==='a')accKpi()})}
function accKpi(){const I=LISTD||{},Rc=RLISTD||{},un={};let n=0,dr=0,mo={},rm=0;const ym=todayStr().slice(0,7);
  Object.keys(I).forEach(k=>{const d=I[k],st=d.st||'draft';if(st==='draft')dr++;else if(st!=='paid'&&st!=='void'){const r=num(d.t)-num(d.pd);if(r>.004){n++;un[d.cur||'']=(un[d.cur||'']||0)+r}}});
  Object.keys(Rc).forEach(k=>{const d=Rc[k];if(d.st==='void'||!String(d.date||'').startsWith(ym))return;rm++;mo[d.cur||'']=(mo[d.cur||'']||0)+num(d.t)});
  const e=o=>Object.entries(o).map(([c,v])=>fm(v,esc(c))).join(' · ')||'0';
  $('aKpi').innerHTML=(can('inv')?`<div class="k bad"><span>${_t("غير محصّل")}</span><b>${e(un)}</b><small>${_t("من الفواتير الصادرة")}</small></div><div class="k"><span>${_t("فواتير غير مسدّدة")}</span><b>${n}</b><small>${_t("مرسلة أو مدفوعة جزئياً")}</small></div><div class="k"><span>${_t("مسودات")}</span><b>${dr}</b><small>${_t("لم تُصدر بعد")}</small></div>`:'')+(can('rc')?`<div class="k good"><span>${_t("مقبوضات هذا الشهر")}</span><b>${e(mo)}</b><small>${rm} ${_t("وصل")}</small></div>`:'')}
function landing(){LS.set('pst_quick',0);document.body.classList.remove('quick','qprev');setMode('d');return;const l='';
  if(l==='a'&&(can('inv')||can('rc'))){setMode('a');return}
  if(l==='c'&&can('cust')){setMode('c');return}
  if(!l&&!can('ship')&&!can('deliver')&&(can('inv')||can('rc'))){setMode('a');return}
  shOpen()}
/* ===== مسار العمل داخل الشحنة ===== */
function shFlow(){const box=$('shFlow');if(!box)return;if(!SH||SH._new||!SH.code){box.innerHTML='';return}
  const cons=SH.cons||[],hasC=cons.length>0,posted=!!SH.posted,inv=hasC&&cons.every(c=>consInvs(SH,c).length>0),dn=shStat(SH)==='dn';
  const st=[['cm',(_t("١. أضف الحمولات")),hasC,(_t("إدارة الحمولات")),'can:ship'],['po',(_t("٢. رحّل الشحنة")),posted,(_t("اذهب لزر الترحيل")),'can:post'],['iv',(_t("٣. أصدر الفواتير")),inv,(_t("الحمولات بلا فاتورة")),'can:inv'],['dl',(_t("٤. سلّم الحمولات")),dn,(_t("تسجيل التسليم")),'can:deliver']];
  const cur=st.findIndex(x=>!x[2]);
  box.innerHTML=st.map((x,i)=>`<div class="fl ${x[2]?'done':i===cur?'now':''}"><b>${x[2]?'✓ ':''}${x[1]}</b>${i===cur&&can(x[4].slice(4))?`<button class="b1" data-fl="${x[0]}" type="button">${x[3]}</button>`:`<small>${x[2]?(_t("تم")):i===cur?(_t("بانتظار من يملك الصلاحية")):(_t("لاحقاً"))}</small>`}</div>`).join('')}
{const fb=$('shFlow');if(fb)fb.addEventListener('click',e=>{const b=e.target.closest('[data-fl]');if(!b)return;const k=b.dataset.fl,fl=el=>{if(!el)return;el.scrollIntoView({block:'center',behavior:'smooth'});el.style.outline='3px solid var(--teal)';setTimeout(()=>el.style.outline='',1800)};
  if(k==='cm')$('sh_cm').click();else if(k==='po')fl($('sh_post'));else{fl($('shCons'));toast(k==='iv'?(_t("اضغط «فاتورة» في صف كل حمولة لا فاتورة لها")):(_t("اضغط «تسليم» في صف الحمولة المراد تسليمها")))}})}
/* ===== لغة الواجهة ===== */
function setUi(v){if(v===UIL)return;if(typeof DIRTY==='object'&&(DIRTY.i||DIRTY.r||DIRTY.s)){toast(_t('في الفاتورة المفتوحة تعديلات غير محفوظة')+' — '+_t('احفظها أولاً'),'err');document.querySelectorAll('.uiSel').forEach(s=>s.value=UIL);return}
  try{localStorage.setItem('pst_ui',JSON.stringify(v));localStorage.setItem('pst_lang',JSON.stringify(v==='en'?'en':v==='tr'?'tr':'ar'))}catch(e){}location.reload()}
document.querySelectorAll('.uiSel').forEach(s=>{s.value=UIL;s.addEventListener('change',()=>setUi(s.value))});
/* ===== الشريط الجانبي ===== */
function sideSync(){const m=S.mode,a=m==='a'?ACT:m==='i'?'i':m==='r'?'r':'',on=(id,v)=>$(id).classList.toggle('on',!!v),acc=can('inv')||can('rc');
  on('sd_d',m==='d');on('sd_p',m==='p');on('sd_h',m==='h');on('sd_a',m==='a'||m==='i'||m==='r');on('sd_ai',a==='i');on('sd_ar',a==='r');on('sd_c',m==='c'||m==='s');on('sd_g',m==='g');on('sd_x',m==='x');
  $('sd_a').style.display=acc?'':'none';$('sd_ai').style.display=can('inv')?'':'none';$('sd_ar').style.display=can('rc')?'':'none';$('sd_q').style.display=acc?'':'none';$('sd_p').style.display=can('cost')?'':'none';$('tabP').style.display=can('cost')?'':'none';
  try{$('sd_x').style.display=can('xs')?'':'none';$('tabX').style.display=can('xs')?'':'none';if(can('xs')&&SRV.on&&!XS.loaded&&!XS.loading)xsLoad()}catch(e){}$('sd_u').textContent=ME?ME.name:'';$('gUp').style.display=CL.u()?'':'none'}
{const g=(id,f)=>$(id).addEventListener('click',f);
  g('sd_d',()=>setMode('d'));g('sd_p',()=>{if(need('cost')){CCS.sh='';setMode('p')}});g('sd_h',shOpen);g('sd_a',()=>setMode('a'));g('sd_ai',()=>{ACT='i';setMode('a')});g('sd_ar',()=>{ACT='r';setMode('a')});g('sd_c',cOpen);g('sd_g',()=>setMode('g'));g('sd_q',()=>enterQuick());g('sd_out',()=>$('bLogout').click());
  g('sd_t',()=>{const c=document.body.classList.toggle('sdc');LS.set('pst_sdc',c?1:0)});if(LS.get('pst_sdc',0))document.body.classList.add('sdc');
  g('bQuick',()=>{closeMenu();enterQuick()});
  const im=$('brandImg');if(im){const sync=()=>{['brandImg2','brandImg3'].forEach(i=>{$(i).src=im.src})};sync();new MutationObserver(sync).observe(im,{attributes:true,attributeFilter:['src']})}}
/* ===== وضع فواتير سريعة ===== */
const Q={t:'i',rows:[{},{}],cols:null};
const quickCols=()=>DEF().map(c=>({name:{v:1},qty:{v:1},unit:{v:1,ns:0},amt:{v:1}}[c.id]?Object.assign(c,{v:1,ns:0}):Object.assign(c,{v:0})));
function enterQuick(){if(!can('inv')&&!can('rc'))return;document.body.classList.add('quick');LS.set('pst_quick',1);if(!can('inv'))Q.t='r';else if(!can('rc'))Q.t='i';setMode('q')}
function exitQuick(){document.body.classList.remove('quick','qprev');LS.set('pst_quick',0);const sc=LS.get('pst_cols',null);S.cols=Array.isArray(sc)&&sc.length?sc:DEF();try{render()}catch(e){}setMode(({h:'h',d:'d'})[LS.get('pst_land','h')]||'a');if(S.mode==='h')shOpen()}
function qTab(t){Q.t=t;$('qTI').classList.toggle('on',t==='i');$('qTR').classList.toggle('on',t==='r');$('qInv').style.display=t==='i'?'':'none';$('qRc').style.display=t==='r'?'':'none';$('qTI').style.display=can('inv')?'':'none';$('qTR').style.display=can('rc')?'':'none';qRecent()}
function qInit(){document.body.classList.remove('qprev');qTab(Q.t);if(!Q.rows.length)Q.rows=[{},{}];qRows();const cu=$('qi_cur');if(!cu.dataset.s){cu.dataset.s=1;cu.value=$('cur').value||'$';$('qr_cur').value=cu.value}}
const qSum=()=>r2(Q.rows.reduce((a,r)=>a+num(r.q||1)*num(r.p),0));
function qRows(){$('qi_rows').innerHTML=Q.rows.map((r,i)=>`<div class="qrow" data-i="${i}"><input class="qn" data-f="n" list="prods" placeholder="${_t("اسم الصنف / الخدمة")}" value="${esc(r.n||'')}"><input data-f="q" type="number" step="any" inputmode="decimal" placeholder="${_t("الكمية")}" value="${esc(r.q||'')}"><input data-f="p" type="number" step="any" inputmode="decimal" placeholder="${_t("سعر الوحدة")}" value="${esc(r.p||'')}">${Q.rows.length>1?`<button type="button" class="ib dl" data-rm="${i}" title="${_t("حذف")}">${IC.del}</button>`:''}<span class="qs">${_t("المبلغ")}: <b>${f(num(r.q||1)*num(r.p))}</b></span></div>`).join('');qTot()}
function qTot(){$('qi_t').textContent=f(qSum())+' '+($('qi_cur').value||'')}
{$('qi_rows').addEventListener('input',e=>{const i=e.target.closest('.qrow'),k=e.target.dataset.f;if(!i||!k)return;const r=Q.rows[+i.dataset.i];r[k]=e.target.value;if(k==='n'){const P=LS.get('pst_prod',{})[e.target.value.trim()];if(P&&!r.p&&P.unit){r.p=P.unit;i.querySelector('[data-f=p]').value=P.unit}}i.querySelector('.qs b').textContent=f(num(r.q||1)*num(r.p));qTot()});
  $('qi_rows').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b){Q.rows.splice(+b.dataset.rm,1);qRows()}});
  $('qi_add').addEventListener('click',()=>{Q.rows.push({});qRows();const L=$('qi_rows').querySelectorAll('.qn');L[L.length-1].focus()});
  $('qi_cur').addEventListener('input',qTot);$('qTI').addEventListener('click',()=>{Q.t='i';S.mode==='q'?qTab('i'):setMode('q')});$('qTR').addEventListener('click',()=>{Q.t='r';S.mode==='q'?qTab('r'):setMode('q')});$('qExit').addEventListener('click',exitQuick);
  $('qaShare').addEventListener('click',()=>$('bShare').click());$('qaPrint').addEventListener('click',()=>$('bPrint').click());
  $('qaNew').addEventListener('click',()=>{Q.rows=[{},{}];['qi_c','qi_n','qr_c','qr_a','qr_f'].forEach(i=>$(i).value='');setMode('q')});
  $('qi_go').addEventListener('click',qSaveInv);$('qr_go').addEventListener('click',qSaveRc);
  $('qRecent').addEventListener('click',e=>{const b=e.target.closest('[data-qo]');if(b)qOpen(b.dataset.qt,b.dataset.qo)})}
async function qSaveInv(){if(!need('inv'))return;const c=$('qi_c').value.trim(),rows=Q.rows.filter(r=>(r.n||'').trim()||num(r.p));
  if(!c){toast((_t("اكتب اسم العميل")),'err');$('qi_c').focus();return}
  if(!rows.length||!rows.every(r=>(r.n||'').trim()&&num(r.p)>0)){toast((_t("أكمل الأصناف: الاسم والسعر لكل صنف")),'err');return}
  const b=$('qi_go');b.disabled=true;try{
  newInv();if(CL.u()){try{$('code').value=(await api('next')).code}catch(e){}}
  S.cols=quickCols();S.rows=rows.map(r=>({name:r.n.trim(),qty:String(r.q||1),unit:String(r.p)}));
  $('rcv').value=c;$('cur').value=$('qi_cur').value||'$';$('notes').value=$('qi_n').value;$('st').value='sent';render();
  const code=$('code').value;await saveInv();
  if(S.opened!==code){return}
  setMode('i');window.scrollTo(0,0);toast((_t("تم إصدار الفاتورة")+" ")+code)}finally{b.disabled=false}}
async function qSaveRc(){if(!need('rc'))return;const c=$('qr_c').value.trim(),a=num($('qr_a').value);
  if(!c){toast((_t("اكتب اسم العميل")),'err');$('qr_c').focus();return}if(!(a>0)){toast((_t("اكتب المبلغ")),'err');$('qr_a').focus();return}
  const b=$('qr_go');b.disabled=true;try{
  rnew();if(CL.u()){try{rid('no').value=(await api('rnext')).code}catch(e){}}
  rid('from').value=c;rid('amt').value=a;rid('cur').value=$('qr_cur').value||'$';rid('method').value=$('qr_m').value;rid('for').value=$('qr_f').value;rid('type').value='money';rdraw();
  const no=rv('no');await rsave();if(R.opened!==no)return;
  setMode('r');window.scrollTo(0,0);toast((_t("تم إصدار الوصل")+" ")+no)}finally{b.disabled=false}}
async function qOpen(t,k){try{if(t==='i'){const d=await fetchInv(k);if(!d)throw new Error((_t("غير موجودة")));load(d);S.opened=k;setClean('i',true);setMode('i')}else{const d=rCloud?(await api('rget',{code:k})).d:RCL()[k];if(!d)throw new Error((_t("غير موجود")));rload(d);R.opened=k;setMode('r')}window.scrollTo(0,0)}catch(e){toast((_t("تعذر الفتح")+": ")+e.message,'err')}}
function qRecent(){const t=Q.t,src=t==='i'?Object.assign({},lsInv(),LISTD||{}):Object.assign({},RCL(),RLISTD||{}),K=Object.keys(src).sort((a,b)=>(src[b].ts||0)-(src[a].ts||0)).slice(0,6);
  $('qRecent').innerHTML=K.length?K.map(k=>`<button type="button" class="qrc" data-qt="${t}" data-qo="${esc(k)}"><span><b dir="auto">${esc(src[k].rcv||'')}</b><small dir="ltr">${esc(k)} · ${esc(src[k].date||'')}</small></span><em>${fm(num(src[k].t),esc(src[k].cur||''))}</em></button>`).join(''):("<p class=\"hint\">"+_t("لا يوجد شيء بعد")+".</p>")}
/* ===== بحث عام ===== */
function gsGo(t,id){$('gsBox').hidden=true;$('gs').value='';
  if(t==='sh'){setMode('h');shEdit(id)}
  else if(t==='iv'){(async()=>{try{const d=CL.u()?(await api('get',{code:id})).d:lsInv()[id];if(!d)throw new Error((_t("غير موجودة")));setMode('i');load(d);S.opened=id}catch(e){toast((_t("تعذر فتح الفاتورة")+": ")+e.message,'err')}})()}
  else if(t==='rc'){(async()=>{try{const d=CL.u()?(await api('rget',{code:id})).d:RCL()[id];if(!d)throw new Error((_t("غير موجود")));setMode('r');rload(d);R.opened=id}catch(e){toast((_t("تعذر فتح الوصل")+": ")+e.message,'err')}})()}
  else if(t==='cu')sOpen(id)}
function gsDo(){const q=nk($('gs').value),box=$('gsBox');if(q.length<2){box.hidden=true;return}
  const G=[],lim=6,hit=s=>nk(s).includes(q);
  if(can('ship')||can('deliver')){const L=Object.values(SHS.get()).filter(h=>hit([h.code,h.bl,h.cont,h.car,h.from,h.to,(h.cons||[]).map(c=>c.cust+' '+c.goods).join(' ')].join(' '))).slice(0,lim);if(L.length)G.push([(_t("الشحنات")),L.map(h=>['sh',h.code,h.code,[(h.bl||''),(h.cons||[]).map(c=>c.cust).slice(0,2).join((_t("،")+" "))].filter(Boolean).join(' · ')])])}
  if(can('inv')){const I=Object.assign({},lsInv(),ALL&&ALL.I||{}),L=Object.keys(I).filter(k=>hit(k+' '+(I[k].rcv||''))).slice(0,lim);if(L.length)G.push([(_t("الفواتير")),L.map(k=>['iv',k,k,(I[k].rcv||'')+' · '+fm(num(I[k].t),I[k].cur||'')])])}
  if(can('rc')){const Rc=Object.assign({},RCL(),ALL&&ALL.Rc||{}),L=Object.keys(Rc).filter(k=>hit(k+' '+(Rc[k].rcv||''))).slice(0,lim);if(L.length)G.push([(_t("الوصولات")),L.map(k=>['rc',k,k,(Rc[k].rcv||'')+' · '+fm(num(Rc[k].t),Rc[k].cur||'')])])}
  if(can('cust')){const C=Object.values(CU.get()).filter(c=>hit([c.name,(c.aliases||[]).join(' '),c.phone].join(' '))).slice(0,lim);if(C.length)G.push([(_t("العملاء")),C.map(c=>['cu',c.id,c.name,c.phone||(_t("كشف الحساب"))])])}
  box.innerHTML=G.length?G.map(([h,L])=>`<div class="gsH">${h}</div>`+L.map(x=>`<button class="gsI" type="button" data-gt="${x[0]}" data-gi="${esc(x[1])}"><span dir="auto">${esc(x[2])}</span><small>${esc(x[3])}</small></button>`).join('')).join(''):("<div class=\"gsE\">"+_t("لا نتائج مطابقة")+"</div>");box.hidden=false}
{let gt;$('gs').addEventListener('input',()=>{clearTimeout(gt);gt=setTimeout(gsDo,120)});$('gs').addEventListener('focus',()=>{if($('gs').value)gsDo()});
  $('gsBox').addEventListener('click',e=>{const b=e.target.closest('[data-gt]');if(b)gsGo(b.dataset.gt,b.dataset.gi)});
  document.addEventListener('click',e=>{if(!e.target.closest('.gsw'))$('gsBox').hidden=true});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('gs').focus();$('gs').select()}else if(e.key==='Escape'&&document.activeElement===$('gs')){$('gsBox').hidden=true;$('gs').blur()}})}

