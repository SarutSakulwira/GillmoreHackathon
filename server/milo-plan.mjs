// One-time, user-requested fictional plan for the pitch; subsequent edits are retained.
export async function seedMiloSkinPlan(db){
 const marker='milo-flea-plan-draft-v3',petId='PT-1042';
 if(await db.prepare('SELECT id FROM migrations WHERE id=?').bind(marker).first())return;
 const plan=await db.prepare('SELECT * FROM plans WHERE petId=?').bind(petId).first();if(!plan)return;
 const tasks=(await db.prepare('SELECT * FROM plan_tasks WHERE planId=?').bind(plan.id).all()).results;
 const completions=(await db.prepare('SELECT c.* FROM task_completions c JOIN plan_tasks t ON t.id=c.taskId WHERE t.planId=?').bind(plan.id).all()).results;
 const now=new Date().toISOString();
 const labels=['Apply the vet-prescribed monthly flea spot-on when due; follow the prescription label','Record scratching, licking and skin changes in the daily journal','Wash bedding and vacuum Milo’s resting areas'];
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO plan_versions VALUES(?,?,?,?,?)').bind(marker+'-previous',petId,'Archived',JSON.stringify({...plan,structuredTasks:tasks,completions}),now),
 db.prepare("DELETE FROM plan_versions WHERE petId=? AND kind='Draft'").bind(petId),
 db.prepare('DELETE FROM task_completions WHERE taskId IN (SELECT id FROM plan_tasks WHERE planId=?)').bind(plan.id),
 db.prepare('DELETE FROM plan_tasks WHERE planId=?').bind(plan.id),
 db.prepare("UPDATE pets SET programme='Flea Allergy Dermatitis' WHERE id=?").bind(petId),
 db.prepare("UPDATE programmes SET name='Flea Allergy Dermatitis' WHERE petId=?").bind(petId),
 db.prepare("UPDATE plans SET goal=?,tasks=?,reviewDate='2026-11-22',status='Draft',updatedAt=?,updatedBy='Dr. Avery Chen' WHERE id=?").bind('Following the vet’s assessment of flea allergy dermatitis, follow the prescribed flea-control routine and monitor scratching with the collar. Review comfort and skin changes in one week; contact the clinic sooner if signs worsen.',JSON.stringify(labels),now,plan.id),
 ...labels.map((label,i)=>db.prepare("INSERT INTO plan_tasks(id,planId,label,metric,target,unit,frequency,source) VALUES(?,?,?,'ownerCheckin',1,'entry',?,'Owner')").bind('MILO-SKIN-TASK-'+i,plan.id,label,['Monthly','Daily','Weekly'][i])),
 db.prepare("INSERT OR IGNORE INTO encounters VALUES('MILO-FAD-CONSULT','PT-1042','2026-11-15','Skin consultation','Fictional presentation case: vet assessment of itching and flea exposure. Collar data supports the history; it does not diagnose the condition.','Flea allergy dermatitis. Proposed flea-control and follow-up plan awaits approval.','Dr. Avery Chen')"),
 db.prepare('INSERT OR IGNORE INTO migrations VALUES(?)').bind(marker)
 ]);
}
