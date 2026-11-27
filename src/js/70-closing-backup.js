/* ===== ما يحتاج إجراء ===== */
async function openInvCode(k){if(!need('inv'))return;let d=LS.get('pst_inv',{})[k];if(CL.u()){try{d=(await api('get',{code:k})).d}catch(e){}}if(!d){toast((_t("الفاتورة")+" ")+k+(" "+_t("غير موجودة")),'err');return}
  if(isNote(d)){noteView(k,d);return}
  if(DIRTY.i&&S.opened!==k){toast((_t("في الفاتورة المفتوحة تعديلات غير محفوظة")+" — "+_t("احفظها أولاً")),'err');setMode('i');return}
  setMode('i');load(d);S.opened=k;setClean('i',true);window.scrollTo(0,0)}
function shTodo(all){const AI=shAI(),today=shToday(),G=[];
  const noInv=[],arr=[],cost=[],dr=[],od=[];
  all.forEach(h=>{const st=shStat(h);if(st==='dn')return;
    h.cons.forEach(c=>{if((c.cust||'').trim()&&!consInvs(h,c).length)noInv.push({k:'ship:'+h.code,t:c.cust,s:(c.pk?c.pk+(" "+_t("طرد")+" · "):'')+iso(h.code)})});
    if(st==='ar'||st==='cu'){const left=h.cons.filter(c=>dlKey(c)!=='full').length;if(left)arr.push({k:'ship:'+h.code,t:h.code,s:SHN[st]+' · '+left+(" "+_t("حمولة بانتظار التسليم"))})}});
  all.forEach(h=>{const u={};(h.costs||[]).forEach(x=>{if(!x.pd&&num(x.amt)){const cu=x.cur||h.cur||'$';u[cu]=(u[cu]||0)+num(x.amt)}});const e=Object.entries(u);if(e.length)cost.push({k:'ship:'+h.code,t:h.code,s:(_t("غير مدفوع للموردين")+": ")+e.map(([cu,v])=>fm(v,cu)).join(' · ')})});
  Object.keys(AI).forEach(k=>{const d=AI[k],st=d.st||'draft';
    if(st==='draft')dr.push({k:'inv:'+k,t:k+' — '+(d.rcv||(_t("بدون مستلم"))),s:(_t("مسودة لم تُصدر")+" · ")+fm(num(d.t),d.cur||'')+(d.ship?' · '+iso(d.ship):''),d:d.date||''});
    else if((st==='sent'||st==='partial')&&d.due&&d.due<today&&invRem(k,d)>.004){const days=Math.floor((new Date(today)-new Date(d.due))/864e5);od.push({k:'inv:'+k,t:k+' — '+(d.rcv||''),s:(_t("المتبقي")+" ")+fm(invRem(k,d),d.cur||'')+(" · "+_t("متأخرة")+" ")+days+(" "+_t("يوم")),d:d.due})}});
  dr.sort((a,b)=>String(b.d).localeCompare(String(a.d)));od.sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  const bk=[];{const at=LS.get('pst_bk_at',0),cnt=Object.keys(AI).length+all.length;if(cnt>=3){const days=at?Math.floor((Date.now()-at)/864e5):null;if(days==null||days>=7)bk.push({k:'bk:1',t:days==null?(_t("لم تُؤخذ نسخة احتياطية من قبل")):(_t("آخر نسخة احتياطية منذ")+" ")+days+(" "+_t("يوماً")),s:(_t("بياناتك محفوظة في هذا المتصفح فقط"))+(CL.u()?(" "+_t("وعلى الخادم")):'')+(" — "+_t("صدّر نسخة من قائمة")+" ⋯")})}}
  [[(_t("نسخة احتياطية")),can('backup')?bk:[]],[(_t("حمولات بلا فاتورة صادرة")),can('inv')?noInv:[]],[(_t("فواتير مستحقة متأخرة")),can('inv')&&can('bal')?od:[]],[(_t("فواتير مسودة لم تُصدر")),can('inv')?dr:[]],[(_t("شحنات وصلت ولم تُسلَّم")),arr],[(_t("تكاليف غير مدفوعة للموردين")),can('cost')?cost:[]]].forEach(([t,L])=>{if(L.length)G.push([t,L])});
  const tot=G.reduce((a,g)=>a+g[1].length,0);
  $('shTodo').innerHTML=`<h3 class="todoH">${_t("ما يحتاج إجراء")} ${tot?`<span class="n" style="background:#fdeaed;color:#c0334b;border-radius:999px;padding:1px 10px;font-size:9.5pt">${tot}</span>`:("<span class=\"ok\">✓ "+_t("لا يوجد ما ينتظر إجراء")+"</span>")}</h3>`+(tot?'<div class="todo">'+G.map(([t,L])=>`<details${L.length<=4?' open':''}><summary><span>${t}</span><span class="n">${L.length}</span></summary>${L.slice(0,6).map(x=>`<button type="button" class="ti" data-tq="${esc(x.k)}">${esc(x.t)}<small>${esc(x.s)}</small></button>`).join('')}${L.length>6?`<div class="more">${_t("و")}${L.length-6} ${_t("أخرى")}</div>`:''}</details>`).join('')+'</div>':'')}
