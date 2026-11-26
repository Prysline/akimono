// Formal dev-local on a fresh temporary directory. No injected assets, time or RNG.
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const cwd=fileURLToPath(new URL('../../',import.meta.url));
export async function auditPlayer(t){
 const directory=await mkdtemp(join(tmpdir(),'akimono-r1-http-'));
 let child,url;
 async function stop(){
   if(!child||child.exitCode!==null||child.signalCode!==null)return;
   await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
 }
 t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
 async function boot(){
   const env={...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,AKIMONO_REVIEWED_CROSS_PERIOD:'1'};
   for(const k of ['AKIMONO_E2E_FIXED_NOW','AKIMONO_E2E_DETERMINISTIC_RNG','AKIMONO_REVIEWED_NORMAL_TIME','AKIMONO_R2_TARGET_AD_MEMORY_ONLY'])delete env[k];
   child=spawn(process.execPath,['scripts/dev-local.mjs'],{cwd,env,stdio:['ignore','pipe','pipe']});
   let stderr='',timer;
   child.stderr.on('data',b=>stderr+=b);
   url=await Promise.race([new Promise((resolve,reject)=>{
     let output='';child.stdout.on('data',b=>{output+=b;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m)resolve(m[0]);});
     child.once('exit',code=>reject(Error('dev-local exited '+code+': '+stderr)));
     child.once('error',reject);
   }),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('dev-local startup timeout '+stderr)),15000);})]).finally(()=>clearTimeout(timer));
 }
 async function request(route,body,headers={}){
   const response=await fetch(url+route,body===undefined?{headers}:{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
   return {status:response.status,body:await response.json()};
 }
 async function state(){return (await request('/api/state')).body;}
 async function post(route,body={}){return request(route,body);}
 async function command(route,body={},code='COMMITTED'){
   const r=await post(route,body);assert.equal(r.body.code,code,JSON.stringify(r.body));return r.body.state;
 }
 async function open(){
   const init=await command('/api/initialize');
   return command('/api/open-shop',{expectedRevision:init.world.revision,ownerName:'稽核玩家',shopName:'稽核店'});
 }
 async function disk(dir=directory,prefix=''){
   const out={};
   for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
     const name=prefix+e.name,p=join(dir,e.name);
     if(e.isDirectory())Object.assign(out,await disk(p,name+'/'));
     else if(e.isFile())out[name]=createHash('sha256').update(await readFile(p)).digest('hex');
     else throw Error('unexpected save directory entry '+name);
   }
   return out;
 }
 async function snapshot(){const s=await state();return {world:s.world,historyCommands:s.historyCommands,historyCheckpointRevision:s.historyCheckpointRevision,generation:s.save.generation,disk:await disk()};}
 await boot();
 return {directory,state,post,command,open,stop,boot,snapshot,request};
}
