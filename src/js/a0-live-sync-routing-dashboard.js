/* ===== مزامنة لحظية: الخادم هو المصدر الوحيد؛ ما على الجهاز نسخة مؤقتة تُمسح عند الخروج ===== */
function kvAdd(op){const Q=LS.get('pst_kq',{});Q[op.k+'|'+op.id]=op;LS.set('pst_kq',Q);clearTimeout(kvAdd.t);kvAdd.t=setTimeout(kvFlush,250)}
function kvDiff(k,oldRaw,v){
  if(KV_MAP[k]){let o={};try{o=JSON.parse(oldRaw)||{}}catch(e){}v=v||{};
    for(const id in v)if(JSON.stringify(v[id])!==JSON.stringify(o[id]))kvAdd({k:k,id:id,v:v[id]});
    for(const id in o)if(!(id in v))kvAdd({k:k,id:id,del:1})}
  else if(k==='pst_dseq')kvAdd({k:k,id:'',v:v,max:1});
  else if(JSON.stringify(v)!==oldRaw)kvAdd({k:k,id:'',v:v})}
async function kvFlush(){if(KBUSY||!KVA())return;const Q=LS.get('pst_kq',{}),ks=Object.keys(Q);if(!ks.length)return;KBUSY=true;
  try{const j=await api('kvput',{ops:ks.map(x=>Q[x])});const Q2=LS.get('pst_kq',{});ks.forEach(x=>{if(JSON.stringify(Q2[x])===JSON.stringify(Q[x]))delete Q2[x]});LS.set('pst_kq',Q2);if(j&&j.denied&&j.denied.length){console.warn('kv denied:',j.denied.join(','));KSINCE=0;kvUI(await kvPull())}}catch(e){}finally{KBUSY=false}}
async function kvPull(){const j=await api('kvget',{since:KSINCE}),it=j.items||[];if(!it.length)return[];
  const Q=LS.get('pst_kq',{}),by={};it.forEach(x=>{(by[x.k]=by[x.k]||[]).push(x);KSINCE=Math.max(KSINCE,x.u)});
  KPULL=true;
  try{for(const k in by){
    if(k==='pst_log'){let L=LS.get(k,[]);const have=new Set(L.map(x=>x._id));by[k].forEach(x=>{if(!x.del&&x.v&&!have.has(x.id))L.push(Object.assign({},x.v,{_id:x.id}))});L.sort((p,q)=>p.t-q.t);if(L.length>800)L=L.slice(-800);LS.set(k,L);continue}
    if(KV_MAP[k]){const M=LS.get(k,{});by[k].forEach(x=>{if(Q[k+'|'+x.id])return;if(x.del)delete M[x.id];else M[x.id]=x.v});LS.set(k,M);continue}
    if(Q[k+'|'])continue;const x=by[k][by[k].length-1];
    if(k==='pst_dseq')LS.set(k,Math.max(+LS.get(k,0)||0,+x.v||0));else if(x.del||x.v==null)localStorage.removeItem(k);else LS.set(k,x.v)}
  }finally{KPULL=false}
  return Object.keys(by)}
function kvUI(ks){try{
  if(ks.includes('pst_cust')){refCust();if(S.mode==='c'&&$('cForm').style.display==='none')cDraw()}
  if(ks.includes('pst_prod'))refreshProds();
  if(ks.includes('pst_curr'))try{curRefresh();curSet()}catch(e){}
  if(ks.includes('pst_foot')){const f=$('foot');if(document.activeElement!==f)f.value=LS.get('pst_foot','')}
  if(ks.includes('pst_stamp'))showStamp();
  if(ks.includes('pst_tpl'))presets();
  if(ks.includes('pst_log')&&$('logq')&&$('logq').offsetParent)logDraw()}catch(e){}}
