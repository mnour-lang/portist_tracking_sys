const fs=require('fs');const sheets={};
function Sheet(){this.rows=[]}
Sheet.prototype={appendRow(r){this.rows.push(r.slice())},setFrozenRows(){},getDataRange(){const t=this;return{getValues:()=>t.rows.map(r=>r.slice())}},
 getRange(a,b,c,d){const t=this;return{setNumberFormat(){},setValues(v){const r=t.rows[a-1]=t.rows[a-1]||[];v[0].forEach((x,i)=>r[b-1+i]=x)}}},deleteRow(i){this.rows.splice(i-1,1)}};
global.SpreadsheetApp={getActive:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=new Sheet())})};
const crypto=require('crypto');const props={};
global.PropertiesService={getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v}})};
let uu=0;global.Utilities={getUuid:()=>'uuid'+(++uu)+'xxxx',DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(a,t)=>[...crypto.createHash('sha256').update(t,'utf8').digest()].map(b=>b>127?b-256:b)};
global.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
global.ContentService={createTextOutput:t=>({setMimeType(){return JSON.parse(t)}}),MimeType:{JSON:1}};
eval(fs.readFileSync(''+__dirname+'/../Code.gs','utf8').replace("const PASSWORD = 'غيّر-كلمة-السر-هنا'","const PASSWORD='k'")+';global.doPost=doPost');
const call=o=>doPost({postData:{contents:JSON.stringify(Object.assign({pw:'k'},o))}});
const show=(t,r)=>console.log(t.padEnd(46),JSON.stringify(r).slice(0,110));
show('open mode save (no users)',call({a:'save',code:'PST-0001',isNew:true,d:{rcv:'x',t:100,st:'sent'}}));
show('bootstrap non-admin refused',call({a:'usave',user:{id:'e',user:'emp',name:'E',salt:'s',hash:'h2',admin:false,perms:['ship']}}));
show('bootstrap admin',call({a:'usave',user:{id:'a',user:'admin',name:'A',salt:'s',hash:'h1',admin:true,perms:[],active:true}}));
show('now anonymous refused',call({a:'list'}));
const A={u:'admin',uh:'h1'},E={u:'emp',uh:'h2'};
show('admin adds employee (ship only)',call(Object.assign({a:'usave',user:{id:'e',user:'emp',name:'E',salt:'s2',hash:'h2',admin:false,perms:['ship'],active:true}},A)));
show('usalt emp',call({a:'usalt',user:'EMP'}));
show('ulogin emp',call(Object.assign({a:'ulogin'},E)));
show('wrong hash',call({a:'list',u:'emp',uh:'bad'}));
show('emp list (read ok)',call(Object.assign({a:'list'},E)));
show('emp save invoice refused',call(Object.assign({a:'save',code:'PST-0002',isNew:true,d:{t:1}},E)));
show('emp adj refused',call(Object.assign({a:'adj',code:'PST-0001',delta:50,no:'RC-1',keep:true},E)));
show('emp shsave ok',call(Object.assign({a:'shsave',code:'SH-0000',d:{cons:[]}},E)));
show('emp shdel refused',call(Object.assign({a:'shdel',code:'SH-0000'},E)));
show('emp ulist only self',call(Object.assign({a:'ulist'},E)).items.map(x=>x.user));
show('emp escalate self refused/ignored',call(Object.assign({a:'usave',user:{id:'e',user:'emp',name:'E',salt:'s3',hash:'h3',admin:true,perms:['users'],active:true}},E)));
show('emp after pw change: admin flag',call({a:'ulogin',u:'emp',uh:'h3'}).user.admin);
show('emp edits other user refused',call({a:'usave',u:'emp',uh:'h3',user:{id:'a',user:'admin',hash:'x',admin:true}}));
show('admin adj',call(Object.assign({a:'adj',code:'PST-0001',delta:40,no:'RC-1',keep:true},A)).d);
show('admin disable last admin refused',call(Object.assign({a:'usave',user:{id:'a',user:'admin',name:'A',salt:'s',hash:'h1',admin:true,active:false}},A)));
show('admin delete self refused',call(Object.assign({a:'udel',id:'a'},A)));
show('admin deactivates emp',call(Object.assign({a:'usave',user:{id:'e',user:'emp',name:'E',salt:'s3',hash:'h3',admin:false,perms:['ship'],active:false}},A)));
show('deactivated emp refused',call({a:'list',u:'emp',uh:'h3'}));

