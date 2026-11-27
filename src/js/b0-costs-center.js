/* ===== مركز التكاليف والربحية: واجهة مستقلة مرتبطة بالشحنات ===== */
const CCS={tab:'profit',sh:'',cu:'',per:'a',q:'',sort:'new',f:{ship:'',type:'',sup:'',st:'',per:'a'},ed:null,afx:{}};
const finOf=h=>{const f=h.fin||{};return{alloc:f.alloc||h.alloc||'cbm',fxi:f.fxi||h.fxi||{},fxe:f.fxe||h.fxe||{}}};
const newLid=()=>'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
/* حفظ مالي مستقل: يجلب أحدث نسخة، يعدّل الجزء المالي فقط، ويحفظ بعلم fin كي لا يمسّ باقي الشحنة */
async function shPatch(code,mut){
  for(let a=0;a<3;a++){
    await shLoad();const D=SHS.get(),old=D[code];if(!old){toast(_t("الشحنة غير موجودة"),'err');return false}
    const d=JSON.parse(JSON.stringify(old));d.costs=d.costs||[];d.costs.forEach((x,i)=>{if(!x.id)x.id=code+'~'+i});
    if(mut(d)===false)return false;
    if(CL.u()){
      try{const j=await api('shsave',{code:code,d:d,isNew:false,fin:1});d.ver=j.ver;d.ts=j.ts||Date.now();const D2=SHS.get();D2[code]=d;SHS.set(D2);return true}
      catch(e){if(e.message==='conflict')continue;if(e.message==='deleted'){const D2=SHS.get();delete D2[code];SHS.set(D2);toast(_t('حُذفت هذه الشحنة من جهاز آخر'),'err');return false}
        toast(e.net?_t("تعذر الاتصال بالخادم — لم يُحفظ التعديل"):e.message,'err');return false}
    }else{d.ver=(+d.ver||0)+1;d.ts=Date.now();const D2=SHS.get();D2[code]=d;if(!SHS.set(D2)){toast(_t("لم يُحفظ: مساحة التخزين ممتلئة"),'err');return false}return true}
  }
  toast(_t("تعذر الحفظ بسبب تعارض — أعد المحاولة"),'err');return false}
const ccFinSet=(code,fn)=>shPatch(code,d=>{const fo=finOf(d);d.fin={alloc:fo.alloc,fxi:Object.assign({},fo.fxi),fxe:Object.assign({},fo.fxe)};fn(d.fin);delete d.alloc;delete d.fxi;delete d.fxe});
function ccLines(){const o=[];Object.values(SHS.get()).forEach(h=>(h.costs||[]).forEach((x,i)=>o.push(Object.assign({},x,{_h:h.code,_c:h.cur||'$',_cons:h.cons||[],id:x.id||h.code+'~'+i}))));return o}
function ccEq(x){const a=num(x.amt),cu=x.cur||x._c;if(cu===x._c)return a;const ev=num(x.eq),r=ev>0&&a>0?ev/a:num(x.fx);return r>0?(ev>0?ev:r2(a*r)):null}
const ccTo=x=>{if(!x.cid)return _t("مشتركة");const c=(x._cons||[]).find(c=>c.id===x.cid);return c?esc(c.cust||'—'):_t("مشتركة")};
async function ccLoad(){if(S.mode!=='p')return;try{await loadAll();await shLoad()}catch(e){}ccAutoFx();ccDraw()}
/* أسعار الصرف المقترحة للفواتير بعملة أخرى تُسجَّل مرة واحدة من جدول العملات */
function ccAutoFx(){const code=CCS.sh,h=code&&SHS.get()[code];if(!h||!can('cost'))return;const F=shFin(Object.assign({},h,{cons:h.cons||[]})),add={};F.fxInv.forEach(x=>{if(!(x.rate>0)){const sg=curRate(x.cu,F.cur);if(sg)add[x.code]=String(sg)}});
  const k=code+JSON.stringify(add);if(!Object.keys(add).length||CCS.afx[k])return;CCS.afx[k]=1;ccFinSet(code,f=>{Object.keys(add).forEach(c=>{if(!(num(f.fxi[c])>0)&&!(num(f.fxe[c])>0))f.fxi[c]=add[c]})}).then(ok=>{if(ok&&S.mode==='p')ccDraw()})}
function ccCmds(){const b=(a,t,c)=>`<button type="button" class="${c||'b2'}" data-ca="${a}">${t}</button>`;let h=b('add','+ '+_t("تكلفة جديدة"),'b1');
  if(CCS.sh){h+=b('rep',_t("تقرير الربحية"))+b('open',_t("فتح الشحنة"))}else if(CCS.tab==='profit')h+=b('psum',_t("ملخص الأرباح (طباعة)"));else if(CCS.tab==='ledger')h+=b('lprint',_t("طباعة السجل"))+b('csv',_t("تصدير CSV"));return h}
function ccDraw(){const box=$('cc');if(!box||S.mode!=='p')return;if(!can('cost')){box.innerHTML='<div class="dEmpty">'+_t("لا تملك صلاحية")+'</div>';return}
  if(CCS.sh&&!SHS.get()[CCS.sh])CCS.sh='';
  const T=[['profit','الربحية'],['ledger','سجل التكاليف'],['sup','الموردون والمدفوعات']];
  box.innerHTML=`<div class="dHead"><div><h2>${_t("التكاليف والأرباح")}</h2><p>${_t("مرتبطة بالشحنات وتُدار من هنا بشكل مستقل")}</p></div><div class="dCtl">${ccCmds()}</div></div><div class="ccSeg" role="tablist">${T.map(([k,n])=>`<button type="button" role="tab" data-ct="${k}" class="${CCS.tab===k?'on':''}" aria-selected="${CCS.tab===k}">${_t(n)}</button>`).join('')}</div><div id="ccTop"></div><div id="ccRes"></div>`;ccTop();ccRes()}
