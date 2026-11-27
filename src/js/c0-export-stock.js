/* ===== نظام ستوك التصديرات — قسم مستقل تماماً: جداوله وأوامره (xs*) خاصة به، ولا يقرأ ولا يكتب في الفواتير أو الشحنات أو العملاء أو الأرباح ===== */
const XS={inv:[],exp:[],tab:'sum',loaded:false,loading:false,f:{kind:'',st:'',q:''},err:''};
const XS_DAYS=90,XS_WARN=[30,7];
const xsIso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const xsToday=()=>xsIso(new Date());
const xsAdd=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return xsIso(d)};
const xsLeft=s=>Math.round((Date.parse(s+'T00:00:00')-Date.parse(xsToday()+'T00:00:00'))/864e5);
const xsInvById=id=>XS.inv.find(x=>x.id===id);
const xsExpsOf=(id,dr)=>XS.exp.filter(e=>!!e.posted!==!!dr&&(e.lines||[]).some(l=>l.inv===id)).sort((a,b)=>(a.date+a.id).localeCompare(b.date+b.id));
function xsInfo(v){const ex=xsExpsOf(v.id),ls=[],dr=[];ex.forEach(e=>e.lines.forEach(l=>{if(l.inv===v.id)ls.push({e:e,l:l})}));xsExpsOf(v.id,true).forEach(e=>e.lines.forEach(l=>{if(l.inv===v.id)dr.push({e:e,l:l})}));
  let st=v.closed?'closed':ls.some(x=>x.l.mode==='full')?'full':ls.length?'part':'none';
  const lastPart=[...ls].reverse().find(x=>x.l.mode==='part'),rest=st==='part'&&lastPart?lastPart.l.rest:'';
  let al='',left=null;if(v.kind==='exp'&&v.due&&(st==='none'||st==='part')){left=xsLeft(v.due);al=left<0?'over':left<=XS_WARN[1]?'u7':left<=XS_WARN[0]?'u30':'ok'}
  return{st:st,ls:ls,dr:dr,rest:rest,al:al,left:left}}
const xsStL=()=>({none:_t("لم تُصدَّر"),part:_t("تصدير جزئي"),full:_t("مكتملة"),closed:_t("مُغلقة"),dom:_t("مبيعات داخلية")});
const xsPostTag=e=>e.posted?`<span class="bd s-paid">🔒 ${_t("مُرحَّلة")}</span>`:`<span class="bd s-partial">${_t("مفتوحة")}</span>`;
const xsStC={none:'s-sent',part:'s-partial',full:'s-paid',closed:'',dom:''};
function xsLeftTag(i){if(i.left==null)return'';const m=i.al==='over'?(_t("انتهت منذ")+' '+(-i.left)+' '+_t("يوم")):i.left===0?_t("تنتهي اليوم"):(i.left+' '+_t("يوم"));return`<span class="xsA xsA-${i.al}">${m}</span>`}
async function xsLoad(force){if(!SRV.on||!can('xs')||XS.loading||(XS.loaded&&!force))return;XS.loading=true;XS.err='';
  try{const j=await api('xslist');XS.inv=j.inv||[];XS.exp=j.exp||[];XS.loaded=true}catch(e){XS.err=e.net?_t("تعذر الاتصال بالخادم"):e.message}
  XS.loading=false;xsBadge();if(S.mode==='x')xsDraw()}
function xsAlertCount(){return XS.inv.filter(v=>{const i=xsInfo(v);return i.al==='over'||i.al==='u7'||i.al==='u30'}).length}
function xsBadge(){const n=xsAlertCount();['sd_x','tabX'].forEach(id=>{const b=$(id);if(!b)return;let e=b.querySelector('.xsN');if(!n){if(e)e.remove();return}if(!e){e=document.createElement('i');e.className='xsN';b.appendChild(e)}e.textContent=n})}
function xsTab(t){XS.tab=t;xsDraw()}
const xsOpt=(a,v)=>a.map(x=>`<option value="${esc(x[0])}"${x[0]===v?' selected':''}>${esc(x[1])}</option>`).join('');
const xsMoney=v=>(v.cur?v.cur+' ':'')+(+v.total||0).toLocaleString('en-US',{maximumFractionDigits:2});
function xsDraw(){const box=$('xs');if(!box||S.mode!=='x')return;
  if(!can('xs')){box.innerHTML='<p class="hint">'+_t("لا تملك صلاحية")+'</p>';return}
  if(!SRV.on){box.innerHTML='<div class="xsEmpty">'+_t("نظام ستوك التصديرات يعمل مع الخادم فقط. سجّل الدخول من النسخة المنشورة")+'.</div>';return}
  const T=[['sum',_t("الملخص")],['inv',_t("الفواتير")],['exp',_t("سجلات التصدير")]];
  let h=`<div class="xsHd"><div><h2>${_t("نظام ستوك التصديرات")}</h2><p class="hint">${_t("قسم مستقل: فواتير الموردين (معدّة للتصدير أو مبيعات داخلية) وسجلات التصدير. لا يؤثر على الفواتير والحسابات الأخرى")}.</p></div><div class="xsAct"><button class="b1" data-xa="ni">+ ${_t("فاتورة")}</button><button class="b1" data-xa="ne">+ ${_t("سجل تصدير")}</button><button class="b2" data-xa="rl" title="${_t("تحديث")}">↻</button></div></div>`+
   `<div class="chips">${T.map(t=>`<button class="chip${XS.tab===t[0]?' on':''}" data-xt="${t[0]}">${t[1]}${t[0]==='inv'?`<small>${XS.inv.length}</small>`:t[0]==='exp'?`<small>${XS.exp.length}</small>`:''}</button>`).join('')}</div>`;
  if(XS.err)h+=`<div class="xsErr">${esc(XS.err)}</div>`;
  if(!XS.loaded&&!XS.err)h+=`<p class="hint">${_t("جارٍ التحميل")}...</p>`;
  else if(XS.loaded)h+=XS.tab==='inv'?xsInvTab():XS.tab==='exp'?xsExpTab():xsSumTab();
  box.innerHTML=h}
