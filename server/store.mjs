import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class InputError extends Error { constructor(message) { super(message); this.status = 400; } }
export function createStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS pets(id TEXT PRIMARY KEY, name TEXT, breed TEXT, age INTEGER, sex TEXT, owner TEXT, initials TEXT, programme TEXT, clinic TEXT);
    CREATE TABLE IF NOT EXISTS results(id TEXT PRIMARY KEY, petId TEXT REFERENCES pets(id), externalPatientId TEXT, type TEXT, label TEXT, value REAL, unit TEXT, low REAL, high REAL, source TEXT, observedAt TEXT, receivedAt TEXT, status TEXT, reviewedBy TEXT, reviewedAt TEXT, note TEXT);
    CREATE TABLE IF NOT EXISTS wearable(id TEXT PRIMARY KEY, petId TEXT REFERENCES pets(id), day TEXT, activeMinutes INTEGER, restHours REAL, quality TEXT, source TEXT);
    CREATE TABLE IF NOT EXISTS owner_logs(id TEXT PRIMARY KEY, petId TEXT REFERENCES pets(id), day TEXT, kind TEXT, value TEXT, note TEXT);
    CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY, petId TEXT UNIQUE REFERENCES pets(id), goal TEXT, tasks TEXT, reviewDate TEXT, status TEXT, updatedAt TEXT, updatedBy TEXT);
    CREATE TABLE IF NOT EXISTS programmes(id TEXT PRIMARY KEY, petId TEXT UNIQUE REFERENCES pets(id), name TEXT, sponsor TEXT, enrolledAt TEXT, status TEXT);`);
  if (!db.prepare('PRAGMA table_info(results)').all().some(c => c.name === 'reviewNote')) db.exec('ALTER TABLE results ADD COLUMN reviewNote TEXT');
  const all = table => db.prepare(`SELECT * FROM ${table}`).all();
  function seed() {
    db.exec('BEGIN');
    try {
      for (const table of ['results','wearable','owner_logs','plans','programmes','pets']) db.exec(`DELETE FROM ${table}`);
      const pets = [
        ['PT-1042','Milo','Golden Retriever',7,'Male','Alex Morgan','MI','Healthy Weight','Brookfield Veterinary'],
        ['PT-1043','Luna','Labrador Retriever',5,'Female','Sam Taylor','LU','Healthy Weight','Brookfield Veterinary'],
        ['PT-1044','Oliver','Cocker Spaniel',9,'Male','Jamie Wilson','OL','Active Ageing','Brookfield Veterinary']
      ];
      for (const pet of pets) db.prepare('INSERT INTO pets VALUES (?,?,?,?,?,?,?,?,?)').run(...pet);
      const stamp='2026-11-14T09:30:00Z';
      const samples=[
        ['R-001','PT-1042','Weight','Body weight',32.4,'kg',null,null,'Clinic scale','2026-11-13T10:00:00Z','Reviewed','Weight entered by clinic.'],
        ['R-002','PT-1042','Blood chemistry','Glucose',5.4,'mmol/L',3.3,6.7,'Demo chemistry analyser','2026-11-14T08:40:00Z','Pending review','Synthetic result; reference interval is illustrative.'],
        ['R-003','PT-1042','Haematology','Haematocrit',44,'%',37,55,'Demo haematology analyser','2026-11-14T08:40:00Z','Pending review','Synthetic result; reference interval is illustrative.'],
        ['R-004','PT-1042','Urinalysis','Urinalysis report',null,'',null,null,'Demo external laboratory','2026-11-12T11:00:00Z','Reviewed','Example report attachment. No clinical interpretation supplied.'],
        ['R-005','PT-1042','Imaging','Abdominal ultrasound',null,'',null,null,'Demo imaging archive','2026-11-10T11:00:00Z','Reviewed','Illustrative study record only. No diagnostic image or real machine connection.'],
        ['R-006','PT-1043','Blood chemistry','Glucose',7.1,'mmol/L',3.3,6.7,'Demo chemistry analyser','2026-11-14T08:55:00Z','Pending review','Illustrative result outside its supplied example range. Requires veterinary interpretation.'],
        ['R-007','PT-1043','Weight','Body weight',29.2,'kg',null,null,'Clinic scale','2026-11-12T11:00:00Z','Reviewed','Weight entered by clinic.'],
        ['R-008','PT-1044','Imaging','Thoracic X-ray',null,'',null,null,'Demo imaging archive','2026-11-13T11:00:00Z','Pending review','Illustrative study record only. No diagnostic image or real machine connection.'],
        ['R-009','PT-1044','Weight','Body weight',13.6,'kg',null,null,'Clinic scale','2026-11-11T11:00:00Z','Reviewed','Weight entered by clinic.'],
        ['R-010','PT-1042','Weight','Body weight',33.1,'kg',null,null,'Clinic scale','2026-11-01T10:00:00Z','Reviewed','Weight entered by clinic.'],
        ['R-011','PT-1042','Weight','Body weight',32.8,'kg',null,null,'Clinic scale','2026-11-07T10:00:00Z','Reviewed','Weight entered by clinic.']
      ];
      for (const [id,petId,type,label,value,unit,low,high,source,date,status,note] of samples) {
        db.prepare('INSERT INTO results (id,petId,externalPatientId,type,label,value,unit,low,high,source,observedAt,receivedAt,status,reviewedBy,reviewedAt,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,petId,petId,type,label,value,unit,low,high,source,date,stamp,status,status==='Reviewed'?'Dr. Avery Chen':null,status==='Reviewed'?stamp:null,note);
      }
      for (let p=0;p<pets.length;p++) {
        const id=pets[p][0];
        for(let i=0;i<14;i++) {
          const day=`2026-11-${String(i+1).padStart(2,'0')}`;
          const activity=[58,63,55,69,61,72,65,60,66,56,59,51,48,54][i]+p*5;
          db.prepare('INSERT INTO wearable VALUES (?,?,?,?,?,?,?)').run(`W-${p}-${i}`,id,day,i===11&&p===0?null:activity,i===11&&p===0?null:Number((12.5+Math.sin(i+p)*1.2).toFixed(1)),i===11&&p===0?'Missing':'Complete','Demo collar simulator');
          if(i>6) db.prepare('INSERT INTO owner_logs VALUES (?,?,?,?,?,?)').run(`L-${p}-${i}`,id,day,'Daily check-in',i===10?'Partial':'Completed',i===10?'Evening walk shortened because of rain.':'Meals and routine logged by owner.');
        }
        db.prepare('INSERT INTO plans VALUES (?,?,?,?,?,?,?,?)').run(`P-${p}`,id,p===2?'Maintain a comfortable daily routine.':'Support consistent activity and vet-supervised weight management.',JSON.stringify(['Record meals and treats daily.','Follow the activity plan agreed with the clinic.','Record weight at the agreed check-in.']),p===0?'2026-11-14':'2026-11-21',p===0?'Draft':'Published',stamp,'Dr. Avery Chen');
        db.prepare('INSERT INTO programmes VALUES (?,?,?,?,?,?)').run(`E-${p}`,id,pets[p][7],'Example insurer (fictional)','2026-11-01','Active');
      }
      db.exec('COMMIT');
    } catch(e) {db.exec('ROLLBACK');throw e;}
  }
  if (!db.prepare('SELECT COUNT(*) AS count FROM pets').get().count) seed();
  const findPet = id => db.prepare('SELECT * FROM pets WHERE id=?').get(id);
  function workspace() {
    return { pets:all('pets'),results:all('results'),wearable:all('wearable'),ownerLogs:all('owner_logs'),plans:all('plans').map(p=>({...p,tasks:JSON.parse(p.tasks)})),programmes:all('programmes') };
  }
  function importResult(input) {
    if (!input || typeof input !== 'object') throw new InputError('A result object is required.');
    for (const field of ['externalPatientId','type','label','source','observedAt']) {
      if (typeof input[field]!=='string'||!input[field].trim()||input[field].length>250) throw new InputError(`${field} is required (maximum 250 characters).`);
    }
    if (!Number.isFinite(Date.parse(input.observedAt))) throw new InputError('Use a valid observation date.');
    const {value=null,low=null,high=null,unit=''}=input;
    for(const [field,v] of Object.entries({value,low,high})) if(v!==null&&(typeof v!=='number'||!Number.isFinite(v))) throw new InputError(`${field} must be a finite number or null.`);
    if((low===null)!==(high===null)||(low!==null&&low>=high)) throw new InputError('Provide both range limits, with lower less than upper.');
    if(typeof unit!=='string'||unit.length>40)throw new InputError('Unit must be text (maximum 40 characters).');
    if(value!==null&&!unit.trim())throw new InputError('A unit is required for numeric results.');
    if(input.note!=null&&(typeof input.note!=='string'||input.note.length>2000))throw new InputError('Note must be text (maximum 2000 characters).');
    const pet=findPet(input.externalPatientId), id=randomUUID();
    const status=pet?'Pending review':'Needs matching';
    db.prepare('INSERT INTO results (id,petId,externalPatientId,type,label,value,unit,low,high,source,observedAt,receivedAt,status,reviewedBy,reviewedAt,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,pet?.id??null,input.externalPatientId,input.type,input.label,value,unit,low,high,input.source,new Date(input.observedAt).toISOString(),new Date().toISOString(),status,null,null,input.note??'Synthetic demonstration import.');
    return {id,status};
  }
  function matchResult(id,petId) {
    if(!findPet(petId))throw new InputError('Choose a valid patient.');
    const result=db.prepare('SELECT * FROM results WHERE id=?').get(id);
    if(!result||result.status!=='Needs matching')throw new InputError('Only unmatched results can be assigned.');
    db.prepare("UPDATE results SET petId=?,status='Pending review' WHERE id=?").run(petId,id);
  }
  function review(id,note) {
    const result=db.prepare('SELECT * FROM results WHERE id=?').get(id);
    if(!result||!result.petId)throw new InputError('Match the result to a patient before review.');
    if(typeof note!=='string'||!note.trim()||note.length>2000)throw new InputError('Add a review note (maximum 2000 characters).');
    db.prepare("UPDATE results SET status='Reviewed',reviewedBy=?,reviewedAt=?,reviewNote=? WHERE id=?").run('Dr. Avery Chen',new Date().toISOString(),note,id);
  }
  function savePlan(petId,input) {
    if(!input || typeof input !== 'object')throw new InputError('A plan object is required.');
    if(!findPet(petId))throw new InputError('Patient not found.');
    if(typeof input.goal!=='string'||!input.goal.trim()||input.goal.length>500)throw new InputError('Add a goal (maximum 500 characters).');
    if(!Array.isArray(input.tasks)||!input.tasks.length||input.tasks.length>10||input.tasks.some(t=>typeof t!=='string'||!t.trim()||t.length>500))throw new InputError('Add between 1 and 10 tasks (maximum 500 characters each).');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.reviewDate)||!Number.isFinite(Date.parse(input.reviewDate)))throw new InputError('Choose a review date.');
    if(!['Draft','Published'].includes(input.status))throw new InputError('Invalid plan status.');
    db.prepare('UPDATE plans SET goal=?,tasks=?,reviewDate=?,status=?,updatedAt=?,updatedBy=? WHERE petId=?').run(input.goal,JSON.stringify(input.tasks),input.reviewDate,input.status,new Date().toISOString(),'Dr. Avery Chen',petId);
  }
  return {workspace,importResult,matchResult,review,savePlan,reset:seed,close:()=>db.close()};
}
