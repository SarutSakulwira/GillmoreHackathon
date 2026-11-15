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