function xsSumTab(){const L=XS.inv.map(v=>({v:v,i:xsInfo(v)})),n=s=>L.filter(x=>x.i.st===s).length,
   soon=L.filter(x=>x.i.al==='u30'||x.i.al==='u7').length,over=L.filter(x=>x.i.al==='over').length,dom=XS.inv.filter(v=>v.kind!=='exp').length;
  const open=L.filter(x=>x.i.st==='none'||x.i.st==='part').sort((a,b)=>(a.v.due||'9999').localeCompare(b.v.due||'9999')||(a.v.date||'').localeCompare(b.v.date||''));
  let h=`<div class="kpi"><div class="k"><span>${_t("لم تُصدَّر")}</span><b>${n('none')}</b></div><div class="k"><span>${_t("تصدير جزئي")}</span><b>${n('part')}</b></div><div class="k ${soon?'bad':''}"><span>${_t("مهلتها تنتهي خلال 30 يوماً")}</span><b>${soon}</b></div><div class="k ${over?'bad':''}"><span>${_t("منتهية المهلة")}</span><b>${over}</b></div><div class="k good"><span>${_t("مكتملة")}</span><b>${n('full')}</b><small>${_t("مبيعات داخلية")}: ${dom}</small></div><div class="k"><span>${_t("تصديرات مفتوحة غير مرحّلة")}</span><b>${XS.exp.filter(e=>!e.posted).length}</b></div></div>`;
  h+=`<h3 class="shH">${_t("الفواتير غير المصدَّرة بالكامل (الأقرب مهلةً أولاً)")}</h3>`;
  if(!open.length)return h+`<div class="xsEmpty">${_t("لا توجد فواتير مفتوحة")}.</div>`;
  return h+`<div class="shScroll"><table class="ccT"><thead><tr><th>${_t("الفاتورة")}</th><th>${_t("النوع")}</th><th>${_t("المورد")}</th><th>${_t("العميل")}</th><th>${_t("المهلة")}</th><th>${_t("المتبقي")}</th><th>${_t("الحالة")}</th><th></th></tr></thead><tbody>`+open.map(x=>`<tr class="xsR xsR-${x.i.al}"><td dir="ltr"><b>${esc(x.v.no)}</b></td><td>${x.v.kind==='exp'?_t("معدّة للتصدير"):_t("مبيعات داخلية")}</td><td>${esc(x.v.supplier)}</td><td>${esc(x.v.customer)}</td><td dir="ltr">${x.v.kind==='exp'?esc(x.v.due)+' '+xsLeftTag(x.i):'—'}</td><td class="xsNote">${esc(x.i.rest||'—')}</td><td><span class="bd ${xsStC[x.i.st]}">${xsStL()[x.i.st]}</span></td><td><button class="b2" data-xa="oi" data-id="${esc(x.v.id)}">${_t("فتح")}</button></td></tr>`).join('')+`</tbody></table></div>`}
function xsInvTab(){const F=XS.f,q=F.q.trim().toLowerCase(),SL=xsStL();
  let L=XS.inv.map(v=>({v:v,i:xsInfo(v)})).filter(x=>(!F.kind||x.v.kind===F.kind)&&(!F.st||x.i.st===F.st||(F.st==='over'&&x.i.al==='over')||(F.st==='soon'&&(x.i.al==='u30'||x.i.al==='u7')))&&(!q||[x.v.no,x.v.supplier,x.v.customer,x.v.notes].join(' ').toLowerCase().includes(q)));
  L.sort((a,b)=>(b.v.date||'').localeCompare(a.v.date||''));
  let h=`<div class="xsFl"><select data-xf="kind">${xsOpt([['',_t("كل الأنواع")],['exp',_t("معدّة للتصدير")],['dom',_t("مبيعات داخلية")]],F.kind)}</select><select data-xf="st">${xsOpt([['',_t("كل الحالات")],['none',SL.none],['part',SL.part],['full',SL.full],['closed',SL.closed],['soon',_t("مهلتها قريبة")],['over',_t("منتهية المهلة")]],F.st)}</select><input data-xf="q" value="${esc(F.q)}" placeholder="${_t("بحث: رقم، مورد، عميل")}"><button class="b2" data-xa="ci">${_t("تصدير CSV")}</button></div>`;
  if(!L.length)return h+`<div class="xsEmpty">${XS.inv.length?_t("لا نتائج"):_t("لم تُسجَّل فواتير بعد. اضغط «+ فاتورة»")}.</div>`;
  return h+`<div class="shScroll"><table class="ccT"><thead><tr><th>${_t("الرقم")}</th><th>${_t("المورد")}</th><th>${_t("العميل")}</th><th>${_t("النوع")}</th><th>${_t("الإصدار")}</th><th>${_t("المهلة")}</th><th class="num">${_t("الإجمالي")}</th><th>${_t("الحالة")}</th><th>${_t("المتبقي")}</th><th></th></tr></thead><tbody>`+L.map(x=>{const v=x.v,i=x.i;return`<tr class="xsR xsR-${i.al}"><td dir="ltr"><b>${esc(v.no)}</b><br><small class="mu">${esc(v.id)}${(v.files||[]).length?' · 📎'+v.files.length:''}</small></td><td>${esc(v.supplier)}</td><td>${esc(v.customer)}</td><td>${v.kind==='exp'?_t("معدّة للتصدير"):_t("مبيعات داخلية")}</td><td dir="ltr">${esc(v.date)}</td><td dir="ltr">${v.kind==='exp'?esc(v.due)+' '+xsLeftTag(i):'—'}</td><td class="num">${esc(xsMoney(v))}</td><td><span class="bd ${xsStC[i.st]}">${SL[i.st]}</span></td><td class="xsNote">${esc(i.rest||(i.st==='closed'&&v.closed?v.closed.note:'')||'—')}</td><td class="xsBt">${i.dr.length?`<span class="xsDr" title="${_t("ضمن تصديرة مفتوحة غير مرحّلة")}">${esc(i.dr[0].e.id)}</span>`:(i.st==='none'||i.st==='part')?`<button class="b2" data-xa="at" data-id="${esc(v.id)}">+ ${_t("تصديرة")}</button>`:''}<button class="b2" data-xa="oi" data-id="${esc(v.id)}">${_t("فتح")}</button></td></tr>`}).join('')+`</tbody></table></div>`}