async function liveStart(ad){if(!KVA()||!CL.u())return;try{KSINCE=0;LSIG='';const j=await api('sig');
  if(ME.admin&&!LS.get('pst_adopted','')){if(!ad){}else if(confirm(_t('هذا الجهاز يحتوي بيانات محلية قديمة (فواتير/وصولات/شحنات/عملاء). هل ترفعها الآن إلى الخادم المشترك؟ (إن ألغيت فلن تُمسح من هذا الجهاز تلقائياً)'))){await adoptLocal(true)}else LS.set('pst_keep',1);LS.set('pst_adopted','1')}
  await kvFlush();kvUI(await kvPull());LSIG=(await api('sig')).sig;if(S.mode==='h')shOpen();else liveView()}catch(e){}}
function hasLocal(){return ['pst_inv','pst_rc','pst_ship','pst_cust','pst_prod','pst_tpl'].some(k=>Object.keys(LS.get(k,{})).length)}
async function liveView(){LQUIET=true;try{
  if(S.mode==='a')accInit();
  else if(S.mode==='d')await dashLoad();
  else if(S.mode==='p')await ccLoad();
  else if(S.mode==='h'){if($('shLst').style.display!=='none'){await shLoad();shDraw()}}
  else if(S.mode==='c'){if($('cForm').style.display==='none')await cPage()}
  else{if($('invList')&&$('invList').offsetParent)await listInv();if($('rList')&&$('rList').offsetParent)await rlist()}
  }catch(e){}finally{LQUIET=false}}
async function livePoll(force){if(LPB||!KVA()||!CL.u()||(document.hidden&&!force))return;LPB=true;
  try{await kvFlush();await qFlush();const j=await api('sig');
    if(j.sig!==LSIG){const a=LSIG.split('|'),b=j.sig.split('|');LSIG=j.sig;
      if(a[4]!==b[4])kvUI(await kvPull());
      if(a[3]!==b[3])await syncUsers();
      if(a[0]!==b[0]||a[1]!==b[1]||a[2]!==b[2]||a[4]!==b[4])await liveView()}
  }catch(e){}finally{LPB=false}}
setInterval(()=>livePoll(),2500);document.addEventListener('visibilitychange',()=>{if(!document.hidden)livePoll(true)});window.addEventListener('online',()=>livePoll(true));
function liveWipe(why){if(!LS.get('pst_keep',0)&&!Object.keys(LS.get('pst_q',{})).length&&!Object.keys(LS.get('pst_kq',{})).length){
    ['pst_inv','pst_rc','pst_ship','pst_cust','pst_prod','pst_tpl','pst_curr','pst_log','pst_cols','pst_foot','pst_stamp','pst_seq','pst_rseq','pst_dseq','pst_shseq','pst_users','pst_q','pst_kq','pst_bk_at'].forEach(k=>localStorage.removeItem(k))}
  if(why)sessionStorage.setItem('pst_lgm',why);location.reload()}
async function adoptLocal(silent){if(!CL.u()){toast(_t('الخادم غير مربوط'),'err');return}const b=$('gUpBtn');if(b)b.disabled=true;if(!silent)toast(_t('جارٍ رفع بيانات هذا الجهاز')+'...');
  const T=[['pst_inv','save'],['pst_rc','rsave'],['pst_ship','shsave']];let ok=0,ex=0,er=0;
  try{for(const [k,a] of T){const D=LS.get(k,{});for(const c of Object.keys(D)){try{await api(a,{code:c,d:D[c],isNew:true});ok++}catch(e){if(e.message==='exists')ex++;else if(e.net)throw e;else er++}}}
    const ops=[];Object.keys(KV_MAP).forEach(k=>Object.entries(LS.get(k,{})).forEach(([id,v])=>ops.push({k:k,id:id,v:v,isNew:1})));
    ['pst_foot','pst_stamp'].forEach(k=>{if(localStorage.getItem(k)!=null)ops.push({k:k,id:'',v:LS.get(k,''),isNew:1})});
    if(localStorage.getItem('pst_dseq')!=null)ops.push({k:'pst_dseq',id:'',v:+LS.get('pst_dseq',0)||0,max:1});
    LS.get('pst_log',[]).forEach((e,i)=>{const id=e._id||('L'+e.t+'-'+i);ops.push({k:'pst_log',id:id,v:Object.assign({},e,{_id:id}),isNew:1})});
    for(let i=0;i<ops.length;i+=150)await api('kvput',{ops:ops.slice(i,i+150)});KSINCE=0;kvUI(await kvPull())}
  catch(e){toast(_t('تعذر الاتصال بالخادم، تحقق من الإنترنت'),'err');if(b)b.disabled=false;return}
  if(b)b.disabled=false;logAct('رفع بيانات الجهاز','↑'+ok);toast(silent?_t('تم رفع بيانات هذا الجهاز إلى الخادم'):_t('تم الرفع')+': '+ok+' · '+_t('موجود مسبقاً')+': '+ex+(er?' · '+_t('فشل')+': '+er:''))}