$('shTodo').addEventListener('click',e=>{const b=e.target.closest('[data-tq]');if(!b)return;const [t,k]=b.dataset.tq.split(/:(.+)/);if(t==='ship')shEdit(k);else if(t==='inv')openInvCode(k);else if(t==='bk'){bkInfo();rzInfo();$('mBackup').classList.add('on')}});
$('isYes').addEventListener('click',()=>{$('mIssue').classList.remove('on');$('st').value='sent';S.issueOk=true;calc();saveInv()});
$('isNo').addEventListener('click',()=>{$('mIssue').classList.remove('on');S.issueOk=true;saveInv()});

/* ===== إقفال الشحنة: المعلّقات ===== */
function shBalDue(h){const R={},seen={};(h.cons||[]).forEach(c=>consInvs(h,c).forEach(d=>{if(seen[d.code])return;seen[d.code]=1;const v=r2(num(d.t)-num(d.pd));if(v>.004){const cu=d.cur||'$';R[cu]=r2((R[cu]||0)+v)}}));return Object.entries(R)}
function shPending(h,skip){const P=[];const R={};shBalDue(h).forEach(([cu,v])=>R[cu]=(R[cu]||0)+v);const re=Object.entries(R);if(re.length&&can('bal'))P.push((_t("ذمم غير محصلة")+" ")+re.map(([cu,v])=>fm(v,cu)).join(' · '));
  const AI=shAI(),dr=[],noinv=[];h.cons.forEach(c=>{if(!(c.cust||'').trim())return;const b=consBal(h,c);if(!b.n)(b.dr?dr:noinv).push(c.cust)});
  if(noinv.length)P.push((_t("حمولات بلا فاتورة")+": ")+noinv.join((_t("،")+" ")));if(dr.length)P.push((_t("فواتير مسودة لم تُصدر")+": ")+dr.join((_t("،")+" ")));
  const U={};(h.costs||[]).forEach(x=>{if(!x.pd&&num(x.amt)){const cu=x.cur||h.cur||'$';U[cu]=(U[cu]||0)+num(x.amt)}});const ue=Object.entries(U);if(ue.length&&can('cost'))P.push((_t("تكاليف غير مدفوعة للموردين")+" ")+ue.map(([cu,v])=>fm(v,cu)).join(' · '));
  return P}