function xsExpTab(){let h=`<div class="xsFl"><button class="b2" data-xa="ce">${_t("تصدير CSV")}</button></div>`;
  if(!XS.exp.length)return h+`<div class="xsEmpty">${_t("لا توجد سجلات تصدير بعد. اضغط «+ سجل تصدير»")}.</div>`;
  const L=[...XS.exp].sort((a,b)=>(!!a.posted-!!b.posted)||(b.date+b.id).localeCompare(a.date+a.id));
  return h+`<div class="shScroll"><table class="ccT"><thead><tr><th>${_t("الشحنة / التصديرة")}</th><th>${_t("الحالة")}</th><th>${_t("التاريخ")}</th><th>${_t("البيان الجمركي")}</th><th>${_t("الفواتير المصدَّرة وما بقي")}</th><th></th></tr></thead><tbody>`+L.map(e=>`<tr class="xsR"><td><b>${esc(e.ref)}</b><br><small class="mu">${esc(e.id)}${(e.files||[]).length?' · 📎'+e.files.length:''}</small></td><td>${xsPostTag(e)}</td><td dir="ltr">${esc(e.date)}</td><td dir="ltr">${esc(e.decl||'—')}</td><td>`+(e.lines||[]).map(l=>{const v=xsInvById(l.inv)||{no:l.inv,supplier:'',customer:''};return`<div class="xsLn"><span class="bd ${l.mode==='full'?'s-paid':'s-partial'}">${l.mode==='full'?_t("كاملة"):_t("جزء")}</span> <b dir="ltr">${esc(v.no)}</b> <span class="mu">${esc(v.supplier)} → ${esc(v.customer)}</span>${l.out?`<div class="xsNote">${_t("خرج")}: ${esc(l.out)}</div>`:''}${l.mode==='part'?`<div class="xsNote xsRest">${_t("المتبقي")}: ${esc(l.rest)}</div>`:''}</div>`}).join('')+`</td><td><button class="b2" data-xa="oe" data-id="${esc(e.id)}">${_t("فتح")}</button></td></tr>`).join('')+`</tbody></table></div>`}
/* ---------- الملفات المرفقة ---------- */
const xsKB=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
function xsFilesHtml(a){return(a.length?a.map((f,i)=>`<div class="xsFile"><button type="button" class="xsFo" data-xo="${esc(f.id)}">${f.mime==='application/pdf'?'📄':'🖼️'} ${esc(f.name)} <small>${xsKB(f.size)}</small></button><button type="button" class="ib" data-xr="${i}" title="${_t("حذف")}">✕</button></div>`).join(''):`<small class="mu">${_t("لا ملفات")}</small>`)}
const xsB64=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=no;r.readAsDataURL(f)});
async function xsUpload(files,arr,redraw){for(const f of files){
    try{let mime=f.type,b64;
      if(/^image\//.test(mime)){const u=await phShrink(f,1800,.82);b64=u.split(',')[1];mime='image/jpeg'}
      else if(mime==='application/pdf'){if(f.size>3000000){toast(f.name+': '+_t("الملف أكبر من 3 ميغابايت"),'err');continue}b64=await xsB64(f)}
      else{toast(f.name+': '+_t("ملف غير مدعوم (PDF أو صورة فقط)"),'err');continue}
      const j=await api('xsfput',{name:f.name,mime:mime,d:b64});arr.push(j.file);redraw()}
    catch(e){toast(e.message&&!e.net?_t(e.message):_t("تعذر رفع الملف"),'err')}}}
async function xsOpenFile(id){try{const j=await api('xsfget',{id:id}),bin=atob(j.d),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:j.mime}));const w=window.open(url,'_blank');if(!w){const a=document.createElement('a');a.href=url;a.download=j.name;a.click()}setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){toast(e.message,'err')}}
/* ---------- نافذة الفاتورة ---------- */
let XI=null;
function xsInvOpen(id){const v=id?xsInvById(id):null;XI=v?JSON.parse(JSON.stringify(v)):{kind:'exp',no:'',supplier:'',customer:'',date:xsToday(),due:xsAdd(xsToday(),XS_DAYS),cur:'USD',total:'',notes:'',files:[]};XI._manual=!!(v&&v.due&&v.due!==xsAdd(v.date,XS_DAYS));xsInvForm();$('mXi').classList.add('on')}
function xsInvForm(){const v=XI,id=v.id,info=id?xsInfo(v):null,uniq=k=>[...new Set(XS.inv.map(x=>x[k]).filter(Boolean))].sort();
  let h=`<div class="mh"><b>${id?_t("فاتورة")+' '+esc(id):_t("فاتورة جديدة")}</b><span style="display:flex;gap:8px"><button class="b1" data-xa="si" type="button">${_t("حفظ")}</button><button class="b2" data-close type="button">${_t("إغلاق")}</button></span></div>`+
   `<div class="xsGrid"><label class="xsF xsW"><span>${_t("نوع الفاتورة")}</span><select id="xiKind"><option value="exp"${v.kind==='exp'?' selected':''}>${_t("معدّة للتصدير")}</option><option value="dom"${v.kind==='dom'?' selected':''}>${_t("مبيعات داخلية")}</option></select></label>`+
   `<label class="xsF"><span>${_t("المورد")}</span><input id="xiSup" list="xsSupL" value="${esc(v.supplier)}"></label><label class="xsF"><span>${_t("العميل")}</span><input id="xiCus" list="xsCusL" value="${esc(v.customer)}"></label>`+
   `<label class="xsF"><span>${_t("رقم الفاتورة")}</span><input id="xiNo" dir="ltr" value="${esc(v.no)}"></label><label class="xsF"><span>${_t("تاريخ الإصدار")}</span><input id="xiDate" type="date" value="${esc(v.date)}"></label>`+
   `<label class="xsF" id="xiDueW"${v.kind==='exp'?'':' style="display:none"'}><span>${_t("مهلة التصدير")} <small id="xiLeft"></small></span><input id="xiDue" type="date" value="${esc(v.due)}"></label>`+
   `<label class="xsF"><span>${_t("العملة")}</span><input id="xiCur" list="xsCurL" dir="ltr" value="${esc(v.cur)}" style="text-transform:uppercase"></label><label class="xsF"><span>${_t("إجمالي الفاتورة")}</span><input id="xiTot" inputmode="decimal" dir="ltr" value="${esc(v.total)}"></label>`+
   `<label class="xsF xsW"><span>${_t("ملاحظات")}</span><textarea id="xiNotes" rows="2">${esc(v.notes)}</textarea></label></div>`+
   `<datalist id="xsSupL">${uniq('supplier').map(x=>`<option value="${esc(x)}">`).join('')}</datalist><datalist id="xsCusL">${uniq('customer').map(x=>`<option value="${esc(x)}">`).join('')}</datalist><datalist id="xsCurL"><option value="USD"><option value="EUR"><option value="TRY"></datalist>`+
   `<div class="xsSec"><b>${_t("ملفات الفاتورة")}</b> <button class="b2" type="button" data-xa="fi">+ ${_t("رفع ملف")}</button><div id="xiFiles">${xsFilesHtml(v.files)}</div><small class="mu">${_t("PDF أو صور، حتى 3 ميغابايت للملف")}</small></div>`;
  if(id){h+=`<div class="xsSec"><b>${_t("حالة التصدير")}</b>: <span class="bd ${xsStC[info.st]}">${xsStL()[info.st]}</span> ${xsLeftTag(info)}`+
    (info.ls.length?info.ls.map(x=>`<div class="xsLn"><span class="bd ${x.l.mode==='full'?'s-paid':'s-partial'}">${x.l.mode==='full'?_t("كاملة"):_t("جزء")}</span> <b>${esc(x.e.ref)}</b> <span class="mu" dir="ltr">${esc(x.e.date)}</span>${x.l.out?`<div class="xsNote">${_t("خرج")}: ${esc(x.l.out)}</div>`:''}${x.l.mode==='part'?`<div class="xsNote xsRest">${_t("المتبقي")}: ${esc(x.l.rest)}</div>`:''}</div>`).join(''):`<div class="xsNote">${_t("لا توجد تصديرات مرحّلة لها بعد")}.</div>`)+info.dr.map(x=>`<div class="xsLn"><span class="bd s-partial">${_t("مفتوحة")}</span> <b>${esc(x.e.ref)}</b> <span class="mu" dir="ltr">${esc(x.e.id)}</span> <small class="mu">(${_t("غير مرحّلة — لا تُحتسب حتى الترحيل")})</small></div>`).join('')+
    (v.closed?`<div class="xsNote">${_t("أُغلقت")}: ${esc(v.closed.note||'')} <small class="mu">${esc(v.closed.by||'')}</small></div><button class="b2" type="button" data-xa="ro">${_t("إعادة فتح")}</button>`:(info.st!=='full'?`<div class="xsCl"><input id="xiClN" placeholder="${_t("سبب الإغلاق (مثلاً: حُوِّل المتبقي إلى بيع محلي)")}"><button class="b3" type="button" data-xa="cl">${_t("إغلاق الفاتورة")}</button></div>`:''))+`</div>`}
  if(id)h+=`<div class="xsSec"><button class="b3" type="button" data-xa="di">${_t("حذف الفاتورة")}</button></div>`;
  $('mXiB').innerHTML=h;xsDueHint()}
