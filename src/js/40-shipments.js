/* ===== الشحنات: شحنة واحدة لعدة عملاء، لكل عميل حمولة وفاتورة وتسليم ===== */
const SHS={get:()=>LS.get('pst_ship',{}),set:v=>LS.set('pst_ship',v)};
const SHST=[['ld','محمّلة'],['tr','في الطريق'],['ar','وصلت'],['cu','تخليص جمركي'],['dn','سُلّمت']].map(([k,a])=>{const x=[k];Object.defineProperty(x,1,{get:()=>_t(a),enumerable:true});return x}),
SHN=new Proxy({},{get:(o,k)=>{const e=SHST.find(x=>x[0]===k);return e?e[1]:undefined},ownKeys:()=>SHST.map(x=>x[0]),getOwnPropertyDescriptor:(o,k)=>({enumerable:true,configurable:true,value:SHN[k]})}),
SHM=new Proxy({sea:'بحري',air:'جوي',land:'بري'},{get:(o,k)=>typeof o[k]==='string'?_t(o[k]):o[k]});
const SHBG={ld:'#e9eff0;color:#3e5155',tr:'#e4ecfb;color:#244fa8',ar:'#fff1d6;color:#a86a00',cu:'#efe7fb;color:#5b21b6',dn:'#e0f5ea;color:#157a48'};
const shBadge=k=>`<span class="bd" style="background:${SHBG[k]}">${esc(SHN[k])}</span>`;
const todayStr=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},shToday=()=>todayStr();
const shNextCode=()=>'SH-'+pad(Object.keys(SHS.get()).reduce((a,k)=>{const x=/^SH-(\d+)$/i.exec(k);return x?Math.max(a,+x[1]):a},LS.get('pst_shseq',0))+1);
const pkDone=c=>(c.dl||[]).reduce((a,x)=>a+num(x.pk),0);
const dlKey=c=>{const d=pkDone(c),p=num(c.pk);return d<=0?'none':(p>0&&d>=p)?'full':'part'};
const dlTxt=c=>({none:(_t("لم تُسلَّم")),part:(_t("تسليم جزئي")),full:(_t("سُلّمت"))})[dlKey(c)];
const dlCls=c=>({none:'',part:'s-partial',full:'s-paid'})[dlKey(c)];
function shStat(h){return(h.cons.length&&h.cons.every(c=>dlKey(c)==='full'))?'dn':(h.st==='dn'?'cu':h.st)}
function shShares(h){const tc=h.cons.reduce((a,c)=>a+num(c.cbm),0),fr=num(h.freight);return h.cons.map(c=>String(c.sm==null?'':c.sm).trim()!==''?num(c.sm):(tc?fr*num(c.cbm)/tc:0))}
let LSI={v:-1,o:null};const lsInv=()=>LSI.v===IXV?LSI.o:(LSI={v:IXV,o:LS.get('pst_inv',{})}).o,shAI=()=>ALL?ALL.I:lsInv();
let SHIXC={ref:null,v:-1,m:null};
function shIx(AI){if(SHIXC.ref===AI&&SHIXC.v===IXV)return SHIXC.m;const m={};for(const code in AI){const d=AI[code];if(!d||!d.ship)continue;const sk=m[d.ship]||(m[d.ship]={}),k=cKey(d.rcv);(sk[k]||(sk[k]=[])).push(code)}SHIXC={ref:AI,v:IXV,m:m};return m}
function consBal(h,c){const AI=shAI(),k=cKey(c.cust),M={},seen={};let n=0,dr=0;
  const add=(code,d)=>{if(seen[code])return;seen[code]=1;const st0=d.st||'draft';if(st0==='draft'||st0==='void'){dr++;return}n++;const cu=d.cur||'$';M[cu]=(M[cu]||0)+num(d.t)-num(d.pd)};
  String(c.inv||'').split(/[,،\s]+/).filter(Boolean).forEach(code=>{const d=AI[code]||lsInv()[code];if(d)add(code,d)});
  ((shIx(AI)[h.code]||{})[k]||[]).forEach(code=>{const d=AI[code];if(d)add(code,d)});
  return{n:n,dr:dr,M:M}}
