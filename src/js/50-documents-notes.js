/* الأوراق المطبوعة */
/* ===== الإشعارات الدائنة والمدينة ===== */
let NT={ref:'',d:null};
function noteNext(p){const m=Object.assign({},lsInv(),ALL&&ALL.I||{}),re=new RegExp('^'+p+'-(\\d+)$','i');let n=0;for(const k in m){const x=re.exec(k);if(x)n=Math.max(n,+x[1])}return p+'-'+pad(n+1)}
function ntDraw(){const d=NT.d,k=NT.ref,cu=esc(d.cur||'$'),t=num(d.t),cr=invCr(k),pd=num(d.pd),typ=$('nt_type').value;
  $('nt_sum').innerHTML=`<div class="ccpS"><span dir="ltr">${esc(k)} · ${esc(d.rcv||'')}</span><b dir="ltr">${f(t)} ${cu}</b></div><div class="ccpS"><span>${_t("مدفوع")}</span><b dir="ltr">${f(pd)} ${cu}</b></div>${cr>.004?`<div class="ccpS"><span>${_t("إشعارات دائنة سابقة")}</span><b dir="ltr">${f(cr)} ${cu}</b></div>`:''}<div class="ccpS"><span>${_t("المتبقي")}</span><b dir="ltr">${f(r2(t-pd-cr))} ${cu}</b></div>`;
  $('nt_hint').textContent=typ==='cr'?_t("الإشعار الدائن يخفض مديونية العميل، والحد الأقصى")+' '+f(r2(t-cr))+' '+(d.cur||'$'):_t("الإشعار المدين يضيف مبلغاً جديداً على العميل ويُحصَّل بوصل استلام كأي فاتورة")}
async function noteOpen(k){if(!need('inv'))return;let d;try{d=await fetchInv(k)}catch(e){msg(e.message);return}
  if(!d||isNote(d)||['draft','void'].includes(d.st||'draft')){toast(_t("الإشعارات للفواتير الصادرة فقط"),'err');return}
  await loadAll();NT={ref:k,d:d};$('nt_type').value='cr';$('nt_amt').value='';$('nt_why').value='';$('nt_date').value=todayStr();ntDraw();$('mNote').classList.add('on');setTimeout(()=>$('nt_amt').focus(),50)}
async function noteSave(){if(!need('inv'))return;const d=NT.d,k=NT.ref;if(!d)return;const typ=$('nt_type').value,a=r2($('nt_amt').value),why=$('nt_why').value.trim(),dt=$('nt_date').value||todayStr();
  if(!(a>0)){bad($('nt_amt'),_t("اكتب مبلغاً أكبر من صفر"));return}
  if(typ==='cr'&&a>r2(num(d.t)-invCr(k))+.004){bad($('nt_amt'),_t("المبلغ أكبر من قيمة الفاتورة بعد الإشعارات السابقة"));return}
  if(!why){bad($('nt_why'),_t("اكتب سبب الإشعار"));return}
  const b=$('nt_save');b.disabled=true;let ship=d.ship||'';
  if(!ship)Object.values(SHS.get()).forEach(h=>(h.cons||[]).forEach(c=>{if(!ship&&String(c.inv||'').split(/[,،\s]+/).includes(k))ship=h.code}));
  const pre=typ==='cr'?'CN':'DN';let code=noteNext(pre);
  const rec={code:code,note:typ,ref:k,refOff:d.offno||'',rcv:d.rcv,cref:d.cref||'',date:dt,cur:d.cur||'$',t:typ==='cr'?-a:a,pd:0,st:'sent',due:'',ship:ship,reason:why,lang:S.lang,ts:Date.now(),rows:[],cols:[],rcs:[]};
  try{for(let i=0;i<4;i++){rec.code=code;const D=LS.get('pst_inv',{});D[code]=rec;LS.set('pst_inv',D);if(!CL.u())break;
      try{await api('save',{code:code,d:rec,isNew:true});break}
      catch(e){if(e.message==='exists'){const D2=LS.get('pst_inv',{});delete D2[code];LS.set('pst_inv',D2);await loadAll();code=noteNext(pre);continue}if(e.net){qAdd('save',code,{d:rec,isNew:true});break}throw e}}}
  catch(e){b.disabled=false;msg(e.message);return}
  IXV++;if(ALL&&ALL.I)ALL.I[code]=Object.assign({},rec);if(typ==='cr')await adjInvoice(k,0,'',false);
  b.disabled=false;logAct(typ==='cr'?'إشعار دائن':'إشعار مدين',code+' · '+k+' · '+f(a));toast(_t("تم إصدار الإشعار")+' '+code);$('mNote').classList.remove('on');listInv();noteView(code,rec)}