function ccTop(){const el=$('ccTop');if(!el)return;let h='';
  if(CCS.tab==='profit'&&!CCS.sh){const P=ccProfitData();
    h=`<div class="ccBar">${P.curs.length>1?`<div class="dChips" role="group" aria-label="${_t("العملة")}">${P.curs.map(c=>`<button type="button" data-cu="${esc(c)}" class="${c===CCS.cu?'on':''}" aria-pressed="${c===CCS.cu}">${esc(_t(c))}</button>`).join('')}</div>`:''}<div class="dChips" role="group" aria-label="${_t("الفترة")}">${DP.map(([k,n])=>`<button type="button" data-cp="${k}" class="${k===CCS.per?'on':''}" aria-pressed="${k===CCS.per}">${_t(n)}</button>`).join('')}</div><input type="search" id="cc_q" placeholder="${_t("بحث برقم الشحنة أو العميل أو البوليصة")}" value="${esc(CCS.q)}"><select id="cc_sort" aria-label="${_t("الترتيب")}"><option value="new"${CCS.sort==='new'?' selected':''}>${_t("الأحدث")}</option><option value="best"${CCS.sort==='best'?' selected':''}>${_t("الأعلى ربحاً")}</option><option value="worst"${CCS.sort==='worst'?' selected':''}>${_t("الأقل ربحاً")}</option></select></div>`}
  else if(CCS.tab==='ledger'){const f=CCS.f,sh=Object.keys(SHS.get()).sort().reverse();
    h=`<div class="ccBar"><select id="cf_ship" aria-label="${_t("الشحنة")}"><option value="">${_t("كل الشحنات")}</option>${sh.map(c=>`<option value="${esc(c)}"${f.ship===c?' selected':''}>${esc(c)}</option>`).join('')}</select><select id="cf_type" aria-label="${_t("البند")}"><option value="">${_t("كل البنود")}</option>${COSTT.map(t=>`<option value="${esc(t)}"${f.type===t?' selected':''}>${esc(_t(t))}</option>`).join('')}</select><input type="search" id="cf_sup" placeholder="${_t("المورد / الجهة")}" value="${esc(f.sup)}"><select id="cf_st" aria-label="${_t("الحالة")}"><option value="">${_t("مدفوعة وغير مدفوعة")}</option><option value="unpaid"${f.st==='unpaid'?' selected':''}>${_t("غير مدفوعة")}</option><option value="paid"${f.st==='paid'?' selected':''}>${_t("مدفوعة")}</option></select><select id="cf_per" aria-label="${_t("الفترة")}">${DP.map(([k,n])=>`<option value="${k}"${f.per===k?' selected':''}>${_t(n)}</option>`).join('')}</select></div>`}
  el.innerHTML=h}
function ccProfitData(){const all=Object.values(SHS.get()).map(h=>Object.assign({},h,{cons:h.cons||[]})),cnt={};all.forEach(h=>{const c=h.cur||'$';cnt[c]=(cnt[c]||0)+1});
  const curs=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);if(!CCS.cu||!curs.includes(CCS.cu))CCS.cu=curs[0]||'$';const R=dRange(CCS.per),q=nk(CCS.q);
  const rows=all.filter(h=>(h.cur||'$')===CCS.cu&&(!R.from||dIn(dShDate(h),R.from,''))&&(!q||nk([h.code,h.bl,h.cont,h.cons.map(c=>c.cust).join(' ')].join(' ')).includes(q))).map(h=>({h:h,F:shFin(h)}));
  const so=CCS.sort;rows.sort((a,b)=>so==='best'?b.F.T.net-a.F.T.net:so==='worst'?a.F.T.net-b.F.T.net:String(b.h.code).localeCompare(String(a.h.code)));return{rows:rows,curs:curs}}
function ccRes(){const el=$('ccRes');if(!el)return;
  if(CCS.sh){el.innerHTML=ccDetail(CCS.sh);return}
  el.innerHTML=CCS.tab==='ledger'?ccLedger():CCS.tab==='sup'?ccSup():ccProfit()}
