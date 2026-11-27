/* مبلغ + عملة بصيغة موحّدة واتجاه ثابت (LTR معزول) فلا ينعكس السالب في الواجهة العربية */
const fm=(v,cu)=>'\u2066'+f(v)+(cu?' '+cu:'')+'\u2069',iso=t=>'\u2066'+t+'\u2069';
const plA=(n,o,t,fw,mn)=>CURL!=='ar'?(n===1?o:n+' '+mn):n===1?o:n===2?t:n<=10?n+' '+fw:n+' '+mn;
function normNum(v){if(typeof v==='number')return isFinite(v)?String(v):'';let s=String(v==null?'':v).trim();if(!s)return '';
  s=s.replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/[۰-۹]/g,d=>d.charCodeAt(0)-1776).replace(/[٫]/g,'.').replace(/[٬،]/g,',').replace(/[\s\u00A0\u202F']/g,'');
  const hc=s.includes(','),hd=s.includes('.');
  if(hc&&hd){s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(/,/g,'.'):s.replace(/,/g,'')}
  else if(hc){s=/^-?\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,''):((s.match(/,/g)||[]).length===1?s.replace(',','.'):s.replace(/,/g,''))}
  else if(hd&&/^-?\d{1,3}(\.\d{3}){2,}$/.test(s))s=s.replace(/\./g,'');
  return s}