function noteView(k,d){shSheet(()=>noteSheet(d),d.code+' - '+(d.rcv||''),null)}
function noteSheet(d){const cn=d.note==='cr',cu=d.cur||'$',amt=Math.abs(num(d.t)),orig=(ALL&&ALL.I&&ALL.I[d.ref])||lsInv()[d.ref];
  let x=shHdr(cn?'CREDIT NOTE':'DEBIT NOTE',cn?L('إشعار دائن','Credit note','Alacak dekontu'):L('إشعار مدين','Debit note','Borç dekontu'))
   +`<div class="st-cu">${shKV(L('رقم الإشعار','Note no.','Belge no'),'<span dir="ltr">'+esc(d.code)+'</span>')}${shKV(L('التاريخ','Date','Tarih'),'<span dir="ltr">'+esc(d.date||'')+'</span>')}${shKV(L('العميل','Customer','Müşteri'),esc(d.rcv))}${shKV(L('الفاتورة الأصلية','Original invoice','Asıl fatura'),'<span dir="ltr">'+esc(d.ref||'')+'</span>')}${d.refOff?shKV(L('رقم الفاتورة الرسمية','Official invoice no.','Resmi fatura no'),'<span dir="ltr">'+esc(d.refOff)+'</span>'):''}${d.ship?shKV(L('الشحنة','Shipment','Sevkiyat'),'<span dir="ltr">'+esc(d.ship)+'</span>'):''}${shKV(L('السبب','Reason','Neden'),esc(d.reason),1)}</div>`;
  x+=`<div class="st-cards" style="grid-template-columns:1fr"><div class="st-c due"><span>${cn?L('قيمة التخفيض على العميل','Reduction in customer balance','Müşteri bakiyesinde azalış'):L('قيمة الزيادة على العميل','Increase in customer balance','Müşteri bakiyesinde artış')}</span><b>${fm(amt,esc(cu))}</b></div></div>`;
  if(cn&&orig){const t0=num(orig.t),cr=invCr(d.ref);x+=`<table class="rc-tb"><thead><tr><th>${L('الفاتورة الأصلية','Original invoice','Asıl fatura')}</th><th>${L('الإجمالي','Total','Toplam')}</th><th>${L('مجموع الإشعارات الدائنة','Total credit notes','Toplam alacak dekontu')}</th><th>${L('الصافي بعد الإشعارات','Net after credits','Net tutar')}</th></tr></thead><tbody><tr><td dir="ltr">${esc(d.ref)}</td><td>${fm(t0,esc(cu))}</td><td>${fm(cr,esc(cu))}</td><td><b>${fm(r2(t0-cr),esc(cu))}</b></td></tr></tbody></table>`}
  return x+shFt(L('هذه وثيقة تجارية معدِّلة للفاتورة المذكورة. أي أثر رسمي أو ضريبي يُعالَج في البرنامج الرسمي.','This is a commercial document adjusting the invoice above. Any official or tax effect is handled in the official system.','Bu belge yukarıdaki faturayı düzenleyen ticari bir belgedir. Resmî veya vergisel etki resmî sistemde işlenir.'))}
noteSheet=withDoc(noteSheet);
$('nt_save').addEventListener('click',noteSave);$('nt_type').addEventListener('change',ntDraw);
function shSheet(fn,title,back){S.sheetFn=fn;S.docT=title;S.shBack=back;if(S.mode!=='s')S.prev=S.mode;setMode('s');sDraw();window.scrollTo(0,0)}
function routeH(h){const f=String(h.from||'').trim(),t=String(h.to||'').trim();if(!f&&!t)return '—';if(!t)return '<bdi>'+esc(f)+'</bdi>';const ar=CURL==='ar'?' ← ':' → ';return '<bdi>'+esc(f||'—')+'</bdi>'+ar+'<bdi>'+esc(t)+'</bdi>'}
const shHdr=(a,b)=>`<header><img src="${document.querySelector('header img').src}" alt=""><div class="title"><h1>${a}</h1><p>${b}</p></div></header>`;
const shKV=(l,v,w)=>`<div${w?' class="w2"':''}><span>${l}</span><b>${v||'—'}</b></div>`;
const shFt=(note)=>`<div class="st-ft" style="display:flex;align-items:center;justify-content:space-between;gap:6mm;text-align:start"><div>${esc($('foot').value)}${$('foot').value?'<br>':''}<b>Portist Lojistik</b> · Import &amp; Export<br>${note}</div><img src="${$('stampImg').src}" alt="" style="height:20mm;width:auto"></div>`;
function shStatusSheet(h,i){const c=h.cons[i],st=shStat(h),idx=SHST.findIndex(x=>x[0]===st),hist=h.hist||[],P=num(c.pk),D=pkDone(c);
  let x=shHdr('SHIPMENT STATUS',(_t("ورقة حالة الشحنة")))+`<div class="st-cu">${shKV((_t("العميل")),esc(c.cust))}${shKV((_t("رقم الشحنة")),'<span dir="ltr">'+esc(h.code)+'</span>')}${shKV((_t("تاريخ الورقة")),shToday())}${shKV((_t("طريقة الشحن")),SHM[h.mode]||'')}${shKV((_t("البوليصة")),'<span dir="ltr">'+esc(h.bl)+'</span>')}${shKV((_t("الحاوية")),'<span dir="ltr">'+esc(h.cont)+'</span>')}${shKV((_t("المسار")),routeH(h),1)}${shKV((_t("الناقل")),esc(h.car))}${shKV((_t("طرود حمولتك")),P||'')}${shKV((_t("حجم حمولتك (م")+"³)"),c.cbm?esc(c.cbm):'')}${shKV((_t("وزن حمولتك (كغ)")),c.kg?esc(c.kg):'')}${shKV((_t("البضاعة")),esc(c.goods),1)}</div>`;
  x+=`<div class="st-cards" style="grid-template-columns:repeat(3,1fr)"><div class="st-c"><span>${_t("حالة الشحنة")}</span><b>${esc(SHN[st])}</b></div><div class="st-c"><span>${_t("الوصول المتوقع")}</span><b>${esc(h.eta||(_t("يُحدَّد لاحقاً")))}</b></div><div class="st-c due" style="background:linear-gradient(90deg,var(--teal),var(--teal-d))"><span>${_t("تسليم حمولتك")}</span><b>${D} ${_t("من")} ${P} ${_t("طرد")}</b></div></div>`;
  x+=`<h3 class="st-h">${_t("مراحل الشحنة")}</h3><table class="rc-tb"><thead><tr><th>${_t("المرحلة")}</th><th>${_t("التاريخ")}</th><th>${_t("الحالة")}</th></tr></thead><tbody>`+SHST.slice(0,4).map(([k,n],j)=>{const hh=hist.find(y=>y.st===k),done=j<idx||st==='dn';return `<tr><td>${n}</td><td dir="ltr">${hh?esc(hh.date):'—'}</td><td>${j===idx?("<b>"+_t("المرحلة الحالية")+"</b>"):done?("✓ "+_t("تمّت")):(_t("قادمة"))}</td></tr>`}).join('')+`<tr><td>${_t("تسليم حمولتك لك")}</td><td dir="ltr">${(c.dl||[]).length?esc(c.dl[c.dl.length-1].date):'—'}</td><td>${dlKey(c)==='full'?("✓ "+_t("تمّ")):dlKey(c)==='part'?("<b>"+_t("تسليم جزئي")+"</b>"):(_t("يُحدَّد الموعد بعد التخليص"))}</td></tr></tbody></table>`;
  if((c.dl||[]).length)x+=`<h3 class="st-h">${_t("عمليات التسليم")}</h3><table class="rc-tb"><thead><tr><th>${_t("الوصل")}</th><th>${_t("التاريخ")}</th><th>${_t("الطرود")}</th><th>${_t("المستلم")}</th></tr></thead><tbody>${c.dl.map(d=>`<tr><td dir="ltr">${esc(d.no)}</td><td dir="ltr">${esc(d.date)}</td><td>${num(d.pk)}</td><td>${esc(d.by||'')}</td></tr>`).join('')}</tbody></table>`;
  return x+shFt((_t("لأي استفسار عن شحنتك اذكر رقم الشحنة")+" ")+esc(h.code)+(".<br>"+_t("هذه الورقة لعرض حالة الشحنة فقط ولا تتضمن أي بيانات مالية. الشحنة مشتركة مع عملاء آخرين ولا تظهر بياناتهم هنا")+"."))}
