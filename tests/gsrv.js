const fs=require('fs'),http=require('http');
const src=fs.readFileSync(''+__dirname+'/gstest.js','utf8');
// reuse mock section (everything before the first show( call)
const head=src.slice(0,src.indexOf("const call="));
eval(head);
http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');
  if(req.method==='OPTIONS'){res.end();return}
  const j=JSON.parse(b);let o;try{o=doPost({postData:{contents:b}})}catch(e){o={err:String(e)}}
  if(globalThis.__down){res.statusCode=500;res.end('down');return}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(o))})}).listen(8787,()=>console.log('up'));