function xsDueHint(){const e=$('xiDue'),l=$('xiLeft');if(!e||!l)return;l.textContent=e.value&&XI.kind==='exp'?'('+(xsLeft(e.value)<0?_t("انتهت"):xsLeft(e.value)+' '+_t("يوم"))+')':''}
function xsInvRead(){const v=XI;v.kind=$('xiKind').value;v.supplier=$('xiSup').value.trim();v.customer=$('xiCus').value.trim();v.no=$('xiNo').value.trim();v.date=$('xiDate').value;v.due=$('xiDue').value;v.cur=$('xiCur').value.trim().toUpperCase();v.total=$('xiTot').value.replace(/,/g,'').trim();v.notes=$('xiNotes').value}
async function xsInvSave(){xsInvRead();const v=XI;if(!v.no||!v.supplier||!v.customer||!v.date){toast(_t("أكمل: المورد والعميل والرقم والتاريخ"),'err');return}if(v.kind==='exp'&&!v.due){toast(_t("حدد مهلة التصدير"),'err');return}
  const b=document.querySelector('#mXiB [data-xa=si]');b.disabled=true;
  try{const j=await api('xssave',{k:'inv',id:v.id||'',d:Object.assign({},v,{total:+v.total||0}),ver:v.ver||0});const i=XS.inv.findIndex(x=>x.id===j.d.id);if(i<0)XS.inv.push(j.d);else XS.inv[i]=j.d;XI=null;$('mXi').classList.remove('on');xsBadge();xsDraw();toast(_t("تم حفظ الفاتورة")+' '+j.d.id)}
  catch(e){toast(e.message==='conflict'?_t("عُدّلت من جهاز آخر — أغلق وأعد فتحها"):e.message,'err')}b.disabled=false}