const ccK=(l,v,s,c)=>`<div class="dK ${c||''}" style="cursor:default"><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
function ccProfit(){const P=ccProfitData(),cu=esc(CCS.cu),M=v=>fm(v,cu);
  if(!P.rows.length)return `<div class="dEmpty">${Object.keys(SHS.get()).length?_t("لا شحنات مطابقة"):_t("لا توجد شحنات بعد")}</div>`;
  const T={rev:0,inv:0,svc:0,netE:0,col:0,cost:0,net:0,un:0},cash=revPol()==='cash';P.rows.forEach(({F})=>{T.rev+=F.T.rev;T.inv+=F.T.inv;T.svc+=F.T.svc;T.netE+=F.T.netE;T.col+=F.T.col;T.cost+=F.T.cost;T.net+=F.T.net;T.un+=F.T.unpaidM});Object.keys(T).forEach(k=>T[k]=r2(T[k]));const mg=T.svc>0?Math.round(T.net/T.svc*1000)/10:null;
  let h=`<div class="dKpi">${ccK((cash?_t("المحصَّل من العملاء"):_t("الإيرادات"))+' ('+cu+')',f(T.rev),cash?_t("المفوتر")+' '+f(T.inv):_t("المفوتر")+' '+f(T.inv)+' · '+_t("المحصَّل")+' '+f(T.col))}${ccK(_t("التكاليف"),f(T.cost),_t("غير مدفوع للموردين")+' '+f(T.un),T.un>0?'gold':'')}${ccK(cash?_t("الربح المُحقَّق"):_t("صافي الربح"),M(T.net),mg==null?'':_t("الهامش على إيراد الخدمات")+' '+mg+'%',T.net<0?'bad':'good')}${cash?ccK(_t("الربح المتوقع بعد تحصيل المتبقي"),M(T.netE),_t("المفوتر")+' − '+_t("التكاليف"),T.netE<0?'bad':'gold'):''}${ccK(_t("عدد الشحنات"),String(P.rows.length),'')}</div>`;
  h+=`<div class="shScroll"><table class="ccT"><thead><tr><th>${_t("الشحنة")}</th><th>${_t("الحالة")}</th><th>${_t("الحمولات")}</th><th class="num">${_t("المفوتر")}</th><th class="num">${_t("المحصَّل")}</th><th class="num">${_t("التكاليف")}</th><th class="num">${_t("صافي الربح")}</th><th class="num">${_t("الهامش")}</th><th class="num">${_t("غير مدفوع للموردين")}</th></tr></thead><tbody>`+P.rows.map(({h:x,F})=>{const t=F.T,st=shStat(x);return `<tr data-open="${esc(x.code)}" tabindex="0"><td dir="ltr"><b>${esc(x.code)}</b></td><td>${shBadge(st)}</td><td>${x.cons.length?esc(x.cons[0].cust||'—')+(x.cons.length>1?` <span class="mu">+${x.cons.length-1}</span>`:''):'<span class="mu">—</span>'}</td><td class="num">${t.inv?f(t.inv):'—'}</td><td class="num">${t.col?f(t.col):'—'}</td><td class="num">${t.cost?f(t.cost):'—'}</td><td class="num ${t.net<0?'neg':t.net>0?'pos':''}"><b>${t.rev||t.cost?f(t.net):'—'}</b></td><td class="num">${t.mg==null?'—':t.mg+'%'}</td><td class="num">${t.unpaidM>.004?f(t.unpaidM):'—'}</td></tr>`}).join('')+`</tbody><tfoot><tr><td colspan="3">${_t("الإجمالي")}</td><td class="num">${f(T.inv)}</td><td class="num">${f(T.col)}</td><td class="num">${f(T.cost)}</td><td class="num ${T.net<0?'neg':''}">${f(T.net)}</td><td class="num">${mg==null?'—':mg+'%'}</td><td class="num">${f(T.un)}</td></tr></tfoot></table></div><p class="hint" style="margin-top:8px">${_t("اضغط على أي شحنة لعرض تفاصيل ربحيتها وتكاليفها")}. ${_t("كل عملة تُعرض على حدة ولا تُجمع مع غيرها")}.</p>`;
  return h}
function ccLineRow(x,withShip){const eq=ccEq(x),cu=x.cur||x._c,foreign=cu!==x._c;
  return `<tr data-lid="${esc(x.id)}" data-lh="${esc(x._h)}"><td><input type="checkbox" data-cpd="1" aria-label="${_t("مدفوعة")}"${x.pd?' checked':''}></td><td dir="ltr">${esc(x.date||'—')}</td>${withShip?`<td dir="ltr"><a href="#/costs/shipment/${encodeURIComponent(x._h)}" data-sl="${esc(x._h)}">${esc(x._h)}</a></td>`:''}<td>${esc(_t(x.type||''))}${x.rb?` <span class="ccTag">${_t("نيابة عن العميل")}</span>`:''}</td><td>${esc(x.desc||'')}</td><td>${esc(x.sup||'—')}</td><td class="num" dir="ltr">${f(num(x.amt))} ${esc(cu)}${cstPaid(x)>.004&&cstRem(x)>.004?`<small class="ccPart">${_t("مدفوع")} ${f(cstPaid(x))} · ${_t("المتبقي")} ${f(cstRem(x))}</small>`:''}</td><td class="num">${foreign?(eq==null?`<span class="neg">${_t("بلا سعر صرف")}</span>`:f(eq)+' '+esc(x._c)):'—'}</td><td>${ccTo(x)}</td><td class="num"><button class="ib" data-ca="pay" title="${_t("تسجيل دفعة")}">＄</button> <button class="ib" data-ca="edit" title="${_t("تعديل")}">✎</button> <button class="ib" data-ca="del" title="${_t("حذف التكلفة")}">✕</button></td></tr>`}
function ccFiltered(){const f=CCS.f,R=dRange(f.per),q=nk(f.sup||'');return ccLines().filter(x=>(!f.ship||x._h===f.ship)&&(!f.type||x.type===f.type)&&(!q||nk(x.sup||'').includes(q))&&(!f.st||(f.st==='paid'?cstRem(x)<=.004:cstRem(x)>.004))&&(!R.from||dIn(x.date,R.from,''))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b._h).localeCompare(String(a._h)))}
function ccTotals(L){const T={};L.forEach(x=>{const cu=x.cur||x._c,t=T[cu]||(T[cu]={all:0,un:0});t.all+=num(x.amt);t.un+=cstRem(x)});return Object.entries(T).map(([cu,t])=>({cu:cu,all:r2(t.all),un:r2(t.un)}))}
function ccLedger(){const L=ccFiltered();if(!L.length)return `<div class="dEmpty">${ccLines().length?_t("لا تكاليف مطابقة للتصفية"):_t("لا توجد تكاليف مسجلة بعد. أضف أول تكلفة من الزر أعلاه")}</div>`;
  const T=ccTotals(L);
  return `<div class="dKpi">${T.map(t=>ccK(_t("إجمالي التكاليف")+' ('+esc(t.cu)+')',f(t.all),_t("غير مدفوع")+' '+f(t.un),t.un>0?'gold':'')).join('')}${ccK(_t("عدد البنود"),String(L.length),'')}</div><div class="shScroll"><table class="ccT"><thead><tr><th>${_t("مدفوعة")}</th><th>${_t("التاريخ")}</th><th>${_t("الشحنة")}</th><th>${_t("البند")}</th><th>${_t("البيان")}</th><th>${_t("المورد / الجهة")}</th><th class="num">${_t("المبلغ")}</th><th class="num">${_t("المعادل بعملة الشحنة")}</th><th>${_t("تُحمَّل على")}</th><th></th></tr></thead><tbody>${L.map(x=>ccLineRow(x,true)).join('')}</tbody></table></div>`}
function ccSup(){const G={};ccLines().forEach(x=>{const nm=String(x.sup||'').trim(),k=nk(nm),g=G[k]||(G[k]={n:nm,L:[]});g.L.push(x)});
  const E=Object.values(G).map(g=>({g:g,T:ccTotals(g.L),un:g.L.filter(x=>cstRem(x)>.004).length})).sort((a,b)=>b.un-a.un||String(a.g.n).localeCompare(String(b.g.n)));
  if(!E.length)return `<div class="dEmpty">${_t("لا توجد تكاليف مسجلة بعد. أضف أول تكلفة من الزر أعلاه")}</div>`;
  return `<div class="shScroll"><table class="ccT"><thead><tr><th>${_t("المورد / الجهة")}</th><th class="num">${_t("عدد البنود")}</th><th class="num">${_t("الإجمالي")}</th><th class="num">${_t("غير مدفوع")}</th><th></th></tr></thead><tbody>`+E.map(({g,T,un})=>{const nm=g.n||_t("بدون مورد");return `<tr data-sup="${esc(g.n)}"><td><b>${esc(nm)}</b></td><td class="num">${g.L.length}</td><td class="num">${T.map(t=>f(t.all)+' '+esc(t.cu)).join('<br>')}</td><td class="num ${un?'neg':''}">${T.some(t=>t.un>0)?T.filter(t=>t.un>0).map(t=>f(t.un)+' '+esc(t.cu)).join('<br>'):'—'}</td><td class="num"><button class="b2" data-ca="supview" style="padding:3px 10px">${_t("عرض البنود")}</button>${un?` <button class="b2" data-ca="suppay" style="padding:3px 10px">${_t("تسديد الكل")}</button>`:''}</td></tr>`}).join('')+'</tbody></table></div>'}
function ccDetail(code){const h0=SHS.get()[code];if(!h0)return '';const h=Object.assign({},h0,{cons:h0.cons||[]}),F=shFin(h),T=F.T,cu=esc(F.cur),M=v=>fm(v,cu),st=shStat(h),FO=finOf(h);
  let x=`<div class="ccBack"><button type="button" class="b2" data-ca="back">← ${_t("الربحية")}</button></div><div class="ccSum" style="margin-bottom:12px"><b dir="ltr" style="font-size:13pt">${esc(code)}</b>${shBadge(st)}<span>${routeH(h)}</span><span class="mu">${h.cons.length} ${_t("حمولة")}</span></div>`;
  x+=`<div class="dKpi">${ccK((F.pol==='cash'?_t("المحصَّل من العملاء"):_t("الإيرادات"))+' ('+cu+')',f(T.rev),_t("المفوتر")+' '+f(T.inv)+' · '+_t("المتبقي")+' '+f(T.out))}${ccK(_t("التكاليف"),f(T.cost),_t("مباشرة")+' '+f(T.direct)+' · '+_t("مشتركة")+' '+f(T.shared),'')}${ccK(F.pol==='cash'?_t("الربح المُحقَّق"):_t("صافي الربح"),M(T.net),_t("الهامش على إيراد الخدمات")+' '+(T.mg==null?'—':T.mg+'%')+(Math.abs(T.fx)>.004?' · '+_t("فروق عملة")+' '+f(T.fx):''),T.net<0?'bad':'good')}${F.pol==='cash'?ccK(_t("الربح المتوقع بعد تحصيل المتبقي"),M(T.netE),'',T.netE<0?'bad':'gold'):''}${T.pt>.004?ccK(_t("رسوم مُعاد فوترتها (نيابة عن العميل)"),M(T.pt),_t("إيراد الخدمات")+' '+f(T.svc)):''}${ccK(_t("صافي النقد حتى الآن"),M(T.cashNet),_t("المحصَّل")+' − '+_t("التكاليف المدفوعة"),T.cashNet<0?'bad':'gold')}</div>`;
  if(h.cons.length){x+=`<div class="dC w12" style="margin-bottom:12px"><h3>${_t("ربحية الحمولات")} <small><label>${_t("توزيع التكاليف المشتركة")}: <select data-alloc="1">${Object.keys(ALB).map(k=>`<option value="${k}"${F.basis===k?' selected':''}>${_t(ALB[k])}</option>`).join('')}</select></label></small></h3><div class="shScroll"><table class="ccT"><thead><tr><th>${_t("العميل")}</th><th class="num">${_t("المفوتر")}</th><th class="num">${_t("المحصَّل")}</th><th class="num">${_t("تكلفة مباشرة")}</th><th class="num">${_t("حصة مشتركة")}</th><th class="num">${_t("الربح")}</th><th class="num">${_t("الهامش")}</th></tr></thead><tbody>`+F.per.map(p=>`<tr><td>${esc(p.c.cust||'—')}</td><td class="num">${p.billed?f(p.inv):`<span class="mu">${_t("لم تُفوتَر")}</span>`}</td><td class="num">${f(p.col)}</td><td class="num">${f(p.direct)}</td><td class="num">${f(p.shared)}</td><td class="num ${p.net<0?'neg':'pos'}"><b>${f(p.net)}</b></td><td class="num">${p.mg==null?'—':p.mg+'%'}</td></tr>`).join('')+`</tbody><tfoot><tr><td>${_t("الإجمالي")}</td><td class="num">${f(T.inv)}</td><td class="num">${f(T.col)}</td><td class="num">${f(T.direct)}</td><td class="num">${f(T.shared)}</td><td class="num ${T.net<0?'neg':''}">${f(T.net)}</td><td class="num">${T.mg==null?'—':T.mg+'%'}</td></tr></tfoot></table></div></div>`}
  if(F.fxInv.length)x+=`<div class="dC w12" style="margin-bottom:12px"><h3>${_t("فواتير بعملة أخرى")} <small>${_t("سعر الصرف")} (${FXD()?'1 '+cu+' = ?':'1 = ? '+cu}) ${FXSW}</small></h3><div class="shScroll"><table class="ccT"><thead><tr><th>${_t("فاتورة بعملة أخرى")}</th><th>${_t("العميل")}</th><th class="num">${_t("المبلغ")}</th><th>${_t("سعر الصرف")}</th><th>${_t("أو المعادل")} (${cu})</th><th class="num">${_t("المعادل المحسوب")}</th></tr></thead><tbody>`+F.fxInv.map(y=>{const bd=y.rate>0?'var(--line)':'var(--bad,#c93650)';return `<tr><td dir="ltr">${esc(y.code)}</td><td>${esc(y.cust)}</td><td class="num" dir="ltr">${f(y.t)} ${esc(y.cu)}</td><td><input data-fxi="${esc(y.code)}" inputmode="decimal" dir="ltr" title="${esc(fxLbl(y.cu,cu))}" data-ph value="${y.eq?'':esc(fxOut(FO.fxi[y.code]||''))}" style="width:90px;border:1.5px solid ${bd};border-radius:8px;padding:5px 8px"></td><td><input data-fxe="${esc(y.code)}" inputmode="decimal" dir="ltr" value="${esc(FO.fxe[y.code]||'')}" style="width:100px;border:1.5px solid ${bd};border-radius:8px;padding:5px 8px"></td><td class="num" dir="ltr">${y.rate>0?f(y.eq?num(FO.fxe[y.code]):r2(y.t*y.rate)):'—'}</td></tr>`}).join('')+'</tbody></table></div></div>';
  const L=ccLines().filter(l=>l._h===code),hasSm=h.cons.some(c=>String(c.sm==null?'':c.sm).trim()!==''),canConv=F.autoFr&&!hasSm;
  x+=`<div class="dC w12" style="margin-bottom:12px"><h3>${_t("تكاليف الشحنة")} <small><button class="b2" data-ca="addhere" style="padding:3px 12px">+ ${_t("تكلفة جديدة")}</button></small></h3>`;
  if(F.autoFr)x+=`<div class="ccSum" style="margin-bottom:8px"><span>${_t("أجرة الشحن الدولي")}: <b>${fm(num(h.freight),cu)}</b> — ${_t("محسوبة تلقائياً من حقل أجرة الشحنة")}</span>${canConv?`<button class="b2" data-ca="frline">${_t("تحويلها إلى بند تكلفة")}</button>`:''}</div>`;
  x+=L.length?`<div class="shScroll"><table class="ccT"><thead><tr><th>${_t("مدفوعة")}</th><th>${_t("التاريخ")}</th><th>${_t("البند")}</th><th>${_t("البيان")}</th><th>${_t("المورد / الجهة")}</th><th class="num">${_t("المبلغ")}</th><th class="num">${_t("المعادل بعملة الشحنة")}</th><th>${_t("تُحمَّل على")}</th><th></th></tr></thead><tbody>${L.map(l=>ccLineRow(l,false)).join('')}</tbody></table></div>`:(F.autoFr?'':`<div class="dEmpty">${_t("لا توجد تكاليف مسجلة لهذه الشحنة بعد")}</div>`);
  x+='</div>';
  const W=shWarn(F,h).filter(w=>!F.autoFr||w.indexOf(_t("أجرة الشحن الدولي محسوبة تلقائياً"))!==0);if(W.length)x+='<ul class="hint" style="margin:8px 0;padding-inline-start:18px">'+W.map(w=>'<li>'+w+'</li>').join('')+'</ul>';
  return x}
/* ---- نافذة التكلفة ---- */
function ccFxUI(){const h=SHS.get()[$('cc_ship').value]||{},sc=h.cur||'$',cu=$('cc_cur').value||sc,fo=cu!==sc;$('cc_fxrow').style.display=fo?'':'none';$('cc_fxw').style.display=$('cc_eqw').style.display=fo?'':'none';$('cc_hint').innerHTML=fo?'<bdi dir="ltr">'+esc(fxLbl(cu,sc))+'</bdi> '+FXSW:''}
function ccChips(id){const sel=$(id),box=$(id+'C');box.innerHTML=[...sel.options].map(o=>`<button type="button" role="radio" data-v="${esc(o.value)}" aria-checked="${o.value===sel.value}">${esc(o.dataset.s||o.textContent)}</button>`).join('')}
function ccCidUI(sel){const h=SHS.get()[$('cc_ship').value]||{cons:[]};$('cc_cid').innerHTML=`<option value="" data-s="${_t("مشتركة")}">${_t("مشتركة (توزَّع على الحمولات)")}</option>`+(h.cons||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.cust||'—')}</option>`).join('');$('cc_cid').value=sel||'';ccChips('cc_cid')}
function ccRbUI(){$('cc_rbw').style.display=$('cc_rb').checked?'':'none'}
function ccPdUI(){$('cc_pdw').style.display=$('cc_pd').checked?'':'none'}
function ccModal(code,id){if(!need('cost'))return;const D=SHS.get(),sh=Object.keys(D).sort().reverse();if(!sh.length){toast(_t("أنشئ شحنة أولاً"),'err');return}
  const x=id?ccLines().find(l=>l.id===id&&l._h===code):null;CCS.ed={code:code||'',id:id||''};
  $('mcT').textContent=id?_t("تعديل تكلفة"):_t("تكلفة جديدة");
  $('cc_ship').innerHTML=sh.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('cc_type').innerHTML=COSTT.map(t=>`<option value="${esc(t)}">${esc(_t(t))}</option>`).join('');
  $('ccSupL').innerHTML=[...new Set(ccLines().map(l=>String(l.sup||'').trim()).filter(Boolean))].map(v=>`<option value="${esc(v)}">`).join('');
  $('cc_ship').value=code||sh[0];$('cc_ship').disabled=!!id;const sc=(D[$('cc_ship').value]||{}).cur||'$';
  const set=(k,v)=>{$('cc_'+k).value=v==null?'':v};
  set('type',x?x.type:COSTT[0]);set('date',x?x.date:shToday());set('desc',x?x.desc:'');set('sup',x?x.sup:'');set('amt',x?x.amt:'');set('cur',x?(x.cur||x._c):sc);set('fx',x?fxOut(x.fx):'');set('eq',x?x.eq:'');
  ccCidUI(x?x.cid:'');ccChips('cc_type');$('cc_rb').checked=!!(x&&x.rb);set('rba',x&&x.rb&&x.rba!=null?x.rba:'');ccRbUI();$('cc_pd').checked=!!(x&&x.pd);$('cc_pd').dataset.keep=(x&&cstPaid(x)>.004&&!x.pd)?'1':'';set('pdd',x?x.pdDate:'');ccPdUI();ccFxUI();
  document.querySelectorAll('#mCost .bad').forEach(e=>e.classList.remove('bad'));$('mCost').classList.add('on');setTimeout(()=>$('cc_amt').focus(),50)}