$('gUpBtn').addEventListener('click',()=>{if(need('backup'))adoptLocal()});
$('rcv').setAttribute('list','custs');rid('from').setAttribute('list','custs');$('wm3').src=document.querySelector('header img').src;refCust();
rid('from').addEventListener('change',()=>{const c=findCust(rv('from'));if(c&&c.phone&&!rv('phone')){rid('phone').value=c.phone;rdraw()}});
$('bCust').addEventListener('click',cOpen);$('bSBack').addEventListener('click',()=>{const bk=S.sheetFn&&S.shBack;S.sheetFn=null;setMode(S.prev||'h');if(bk)bk()});
$('cNew').addEventListener('click',()=>cEdit(''));$('cf_save').addEventListener('click',cSaveForm);$('cf_cancel').addEventListener('click',()=>{$('cForm').style.display='none'});$('cf_del').addEventListener('click',cDelete);
$('cq').addEventListener('input',cDraw);
$('cq').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const r=resolveCust($('cq').value);if(r.length===1)sOpen(r[0].id);else toast(r.length?_t('عدة عملاء يطابقون — اكتب اسماً أو كوداً أدق'):_t('لا يوجد عميل بهذا الاسم أو الكود'),'err')});
$('cList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.st)sOpen(d.st);
  else if(d.ed)cEdit(d.ed);
  else if(d.ni){const c=CU.get()[d.ni];if(!c||!guardNew(b,'i'))return;setMode('i');newInv();$('rcv').value=c.name;calc()}
  else if(d.nr){const c=CU.get()[d.nr];if(!c||!guardNew(b,'r'))return;setMode('r');rnew();rid('from').value=c.name;rid('phone').value=c.phone||'';rdraw()}});

/* ===== مسارات الصفحات (hash routing): لكل صفحة رابط، والرجوع والتحديث والروابط المباشرة تعمل ===== */

/* ===== لوحة المعلومات الرئيسية ===== */
const DS={cu:'',per:'m'},DP=[['m','هذا الشهر'],['q','آخر 3 أشهر'],['y','هذه السنة'],['a','الكل']],DSC={ld:'#a86a00',tr:'#2b5fb4',ar:'#6d3fc0',cu:'#c93650',dn:'#157a48'};
function dRange(p){const n=new Date(),y=n.getFullYear(),m=n.getMonth(),f=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
  if(p==='m')return{from:f(new Date(y,m,1)),pf:f(new Date(y,m-1,1)),pt:f(new Date(y,m,1))};
  if(p==='q')return{from:f(new Date(y,m-2,1)),pf:f(new Date(y,m-5,1)),pt:f(new Date(y,m-2,1))};
  if(p==='y')return{from:y+'-01-01',pf:(y-1)+'-01-01',pt:y+'-01-01'};
  return{from:'',pf:'',pt:''}}