const balDue=b=>Object.entries(b.M).filter(([,v])=>v>.004);
function balTxt(b){if(!b.n)return b.dr?("<span class=\"bd\">"+_t("مسودة فقط")+"</span>"):("<span class=\"bd\">"+_t("لم تُفوتَر")+"</span>");const d=balDue(b);return d.length?d.map(([cu,v])=>`<span class="bd s-partial">${fm(v,esc(cu))}</span>`).join(' '):("<span class=\"bd s-paid\">"+_t("مسدّدة")+"</span>")}
let SH=null,SHL=null;
async function shLoad(){await loadAll();if(CL.u()){qFlush();try{const j=await api('shlist'),D=SHS.get(),Q=QS.get();(j.items||[]).forEach(x=>{if(!x.d||Q['shsave|'+x.code])return;const o=D[x.code];if(!o||num(x.d.ver)>num(o.ver)||(num(x.d.ver)===num(o.ver)&&num(x.d.ts)>num(o.ts))){D[x.code]=(o&&x.d.costs===undefined&&o.costs)?Object.assign({},x.d,{costs:o.costs}):x.d}});if(SRV.on&&!LS.get('pst_keep',0)){const have=new Set((j.items||[]).map(x=>x.code));Object.keys(D).forEach(c=>{if(!have.has(c)&&!Q['shsave|'+c])delete D[c]})}SHS.set(D)}catch(e){}}}
async function shOpen(){setMode('h');shShowList();await shLoad();if(S.mode==='h')shDraw()}
function shShowList(){$('shEd').style.display='none';$('shLst').style.display=''}
function shDraw(){const q=nk($('shq').value),fs=$('shfs').value,D=SHS.get(),today=shToday();
  const all=Object.values(D).map(h=>Object.assign({},h,{cons:h.cons||[]}));
  const cnt={ld:0,tr:0,ar:0,cu:0,dn:0};let outst={},noInv=0,arrived=0,transit=0,lateAll=0;
  all.forEach(h=>{const st=shStat(h);cnt[st]++;if(st==='ld'||st==='tr')transit++;if(st==='ar'||st==='cu')arrived++;
    let ni=false;h.cons.forEach(c=>{const b=consBal(h,c);if(!b.n)ni=true});shBalDue(h).forEach(([cu,v])=>outst[cu]=(outst[cu]||0)+v);
    if(ni&&st!=='dn'&&h.cons.length)noInv++;
    const days=h.eta?Math.floor((new Date(today)-new Date(h.eta))/864e5):0;if(h.eta&&days>0&&(st==='ld'||st==='tr'))lateAll++});
  shTodo(all);const oe=Object.entries(outst);
  $('shKpi').innerHTML=`<div class="k"><span>${_t("في الطريق")}</span><b>${transit}</b><small>${lateAll?lateAll+(" "+_t("متأخرة عن موعد الوصول")):(_t("لا تأخير"))}</small></div><div class="k"><span>${_t("وصلت ولم تُسلَّم")}</span><b>${arrived}</b><small>${_t("بانتظار التخليص أو التسليم")}</small></div><div class="k"><span>${_t("فيها حمولات لم تُفوتَر")}</span><b>${noInv}</b><small>${_t("من الشحنات غير المسلَّمة")}</small></div>${(()=>{const P={};all.forEach(h=>shProfit(h).forEach(x=>{if(x.cost||x.rev)P[x.cu]=r2((P[x.cu]||0)+x.net)}));const pe=Object.entries(P);return `<div data-pm="cost" class="k ${pe.some(([,v])=>v<0)?'bad':'good'}"><span>${_t("صافي ربح الشحنات")}</span><b>${pe.length?pe.map(([cu,v])=>fm(v,esc(cu))).join(' · '):'—'}</b><small>${_t("الإيرادات")} − ${_t("التكاليف المسجلة")}</small></div>`})()}<div class="k bad" data-pm="bal"><span>${_t("المتبقي للتحصيل")}</span><b>${oe.length?oe.map(([cu,v])=>fm(v,esc(cu))).join(' · '):'0'}</b><small>${_t("من حمولات كل الشحنات")}</small></div>`;
  $('shChips').innerHTML=[['',(_t("الكل"))]].concat(SHST).map(([k,n])=>`<button type="button" class="chip${fs===k?' on':''}" data-fs="${k}">${n}<small>${k===''?all.length:(cnt[k]||0)}</small></button>`).join('');
  const L2=all.filter(h=>(!fs||shStat(h)===fs)&&(!q||nk([h.code,h.bl,h.cont,h.from,h.to,h.cons.map(c=>c.cust).join(' ')].join(' ')).includes(q))).sort((a,b)=>b.code.localeCompare(a.code));
  let late=0;
  const head=("<div class=\"shG h\"><span>"+_t("الشحنة")+"</span><span>"+_t("العملاء")+"</span><span>"+_t("البوليصة")+"</span><span>"+_t("المسار")+"</span><span>"+_t("الحالة")+"</span><span>"+_t("الوصول المتوقع")+"</span><span>"+_t("التسليم")+"</span><span>"+_t("المتبقي / الربح")+"</span></div>");
  $('shList').innerHTML=L2.length?head+L2.map(h=>{const st=shStat(h),n=h.cons.length,dn=h.cons.filter(c=>dlKey(c)==='full').length,days=h.eta?Math.floor((new Date(today)-new Date(h.eta))/864e5):0,isLate=h.eta&&days>0&&(st==='ld'||st==='tr');if(isLate)late++;
    const rem=shBalDue(h);
    return `<div class="shG"><button class="b2" data-ho="${esc(h.code)}"><b dir="ltr">${esc(h.code)}</b></button><span data-l="${_t("العملاء")}">${n?'<b>'+esc(h.cons[0].cust||'—')+'</b>'+(n>1?`<br><span class="mu">+ ${plA(n-1,(_t("عميل آخر")),(_t("عميلان آخران")),(_t("عملاء آخرين")),(_t("عميلاً آخر")))}</span>`:'')+`<br><button class="b2" data-hx="${esc(h.code)}" style="padding:2px 9px;font-size:8.5pt;margin-top:3px">${SHX[h.code]?("▴ "+_t("إخفاء")):("▾ "+_t("الحمولات")+" (")+n+')'}</button>`:("<span class=\"mu\">"+_t("لا حمولات")+"</span>")}</span><span data-l="${_t("البوليصة")}" dir="ltr" class="mu" style="text-align:start">${esc(h.bl||'—')}${h.cont?'<br>'+esc(h.cont):''}</span><span data-l="${_t("المسار")}">${routeH(h)}<br><span class="mu">${esc(SHM[h.mode]||'')}</span></span><span data-l="${_t("الحالة")}">${shBadge(st)}${h.posted?("<br><span class=\"mu\">🔒 "+_t("مُرحَّلة")+"</span>"):''}<br><button class="b2" data-hr="${esc(h.code)}" style="padding:2px 9px;font-size:8.5pt;margin-top:3px">${_t("تقرير")}</button></span><span data-l="${_t("الوصول المتوقع")}" class="${isLate?'lt':''}">${h.eta?esc(h.eta)+'<br><span class="mu'+(isLate?' lt':'')+'">'+(isLate?(_t("متأخرة")+" ")+days+(" "+_t("يوم")):'')+'</span>':'—'}</span><span data-l="${_t("التسليم")}">${n?`${dn} ${_t("من")} ${n} ${_t("حمولة")}<span class="albar"><i style="width:${n?Math.round(dn/n*100):0}%"></i></span>`:'—'}</span><span data-l="${_t("المتبقي")}"><span data-pm="bal">${rem.length?rem.map(([cu,v])=>`<span class="bd s-partial">${fm(v,esc(cu))}</span>`).join(' '):(n?("<span class=\"bd s-paid\">"+_t("لا متبقٍّ")+"</span>"):'—')}</span>${shProfMini(h)}</span></div>`+(SHX[h.code]&&n?`<div class="shX">`+h.cons.map(c=>`<div class="shXr"><span><b>${esc(c.cust||'—')}</b></span><span class="mu">${esc(c.goods||'—')}</span><span>${esc(c.pk||'0')} <span class="mu">${_t("طرد")}</span></span><span>${esc(c.cbm||'0')} <span class="mu">CBM</span></span><span><span class="bd ${dlCls(c)}">${dlTxt(c)}</span> <small class="mu">${pkDone(c)}/${num(c.pk)}</small></span><span data-pm="bal">${balTxt(consBal(h,c))}</span><button class="b1" data-hc="${esc(h.code)}" data-cid="${esc(c.id)}">${shLocked(h)?("🔒 "+_t("مقفلة")):(_t("تعديل الحمولة"))}</button></div>`).join('')+`</div>`:'')}).join(''):(all.length?("<div class=\"empty\">"+_t("لا توجد شحنات مطابقة لهذا البحث أو الفلتر")+".</div>"):("<div class=\"empty\">"+_t("لا توجد شحنات بعد")+".<br><span>"+_t("أنشئ أول شحنة من زر «+ شحنة جديدة» في الأعلى")+".</span></div>"));
  const act=all.filter(h=>shStat(h)!=='dn').length;$('shSum').textContent=all.length?`${all.length} ${_t("شحنة، منها")} ${act} ${_t("نشطة")}`+(late?` · ${late} ${_t("متأخرة عن موعد الوصول")}`:''):''}
