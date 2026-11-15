export const catalog:{id:string;name:string;brand:string;category:string;kind:string;audience:string;image:string;summary:string;details:string;price:string;concept:boolean;url?:string;retailer?:string}[];
export type CareSignal={state:string;preview:boolean;title:string;reason:string};
export function careFlow(data:any,day:string,scenario?:string):CareSignal;
export function allowProductOptions(signal:CareSignal):boolean;
export function readSelection(storage:Storage,key:string):string[];