const dIn=(d,a,b)=>{d=String(d||'').slice(0,10);return !!d&&(!a||d>=a)&&(!b||d<b)},dShDate=h=>h.sd||((h.hist||[])[0]||{}).date||(h.ts?new Date(h.ts).toISOString().slice(0,10):'');
async function dashLoad(){if(S.mode!=='d')return;try{await loadAll();await shLoad()}catch(e){}dashDraw()}
function dashData(){const A=ALL||{I:{},Rc:{}},today=shToday(),R=dRange(DS.per),cnt={};
  const inv=Object.keys(A.I).map(k=>Object.assign({},A.I[k],{code:k})).filter(d=>{const st=d.st||'draft';return st!=='draft'&&st!=='void'});
  const rc=Object.keys(A.Rc).map(k=>Object.assign({},A.Rc[k],{code:k})).filter(d=>rcValid(d)&&rcIsMoney(d));
  const ships=Object.values(SHS.get()).map(h=>Object.assign({},h,{cons:h.cons||[]}));
  inv.forEach(d=>{const c=d.cur||'$';cnt[c]=(cnt[c]||0)+1});rc.forEach(d=>{const c=d.cur||'$';cnt[c]=(cnt[c]||0)+1});ships.forEach(h=>{const c=h.cur||'$';cnt[c]=(cnt[c]||0)+1});
  const curs=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);if(!DS.cu||!curs.includes(DS.cu))DS.cu=curs[0]||'$';const cu=DS.cu;
  const sum=(L,f)=>r2(L.reduce((a,x)=>a+f(x),0)),ci=d=>(d.cur||'$')===cu,iC=inv.filter(ci),rC=rc.filter(ci);
  const D={A:A,today:today,curs:curs,cu:cu,none:!inv.length&&!rc.length&&!ships.length};
  D.rev=sum(iC.filter(d=>dIn(d.date,R.from,'')),d=>num(d.t));D.revP=R.from?sum(iC.filter(d=>dIn(d.date,R.pf,R.pt)),d=>num(d.t)):null;
  D.col=sum(rC.filter(d=>dIn(d.date,R.from,'')),d=>num(d.t));D.colP=R.from?sum(rC.filter(d=>dIn(d.date,R.pf,R.pt)),d=>num(d.t)):null;
  // الذمم: على مستوى العميل (نفس منطق كشف الحساب)
  const debt=[];let recv=0,credit=0,odA=0,odC=0;Object.values(CU.get()).forEach(c=>{const dd=docsOf(c,A),m=sumOf(dd)[cu];if(!m)return;if(m.bal>.004){recv+=m.bal;const od=dd.inv.filter(x=>(x.cur||'$')===cu&&(x.st==='sent'||x.st==='partial')&&x.due&&x.due<today&&invRem(x.code,x)>.004);odA+=Math.min(m.bal,od.reduce((a,x)=>a+invRem(x.code,x),0));odC+=od.length;debt.push({c:c,bal:m.bal,od:od.length})}else if(m.bal<-.004)credit+=-m.bal});
  {const B=[['nd',0],['d30',0],['d60',0],['d90',0],['d91',0]],t0=new Date(today).getTime();iC.forEach(d=>{const rm=invRem(d.code,d);if(rm<=.004)return;const ref=d.due||d.date,days=ref?Math.floor((t0-new Date(ref).getTime())/864e5):0,i=days<=0?0:days<=30?1:days<=60?2:days<=90?3:4;B[i][1]=r2(B[i][1]+rm)});D.age=B}
  D.recv=r2(recv);D.credit=r2(credit);D.debt=debt.sort((a,b)=>b.bal-a.bal).slice(0,6);
  D.odAmt=r2(odA);D.odN=odC;
  // أفضل العملاء بالإيراد
  const bc={};iC.filter(d=>dIn(d.date,R.from,'')).forEach(d=>{const k=cKey(d.rcv)||nk(d.rcv||''),c=CU.get()[k];(bc[k]=bc[k]||{n:c?c.name:(d.rcv||'—'),id:c?c.id:'',v:0}).v+=num(d.t)});
  D.top=Object.values(bc).sort((a,b)=>b.v-a.v).slice(0,6);
  // اتجاه 6 أشهر
  const n=new Date(),T=[];for(let k=5;k>=0;k--){const d=new Date(n.getFullYear(),n.getMonth()-k,1),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');T.push({key:key,l:d.toLocaleDateString(CURL==='ar'?'ar-u-nu-latn':CURL==='tr'?'tr':'en',{month:'short'}),rev:0,col:0})}
  iC.forEach(d=>{const t=T.find(x=>x.key===String(d.date||'').slice(0,7));if(t)t.rev+=num(d.t)});rC.forEach(d=>{const t=T.find(x=>x.key===String(d.date||'').slice(0,7));if(t)t.col+=num(d.t)});D.T=T;
  // الشحنات
  const cnt2={ld:0,tr:0,ar:0,cu:0,dn:0};let late=0;ships.forEach(h=>{const st=shStat(h);cnt2[st]++;if(h.eta&&h.eta<today&&(st==='ld'||st==='tr'))late++});
  D.sh=cnt2;D.shActive=ships.length-cnt2.dn;D.late=late;D.ships=ships;
  if(can('cost')){const P=[];let net=0,rv=0;ships.filter(h=>(h.cur||'$')===cu&&dIn(dShDate(h),R.from,'')).forEach(h=>{const F=shFin(h);if(!F.T.rev&&!F.T.cost)return;net+=F.T.net;rv+=F.T.rev;P.push({h:h,net:F.T.net,mg:F.T.mg,rev:F.T.rev})});
    D.net=r2(net);D.netRev=r2(rv);D.nP=P.length;D.P=P.sort((a,b)=>b.net-a.net);
    let pay=0;ships.forEach(h=>(h.costs||[]).forEach(x=>{if(!x.pd&&num(x.amt)&&(x.cur||h.cur||'$')===cu)pay+=num(x.amt)}));D.pay=r2(pay)}
  return D}
