/* ===== i18n: لغة الواجهة والتقارير والمخرجات (ar / en / tr) ===== */
let UIL='ar';try{const v=JSON.parse(localStorage.getItem('pst_ui'));if(v==='en'||v==='tr')UIL=v}catch(e){}
let CURL=UIL;
const I18=__DICT__;
const _AR=/[؀-ۿ]/,_RUN=/[ء-غف-ي٠-٩ٱ-ۓ][؀-ۿ A-Za-z0-9.,:;،؛؟!\-()«»\/·…+%&×]*/g;
function _trim(r){r=r.replace(/[ .,:;،؛\-\/·+&×%(«]+$/,'');while(r.endsWith(')')&&r.split(')').length>r.split('(').length)r=r.slice(0,-1).replace(/[ .,:;،؛\-\/·+&×%(«]+$/,'');return r}
function _t(s){if(CURL==='ar'||s==null||s==='')return s;s=String(s);const i=CURL==='en'?0:1,e=I18[s];if(e&&e[i])return e[i];if(!_AR.test(s))return s;
  return s.replace(_RUN,m=>{const r=_trim(m),x=I18[r];return x&&x[i]?x[i]+m.slice(r.length):m}).replace(/[،؛؟]/g,c=>I18[c][i])}
const _d=_t;
const docBase=()=>{const l=(typeof S==='object'&&S.lang)||UIL;return l==='en'?'en':l==='tr'?'tr':'ar'};
function withDoc(fn){return function(){const p=CURL;CURL=docBase();try{return fn.apply(this,arguments)}finally{CURL=p}}}
function i18nStatic(){if(UIL==='ar')return;
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode;if(!p||/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)||(p.closest&&p.closest('[data-noi18n]')))return NodeFilter.FILTER_REJECT;return _AR.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}}),L=[];
  while(w.nextNode())L.push(w.currentNode);L.forEach(n=>{n.nodeValue=_t(n.nodeValue)});
  document.querySelectorAll('[placeholder],[title],[aria-label],[alt],[data-l]').forEach(e=>{if(e.closest('[data-noi18n]'))return;['placeholder','title','aria-label','alt','data-l'].forEach(a=>{const v=e.getAttribute(a);if(v&&_AR.test(v))e.setAttribute(a,_t(v))})});
  document.title=_t(document.title)}
document.documentElement.lang=UIL;document.documentElement.dir=UIL==='ar'?'rtl':'ltr';
i18nStatic();
