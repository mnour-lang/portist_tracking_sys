const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
const js=fs.readFileSync(process.argv[2]||'app.js','utf8');
const AR=/[؀-ۿ]/;
const RUN=/[؀-ۿ][؀-ۿ A-Za-z0-9.,:;،؛؟!\-()«»\/·…+%&×]*/g;
const DOCFN=new Set(['shOpsReport0','shStatusSheet','shReceipt','sDraw','ledgerOf','rcCopy','docName','shProfMini','w3','wl']);
const SKIPVAR=new Set(['U0','T0','H0','sc','COSTT','sw','DEF','CN','SHST','SHM']);
const SKIPFN=new Set(['wordsAr','logAct']);
const SKIPCALL=new Set(['L','Lt','nk','cKey','logAct','RegExp','sub']);
const SKIPMEM=new Set(['includes','indexOf','startsWith','endsWith','test','split','replace','match','localeCompare']);
function runs(t){const o=[];let m;RUN.lastIndex=0;while((m=RUN.exec(t))){let r=m[0],end=m.index+r.length;let tr=r.replace(/[ .,:;،؛\-\/·+&×%(«]+$/,'');while(/[)]$/.test(tr)&&(tr.match(/\)/g)||[]).length>(tr.match(/\(/g)||[]).length)tr=tr.slice(0,-1).replace(/[ .,:;،؛\-\/·+&×%(«]+$/,'');if(!AR.test(tr))continue;end=m.index+tr.length;o.push([m.index,end,tr])}const PU=/[،؛؟]/g;let q;while((q=PU.exec(t))){if(!o.some(r=>q.index>=r[0]&&q.index<r[1]))o.push([q.index,q.index+1,q[0]])}o.sort((a,b)=>a[0]-b[0]);return o}
const keys=new Map();const add=(k,w)=>{if(!keys.has(k))keys.set(k,new Set());keys.get(k).add(w)};
const ast=acorn.parse(js,{ecmaVersion:2022});const edits=[];const skipped=[];
function ctx(anc){const fn=anc.slice().reverse().find(a=>a.type==='FunctionDeclaration');return fn?fn.id.name:'(top)'}
function shouldSkip(n,anc){
  const p=anc[anc.length-2];
  if(p&&p.type==='BinaryExpression'&&/==/.test(p.operator))return 'cmp';
  if(p&&p.type==='SwitchCase'&&p.test===n)return 'case';
  if(p&&p.type==='Property'&&p.key===n&&!p.computed)return 'key';
  for(let i=anc.length-2;i>=0;i--){const a=anc[i];
    if(a.type==='VariableDeclarator'&&a.id.type==='Identifier'&&SKIPVAR.has(a.id.name))return 'var:'+a.id.name;
    if(a.type==='FunctionDeclaration'&&SKIPFN.has(a.id.name))return 'fn:'+a.id.name;
    if(a.type==='CallExpression'){const c=a.callee;if(c.type==='Identifier'&&SKIPCALL.has(c.name))return 'call:'+c.name;if(c.type==='MemberExpression'&&c.property.type==='Identifier'&&SKIPMEM.has(c.property.name)&&a.arguments.includes(anc[i+1]))return 'mem:'+c.property.name}
    if(a.type==='ArrayExpression'){const st=a.elements.filter(e=>e&&e.type==='Literal'&&typeof e.value==='string');
      if(st.length>=2&&AR.test(st[0].value)&&st.slice(1).some(e=>/^[A-Za-zÇĞİÖŞÜçğıöşü0-9 /.\-()]+$/.test(e.value)&&e.value))return 'trilingual'}
  }
  return null}
walk.simple(ast,{FunctionDeclaration(n){if(DOCFN.has(n.id.name)){if(n.async)console.log('ASYNC DOC FN',n.id.name);edits.push([n.end,n.end,'\n'+n.id.name+'=withDoc('+n.id.name+');'])}}});
walk.fullAncestor(ast,(n,_,anc)=>{
  const fnName=ctx(anc),W='_t';
  if(n.type==='Literal'&&typeof n.value==='string'&&AR.test(n.value)){
    const rs=runs(n.value);rs.forEach(r=>add(r[2],fnName));
    const why=shouldSkip(n,anc);if(why){skipped.push([why,n.value.slice(0,50)]);return}
    let out=[],pos=0;rs.forEach(([a,b,t])=>{if(a>pos)out.push(JSON.stringify(n.value.slice(pos,a)));out.push(W+'('+JSON.stringify(t)+')');pos=b});
    if(pos<n.value.length)out.push(JSON.stringify(n.value.slice(pos)));
    edits.push([n.start,n.end,'('+out.join('+')+')']);
  }
  if(n.type==='TemplateElement'&&AR.test(n.value.cooked)){
    const raw=js.slice(n.start,n.end);const rs=runs(raw);rs.forEach(r=>add(r[2],fnName));
    const tpl=anc[anc.length-2];
    const why=shouldSkip(tpl,anc.slice(0,-1));if(why){skipped.push([why,raw.slice(0,50)]);return}
    let out='',pos=0;rs.forEach(([a,b,t])=>{out+=raw.slice(pos,a)+'${'+W+'('+JSON.stringify(t)+')}';pos=b});out+=raw.slice(pos);
    edits.push([n.start,n.end,out]);
  }
});
edits.sort((a,b)=>b[0]-a[0]);let res=js;edits.forEach(([a,b,t])=>{res=res.slice(0,a)+t+res.slice(b)});
fs.writeFileSync('app2.js',res);
fs.writeFileSync('keys.json',JSON.stringify([...keys.keys()],null,0));
console.log('keys',keys.size,'edits',edits.length,'skipped',skipped.length);
const c={};skipped.forEach(s=>c[s[0]]=(c[s[0]]||0)+1);console.log(c);
fs.writeFileSync('skipped.txt',skipped.map(s=>s.join(' | ')).join('\n'));
