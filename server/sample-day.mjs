// A single, explicitly requested fictional day. No scheduled or rolling data generation.
export const SAMPLE_DAY='2026-11-15';
export async function seedSampleDay(db){
 const marker='sample-day-'+SAMPLE_DAY;
 if(await db.prepare('SELECT id FROM migrations WHERE id=?').bind(marker).first())return;
 const pets=(await db.prepare('SELECT * FROM pets ORDER BY id').all()).results;
 const tasks=(await db.prepare('SELECT * FROM plan_tasks').all()).results;
 const stamp=SAMPLE_DAY+'T08:45:00Z',statements=[];
 const weights={'PT-1042':32.3,'PT-1043':4.8,'PT-1044':13.6,'PT-1045':14.0,'PT-1046':18.6,'PT-1047':6.2,'PT-1048':3.9,'PT-1049':1.8,'PT-1050':1.2,'PT-1051':8.9};
 const activity={'PT-1042':72,'PT-1044':48,'PT-1045':61,'PT-1046':38,'PT-1051':56};
 const insert=(table,row,condition='',parameters=[])=>{const keys=Object.keys(row);statements.push(db.prepare(`INSERT OR IGNORE INTO ${table} (${keys.join(',')}) SELECT ${keys.map(()=>'?').join(',')} ${condition}`).bind(...Object.values(row),...parameters));};
 for(let i=0;i<pets.length;i++){
  const p=pets[i],weight=weights[p.id];if(weight===undefined)continue;
  const prefix=`SAMPLE-${SAMPLE_DAY}-${p.id}`;
  const bcs=p.species==='Rabbit'?3:['Milo','Charlie','Mochi'].includes(p.name)?6:5;
  const scale=p.species==='Rabbit'?5:9;
  if(p.species==='Dog'){
   insert('wearable',{id:prefix+'-COLLAR',petId:p.id,day:SAMPLE_DAY,activeMinutes:activity[p.id],restHours:Number((7.1+(i%3)*.05).toFixed(1)),quality:'Partial',source:'Healthspan collar',scratchingSeconds:72+i*5,lickingSeconds:98+i*7,headshakeCount:4+i%4,drinkingEvents:6+i%5,nightMovementEpisodes:3+i%4,validWearMinutes:510,deviceId:'COL-'+p.id,algorithmVersion:'behaviour-0.1'},'WHERE NOT EXISTS (SELECT 1 FROM wearable WHERE petId=? AND day=?)',[p.id,SAMPLE_DAY]);
   statements.push(db.prepare('UPDATE devices SET lastSync=? WHERE petId=? AND (lastSync IS NULL OR lastSync<?)').bind(stamp,p.id,stamp));
  }
  const entry={appetite:'Usual',comfort:p.name==='Oliver'?'Stiff':'Comfortable',drinking:'Usual',toileting:'Usual',note:p.species==='Rabbit'?'Hay intake and droppings recorded this morning.':p.name==='Oliver'?'A little stiff on rising. Owner will discuss this at the follow-up.':'Morning meal and usual routine recorded.'};
  insert('owner_logs',{id:prefix+'-JOURNAL',petId:p.id,day:SAMPLE_DAY,kind:'Health journal',value:'Completed',note:JSON.stringify(entry)},"WHERE NOT EXISTS (SELECT 1 FROM owner_logs WHERE petId=? AND day=? AND kind='Health journal')",[p.id,SAMPLE_DAY]);
  insert('encounters',{id:prefix+'-VISIT',petId:p.id,day:SAMPLE_DAY,reason:'Preventive care follow-up',findings:p.species==='Rabbit'?'Weight, appetite and dental history reviewed.':'Weight, body condition and home observations reviewed.',assessment:p.name==='Oliver'?'Discuss reported morning stiffness and review the current care plan.':'Continue the agreed care routine and review the new observations.',clinician:'Dr. Avery Chen'},'WHERE NOT EXISTS (SELECT 1 FROM encounters WHERE petId=? AND day=?)',[p.id,SAMPLE_DAY]);
  insert('body_assessments',{id:prefix+'-CLINIC',petId:p.id,day:SAMPLE_DAY,weightKg:weight,bcs,bcsScale:scale,mcs:'Normal',origin:'Clinic',assessedBy:'Dr. Avery Chen',photoTop:null,photoSide:null},"WHERE NOT EXISTS (SELECT 1 FROM body_assessments WHERE petId=? AND day=? AND origin='Clinic')",[p.id,SAMPLE_DAY]);
  const homeWeight=Number((weight-(p.species==='Dog'?.05:0)).toFixed(2));
  insert('body_assessments',{id:prefix+'-HOME',petId:p.id,day:SAMPLE_DAY,weightKg:homeWeight,bcs:null,bcsScale:null,mcs:null,origin:'Home',assessedBy:'Owner',photoTop:null,photoSide:null},"WHERE NOT EXISTS (SELECT 1 FROM body_assessments WHERE petId=? AND day=? AND origin='Home')",[p.id,SAMPLE_DAY]);
  insert('results',{id:prefix+'-WEIGHT',petId:p.id,externalPatientId:p.id,type:'Weight',label:'Body weight',value:weight,unit:'kg',low:null,high:null,source:'Clinic scale',observedAt:SAMPLE_DAY+'T08:15:00Z',receivedAt:stamp,status:'Reviewed',reviewedBy:'Dr. Avery Chen',reviewedAt:stamp,note:'Weight recorded during the follow-up.',reviewNote:'Weight and body condition reviewed together.'},"WHERE NOT EXISTS (SELECT 1 FROM results WHERE petId=? AND type='Weight' AND substr(observedAt,1,10)=?)",[p.id,SAMPLE_DAY]);
  statements.push(db.prepare('UPDATE pets SET lastVisit=? WHERE id=? AND (lastVisit IS NULL OR lastVisit<?)').bind(SAMPLE_DAY,p.id,SAMPLE_DAY));
 }
 // Resolve the current plans and targets, preserving all clinician edits and statuses.
 const plans=(await db.prepare('SELECT id,petId FROM plans').all()).results;
 for(const task of tasks){
  const p=plans.find(p=>p.id===task.planId);if(!p||weights[p.petId]===undefined)continue;
  let value=null;
  if(task.source==='Wearable'&&task.metric==='activeMinutes')value=activity[p.petId]??null;
  else if(task.source==='Owner'&&task.metric==='ownerCheckin')value=task.target??1;
  else if(task.metric==='weightKg')value=task.source==='Clinic'?weights[p.petId]:Number((weights[p.petId]-(activity[p.petId]!==undefined?.05:0)).toFixed(2));
  if(value===null)continue;
  insert('task_completions',{id:`SAMPLE-${SAMPLE_DAY}-${task.id}`,taskId:task.id,day:SAMPLE_DAY,value,status:task.metric==='weightKg'||value>=(task.target??1)?'Completed':'Below target',source:task.source},'WHERE NOT EXISTS (SELECT 1 FROM task_completions WHERE taskId=? AND day=?)',[task.id,SAMPLE_DAY]);
 }
 for(const lab of [{petId:'PT-1042',type:'Blood chemistry',label:'Glucose',value:5.5,unit:'mmol/L',source:'Chemistry analyser'},{petId:'PT-1044',type:'Haematology',label:'Haematocrit',value:43,unit:'%',source:'Haematology analyser'},{petId:'PT-1048',type:'Blood chemistry',label:'Creatinine',value:130,unit:'µmol/L',source:'External laboratory'}]){
  if(!pets.some(p=>p.id===lab.petId))continue;
  insert('results',{id:`SAMPLE-${SAMPLE_DAY}-${lab.petId}-LAB`,...lab,externalPatientId:lab.petId,low:null,high:null,observedAt:SAMPLE_DAY+'T08:25:00Z',receivedAt:stamp,status:'Pending review',reviewedBy:null,reviewedAt:null,note:'Result received for veterinary review.',reviewNote:null},'WHERE NOT EXISTS (SELECT 1 FROM results WHERE petId=? AND label=? AND substr(observedAt,1,10)=?)',[lab.petId,lab.label,SAMPLE_DAY]);
 }
 statements.push(db.prepare('INSERT OR IGNORE INTO migrations(id) VALUES(?)').bind(marker));
 await db.batch(statements);
}
