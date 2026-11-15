import {validateDay} from './owner.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function simulateCollar(db,petId,input){
 const day=validateDay(input?.day),seconds=input?.seconds;
 if(input?.action!=='reset'&&(!Number.isInteger(seconds)||seconds<0||seconds>86400))fail('Choose itch time from 0 to 86,400 seconds.');
 const pet=await db.prepare('SELECT * FROM pets WHERE id=?').bind(petId).first();
 if(!pet)fail('Patient not found.',404);
 const device=await db.prepare('SELECT * FROM devices WHERE petId=?').bind(petId).first();
 if(pet.species!=='Dog'||!device)fail('Choose a dog with an assigned collar.');
 const key=`DEMO-ITCH-${petId}-${day}`;
 const prior=await db.prepare('SELECT * FROM wearable WHERE petId=? AND day=?').bind(petId,day).first();
 const snapshot=await db.prepare('SELECT payload FROM demo_snapshots WHERE petId=? AND day=?').bind(petId,day).first();
 if(input?.action==='reset'){
  const statements=[];
  if(snapshot){const saved=JSON.parse(snapshot.payload);if(saved){const keys=Object.keys(saved);statements.push(db.prepare(`INSERT OR REPLACE INTO wearable (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(saved)));}else statements.push(db.prepare('DELETE FROM wearable WHERE petId=? AND day=?').bind(petId,day));}
  else if(prior?.algorithmVersion==='demo-itch-v1'&&day==='2026-11-15'&&petId==='PT-1042')statements.push(db.prepare("UPDATE wearable SET scratchingSeconds=72,quality='Partial',source='Healthspan collar',algorithmVersion='behaviour-0.1' WHERE id=?").bind(prior.id));
  statements.push(db.prepare('DELETE FROM record_reviews WHERE id=?').bind(key),db.prepare('DELETE FROM owner_logs WHERE id=? AND petId=?').bind(key,petId),db.prepare('DELETE FROM demo_snapshots WHERE petId=? AND day=?').bind(petId,day));
  await db.batch(statements);return {reset:true,seconds:0,flagged:false,note:'Collar session reset. Care plans and medical records kept.'};
 }
 if(!snapshot){const saved=prior?{...prior}:null;if(saved?.algorithmVersion==='demo-itch-v1'&&day==='2026-11-15'&&petId==='PT-1042'){saved.scratchingSeconds=72;saved.quality='Partial';saved.source='Healthspan collar';saved.algorithmVersion='behaviour-0.1';}await db.prepare('INSERT OR IGNORE INTO demo_snapshots VALUES(?,?,?)').bind(petId,day,JSON.stringify(saved)).run();}
 const history=(await db.prepare("SELECT scratchingSeconds FROM wearable WHERE petId=? AND day<? AND scratchingSeconds IS NOT NULL AND quality='Complete' AND validWearMinutes>=1200 ORDER BY day DESC LIMIT 7").bind(petId,day).all()).results;
 const baseline=history.length?history.reduce((sum,r)=>sum+r.scratchingSeconds,0)/history.length:null;
 const flagged=seconds>=120||(baseline!==null&&seconds>baseline*2);
 const note=`Syncapet collar · ${seconds} s itch time today. ${baseline===null?'No valid baseline available.':`Prior ${history.length} valid days baseline: ${baseline.toFixed(1)} s/day.`} Flag rule: ≥120 s/day or >2× baseline. ${flagged?'Possible skin allergy / allergic dermatitis (including flea allergy): vet review suggested.':'Threshold not reached.'} This is a behaviour flag, not a diagnosis.`;
 await db.batch([
 db.prepare("INSERT INTO wearable(id,petId,day,scratchingSeconds,quality,source,deviceId,algorithmVersion) VALUES(?,?,?,?,'Complete','Syncapet collar',?,'demo-itch-v1') ON CONFLICT(id) DO UPDATE SET scratchingSeconds=excluded.scratchingSeconds,source=excluded.source,deviceId=excluded.deviceId,algorithmVersion=excluded.algorithmVersion").bind(prior?.id||`DEMO-W-${petId}-${day}`,petId,day,seconds,device.id),
 db.prepare('INSERT INTO owner_logs(id,petId,day,kind,value,note) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,note=excluded.note').bind(key,petId,day,'Virtual collar demo',flagged?'Flagged':'Below threshold',note),
 db.prepare('DELETE FROM record_reviews WHERE id=?').bind(key)
 ]);
 return {id:key,seconds,baseline,baselineDays:history.length,flagged,note};
}
