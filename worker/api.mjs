import {seedMiloSkinPlan} from '../server/milo-plan.mjs';
import {createEngagementService} from '../server/engagement.mjs';
import {simulateCollar} from '../server/demo.mjs';
import {createOwnerService} from '../server/owner.mjs';
import {seedSampleDay} from '../server/sample-day.mjs';
const mapping={challenges:'reward_challenges',taskPhotos:'task_photos',coupons:'reward_coupons',consultations:'consultation_requests',planVersions:'plan_versions',recordReviews:'record_reviews',pets:'pets',results:'results',wearable:'wearable',ownerLogs:'owner_logs',plans:'plans',programmes:'programmes',encounters:'encounters',medications:'medications',vaccinations:'vaccinations',allergies:'allergies',bodyAssessments:'body_assessments',files:'diagnostic_files',devices:'devices',planTasks:'plan_tasks',taskCompletions:'task_completions'};
const views={patientSummary:'patient_summary',bodyConditionTimeline:'body_condition_timeline',dailyHomeData:'daily_home_data',carePlanProgress:'care_plan_progress'};
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const id=()=>crypto.randomUUID();
export function createApi(seed){
 let initialized;
 async function initialize(db){
  if(!initialized)initialized=(async()=>{
   if(!await db.prepare("SELECT id FROM hosted_seed WHERE id='cohort-v1'").first()){
   const statements=[];
   for(const [table,rows] of Object.entries(seed))for(const row of rows){const columns=Object.keys(row);statements.push(db.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).bind(...Object.values(row)));}
   statements.push(db.prepare("INSERT OR IGNORE INTO hosted_seed VALUES ('cohort-v1')"));await db.batch(statements);
   }
   await seedSampleDay(db);
   await seedMiloSkinPlan(db);
  })().catch(e=>{initialized=undefined;throw e;});
  await initialized;
 }
 async function workspace(db){const entries=[...Object.entries(mapping),...Object.entries(views)];const output=await db.batch(entries.map(([,t])=>db.prepare(`SELECT * FROM ${t}`)));const result={dashboardViews:{}};entries.forEach(([key],i)=>{if(key in views)result.dashboardViews[key]=output[i].results;else result[key]=output[i].results;});result.challenges=result.challenges.map(c=>({...c,snapshot:c.snapshot?JSON.parse(c.snapshot):null}));result.planVersions=result.planVersions.map(v=>({...v,payload:JSON.parse(v.payload)}));result.plans=result.plans.map(p=>({...p,tasks:JSON.parse(p.tasks)}));return result;}
 return async function handle(request,env){
  try{
   const url=new URL(request.url),path=url.pathname,db=env.DB;if(!db)return json({error:'Database is not configured.'},503);
   if(request.method!=='GET'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Origin not allowed.'},403);
   await initialize(db);
   const engagementRoute=path.match(/^\/api\/owner\/([^/]+)\/(rewards|photos|coupons)(?:\/([^/]+))?$/);
   const challengeRoute=path.match(/^\/api\/patients\/([^/]+)\/challenges$/);
   if(engagementRoute&&request.method==='GET'&&engagementRoute[2]==='rewards')return json(await createEngagementService(db).workspace(engagementRoute[1]));
   const ownerRoute=path.match(/^\/api\/owner\/([^/]+)(?:\/(journal|body-check|tasks|consultations)(?:\/([^/]+))?)?$/);
   if(request.method==='GET'&&ownerRoute&&!ownerRoute[2])return json(await createOwnerService(db).workspace(ownerRoute[1]));
   if(request.method==='GET'&&path==='/api/workspace')return json(await workspace(db));
   if(request.method==='GET'&&path==='/api/health')return json({ok:true,storage:'D1'});
   if(request.method==='GET')return json({error:'Endpoint not found.'},404);
   let text=await request.text();if(text.length>100000)fail('Request too large.',413);let input;try{input=JSON.parse(text||'{}');}catch{fail('Invalid JSON.');}if(!input||typeof input!=='object')fail('An object is required.');
   const demoRoute=path.match(/^\/api\/demo\/([^/]+)$/);
   if(request.method==='POST'&&demoRoute)return json(await simulateCollar(db,demoRoute[1],input));
   if(request.method==='POST'&&engagementRoute){const [,petId,section,key]=engagementRoute,service=createEngagementService(db);if(section==='rewards')return json(await service.sync(petId));if(section==='photos')return json(await service.uploadPhoto(petId,key,input));if(section==='coupons')return json(await service.applyCoupon(petId,key,input));}
   if(request.method==='POST'&&challengeRoute)return json(await createEngagementService(db).createChallenge(challengeRoute[1],input),201);
   if(ownerRoute){const service=createOwnerService(db),[,petId,section,taskId]=ownerRoute;
    if(request.method==='POST'&&section==='consultations')return json(await service.requestConsultation(petId,input));
    if(request.method==='POST'&&section==='journal')return json(await service.saveJournal(petId,input));
    if(request.method==='POST'&&section==='body-check')return json(await service.saveBodyCheck(petId,input));
    if(request.method==='PUT'&&section==='tasks'&&taskId)return json(await service.completeTask(petId,taskId,input));
   }
   if(request.method==='POST'&&path==='/api/results'){
    for(const key of ['externalPatientId','type','label','source','observedAt'])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>250)fail(`${key} is required (maximum 250 characters).`);
    if(!Number.isFinite(Date.parse(input.observedAt)))fail('Use a valid observation date.');
    const {value=null,low=null,high=null,unit='',note='Result received for review.'}=input;
    for(const v of [value,low,high])if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)))fail('Numeric results must be finite numbers or null.');
    if((low===null)!==(high===null)||(low!==null&&low>=high))fail('Provide both range limits, with lower less than upper.');
    if(typeof unit!=='string'||unit.length>40||value!==null&&!unit.trim())fail('A unit is required for numeric results.');
    if(typeof note!=='string'||note.length>2000)fail('Note must be text (maximum 2000 characters).');
    const pet=await db.prepare('SELECT id FROM pets WHERE id=?').bind(input.externalPatientId).first(),key=id(),status=pet?'Pending review':'Needs matching';
    await db.prepare('INSERT INTO results(id,petId,externalPatientId,type,label,value,unit,low,high,source,observedAt,receivedAt,status,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(key,pet?.id??null,input.externalPatientId,input.type,input.label,value,unit,low,high,input.source,new Date(input.observedAt).toISOString(),new Date().toISOString(),status,note).run();return json({id:key,status},201);
   }
   let match=path.match(/^\/api\/results\/([^/]+)\/(review|match)$/);
   if(request.method==='POST'&&match){const result=await db.prepare('SELECT * FROM results WHERE id=?').bind(match[1]).first();if(!result)fail('Result not found.',404);
    if(match[2]==='review'){if(!result.petId)fail('Match the result to a patient before review.');if(typeof input.note!=='string'||!input.note.trim()||input.note.length>2000)fail('Add a review note (maximum 2000 characters).');if(input.shareWithOwner!==undefined&&typeof input.shareWithOwner!=='boolean')fail('Choose whether to share this result.');await db.prepare('INSERT OR REPLACE INTO record_reviews VALUES(?,?,?,?,?)').bind(result.id,result.petId,input.shareWithOwner===false?'Clinic only':'Shared result','Dr. Avery Chen',new Date().toISOString()).run();await db.prepare("UPDATE results SET status='Reviewed',reviewedBy=?,reviewedAt=?,reviewNote=? WHERE id=?").bind('Dr. Avery Chen',new Date().toISOString(),input.note,result.id).run();}
    else {if(result.status!=='Needs matching')fail('Only unmatched results can be assigned.');if(!await db.prepare('SELECT id FROM pets WHERE id=?').bind(input.petId??null).first())fail('Choose a valid patient.');await db.prepare("UPDATE results SET petId=?,status='Pending review' WHERE id=?").bind(input.petId,result.id).run();}
    return json({ok:true});
   }
   const ownerReview=path.match(/^\/api\/owner-updates\/([^/]+)\/review$/);if(request.method==='POST'&&ownerReview){const row=await db.prepare('SELECT * FROM owner_logs WHERE id=?').bind(ownerReview[1]).first();if(!row)fail('Owner update not found.',404);await db.prepare('INSERT OR REPLACE INTO record_reviews VALUES(?,?,?,?,?)').bind(row.id,row.petId,'Owner update','Dr. Avery Chen',new Date().toISOString()).run();return json({ok:true});}
   match=path.match(/^\/api\/plans\/([^/]+)$/);
   if(request.method==='PUT'&&match){
    const petId=match[1],plan=await db.prepare('SELECT * FROM plans WHERE petId=?').bind(petId).first();if(!plan)fail('Plan not found.',404);
    if(typeof input.goal!=='string'||!input.goal.trim()||input.goal.length>500)fail('Add a goal (maximum 500 characters).');
    if(!Array.isArray(input.tasks)||!input.tasks.length||input.tasks.length>10||input.tasks.some(t=>typeof t!=='string'||!t.trim()||t.length>500))fail('Add between 1 and 10 tasks.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.reviewDate)||!Number.isFinite(Date.parse(input.reviewDate)))fail('Choose a review date.');if(!['Draft','Published'].includes(input.status))fail('Invalid plan status.');
    const old=(await db.prepare('SELECT * FROM plan_tasks WHERE planId=?').bind(plan.id).all()).results,ts=input.structuredTasks;
    if(ts!==undefined){if(!Array.isArray(ts)||ts.length<1||ts.length>10)fail('Add 1–10 tasks.');for(const t of ts)if(!t||typeof t.label!=='string'||!t.label.trim()||t.label.length>500||!['activeMinutes','ownerCheckin','weightKg'].includes(t.metric)||!['Daily','Weekly','Monthly'].includes(t.frequency)||!['Wearable','Owner','Clinic'].includes(t.source)||(t.target!==null&&(!Number.isFinite(t.target)||t.target<=0)))fail('Check task labels, targets and sources.');if(input.status==='Published'&&ts.some(t=>t.metric!=='weightKg'&&t.target===null))fail('Set activity and check-in targets before approval.');const ids=ts.filter(t=>t.id).map(t=>t.id);if(new Set(ids).size!==ids.length)fail('Duplicate task IDs.');if(ids.some(key=>!old.some(t=>t.id===key)))fail('Task does not belong to this plan.');}
    const now=new Date().toISOString();
    const pet=await db.prepare('SELECT * FROM pets WHERE id=?').bind(petId).first();
    if(ts)for(const t of ts)if(t.metric==='activeMinutes'&&(pet.species!=='Dog'||t.source!=='Wearable')||t.metric==='weightKg'&&t.source==='Wearable'||t.metric==='ownerCheckin'&&t.source!=='Owner')fail('Choose a supported source for this measure.');
    if(input.status==='Draft'&&plan.status==='Published'){await db.batch([db.prepare("DELETE FROM plan_versions WHERE petId=? AND kind='Draft'").bind(petId),db.prepare('INSERT INTO plan_versions VALUES(?,?,?,?,?)').bind(id(),petId,'Draft',JSON.stringify(input),now)]);return json({ok:true});}
    const completions=(await db.prepare('SELECT c.* FROM task_completions c JOIN plan_tasks t ON t.id=c.taskId WHERE t.planId=?').bind(plan.id).all()).results;
    const statements=[db.prepare('INSERT INTO plan_versions VALUES(?,?,?,?,?)').bind(id(),petId,'Archived',JSON.stringify({...plan,structuredTasks:old,completions}),now),db.prepare("DELETE FROM plan_versions WHERE petId=? AND kind='Draft'").bind(petId),db.prepare('UPDATE plans SET goal=?,tasks=?,reviewDate=?,status=?,updatedAt=?,updatedBy=? WHERE petId=?').bind(input.goal,JSON.stringify(input.tasks),input.reviewDate,input.status,new Date().toISOString(),'Dr. Avery Chen',petId)];
    if(ts){for(const t of old){const next=ts.find(n=>n.id===t.id);if(!next||next.metric!==t.metric||next.source!==t.source)statements.push(db.prepare('DELETE FROM task_completions WHERE taskId=?').bind(t.id));if(!next)statements.push(db.prepare('DELETE FROM plan_tasks WHERE id=?').bind(t.id));}for(const t of ts)statements.push(db.prepare('INSERT INTO plan_tasks(id,planId,label,metric,target,unit,frequency,source) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,metric=excluded.metric,target=excluded.target,unit=excluded.unit,frequency=excluded.frequency,source=excluded.source').bind(t.id||id(),plan.id,t.label,t.metric,t.target,t.metric==='activeMinutes'?'min':t.metric==='weightKg'?'kg':'entry',t.frequency,t.source));}
    await db.batch(statements);return json({ok:true});
   }
   return json({error:'Endpoint not found.'},404);
  }catch(e){if(!e.status)console.error('API failure',e.message);return json({error:e.status?e.message:'Unable to complete the request. Please try again.'},e.status||500);}
 };
}