/* ---------- نافذة سجل التصدير ---------- */
let XE=null;
function xsExpOpen(id){const e=id?XS.exp.find(x=>x.id===id):null;XE=e?JSON.parse(JSON.stringify(e)):{ref:'',date:xsToday(),decl:'',notes:'',files:[],lines:[]};xsExpForm();$('mXe').classList.add('on')}
function xsLineView(l){const v=xsInvById(l.inv)||{no:l.inv,supplier:'',customer:''};return`<div class="xsLine"><div class="xsLh"><span><b dir="ltr">${esc(v.no)}</b> <span class="mu">${esc(v.supplier)} → ${esc(v.customer)}</span></span><span class="bd ${l.mode==='full'?'s-paid':'s-partial'}">${l.mode==='full'?_t("الفاتورة كاملة"):_t("جزء منها")}</span></div>${l.out?`<div class="xsNote">${_t("خرج")}: ${esc(l.out)}</div>`:''}${l.mode==='part'?`<div class="xsNote xsRest">${_t("المتبقي")}: ${esc(l.rest)}</div>`:''}</div>`}
function xsExpForm(keep){const e=XE,id=e.id,lk=!!e.posted;
  let h=`<div class="mh"><b>${id?_t("سجل تصدير")+' '+esc(id):_t("سجل تصدير جديد")} ${id?xsPostTag(e):''}</b><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="b1" data-xa="se" type="button">${lk?_t("حفظ البيان والملاحظات والمرفقات"):_t("حفظ")}</button>${id&&!lk?`<button class="b2" data-xa="po" type="button">🔒 ${_t("ترحيل وقفل")}</button>`:''}${lk?`<button class="b3" data-xa="up" type="button">${_t("إلغاء الترحيل")}</button>`:''}<button class="b2" data-close type="button">${_t("إغلاق")}</button></span></div>`+
   (lk?`<p class="hint" style="margin:0 0 6px">${_t("السجل مرحَّل ومقفل: لا يمكن تعديل الفواتير والتاريخ. يمكنك إضافة رقم البيان الجمركي والملاحظات والمرفقات")}${e.postedAt?' — '+esc(e.postedAt)+(e.postedBy?' · '+esc(e.postedBy):''):''}.</p>`:(id?'':`<p class="hint" style="margin:0 0 6px">${_t("احفظ السجل أولاً، ثم رحّله لقفله واعتماد تصدير فواتيره")}.</p>`))+
   `<div class="xsGrid"><label class="xsF"><span>${_t("الشحنة / التصديرة")}</span><input id="xeRef" value="${esc(e.ref)}"${lk?' disabled':''} placeholder="${_t("مثال: رقم الحاوية أو اسم الشحنة")}"></label><label class="xsF"><span>${_t("تاريخ التصدير")}</span><input id="xeDate" type="date" value="${esc(e.date)}"${lk?' disabled':''}></label><label class="xsF"><span>${_t("رقم البيان الجمركي")} <small class="mu">(${_t("اختياري — يمكن إضافته لاحقاً")})</small></span><input id="xeDecl" dir="ltr" value="${esc(e.decl)}"></label><label class="xsF xsW"><span>${_t("ملاحظات")}</span><textarea id="xeNotes" rows="2">${esc(e.notes)}</textarea></label></div>`+
   `<div class="xsSec"><b>${_t("الفواتير المصدَّرة في هذه التصديرة")}</b><div id="xeLines">`+(e.lines.length?e.lines.map((l,i)=>{if(lk)return xsLineView(l);const v=xsInvById(l.inv)||{no:l.inv,supplier:'',customer:''};return`<div class="xsLine" data-i="${i}"><div class="xsLh"><span><b dir="ltr">${esc(v.no)}</b> <span class="mu">${esc(v.supplier)} → ${esc(v.customer)}</span></span><button type="button" class="ib" data-xl="rm" title="${_t("حذف")}">✕</button></div><div class="xsGrid"><label class="xsF"><span>${_t("نوع التصدير")}</span><select data-xl="mode"><option value="full"${l.mode==='full'?' selected':''}>${_t("الفاتورة كاملة")}</option><option value="part"${l.mode==='part'?' selected':''}>${_t("جزء منها")}</option></select></label><label class="xsF xsW"><span>${_t("ما تم تصديره")}${l.mode==='part'?' *':''}</span><textarea data-xl="out" rows="2">${esc(l.out)}</textarea></label>${l.mode==='part'?`<label class="xsF xsW"><span>${_t("المتبقي بعد هذا التصدير")} *</span><textarea data-xl="rest" rows="2">${esc(l.rest)}</textarea></label>`:''}</div></div>`}).join(''):`<small class="mu">${_t("لم تُضف فواتير بعد")}</small>`)+`</div>`+
   (lk?'':`<div style="margin-top:8px"><button class="b1" type="button" data-xa="pk">+ ${_t("إضافة فواتير من المرفوعة")}</button></div>`)+`</div>`+
   `<div class="xsSec"><b>${_t("مرفقات إضافية (اختياري)")}</b> <button class="b2" type="button" data-xa="fe">+ ${_t("رفع ملف")}</button><div id="xeFiles">${xsFilesHtml(e.files)}</div><small class="mu">${_t("مثل البيان الجمركي عند صدوره: PDF أو صور، حتى 3 ميغابايت للملف")}</small></div>`+
   (id&&!lk?`<div class="xsSec"><button class="b3" type="button" data-xa="de">${_t("حذف السجل")}</button></div>`:'');
  $('mXeB').innerHTML=h}
async function xsExpPost(post,btn){if(!btn.dataset.arm){btn.dataset.arm='1';const t=btn.textContent;btn.textContent=_t("تأكيد؟");setTimeout(()=>{btn.dataset.arm='';btn.textContent=t},3000);return}
  xsExpRead();const e=XE;
  try{if(post){if(!e.lines.length){toast(_t("أضف فاتورة واحدة على الأقل"),'err');return}
      const j0=await api('xssave',{k:'exp',id:e.id,d:e,ver:e.ver||0});const i0=XS.exp.findIndex(x=>x.id===j0.d.id);if(i0>=0)XS.exp[i0]=j0.d}
    const j=await api('xspost',{id:e.id,post:post?1:0});const i=XS.exp.findIndex(x=>x.id===j.d.id);if(i>=0)XS.exp[i]=j.d;
    XE=JSON.parse(JSON.stringify(j.d));xsExpForm();xsBadge();xsDraw();toast(post?_t("رُحِّل سجل التصدير وقُفل"):_t("أُلغي الترحيل"))}
  catch(er){toast(er.message==='conflict'?_t("عُدّل من جهاز آخر — أغلق وأعد فتحه"):er.message,'err')}}
