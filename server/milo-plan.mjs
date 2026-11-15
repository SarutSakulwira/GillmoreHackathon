// One-time, user-requested fictional plan for the pitch; subsequent edits are retained.
export async function seedMiloSkinPlan(db){
 const marker='milo-itch-draft-v2',petId='PT-1042';
 if(await db.prepare('SELECT id FROM migrations WHERE id=?').bind(marker).first())return;
 const plan=await db.prepare('SELECT * FROM plans WHERE petId=?').bind(petId).first();if(!plan)return;
 const tasks=(await db.prepare('SELECT * FROM plan_tasks WHERE planId=?').bind(plan.id).all()).results;
 const completions=(await db.prepare('SELECT c.* FROM task_completions c JOIN plan_tasks t ON t.id=c.taskId WHERE t.planId=?').bind(plan.id).all()).results;
 const now=new Date().toISOString();
 const labels=['Record scratching, licking and comfort in the daily journal','Observe the skin and ears; note any redness or new irritation'];
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO plan_versions VALUES(?,?,?,?,?)').bind(marker+'-previous',petId,'Archived',JSON.stringify({...plan,structuredTasks:tasks,completions}),now),
 db.prepare("DELETE FROM plan_versions WHERE petId=? AND kind='Draft'").bind(petId),
 db.prepare('DELETE FROM task_completions WHERE taskId IN (SELECT id FROM plan_tasks WHERE planId=?)').bind(plan.id),
 db.prepare('DELETE FROM plan_tasks WHERE planId=?').bind(plan.id),
 db.prepare("UPDATE pets SET programme='Itch Monitoring & Vet Review' WHERE id=?").bind(petId),
 db.prepare("UPDATE programmes SET name='Itch Monitoring & Vet Review' WHERE petId=?").bind(petId),
 db.prepare("UPDATE plans SET goal=?,tasks=?,reviewDate='2026-11-18',status='Draft',updatedAt=?,updatedBy='Dr. Avery Chen' WHERE id=?").bind('Monitor Milo’s scratching and skin comfort, review collar trends with the vet, and agree any treatment after assessment. Contact the clinic sooner if signs worsen.',JSON.stringify(labels),now,plan.id),
 ...labels.map((label,i)=>db.prepare("INSERT INTO plan_tasks(id,planId,label,metric,target,unit,frequency,source) VALUES(?,?,?,'ownerCheckin',1,'entry','Daily','Owner')").bind('MILO-SKIN-TASK-'+i,plan.id,label)),
 db.prepare('INSERT OR IGNORE INTO migrations VALUES(?)').bind(marker)
 ]);
}