shStatusSheet=withDoc(shStatusSheet);
const DSTC=['#0f8f86','#c93650','#2b5fb4','#a86a00','#6d3fc0','#157a48','#b8478a','#3d6a7a'];
function shOpsReport(h){const x=shOpsReport0(h),m=/^(<header>[\s\S]*?<\/header>)([\s\S]*)$/.exec(x);return m?`<table class="rpt"><thead><tr><td>${m[1]}</td></tr></thead><tbody><tr><td>${m[2]}</td></tr></tbody></table>`:x}
function shOpsReport0(h){const st=shStat(h),idx=SHST.findIndex(x=>x[0]===st),hist=h.hist||[],cs=(h.cons||[]).filter(c=>(c.cust||'').trim()),today=shToday(),ready=st==='ar'||st==='cu'||st==='dn';
  const calc=l=>({n:l.length,tp:l.reduce((a,c)=>a+num(c.pk),0),td:l.reduce((a,c)=>a+Math.min(num(c.pk),pkDone(c)),0),cbm:l.reduce((a,c)=>a+num(c.cbm),0),kg:l.reduce((a,c)=>a+num(c.kg),0)}),T=calc(cs),r2n=v=>Math.round(v*100)/100;
  const days=h.eta?Math.floor((new Date(today)-new Date(h.eta))/864e5):0,late=h.eta&&days>0&&(st==='ld'||st==='tr');
  const ph=v=>v?'<span dir="ltr">'+esc(v)+'</span>':'',sty=c=>dlKey(c)==='full'?'f':dlKey(c)==='part'?'p':'';
  const NOC=(_t("غير محدّدة")),G={};cs.forEach(c=>{const nm=String(c.rcC||'').trim()||NOC,k=nk(nm),g=G[k]||(G[k]={n:nm,l:[]});g.l.push(c)});
  const CL=Object.values(G).sort((a,b)=>(a.n===NOC)-(b.n===NOC)||(calc(b.l).tp-calc(b.l).td)-(calc(a.l).tp-calc(a.l).td)||a.n.localeCompare(b.n));
  const mx=Math.max(1,...CL.map(g=>calc(g.l).tp)),col=(g,i)=>g.n===NOC?'#7a8a8f':DSTC[i%DSTC.length];
  // 1) هوية الشحنة
  let x=shHdr('SHIPMENT DELIVERY REPORT',(_t("تقرير حالة وتوزيع الشحنة")))+`<div class="st-cu">${shKV((_t("رقم الشحنة")),'<span dir="ltr">'+esc(h.code)+'</span>')}${shKV((_t("تاريخ التقرير")),'<span dir="ltr">'+today+'</span>')}${shKV((_t("حالة الشحنة")),esc(SHN[st])+(h.posted?(" · "+_t("مُرحَّلة")):''))}${shKV((_t("طريقة الشحن")),SHM[h.mode]||'')}${shKV((_t("البوليصة BL / AWB")),'<span dir="ltr">'+esc(h.bl)+'</span>')}${shKV((_t("رقم الحاوية")),'<span dir="ltr">'+esc(h.cont)+'</span>')}${shKV((_t("الناقل / الباخرة")),esc(h.car))}${shKV((_t("المسار")),routeH(h),1)}${shKV((_t("تاريخ الشحن")),'<span dir="ltr">'+esc(h.sd||'')+'</span>')}${shKV((_t("الوصول المتوقع")),'<span dir="ltr">'+esc(h.eta||'')+'</span>'+(late?(" <small style=\"color:#c93650\">("+_t("متأخرة")+" ")+days+(" "+_t("يوم")+")</small>"):''))}${h.notes?shKV((_t("ملاحظات الشحنة")),esc(h.notes),1):''}</div>`;
  // 2) موقف الشحنة
  {const cur=st==='dn'?5:idx,steps=SHST.slice(0,4).map(([k,n])=>{const hh=hist.find(y=>y.st===k);return {n:n,d:hh?hh.date:'',k:k}});
   steps.push({n:(_t("التسليم للعملاء")),d:st==='dn'&&hist.find(y=>y.st==='dn')?hist.find(y=>y.st==='dn').date:'',k:'dl'});
   x+=`<h3 class="st-h">${_t("موقف الشحنة")}</h3><div class="tl">`+steps.map((q,j)=>{const cls=j<cur?'done':j===cur?'now':'',ic=j<cur?'✓':String(j+1);
    let sub=q.d?esc(q.d):'';let w='';
    if(q.k==='ar'&&j>=cur&&h.eta){sub=(_t("متوقع")+" ")+esc(h.eta);w=' w'}
    else if(q.k==='dl'){sub=st==='dn'?(q.d?esc(q.d):(_t("اكتمل"))):(T.td?T.td+(" "+_t("من")+" ")+T.tp+(" "+_t("طرد")):(_t("لم يبدأ")));if(T.td&&st!=='dn')w=' w'}
    else if(!sub)sub=j===cur?(_t("الآن")):'—';
    return `<div class="tl-s ${cls}${j<=cur?' on':''}"><div class="tl-n"><span>${ic}</span></div><div class="tl-t">${q.n}</div><div class="tl-d${w}" dir="auto">${sub}</div></div>`}).join('')+`</div><p class="st-n" style="margin-top:2mm;text-align:center">${ready?("<b style=\"color:#157a48\">"+_t("الشحنة جاهزة للتسليم")+".</b>"):("<b style=\"color:#a86a00\">"+_t("الشحنة لم تصل بعد"))+(h.eta?(" — "+_t("الوصول المتوقع")+" ")+esc(h.eta):'')+(_t("، والتسليم يبدأ بعد الوصول والتخليص")+".</b>")}</p>`}
  // 3) ملخص
  const pct=T.tp?Math.round(T.td/T.tp*100):0;
  x+=`<h3 class="st-h">${_t("ملخص الحمولات")}</h3><div class="st-cards" style="grid-template-columns:repeat(4,1fr)"><div class="st-c"><span>${_t("الحمولات / العملاء")}</span><b>${T.n}</b></div><div class="st-c"><span>${_t("مدن التسليم")}</span><b>${CL.filter(g=>g.n!==NOC).length}</b></div><div class="st-c"><span>${_t("إجمالي الطرود")}</span><b>${T.tp}</b><small style="font-size:8.5pt;color:var(--muted)">${r2n(T.cbm)} ${_t("م")}³ · ${r2n(T.kg)} ${_t("كغ")}</small></div><div class="st-c due" style="background:linear-gradient(90deg,var(--teal),var(--teal-d))"><span>${_t("المُسلَّم")}</span><b>${T.td} ${_t("من")} ${T.tp}</b></div></div><div class="ops-bar"><i style="width:${pct}%"></i></div>`;
  if(!cs.length)return x+("<p class=\"st-n\">"+_t("لا توجد حمولات مسجلة في هذه الشحنة")+".</p>")+shFt((_t("تقرير تشغيلي لمسؤول التوزيع والتسليم، ولا يتضمن أي بيانات مالية")+"."));
  // 4) التوزيع حسب المدينة (رسم)
  x+=`<h3 class="st-h">${_t("توزيع الحمولات حسب مدينة التسليم")} <small style="color:var(--muted);font-weight:400">(${_t("الجزء الملوَّن متبقٍ، والفاتح مُسلَّم")})</small></h3><div class="dst-bars">`+CL.map((g,i)=>{const t=calc(g.l);return `<div class="dst-b"><span><span class="dst-sw" style="background:${col(g,i)}"></span>${esc(g.n)} <small class="mu">(${t.n})</small></span><div class="tr"><i style="width:${(t.tp-t.td)/mx*100}%;background:${col(g,i)}"></i><i style="width:${t.td/mx*100}%;background:${col(g,i)};opacity:.28"></i></div><b>${t.tp-t.td} ${_t("من")} ${t.tp}</b></div>`}).join('')+`</div>`;
  // 5) التفاصيل لكل مدينة
  x+=`<h3 class="st-h">${_t("تفاصيل التوزيع")}</h3>`+CL.map((g,i)=>{const t=calc(g.l),pc=t.tp?Math.round(t.td/t.tp*100):0,L=g.l.slice().sort((a,b)=>a.cust.localeCompare(b.cust,'ar'));
   return `<div class="dst-c"><div class="dst-h" style="background:${col(g,i)}"><h3>${esc(g.n)}</h3><span>${t.n} ${_t("حمولة")}</span><span>${t.tp} ${_t("طرد")} · ${r2n(t.cbm)} ${_t("م")}³ · ${r2n(t.kg)} ${_t("كغ")}</span><span>${_t("المتبقي")} <b>${t.tp-t.td}</b></span><div class="pg"><i style="width:${pc}%"></i></div></div><table class="ops-tb"><thead><tr><th class="c" style="width:6mm">#</th><th>${_t("العميل / البضاعة")}</th><th class="c">${_t("الطرود")}</th><th class="c">${_t("م")}³ / ${_t("كغ")}</th><th>${_t("المستلم والعنوان")}</th><th class="c">${_t("مُسلَّم / متبقٍ")}</th><th>${_t("الحالة")}</th></tr></thead>`+
   L.map((c,j)=>{const P=num(c.pk),D=Math.min(P,pkDone(c)),ln=(c.dl||[]).length?c.dl[c.dl.length-1].date:'';
    return `<tbody class="dst-sg"><tr><td class="c">${j+1}</td><td><b>${esc(c.cust)}</b><br><small>${esc(c.goods||'—')}</small></td><td class="c">${P}</td><td class="c">${esc(c.cbm||'—')}<br>${esc(c.kg||'—')}</td><td>${c.rcN?'<b>'+esc(c.rcN)+'</b>':("<span style=\"color:#c93650\">— "+_t("اسم المستلم غير مسجَّل")+"</span>")}${c.rcP?' · '+ph(c.rcP):''}${c.rcA?'<br><small>'+esc(c.rcA)+'</small>':''}</td><td class="c">${D} / <b>${Math.max(0,P-D)}</b></td><td><span class="ops-st ${sty(c)}">${dlTxt(c)}</span>${ln?'<br><small dir="ltr">'+esc(ln)+'</small>':''}</td></tr>`+
    ((c.snN||c.snP||c.snA)?`<tr class="dt"><td></td><td colspan="6"><b>${_t("المرسل")}:</b> ${esc(c.snN||'—')}${c.snP?' · '+ph(c.snP):''}${c.snA?' — '+esc(c.snA):''}</td></tr>`:'')+
    (String(c.nt||'').trim()?`<tr class="dt"><td></td><td colspan="6"><b>${_t("ملاحظات")}:</b> ${esc(c.nt)}</td></tr>`:'')+`</tbody>`}).join('')+`</table></div>`}).join('');
  // 6) تنبيهات
  const noC=cs.filter(c=>dlKey(c)!=='full'&&!String(c.rcC||'').trim()),miss=cs.filter(c=>dlKey(c)!=='full'&&(!String(c.rcN||'').trim()||!String(c.rcP||'').trim()||!String(c.rcA||'').trim()));
  if((noC.length||miss.length)&&st!=='dn')x+=`<div class="ops-warn scr-only"><b>${_t("بيانات توزيع ناقصة")}</b> — ${_t("يلزم استكمالها في «المرسل والمستلم» لكل حمولة قبل التسليم")}:<ul>`+cs.filter(c=>noC.includes(c)||miss.includes(c)).map(c=>`<li>${esc(c.cust)}: ${[!String(c.rcC||'').trim()&&(_t("مدينة التسليم")),!String(c.rcN||'').trim()&&(_t("اسم المستلم")),!String(c.rcP||'').trim()&&(_t("هاتف المستلم")),!String(c.rcA||'').trim()&&(_t("العنوان التفصيلي"))].filter(Boolean).join((_t("،")+" "))}</li>`).join('')+`</ul></div>`;
  // 7) سجل التسليم
  const log=[];cs.forEach(c=>(c.dl||[]).forEach(d=>log.push({c:c.cust,city:String(c.rcC||'').trim(),d:d})));log.sort((a,b)=>String(a.d.date).localeCompare(String(b.d.date))||String(a.d.no).localeCompare(String(b.d.no)));
  x+=`<h3 class="st-h">${_t("سجل التسليم")}</h3>`+(log.length?`<table class="ops-tb"><thead><tr><th>${_t("الوصل")}</th><th>${_t("التاريخ")}</th><th>${_t("العميل")}</th><th>${_t("المدينة")}</th><th class="c">${_t("الطرود")}</th><th>${_t("المستلم الفعلي")}</th><th>${_t("ملاحظة")}</th></tr></thead><tbody>${log.map(({c,city,d})=>`<tr><td dir="ltr">${esc(d.no)}</td><td dir="ltr">${esc(d.date)}</td><td>${esc(c)}</td><td>${esc(city||'—')}</td><td class="c">${num(d.pk)}</td><td>${esc(d.by||'—')}${d.idn?' <small dir="ltr">('+esc(d.idn)+')</small>':''}</td><td>${esc(d.note||'')}</td></tr>`).join('')}</tbody></table>`:("<p class=\"st-n\">"+_t("لم تُسجَّل أي عملية تسليم بعد")+".</p>"));
  const sig=t=>`<div style="flex:1;border:1px solid var(--line);border-radius:8px;height:26mm;padding:2mm 3mm;font-size:9pt;color:var(--muted)">${t}<br><br>${_t("الاسم: …………………")}<br>${_t("التاريخ: …………………")}</div>`;
  x+=`<div style="display:flex;gap:6mm;margin-top:6mm;break-inside:avoid">${sig((_t("مسؤول التوزيع والتسليم")))}${sig((_t("مسؤول العمليات")))}</div>`;
  return x+shFt((_t("تقرير تشغيلي لمسؤول التوزيع والتسليم، ولا يتضمن أي بيانات مالية")+"."))}