function shNew(){SH={code:shNextCode(),mode:'sea',bl:'',cont:'',car:'',from:'',to:'',sd:'',eta:'',freight:'',cur:$('cur').value||'$',notes:'',st:'ld',hist:[{st:'ld',date:shToday()}],costs:[],cons:[]};SH._new=true;SH._cn=true;shFill()}
const SHX={},SHN0={};const shL=(ev,fn)=>{$('shEd').addEventListener(ev,fn);$('mCons').addEventListener(ev,fn)};
function shEdit(code,cid){const h=SHS.get()[code];if(!h)return;SH=JSON.parse(JSON.stringify(h));SH.cons=SH.cons||[];SH.hist=SH.hist||[];SH.costs=SH.costs||[];if(S.mode!=='h')setMode('h');shFill();
  if(cid)cmOpen(cid)}
function shFill(){$('shLst').style.display='none';$('shEd').style.display='';$('sh_nd').value='';
  const m={code:'code',mode:'mode',bl:'bl',cont:'cont',car:'car',from:'from',to:'to',sd:'sd',eta:'eta',fr:'freight',cur:'cur',notes:'notes'};
  Object.keys(m).forEach(k=>$('sh_'+k).value=SH[m[k]]||'');$('sh_code').readOnly=!SH._new;SH.dlOpen=-1;Object.keys(SHN0).forEach(k=>delete SHN0[k]);SH.cons.forEach(c=>SHN0[c.id]=c.cust);shRender()}
function shRender(){phLoad(SH.code);shStep();shFlow();shConsDraw();shUpd();shDlDraw();shFinBox();shCloseBox();shLockUI()}
function shStep(){const cur=shStat(SH),hist=SH.hist||[];$('shTitle').textContent=SH.code||(_t("شحنة جديدة"));$('shTitleSt').innerHTML=shBadge(cur)+(SH.posted?(" <span class=\"bd s-paid\">🔒 "+_t("مُرحَّلة")+"</span>"):'');$('shStep').innerHTML=SHST.map(([k,n])=>{const hh=hist.find(x=>x.st===k),idx=SHST.findIndex(x=>x[0]===cur),ki=SHST.findIndex(x=>x[0]===k);
  return `<div class="stp ${k===cur?'now':ki<idx?'done':''}"><b>${ki<idx?'✓ ':''}${n}</b><small>${hh?(k!=='dn'&&can('ship')?`<input type="date" class="stpd" data-sd="${k}" value="${esc(hh.date||'')}" title="${_t("تعديل تاريخ هذه المرحلة")}">`:esc(hh.date)):(k==='dn'?(SH.cons.filter(c=>dlKey(c)==='full').length+(" "+_t("من")+" ")+SH.cons.length+(" "+_t("حمولة"))):'—')}</small></div>`}).join('');
  if(!$('sh_nd').value)$('sh_nd').value=shToday();const i=['ld','tr','ar','cu'].indexOf(SH.st==='dn'?'cu':SH.st);$('sh_prev').style.display=i>0?'':'none';$('sh_next').style.display=i<3?'':'none';
  if(i<3)$('sh_next').textContent=(_t("نقل إلى")+" «")+SHN[['ld','tr','ar','cu'][i+1]]+'»';if(i>0)$('sh_prev').textContent=(_t("رجوع إلى")+" «")+SHN[['ld','tr','ar','cu'][i-1]]+'»'}
function shSetSt(k,date){const ex=(SH.hist||[]).find(x=>x.st===k);SH.st=k;SH.hist=(SH.hist||[]).filter(x=>x.st!==k);SH.hist.push({st:k,date:date||(ex&&ex.date)||shToday()});$('sh_nd').value='';shStep()}
function shStepDates(){const o=SHST.map(x=>x[0]),h=SH.hist||[],bad=[];h.forEach(x=>{const i=o.indexOf(x.st);h.forEach(y=>{if(o.indexOf(y.st)>i&&x.date&&y.date&&y.date<x.date&&bad.indexOf(y.st)<0)bad.push(y.st)})});return bad}
$('shStep').addEventListener('change',e=>{const el=e.target.closest&&e.target.closest('[data-sd]');if(!el||!can('ship'))return;const k=el.dataset.sd,v=el.value;if(!v){shStep();return}
  const x=(SH.hist||[]).find(y=>y.st===k);if(x){x.date=v}else{SH.hist.push({st:k,date:v})}
  const bad=shStepDates();shStep();shUpd();toast(bad.length?(_t("تنبيه: تاريخ")+" «")+SHN[bad[0]]+("» "+_t("أسبق من مرحلة سابقة لها")+" — "+_t("تأكد من الترتيب")):(_t("عُدّل تاريخ المرحلة")+" — "+_t("اضغط «حفظ الشحنة» للاعتماد")),bad.length?'err':'')});
