import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../server/store.mjs';
test('virtual collar shares readings and threshold flags with owner and vet',async()=>{const s=createStore(':memory:');try{
 const below=await s.simulateCollar('PT-1042',{day:'2026-11-15',seconds:119});assert.equal(below.flagged,false);
 const flag=await s.simulateCollar('PT-1042',{day:'2026-11-15',seconds:120});assert.equal(flag.flagged,true);
 await s.simulateCollar('PT-1042',{day:'2026-11-15',seconds:120});
 const owner=await s.owner.workspace('PT-1042'),vet=s.workspace();
 assert.equal(owner.wearable.find(r=>r.day==='2026-11-15').scratchingSeconds,120);
 assert.equal(vet.ownerLogs.filter(r=>r.id===flag.id).length,1);assert.equal(owner.ownerLogs.find(r=>r.id===flag.id).value,'Flagged');
 assert.ok(!vet.ownerLogs.some(r=>r.id===flag.id&&r.petId!=='PT-1042'));
 await assert.rejects(()=>s.simulateCollar('PT-1043',{day:'2026-11-15',seconds:120}),/dog/i);
 await assert.rejects(()=>s.simulateCollar('PT-1042',{day:'2026-02-31',seconds:120}),/valid date/);
 await assert.rejects(()=>s.simulateCollar('PT-1042',{day:'2026-11-15',seconds:-1}),/itch time/);
 const noBaseline=await s.simulateCollar('PT-1042',{day:'2020-01-01',seconds:30});assert.equal(noBaseline.baseline,null);assert.equal(noBaseline.flagged,false);
 }finally{s.close();}});

test('existing collar flags remain reviewable and use product-facing copy',async()=>{
 const {isCollarFlag,collarText}=await import('../src/collar.mjs');
 const {journalChanges}=await import('../src/vet/insights.mjs');
 const {careFlow,allowProductOptions}=await import('../src/owner/care-flow.mjs');
 const flag={id:'DEMO-ITCH-PT-1042-2026-11-15',petId:'PT-1042',day:'2026-11-15',kind:'Virtual collar demo',value:'Flagged',note:'Simulated collar · 180 s itch time today. Demo rule: ≥120 s/day.'};
 assert.equal(isCollarFlag(flag),true);
 assert.deepEqual(journalChanges(flag),['Increased scratching']);
 assert.equal(isCollarFlag({...flag,value:'Below threshold'}),false);
 assert.equal(isCollarFlag({...flag,kind:'Health journal'}),false);
 assert.doesNotMatch(collarText(flag.note),/demo|simulated/i);
 assert.match(collarText(flag.note),/180 s/);
 const signal=careFlow({ownerLogs:[flag]},flag.day);
 assert.equal(signal.state,'flag');assert.equal(allowProductOptions(signal),false);
 assert.doesNotMatch(signal.reason,/demo|simulated/i);
});

test('collar reset restores its original reading and leaves plans, other pets and clinical records intact',async()=>{
 const s=createStore(':memory:');try{await s.seedSampleDay();const day='2026-11-15',before=s.workspace();
 await s.simulateCollar('PT-1042',{day,seconds:180});await s.simulateCollar('PT-1044',{day,seconds:150});
 await s.simulateCollar('PT-1042',{day,action:'reset'});const after=s.workspace();
 assert.deepEqual(after.wearable.find(w=>w.petId==='PT-1042'&&w.day===day),before.wearable.find(w=>w.petId==='PT-1042'&&w.day===day));
 assert.ok(!after.ownerLogs.some(l=>l.id===`DEMO-ITCH-PT-1042-${day}`));assert.ok(after.ownerLogs.some(l=>l.id===`DEMO-ITCH-PT-1044-${day}`));
 assert.deepEqual(after.plans,before.plans);assert.deepEqual(after.encounters,before.encounters);assert.deepEqual(after.files,before.files);
 const owner=await s.owner.workspace('PT-1042');assert.ok(owner.imaging.some(f=>f.resultId==='MILO-XRAY'&&f.imagePath));
 await s.simulateCollar('PT-1042',{day,action:'reset'});assert.deepEqual(s.workspace(),after);
 await s.simulateCollar('PT-1042',{day:'2020-01-01',seconds:150});await s.simulateCollar('PT-1042',{day:'2020-01-01',action:'reset'});assert.ok(!s.workspace().wearable.some(w=>w.petId==='PT-1042'&&w.day==='2020-01-01'));
 }finally{s.close();}
});

test('Milo skin plan is scoped, archives the previous plan and keeps later edits',async()=>{
 const s=createStore(':memory:');try{const before=s.workspace(),other=before.plans.find(p=>p.petId==='PT-1044');
 await s.seedMiloSkinPlan();const after=s.workspace(),plan=after.plans.find(p=>p.petId==='PT-1042');assert.equal(plan.status,'Draft');assert.equal(plan.reviewDate,'2026-11-22');assert.equal(after.pets.find(p=>p.id==='PT-1042').programme,'Flea Allergy Dermatitis');
 assert.deepEqual(after.plans.find(p=>p.petId==='PT-1044'),other);assert.ok(after.planVersions.some(v=>v.petId==='PT-1042'&&v.kind==='Archived'));
 for(const visit of before.encounters)assert.deepEqual(after.encounters.find(v=>v.id===visit.id),visit);assert.ok(after.encounters.some(v=>v.id==='MILO-FAD-CONSULT'));assert.deepEqual(after.results,before.results);
 const tasks=after.planTasks.filter(t=>t.planId===plan.id);assert.equal(tasks.length,3);assert.ok(tasks.every(t=>t.metric==='ownerCheckin'&&t.source==='Owner'));assert.match(tasks[0].label,/spot-on/i);assert.deepEqual(tasks.map(t=>t.frequency),['Monthly','Daily','Weekly']);
 s.savePlan('PT-1042',{...plan,status:'Published',goal:'Keep the vet’s later edit',tasks:tasks.map(t=>t.label),structuredTasks:tasks});await s.seedMiloSkinPlan();assert.equal(s.workspace().plans.find(p=>p.id===plan.id).goal,'Keep the vet’s later edit');assert.equal((await s.owner.workspace('PT-1042')).plan.status,'Published');
 }finally{s.close();}
});
