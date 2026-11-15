import {validateDay} from './owner.mjs';
const rewardReject=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const rewardToday=()=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');};
const rewardAddDay=(day,n)=>new Date(new Date(day+'T12:00:00Z').getTime()+n*86400000).toISOString().slice(0,10);
const rewardDays=(start,end)=>{const days=[];for(let day=start;day<=end&&days.length<=31;day=rewardAddDay(day,1))days.push(day);return days;};
const rewardPeriod=(day,frequency,start)=>frequency==='Monthly'?start:frequency==='Weekly'?rewardAddDay(start,7*Math.floor((new Date(day+'T12:00:00Z')-new Date(start+'T12:00:00Z'))/(7*86400000))):day;
export function journalStreak(logs,today){const days=[...new Set(logs.filter(l=>l.kind==='Health journal'&&l.value==='Completed'&&l.day<=today).map(l=>l.day))].sort();let best=0,count=0,previous;for(const day of days){count=previous&&rewardAddDay(previous,1)===day?count+1:1;best=Math.max(best,count);previous=day;}let current=0,day=days.includes(today)?today:rewardAddDay(today,-1);while(days.includes(day)){current++;day=rewardAddDay(day,-1);}return {current,best};}
export function createEngagementService(db,options={}){
 const now=options.today||rewardToday;
 const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const first=async(sql,...args)=>db.prepare(sql).bind(...args).first();
 const ensure=async petId=>{const p=await first('SELECT * FROM pets WHERE id=?',petId);if(!p)rewardReject('Patient not found.',404);return p;};
 async function createChallenge(petId,input){
  await ensure(petId);if(!input||!['photo','plan'].includes(input.kind))rewardReject('Choose a photo task or plan milestone.');
  const startDay=validateDay(input.startDay),endDay=validateDay(input.endDay),days=rewardDays(startDay,endDay);
  if(startDay<now()||endDay<startDay||days.length>30)rewardReject('Choose a current or future challenge of 1–30 days.');
  if(typeof input.title!=='string'||!input.title.trim()||input.title.length>120||typeof input.instructions!=='string'||input.instructions.length>1000)rewardReject('Add a task title and keep instructions under 1,000 characters.');
  if(![5,10,15].includes(input.discount))rewardReject('Choose a 5%, 10% or 15% prototype coupon.');
  let planId=null,snapshot=null;
  if(input.kind==='plan'){const plan=await first("SELECT * FROM plans WHERE petId=? AND status='Published'",petId);if(!plan)rewardReject('Approve a care plan before adding its reward milestone.');const tasks=await all('SELECT * FROM plan_tasks WHERE planId=?',plan.id);if(!tasks.length)rewardReject('The plan has no tasks.');planId=plan.id;snapshot=JSON.stringify({goal:plan.goal,updatedAt:plan.updatedAt,tasks});}
  const id=crypto.randomUUID();await db.prepare('INSERT INTO reward_challenges VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,petId,input.kind,input.title.trim(),input.instructions.trim(),startDay,endDay,days.length,input.discount,planId,snapshot,'Dr. Avery Chen',new Date().toISOString()).run();return {id};
 }
 async function uploadPhoto(petId,challengeId,input){
  await ensure(petId);const c=await first("SELECT * FROM reward_challenges WHERE id=? AND petId=? AND kind='photo'",challengeId,petId);if(!c)rewardReject('Photo task not found.',404);
  const day=validateDay(input?.day);if(day!==now())rewardReject('Photo evidence must be uploaded for today.');if(day<c.startDay||day>c.endDay)rewardReject('This photo task is outside its scheduled dates.');
  if(typeof input.image!=='string'||input.image.length>40000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(input.image))rewardReject('Upload a smaller JPEG photo.');
  const id=`PHOTO-${challengeId}-${day}`;await db.prepare('INSERT INTO task_photos VALUES(?,?,?,?,?,?) ON CONFLICT(challengeId,day) DO UPDATE SET image=excluded.image,uploadedAt=excluded.uploadedAt').bind(id,challengeId,petId,day,input.image,new Date().toISOString()).run();return {id};
 }
 async function workspace(petId){
  await ensure(petId);const today=now();const [challenges,photos,coupons,logs,wearable,completions,body]=await Promise.all([
   all('SELECT * FROM reward_challenges WHERE petId=? ORDER BY createdAt DESC',petId),all('SELECT * FROM task_photos WHERE petId=? ORDER BY day DESC',petId),all('SELECT * FROM reward_coupons WHERE petId=? ORDER BY earnedAt DESC',petId),all('SELECT * FROM owner_logs WHERE petId=?',petId),all('SELECT * FROM wearable WHERE petId=?',petId),all('SELECT c.* FROM task_completions c JOIN plan_tasks t ON t.id=c.taskId JOIN plans p ON p.id=t.planId WHERE p.petId=?',petId),all('SELECT * FROM body_condition_timeline WHERE petId=?',petId)
  ]);
  // Archived evidence lets completed plan milestones survive a later plan edit.
  const versions=await all("SELECT payload FROM plan_versions WHERE petId=? AND kind='Archived' ORDER BY createdAt DESC",petId);const evidenceKeys=new Set(completions.map(c=>c.taskId+'|'+c.day));for(const v of versions){try{for(const c of JSON.parse(v.payload).completions||[]){const key=c.taskId+'|'+c.day;if(!evidenceKeys.has(key)){evidenceKeys.add(key);completions.push(c);}}}catch{}}
  const progress=challenges.map(c=>{const dates=rewardDays(c.startDay,c.endDay),dueDates=dates.filter(d=>d<=today);let steps=[];
   if(c.kind==='photo')steps=dates.map(day=>({label:c.title,period:day,completed:photos.some(p=>p.challengeId===c.id&&p.day===day&&p.day<=today)}));
   else{const tasks=JSON.parse(c.snapshot).tasks;for(const t of tasks){const periods=[...new Set(dates.map(day=>rewardPeriod(day,t.frequency,c.startDay)))];for(const period of periods){const inside=dueDates.filter(d=>rewardPeriod(d,t.frequency,c.startDay)===period);const completed=inside.some(day=>t.metric==='activeMinutes'?wearable.some(w=>w.day===day&&w.quality==='Complete'&&typeof w.activeMinutes==='number'&&w.activeMinutes>=t.target):t.metric==='weightKg'?body.some(b=>b.day===day&&b.origin===(t.source==='Clinic'?'Clinic':'Home')&&typeof b.weightKg==='number'):completions.some(x=>x.taskId===t.id&&x.day===day&&x.status==='Completed'&&x.value>=t.target));steps.push({label:t.label,period,completed});}}}
   const completed=steps.filter(s=>s.completed).length;return {...c,snapshot:c.snapshot?JSON.parse(c.snapshot):null,completed,total:steps.length,eligible:today>=c.endDay&&steps.length>0&&completed===steps.length,steps,photoDays:photos.filter(p=>p.challengeId===c.id).map(p=>p.day)};
  });
  return {today,journal:journalStreak(logs,today),challenges:progress,photos,coupons:coupons.map(c=>({...c,status:c.appliedAt?'Applied':c.expiresDay<today?'Expired':'Available'}))};
 }
 async function sync(petId){const d=await workspace(petId);const eligible=[...(d.journal.best>=10?[{id:'journal-10',title:'10-day journal streak',discount:5}]:[]),...d.challenges.filter(c=>c.eligible)];const statements=eligible.map(c=>db.prepare('INSERT OR IGNORE INTO reward_coupons VALUES(?,?,?,?,?,?,?,?,NULL,NULL)').bind(`REWARD-${petId}-${c.id}`,petId,c.id,c.title,c.discount,'CP-'+crypto.randomUUID().slice(0,8).toUpperCase(),new Date().toISOString(),rewardAddDay(now(),30)));if(statements.length)await db.batch(statements);return workspace(petId);}
 async function applyCoupon(petId,couponId,input){await ensure(petId);const c=await first('SELECT * FROM reward_coupons WHERE id=? AND petId=?',couponId,petId);if(!c)rewardReject('Coupon not found.',404);if(c.expiresDay<now())rewardReject('This coupon has expired.');if(!Array.isArray(input?.selection)||!input.selection.length||input.selection.length>10||input.selection.some(id=>!['syncapet','calm-o-care','feeder','litter','water','scale'].includes(id)))rewardReject('Choose products before applying a coupon.');if(c.appliedAt)return {id:c.id,status:'Applied'};const selection=JSON.stringify([...new Set(input.selection)].sort());if(await first('SELECT id FROM reward_coupons WHERE petId=? AND appliedAt IS NOT NULL AND selection=?',petId,selection))rewardReject('A coupon has already been applied to this selection.');await db.prepare('UPDATE reward_coupons SET appliedAt=?,selection=? WHERE id=? AND appliedAt IS NULL AND NOT EXISTS (SELECT 1 FROM reward_coupons used WHERE used.petId=? AND used.selection=? AND used.appliedAt IS NOT NULL)').bind(new Date().toISOString(),selection,couponId,petId,selection).run();if(!(await first('SELECT appliedAt FROM reward_coupons WHERE id=?',couponId)).appliedAt)rewardReject('A coupon has already been applied to this selection.');return {id:c.id,status:'Applied'};}
 return {workspace,sync,createChallenge,uploadPhoto,applyCoupon};
}