/* ---------- إضافة فاتورة إلى تصديرة مفتوحة من جدول الفواتير ---------- */
let XA=null;
function xsAddOpen(id){const v=xsInvById(id);if(!v)return;XA={inv:id,mode:'full',out:'',rest:'',rec:''};const dr=XS.exp.filter(e=>!e.posted);XA.rec=dr.length?dr[0].id:'';xsAddForm()}
function xsAddForm(){const v=xsInvById(XA.inv),dr=XS.exp.filter(e=>!e.posted).sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  $('mXaB').innerHTML=`<div class="mh"><b>${_t("إضافة الفاتورة إلى تصديرة")}</b><button class="b2" data-close type="button">${_t("إغلاق")}</button></div><p style="margin:4px 0 10px"><b dir="ltr">${esc(v.no)}</b> <span class="mu">${esc(v.supplier)} → ${esc(v.customer)}</span></p>`+
   (dr.length?`<label class="xsF"><span>${_t("اختر التصديرة المفتوحة (غير المرحّلة)")}</span><select id="xaRec">${dr.map(e=>`<option value="${esc(e.id)}"${e.id===XA.rec?' selected':''}>${esc(e.id)} — ${esc(e.ref)} (${esc(e.date)})</option>`).join('')}</select></label>`+
    `<div class="xsGrid"><label class="xsF"><span>${_t("نوع التصدير")}</span><select id="xaMode"><option value="full"${XA.mode==='full'?' selected':''}>${_t("الفاتورة كاملة")}</option><option value="part"${XA.mode==='part'?' selected':''}>${_t("جزء منها")}</option></select></label>`+
    `<label class="xsF xsW"><span>${_t("ما تم تصديره")}${XA.mode==='part'?' *':''}</span><textarea id="xaOut" rows="2">${esc(XA.out)}</textarea></label>${XA.mode==='part'?`<label class="xsF xsW"><span>${_t("المتبقي بعد هذا التصدير")} *</span><textarea id="xaRest" rows="2">${esc(XA.rest)}</textarea></label>`:''}</div>`+
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="b1" type="button" data-xa="ad">${_t("إضافة إلى التصديرة")}</button><button class="b2" type="button" data-xa="an">+ ${_t("سجل تصدير جديد بها")}</button></div>`
   :`<div class="xsEmpty">${_t("لا توجد تصديرات مفتوحة. أنشئ سجل تصدير أولاً")}.<br><br><button class="b1" type="button" data-xa="an">+ ${_t("سجل تصدير جديد بها")}</button></div>`);
  $('mXa').classList.add('on')}
function xsAddRead(){const g=id=>$(id)?$(id).value:'';XA.rec=g('xaRec')||XA.rec;XA.mode=g('xaMode')||XA.mode;XA.out=g('xaOut');XA.rest=$('xaRest')?$('xaRest').value:XA.rest}
async function xsAddDo(){xsAddRead();const e0=XS.exp.find(x=>x.id===XA.rec);if(!e0||e0.posted){toast(_t("اختر تصديرة مفتوحة"),'err');return}
  if(XA.mode==='part'&&(!XA.out.trim()||!XA.rest.trim())){toast(_t("اكتب ما تم تصديره والمتبقي"),'err');return}
  const e=JSON.parse(JSON.stringify(e0));if(e.lines.some(l=>l.inv===XA.inv)){toast(_t("الفاتورة موجودة في هذه التصديرة"),'err');return}
  e.lines.push({inv:XA.inv,mode:XA.mode,out:XA.out.trim(),rest:XA.mode==='part'?XA.rest.trim():''});
  try{const j=await api('xssave',{k:'exp',id:e.id,d:e,ver:e.ver||0});const i=XS.exp.findIndex(x=>x.id===j.d.id);if(i>=0)XS.exp[i]=j.d;$('mXa').classList.remove('on');xsBadge();xsDraw();toast(_t("أُضيفت الفاتورة إلى")+' '+j.d.id)}
  catch(er){toast(er.message==='conflict'?_t("عُدّلت التصديرة من جهاز آخر — حدّث الصفحة"):er.message,'err')}}
function xsAddNew(){xsAddRead();const line={inv:XA.inv,mode:XA.mode,out:XA.out.trim(),rest:XA.mode==='part'?XA.rest.trim():''};$('mXa').classList.remove('on');xsExpOpen();XE.lines.push(line);xsExpForm()}
function xsExpRead(){const e=XE;e.ref=$('xeRef').value.trim();e.date=$('xeDate').value;e.decl=$('xeDecl').value.trim();e.notes=$('xeNotes').value}
async function xsExpSave(){xsExpRead();const e=XE;if(!e.ref||!e.date){toast(_t("اكتب اسم الشحنة وتاريخ التصدير"),'err');return}if(!e.lines.length){toast(_t("أضف فاتورة واحدة على الأقل"),'err');return}
  const b=document.querySelector('#mXeB [data-xa=se]');b.disabled=true;
  try{const j=await api('xssave',{k:'exp',id:e.id||'',d:e,ver:e.ver||0});const isNew=!e.id,i=XS.exp.findIndex(x=>x.id===j.d.id);if(i<0)XS.exp.push(j.d);else XS.exp[i]=j.d;xsBadge();xsDraw();toast(_t("تم حفظ سجل التصدير")+' '+j.d.id);if(isNew){XE=JSON.parse(JSON.stringify(j.d));xsExpForm()}else{XE=null;$('mXe').classList.remove('on')}}
  catch(er){toast(er.message==='conflict'?_t("عُدّل من جهاز آخر — أغلق وأعد فتحه"):er.message,'err')}b.disabled=false}
async function xsDel(k,id,btn){if(!btn.dataset.arm){btn.dataset.arm='1';const t=btn.textContent;btn.textContent=_t("تأكيد الحذف؟");setTimeout(()=>{btn.dataset.arm='';btn.textContent=t},3000);return}
  try{await api('xsdel',{k:k,id:id});if(k==='inv')XS.inv=XS.inv.filter(x=>x.id!==id);else XS.exp=XS.exp.filter(x=>x.id!==id);$(k==='inv'?'mXi':'mXe').classList.remove('on');xsBadge();xsDraw();toast(_t("تم الحذف"))}catch(e){toast(e.message,'err')}}
/* ---------- CSV (ملف مستقل للمحاسب) ---------- */
function xsCsv(name,rows){const q=x=>'"'+String(x==null?'':x).replace(/"/g,'""')+'"',s='﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
function xsCsvInv(){const SL=xsStL();xsCsv('export-stock-invoices.csv',[['ID','No','Supplier','Customer','Type','Issued','Due','Days left','Currency','Total','Status','Remaining note','Notes']].concat(XS.inv.map(v=>{const i=xsInfo(v);return[v.id,v.no,v.supplier,v.customer,v.kind==='exp'?'export':'domestic',v.date,v.due,i.left==null?'':i.left,v.cur,v.total,SL[i.st],i.rest,v.notes]})))}
function xsCsvExp(){const rows=[['ID','Shipment','Date','Declaration','Posted','Invoice','Supplier','Customer','Mode','Exported','Remaining']];XS.exp.forEach(e=>(e.lines||[]).forEach(l=>{const v=xsInvById(l.inv)||{};rows.push([e.id,e.ref,e.date,e.decl,e.posted?'posted':'open',v.no||l.inv,v.supplier||'',v.customer||'',l.mode==='full'?'full':'partial',l.out,l.rest])}));xsCsv('export-stock-records.csv',rows)}

/* ---------- اختيار الفواتير من المرفوعة مسبقاً (بحث + اختيار متعدد + كاملة/جزء لكل فاتورة) ---------- */
let XP={q:'',sel:{}};
function xsPickOpen(){XP={q:'',sel:{}};xsLoad(true);$('mXpB').innerHTML=`<div class="mh"><b>${_t("اختيار الفواتير")}</b><span style="display:flex;gap:8px"><button class="b1" type="button" id="xpOk">${_t("إضافة المحدد")}</button><button class="b2" data-close type="button">${_t("إغلاق")}</button></span></div><input id="xpQ" class="xpQ" placeholder="${_t("ابحث برقم الفاتورة أو اسم العميل أو المورد")}" autocomplete="off"><div id="xpL"></div>`;$('mXp').classList.add('on');xsPickList();setTimeout(()=>$('xpQ').focus(),50)}
function xsPickRows(){const q=XP.q.trim().toLowerCase(),used=new Set(XE.lines.map(l=>l.inv));
  return XS.inv.filter(v=>!used.has(v.id)).map(v=>({v:v,i:xsInfo(v)})).filter(x=>x.i.st!=='closed'&&x.i.st!=='full'&&!x.i.dr.some(d=>d.e.id!==XE.id)&&(!q||[x.v.no,x.v.customer,x.v.supplier,x.v.id].join(' ').toLowerCase().includes(q))).sort((a,b)=>(a.v.due||'').localeCompare(b.v.due||''))}
function xsPickList(){const R=xsPickRows(),n=Object.keys(XP.sel).length,SL=xsStL();$('xpOk').textContent=_t("إضافة المحدد")+(n?' ('+n+')':'');
  $('xpL').innerHTML=R.length?R.map(x=>{const on=XP.sel[x.v.id];return`<div class="xpRow${on?' on':''}" data-id="${esc(x.v.id)}"><label class="xpCk"><input type="checkbox" data-xp="ck"${on?' checked':''}><span><b dir="ltr">${esc(x.v.no)}</b> <span class="mu">${esc(x.v.supplier)}</span> → <b>${esc(x.v.customer)}</b><br><small class="mu" dir="ltr">${esc(xsMoney(x.v))}${x.v.kind==='exp'?' · '+esc(x.v.due):''}</small> <span class="bd">${x.v.kind==='exp'?_t("معدّة للتصدير"):_t("مبيعات داخلية")}</span> ${xsLeftTag(x.i)} <span class="bd ${xsStC[x.i.st]}">${SL[x.i.st]}</span>${x.i.rest?`<br><small class="xsRest">${_t("المتبقي")}: ${esc(x.i.rest)}</small>`:''}</span></label>${on?`<select data-xp="mode"><option value="full"${on==='full'?' selected':''}>${_t("الفاتورة كاملة")}</option><option value="part"${on==='part'?' selected':''}>${_t("جزء منها")}</option></select>`:''}</div>`}).join(''):`<div class="xsEmpty">${xsPickEmpty()}</div>`}
function xsPickEmpty(){if(XP.q.trim()&&XS.inv.length)return _t("لا نتائج");if(!XS.inv.length)return _t("لم تُسجَّل فواتير بعد")+'.';return _t("كل الفواتير إما مكتملة أو مُغلقة أو مضافة لهذا السجل")+'.'}
$('mXp').addEventListener('input',e=>{if(e.target.id==='xpQ'){XP.q=e.target.value;xsPickList()}});
$('mXp').addEventListener('change',e=>{const r=e.target.closest('.xpRow');if(!r)return;const id=r.dataset.id;if(e.target.dataset.xp==='ck'){if(e.target.checked)XP.sel[id]='full';else delete XP.sel[id]}else if(e.target.dataset.xp==='mode')XP.sel[id]=e.target.value;xsPickList()});
$('mXp').addEventListener('click',e=>{if(e.target.id!=='xpOk')return;const ids=Object.keys(XP.sel);if(!ids.length){toast(_t("حدد فاتورة واحدة على الأقل"),'err');return}
  ids.forEach(id=>{if(!XE.lines.some(l=>l.inv===id))XE.lines.push({inv:id,mode:XP.sel[id],out:'',rest:''})});$('mXp').classList.remove('on');xsExpForm()});
/* ---------- الأحداث ---------- */
$('xs').addEventListener('click',e=>{const t=e.target.closest('[data-xt]');if(t){xsTab(t.dataset.xt);return}const b=e.target.closest('[data-xa]');if(!b)return;const a=b.dataset.xa;
  if(a==='ni')xsInvOpen();else if(a==='ne')xsExpOpen();else if(a==='rl')xsLoad(true);else if(a==='oi')xsInvOpen(b.dataset.id);else if(a==='at')xsAddOpen(b.dataset.id);else if(a==='oe')xsExpOpen(b.dataset.id);else if(a==='ci')xsCsvInv();else if(a==='ce')xsCsvExp()});
$('xs').addEventListener('input',e=>{const f=e.target.dataset.xf;if(f==='q'){XS.f.q=e.target.value;const p=e.target.selectionStart;xsDraw();const n=document.querySelector('[data-xf=q]');if(n){n.focus();n.setSelectionRange(p,p)}}});
$('xs').addEventListener('change',e=>{const f=e.target.dataset.xf;if(f&&f!=='q'){XS.f[f]=e.target.value;xsDraw()}});
$('mXi').addEventListener('click',async e=>{const b=e.target.closest('[data-xa]'),o=e.target.closest('[data-xo]'),r=e.target.closest('[data-xr]');
  if(o){xsOpenFile(o.dataset.xo);return}
  if(r){xsInvRead();XI.files.splice(+r.dataset.xr,1);$('xiFiles').innerHTML=xsFilesHtml(XI.files);return}
  if(!b)return;const a=b.dataset.xa;
  if(a==='si')xsInvSave();else if(a==='fi'){const i=document.createElement('input');i.type='file';i.multiple=true;i.accept='application/pdf,image/*';i.onchange=()=>{const fs=[...i.files];xsUpload(fs,XI.files,()=>{$('xiFiles').innerHTML=xsFilesHtml(XI.files)})};i.click()}
  else if(a==='di')xsDel('inv',XI.id,b);
  else if(a==='cl'){const n=$('xiClN').value.trim();if(!n){toast(_t("اكتب سبب الإغلاق"),'err');return}try{const j=await api('xsclose',{id:XI.id,how:'manual',note:n});const i=XS.inv.findIndex(x=>x.id===j.d.id);if(i>=0)XS.inv[i]=j.d;XI=JSON.parse(JSON.stringify(j.d));xsInvForm();xsBadge();xsDraw()}catch(er){toast(er.message,'err')}}
  else if(a==='ro'){try{const j=await api('xsclose',{id:XI.id,open:1});const i=XS.inv.findIndex(x=>x.id===j.d.id);if(i>=0)XS.inv[i]=j.d;XI=JSON.parse(JSON.stringify(j.d));xsInvForm();xsBadge();xsDraw()}catch(er){toast(er.message,'err')}}});
$('mXi').addEventListener('change',e=>{const id=e.target.id;if(id==='xiKind'||id==='xiDate'){xsInvRead();if(XI.kind==='exp'&&!XI._manual&&XI.date)$('xiDue').value=xsAdd(XI.date,XS_DAYS);$('xiDueW').style.display=$('xiKind').value==='exp'?'':'none';xsInvRead();xsDueHint()}else if(id==='xiDue'){XI._manual=true;xsInvRead();xsDueHint()}});
$('mXe').addEventListener('click',e=>{const b=e.target.closest('[data-xa]'),o=e.target.closest('[data-xo]'),r=e.target.closest('[data-xr]'),l=e.target.closest('[data-xl=rm]');
  if(o){xsOpenFile(o.dataset.xo);return}
  if(r){xsExpRead();XE.files.splice(+r.dataset.xr,1);$('xeFiles').innerHTML=xsFilesHtml(XE.files);return}
  if(l){xsExpRead();XE.lines.splice(+l.closest('.xsLine').dataset.i,1);xsExpForm();return}
  if(!b)return;const a=b.dataset.xa;
  if(a==='po')xsExpPost(true,b);else if(a==='up')xsExpPost(false,b);else if(a==='se')xsExpSave();else if(a==='pk'){xsExpRead();xsPickOpen()}else if(a==='de')xsDel('exp',XE.id,b);
  else if(a==='fe'){const i=document.createElement('input');i.type='file';i.multiple=true;i.accept='application/pdf,image/*';i.onchange=()=>{const fs=[...i.files];xsUpload(fs,XE.files,()=>{$('xeFiles').innerHTML=xsFilesHtml(XE.files)})};i.click()}});
$('mXa').addEventListener('click',e=>{const b=e.target.closest('[data-xa]');if(!b)return;if(b.dataset.xa==='ad')xsAddDo();else if(b.dataset.xa==='an')xsAddNew()});
$('mXa').addEventListener('change',e=>{if(['xaRec','xaMode'].includes(e.target.id)){xsAddRead();xsAddForm()}});
$('mXe').addEventListener('input',e=>{const ln=e.target.closest('.xsLine');if(!ln)return;const l=XE.lines[+ln.dataset.i],k=e.target.dataset.xl;if(k==='out'||k==='rest')l[k]=e.target.value});
$('mXe').addEventListener('change',e=>{
  const ln=e.target.closest('.xsLine');if(ln&&e.target.dataset.xl==='mode'){xsExpRead();XE.lines[+ln.dataset.i].mode=e.target.value;xsExpForm()}});

{const _smx=setMode;setMode=function(m){_smx.apply(this,arguments);$('xwrap').style.display=m==='x'?'':'none';$('tabX').classList.toggle('on',m==='x');if(m==='x'){document.body.classList.add('mode-h');xsDraw();xsLoad(true)}}}
$('sd_x').addEventListener('click',()=>{if(need('xs'))setMode('x')});$('tabX').addEventListener('click',()=>{if(need('xs'))setMode('x')});
async function routeTo(h,boot){
  if(!ME||!/^#\//.test(h||'')||(!boot&&h===RT.cur))return;
  if(!boot&&((DIRTY.i&&S.mode==='i')||(DIRTY.r&&S.mode==='r'))&&!confirm(_t('في الصفحة تعديلات غير محفوظة. هل تغادرها؟'))){history.pushState(null,'',RT.cur);return}
  RT.go=true;const p=h.slice(2).split('/').map(x=>{try{return decodeURIComponent(x)}catch(e){return x}}),nf=()=>toast(_t('الصفحة المطلوبة غير موجودة'),'err');
  try{
    if(document.body.classList.contains('quick')&&p[0]!=='quick')exitQuick();
    switch(p[0]){
      case 'shipments':await shOpen();if(p[1]){if(SHS.get()[p[1]])shEdit(p[1]);else nf()}break;
      case 'accounting':if(!can('inv')&&!can('rc')){need('inv');break}ACT=p[1]==='receipts'?'r':'i';setMode('a');break;
      case 'customers':if(need('cust'))setMode('c');break;
      case 'customer':{if(!need('cust'))break;await loadAll();const r=resolveCust(p[1]||'');if(r.length===1)await sOpen(r[0].id);else{setMode('c');nf()}break}
      case 'dashboard':setMode('d');break;
      case 'costs':{if(!need('cost'))break;await shLoad();CCS.sh='';CCS.tab=p[1]==='ledger'?'ledger':p[1]==='suppliers'?'sup':'profit';if(p[1]==='shipment'){if(SHS.get()[p[2]])CCS.sh=p[2];else nf()}setMode('p');break}
      case 'exports':if(need('xs'))setMode('x');break;
      case 'settings':setMode('g');break;
      case 'quick':enterQuick();break;
      case 'invoice':{if(!need('inv'))break;if(p[1]==='new'||!p[1]){setMode('i');newInv();break}
        const d=CL.u()?(await api('get',{code:p[1]})).d:LS.get('pst_inv',{})[p[1]];if(!d){nf();break}load(d);S.opened=p[1];setClean('i',true);setMode('i');break}
      case 'receipt':{if(!need('rc'))break;if(p[1]==='new'||!p[1]){setMode('r');rnew();break}
        const d=CL.u()?(await api('rget',{code:p[1]})).d:RCL()[p[1]];if(!d){nf();break}rload(d);R.opened=p[1];setMode('r');break}
      default:nf()}
  }catch(e){toast(_t('تعذر فتح الرابط')+': '+(e.message||''),'err')}
  finally{RT.go=false;RT.cur=stateHash()||h;if(location.hash!==RT.cur)history.replaceState(null,'',RT.cur)}}
window.addEventListener('popstate',()=>routeTo(location.hash));
window.addEventListener('hashchange',()=>{if(location.hash!==RT.cur)routeTo(location.hash)});
$('bCopyLink').addEventListener('click',()=>{closeMenu();rtPush(stateHash());const u=location.href;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast(_t('تم نسخ الرابط'))).catch(()=>{prompt('',u)})});
document.querySelectorAll('.field').forEach(f=>{const l=f.querySelector('label'),c=f.querySelector('input,select,textarea');if(l&&c&&c.id&&!l.htmlFor)l.htmlFor=c.id});$('skipL').addEventListener('click',e=>{e.preventDefault();const w=[...document.querySelectorAll('[id$=wrap]')].find(x=>x.offsetParent);if(w){w.setAttribute('tabindex','-1');w.focus()}});S.lang=LS.get('pst_lang',UIL);setLang(S.lang);$('tabD').addEventListener('click',()=>setMode('d'));$('tabP').addEventListener('click',()=>{CCS.sh='';setMode('p')});setLand(false);newInv();rnew();upd();authStart();
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cf]');if(b)cfDo(b.dataset.cf);if(e.target.closest&&e.target.closest('#qBadge')){const Q=Object.values(QS.get()).filter(x=>x.err);if(Q.length)toast((_t("بانتظار تدخلك")+": ")+Q.map(x=>x.code+' — '+x.err).join(' | '),'err');qFlush(true)}});

