// Additive migration. Existing imported results and clinician edits are retained.
export function upgrade(db) {
 db.exec("CREATE TABLE IF NOT EXISTS plan_versions(id TEXT PRIMARY KEY,petId TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,createdAt TEXT NOT NULL);\n\nCREATE TABLE IF NOT EXISTS record_reviews(id TEXT PRIMARY KEY,petId TEXT NOT NULL,kind TEXT NOT NULL,reviewedBy TEXT NOT NULL,reviewedAt TEXT NOT NULL);\n");
 db.exec("CREATE TABLE IF NOT EXISTS consultation_requests(id TEXT PRIMARY KEY,petId TEXT NOT NULL REFERENCES pets(id),mode TEXT NOT NULL,reason TEXT NOT NULL,preferredDate TEXT NOT NULL,preferredWindow TEXT NOT NULL,shareSummary INTEGER NOT NULL,status TEXT NOT NULL,createdAt TEXT NOT NULL,summary TEXT);\n");
 db.exec("CREATE TABLE IF NOT EXISTS reward_challenges(id TEXT PRIMARY KEY,petId TEXT NOT NULL REFERENCES pets(id),kind TEXT NOT NULL,title TEXT NOT NULL,instructions TEXT NOT NULL,startDay TEXT NOT NULL,endDay TEXT NOT NULL,requiredDays INTEGER NOT NULL,discount INTEGER NOT NULL,planId TEXT,snapshot TEXT,createdBy TEXT NOT NULL,createdAt TEXT NOT NULL);\n\nCREATE TABLE IF NOT EXISTS task_photos(id TEXT PRIMARY KEY,challengeId TEXT NOT NULL REFERENCES reward_challenges(id),petId TEXT NOT NULL REFERENCES pets(id),day TEXT NOT NULL,image TEXT NOT NULL,uploadedAt TEXT NOT NULL,UNIQUE(challengeId,day));\n\nCREATE TABLE IF NOT EXISTS reward_coupons(id TEXT PRIMARY KEY,petId TEXT NOT NULL REFERENCES pets(id),challengeId TEXT NOT NULL,title TEXT NOT NULL,discount INTEGER NOT NULL,code TEXT NOT NULL UNIQUE,earnedAt TEXT NOT NULL,expiresDay TEXT NOT NULL,appliedAt TEXT,selection TEXT);\n");
 const col=(table,name,type)=>{if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===name))db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);};
 for(const [n,t] of [['species','TEXT'],['microchip','TEXT'],['photo','TEXT'],['lastVisit','TEXT']])col('pets',n,t);
 for(const [n,t] of [['scratchingSeconds','INTEGER'],['lickingSeconds','INTEGER'],['headshakeCount','INTEGER'],['drinkingEvents','INTEGER'],['nightMovementEpisodes','INTEGER'],['validWearMinutes','INTEGER'],['deviceId','TEXT'],['algorithmVersion','TEXT']])col('wearable',n,t);
 db.exec(`CREATE TABLE IF NOT EXISTS migrations(id TEXT PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS encounters(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),day TEXT,reason TEXT,findings TEXT,assessment TEXT,clinician TEXT);
 CREATE TABLE IF NOT EXISTS medications(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),name TEXT,directions TEXT,status TEXT,startedAt TEXT);
 CREATE TABLE IF NOT EXISTS vaccinations(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),name TEXT,givenAt TEXT,dueAt TEXT);
 CREATE TABLE IF NOT EXISTS allergies(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),substance TEXT,reaction TEXT);
 CREATE TABLE IF NOT EXISTS body_assessments(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),day TEXT,weightKg REAL,bcs REAL,bcsScale INTEGER,mcs TEXT,origin TEXT,assessedBy TEXT,photoTop TEXT,photoSide TEXT);
 CREATE TABLE IF NOT EXISTS diagnostic_files(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),resultId TEXT REFERENCES results(id),kind TEXT,title TEXT,day TEXT,bodyRegion TEXT,imagePath TEXT,report TEXT,reportedBy TEXT);
 CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),name TEXT,status TEXT,lastSync TEXT);
 CREATE TABLE IF NOT EXISTS plan_tasks(id TEXT PRIMARY KEY,planId TEXT REFERENCES plans(id),label TEXT,metric TEXT,target REAL,unit TEXT,frequency TEXT,source TEXT);
 CREATE TABLE IF NOT EXISTS task_completions(id TEXT PRIMARY KEY,taskId TEXT REFERENCES plan_tasks(id),day TEXT,value REAL,status TEXT,source TEXT);
 `);
 if(!db.prepare("SELECT id FROM migrations WHERE id='patient-workspace-v2'").get()){
 db.exec('BEGIN');try{
 const extra=[['PT-1045','Charlie','Beagle',4,'Male','Emma Reed','CH','Healthy Weight'],['PT-1046','Bella','Border Collie',6,'Female','Daniel Brooks','BE','Mobility Support'],['PT-1047','Mochi','British Shorthair',3,'Male','Priya Shah','MO','Healthy Weight'],['PT-1048','Cleo','Domestic Shorthair',11,'Female','Olivia Green','CL','Senior Wellness'],['PT-1049','Coco','Mini Lop',2,'Female','Noah Patel','CO','Routine Care'],['PT-1050','Snowball','Netherland Dwarf',5,'Male','Grace Lee','SN','Routine Care']];
 // Luna joins the feline cohort. Oliver remains in the canine cohort.
 db.prepare("UPDATE pets SET breed='Ragdoll',programme='Routine Care' WHERE id='PT-1043'").run();
 for(const p of extra)db.prepare('INSERT OR IGNORE INTO pets(id,name,breed,age,sex,owner,initials,programme,clinic) VALUES(?,?,?,?,?,?,?,?,?)').run(...p,'Brookfield Veterinary');
 const pets=db.prepare('SELECT * FROM pets ORDER BY id').all();
 const days=['2026-11-14','2026-11-12','2026-11-13','2026-11-09','2026-11-14','2026-11-10','2026-11-11','2026-11-08','2026-11-06','2026-11-05'];
 const weights={Milo:32.4,Luna:4.8,Oliver:13.6,Charlie:14.1,Bella:18.6,Mochi:6.2,Cleo:3.9,Coco:1.8,Snowball:1.2};
 // There are nine original names; Teddy is the tenth patient.
 db.prepare('INSERT OR IGNORE INTO pets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run('PT-1051','Teddy','Cavalier King Charles Spaniel',8,'Male','Ethan Wood','TE','Senior Wellness','Brookfield Veterinary','Dog','985141000001051','/pets/teddy.jpg','2026-11-07');
 const all=db.prepare('SELECT * FROM pets ORDER BY id').all();
 for(let i=0;i<all.length;i++){
 const p=all[i],species=['Luna','Mochi','Cleo'].includes(p.name)?'Cat':['Coco','Snowball'].includes(p.name)?'Rabbit':'Dog';
 const day=days[i]||'2026-11-07',w=weights[p.name]??8.9,bcs=species==='Rabbit'?3:['Milo','Charlie','Mochi'].includes(p.name)?6:5,scale=species==='Rabbit'?5:9;
 db.prepare('UPDATE pets SET species=?,microchip=?,photo=?,lastVisit=? WHERE id=?').run(species,'98514100000'+String(1042+i),'/pets/'+p.name.toLowerCase()+'.jpg',day,p.id);
 if(p.name==='Luna'){
 db.prepare("UPDATE results SET value=4.8 WHERE petId=? AND type='Weight'").run(p.id);
 db.prepare("UPDATE plans SET goal='Maintain a consistent feeding and home-care routine.' WHERE petId=? AND goal LIKE 'Support consistent%'").run(p.id);
 }
 db.prepare('INSERT OR IGNORE INTO encounters VALUES(?,?,?,?,?,?,?)').run('ENC-'+p.id,p.id,day,p.name==='Oliver'||p.name==='Bella'?'Mobility follow-up':p.name==='Cleo'?'Senior health review':'Health and nutrition review',species==='Rabbit'?'Appetite, droppings and dental history reviewed. Weight recorded.':'Weight, body condition, diet and activity history reviewed.',p.programme+' follow-up. Review available results alongside the owner history.','Dr. Avery Chen');
 db.prepare('INSERT OR IGNORE INTO allergies VALUES(?,?,?,?)').run('ALG-'+p.id,p.id,p.name==='Bella'?'Amoxicillin':'None reported',p.name==='Bella'?'Previous gastrointestinal reaction':'');
 db.prepare('INSERT OR IGNORE INTO vaccinations VALUES(?,?,?,?,?)').run('VAC-'+p.id,p.id,species==='Dog'?'Core vaccination':species==='Cat'?'Feline core vaccination':'Myxomatosis / RHD vaccination','2026-04-20','2027-04-20');
 db.prepare('INSERT OR IGNORE INTO body_assessments VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('BODY-C-'+p.id,p.id,day,w,bcs,scale,'Normal','Clinic','Dr. Avery Chen',null,null);
 db.prepare('INSERT OR IGNORE INTO body_assessments VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('BODY-H-'+p.id,p.id,'2026-11-14',Number((w*.995).toFixed(2)),species==='Dog'?bcs:null,scale,null,'Home',species==='Dog'?'AI estimate':'Owner',null,null);
 if(!db.prepare('SELECT id FROM plans WHERE petId=?').get(p.id))db.prepare('INSERT INTO plans VALUES(?,?,?,?,?,?,?,?)').run('PLAN-'+p.id,p.id,p.programme==='Healthy Weight'?'Support gradual weight management with the clinic.':'Maintain comfort and a consistent daily routine.',JSON.stringify(['Record food and treats.','Complete the agreed daily routine.','Attend the next weight check.']),i%3===0?'2026-11-14':'2026-11-24','Draft','2026-11-14T09:00:00Z','Dr. Avery Chen');
 if(!db.prepare('SELECT id FROM programmes WHERE petId=?').get(p.id))db.prepare('INSERT INTO programmes VALUES(?,?,?,?,?,?)').run('PRG-'+p.id,p.id,p.programme,'Prevention programme','2026-11-01','Active');
 if(!db.prepare('SELECT id FROM results WHERE petId=?').get(p.id))db.prepare('INSERT INTO results(id,petId,externalPatientId,type,label,value,unit,source,observedAt,receivedAt,status,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('WT-'+p.id,p.id,p.id,'Weight','Body weight',w,'kg','Clinic scale',day+'T10:00:00Z',day+'T10:05:00Z','Reviewed','Weight check');
 // Accelerometer behaviour models in this concept target dogs only.
 if(species!=='Dog')db.prepare('DELETE FROM wearable WHERE petId=?').run(p.id);
 else{
 db.prepare('INSERT OR IGNORE INTO devices VALUES(?,?,?,?,?)').run('COL-'+p.id,p.id,'Healthspan collar','Assigned','2026-11-14T08:30:00Z');
 for(let d=1;d<=14;d++){const id='W2-'+p.id+'-'+d,missing=p.name==='Milo'&&d===12,activity=48+(d*7+i*3)%28;
 if(!db.prepare('SELECT id FROM wearable WHERE petId=? AND day=?').get(p.id,`2026-11-${String(d).padStart(2,'0')}`))db.prepare('INSERT INTO wearable(id,petId,day,activeMinutes,restHours,quality,source) VALUES(?,?,?,?,?,?,?)').run(id,p.id,`2026-11-${String(d).padStart(2,'0')}`,missing?null:activity,missing?null:12.8,'Complete','Healthspan collar');
 }
 db.prepare("UPDATE wearable SET scratchingSeconds=CASE WHEN quality='Missing' THEN NULL ELSE 65 END,lickingSeconds=CASE WHEN quality='Missing' THEN NULL ELSE 110 END,headshakeCount=CASE WHEN quality='Missing' THEN NULL ELSE 7 END,drinkingEvents=CASE WHEN quality='Missing' THEN NULL ELSE 8 END,nightMovementEpisodes=CASE WHEN quality='Missing' THEN NULL ELSE 5 END,validWearMinutes=CASE WHEN quality='Missing' THEN 0 ELSE 1380 END,deviceId=?,algorithmVersion='behaviour-0.1',source='Healthspan collar' WHERE petId=?").run('COL-'+p.id,p.id);
 }
 if(!db.prepare('SELECT id FROM owner_logs WHERE petId=?').get(p.id))for(let d=8;d<=14;d++)db.prepare('INSERT INTO owner_logs VALUES(?,?,?,?,?,?)').run('LOG-'+p.id+'-'+d,p.id,'2026-11-'+String(d).padStart(2,'0'),'Daily check-in',d===11?'Partial':'Completed',species==='Rabbit'?'Appetite and droppings recorded.':'Meals and daily routine recorded.');
 const plan=db.prepare('SELECT * FROM plans WHERE petId=?').get(p.id);
 const taskList=species==='Dog'?[['Daily activity','activeMinutes',p.name==='Milo'?60:50,'min','Wearable'],['Food diary','ownerCheckin',1,'entry','Owner'],['Weight check','weightKg',null,'kg','Clinic']]:[['Food diary','ownerCheckin',1,'entry','Owner'],['Weight check','weightKg',null,'kg','Owner']];
 taskList.forEach((t,j)=>{const tid='TASK-'+p.id+'-'+j;db.prepare('INSERT OR IGNORE INTO plan_tasks VALUES(?,?,?,?,?,?,?,?)').run(tid,plan.id,t[0],t[1],t[2],t[3],j===2?'Weekly':'Daily',t[4]);for(let d=8;d<=14;d++){if(t[1]==='weightKg')continue;const wr=db.prepare('SELECT activeMinutes FROM wearable WHERE petId=? AND day=?').get(p.id,'2026-11-'+String(d).padStart(2,'0')),v=t[1]==='activeMinutes'?wr?.activeMinutes??null:d===11?0:1;db.prepare('INSERT OR IGNORE INTO task_completions VALUES(?,?,?,?,?,?)').run('DONE-'+tid+'-'+d,tid,'2026-11-'+String(d).padStart(2,'0'),v,v===null?'Missing':v>=t[2]?'Completed':'Below target',t[4]);}});
 }
 // Attachments retain their own patient and study identifiers.
 db.prepare('INSERT OR IGNORE INTO diagnostic_files VALUES(?,?,?,?,?,?,?,?,?,?)').run('FILE-R008','PT-1044','R-008','X-ray','Thoracic radiograph','2026-11-13','Thorax','/clinical/dog-thorax.jpg','Thoracic study available for review. Correlate images with examination findings before recording an interpretation.','Dr. Avery Chen');
 db.prepare('INSERT OR IGNORE INTO diagnostic_files VALUES(?,?,?,?,?,?,?,?,?,?)').run('FILE-R005','PT-1042','R-005','Ultrasound','Abdominal ultrasound','2026-11-10','Abdomen',null,'Abdominal ultrasound report received. Review the original study and clinical history at the follow-up visit.','Dr. Avery Chen');
 db.prepare("UPDATE results SET source=REPLACE(source,'Demo ',''), note=CASE WHEN type='Imaging' THEN 'Study received from imaging archive.' WHEN type='Weight' THEN 'Weight recorded at clinic.' ELSE 'Result received for clinical review.' END WHERE id GLOB 'R-*'").run();
 db.exec("INSERT INTO migrations VALUES('patient-workspace-v2');COMMIT");
 }catch(e){db.exec('ROLLBACK');throw e;}}
 db.exec(`CREATE VIEW IF NOT EXISTS patient_summary AS SELECT p.id AS petId,p.name,p.species,p.lastVisit,pl.goal,pl.status AS planStatus,pl.reviewDate,(SELECT COUNT(*) FROM results r WHERE r.petId=p.id AND r.status='Pending review') AS resultsToReview FROM pets p LEFT JOIN plans pl ON pl.petId=p.id;
 DROP VIEW IF EXISTS body_condition_timeline;
 CREATE VIEW body_condition_timeline AS SELECT id,petId,day,weightKg,bcs,bcsScale,mcs,origin,assessedBy,photoTop,photoSide FROM body_assessments
 UNION ALL SELECT r.id,r.petId,substr(r.observedAt,1,10),r.value,NULL,CASE WHEN p.species='Rabbit' THEN 5 ELSE 9 END,NULL,'Clinic',COALESCE(r.reviewedBy,'Clinic record'),NULL,NULL FROM results r JOIN pets p ON p.id=r.petId WHERE r.type='Weight' AND r.unit='kg' AND r.value IS NOT NULL AND NOT EXISTS (SELECT 1 FROM body_assessments b WHERE b.petId=r.petId AND b.day=substr(r.observedAt,1,10) AND b.weightKg=r.value AND b.origin='Clinic');
 DROP VIEW IF EXISTS daily_home_data;
 CREATE VIEW daily_home_data AS WITH days AS (SELECT petId,day FROM wearable UNION SELECT petId,day FROM owner_logs) SELECT d.petId,d.day,w.activeMinutes,w.restHours,w.scratchingSeconds,w.lickingSeconds,w.headshakeCount,w.drinkingEvents,w.nightMovementEpisodes,w.validWearMinutes,COALESCE(w.quality,'No device') AS quality,w.deviceId,(SELECT COUNT(*) FROM owner_logs l WHERE l.petId=d.petId AND l.day=d.day AND l.value='Completed') AS ownerCheckins FROM days d LEFT JOIN wearable w ON w.petId=d.petId AND w.day=d.day;
 DROP VIEW IF EXISTS care_plan_progress; CREATE VIEW care_plan_progress AS SELECT t.id AS taskId,p.petId,p.status AS planStatus,t.label,t.metric,t.target,t.unit,t.frequency,t.source,(SELECT COUNT(*) FROM task_completions c WHERE c.taskId=t.id) AS recordedDays,(SELECT COUNT(*) FROM task_completions c WHERE c.taskId=t.id AND c.value IS NOT NULL AND ((t.metric='weightKg') OR (t.target IS NOT NULL AND c.value>=t.target))) AS completedDays FROM plan_tasks t JOIN plans p ON p.id=t.planId;`);
}
