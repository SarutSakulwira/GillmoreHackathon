import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname, resolve, sep } from 'node:path';
import { createStore } from './store.mjs';
const base=fileURLToPath(new URL('../',import.meta.url));
const store=createStore(process.env.DATABASE_PATH||join(base,'data','carelink.sqlite'));
await store.seedSampleDay();
const port=Number(process.env.PORT||3001);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req) {
 let text='';for await(const chunk of req){text+=chunk;if(text.length>100000)throw Object.assign(new Error('Request too large.'),{status:413});}
 try{return JSON.parse(text||'{}');}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400});}
}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   // Local demonstration only. Prevent requests from unrelated browser origins.
   const origin=req.headers.origin;
   if(origin&&!new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`,'http://127.0.0.1:5173','http://localhost:5173']).has(origin))return json(res,403,{error:'Origin not allowed.'});
   const demoRoute=url.pathname.match(/^\/api\/demo\/([^/]+)$/);
   if(req.method==='POST'&&demoRoute)return json(res,200,await store.simulateCollar(demoRoute[1],await body(req)));
   const ownerRoute=url.pathname.match(/^\/api\/owner\/([^/]+)(?:\/(journal|body-check|tasks|consultations)(?:\/([^/]+))?)?$/);
   if(ownerRoute){const [,petId,section,taskId]=ownerRoute;
    if(req.method==='GET'&&!section)return json(res,200,await store.owner.workspace(petId));
    if(req.method==='POST'&&section==='consultations')return json(res,200,await store.owner.requestConsultation(petId,await body(req)));
    if(req.method==='POST'&&section==='journal')return json(res,200,await store.owner.saveJournal(petId,await body(req)));
    if(req.method==='POST'&&section==='body-check')return json(res,200,await store.owner.saveBodyCheck(petId,await body(req)));
    if(req.method==='PUT'&&section==='tasks'&&taskId)return json(res,200,await store.owner.completeTask(petId,taskId,await body(req)));
   }
   if(req.method==='GET'&&url.pathname==='/api/workspace')return json(res,200,store.workspace());
   if(req.method==='POST'&&url.pathname==='/api/results')return json(res,201,store.importResult(await body(req)));
   let match=url.pathname.match(/^\/api\/results\/([^/]+)\/(review|match)$/);
   if(req.method==='POST'&&match){const data=await body(req);if(match[2]==='review')store.review(match[1],data.note,data.shareWithOwner);else store.matchResult(match[1],data.petId);return json(res,200,{ok:true});}
   const ownerReview=url.pathname.match(/^\/api\/owner-updates\/([^/]+)\/review$/);if(req.method==='POST'&&ownerReview){store.reviewOwner(ownerReview[1]);return json(res,200,{ok:true});}
   match=url.pathname.match(/^\/api\/plans\/([^/]+)$/);
   if(req.method==='PUT'&&match){store.savePlan(match[1],await body(req));return json(res,200,{ok:true});}
   if(req.method==='POST'&&url.pathname==='/api/reset'){store.reset();return json(res,200,{ok:true});}
   return json(res,404,{error:'Endpoint not found.'});
  }
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed.'});
  const root=join(base,'dist');const path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(path!==root&&!path.startsWith(root+sep))return json(res,403,{error:'Invalid path.'});
  let content;let file=path;
  try{content=await readFile(file);}catch{file=join(root,'index.html');content=await readFile(file);}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8'};
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(content);
 }catch(e){json(res,e.status||500,{error:e.status?e.message:'Server error. Check the terminal.'});if(!e.status)console.error(e);}
});
server.listen(port,'127.0.0.1',()=>console.log(`Checkapet API and production preview: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