const shLocked=h=>!!h.posted||shStat(h)==='dn';
const shLockWhy=h=>(h.posted?(_t("الشحنة مُرحَّلة")):(_t("الشحنة مسلّمة بالكامل")))+(" — "+_t("تعديل الحمولات مقفل"))+(h.posted&&shStat(h)!=='dn'?(". "+_t("لتعديلها ألغِ الترحيل أولاً")):'');
const PTYK=['snN','snP','snA','rcN','rcP','rcC','rcA','nt'],ptyFilled=c=>PTYK.some(k=>String(c[k]||'').trim());
let PTYI=-1;
function ptyOpen(i){const c=SH.cons[i];if(!c)return;PTYI=i;{const cs=new Set();Object.values(SHS.get()).forEach(h=>(h.cons||[]).forEach(x=>x.rcC&&cs.add(x.rcC)));SH.cons.forEach(x=>x.rcC&&cs.add(x.rcC));$('cityl').innerHTML=[...cs].map(v=>'<option value="'+esc(v)+'">').join('')}$('ptT').textContent=(_t("المرسل والمستلم")+" — ")+(c.cust||(_t("حمولة جديدة")));$('mPty').querySelectorAll('[data-p]').forEach(el=>el.value=c[el.dataset.p]||'');$('mPty').classList.add('on')}
$('mPty').addEventListener('input',e=>{const el=e.target,c=SH.cons[PTYI];if(!c||!el.dataset.p)return;c[el.dataset.p]=el.value;const st=$('cmBody').querySelectorAll('tbody tr')[PTYI];if(st){const b=st.querySelector('[data-a=pty]');if(b)b.textContent=(_t("المرسل والمستلم"))+(ptyFilled(c)?' ●':'')}});

/* صور الحمولات — توثيق داخلي. تُضغط في المتصفح (1280px / JPEG) وتُخزَّن في جدول photos على الخادم */
const PHL={},PHT={};let PHC=null,PHV=null;
const phCnt=cid=>{const l=PHL[SH&&SH.code];if(!l)return'';const n=l.filter(x=>x.cid===cid).length;return n?' ('+n+')':''};
async function phLoad(code,force){if(!SRV.on||!code||(PHL[code]&&!force))return;try{const j=await api('phlist',{ship:code});PHL[code]=j.items||[];phBadges()}catch(e){}}
function phBadges(){const l=PHL[SH&&SH.code]||[];document.querySelectorAll('#shCons [data-ph]').forEach(el=>{const n=l.filter(x=>x.cid===el.dataset.ph).length;el.textContent=_t("صور")+(n?' ('+n+')':'')})}
async function phOpen(cid){if(!SRV.on){toast(_t("صور البضاعة تحتاج الاتصال بالخادم"),'err');return}
  if(SH._new||!SHS.get()[SH.code]||!(SHS.get()[SH.code].cons||[]).some(c=>c.id===cid)){if(!(await shSave(true)))return}
  const c=SH.cons.find(x=>x.id===cid);if(!c)return;PHC=cid;
  $('phT').textContent=_t("صور البضاعة")+' — '+(c.cust||'')+' · '+SH.code;$('ph_add').textContent='+ '+_t("إضافة صور");$('mPh').querySelector('[data-close]').textContent=_t("إغلاق");
  $('phHint').textContent=_t("للتوثيق الداخلي فقط ولا تظهر في الفواتير أو الأوراق المطبوعة")+'.';
  $('mPh').classList.add('on');$('phGrid').innerHTML='<div class="empty">'+_t("جارٍ التحميل")+'...</div>';
  await phLoad(SH.code,true);phDraw()}
function phDraw(){const g=$('phGrid'),l=(PHL[SH.code]||[]).filter(x=>x.cid===PHC);
  g.innerHTML=l.length?l.map(x=>`<button type="button" class="ph ld" data-id="${esc(x.id)}"><img alt=""><small>${esc(shDate(x.ts))}${x.by?' · '+esc(x.by):''}</small></button>`).join(''):'<div class="empty">'+_t("لا توجد صور لهذه الحمولة بعد")+'</div>';
  g.querySelectorAll('.ph').forEach(async b=>{const id=b.dataset.id;try{if(!PHT[id]){const j=await api('phget',{id:id,th:1});PHT[id]=j.d}b.querySelector('img').src=PHT[id];b.classList.remove('ld')}catch(e){}})}
const shDate=ts=>{const d=new Date(+ts||0);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function phShrink(file,max,q){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{try{const k=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k)),cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(im,0,0,w,h);URL.revokeObjectURL(u);ok(cv.toDataURL('image/jpeg',q))}catch(e){no(e)}};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('img'))};im.src=u})}
async function phUpload(files){const b=$('ph_add');let n=0,bad=0;b.disabled=true;
  for(const f of files){if(!/^image\//.test(f.type)){bad++;continue}b.textContent=_t("جارٍ الرفع")+' '+(++n)+'/'+files.length;
    try{let full=await phShrink(f,1280,.8);if(full.length>700000)full=await phShrink(f,1280,.6);if(full.length>700000)full=await phShrink(f,1000,.5);const th=await phShrink(f,240,.7),j=await api('phadd',{ship:SH.code,cid:PHC,name:f.name||'',d:full,t:th});PHT[j.item.id]=th;(PHL[SH.code]=PHL[SH.code]||[]).push(j.item);phDraw()}catch(e){bad++;toast(e.message&&!e.net?_t(e.message):_t("تعذر رفع الصورة"),'err')}}
  b.disabled=false;b.textContent='+ '+_t("إضافة صور");phBadges();if(n-bad>0){logAct('إضافة صور حمولة',SH.code);toast(_t("تمت إضافة الصور")+' ('+(n-bad)+')')}}
$('ph_add').addEventListener('click',()=>$('phFile').click());
$('phFile').addEventListener('change',e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)phUpload(fs)});
$('phGrid').addEventListener('click',async e=>{const b=e.target.closest('.ph');if(!b)return;const id=b.dataset.id;PHV=id;const x=(PHL[SH.code]||[]).find(r=>r.id===id)||{};
  $('phImg').src=PHT[id]||'';$('phCap').textContent=shDate(x.ts)+(x.by?' · '+x.by:'');$('phDel').textContent=_t("حذف");$('mPhV').querySelector('[data-close]').textContent=_t("إغلاق");$('phDel').style.display=can('ship')||can('deliver')?'':'none';$('mPhV').classList.add('on');
  try{const j=await api('phget',{id:id});if(PHV===id)$('phImg').src=j.d}catch(er){}});
$('phDel').addEventListener('click',async()=>{const b=$('phDel');if(!b.dataset.arm){b.dataset.arm='1';b.textContent=_t("تأكيد الحذف؟");setTimeout(()=>{b.dataset.arm='';b.textContent=_t("حذف")},3000);return}
  b.dataset.arm='';try{await api('phdel',{id:PHV});PHL[SH.code]=(PHL[SH.code]||[]).filter(r=>r.id!==PHV);delete PHT[PHV];$('mPhV').classList.remove('on');phDraw();phBadges();logAct('حذف صورة حمولة',SH.code);toast(_t("حُذفت الصورة"))}catch(e){toast(e.message,'err')}});