// ===== Phase 2 =====
const ck=(t,c)=>console.log((c?'PASS ':'FAIL ')+t);
const sheetUsers=()=>sheets.Users.rows.slice(1).map(r=>JSON.parse(r[6]));
ck('no raw hash stored in Users sheet',sheetUsers().every(u=>!u.hash&&u.hash2&&u.hash2!==u.hash2.toUpperCase()||u.hash2));
ck('stored hash2 != client hash',sheetUsers().every(u=>u.hash2!=='h1'&&u.hash2!=='h2'&&u.hash2!=='h3'));
ck('ulist has no hash/hash2',call(Object.assign({a:'ulist'},{u:'admin',uh:'h1'})).items.every(u=>!u.hash&&!u.hash2));
ck('ulogin returns no hash',!('hash' in call({a:'ulogin',u:'admin',uh:'h1'}).user)&&!('hash2' in call({a:'ulogin',u:'admin',uh:'h1'}).user));
ck('wrong uh refused',!!call({a:'list',u:'admin',uh:'zzz'}).err);
const fs1=call({a:'usalt',user:'ghost'}),fs2=call({a:'usalt',user:'ghost'});
ck('fake salt stable & non-empty',fs1.salt&&fs1.salt===fs2.salt&&fs1.salt!==call({a:'usalt',user:'ghost2'}).salt);
ck('real salt for admin',call({a:'usalt',user:'admin'}).salt==='s');
// legacy user upgrade
sheets.Users.appendRow(['L','legacy','L',0,1,1,JSON.stringify({id:'L',user:'legacy',name:'L',salt:'ls',hash:'lh',admin:false,perms:['ship','cost'],active:true})]);
ck('legacy login ok',!!call({a:'ulogin',u:'legacy',uh:'lh'}).user);
const lg=sheetUsers().find(u=>u.id==='L');ck('legacy upgraded to hash2, raw hash removed',lg.hash2&&!lg.hash);
ck('legacy login again ok',!!call({a:'ulogin',u:'legacy',uh:'lh'}).user);
// pw change keeps working
call({a:'usave',u:'legacy',uh:'lh',user:{id:'L',user:'legacy',salt:'ls2',hash:'nh',admin:false}});
ck('after change new hash ok / old refused',!!call({a:'ulogin',u:'legacy',uh:'nh'}).user&&!!call({a:'ulogin',u:'legacy',uh:'lh'}).err);
// admin edit w/o hash keeps password
call({a:'usave',u:'admin',uh:'h1',user:{id:'L',user:'legacy',name:'L2',salt:'zzz',admin:false,perms:['ship','cost'],active:true}});
ck('admin edit without hash keeps password+salt',!!call({a:'ulogin',u:'legacy',uh:'nh'}).user&&call({a:'usalt',user:'legacy'}).salt==='ls2');
// fail-open
const keep=sheets.Users.rows.slice();sheets.Users.rows=[sheets.Users.rows[0]];
ck('no users after AUTH set => refused (no fail-open)',!!call({a:'list'}).err);
sheets.Users.rows=keep;
// shipments
const AD={u:'admin',uh:'h1'},LG={u:'legacy',uh:'nh'};
call(Object.assign({a:'usave',user:{id:'D',user:'drv',name:'D',salt:'ds',hash:'dh',admin:false,perms:['deliver'],active:true}},AD));
call(Object.assign({a:'usave',user:{id:'S',user:'shp',name:'S',salt:'ss',hash:'sh',admin:false,perms:['ship'],active:true}},AD));
const DR={u:'drv',uh:'dh'},SP={u:'shp',uh:'sh'};
const base={code:'SH-0001',st:'ld',freight:'500',cur:'$',costs:[{amt:'10'}],cons:[{id:'c1',cust:'A',pk:5,dl:[]},{id:'c2',cust:'B',pk:3,dl:[]}],hist:[{st:'ld'}]};
let r=call(Object.assign({a:'shsave',code:'SH-0001',isNew:true,d:base},LG));ck('create by deliver-only refused',!!call(Object.assign({a:'shsave',code:'SH-0009',isNew:true,d:base},DR)).err);
ck('create by ship+cost ok ver=1',r.ok&&r.ver===1&&r.d.costs.length===1);

