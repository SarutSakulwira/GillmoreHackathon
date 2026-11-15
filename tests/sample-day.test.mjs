import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../server/store.mjs';
const day='2026-11-15';
test('today fixtures append a complete cohort day, preserve existing edits and run only once',async()=>{
 const s=createStore(':memory:');try{
  const before=s.workspace(),plan=before.plans.find(p=>p.petId==='PT-1042'),tasks=before.planTasks.filter(t=>t.planId===plan.id).map(t=>t.metric==='activeMinutes'?{...t,target:100}:t);
  s.savePlan('PT-1042',{goal:'Keep this edited plan',tasks:tasks.map(t=>t.label),structuredTasks:tasks,reviewDate:'2026-11-26',status:'Published'});
  await s.owner.saveJournal('PT-1042',{day,appetite:'More',comfort:'Comfortable',drinking:'Usual',toileting:'Usual',note:'Preserve the owner entry'});
  await s.owner.saveBodyCheck('PT-1042',{day,weightKg:32.35});
  await s.seedSampleDay();const after=s.workspace();
  assert.equal(after.wearable.filter(w=>w.day===day).length,5);assert.ok(after.wearable.filter(w=>w.day===day).every(w=>after.pets.find(p=>p.id===w.petId).species==='Dog'));
  assert.equal(after.wearable.find(w=>w.petId==='PT-1042'&&w.day===day).activeMinutes,72);assert.ok(after.wearable.filter(w=>w.day===day).every(w=>w.restHours*60+w.activeMinutes<=w.validWearMinutes));
  assert.equal(after.encounters.filter(e=>e.day===day).length,10);assert.equal(after.bodyAssessments.filter(b=>b.day===day&&b.origin==='Clinic').length,10);assert.equal(after.bodyAssessments.filter(b=>b.day===day&&b.origin==='Home').length,10);
  assert.equal(after.ownerLogs.filter(l=>l.day===day&&l.kind==='Health journal').length,10);assert.equal(JSON.parse(after.ownerLogs.find(l=>l.id==='JOURNAL-PT-1042-'+day).note).note,'Preserve the owner entry');
  assert.equal(after.bodyAssessments.find(b=>b.id==='HOME-CHECK-PT-1042-'+day).weightKg,32.35);
  assert.equal(after.planTasks.find(t=>t.id===tasks.find(t=>t.metric==='activeMinutes').id).target,100);assert.equal(after.plans.find(p=>p.id===plan.id).goal,'Keep this edited plan');assert.equal(after.plans.find(p=>p.id===plan.id).status,'Published');
  const activityCompletion=after.taskCompletions.find(c=>c.taskId===tasks.find(t=>t.metric==='activeMinutes').id&&c.day===day);assert.equal(activityCompletion.value,72);assert.equal(activityCompletion.status,'Below target');
  assert.ok(after.devices.every(d=>d.lastSync.startsWith(day)));assert.ok(after.pets.every(p=>p.lastVisit===day));
  assert.equal(after.results.filter(r=>r.observedAt.startsWith(day)&&r.status==='Pending review').length,3);
  for(const old of before.results)assert.deepEqual(after.results.find(r=>r.id===old.id),old);
  assert.deepEqual(after.medications,before.medications);assert.deepEqual(after.vaccinations,before.vaccinations);for(const file of before.files)if(file.id!=='FILE-R005')assert.deepEqual(after.files.find(f=>f.id===file.id),file);assert.equal(after.files.find(f=>f.id==='FILE-R005').imagePath,'/clinical/canine-ultrasound.mp4');assert.ok(after.files.some(f=>f.petId==='PT-1042'&&f.kind==='X-ray'&&f.imagePath));
  await s.seedSampleDay();assert.deepEqual(s.workspace(),after);
 }finally{s.close();}
});
