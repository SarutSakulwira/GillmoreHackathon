import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['--watch','server/index.mjs'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'})];
let closing=false;
function stop(code=0){if(closing)return;closing=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(code),250).unref();}
for(const child of children)child.on('exit',code=>stop(code||0));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