async function ccSaveModal(){if(!need('cost'))return;const code=$('cc_ship').value,h=SHS.get()[code];if(!h){bad($('cc_ship'),_t("اختر الشحنة"));return}
  const amt=num($('cc_amt').value);if(!(amt>0)){bad($('cc_amt'),_t("اكتب مبلغاً أكبر من صفر"));return}
  const sc=h.cur||'$',cu=$('cc_cur').value||sc;let fx=String(fxIn($('cc_fx').value.trim())),eq=$('cc_eq').value.trim();
  if(cu!==sc){if(!(num(fx)>0)&&!(num(eq)>0)){bad($('cc_fx'),_t("أدخل سعر الصرف أو المعادل بعملة الشحنة"));return}if(num(eq)>0)fx=''}else{fx='';eq=''}
  const ed=CCS.ed||{},id=ed.id||newLid(),pd=$('cc_pd').checked,rec={id:id,pays:[],type:$('cc_type').value,desc:$('cc_desc').value.trim(),sup:$('cc_sup').value.trim(),date:$('cc_date').value,amt:String(amt),cur:cu,cid:$('cc_cid').value,pd:pd,pdDate:pd?($('cc_pdd').value||shToday()):''};if(fx)rec.fx=fx;if(eq)rec.eq=eq;if($('cc_rb').checked){rec.rb=true;const rb=$('cc_rba').value.trim();if(rb!==''&&num(rb)>=0)rec.rba=String(num(rb))}
  const b=$('cc_save');b.disabled=true;
  const wantPd=pd,pdd=rec.pdDate;delete rec.pd;delete rec.pdDate;const ok=await shPatch(code,d=>{const i=d.costs.findIndex(c=>c.id===id);let o;if(i>=0){o=d.costs[i];['fx','eq','rb','rba'].forEach(k=>delete o[k]);const keep=o.pays;d.costs[i]=o=Object.assign(o,rec,{pays:keep||(o.pd?[{id:newLid(),date:o.pdDate||shToday(),amt:String(num(o.amt))}]:[])})}else{o=rec;d.costs.push(o)}if(wantPd)cstSetPaid(o,true,pdd);else if(!wantPd&&cstPaid(o)>0&&ed.id&&!$('cc_pd').dataset.keep)cstSetPaid(o,false);else cstSync(o)});b.disabled=false;
  if(ok){logAct(ed.id?'تعديل تكلفة شحنة':'إضافة تكلفة شحنة',code+' · '+f(amt)+' '+cu);$('mCost').classList.remove('on');toast(_t("تم حفظ التكلفة"));ccDraw()}}