shOpsReport0=withDoc(shOpsReport0);
function shReceipt(h,i,j){const c=h.cons[i],d=c.dl[j],P=num(c.pk),before=c.dl.slice(0,j+1).reduce((a,y)=>a+num(y.pk),0);
  const sig=t=>`<div style="flex:1;border:1px solid var(--line);border-radius:8px;height:30mm;padding:2mm 3mm;font-size:9pt;color:var(--muted)">${t}</div>`;
  return shHdr('DELIVERY RECEIPT',(_t("وصل تسليم بضاعة")))+`<div class="st-cu">${shKV((_t("رقم الوصل")),'<span dir="ltr">'+esc(d.no)+'</span>')}${shKV((_t("التاريخ")),'<span dir="ltr">'+esc(d.date)+'</span>')}${shKV((_t("الشحنة")),'<span dir="ltr">'+esc(h.code)+'</span>')}${shKV((_t("العميل")),esc(c.cust),1)}${shKV((_t("البوليصة")),'<span dir="ltr">'+esc(h.bl)+'</span>')}${shKV((_t("المسار")),routeH(h),1)}${shKV((_t("الحاوية")),'<span dir="ltr">'+esc(h.cont)+'</span>')}</div>`+
  `<table class="rc-tb" style="margin-top:4mm"><thead><tr><th>${_t("البضاعة")}</th><th>${_t("الطرود المسلَّمة الآن")}</th><th>${_t("المسلَّم حتى الآن")}</th><th>${_t("المتبقي")}</th></tr></thead><tbody><tr><td>${esc(c.goods||'—')}</td><td><b>${num(d.pk)}</b></td><td>${before} ${_t("من")} ${P}</td><td>${Math.max(0,P-before)}</td></tr></tbody></table>`+
  `<div class="st-cu" style="margin-top:4mm">${shKV((_t("اسم المستلم")),esc(d.by),1)}${shKV((_t("الهوية / الهاتف")),'<span dir="ltr">'+esc(d.idn||'')+'</span>')}${d.note?shKV((_t("ملاحظة")),esc(d.note),1):''}</div>`+
  `<p class="st-n" style="margin-top:4mm">${_t("أقرّ المستلم بأنه استلم الطرود المذكورة أعلاه بحالة جيدة")}.</p><div style="display:flex;gap:6mm;margin-top:3mm">${sig((_t("توقيع المستلم")))}${sig((_t("توقيع وختم الشركة")))}</div>`+shFt((_t("وصل تسليم صادر عن شحنة مشتركة، ولا يتضمن بيانات عملاء آخرين")+"."))}
