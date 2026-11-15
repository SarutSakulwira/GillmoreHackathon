// Keep stored event identifiers compatible while presenting product-facing labels.
export const isCollarLog = row => ['Virtual collar demo','Collar reading','Syncapet collar'].includes(row?.kind);
export const isCollarFlag = row => isCollarLog(row) && row.value === 'Flagged';
export const collarText = value => String(value ?? '')
 .replace(/virtual collar demo/gi,'Syncapet collar')
 .replace(/simulated collar/gi,'Syncapet collar')
 .replace(/demo rule/gi,'Flag rule')
 .replace(/\bdemo\b/gi,'')
 .replace(/ {2,}/g,' ').trim();
