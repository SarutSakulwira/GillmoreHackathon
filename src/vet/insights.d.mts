export function journalChanges(log:any):string[];
export function resultFlag(r:any):{label:string;tone:string};
export function taskProgress(task:any,completions:any[],plan:any,versions:any[],today:string):{met:number;below:number;missing:number;inProgress:number;total:number;periodUnit:string;from:string;to:string;weight:boolean};
export function baselineSummary(wear:any[],key:string):null|{current:number;before:number;change:number|null;days:number;priorDays:number};