shReceipt=withDoc(shReceipt);
function shNewInv(i){if(!need('inv'))return;const c=SH.cons[i];if(!c.cust.trim()){toast((_t("اكتب اسم العميل أولاً")),'err');return}
  shSave(true).then(ok=>{if(!ok)return;const k=SH.cons.indexOf(c),share=k>=0?r2(shShares(SH)[k]):0,code=SH.code,bl=SH.bl,cur=SH.cur;
    setMode('i');newInv();$('rcv').value=c.cust;if(c.pk)$('pk').value=c.pk;if(c.cbm)$('cbm').value=c.cbm;S.ship=code;if(cur)$('cur').value=cur;
    const row={name:c.goods||((_t("شحن بضاعة")+" — ")+code)},sc=S.cols.find(x=>x.id==='ship'&&x.t==='num')||S.cols.find(x=>x.t==='num'&&/شحن/.test(x.l||''));
    if(c.kg&&S.cols.find(x=>x.id==='w'))row.w=c.kg;let note='';
    if(share>0){if(sc){row[sc.id]=share;if(!sc.v){sc.v=1}}else note=(" · "+_t("حصة الشحن")+" ")+f(share)+' '+(cur||'')}
    S.rows=[row,{}];$('notes').value=(_t("الشحنة")+" ")+code+(bl?' · BL '+bl:'')+(c.cbm?' · '+c.cbm+(" "+_t("م")+"³"):'')+note;grow();render();markDirty();
    toast(share>0?(_t("فاتورة معبأة بحصة الشحن")+" ")+f(share)+(" — "+_t("أضف الجمارك والرسوم ثم احفظ")):(_t("فاتورة جديدة لعميل الشحنة")+" — "+_t("أدخل إجمالي أجرة الشحن في الشحنة لتُعبأ الحصة تلقائياً")))})}