const blankCons=()=>({id:newCid(),cust:'',goods:'',pk:'',cbm:'',kg:'',sm:'',inv:'',dl:[]});
function shConsDraw(){$('shCons').innerHTML=`<table class="shT"><thead><tr><th>${_t("العميل")}</th><th>${_t("البضاعة")}</th><th>${_t("الطرود")}</th><th>CBM</th><th>${_t("كغ")}</th><th>${_t("حصة الشحن")}</th><th>${_t("فواتير مرتبطة")}</th><th data-pm="bal">${_t("المتبقي")}</th><th>${_t("التسليم")}</th><th></th></tr></thead><tbody>`+
 (SH.cons.length?SH.cons.map((c,i)=>`<tr data-i="${i}"><td data-l="${_t("العميل")}"><b>${esc(c.cust||'—')}</b></td><td data-l="${_t("البضاعة")}">${esc(c.goods||'—')}</td><td data-l="${_t("الطرود")}">${esc(c.pk||'0')}</td><td data-l="CBM">${esc(c.cbm||'—')}</td><td data-l="${_t("الوزن كغ")}">${esc(c.kg||'—')}</td><td data-l="${_t("حصة الشحن")}" data-o="share"></td><td data-l="${_t("فواتير مرتبطة")}" dir="ltr" style="text-align:start">${esc(c.inv||'—')}</td><td data-l="${_t("المتبقي")}" data-o="bal" data-pm="bal"></td><td data-l="${_t("التسليم")}" data-o="dl"></td><td data-l=""><div class="acts"><button class="b1" data-a="dl" data-pm="deliver" title="${_t("تسجيل تسليم")}">${_t("تسليم")}</button><button class="b2" data-a="st" title="${_t("ورقة حالة العميل")}">${_t("ورقة حالة")}</button><button class="b2" data-a="ph" title="${_t("صور البضاعة")}">📷 <span data-ph="${esc(c.id)}">${_t("صور")}${phCnt(c.id)}</span></button><button class="b2" data-a="inv" data-pm="inv" title="${_t("فاتورة لهذا العميل")}">${_t("فاتورة")}</button><button class="b2" data-a="pay" data-pm="rc" title="${_t("تسجيل دفعة من هذا العميل عن هذه الشحنة")}">${_t("دفعة")}</button></div></td></tr>`).join(''):("<tr><td colspan=\"10\" class=\"hint\" style=\"padding:16px;text-align:center\">"+_t("لا توجد حمولات بعد. اضغط «إدارة الحمولات» لإضافة عملاء الشحنة")+".</td></tr>"))+
 `</tbody><tfoot><tr><td colspan="2">${_t("الإجمالي")}${_t("،")} <span id="shCnt"></span></td><td id="shTp"></td><td id="shTc"></td><td id="shTk"></td><td id="shTs"></td><td></td><td id="shTb" data-pm="bal"></td><td></td><td></td></tr></tfoot></table>`;
 if($('mCons').classList.contains('on'))cmDraw()}
function cmDraw(){$('cmT').textContent=(_t("حمولات الشحنة")+" ")+(SH.code||'');$('cmBody').innerHTML=`<table class="shT"><thead><tr><th>${_t("العميل")}</th><th>${_t("البضاعة")}</th><th>${_t("الطرود")}</th><th>CBM</th><th>${_t("كغ")}</th><th>${_t("حصة الشحن")}</th><th>${_t("فواتير مرتبطة")}</th><th></th></tr></thead><tbody>`+
 SH.cons.map((c,i)=>`<tr data-i="${i}"><td data-l="${_t("العميل")}"><input data-k="cust" list="custs" value="${esc(c.cust)}" placeholder="${_t("اسم العميل")}" style="min-width:150px"></td><td data-l="${_t("البضاعة")}"><input data-k="goods" value="${esc(c.goods)}" style="min-width:130px"></td><td data-l="${_t("الطرود")}"><input data-k="pk" inputmode="numeric" value="${esc(c.pk)}" style="width:62px"></td><td data-l="CBM"><input data-k="cbm" inputmode="decimal" value="${esc(c.cbm)}" style="width:70px"></td><td data-l="${_t("الوزن كغ")}"><input data-k="kg" inputmode="decimal" value="${esc(c.kg)}" style="width:76px"></td><td data-l="${_t("حصة الشحن")}"><input data-k="sm" inputmode="decimal" value="${esc(c.sm)}" data-o="share" style="width:96px"></td><td data-l="${_t("فواتير مرتبطة")}"><input data-k="inv" list="rinv" dir="ltr" value="${esc(c.inv)}" placeholder="PST-0001" style="width:120px"></td><td data-l=""><div class="acts"><button class="b2" data-a="pty" title="${_t("معلومات المرسل والمستلم وملاحظات الحمولة")}">${_t("المرسل والمستلم")}${ptyFilled(c)?' ●':''}</button><button class="ib" data-a="rm" title="${_t("حذف الحمولة")}">✕</button></div></td></tr>`).join('')+`</tbody></table>`;
 $('cmNote').textContent=(_t("يوزَّع الشحن على الحمولات بنسبة CBM تلقائياً، واكتب مبلغاً في خانة الحصة لتعديلها يدوياً لحمولة معيّنة")+".");shUpd()}
function cmOpen(cid){if(!need('ship'))return;if(shLocked(SH)){toast(shLockWhy(SH),'err');return}
  if(!SH.cons.length)SH.cons.push(blankCons());$('mCons').classList.add('on');shConsDraw();shUpd();
  const i=cid?SH.cons.findIndex(c=>c.id===cid):SH.cons.length-1,tr=$('cmBody').querySelectorAll('tbody tr')[i];
  if(tr){if(cid)tr.classList.add('hl');tr.scrollIntoView({block:'center'});const inp=tr.querySelector('input');inp&&inp.focus({preventScroll:true})}}
