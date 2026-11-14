CREATE TABLE pets(id TEXT PRIMARY KEY, name TEXT, breed TEXT, age INTEGER, sex TEXT, owner TEXT, initials TEXT, programme TEXT, clinic TEXT, species TEXT, microchip TEXT, photo TEXT, lastVisit TEXT);
--> statement-breakpoint
CREATE TABLE results(id TEXT PRIMARY KEY, petId TEXT REFERENCES pets(id), externalPatientId TEXT, type TEXT, label TEXT, value REAL, unit TEXT, low REAL, high REAL, source TEXT, observedAt TEXT, receivedAt TEXT, status TEXT, reviewedBy TEXT, reviewedAt TEXT, note TEXT, reviewNote TEXT);
--> statement-breakpoint
CREATE TABLE wearable(id TEXT PRIMARY KEY, petId TEXT REFERENCES pets(id), day TEXT, activeMinutes INTEGER, restHours REAL, quality TEXT, source TEXT, scratchingSeconds INTEGER, lickingSeconds INTEGER, headshakeCount INTEGER, drinkingEvents INTEGER, nightMovementEpisodes INTEGER, validWearMinutes INTEGER, deviceId TEXT, algorithmVersion TEXT);
--> statement-breakpoint
CREATE TABLE owner_logs(id TEXT PRIMARY KEY, petId TEXT REFERENCES pets(id), day TEXT, kind TEXT, value TEXT, note TEXT);
--> statement-breakpoint
CREATE TABLE plans(id TEXT PRIMARY KEY, petId TEXT UNIQUE REFERENCES pets(id), goal TEXT, tasks TEXT, reviewDate TEXT, status TEXT, updatedAt TEXT, updatedBy TEXT);
--> statement-breakpoint
CREATE TABLE programmes(id TEXT PRIMARY KEY, petId TEXT UNIQUE REFERENCES pets(id), name TEXT, sponsor TEXT, enrolledAt TEXT, status TEXT);
--> statement-breakpoint
CREATE TABLE migrations(id TEXT PRIMARY KEY);
--> statement-breakpoint
CREATE TABLE encounters(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),day TEXT,reason TEXT,findings TEXT,assessment TEXT,clinician TEXT);
--> statement-breakpoint
CREATE TABLE medications(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),name TEXT,directions TEXT,status TEXT,startedAt TEXT);
--> statement-breakpoint
CREATE TABLE vaccinations(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),name TEXT,givenAt TEXT,dueAt TEXT);
--> statement-breakpoint
CREATE TABLE allergies(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),substance TEXT,reaction TEXT);
--> statement-breakpoint
CREATE TABLE body_assessments(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),day TEXT,weightKg REAL,bcs REAL,bcsScale INTEGER,mcs TEXT,origin TEXT,assessedBy TEXT,photoTop TEXT,photoSide TEXT);
--> statement-breakpoint
CREATE TABLE diagnostic_files(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),resultId TEXT REFERENCES results(id),kind TEXT,title TEXT,day TEXT,bodyRegion TEXT,imagePath TEXT,report TEXT,reportedBy TEXT);
--> statement-breakpoint
CREATE TABLE devices(id TEXT PRIMARY KEY,petId TEXT REFERENCES pets(id),name TEXT,status TEXT,lastSync TEXT);
--> statement-breakpoint
CREATE TABLE plan_tasks(id TEXT PRIMARY KEY,planId TEXT REFERENCES plans(id),label TEXT,metric TEXT,target REAL,unit TEXT,frequency TEXT,source TEXT);
--> statement-breakpoint
CREATE TABLE task_completions(id TEXT PRIMARY KEY,taskId TEXT REFERENCES plan_tasks(id),day TEXT,value REAL,status TEXT,source TEXT);
--> statement-breakpoint
CREATE VIEW patient_summary AS SELECT p.id AS petId,p.name,p.species,p.lastVisit,pl.goal,pl.status AS planStatus,pl.reviewDate,(SELECT COUNT(*) FROM results r WHERE r.petId=p.id AND r.status='Pending review') AS resultsToReview FROM pets p LEFT JOIN plans pl ON pl.petId=p.id;
--> statement-breakpoint
CREATE VIEW body_condition_timeline AS SELECT id,petId,day,weightKg,bcs,bcsScale,mcs,origin,assessedBy,photoTop,photoSide FROM body_assessments
 UNION ALL SELECT r.id,r.petId,substr(r.observedAt,1,10),r.value,NULL,CASE WHEN p.species='Rabbit' THEN 5 ELSE 9 END,NULL,'Clinic',COALESCE(r.reviewedBy,'Clinic record'),NULL,NULL FROM results r JOIN pets p ON p.id=r.petId WHERE r.type='Weight' AND r.unit='kg' AND r.value IS NOT NULL AND NOT EXISTS (SELECT 1 FROM body_assessments b WHERE b.petId=r.petId AND b.day=substr(r.observedAt,1,10) AND b.weightKg=r.value AND b.origin='Clinic');
--> statement-breakpoint
CREATE VIEW daily_home_data AS WITH days AS (SELECT petId,day FROM wearable UNION SELECT petId,day FROM owner_logs) SELECT d.petId,d.day,w.activeMinutes,w.restHours,w.scratchingSeconds,w.lickingSeconds,w.headshakeCount,w.drinkingEvents,w.nightMovementEpisodes,w.validWearMinutes,COALESCE(w.quality,'No device') AS quality,w.deviceId,(SELECT COUNT(*) FROM owner_logs l WHERE l.petId=d.petId AND l.day=d.day AND l.value='Completed') AS ownerCheckins FROM days d LEFT JOIN wearable w ON w.petId=d.petId AND w.day=d.day;
--> statement-breakpoint
CREATE VIEW care_plan_progress AS SELECT t.id AS taskId,p.petId,p.status AS planStatus,t.label,t.metric,t.target,t.unit,t.frequency,t.source,(SELECT COUNT(*) FROM task_completions c WHERE c.taskId=t.id) AS recordedDays,(SELECT COUNT(*) FROM task_completions c WHERE c.taskId=t.id AND c.value IS NOT NULL AND ((t.metric='weightKg') OR (t.target IS NOT NULL AND c.value>=t.target))) AS completedDays FROM plan_tasks t JOIN plans p ON p.id=t.planId;
--> statement-breakpoint
CREATE TABLE hosted_seed(id TEXT PRIMARY KEY);
