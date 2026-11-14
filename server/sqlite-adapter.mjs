// The small D1-shaped interface lets local and hosted owner routes share logic.
export function sqliteAdapter(db){return {
 prepare(sql){const statement=db.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){statement.run(...args);return {success:true};},execute(){return statement.columns().length?{results:statement.all(...args)}:(statement.run(...args),{success:true,results:[]});}};},
 async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}
};}