function dDelta(v,p){if(p==null||!(p>0))return '';const d=Math.round((v-p)/p*100);return `<small><span class="${d>=0?'dUp':'dDn'}">${d>=0?'▲':'▼'} ${Math.abs(d)}%</span> ${_t("عن الفترة السابقة")}</small>`}
function dChart(T,cu){const W=640,H=220,L=48,B=28,Tp=12,mx=Math.max(1,...T.map(t=>Math.max(t.rev,t.col))),pw=(W-L-8)/T.length,bw=Math.min(26,pw/2-4),y=v=>Tp+(H-Tp-B)*(1-v/mx);
  const nice=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(v>=1e4?0:1)+'K':String(Math.round(v));
  let g='';for(let i=0;i<=4;i++){const v=mx*i/4,yy=y(v);g+=`<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#dbe6e6" stroke-width="1"/><text x="${L-6}" y="${yy+4}" text-anchor="end" font-size="13" fill="#566a6e">${nice(v)}</text>`}
  T.forEach((t,i)=>{const x0=L+i*pw+pw/2;g+=`<rect x="${x0-bw-1}" y="${y(t.rev)}" width="${bw}" height="${Math.max(0,H-B-y(t.rev))}" rx="3" fill="#0e7a6f"><title>${esc(t.l)} — ${_t("إيرادات")}: ${f(t.rev)} ${esc(cu)}</title></rect><rect x="${x0+1}" y="${y(t.col)}" width="${bw}" height="${Math.max(0,H-B-y(t.col))}" rx="3" fill="#d89b1d"><title>${esc(t.l)} — ${_t("المحصَّل")}: ${f(t.col)} ${esc(cu)}</title></rect><text x="${x0}" y="${H-9}" text-anchor="middle" font-size="13" fill="#566a6e">${esc(t.l)}</text>`});
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${_t("الإيرادات والمحصَّل لآخر 6 أشهر")}" style="width:100%;height:auto;direction:ltr">${g}</svg><div class="dLeg"><span><i style="background:#0e7a6f"></i>${_t("إيرادات الفواتير")}</span><span><i style="background:#d89b1d"></i>${_t("المحصَّل (الوصولات)")}</span></div>`}
function dashDraw(){const box=$('dash');if(!box||S.mode!=='d')return;const D=dashData(),cu=esc(D.cu),M=v=>fm(v,cu),can_i=can('inv')||can('bal'),now=new Date();
  const dt=now.toLocaleDateString(CURL==='ar'?'ar-u-nu-latn':CURL==='tr'?'tr':'en',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  let h=`<div class="dHead"><div><h2>${_t("مرحباً")}${ME&&ME.name?_t("،")+' '+esc(ME.name):''}</h2><p>${esc(dt)}</p></div><div class="dCtl">${D.curs.length>1?`<div class="dChips" role="group" aria-label="${_t("العملة")}">${D.curs.map(c=>`<button type="button" data-dc="${esc(c)}" class="${c===D.cu?'on':''}" aria-pressed="${c===D.cu}">${esc(_t(c))}</button>`).join('')}</div>`:''}${D.none?'':`<div class="dChips" role="group" aria-label="${_t("الفترة")}">${DP.map(([k,n])=>`<button type="button" data-dp="${k}" class="${k===DS.per?'on':''}" aria-pressed="${k===DS.per}">${_t(n)}</button>`).join('')}</div>`}</div></div>`;
  const qa=[];if(can('ship'))qa.push(['#/shipments?new',_t("+ شحنة جديدة")]);if(can('inv'))qa.push(['#/invoice/new',_t("+ فاتورة")]);if(can('rc'))qa.push(['#/receipt/new',_t("+ وصل")]);if(can('cust'))qa.push(['#/customers',_t("كشف حساب عميل")]);if(can('cost'))qa.push(['#/profit',_t("تقرير أرباح الشحنات")]);
  if(!D.none)h+=`<div class="dQA">${qa.map(([k,n])=>`<button type="button" data-qa="${esc(k)}">${n}</button>`).join('')}</div>`;
  if(D.none){h+=`<div class="dWel"><h3>${_t("أهلاً بك في Portist")}</h3><p class="hint" style="margin:0">${_t("ابدأ بإدخال أول بياناتك، وستظهر هنا مؤشرات الأداء والمتابعة تلقائياً")}</p><div class="st">${qa.slice(0,3).map(([k,n])=>`<button type="button" class="b1" data-qa="${esc(k)}">${n}</button>`).join('')}</div></div>`;box.innerHTML=h;return}
  const K=[];
  if(can_i)K.push(`<button class="dK" data-go="acc"><span>${_t("إيرادات الفترة")} (${cu})</span><b>${f(D.rev)}</b>${dDelta(D.rev,D.revP)||`<small>${_t("فواتير صادرة")}</small>`}</button>`);
  if(can('rc')||can_i)K.push(`<button class="dK gold" data-go="rc"><span>${_t("المحصَّل في الفترة")}</span><b>${f(D.col)}</b>${D.rev>0?`<small>${_t("نسبة التحصيل")} ${Math.round(D.col/D.rev*100)}%</small>`:dDelta(D.col,D.colP)||`<small>${_t("وصولات مستلمة")}</small>`}</button>`);
  if(can_i)K.push(`<button class="dK ${D.odAmt>0?'bad':''}" data-go="cust"><span>${_t("المتبقي للتحصيل")}</span><b>${f(D.recv)}</b><small>${D.odN?`<span class="dDn">${_t("متأخر")} ${f(D.odAmt)}</span> · ${D.odN} ${_t("فاتورة")}`:(D.credit>0?_t("أرصدة دائنة للعملاء")+' '+f(D.credit):_t("لا متأخرات"))}</small></button>`);
  if(can('cost')){K.push(`<button class="dK ${D.net<0?'bad':'good'}" data-go="profit"><span>${_t("صافي ربح الشحنات")}</span><b>${M(D.net)}</b><small>${D.netRev>0?_t("الهامش")+' '+Math.round(D.net/D.netRev*1000)/10+'% · ':''}${D.nP} ${_t("شحنة")}</small></button>`);
    K.push(`<button class="dK gold" data-go="pay"><span>${_t("التزامات للموردين")}</span><b>${f(D.pay)}</b><small>${_t("تكاليف شحنات غير مدفوعة")}</small></button>`)}
  if(can('ship')||can('deliver'))K.push(`<button class="dK ${D.late?'bad':''}" data-go="ship"><span>${_t("الشحنات النشطة")}</span><b>${D.shActive}</b><small>${D.sh.tr} ${_t("في الطريق")} · ${D.late?`<span class="dDn">${D.late} ${_t("متأخرة")}</span>`:_t("لا تأخير")}</small></button>`);
  h+=`<div class="dKpi">${K.join('')}</div><div class="dGrid">`;
  if(can_i||can('rc'))h+=`<section class="dC w8"><h3>${_t("الإيرادات والتحصيل")} <small>${_t("آخر 6 أشهر")} · ${cu}</small></h3>${dChart(D.T,D.cu)}</section>`;
  if(can('ship')||can('deliver')){const tot=Math.max(1,D.ships.length),ST=[['ld','محمّلة'],['tr','في الطريق'],['ar','وصلت'],['cu','تخليص جمركي'],['dn','سُلّمت']];
    h+=`<section class="dC w4"><h3>${_t("مسار الشحنات")} <small>${D.ships.length} ${_t("شحنة")}</small></h3><div class="dPipe" aria-hidden="true">${ST.map(([k])=>`<i style="width:${D.sh[k]/tot*100}%;background:${DSC[k]}"></i>`).join('')}</div>`+ST.map(([k,n])=>`<button class="dRow" data-st="${k}"><span class="t"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${DSC[k]};margin-inline-end:8px"></i>${_t(n)}</span><span class="v">${D.sh[k]}</span></button>`).join('')+`</section>`}
  h+=`<section class="dC w6"><h3>${_t("يحتاج إجراء")}</h3><div id="dTodo"></div></section>`;
  if(can_i||can('cust'))h+=`<section class="dC w6"><h3>${_t("أعلى الذمم المستحقة")} <small>${cu}</small></h3>${D.debt.length?D.debt.map(x=>`<button class="dRow" data-cs="${esc(x.c.id)}"><span class="t">${esc(x.c.name)}${x.od?`<small class="dDn">${x.od} ${_t("فاتورة متأخرة")}</small>`:''}</span><span class="v">${M(x.bal)}</span></button>`).join(''):`<div class="dEmpty">${_t("لا ذمم مستحقة")} ✓</div>`}</section>`;
  if(can_i&&D.age&&D.age.some(x=>x[1]>0)){const AN={nd:"لم يحن موعدها",d30:"متأخرة 1-30 يوماً",d60:"متأخرة 31-60 يوماً",d90:"متأخرة 61-90 يوماً",d91:"متأخرة أكثر من 90 يوماً"},mx=Math.max(...D.age.map(x=>x[1]));h+=`<section class="dC w6"><h3>${_t("أعمار الديون")} <small>${cu}</small></h3>${D.age.map(([k,v],i)=>`<div class="dRow" style="flex-wrap:wrap;cursor:default"><span class="t">${_t(AN[k])}</span><span class="v ${i>=3&&v>0?'dDn':''}">${v>0?M(v):'—'}</span><span class="dBar" style="width:100%"><i class="${i>=3?'neg':''}" style="width:${mx?v/mx*100:0}%"></i></span></div>`).join('')}<p class="hint" style="margin:8px 0 0">${_t("حسب تاريخ الاستحقاق (أو تاريخ الفاتورة إن لم يُحدد) للمتبقي على كل فاتورة صادرة")}</p></section>`}
  if(can_i)h+=`<section class="dC w6"><h3>${_t("أفضل العملاء بالإيراد")} <small>${_t(DP.find(x=>x[0]===DS.per)[1])}</small></h3>${D.top.length?D.top.map(x=>`<button class="dRow" data-cs="${esc(x.id)}" style="flex-wrap:wrap"><span class="t">${esc(x.n)}</span><span class="v">${M(r2(x.v))}</span><span class="dBar" style="width:100%"><i style="width:${x.v/D.top[0].v*100}%"></i></span></button>`).join(''):`<div class="dEmpty">${_t("لا إيرادات في هذه الفترة")}</div>`}</section>`;
  if(can('cost'))h+=`<section class="dC w6"><h3>${_t("ربحية الشحنات")} <small>${_t(DP.find(x=>x[0]===DS.per)[1])} · ${cu}</small></h3>${D.P.length?D.P.slice(0,3).concat(D.P.length>5?D.P.slice(-2):D.P.slice(3,5)).filter((x,i,a)=>a.indexOf(x)===i).map(x=>`<button class="dRow" data-sh="${esc(x.h.code)}" style="flex-wrap:wrap"><span class="t"><b dir="ltr">${esc(x.h.code)}</b><small>${_t("الهامش")} ${x.mg==null?'—':x.mg+'%'}</small></span><span class="v ${x.net<0?'dDn':''}">${M(x.net)}</span><span class="dBar" style="width:100%"><i class="${x.net<0?'neg':''}" style="width:${Math.min(100,Math.abs(x.net)/Math.max(1,Math.abs(D.P[0].net),Math.abs(D.P[D.P.length-1].net))*100)}%"></i></span></button>`).join(''):`<div class="dEmpty">${_t("لا شحنات فيها إيرادات أو تكاليف مسجلة بعد")}</div>`}</section>`;
  h+='</div>';box.innerHTML=h;
  try{shTodo(D.ships);const t=$('shTodo');$('dTodo').innerHTML=t?t.innerHTML.replace(/<h3 class="todoH">[\s\S]*?<\/h3>/,''):'';if(!$('dTodo').querySelector('details'))$('dTodo').innerHTML=`<div class="dEmpty">✓ ${_t("لا يوجد ما ينتظر إجراء")}</div>`}catch(e){}}
$('dash').addEventListener('click',e=>{const t=e.target,b=t.closest('[data-dc],[data-dp],[data-qa],[data-go],[data-st],[data-cs],[data-sh],[data-tq]');if(!b)return;
  if(b.dataset.dc){DS.cu=b.dataset.dc;dashDraw()}
  else if(b.dataset.dp){DS.per=b.dataset.dp;dashDraw()}
  else if(b.dataset.qa){const k=b.dataset.qa;if(k==='#/shipments?new'){shOpen().then(()=>$('shNew').click())}else if(k==='#/profit'){routeTo('#/costs')}else routeTo(k)}
  else if(b.dataset.go){const g=b.dataset.go;if(g==='acc'){ACT='i';setMode('a')}else if(g==='rc'){ACT='r';setMode('a')}else if(g==='cust')cOpen();else if(g==='profit')routeTo('#/costs');else if(g==='pay')routeTo('#/costs/suppliers');else if(g==='ship')shOpen()}
  else if(b.dataset.st){$('shfs').value=b.dataset.st;shOpen()}
  else if(b.dataset.cs){if(b.dataset.cs&&can('cust'))sOpen(b.dataset.cs)}
  else if(b.dataset.sh){routeTo('#/costs/shipment/'+encodeURIComponent(b.dataset.sh))}
  else if(b.dataset.tq){const [k,v]=b.dataset.tq.split(/:(.+)/);if(k==='ship')shOpen().then(()=>shEdit(v));else if(k==='inv')openInvCode(v);else if(k==='bk'){bkInfo();rzInfo();$('mBackup').classList.add('on')}}});
{const _sm1=setMode;setMode=function(m){_sm1.apply(this,arguments);if(m==='d')document.body.classList.add('mode-h');$('dwrap').style.display=m==='d'?'':'none';$('pwrap').style.display=m==='p'?'':'none';$('tabP').classList.toggle('on',m==='p');if(m==='p'){document.body.classList.add('mode-h');ccLoad()}$('tabD').classList.toggle('on',m==='d');if(m==='d'){LS.set('pst_land','d');dashLoad()}};}