function shLockUI(){const lk=shLocked(SH),dn=shStat(SH)==='dn',cm=$('sh_cm'),pb=$('sh_post'),n=$('shLockNote');
  ['sh_fr','sh_cur'].forEach(id=>{const e=$(id);if(e)e.disabled=lk});cm.textContent=lk?("🔒 "+_t("الحمولات مقفلة")):(_t("إدارة الحمولات"));cm.className=lk?'b2':'b1';
  $('sh_prep2').style.display=(SH._new||!(SH.cons||[]).length)?'none':'';pb.style.display=(SH._new||dn)?'none':'';pb.textContent=SH.posted?(_t("إلغاء الترحيل")):(_t("ترحيل الشحنة"));pb.className=SH.posted?'b3':'b2';
  n.textContent=SH.posted?(_t("مُرحَّلة"))+(SH.postedAt?(" "+_t("بتاريخ")+" ")+SH.postedAt:'')+(SH.postedBy?(" "+_t("بواسطة")+" ")+SH.postedBy:'')+(" — "+_t("الحمولات وأجرة الشحن مقفلة، ويبقى التسليم والفواتير والدفعات والتكاليف متاحة")+"."):(dn?(_t("الشحنة مسلّمة بالكامل")+" — "+_t("الحمولات وأجرة الشحن مقفلة")+"."):(SH._new?'':(_t("بعد مراجعة الحمولات رحّل الشحنة لقفل تعديلها")+".")))}
async function shPost(){if(!need('post'))return;const b=$('sh_post');
  if(SH.posted){if(shStat(SH)==='dn'){toast((_t("الشحنة مسلّمة بالكامل ولا يُلغى ترحيلها")),'err');return}
    if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("تأكيد إلغاء الترحيل؟"));setTimeout(()=>{b.dataset.arm='';shLockUI()},3500);return}
    b.dataset.arm='';SH.posted=false;delete SH.postedAt;delete SH.postedBy;if(await shSave(true)){logAct('إلغاء ترحيل شحنة',SH.code);toast((_t("أُلغي الترحيل")+" — "+_t("الحمولات قابلة للتعديل")))}return}
  const cs=SH.cons.filter(c=>(c.cust||'').trim()||(c.goods||'').trim()||num(c.pk));
  if(!cs.length){toast((_t("أضف حمولة واحدة على الأقل قبل الترحيل")),'err');return}
  if(cs.some(c=>!num(c.pk))){toast((_t("اكتب عدد الطرود لكل حمولة قبل الترحيل")),'err');return}
  if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("تأكيد الترحيل وقفل الحمولات؟"));setTimeout(()=>{b.dataset.arm='';shLockUI()},3500);return}
  b.dataset.arm='';SH.posted=true;SH.postedAt=shToday();SH.postedBy=ME?ME.name:'';
  if(await shSave(true)){logAct('ترحيل شحنة',SH.code);toast((_t("رُحِّلت الشحنة")+" ")+SH.code+(" — "+_t("أُقفل تعديل الحمولات")))}else{SH.posted=false;delete SH.postedAt;delete SH.postedBy;shLockUI()}}
function shUpd(){setTimeout(()=>{shFinBox();shCloseBox()},0);const sh=shShares(SH),rows=$('shCons').querySelectorAll('tbody tr');let tp=0,tc=0,tk=0,R={};
  SH.cons.forEach((c,i)=>{tp+=num(c.pk);tc+=num(c.cbm);tk+=num(c.kg);const r=rows[i];if(!r)return;const b=consBal(SH,c);balDue(b).forEach(([cu,v])=>R[cu]=(R[cu]||0)+v);
   r.querySelector('[data-o=bal]').innerHTML=balTxt(b);r.querySelector('[data-o=dl]').innerHTML=`<span class="bd ${dlCls(c)}">${dlTxt(c)}</span> <small class="hint">${pkDone(c)}/${num(c.pk)}</small>`;
   r.querySelector('[data-o=share]').textContent=f(sh[i])+(String(c.sm==null?'':c.sm).trim()!==''?' ✎':'');});
  $('cmBody').querySelectorAll('tbody tr').forEach((r,i)=>{const si=r.querySelector('[data-o=share]');if(si&&sh[i]!=null)si.placeholder=f(sh[i])});
  $('shCnt').textContent=SH.cons.length+(" "+_t("عملاء"));$('shTp').textContent=tp;$('shTc').textContent=Math.round(tc*100)/100;$('shTk').textContent=Math.round(tk*100)/100;$('shTs').textContent=f(sh.reduce((a,b)=>a+b,0))+' '+(SH.cur||'');
  $('shTb').innerHTML=Object.keys(R).length?Object.entries(R).map(([cu,v])=>`<span class="bd s-partial">${fm(v,esc(cu))}</span>`).join(' '):'—';
  const fr=num(SH.freight),tcb=SH.cons.reduce((a,c)=>a+num(c.cbm),0);$('shRate').textContent=fr&&tcb?`${_t("يوزَّع الشحن بنسبة CBM")}: ${fm(fr/tcb,SH.cur||'')} ${_t("لكل م")}³. ${_t("اكتب مبلغاً في خانة الحصة لتعديلها يدوياً لعميل معيّن")}.`:(_t("يوزَّع إجمالي أجرة الشحن على العملاء بنسبة CBM تلقائياً، ويمكن تعديل حصة أي عميل يدوياً")+".");
}
function shReadHead(){const m={code:'code',mode:'mode',bl:'bl',cont:'cont',car:'car',from:'from',to:'to',sd:'sd',eta:'eta',fr:'freight',cur:'cur',notes:'notes'};Object.keys(m).forEach(k=>SH[m[k]]=$('sh_'+k).value.trim())}
async function shSave(silent){if(!silent&&!can('ship')&&!can('cost')){toast((_t("لا تملك صلاحية تعديل الشحنات")),'err');return false}shReadHead();const code=SH.code.toUpperCase();
  if(!code){bad($('sh_code'),(_t("رقم الشحنة مطلوب")));return false}
  const D=SHS.get();if(SH._new&&D[code]){bad($('sh_code'),(_t("رقم الشحنة مستخدم")));return false}
  {const old=D[code];if(!SH._new&&old&&shLocked(old)){SH.cons=(old.cons||[]).map(oc=>{const nc=SH.cons.find(x=>x.id===oc.id);return Object.assign({},oc,{dl:nc?nc.dl:oc.dl})});SH.freight=old.freight;SH.cur=old.cur}}
  const openId=SH.dlOpen>=0&&SH.cons[SH.dlOpen]?SH.cons[SH.dlOpen].id:null;SH.code=code;SH.cons=SH.cons.filter(c=>(c.cust||'').trim()||(c.goods||'').trim()||num(c.pk));
  SH.costs=(SH.costs||[]).filter(x=>num(x.amt)||String(x.desc||'').trim());SH.dlOpen=openId?SH.cons.findIndex(c=>c.id===openId):-1;const nm=SH.cons.find(c=>!(c.cust||'').trim());if(nm){toast((_t("اكتب اسم العميل لكل حمولة")),'err');return false}
  {const bp=SH.cons.find(c=>!(num(c.pk)>0));if(bp){if(!shLocked(D[code]||{cons:[]})&&!$('mCons').classList.contains('on'))cmOpen(bp.id);toast((_t("اكتب عدد الطرود (أكبر من صفر) للحمولة")+" «")+bp.cust+'»','err');return false}}
  {const q=SH.cons.find(c=>!c.custOk&&!findCust(c.cust)&&custNear(c.cust).length);if(q){if(!$('mCons').classList.contains('on'))cmOpen();custHint(SH.cons.indexOf(q));toast((_t("اسم")+" «")+q.cust+("» "+_t("قريب من عميل موجود")+" — "+_t("اختر من الاقتراح أو أكّد أنه عميل جديد")),'err');return false}}
  const isNewC=!!SH._cn;const d=JSON.parse(JSON.stringify(SH));delete d._cn;delete d._new;delete d.dlOpen;{const o=D[code];if(o){if(o.costs!==undefined)d.costs=o.costs;else delete d.costs;if(o.fin!==undefined)d.fin=o.fin;else delete d.fin}}d.ts=Date.now();d.stat=shStat(d);D[code]=d;if(!SHS.set(D)){toast((_t("لم تُحفظ الشحنة: مساحة التخزين ممتلئة")),'err');return false}d.cons.forEach(c=>ensureCust(c.cust));{const mm=/^SH-(\d+)$/i.exec(code);if(mm&&+mm[1]>LS.get('pst_shseq',0))LS.set('pst_shseq',+mm[1])}SH._new=false;$('sh_code').readOnly=true;
  if(CL.u()){const r=await shCloud(code,d,isNewC);if(r==='conflict')return false}
  if(!silent){toast((_t("تم حفظ الشحنة")+" ")+code);logAct('حفظ شحنة',code)}{const t=$('sh_save');if(t){t.dataset.dirty='';t.textContent=(_t("حفظ الشحنة"))}}shRender();return true}