function shCloseBox(){const box=$('shClose');if(!box||!SH)return;const st=shStat(SH);if(st!=='dn'||!SH.cons.length){box.innerHTML='';return}
  const P=shPending(SH);box.innerHTML=P.length?`<div class="shClose warn"><b>${_t("الشحنة سُلّمت بالكامل، لكن بقيت معلّقات قبل اعتبارها مقفلة")}:</b><ul style="margin:0;padding-inline-start:18px">${P.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:("<div class=\"shClose ok\"><b>✓ "+_t("الشحنة مقفلة: سُلّمت بالكامل، فواتيرها محصلة، وتكاليفها مدفوعة")+".</b></div>")}
/* ===== اقتراح العملاء القريبين ===== */
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return m+n;let p=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function custNear(name){const k=nk(name);if(k.length<3)return[];const sw=new Set(['شركة','مؤسسة','محل','متجر','مكتب','السيد','ابو','أبو','ام','للتجارة','التجارية','العامة','co','ltd','company']);
  const toks=x=>nk(x).split(' ').filter(t=>t&&!sw.has(t));const kt=toks(name);
  return Object.values(CU.get()).map(c=>{const ck=nk(c.name);if(ck===k)return null;let sc=0;
    if(ck.includes(k)||k.includes(ck))sc=3;else{const d=lev(ck,k);if(d<=Math.max(1,Math.floor(Math.max(ck.length,k.length)/4)))sc=2;else{const ct=toks(c.name);if(kt.length&&ct.length&&kt.some(t=>ct.includes(t)&&t.length>=3))sc=1}}
    return sc?{c:c,sc:sc}:null}).filter(Boolean).sort((a,b)=>b.sc-a.sc).slice(0,4).map(x=>x.c)}
function custHint(i){const box=$('shCustHint');if(!box)return;const c=SH.cons[i];if(!c){box.innerHTML='';return}const nm=(c.cust||'').trim();
  if(!nm||c.custOk||findCust(nm)){box.innerHTML='';return}const near=custNear(nm);if(!near.length){box.innerHTML='';return}
  box.innerHTML=`<div class="chint" data-i="${i}"><span>«${esc(nm)}» ${_t("ليس في دليل العملاء. هل تقصد")}:</span>${near.map(x=>`<button type="button" class="chip" data-pick="${esc(x.name)}">${esc(x.name)}${x.phone?' <small>'+esc(x.phone)+'</small>':''}</button>`).join('')}<button type="button" class="chip new" data-newc="1">${_t("لا، عميل جديد باسم")} «${esc(nm)}»</button></div>`}
$('shCustHint').addEventListener('click',e=>{const b=e.target.closest('button'),w=e.target.closest('.chint');if(!b||!w)return;const i=+w.dataset.i,c=SH.cons[i];if(!c)return;
  if(b.dataset.pick){c.cust=b.dataset.pick;c.custOk=true;const inp=$('cmBody').querySelector(`tr[data-i="${i}"] [data-k=cust]`);if(inp)inp.value=c.cust;toast((_t("اختير العميل")+" «")+c.cust+("» "+_t("من الدليل")))}
  else if(b.dataset.newc){c.custOk=true;toast((_t("سيُضاف")+" «")+c.cust+("» "+_t("كعميل جديد عند الحفظ")))}
  $('shCustHint').innerHTML='';shUpd()});
/* ===== النسخة الاحتياطية ===== */
const BK_KEYS=['pst_users','pst_inv','pst_rc','pst_curr','pst_cust','pst_ship','pst_prod','pst_seq','pst_rseq','pst_dseq','pst_shseq','pst_cols','pst_foot','pst_lang','pst_stamp','pst_tpl','pst_rpage','pst_url','pst_pw'];
const BK_OBJ=['pst_users','pst_inv','pst_rc','pst_cust','pst_ship','pst_prod'],BK_SEQ=['pst_seq','pst_rseq','pst_dseq','pst_shseq'];
let BKD=null;
function bkInfo(){const at=LS.get('pst_bk_at',0),n=k=>Object.keys(LS.get(k,{})).length;$('bkInfo').textContent=`${_t("على هذا الجهاز الآن")}: ${_t("الفواتير")}: ${n('pst_inv')}${_t("،")} ${_t("الوصولات")}: ${n('pst_rc')}${_t("،")} ${_t("العملاء")}: ${n('pst_cust')}${_t("،")} ${_t("الشحنات")}: ${n('pst_ship')}. `+(at?(_t("آخر نسخة")+": ")+new Date(at).toLocaleString({ar:'ar-EG',en:'en-GB',tr:'tr-TR'}[UIL]):(_t("لم تُؤخذ نسخة من قبل")+"."))+(XS.loaded?(' · '+_t("ستوك التصديرات")+': '+XS.inv.length+' '+_t("فاتورة")+'، '+XS.exp.length+' '+_t("سجل")+' ('+_t("على الخادم")+')'):'')+(" · "+_t("مساحة التخزين المستعملة")+": ")+Math.round(lsUsage()/52428.8)+'%'+(lsUsage()>4e6?(" ⚠ "+_t("اقتربت من الامتلاء")):'')}
/* نظام ستوك التصديرات يعيش على الخادم: يُسحب منه عند التصدير ويُعاد إليه عند الاستيراد */
async function bkXsDump(){if(!SRV.on||!can('xs'))return null;const j=await api('xslist'),own={},ids=[];
  j.inv.concat(j.exp).forEach(r=>(r.files||[]).forEach(f=>{if(!own[f.id]){own[f.id]=r.id;ids.push(f.id)}}));
  const files=[];for(const id of ids){const g=await api('xsfget',{id:id});files.push({id:id,owner:own[id],name:g.name,mime:g.mime,d:g.d})}
  return{v:1,inv:j.inv,exp:j.exp,files:files}}
async function bkXsRestore(X,mode){if(!X||!SRV.on)return null;if(!can('xs')){toast(_t("لا تملك صلاحية")+': '+PERMN.xs,'err');return null}
  const T={added:0,upd:0,files:0};const add=r=>{T.added+=r.added;T.upd+=r.upd;T.files+=r.files};
  add(await api('xsrestore',{mode:mode,wipe:1,inv:X.inv||[],exp:X.exp||[],files:[]}));
  let batch=[],sz=0;const fl=async()=>{if(batch.length){add(await api('xsrestore',{mode:mode,files:batch}));batch=[];sz=0}};
  for(const f of X.files||[]){if(sz+f.d.length>2500000)await fl();batch.push(f);sz+=f.d.length}await fl();XS.loaded=false;if(can('xs'))xsLoad(true);return T}
const bkXsN=X=>X?(_t("ستوك التصديرات")+': '+_t("الفواتير")+' '+(X.inv||[]).length+' · '+_t("سجلات التصدير")+' '+(X.exp||[]).length+' · '+_t("ملفات")+' '+(X.files||[]).length):'';
async function bkExport(){const o={app:'portist',v:1,at:new Date().toISOString(),data:{}};BK_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!=null)o.data[k]=JSON.parse(v)});
  try{const X=await bkXsDump();if(X)o.xs=X}catch(e){toast(_t("تعذر تضمين ستوك التصديرات في النسخة")+' — '+(e.net?_t("تعذر الاتصال بالخادم"):e.message),'err');return}
  const blob=new Blob([JSON.stringify(o)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='portist-backup-'+shToday()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
  LS.set('pst_bk_at',Date.now());bkInfo();logAct('تصدير نسخة احتياطية','');toast((_t("نُزّل ملف النسخة الاحتياطية")));if(S.mode==='h')shDraw()}
function bkRead(file){const r=new FileReader();r.onload=()=>{try{const o=JSON.parse(r.result);if(!o||o.app!=='portist'||!o.data)throw 0;BKD=o;
    const n=k=>Object.keys(o.data[k]||{}).length;$('bkStats').innerHTML=`${_t("ملف بتاريخ")} <b dir="ltr">${esc(String(o.at||'').slice(0,16).replace('T',' '))}</b>: ${_t("الفواتير")}: ${n('pst_inv')}${_t("،")} ${_t("الوصولات")}: ${n('pst_rc')}${_t("،")} ${_t("العملاء")}: ${n('pst_cust')}${_t("،")} ${_t("الشحنات")}: ${n('pst_ship')}${_t("،")} ${_t("صنف محفوظ")}: ${n('pst_prod')}.`+(o.xs?'<br>'+esc(bkXsN(o.xs)):'');$('bkPreview').style.display=''}
  catch(e){BKD=null;$('bkPreview').style.display='none';toast((_t("هذا ليس ملف نسخة احتياطية صالحاً")),'err')}};r.readAsText(file)}
function bkApply(mode){if(!need('backup'))return;if(!BKD)return;const d=BKD.data,XX=BKD.xs;let added=0,upd=0;
  if(mode==='replace'){BK_KEYS.forEach(k=>{if(d[k]!==undefined)localStorage.setItem(k,JSON.stringify(d[k]));else localStorage.removeItem(k)});IXV++}
  else{BK_OBJ.forEach(k=>{if(!d[k])return;const L=LS.get(k,{});Object.keys(d[k]).forEach(id=>{const inc=d[k][id],cur=L[id];if(!cur){L[id]=inc;added++}else if(num(inc.ts)>num(cur.ts)){L[id]=inc;upd++}});LS.set(k,L)});
    BK_SEQ.forEach(k=>{if(d[k]!==undefined)LS.set(k,Math.max(num(LS.get(k,0)),num(d[k])))});
    BK_KEYS.filter(k=>!BK_OBJ.includes(k)&&!BK_SEQ.includes(k)).forEach(k=>{if(localStorage.getItem(k)==null&&d[k]!==undefined)LS.set(k,d[k])})}
  logAct('استيراد نسخة احتياطية',mode==='replace'?'استبدال':'دمج');BKD=null;$('bkPreview').style.display='none';$('bkFile').value='';ALL=null;refCust();refInv();bkInfo();
  toast(mode==='replace'?(_t("استُبدلت البيانات من الملف")+" — "+_t("أعد تحميل الصفحة")):(_t("تم الدمج: أُضيف")+" ")+added+(" "+_t("وحُدّث")+" ")+upd+(" "+_t("سجلاً")));
  const xsP=XX&&SRV.on?bkXsRestore(XX,mode).then(r=>{if(r)toast(_t("ستوك التصديرات")+': '+_t("أُضيف")+' '+r.added+' · '+_t("حُدّث")+' '+r.upd+' · '+_t("ملفات")+' '+r.files)}).catch(e=>toast(_t("تعذرت استعادة ستوك التصديرات")+': '+e.message,'err')):Promise.resolve();
  if(SRV.on){xsP.then(()=>adoptLocal(true)).then(()=>{if(mode==='replace')location.reload()})}else if(mode==='replace')setTimeout(()=>location.reload(),1200);if(mode!=='replace'&&S.mode==='h')shDraw()}
$('bBackup').addEventListener('click',()=>{closeMenu();if(!can('backup')&&!can('reset')){need('backup');return}bkInfo();rzInfo();$('mBackup').classList.add('on')});
$('bkExport').addEventListener('click',()=>{if(need('backup'))bkExport()});$('bkFile').addEventListener('change',e=>{if(e.target.files[0])bkRead(e.target.files[0])});
$('bkMerge').addEventListener('click',()=>bkApply('merge'));
$('bkReplace').addEventListener('click',()=>{const b=$('bkReplace');if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("تأكيد الاستبدال ومسح بيانات الجهاز؟"));setTimeout(()=>{b.dataset.arm='';b.textContent=(_t("استبدال كل البيانات"))},4000);return}b.dataset.arm='';b.textContent=(_t("استبدال كل البيانات"));bkApply('replace')});

/* ===== تصفير جميع البيانات ===== */
const RZ_DATA=['pst_inv','pst_rc','pst_cust','pst_ship','pst_prod','pst_seq','pst_rseq','pst_dseq','pst_shseq','pst_bk_at'],RZ_SET=['pst_cols','pst_foot','pst_lang','pst_stamp','pst_tpl','pst_rpage'],RZ_CL=['pst_url','pst_pw'];
function rzInfo(){const n=k=>Object.keys(LS.get(k,{})).length;$('rzInfo').textContent=`${_t("سيُمسح")}: ${_t("الفواتير")}: ${n('pst_inv')}${_t("،")} ${_t("الوصولات")}: ${n('pst_rc')}${_t("،")} ${_t("العملاء")}: ${n('pst_cust')}${_t("،")} ${_t("الشحنات")}: ${n('pst_ship')}${_t("،")} ${_t("صنف محفوظ")}: ${n('pst_prod')}.`;
  const cl=!!CL.u();$('rzCloudL').style.display=cl?'flex':'none';$('rzCloudN').style.display=cl?'':'none';$('rzWord').value='';$('rzGo').disabled=true;$('rzGo').dataset.arm='';$('rzGo').textContent=(_t("تصفير البيانات نهائياً"))}
$('rzWord').addEventListener('input',()=>{$('rzGo').disabled=nk($('rzWord').value)!==nk('تصفير')});
$('rzGo').addEventListener('click',()=>{if(!need('reset'))return;const b=$('rzGo');if(nk($('rzWord').value)!==nk('تصفير'))return;
  if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("تأكيد أخير: مسح كل شيء؟"));setTimeout(()=>{if(b.dataset.arm){b.dataset.arm='';b.textContent=(_t("تصفير البيانات نهائياً"))}},5000);return}
  b.dataset.arm='';const has=RZ_DATA.slice(0,5).some(k=>Object.keys(LS.get(k,{})).length);try{if(has)bkExport()}catch(e){}
  const keys=RZ_DATA.concat($('rzSet').checked?RZ_SET:[]).concat(CL.u()&&$('rzCloud').checked?RZ_CL:[]);
  keys.forEach(k=>localStorage.removeItem(k));logAct('تصفير البيانات',$('rzSet').checked?'مع الإعدادات':'البيانات فقط');toast((_t("تم تصفير البيانات")+" — "+_t("يُعاد تحميل الصفحة")));setTimeout(()=>location.reload(),has?1800:900)});