const num=v=>typeof v==='number'?(isFinite(v)?v:0):(parseFloat(normNum(v))||0);
document.addEventListener('change',e=>{const t=e.target;if(t&&t.tagName==='INPUT'&&t.type!=='number'&&/^(decimal|numeric)$/.test(t.inputMode||'')){const n=normNum(t.value);if(n!==t.value&&n!==''&&/^-?\d*\.?\d+$/.test(n)){t.value=n;t.dispatchEvent(new Event('input',{bubbles:true}))}}},true);
const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
var KPULL=false,KSINCE=0,KBUSY=false,LSIG='',LPB=false,LQUIET=false;
var KV_MAP={pst_cust:1,pst_prod:1,pst_tpl:1,pst_curr:1},KV_SC={pst_foot:1,pst_stamp:1,pst_dseq:1,pst_revpol:1};
function KVA(){try{return SRV.on&&!!ME&&!KPULL}catch(e){return false}}
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){if(k==='pst_cols'&&document.body.classList.contains('quick'))return true;try{const sh=KV_MAP[k]||KV_SC[k],old=sh?localStorage.getItem(k):null;localStorage.setItem(k,JSON.stringify(v));if(k==='pst_inv'||k==='pst_cust')IXV++;if(sh&&KVA())kvDiff(k,old,v);return true}catch(e){lsFail(k,e);return false}}};
let IXV=0;
function lsUsage(){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);n+=k.length+(localStorage.getItem(k)||'').length}}catch(e){}return n}
function lsFail(k,e){try{let b=document.getElementById('lsBanner');if(!b){b=document.createElement('div');b.id='lsBanner';b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#c93650;color:#fff;padding:10px 16px;font:600 11pt Cairo,sans-serif;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;direction:rtl';b.innerHTML=("<span>⚠ "+_t("مساحة التخزين على هذا الجهاز ممتلئة")+" — <u>"+_t("لم تُحفظ آخر عملية")+"</u>. "+_t("صدّر نسخة احتياطية الآن، ثم امسح الشعار/الختم الكبير أو بيانات قديمة")+".</span><button id=\"lsBx\" style=\"background:#fff;color:#c93650;border:0;border-radius:8px;padding:5px 12px;font:inherit;cursor:pointer\">"+_t("تصدير نسخة احتياطية")+"</button><button id=\"lsBc\" style=\"background:none;color:#fff;border:1px solid #fff;border-radius:8px;padding:5px 12px;font:inherit;cursor:pointer\">"+_t("إغلاق")+"</button>");document.body.appendChild(b);b.querySelector('#lsBc').onclick=()=>b.remove();b.querySelector('#lsBx').onclick=()=>{try{bkExport()}catch(_){}}}}catch(_){}}
const OPS={'*':'×','%':("% "+_t("من")),'+':'+','-':'−','/':'÷'};
const DEF=()=>[
{id:'name',l:'اسم المنتج',t:'text',v:1,s:0},{id:'qty',l:'الكمية',t:'num',v:0,s:0},{id:'w',l:'الوزن (كغ)',t:'num',v:1,s:0},
{id:'unit',l:'سعر الوحدة',t:'num',v:0,s:0,ns:1},{id:'amt',l:'المبلغ',t:'calc',a:'qty',o:'*',b:'unit',v:0,s:1},
{id:'ship',l:'أجور الشحن',t:'num',v:1,s:1},{id:'cus',l:'الجمارك',t:'num',v:1,s:1},
{id:'exp',l:'رسم الإنفاق الاستهلاكي',t:'num',v:1,s:1},{id:'tax',l:'السلفة الضريبية',t:'num',v:1,s:1},{id:'disc',l:'الخصم',t:'num',v:1,s:-1}];
const TY={text:'Aa',num:'#',pct:'%',calc:'ƒ'};
const badge=c=>{const b=S.cols.find(x=>x.id===c.a);return `<small class="ty" title="${c.t==='pct'?(_t("نسبة من")+" ")+esc(b?b.l:''):''}">${TY[c.t]}</small>`};
const sv=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const IC={dup:sv('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>'),up:sv('<path d="m6 15 6-6 6 6"/>'),dn:sv('<path d="m6 9 6 6 6-6"/>'),del:sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>')};
const TRN={name:['Product','Ürün'],qty:['Qty','Adet'],w:['Weight (kg)','Ağırlık (kg)'],unit:['Unit price','Birim fiyat'],amt:['Amount','Tutar'],ship:['Shipping','Nakliye'],cus:['Customs','Gümrük'],exp:['Consumption spending fee','Tüketim harcama vergisi'],tax:['Tax advance','Vergi avansı'],disc:['Discount','İndirim']};
const sub=x=>x?'<small class="sb">'+esc(x)+'</small>':'';
function L(a,e,t){const m=S.lang;return m==='ar'?esc(a):m==='ae'?esc(a)+sub(e):m==='at'?esc(a)+sub(t):m==='en'?esc(e||a):esc(t||a)}
function Lt(x){const m=S.lang;return m==='ar'?x[0]:m==='ae'?x[0]+' / '+x[1]:m==='at'?x[0]+' / '+x[2]:m==='en'?x[1]:x[2]}
const TX={offno:['رقم الفاتورة الرسمية','Official invoice no.','Resmi fatura no'],rcv:['المستلم','Consignee','Alıcı'],code:['رقم الفاتورة','Invoice No','Fatura No'],cref:['كود العميل','Customer code','Müşteri kodu'],date:['التاريخ','Date','Tarih'],pk:['عدد الطرود','Packages','Koli adedi'],cbm:['CBM','CBM','CBM'],due:['تاريخ الاستحقاق','Due date','Vade tarihi'],st:['الحالة','Status','Durum'],paid:['المدفوع','Paid','Ödenen'],grand:['المبلغ الإجمالي المستحق','Total due','Ödenecek toplam'],notes:['ملاحظات','Notes','Notlar'],sig:['التوقيع','Signature','İmza'],stamp:['الختم','Stamp','Kaşe'],thx:['شكراً لثقتكم بنا','Thank you for your business','Bizi tercih ettiğiniz için teşekkürler']};
const STN={draft:['مسودة','Draft','Taslak'],sent:['مرسلة','Sent','Gönderildi'],partial:['مدفوعة جزئياً','Partially paid','Kısmen ödendi'],paid:['مدفوعة','Paid','Ödendi'],void:['ملغاة','Canceled','İptal']};
const PS={paid:['مدفوع','PAID','ÖDENDİ'],partial:['مدفوع جزئياً','PARTIAL','KISMİ']};
const S={mode:'i',lang:'ar',cols:DEF(),rows:[{},{}],land:false,total:0};
function val(r,id,seen){seen=seen||{};const c=S.cols.find(x=>x.id===id);if(!c)return 0;
  if(c.t==='pct'){if(seen[id])return 0;return val(r,c.a,Object.assign({},seen,{[id]:1}))*num(r[id])/100}if(c.t!=='calc')return num(r[id]);if(seen[id])return 0;const n=Object.assign({},seen,{[id]:1});
  const A=val(r,c.a,n),B=c.b==='#'?num(c.bc):val(r,c.b,n);
  switch(c.o){case'*':return A*B;case'%':return A*B/100;case'+':return A+B;case'-':return A-B;default:return B?A/B:0}}
function render(){
  S.cols.forEach(c=>{const t=TRN[c.id];if(t){c.e=c.e||t[0];c.tr=c.tr||t[1]}});
  const V=S.cols.filter(c=>c.v),n=V.length+1;
  $('tbl').style.fontSize=n>10?'7pt':n>8?'8pt':'9pt';
  $('thead').innerHTML='<tr>'+V.map(c=>`<th${c.t==='text'?' class="tn"':''}>${L(c.l,c.e,c.tr)}${badge(c)}</th>`).join('')+'<th>'+L('الإجمالي','Total','Toplam')+'</th><th class="x"></th></tr>';
  $('rows').innerHTML=S.rows.map((r,i)=>'<tr>'+V.map(c=>c.t==='calc'?`<td class="tot c" data-k="${c.id}"></td>`:c.t==='pct'?`<td><div class="pr"><input data-i="${i}" data-k="${c.id}" type="number" step="any" inputmode="decimal" placeholder="%" value="${esc(r[c.id])}"><i>%</i></div><b class="c" data-k="${c.id}"></b></td>`:c.t==='text'?`<td class="n"><input data-i="${i}" data-k="${c.id}"${c.id==='name'?' list="prods"':''} placeholder="${esc(_t(c.l))}" value="${esc(r[c.id])}"></td>`:`<td><input data-i="${i}" data-k="${c.id}" type="number" step="any" inputmode="decimal" placeholder="0" value="${esc(r[c.id])}"></td>`).join('')+`<td class="tot t"></td><td class="x"><span class="acts"><button class="ib" data-dup="${i}" title="${_t("تكرار البند")}">${IC.dup}</button><button class="ib" data-up="${i}" title="${_t("نقل لأعلى")}">${IC.up}</button><button class="ib" data-dn="${i}" title="${_t("نقل لأسفل")}">${IC.dn}</button><button class="ib dl" data-del="${i}" title="${_t("حذف البند")}">${IC.del}</button></span></td></tr>`).join('');
  LS.set('pst_cols',S.cols);calc();
}
function calc(){
  const V=S.cols.filter(c=>c.v),cnt=V.filter(c=>c.s&&c.t!=='text'),sum={};let T=0;
  [...$('rows').rows].forEach((tr,i)=>{const r=S.rows[i];
    tr.querySelectorAll('.c').forEach(td=>{const v=val(r,td.dataset.k);td.textContent=v?f(v):''});
    const t=cnt.reduce((a,c)=>a+c.s*val(r,c.id),0);tr.querySelector('.t').textContent=cnt.some(c=>val(r,c.id))?f(t):'';T+=t;
    V.forEach(c=>{if(c.t!=='text')sum[c.id]=(sum[c.id]||0)+val(r,c.id)});});
  $('sums').innerHTML=V.map((c,i)=>c.t==='text'?(i?'<td></td>':'<td>'+L('المجموع','Total','Toplam')+'</td>'):c.ns?'<td></td>':`<td>${f(sum[c.id]||0)}</td>`).join('')+`<td>${f(T)}</td><td class="x"></td>`;
  const hid=S.cols.filter(c=>!c.v&&c.s&&c.t!=='text'&&S.rows.some(r=>val(r,c.id)));
  $('warn').textContent=hid.length?("⚠ "+_t("أعمدة مخفية لا تدخل في الإجمالي")+": ")+hid.map(c=>c.l).join((_t("،")+" ")):'';
  S.total=r2(T);$('grand').textContent=f(S.total)+' '+$('cur').value;extras(S.total);
}
const sel=(a,b)=>a===b?' selected':'';
function colPanel(){
  const N=S.cols.filter(c=>c.t!=='text'),opt=(L,x)=>L.map(c=>`<option value="${c.id}"${sel(c.id,x)}>${esc(_t(c.l))}</option>`).join('');
  $('colList').innerHTML=S.cols.map((c,i)=>{
    let h=`<div class="cr" data-c="${i}"><span class="acts" style="opacity:1"><button class="ib" data-mu="${i}" title="${_t("نقل لليمين/أعلى")}">${IC.up}</button><button class="ib" data-md="${i}" title="${_t("نقل لليسار/أسفل")}">${IC.dn}</button></span><input type="checkbox" data-k="v"${c.v?' checked':''}><input data-k="l" value="${esc(c.l)}"><input data-k="e" placeholder="English" style="width:80px" value="${esc(c.e)}"><input data-k="tr" placeholder="Türkçe" style="width:80px" value="${esc(c.tr)}"><select data-k="t"><option value="text"${sel(c.t,'text')}>Aa · ${_t("نص")}</option><option value="num"${sel(c.t,'num')}># · ${_t("رقم")}</option><option value="pct"${sel(c.t,'pct')}>% · ${_t("نسبة من عمود آخر")}</option><option value="calc"${sel(c.t,'calc')}>ƒ · ${_t("معادلة بين عمودين")}</option></select>`;
    if(c.t==='calc'){const O=N.filter(x=>x.id!==c.id);
      h+=`<span class="fx"><select data-k="a">${opt(O,c.a)}</select><select data-k="o">${Object.entries(OPS).map(([k,v])=>`<option value="${k}"${sel(k,c.o)}>${v}</option>`).join('')}</select><select data-k="b">${opt(O,c.b)}<option value="#"${sel(c.b,'#')}>${_t("قيمة ثابتة")}</option></select>${c.b==='#'?`<input data-k="bc" type="number" step="any" style="width:70px" value="${esc(c.bc)}">`:''}</span>`}
    if(c.t==='pct'){const O=N.filter(x=>x.id!==c.id);h+=`<span class="fx">% ${_t("من")} <select data-k="a">${opt(O,c.a)}</select></span><small class="hint">${_t("تُدخل النسبة في كل بند داخل الفاتورة")}</small>`}
    if(c.t!=='text')h+=`<select data-k="s"><option value="1"${sel(String(c.s),'1')}>${_t("يُجمع")} +</option><option value="-1"${sel(String(c.s),'-1')}>${_t("يُطرح")} −</option><option value="0"${sel(String(c.s),'0')}>${_t("لا يدخل")}</option></select>`;
    if(c.custom)h+=`<button class="ib dl" data-rm="${i}" title="${_t("حذف العمود")}">${IC.del}</button>`;
    return h+'</div>'}).join('');
}
function colEv(e,ch){const el=e.target,k=el.dataset.k;if(!k)return;const c=S.cols[el.closest('.cr').dataset.c];
  if(k==='v')c.v=el.checked?1:0;else if(k==='l'||k==='e'||k==='tr')c[k]=el.value;else if(k==='bc')c.bc=el.value;else if(!ch)return;
  else if(k==='s')c.s=+el.value;
  else if(k==='t'){c.t=el.value;if(c.t==='text')c.s=0;else if(c.t==='calc'&&!c.a){const n=S.cols.find(x=>x!==c&&x.t!=='text');c.a=n?n.id:'';c.o='*';c.b='#';c.bc=1}if(c.t==='pct'){const n=S.cols.find(x=>x!==c&&x.t!=='text');if(!S.cols.some(x=>x.id===c.a)||c.a===c.id)c.a=n?n.id:'';c.bc=''}}
  else{c[k]=el.value;if(k==='b'&&el.value==='#'&&c.bc==null)c.bc=1}
  render();if(ch&&!['v','l','s','e','tr'].includes(k))colPanel();}
function presets(){const T=LS.get('pst_tpl',{});
  $('preset').innerHTML=("<button class=\"b2\" data-p=\"full\">"+_t("كل الأعمدة")+"</button><button class=\"b2\" data-p=\"client\">"+_t("مبسطة للعميل")+"</button>")+Object.keys(T).map(n=>`<button class="b2" data-t="${esc(n)}">${esc(n)}</button><button class="ib dl" data-dt="${esc(n)}" title="${_t("حذف القالب")}">${IC.del}</button>`).join('')+("<input id=\"tplName\" placeholder=\""+_t("اسم القالب")+"\"><button class=\"b1\" data-save>"+_t("حفظ الإعداد كقالب")+"</button>");}
const pad=n=>String(n).padStart(4,'0'),nextCode=()=>{let n=LS.get('pst_seq',0)+1;const I=LS.get('pst_inv',{});while(I['PST-'+pad(n)])n++;return 'PST-'+pad(n)};
function msg(t){$('msg').textContent=t;$('cHint').textContent=t;toast(t);clearTimeout(msg.t);msg.t=setTimeout(()=>$('msg').textContent=$('cHint').textContent='',3500)}
function snap(){return{code:$('code').value,cref:$('cref').value.trim(),offno:$('offno').value.trim(),rcv:$('rcv').value,date:$('date').value,notes:$('notes').value,cur:$('cur').value,land:S.land,cols:S.cols,rows:S.rows,sb:$('showBank').checked,bk:[...document.querySelectorAll('.bk')].map(c=>c.checked),t:S.total,ts:Date.now(),pk:$('pk').value,cbm:$('cbm').value,st:$('st').value,pd:num($('paid').value),due:$('due').value,cur2:$('cur2').value,rate:fxIn($('rate').value),lang:S.lang,rcs:S.rcs||[],ship:S.ship||'',ul:S.ul||''}}
function curLand(){return S.mode==='r'?false:S.land}
function activeSheet(){return S.mode==='r'?$('rsheet'):S.mode==='s'?$('ssheet'):$('sheet')}
function docName(){return S.mode==='s'?(S.sheetFn?S.docT:(_t("كشف حساب")+" - ")+(S.stmt?S.stmt.c.name:'')):S.mode==='r'?rv('no')+' - '+rv('from'):$('code').value+' - '+$('rcv').value}
docName=withDoc(docName);
function setLand(b){S.land=!!b;fitZoom();document.body.classList.toggle('land',curLand());$('orient').value=S.land?'l':'p';$('pg').textContent='@page{size:A4 '+(curLand()?'landscape':'portrait')+';margin:8mm 0}'}
function load(d){S.bv=+d.ver||0;S.ship=d.ship||'';S.ul=d.ul||'';setILock((d.st||'draft')!=='draft');S.cols=JSON.parse(JSON.stringify(d.cols));S.rows=JSON.parse(JSON.stringify(d.rows));
  ['code','cref','rcv','date','notes','cur','pk','cbm','due','cur2','rate','offno'].forEach(k=>$(k).value=d[k]||'');$('rate').value=fxOut(d.rate||'');$('paid').value=d.pd||'';setLang(d.lang||S.lang);$('st').value=d.st||'draft';S.rcs=d.rcs||[];setLand(d.land);
  $('showBank').checked=!!d.sb;document.querySelectorAll('.bk').forEach((c,i)=>c.checked=!!(d.bk||[])[i]);renderBank();render();grow();}
function fillCref(){const v=$('rcv').value.trim();let c=findCust(v);if(!c){const bc=byCode(v);if(bc){$('rcv').value=bc.name;$('cref').value=bc.code;DIRTY.i=true;if(typeof calc==='function')calc();return}}if(c&&c.code&&!$('cref').value.trim()){$('cref').value=c.code;DIRTY.i=true}}
$('rcv').addEventListener('change',fillCref);$('rcv').addEventListener('blur',fillCref);
$('r_from').addEventListener('change',()=>{const v=$('r_from').value.trim();if(v&&!findCust(v)){const bc=byCode(v);if(bc)$('r_from').value=bc.name}});
function newInv(){S.rows=[{},{}];['rcv','cref','notes','pk','cbm','due','paid','offno'].forEach(k=>$(k).value='');$('st').value='draft';$('code').value=nextCode();S.opened='';S.rcs=[];S.ship='';S.ul='';setILock(false);if(CL.u())api('next').then(j=>{$('code').value=j.code}).catch(()=>{});$('date').value=todayStr();$('showBank').checked=false;renderBank();render();grow();}

const U0=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'],T0=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'],H0=['','مئة','مئتان','ثلاثمئة','أربعمئة','خمسمئة','ستمئة','سبعمئة','ثمانمئة','تسعمئة'];
function w3(n){const h=Math.floor(n/100),r=n%100,p=[];if(h)p.push(H0[h]);if(r){if(r<20)p.push(U0[r]);else{const o=r%10,t=Math.floor(r/10);p.push(o?U0[o]+(" "+_t("و"))+T0[t]:T0[t])}}return p.join((" "+_t("و")))}
w3=withDoc(w3);
function wordsAr(n){if(!n)return 'صفر';const sc=[['',''],['ألف','آلاف'],['مليون','ملايين'],['مليار','مليارات']],P=[];let i=0;
  while(n>0&&i<4){const g=n%1000;n=Math.floor(n/1000);if(g){P.unshift(i===0?w3(g):g===1?sc[i][0]:g===2?sc[i][0]+'ان':w3(g)+' '+(g<=10?sc[i][1]:sc[i][0]))}i++}return P.join(' و')}
const CN={'$':'دولاراً أمريكياً','€':'يورو','₺':'ليرة تركية'};
function hash(d){let h=2166136261;const x='PST|'+d.code+'|'+d.date+'|'+(+d.t).toFixed(2)+'|'+d.cur;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36).toUpperCase()}
function extras(T){
  rateLbl();const cur=$('cur').value,paid=num($('paid').value),rate=num(fxIn($('rate').value)),c2=$('cur2').value.trim(),st=$('st').value;
  $('g2').textContent=rate&&c2?'≈ '+fm(T*rate,c2):'';
  if(S.lang[0]==='a'&&T>0){const i=Math.floor(T+1e-9),c=Math.round((T-i)*100);$('words').innerHTML=("<b>"+_t("المبلغ كتابةً")+":</b> ")+wordsAr(i)+' '+(CN[cur]||cur)+(c?(" "+_t("و"))+c+'/100':'')+(" "+_t("فقط لا غير"))}else $('words').innerHTML='';
  const py=$('pay');py.classList.toggle('on',paid>0);py.innerHTML=paid>0?'<span>'+L('المدفوع','Paid','Ödenen')+': <b>'+fm(paid,esc(cur))+'</b></span><span>'+L('المتبقي','Balance','Kalan')+': <b>'+fm(T-paid,esc(cur))+'</b></span>'+(S.rcs&&S.rcs.length?("<span>"+_t("الوصولات")+": <b dir=\"ltr\">")+S.rcs.map(esc).join(', ')+'</b></span>':''):'';
  const ps=$('paidStamp');ps.style.display=(st==='paid'||st==='partial')?'block':'none';ps.classList.toggle('part',st==='partial');ps.textContent=PS[st]?Lt(PS[st]):'';
  try{const q=qrcode(0,'M');q.addData('PORTIST|'+$('code').value+'|'+$('date').value+'|'+T.toFixed(2)+cur+'|'+hash({code:$('code').value,date:$('date').value,t:T,cur:cur}));q.make();$('qr').innerHTML=q.createSvgTag(2,0)}catch(e){$('qr').innerHTML=''}
}
function applyLang(){document.querySelectorAll('[data-t]').forEach(e=>{const t=TX[e.dataset.t];if(t)e.innerHTML=L(t[0],t[1],t[2])});
  const v=$('st').value||'draft';$('st').innerHTML=Object.keys(STN).filter(k=>k!=='void').map(k=>`<option value="${k}">${esc(Lt(STN[k]))}</option>`).join('');$('st').value=v;render();if(S.mode==='r')rdraw();if(S.mode==='s')sDraw()}
function setLang(m){S.lang=m;LS.set('pst_lang',m);$('lang').value=m;const dd=(m==='en'||m==='tr')?'ltr':'rtl';['sheet','rsheet','ssheet'].forEach(i=>{const e=$(i);if(e)e.dir=dd});applyLang()}
const UNDO=[];function pushUndo(){UNDO.push(JSON.stringify(snap()));if(UNDO.length>20)UNDO.shift()}
function fitZoom(){document.documentElement.style.setProperty('--z',Math.min(1,innerWidth/((curLand()?1122.5:793.7)+32)))}
function fitPrint(){
  const sh=activeSheet(),root=document.documentElement,oz=root.style.getPropertyValue('--z'),mm=96/25.4;
  root.style.setProperty('--z',1);sh.style.zoom='';sh.style.width='';
  if(rfit()){const hh=Math.ceil(sh.getBoundingClientRect().height/mm)+3;$('pg').textContent='@page{size:198mm '+hh+'mm;margin:0}';root.style.setProperty('--ph',hh+'mm');root.style.setProperty('--z',oz||1);return}
  const cs=getComputedStyle(sh);let h=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
  [...sh.children].forEach(c=>{const s2=getComputedStyle(c);if(s2.position==='absolute'||s2.position==='fixed'||s2.display==='none'||c.classList.contains('cur')||c.classList.contains('addrow'))return;
    h+=c.offsetHeight+(c.tagName==='FOOTER'?6*mm:(parseFloat(s2.marginTop)||0)+(parseFloat(s2.marginBottom)||0))});
  const avail=((curLand()?210:297)-16-4)*mm,z=Math.max(.72,Math.min(1,avail/h));
  if(z<1){sh.style.zoom=z;sh.style.width=((curLand()?297:210)/z)+'mm'}
  root.style.setProperty('--z',oz||1)}
function afterPrintFix(){['sheet','rsheet','ssheet'].forEach(id=>{const e=$(id);e.style.zoom='';e.style.width=''});document.documentElement.style.removeProperty('--ph');setLand(S.land);fitZoom()}
const loadJS=u=>new Promise((ok,no)=>{if(document.querySelector('script[src="'+u+'"]'))return ok();const e=document.createElement('script');e.src=u;e.onload=ok;e.onerror=()=>no(new Error((_t("تعذر تحميل المكتبة (تحقق من الإنترنت)"))));document.head.appendChild(e)});
async function makePdf(){
  await loadJS('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await loadJS('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const root=document.documentElement,oz=root.style.getPropertyValue('--z');
  root.style.setProperty('--z',1);document.body.classList.add('cap');window.scrollTo(0,0);
  const undo=[],h1=document.querySelector('.title h1'),old1=h1.innerHTML,st=$('st'),tx=document.createElement('div');
  const mixc=t=>[0x2b,0xb5,0xa6].map((a,i)=>Math.round(a+([0xe5,0x48,0x5f][i]-a)*t));
  h1.innerHTML=[...h1.textContent].map((ch,i,a)=>`<span style="color:rgb(${mixc(i/(a.length-1)).join(',')})">${ch}</span>`).join('');
  tx.style.cssText='font-weight:700;font-size:10pt;color:#23363a';tx.textContent=st.options[st.selectedIndex].text;st.style.display='none';st.after(tx);
  undo.push(()=>{h1.innerHTML=old1;tx.remove();st.style.display=''});
  try{
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const sh=activeSheet(),sr=sh.getBoundingClientRect(),ov=[],rc=el=>{const r=el.getBoundingClientRect();return{l:r.left-sr.left,t:r.top-sr.top,w:r.width,h:r.height}};
    const asc=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/İ/g,'I').replace(/\s+/g,' ').trim();
    sh.querySelectorAll('a[href]').forEach(a=>{const r=rc(a);if(r.h>0)ov.push(Object.assign({k:'link',url:a.href},r))});
    sh.querySelectorAll('#bank h4,#bank .acc,#bank .bcard b,#bank .bcard span').forEach(e=>{const t=asc(e.textContent),r=rc(e);if(t&&r.h>0&&/^[\x20-\x7E]+$/.test(t))ov.push(Object.assign({k:'txt',txt:t},r))});
    const cv=await html2canvas(activeSheet(),{scale:2,backgroundColor:'#ffffff',useCORS:true,scrollX:0,scrollY:0,windowWidth:1400});
    const fit=rfit(),land=fit?false:curLand(),W=fit?sr.width*25.4/96:land?297:210,H=fit?W*cv.height/cv.width:land?210:297,doc=new window.jspdf.jsPDF({unit:'mm',format:fit?[W,H]:'a4',orientation:land?'l':'p',compress:true}),hMM=W*cv.height/cv.width,img=c=>c.toDataURL('image/jpeg',.93);
    const place=(u,ox)=>ov.forEach(o=>{const x=ox+o.l*u,y=o.t*u,w=o.w*u,h=o.h*u;if(o.k==='link')doc.link(x,y,w,h,{url:o.url});else{doc.setFontSize(Math.max(4,h*2.835*.75));doc.text(o.txt,x,y+h*.78,{renderingMode:'invisible'})}});
    if(hMM<=H+.5){doc.addImage(img(cv),'JPEG',0,0,W,hMM);place(W/sr.width,0)}
    else if(H/hMM>=.72){const k=H/hMM,w=W*k;doc.addImage(img(cv),'JPEG',(W-w)/2,0,w,H);place(w/sr.width,(W-w)/2)}
    else{const ph=Math.floor(cv.width*H/W);for(let y=0,pg=0;y<cv.height;y+=ph,pg++){const c2=document.createElement('canvas');c2.width=cv.width;c2.height=Math.min(ph,cv.height-y);const g=c2.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c2.width,c2.height);g.drawImage(cv,0,y,cv.width,c2.height,0,0,cv.width,c2.height);if(pg)doc.addPage();doc.addImage(img(c2),'JPEG',0,0,W,W*c2.height/c2.width)}}
    return doc;
  }finally{undo.forEach(f=>f());document.body.classList.remove('cap');root.style.setProperty('--z',oz||1)}
}
let pendingPdf=null;