async function shCloud(code,d,isNew,force){
  try{const j=await api('shsave',{code:code,d:d,isNew:!!isNew,force:force?1:0});SH._cn=false;
    const D=SHS.get();if(D[code]){D[code].ver=j.ver;D[code].ts=j.ts||D[code].ts;SHS.set(D)}SH.ver=j.ver;{const Q=QS.get();if(Q['shsave|'+code]){delete Q['shsave|'+code];QS.set(Q);qBadge()}}return 'ok'}
  catch(e){
    if(e.message==='conflict'){shConflict(code,d,e.j);return 'conflict'}
    if(e.message==='deleted'){const D=SHS.get();delete D[code];SHS.set(D);{const Q=QS.get();delete Q['shsave|'+code];QS.set(Q);qBadge()}toast(_t('حُذفت هذه الشحنة من جهاز آخر'),'err');shShowList();shDraw();return 'err'}
    if(e.message==='exists'&&isNew){try{const n=(await api('shnext')).code,D=SHS.get(),old=code;delete D[old];d.code=n;D[n]=d;SHS.set(D);SH.code=n;$('sh_code').value=n;toast((_t("الرقم")+" ")+old+(" "+_t("مستخدم على السيرفر")+" — "+_t("حُفظت الشحنة بالرقم")+" ")+n);return await shCloud(n,d,true)}catch(x){toast((_t("تعذّر تحديد رقم جديد")+": ")+x.message,'err');return 'err'}}
    if(e.net){qAdd('shsave',code,{d:d,isNew:!!isNew});toast((_t("حُفظت على هذا الجهاز وستُرسل تلقائياً عند عودة الاتصال")),'err');return 'queued'}
    toast((_t("حُفظت على هذا الجهاز، وتعذّرت المزامنة")+": ")+e.message,'err');return 'err'}}
function shConflict(code,d,j){$('cfTxt').innerHTML=(_t("الشحنة")+" <b dir=\"ltr\">")+esc(code)+("</b> "+_t("عُدِّلت من جهاز أو مستخدم آخر بعد أن فتحتها. اختر ما يُعتمد")+":");
  CFX={code:code,d:d,srv:j&&j.d,ver:j&&j.ver};$('mConf').classList.add('on')}
let CFX=null;
async function cfDo(k){const x=CFX;$('mConf').classList.remove('on');if(!x)return;
  if(k==='srv'){const D=SHS.get(),o=D[x.code]||{};const srv=Object.assign({},x.srv);if(srv.costs===undefined&&o.costs)srv.costs=o.costs;D[x.code]=srv;SHS.set(D);{const Q=QS.get();delete Q['shsave|'+x.code];QS.set(Q);qBadge()}SH=JSON.parse(JSON.stringify(srv));SH.cons=SH.cons||[];SH.hist=SH.hist||[];SH.costs=SH.costs||[];shFill();toast((_t("حُمّلت نسخة السيرفر وأُهملت تعديلاتك")))}
  else if(k==='mine'){const d=Object.assign({},x.d,{ver:x.ver});const r=await shCloud(x.code,d,false,true);if(r==='ok'){shRender();toast((_t("حُفظت تعديلاتك فوق نسخة السيرفر")))}}}
