import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.mjs';
const sample={externalPatientId:'PT-1042',type:'Blood chemistry',label:'Glucose',value:5.8,unit:'mmol/L',low:3.3,high:6.7,source:'Test simulator',observedAt:'2026-11-14T10:45:00Z'};
test('new results persist and unknown patients are quarantined until confirmed',()=>{
 const dir=mkdtempSync(join(tmpdir(),'carelink-test-'));const path=join(dir,'test.sqlite');let store=createStore(path);
 try{
  const before=store.workspace().results.length;
  const matched=store.importResult(sample);assert.equal(matched.status,'Pending review');
  const unknown=store.importResult({...sample,externalPatientId:'UNRECOGNISED'});assert.equal(unknown.status,'Needs matching');
  assert.throws(()=>store.review(unknown.id,'Checked'),/Match/);
  assert.throws(()=>store.matchResult(unknown.id,'NOT-A-PATIENT'),/valid patient/);
  store.matchResult(unknown.id,'PT-1043');store.review(unknown.id,'Identity confirmed with source and result reviewed.');
  store.close();store=createStore(path);
  assert.equal(store.workspace().results.length,before+2);
  const result=store.workspace().results.find(r=>r.id===unknown.id);assert.equal(result.petId,'PT-1043');assert.equal(result.status,'Reviewed');assert.ok(result.reviewedAt);assert.equal(result.note,'Synthetic demonstration import.');assert.equal(result.reviewNote,'Identity confirmed with source and result reviewed.');
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('rejects invalid numeric results, dates and ranges',()=>{
 const s=createStore(':memory:');try{
 for(const patch of [{value:'5.8'},{unit:''},{observedAt:'bad date'},{low:8,high:3},{high:null},{source:''}])assert.throws(()=>s.importResult({...sample,...patch}));
 }finally{s.close();}
});
test('plan changes survive reload and reset restores the demo',()=>{
 const s=createStore(':memory:');try{
 s.savePlan('PT-1042',{goal:'A reviewed example goal',tasks:['Record an observation'],reviewDate:'2026-11-21',status:'Published'});
 const plan=s.workspace().plans.find(p=>p.petId==='PT-1042');assert.equal(plan.status,'Published');assert.equal(plan.goal,'A reviewed example goal');assert.equal(plan.updatedBy,'Dr. Avery Chen');
 s.importResult(sample);s.reset();assert.equal(s.workspace().results.length,11);assert.equal(s.workspace().plans.find(p=>p.petId==='PT-1042').status,'Draft');
 }finally{s.close();}
});
