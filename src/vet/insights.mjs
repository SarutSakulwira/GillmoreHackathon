import {isCollarFlag} from '../collar.mjs';
export function journalChanges(log){
 if(isCollarFlag(log))return ['Increased scratching'];
 if(log.kind!=='Health journal')return [];
 try{const j=JSON.parse(log.note);return [['appetite','Usual','Appetite'],['comfort','Comfortable','Comfort'],['drinking','Usual','Drinking'],['toileting','Usual','Toileting']].filter(([k,v])=>j[k]&&j[k]!==v).map(([k,,label])=>`${label}: ${j[k]}`);}catch{return [];}
}
export function resultFlag(r){if(r.value===null)return {label:'Report',tone:''};if(r.low===null||r.high===null)return {label:'No reference interval',tone:''};return r.value<r.low?{label:'Low',tone:'rose'}:r.value>r.high?{label:'High',tone:'rose'}:{label:'Within supplied range',tone:''};}
const dayMillis=86400000;
function period(day,frequency){const d=new Date(day+'T12:00:00Z');if(frequency==='Monthly')return day.slice(0,7);if(frequency==='Weekly'){d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}return day;}
export function taskProgress(task,completions,plan,versions,today){
 const rows=completions.filter(c=>c.taskId===task.id&&c.day<=today),start=String(plan.updatedAt||today).slice(0,10);
 const startDay=start>today?today:start;
 const first=rows.reduce((a,c)=>c.day<a?c.day:a,startDay);
 // Show a bounded current window, including days without records; today stays in progress.
 const from=new Date(Math.max(new Date(first+'T12:00:00Z').getTime(),new Date(today+'T12:00:00Z').getTime()-29*dayMillis)).toISOString().slice(0,10);
 const groups=new Map();for(let d=new Date(from+'T12:00:00Z');d.toISOString().slice(0,10)<=today;d.setUTCDate(d.getUTCDate()+1)){const day=d.toISOString().slice(0,10),key=period(day,task.frequency);if(!groups.has(key))groups.set(key,{rows:[],current:key===period(today,task.frequency)});}
 for(const row of rows){const key=period(row.day,task.frequency);if(groups.has(key))groups.get(key).rows.push(row);}
 const history=versions.filter(v=>v.kind==='Archived'&&v.payload?.status==='Published').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
 let met=0,below=0,missing=0,inProgress=0;
 for(const group of groups.values()){
  const valid=group.rows.filter(r=>r.value!==null&&r.status!=='Missing');
  const success=valid.some(r=>{const old=history.find(v=>r.day<v.createdAt.slice(0,10)&&v.payload.structuredTasks?.some(t=>t.id===task.id));const t=old?.payload.structuredTasks?.find(t=>t.id===task.id)||task;return task.metric==='weightKg'||t.target!==null&&r.value>=t.target;});
  if(success)met++;else if(group.current)inProgress++;else if(valid.length)below++;else missing++;
 }
 return {met,below,missing,inProgress,total:groups.size,periodUnit:task.frequency==='Weekly'?'weeks':task.frequency==='Monthly'?'months':'days',from,to:today,weight:task.metric==='weightKg'};
}
export function baselineSummary(wear,key){const valid=wear.filter(w=>w.quality==='Complete'&&typeof w[key]==='number');if(valid.length<4)return null;const recent=valid.slice(-3),prior=valid.slice(-10,-3);if(!prior.length)return null;const mean=a=>a.reduce((s,r)=>s+r[key],0)/a.length;const before=mean(prior),current=mean(recent);return {current,before,change:before?Math.round((current-before)/before*100):null,days:recent.length,priorDays:prior.length};}