async function shDelete(){if(!need('ship_del'))return;const b=$('sh_del');if(SH._new){shShowList();return}if((SH.cons||[]).some(c=>(c.dl||[]).length)){toast((_t("لا يمكن حذف شحنة فيها تسليمات مسجلة")+" — "+_t("سجلات التسليم وثائق")),'err');return}
  if(SH.posted){toast((_t("الشحنة مُرحَّلة")+" — "+_t("ألغِ الترحيل أولاً ثم احذفها")),'err');return}
  {const AI=shAI(),ex=new Set();Object.keys(AI).forEach(k=>{const d=AI[k];if(d&&d.ship===SH.code&&d.st!=='void')ex.add(k)});(SH.cons||[]).forEach(c=>String(c.inv||'').split(/[,،\s]+/).filter(Boolean).forEach(k=>{const d=AI[k];if(d&&d.st!=='void')ex.add(k)}));if(ex.size){toast((_t("لا يمكن حذف شحنة مرتبطة بفواتير")+" (")+[...ex].slice(0,4).join((_t("،")+" "))+(ex.size>4?'…':'')+(") — "+_t("ألغِ الفواتير (إبطال) أو افصل ربطها أولاً")),'err');return}}if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("تأكيد حذف الشحنة؟"));setTimeout(()=>{b.dataset.arm='';b.textContent=(_t("حذف الشحنة"))},3500);return}
  b.dataset.arm='';b.textContent=(_t("حذف الشحنة"));if(CL.u()){try{await api('shdel',{code:SH.code})}catch(e){toast(e.net?_t('تعذر الاتصال بالخادم — لم تُحذف الشحنة'):e.message,'err');return}}const D=SHS.get();delete D[SH.code];SHS.set(D);{const Q=QS.get();delete Q['shsave|'+SH.code];QS.set(Q);qBadge()}logAct('حذف شحنة',SH.code);toast((_t("تم حذف الشحنة")));shShowList();shDraw()}
/* التسليم */
function shDlDraw(){const box=$('shDl'),i=SH.dlOpen;if(i==null||i<0||!SH.cons[i]){box.style.display='none';return}
  const c=SH.cons[i],left=Math.max(0,num(c.pk)-pkDone(c)),b=consBal(SH,c),due=balDue(b);box.style.display='';
  box.innerHTML=`<div class="cr" style="border:0"><b>${_t("تسليم حمولة")}: ${esc(c.cust)}</b><span class="bd ${dlCls(c)}">${dlTxt(c)}</span><span class="hint">${_t("المسلَّم")} ${pkDone(c)} ${_t("من")} ${num(c.pk)} ${_t("طرد، والمتبقي")} ${left}</span><button class="b2" data-a="dlx" style="margin-inline-start:auto">${_t("إغلاق")}</button></div>
  <div class="rg"><label>${_t("عدد الطرود المسلَّمة")}<input id="dl_pk" inputmode="numeric" value="${left}"></label><label>${_t("تاريخ التسليم")}<input id="dl_date" type="date" value="${shToday()}"></label><label class="w2">${_t("اسم المستلم")}<input id="dl_by"></label><label class="w2">${_t("الهوية أو الهاتف")}<input id="dl_id" dir="ltr"></label><label class="w4">${_t("ملاحظة")}<input id="dl_note"></label></div>
  ${due.length?`<div class="shWarn">${_t("تنبيه: على هذا العميل رصيد غير مسدّد")} ${can('bal')?'('+due.map(([cu,v])=>fm(v,esc(cu))).join((_t("،")+" "))+')':''}. ${_t("يمكنك المتابعة، ويُسجَّل مع التسليم أن عليه رصيداً")}.</div>`:''}
  <div class="cr" style="border:0"><button class="b1" data-a="dlsave" id="dl_save">${_t("تسجيل التسليم وإنشاء وصل")}</button></div>
  ${(c.dl||[]).length?`<table class="rc-tb"><thead><tr><th>${_t("الوصل")}</th><th>${_t("التاريخ")}</th><th>${_t("الطرود")}</th><th>${_t("المستلم")}</th><th></th></tr></thead><tbody>${c.dl.map((x,j)=>`<tr><td dir="ltr">${esc(x.no)}</td><td>${esc(x.date)}</td><td>${num(x.pk)}</td><td>${esc(x.by||'')}</td><td><button class="b2" data-a="rcpt" data-j="${j}">${_t("طباعة الوصل")}</button></td></tr>`).join('')}</tbody></table>`:''}`}
async function shDlSave(){if(!need('deliver'))return;const c=SH.cons[SH.dlOpen],pk=num($('dl_pk').value),left=num(c.pk)-pkDone(c);
  if(pk<=0){bad($('dl_pk'),(_t("اكتب عدد الطرود")));return}if(pk>left){bad($('dl_pk'),(_t("أكبر من المتبقي")+" (")+left+')');return}
  const F={date:$('dl_date').value,by:$('dl_by').value.trim(),idn:$('dl_id').value.trim(),note:$('dl_note').value.trim()},due=balDue(consBal(SH,c)),b=$('dl_save');
  const W=[],st0=shStat(SH);if(due.length)W.push((_t("على العميل رصيد غير مسدّد")));if(st0==='ld'||st0==='tr')W.push((_t("الشحنة لم تصل بعد (حالتها")+" «")+SHN[st0]+'»)');
  const willClose=pk>=left&&SH.cons.every(x=>x===c||dlKey(x)==='full');if(willClose){const pend=shPending(SH,c);if(pend.length)W.push((_t("هذا التسليم يُقفل الشحنة وعليها معلّقات")+": ")+pend.join((_t("؛")+" ")))}
  if(W.length&&!b.dataset.arm){b.dataset.arm='1';b.textContent=W.join(' — ')+(" — "+_t("اضغط مرة أخرى للتأكيد"));setTimeout(()=>{if(b&&b.isConnected){b.dataset.arm='';b.textContent=(_t("تسجيل التسليم وإنشاء وصل"))}},6000);return}
  if(!(await shSave(true)))return;const i2=SH.dlOpen;if(i2<0)return;
  const n=LS.get('pst_dseq',0)+1;LS.set('pst_dseq',n);const x={no:'DL-'+pad(n),date:F.date||shToday(),pk:pk,by:F.by,idn:F.idn,note:F.note,owed:due.length?due.map(([cu,v])=>fm(v,cu)).join((_t("،")+" ")):''};
  SH.cons[i2].dl=(SH.cons[i2].dl||[]).concat([x]);if(shStat(SH)==='dn'){SH.hist=(SH.hist||[]).filter(y=>y.st!=='dn');SH.hist.push({st:'dn',date:x.date})}
  await shSave(true);logAct('تسليم',x.no+' · '+SH.code+' · '+SH.cons[i2].cust+' · '+pk+' طرد');toast((_t("تم تسجيل التسليم")+" ")+x.no+(shStat(SH)==='dn'?(" — "+_t("اكتملت الشحنة وأصبحت «سُلّمت»")):''));shRender();setTimeout(()=>{const t=$('shDl');t&&t.scrollIntoView({block:'nearest'})},0)}
