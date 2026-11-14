// Shared by the SQLite preview and D1 Worker. Each response is scoped to one pet.
const reject=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export function validateDay(day){if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)reject('Choose a valid date.');return day;}
export function readJournal(row){if(row?.kind!=='Health journal')return null;try{return JSON.parse(row.note);}catch{return null;}}
export function createOwnerService(db){
 const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const first=async(sql,...args)=>db.prepare(sql).bind(...args).first();
 const patient=async petId=>{const pet=await first('SELECT * FROM pets WHERE id=?',petId);if(!pet)reject('Patient not found.',404);return pet;};
 async function workspace(petId){
  const pet=await patient(petId),plan=await first("SELECT * FROM plans WHERE petId=? AND status='Published'",petId);
  const [wearable,ownerLogs,bodyAssessments,results,devices]=await Promise.all([
   all('SELECT * FROM wearable WHERE petId=? ORDER BY day,id',petId),all('SELECT * FROM owner_logs WHERE petId=? ORDER BY day DESC',petId),all('SELECT * FROM body_condition_timeline WHERE petId=? ORDER BY day,id',petId),
   all("SELECT id,petId,type,label,value,unit,observedAt,source,reviewedBy,reviewedAt FROM results WHERE petId=? AND status='Reviewed' ORDER BY observedAt DESC",petId),all('SELECT * FROM devices WHERE petId=?',petId)
  ]);
  const planTasks=plan?await all('SELECT * FROM plan_tasks WHERE planId=?',plan.id):[];
  const taskCompletions=plan?await all('SELECT c.* FROM task_completions c JOIN plan_tasks t ON t.id=c.taskId WHERE t.planId=? ORDER BY c.day',plan.id):[];
  return {pet,plan:plan?{...plan,tasks:JSON.parse(plan.tasks)}:null,planTasks,taskCompletions,wearable,ownerLogs:ownerLogs.map(l=>({...l,journal:readJournal(l)})),bodyAssessments,results,devices};
 }
 async function saveJournal(petId,input){
  await patient(petId);if(!input||typeof input!=='object')reject('A journal entry is required.');const day=validateDay(input.day);
  const fields={appetite:['Usual','Less','More'],comfort:['Comfortable','Stiff','Other change'],drinking:['Usual','More','Less'],toileting:['Usual','Changed']};
  for(const [key,options] of Object.entries(fields))if(!options.includes(input[key]))reject('Complete each journal question.');
  if(typeof input.note!=='string'||input.note.length>2000)reject('Keep notes under 2,000 characters.');
  const id=`JOURNAL-${petId}-${day}`,payload=JSON.stringify(Object.fromEntries([...Object.keys(fields),'note'].map(k=>[k,input[k]])));
  await db.prepare("INSERT INTO owner_logs(id,petId,day,kind,value,note) VALUES(?,?,?,'Health journal','Completed',?) ON CONFLICT(id) DO UPDATE SET note=excluded.note").bind(id,petId,day,payload).run();return {id};
 }
 async function completeTask(petId,taskId,input){
  await patient(petId);if(!input||typeof input!=='object')reject('A completion update is required.');const day=validateDay(input.day);
  if(typeof input.completed!=='boolean')reject('Choose a completion status.');
  const task=await first("SELECT t.* FROM plan_tasks t JOIN plans p ON p.id=t.planId WHERE t.id=? AND p.petId=? AND p.status='Published'",taskId,petId);
  if(!task)reject('This task is not in an approved plan.',404);
  if(task.source!=='Owner'||task.metric!=='ownerCheckin')reject('This reading is recorded by your collar or clinic.');
  const key=`OWNER-${taskId}-${day}`;
  await db.batch([
   db.prepare("DELETE FROM task_completions WHERE taskId=? AND day=? AND source='Owner'").bind(taskId,day),
   db.prepare('INSERT INTO task_completions(id,taskId,day,value,status,source) VALUES(?,?,?,?,?,?)').bind(key,taskId,day,input.completed?(task.target??1):0,input.completed?'Completed':'Below target','Owner')
  ]);return {id:key};
 }
 async function saveBodyCheck(petId,input){
  await patient(petId);if(!input||typeof input!=='object')reject('A body check is required.');const day=validateDay(input.day);
  if(typeof input.weightKg!=='number'||!Number.isFinite(input.weightKg)||input.weightKg<=0||input.weightKg>500)reject('Enter a valid weight in kg.');
  const {photoTop=null,photoSide=null}=input;
  if((photoTop===null)!==(photoSide===null))reject('Add both a top photo and a side photo.');
  for(const photo of [photoTop,photoSide])if(photo!==null&&(typeof photo!=='string'||photo.length>40000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo)))reject('Use a smaller JPEG photo.');
  const key=`HOME-CHECK-${petId}-${day}`;
  // No AI model is run: new photo submissions must never create an invented BCS.
  await db.prepare("INSERT INTO body_assessments(id,petId,day,weightKg,bcs,bcsScale,mcs,origin,assessedBy,photoTop,photoSide) VALUES(?,?,?,?,NULL,NULL,NULL,'Home','Owner',?,?) ON CONFLICT(id) DO UPDATE SET weightKg=excluded.weightKg,photoTop=excluded.photoTop,photoSide=excluded.photoSide").bind(key,petId,day,input.weightKg,photoTop,photoSide).run();return {id:key};
 }
 return {workspace,saveJournal,completeTask,saveBodyCheck};
}
