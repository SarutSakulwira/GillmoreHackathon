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