async function ccMarkPaid(code,id,v){if(await shPatch(code,d=>{const x=d.costs.find(c=>c.id===id);if(!x)return false;if(v){if(!(Array.isArray(x.pays)&&x.pays.length)&&x.pd)return false;cstSetPaid(x,true,shToday())}else cstSetPaid(x,false)})){logAct(v?'تسديد تكلفة شحنة':'إلغاء تسديد تكلفة',code);}ccDraw()}
async function ccDelete(code,id){if(await shPatch(code,d=>{d.costs=d.costs.filter(c=>c.id!==id)})){logAct('حذف تكلفة شحنة',code);toast(_t("حُذفت التكلفة"))}ccDraw()}
function ccCsv(){const L=ccFiltered(),H=['Date','Shipment','Type','Description','Supplier','Amount','Currency','Equivalent','Shipment currency','Allocated to','Paid','Paid date'];
  const rows=[H].concat(L.map(x=>{const eq=ccEq(x);return[x.date||'',x._h,x.type||'',x.desc||'',x.sup||'',num(x.amt),x.cur||x._c,eq==null?'':eq,x._c,x.cid?((x._cons.find(c=>c.id===x.cid)||{}).cust||''):'Shared',x.pd?'yes':'no',cstPaid(x),cstRem(x),x.pdDate||'']}));
  const t='﻿'+rows.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download='costs-'+shToday()+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function ccLedgerReport(){const L=ccFiltered(),T=ccTotals(L),x=shHdr('SHIPMENT COSTS LEDGER',(_t("سجل تكاليف الشحنات")+" — "+_t("داخلي وسري")))+`<div class="st-cu">${shKV((_t("تاريخ التقرير")),shToday())}${shKV((_t("عدد البنود")),String(L.length))}</div>`;
  const body=`<table class="rc-tb"><thead><tr><th>${_t("التاريخ")}</th><th>${_t("الشحنة")}</th><th>${_t("البند")}</th><th>${_t("البيان")}</th><th>${_t("المورد / الجهة")}</th><th>${_t("المبلغ")}</th><th>${_t("مدفوعة")}</th></tr></thead><tbody>${L.map(l=>`<tr><td dir="ltr">${esc(l.date||'—')}</td><td dir="ltr">${esc(l._h)}</td><td>${esc(_t(l.type||''))}</td><td>${esc(l.desc||'')}</td><td>${esc(l.sup||'—')}</td><td dir="ltr">${f(num(l.amt))} ${esc(l.cur||l._c)}</td><td>${l.pd?_t("نعم"):_t("لا")}</td></tr>`).join('')}</tbody></table><h3 class="st-h">${_t("الإجماليات")}</h3><table class="rc-tb"><thead><tr><th>${_t("العملة")}</th><th>${_t("الإجمالي")}</th><th>${_t("غير مدفوع")}</th></tr></thead><tbody>${T.map(t=>`<tr><td>${esc(t.cu)}</td><td dir="ltr">${f(t.all)}</td><td dir="ltr">${f(t.un)}</td></tr>`).join('')}</tbody></table>`;
  const m=/^(<header>[\s\S]*?<\/header>)([\s\S]*)$/.exec(x+body+shFt(_t("تقرير داخلي: لا يُسلَّم للعملاء")+'.'));return m?`<table class="rpt"><thead><tr><td>${m[1]}</td></tr></thead><tbody><tr><td>${m[2]}</td></tr></tbody></table>`:x+body}
ccLedgerReport=withDoc(ccLedgerReport);
function shFinBox(){const b=$('shFinBox');if(!b||!SH||!can('cost'))return;if(SH._new||!SH.code){b.innerHTML=`<p class="hint">${_t("احفظ الشحنة أولاً، ثم أدر تكاليفها وربحيتها من صفحة التكاليف والأرباح")}.</p>`;return}
  const h0=SHS.get()[SH.code];if(!h0){b.innerHTML='';return}const F=shFin(Object.assign({},h0,{cons:h0.cons||[]})),T=F.T,cu=esc(F.cur);
  b.innerHTML=`<div class="ccSum"><span>${_t("الإيرادات")} <b>${fm(T.rev,cu)}</b></span><span>${_t("التكاليف")} <b>${fm(T.cost,cu)}</b></span><span>${_t("صافي الربح")} <b style="${T.net<0?'color:#c0334b':''}">${fm(T.net,cu)}</b></span>${T.unpaidM>.004?`<span>${_t("غير مدفوع للموردين")} <b>${fm(T.unpaidM,cu)}</b></span>`:''}<button class="b1" id="sh_fin_go" type="button">${_t("إدارة التكاليف والربحية")}</button></div>`}
$('shFinBox').addEventListener('click',e=>{if(e.target.closest('#sh_fin_go')&&SH&&SH.code&&!SH._new)routeTo('#/costs/shipment/'+encodeURIComponent(SH.code))});
/* ---- الأحداث ---- */
{let qt;
$('cc').addEventListener('input',e=>{const t=e.target;if(t.id==='cc_q'){CCS.q=t.value;clearTimeout(qt);qt=setTimeout(ccRes,150)}else if(t.id==='cf_sup'){CCS.f.sup=t.value;clearTimeout(qt);qt=setTimeout(ccRes,150)}});
$('cc').addEventListener('change',async e=>{const t=e.target,tr=t.closest('tr[data-lid]');
  if(t.id==='cc_sort'){CCS.sort=t.value;ccRes()}
  else if(t.id==='cf_ship'||t.id==='cf_type'||t.id==='cf_st'||t.id==='cf_per'){CCS.f[t.id.slice(3)]=t.value;ccRes()}
  else if(t.dataset.cpd&&tr){await ccMarkPaid(tr.dataset.lh,tr.dataset.lid,t.checked)}
  else if(t.dataset.alloc){await ccFinSet(CCS.sh,f=>{f.alloc=t.value});ccDraw()}
  else if(t.dataset.fxi||t.dataset.fxe){const c=t.dataset.fxi||t.dataset.fxe,isE=!!t.dataset.fxe,v=isE?t.value.trim():String(fxIn(t.value.trim()));await ccFinSet(CCS.sh,f=>{if(isE){f.fxe[c]=v;if(num(v)>0)delete f.fxi[c]}else{f.fxi[c]=v;if(num(v)>0)delete f.fxe[c]}});ccDraw()}});
$('cc').addEventListener('click',async e=>{const t=e.target,b=t.closest('[data-ca],[data-ct],[data-cu],[data-cp],tr[data-open],a[data-sl]');if(!b)return;
  if(b.dataset.ct){CCS.tab=b.dataset.ct;CCS.sh='';ccDraw()}
  else if(b.dataset.cu){CCS.cu=b.dataset.cu;ccDraw()}
  else if(b.dataset.cp){CCS.per=b.dataset.cp;ccDraw()}
  else if(b.dataset.sl){e.preventDefault();CCS.sh=b.dataset.sl;CCS.tab='profit';ccAutoFx();ccDraw()}
  else if(b.matches('tr[data-open]')&&!t.closest('button,input,select,a')){CCS.sh=b.dataset.open;ccAutoFx();ccDraw();window.scrollTo(0,0)}
  else if(b.dataset.ca){const a=b.dataset.ca,tr=b.closest('tr[data-lid]');
    if(a==='add')ccModal(CCS.sh||'');else if(a==='addhere')ccModal(CCS.sh);
    else if(a==='back'){CCS.sh='';ccDraw()}
    else if(a==='open'){shOpen().then(()=>shEdit(CCS.sh))}
    else if(a==='rep'){const h=SHS.get()[CCS.sh];if(h)shSheet(()=>shProfitReport(h),(_t("تقرير ربحية الشحنة")+" ")+h.code,null)}
    else if(a==='psum'){shSheet(()=>shProfitAll(),_t("ملخص أرباح الشحنات"),null)}
    else if(a==='lprint')shSheet(()=>ccLedgerReport(),_t("سجل تكاليف الشحنات"),null);
    else if(a==='csv')ccCsv();
    else if(a==='edit'&&tr)ccModal(tr.dataset.lh,tr.dataset.lid);else if(a==='pay'&&tr)ccPayOpen(tr.dataset.lh,tr.dataset.lid);
    else if(a==='del'&&tr){if(!b.dataset.arm){b.dataset.arm='1';b.textContent='؟';setTimeout(()=>{if(b.isConnected){b.dataset.arm='';b.textContent='✕'}},2500);return}await ccDelete(tr.dataset.lh,tr.dataset.lid)}
    else if(a==='frline'){const h=SHS.get()[CCS.sh];if(h&&await shPatch(CCS.sh,d=>{if((d.costs||[]).some(c=>c.type===COSTT[0]))return false;d.costs.push({id:newLid(),type:COSTT[0],desc:_t("أجرة الشحن الدولي"),sup:'',date:shToday(),amt:String(d.freight),cur:d.cur||'$',cid:'',pd:false,pdDate:''})})){logAct('تحويل أجرة الشحن إلى بند',CCS.sh);toast(_t("تم تحويل الأجرة إلى بند تكلفة"))}ccDraw()}
    else if(a==='supview'||a==='suppay'){const sp=b.closest('tr[data-sup]').dataset.sup,k=nk(sp);
      if(a==='supview'){CCS.f=Object.assign({ship:'',type:'',st:'',per:'a'},{sup:sp});CCS.tab='ledger';ccDraw()}
      else{if(!b.dataset.arm){b.dataset.arm='1';b.textContent=_t("تأكيد التسديد؟");setTimeout(()=>{if(b.isConnected){b.dataset.arm='';b.textContent=_t("تسديد الكل")}},3000);return}
        const by={};ccLines().filter(x=>nk(x.sup||'')===k&&cstRem(x)>.004).forEach(x=>(by[x._h]=by[x._h]||[]).push(x.id));let n=0;
        for(const c of Object.keys(by)){if(await shPatch(c,d=>{d.costs.forEach(x=>{if(by[c].includes(x.id)){if(!(Array.isArray(x.pays)&&x.pays.length)&&x.pd)return;cstSetPaid(x,true,shToday());n++}})}));else break}
        if(n){logAct('تسديد تكاليف مورد',sp||'—');toast(_t("تم تسديد")+' '+n+' '+_t("بند"))}ccDraw()}}}});

/* ===== دفعات الموردين الجزئية ===== */
let CPY=null;
function ccPayDraw(){const x=ccLines().find(l=>l.id===CPY.id&&l._h===CPY.code);if(!x){$('mPay').classList.remove('on');return}const cu=esc(x.cur||x._c),pays=Array.isArray(x.pays)?x.pays:(x.pd?[{id:'',date:x.pdDate||'',amt:x.amt,note:''}]:[]);
  $('cp_sum').innerHTML=`<div class="ccpS"><span>${esc(_t(x.type||''))} · ${esc(x.sup||'—')}</span><b dir="ltr">${f(num(x.amt))} ${cu}</b></div><div class="ccpS"><span>${_t("مدفوع")}</span><b dir="ltr">${f(cstPaid(x))} ${cu}</b></div><div class="ccpS"><span>${_t("المتبقي")}</span><b dir="ltr" style="color:${cstRem(x)>.004?'#c0334b':'#14804a'}">${f(cstRem(x))} ${cu}</b></div>`;
  $('cp_list').innerHTML=pays.length?`<div class="ccpL"><b>${_t("سجل الدفعات")}</b>${pays.map(p=>`<div class="ccpR"><span dir="ltr">${esc(p.date||'—')}</span><span dir="ltr">${f(num(p.amt))} ${cu}</span><span>${esc(p.note||'')}</span>${p.id?`<button class="ib" data-pdel="${esc(p.id)}" title="${_t("حذف الدفعة")}">✕</button>`:''}</div>`).join('')}</div>`:`<p class="hint">${_t("لا دفعات مسجلة بعد")}</p>`;
  $('cp_amt').value=cstRem(x)>.004?String(cstRem(x)):'';$('cp_date').value=shToday();$('cp_note').value=''}
function ccPayOpen(code,id){if(!need('cost'))return;CPY={code:code,id:id};ccPayDraw();$('mPay').classList.add('on');setTimeout(()=>$('cp_amt').focus(),50)}
async function ccPayAdd(){const x=ccLines().find(l=>l.id===CPY.id&&l._h===CPY.code);if(!x)return;const a=r2($('cp_amt').value);if(!(a>0)){bad($('cp_amt'),_t("اكتب مبلغاً أكبر من صفر"));return}if(a>cstRem(x)+.004){bad($('cp_amt'),_t("المبلغ أكبر من المتبقي"));return}
  const b=$('cp_save');b.disabled=true;const ok=await shPatch(CPY.code,d=>{const o=d.costs.find(c=>c.id===CPY.id);if(!o)return false;if(!(Array.isArray(o.pays)&&o.pays.length)&&o.pd)return false;o.pays=Array.isArray(o.pays)?o.pays:[];o.pays.push({id:newLid(),date:$('cp_date').value||shToday(),amt:String(a),note:$('cp_note').value.trim()});cstSync(o)});b.disabled=false;
  if(ok){logAct('دفعة لمورد',CPY.code+' · '+f(a));toast(_t("تم تسجيل الدفعة"));ccPayDraw();ccDraw()}}
$('cp_save').addEventListener('click',ccPayAdd);
$('mPay').addEventListener('click',async e=>{const b=e.target.closest('[data-pdel]');if(!b)return;if(!b.dataset.arm){b.dataset.arm='1';b.textContent='؟';setTimeout(()=>{if(b.isConnected){b.dataset.arm='';b.textContent='✕'}},2500);return}
  if(await shPatch(CPY.code,d=>{const o=d.costs.find(c=>c.id===CPY.id);if(!o)return false;o.pays=(o.pays||[]).filter(p=>p.id!==b.dataset.pdel);cstSync(o)})){logAct('حذف دفعة مورد',CPY.code);toast(_t("حُذفت الدفعة"));ccPayDraw();ccDraw()}});

$('fx_apply').addEventListener('click',fxApplyUI);
$('cc_save').addEventListener('click',ccSaveModal);
$('mCost').addEventListener('click',e=>{const b=e.target.closest('.ccm-chips button');if(!b)return;const id=b.parentNode.id.slice(0,-1);$(id).value=b.dataset.v;ccChips(id)});
$('cc_ship').addEventListener('change',()=>{const h=SHS.get()[$('cc_ship').value]||{};$('cc_cur').value=h.cur||'$';ccCidUI('');ccFxUI()});
$('cc_cur').addEventListener('change',()=>{const h=SHS.get()[$('cc_ship').value]||{},sc=h.cur||'$',cu=$('cc_cur').value;if(cu!==sc&&!num($('cc_fx').value)&&!num($('cc_eq').value)){const sg=curRate(cu,sc);if(sg)$('cc_fx').value=fxOut(String(sg))}ccFxUI()});
$('cc_fx').addEventListener('input',()=>{if(num($('cc_fx').value)>0)$('cc_eq').value=''});$('cc_eq').addEventListener('input',()=>{if(num($('cc_eq').value)>0)$('cc_fx').value=''});
$('cc_pd').addEventListener('change',ccPdUI);$('cc_rb').addEventListener('change',ccRbUI);
$('cc').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('tr[data-open]')){e.preventDefault();e.target.click()}})}