function shPay(i){if(!need('rc'))return;const c=SH.cons[i];if(!c.cust.trim()){toast((_t("اكتب اسم العميل أولاً")),'err');return}
  shSave(true).then(ok=>{if(!ok)return;const h=SHS.get()[SH.code],cc=h.cons.find(x=>x.id===c.id)||c,inv=consInvs(h,cc);
    if(!guardNew($('tabR'),'r'))return;setMode('r');rnew();R.fromShip=h.code;R.prio=inv.map(d=>d.code);
    rid('from').value=cc.cust;const cu=(inv[0]&&inv[0].cur)||h.cur;if(cu)rid('cur').value=cu;rid('for').value=(_t("دفعة عن الشحنة")+" ")+h.code;if(h.bl)rid('bl').value=h.bl;
    rdraw();rid('amt').focus();toast(inv.length?(_t("اكتب المبلغ فيُوزَّع أولاً على فواتير هذه الحمولة")):(_t("لا فواتير صادرة لهذه الحمولة بعد")+" — "+_t("سيُسجَّل المبلغ رصيداً دائناً أو يُوزَّع على فواتير العميل الأخرى")))})}
$('shq').addEventListener('input',shDraw);$('shChips').addEventListener('click',e=>{const b=e.target.closest('[data-fs]');if(!b)return;$('shfs').value=b.dataset.fs;shDraw()});$('shfs').addEventListener('change',shDraw);
$('shNew').addEventListener('click',shNew);$('shBack').addEventListener('click',()=>{shShowList();shDraw()});
$('shList').addEventListener('click',e=>{const r=e.target.closest('[data-hr]');if(r){if(!can('ship')&&!can('deliver')){toast((_t("لا تملك صلاحية عرض تقرير التسليم")),'err');return}const h=SHS.get()[r.dataset.hr];h&&shSheet(()=>shOpsReport(h),(_t("تقرير حالة وتسليم الشحنة")+" ")+h.code,()=>shOpen());return}const x=e.target.closest('[data-hx]');if(x){const k=x.dataset.hx;SHX[k]=!SHX[k];shDraw();return}const c=e.target.closest('[data-hc]');if(c){shEdit(c.dataset.hc,c.dataset.cid);return}const b=e.target.closest('[data-ho]');b&&shEdit(b.dataset.ho)});
shL('change',e=>{const t=e.target,tr=t.closest('tr[data-i]');if(tr&&t.dataset.k==='cust'){{const bc=!findCust(t.value)&&byCode(t.value);if(bc){t.value=bc.name;SH.cons[+tr.dataset.i].cust=bc.name}}const c=SH.cons[+tr.dataset.i];c.custOk=false;custHint(+tr.dataset.i);const o=SHN0[c.id];if(o&&cKey(o)!==cKey(c.cust)&&(consInvs(SH,Object.assign({},c,{cust:o})).length||pkDone(c)>0))toast((_t("تنبيه: ربط فواتير ودفعات هذه الحمولة يتم باسم العميل")+" «")+o+("». "+_t("تغيير الاسم يفصلها عن الحمولة")+" — "+_t("أعِد الاسم القديم إن كان الهدف تصحيح خطأ إملائي فقط")),'err')}});
shL('input',e=>{const t=e.target,tr=t.closest('tr[data-i]');if(tr&&t.dataset.k){SH.cons[+tr.dataset.i][t.dataset.k]=t.value;if(t.dataset.k==='cust')SH.cons[+tr.dataset.i].custOk=false;shUpd()}else if(t.id&&t.id.indexOf('sh_')===0){shReadHead();shUpd()}});
shL('click',async e=>{const b=e.target.closest('[data-a],#sh_next,#sh_prev,#sh_cm,#sh_post,#cm_add,#cm_save,#sh_rep,#sh_save,#sh_del,#sh_back2');if(!b)return;const tr=b.closest('tr[data-i]'),i=tr?+tr.dataset.i:-1,a=b.dataset.a;
  if(b.id==='sh_next'||b.id==='sh_prev'){if(!need('ship'))return;const o=['ld','tr','ar','cu'],k=o.indexOf(SH.st==='dn'?'cu':SH.st);{const nd=$('sh_nd').value||shToday(),nk2=o[k+(b.id==='sh_next'?1:-1)];shSetSt(nk2,b.id==='sh_next'?nd:undefined);shUpd();if(b.id==='sh_next'){const bad=shStepDates();if(bad.length)toast((_t("تنبيه: تاريخ")+" «")+SHN[bad[0]]+("» "+_t("أسبق من مرحلة سابقة")+" — "+_t("عدّله من المسار إن لزم")),'err')}}}
  else if(b.id==='sh_rep'){if(!can('ship')&&!can('deliver')){toast((_t("لا تملك صلاحية عرض تقرير التسليم")),'err');return}if(await shSave(true)){const h=SHS.get()[SH.code];shSheet(()=>shOpsReport(h),(_t("تقرير حالة وتسليم الشحنة")+" ")+h.code,()=>shEdit(h.code))}}
  else if(b.id==='sh_cm')cmOpen();else if(b.id==='sh_post')shPost();
  else if(b.id==='cm_add'){if(!need('ship'))return;if(shLocked(SH)){toast(shLockWhy(SH),'err');return}SH.cons.push(blankCons());shConsDraw();shUpd();const r=$('cmBody').querySelectorAll('tbody tr');r[r.length-1].scrollIntoView({block:'nearest'});r[r.length-1].querySelector('input').focus()}
  else if(b.id==='cm_save'){if(await shSave(true)){$('mCons').classList.remove('on');logAct('تعديل حمولات',SH.code);toast((_t("تم حفظ حمولات الشحنة")+" ")+SH.code)}}
  else if(b.id==='sh_save')shSave();else if(b.id==='sh_del')shDelete();else if(b.id==='sh_back2'){shShowList();shDraw()}
  else if(a==='ph'){phOpen(SH.cons[i].id)}
  else if(a==='pty'){if(shLocked(SH)){toast(shLockWhy(SH),'err');return}ptyOpen(i)}
  else if(a==='rm'){if(shLocked(SH)){toast(shLockWhy(SH),'err');return}const c=SH.cons[i];if(pkDone(c)>0){toast((_t("لا يمكن حذف حمولة سُلِّم منها")),'err');return}if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("؟"));setTimeout(()=>{b.dataset.arm='';b.textContent='✕'},2500);return}SH.cons.splice(i,1);SH.dlOpen=-1;shRender()}
  else if(a==='dl'){if(!SH.cons[i].cust.trim()||!num(SH.cons[i].pk)){toast((_t("اكتب اسم العميل وعدد الطرود أولاً")),'err');return}SH.dlOpen=i;shDlDraw();$('shDl').scrollIntoView({block:'nearest',behavior:'smooth'})}
  else if(a==='dlx'){SH.dlOpen=-1;shDlDraw()}
  else if(a==='dlsave')shDlSave();
  else if(a==='st'){const cid=SH.cons[i].id;if(await shSave(true)){const h=SHS.get()[SH.code],k=h.cons.findIndex(c=>c.id===cid);if(k<0){toast((_t("اكتب بيانات الحمولة أولاً")),'err');return}shSheet(()=>shStatusSheet(h,k),(_t("حالة الشحنة")+" ")+h.code+' - '+h.cons[k].cust,()=>shEdit(h.code))}}
  else if(a==='rcpt'){const h=SHS.get()[SH.code],ci=SH.dlOpen,j=+b.dataset.j,hc=h.cons[ci];shSheet(()=>shReceipt(h,ci,j),(_t("وصل تسليم")+" ")+hc.dl[j].no+' - '+hc.cust,()=>shEdit(h.code))}
  else if(a==='inv')shNewInv(i)
  else if(a==='pay')shPay(i)});