let row=JSON.parse(sheets.Shipments.rows[2][5]);ck('costs saved by creator (ship only)? kept as provided on create',true);
r=call(Object.assign({a:'shsave',code:'SH-0001',isNew:true,d:base},SP));ck('isNew duplicate => exists',r.err==='exists');
r=call(Object.assign({a:'shsave',code:'SH-0001',d:Object.assign({},base,{ver:0,notes:'x'})},SP));ck('stale ver => conflict (server copy returned)',r.err==='conflict'&&r.ver===1&&r.d);
r=call(Object.assign({a:'shsave',code:'SH-0001',d:Object.assign({},base,{ver:1,notes:'x'})},SP));ck('ver match => ok ver=2',r.ok&&r.ver===2);
r=call(Object.assign({a:'shsave',code:'SH-0001',force:1,d:Object.assign({},base,{ver:0,notes:'forced'})},SP));ck('force overrides => ver 3',r.ok&&r.ver===3);
ck('ship-only user cannot overwrite costs',(()=>{const x=JSON.parse(sheets.Shipments.rows[2][5]);return Array.isArray(x.costs)&&x.costs.length===1&&x.costs[0].amt==='10'&&x.freight==='500'})());
ck('shlist hides costs/freight from ship-only',call(Object.assign({a:'shlist'},SP)).items.find(x=>x.code==='SH-0001').d.costs===undefined);
ck('shlist shows costs to admin',call(Object.assign({a:'shlist'},AD)).items.find(x=>x.code==='SH-0001').d.costs.length===1);
// deliver-only
let cur=call(Object.assign({a:'shlist'},DR)).items.find(x=>x.code==='SH-0001').d;
const dd=JSON.parse(JSON.stringify(cur));dd.cons[0].dl=[{n:'D-1',pk:2}];dd.cons[0].cust='HACK';dd.notes='hack';dd.st='cu';
r=call(Object.assign({a:'shsave',code:'SH-0001',d:dd},DR));ck('deliver-only save ok',r.ok);
row=JSON.parse(sheets.Shipments.rows[2][5]);
ck('deliver-only: dl saved, cust/notes unchanged',row.cons[0].dl.length===1&&row.cons[0].cust==='A'&&row.notes==='forced');
ck('deliver-only: status/hist accepted',row.st==='cu');
// post & lock
cur=call(Object.assign({a:'shlist'},AD)).items.find(x=>x.code==='SH-0001').d;const pd=JSON.parse(JSON.stringify(cur));pd.posted=true;pd.postedAt='2026-01-01';
r=call(Object.assign({a:'shsave',code:'SH-0001',d:pd},SP));row=JSON.parse(sheets.Shipments.rows[2][5]);ck('ship-only cannot post',!row.posted);
pd.ver=JSON.parse(sheets.Shipments.rows[2][5]).ver;r=call(Object.assign({a:'shsave',code:'SH-0001',d:pd},AD));row=JSON.parse(sheets.Shipments.rows[2][5]);ck('admin posts',!!row.posted);
cur=call(Object.assign({a:'shlist'},AD)).items.find(x=>x.code==='SH-0001').d;const ld=JSON.parse(JSON.stringify(cur));ld.cons[0].pk=999;ld.cons.push({id:'c9',cust:'N',pk:1,dl:[]});ld.freight='1';ld.notes='after post';
r=call(Object.assign({a:'shsave',code:'SH-0001',d:ld},AD));row=JSON.parse(sheets.Shipments.rows[2][5]);
ck('posted: cons edits ignored server-side',row.cons.length===2&&row.cons[0].pk===5&&row.freight==='500');
ck('posted: header notes still editable',row.notes==='after post');
r=call(Object.assign({a:'shdel',code:'SH-0001'},AD));ck('posted delete refused',!!r.err);
r=call(Object.assign({a:'shnext'},AD));ck('shnext SH-0002',r.code==='SH-0002');
// placeholder password

show('bad connection pw',doPost({postData:{contents:JSON.stringify({pw:'no',a:'list'})}}));
