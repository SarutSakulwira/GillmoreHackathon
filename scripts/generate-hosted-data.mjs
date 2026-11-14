import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {createStore} from '../server/store.mjs';
const dir=mkdtempSync(join(tmpdir(),'checkapet-schema-'));
try {
 const path=join(dir,'fresh.sqlite');const store=createStore(path);store.close();const db=new DatabaseSync(path);
 const names=['pets','results','wearable','owner_logs','plans','programmes','encounters','medications','vaccinations','allergies','body_assessments','diagnostic_files','devices','plan_tasks','task_completions'];
 const tables=Object.fromEntries(names.map(t=>[t,db.prepare(`SELECT * FROM ${t}`).all()]));
 writeFileSync('worker/seed.json',JSON.stringify(tables));
 const schema=db.prepare("SELECT sql FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END,rowid").all().map(r=>r.sql+';').join('\n--> statement-breakpoint\n')+'\n--> statement-breakpoint\nCREATE TABLE hosted_seed(id TEXT PRIMARY KEY);\n';
 const target='drizzle/0000_checkapet.sql';
 if(existsSync(target)&&readFileSync(target,'utf8')!==schema)throw new Error('Hosted schema changed. Add a new migration instead of overwriting 0000.');
 if(!existsSync(target))writeFileSync(target,schema);
 const journal='drizzle/meta/_journal.json';if(!existsSync(journal))writeFileSync(journal,JSON.stringify({version:'7',dialect:'sqlite',entries:[{idx:0,version:'6',when:1794700800000,tag:'0000_checkapet',breakpoints:true}]},null,2)+'\n');
 db.close();console.log('Hosted schema and fictional seed prepared.');
} finally {rmSync(dir,{recursive:true,force:true});}