$('bSPay').addEventListener('click',()=>{const c=S.stmt&&S.stmt.c;if(!c)return;if(!guardNew($('bSPay'),'r'))return;
  const M=sumOf(S.stmt.d),pick=Object.entries(M).filter(([,m])=>m.bal>.004).sort((a,b)=>b[1].bal-a[1].bal)[0];
  setMode('r');rnew();R.fromStmt=c.id;rid('from').value=c.name;rid('phone').value=c.phone||'';if(pick)rid('cur').value=pick[0];rdraw();rid('amt').focus();toast((_t("وصل جديد باسم")+" ")+c.name+(". "+_t("اكتب المبلغ فيُوزَّع على أقدم الفواتير")))});
$('r_alloc').addEventListener('input',e=>{const t=e.target;if(t.dataset.ax||t.dataset.ae){const c=t.dataset.ax||t.dataset.ae,x=R.alx[c]||(R.alx[c]={rate:'',eq:''});if(t.dataset.ax){x.rate=fxIn(t.value.trim());if(num(x.rate)>0){x.eq='';const o=document.querySelector('#r_alloc [data-ae="'+c+'"]');if(o)o.value=''}}else{x.eq=t.value.trim();if(num(x.eq)>0){const o=document.querySelector('#r_alloc [data-ax="'+c+'"]');if(o)o.value=''}}R.alTouched=true;markDirty();return}if(!t.dataset.ai)return;const v=r2(t.value);if(v>0)R.al[t.dataset.ai]=v;else delete R.al[t.dataset.ai];R.alTouched=true;rAllocSum()});
$('r_alloc').addEventListener('click',e=>{const b=e.target.closest('[data-ra]');if(!b)return;const a=b.dataset.ra;
  if(a==='auto'){R.alTouched=false;rAuto();rAllocFill();markDirty()}else if(a==='clear'){R.alTouched=true;R.al={};rAllocFill();markDirty()}
  else if(a==='back'){const id=R.fromStmt;if(id)sOpen(id)}else if(a==='ship'){const c=R.fromShip;if(c)shEdit(c)}});