const RT={cur:'',go:false,first:true};
function stateHash(){const m=S.mode,e=encodeURIComponent;
  if(m==='d')return '#/dashboard';
  if(m==='x')return '#/exports';
  if(m==='p')return CCS.sh?'#/costs/shipment/'+e(CCS.sh):CCS.tab==='ledger'?'#/costs/ledger':CCS.tab==='sup'?'#/costs/suppliers':'#/costs';
  if(m==='h')return $('shEd').style.display!=='none'&&SH&&SH.code&&!SH._new?'#/shipments/'+e(SH.code):'#/shipments';
  if(m==='a')return '#/accounting/'+(ACT==='r'?'receipts':'invoices');
  if(m==='c')return '#/customers';if(m==='g')return '#/settings';if(m==='q')return '#/quick';
  if(m==='i')return S.opened?'#/invoice/'+e(S.opened):'#/invoice/new';
  if(m==='r')return R.opened?'#/receipt/'+e(R.opened):'#/receipt/new';
  if(m==='s')return S.stmt?'#/customer/'+e(S.stmt.c.code||S.stmt.c.name):'#/customers';
  return ''}
function rtPush(h){if(!h||h===RT.cur)return;RT.cur=h;if(location.hash===h)return;if(RT.first){history.replaceState(null,'',h);RT.first=false}else history.pushState(null,'',h)}
setInterval(()=>{if(!ME||RT.go)return;rtPush(stateHash())},200);