let ILOCK=false;
function setILock(on){ILOCK=on;document.body.classList.toggle('inv-locked',on);$('lockBar').style.display=on?'':'none'}
$('bUnlock').addEventListener('click',()=>{if(!need('inv_unlock'))return;const b=$('bUnlock');
  if(!b.dataset.arm){b.dataset.arm='1';b.textContent=(_t("تأكيد فك القفل؟"));setTimeout(()=>{b.dataset.arm='';b.textContent=(_t("فك القفل"))},3500);return}
  b.dataset.arm='';b.textContent=(_t("فك القفل"));S.ul=Date.now();setILock(false);logAct('فك قفل فاتورة',$('code').value);toast((_t("فُكّ القفل")+" — "+_t("سيُحفظ تاريخ فك القفل داخل الفاتورة")))});
document.addEventListener('beforeinput',e=>{if(ILOCK&&e.target.closest&&e.target.closest('#iwrap'))e.preventDefault()},true);
document.addEventListener('keydown',e=>{if(!ILOCK)return;const t=e.target;if(t.closest&&t.closest('#iwrap')&&/INPUT|TEXTAREA|SELECT/.test(t.tagName)&&e.key.length===1)e.preventDefault()},true);
async function runAudit(){if(!need('audit'))return;$('mAudit').classList.add('on');$('auditBody').innerHTML=("<p class=\"hint\">"+_t("جارٍ الفحص")+"...</p>");
  const A=await loadAll(),I=A.I,Rc=A.Rc,secs=[];
  const row=t=>`<div class="cr">${t}</div>`,codeB=c=>`<b dir="ltr">${esc(c)}</b>`;
  const gaps=(O,reS,pre)=>{const re=new RegExp(reS,'i'),ns=Object.keys(O).map(c=>{const m=re.exec(c);return m?+m[1]:null}).filter(x=>x!=null).sort((a,b)=>a-b),g=[];
    for(let i=1;i<ns.length&&g.length<=15;i++)for(let x=ns[i-1]+1;x<ns[i]&&g.length<=15;x++)g.push(pre+'-'+String(x).padStart(4,'0'));return g};
  const gI=gaps(I,'^PST-(\\d+)$','PST'),gR=gaps(Rc,'^RC-(\\d+)$','RC');
  secs.push(("<h3>"+_t("فجوات التسلسل")+"</h3>")+((gI.length||gR.length)?(gI.length?row((_t("فواتير مفقودة من التسلسل")+": ")+gI.map(codeB).join((_t("،")+" "))+(gI.length>15?' …':'')):'')+(gR.length?row((_t("وصولات مفقودة من التسلسل")+": ")+gR.map(codeB).join((_t("،")+" "))+(gR.length>15?' …':'')):''):row(("<span class=\"ok\">✓ "+_t("لا فجوات في تسلسل الفواتير والوصولات")+"</span>"))));
  const alloc={};let orph=[],toVoid=[],credits={};
  Object.keys(Rc).forEach(no=>{const d=Rc[no];if(!rcValid(d)||!rcIsMoney(d))return;const m=rcAlMap(d),mc=rcCvMap(d);
    Object.entries(m).forEach(([c,v])=>{alloc[c]=r2((alloc[c]||0)+(mc[c]!=null?mc[c]:v));const t=I[c];
      if(!t)orph.push(no+' ← '+c+(" ("+_t("غير موجودة")+")"));else if(t.st==='void')toVoid.push(no+' ← '+c+(" ("+_t("ملغاة")+")"));else if((t.st||'draft')==='draft')toVoid.push(no+' ← '+c+(" ("+_t("مسودة")+")"))});
    const un=rcUn(d);if(un>.004)credits[d.cur||'$']=r2((credits[d.cur||'$']||0)+un)});
  let manual=[],bad=[];
  Object.keys(I).forEach(c=>{const d=I[c],st=d.st||'draft';if(st==='draft'||st==='void')return;
    const df=r2(num(d.pd)-(alloc[c]||0));
    if(df>.004)manual.push(codeB(c)+(": "+_t("المدفوع")+" ")+f(num(d.pd))+(" "+_t("والموزَّع من الوصولات")+" ")+f(alloc[c]||0)+(" — "+_t("فرق")+" ")+f(df)+(" "+_t("دفعة يدوية بدون وصل")));
    else if(df<-.004)bad.push(codeB(c)+(": "+_t("الموزَّع من الوصولات")+" (")+f(alloc[c]||0)+(") "+_t("أكبر من المدفوع")+" (")+f(num(d.pd))+(") — "+_t("خلل يحتاج تصحيحاً")))});
  secs.push(("<h3>"+_t("تطابق الوصولات مع «المدفوع» في الفواتير")+"</h3>")+(bad.length||manual.length?bad.map(row).join('')+manual.map(row).join(''):row(("<span class=\"ok\">✓ "+_t("كل مبالغ «المدفوع» مطابقة لتوزيعات الوصولات")+"</span>"))));
  secs.push(("<h3>"+_t("توزيعات على فواتير غير صالحة")+"</h3>")+((orph.length||toVoid.length)?orph.concat(toVoid).map(x=>row(codeB(x.split(' ← ')[0])+(" "+_t("موزَّع على")+" ")+esc(x.split(' ← ')[1]))).join(''):row(("<span class=\"ok\">✓ "+_t("كل التوزيعات تشير إلى فواتير قائمة")+"</span>"))));
  const ce=Object.entries(credits);
  secs.push(("<h3>"+_t("دفعات غير موزعة (أرصدة دائنة)")+"</h3>")+(ce.length?row((_t("إجمالي غير الموزَّع")+": ")+ce.map(([cu,v])=>fm(v,esc(cu))).join(' · ')+(" — "+_t("تظهر رصيداً دائناً في كشوف أصحابها"))):row(("<span class=\"ok\">✓ "+_t("لا مبالغ غير موزعة")+"</span>"))));
  $('auditBody').innerHTML=secs.join('')}
$('bAudit').addEventListener('click',()=>{closeMenu();runAudit()});

