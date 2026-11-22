import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOriginalCompiledEventCatalog} from '../src/original-event-compiled-catalog.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {reviewR4EventItemParams,projectR4EventItemParams,R4_EVENT_PARAM_SOURCE}
  from '../src/original-r4-event-item-param.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,turn,compiler]=await Promise.all([
 'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
 'modern/tests/original-perl/inc-turn.cgi',
 'modern/tests/original-perl/inc-makeitem.cgi',
].map(read));
const catalog=reviewOriginalCompiledEventCatalog({
 itemDsl,rebelDsl,compilerSource:compiler,turnSource:turn});
const reviewed=reviewR4EventItemParams({
 catalog,compilerSource:compiler,
 model:loadStandardStreetModel(itemDsl,rebelDsl)});
const oracle=JSON.parse(execFileSync('perl',
 ['original-r4-event-item-param-probe.pl'],{
 cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8'}));
const items=()=>Array.from({length:79},(_,i)=>{
 const id=i+1;return {itemId:id,price:1000+5*id,
   pricebase:2000+7*id,pricehalf:3000+11*id,
   popular:5000+20*id,plus:60+id,point:100+id};
});
test('R4 source ITEM overlay review locks frozen compiler and exactly 9 declarative events',()=>{
 assert.equal(reviewed.source,R4_EVENT_PARAM_SOURCE);
 assert.equal(reviewed.committable,false);
 assert.equal(Object.values(reviewed.rules).filter(x=>x.length).length,9);
 assert.throws(()=>reviewR4EventItemParams({
   catalog,
   compilerSource:compiler.replace('$key=~s/^pop$/popular/i;',''),
   model:loadStandardStreetModel(itemDsl,rebelDsl),
 }),/drift/);
});
test('R4 direct frozen Perl generated EVENT overlay equals JS for all nine active PARAM events',()=>{
 assert.equal(oracle.compiledCount,17);
 assert.equal(oracle.overlayCount,9);
 const before=items(),snapshot=JSON.stringify(before);
 assert.deepEqual([...oracle.cases.map(c=>c.eventCode)].sort(),
   Object.keys(reviewed.rules).filter(k=>reviewed.rules[k].length).sort());
 for(const c of oracle.cases){
   const result=projectR4EventItemParams({
     reviewed,eventCode:c.eventCode,items:before});
   assert.equal(result.committable,false);
   assert.equal(result.items.length,79);
   for(let i=0;i<79;i++){
     const actual=result.items[i],source=c.items[i];
     for(const key of Object.keys(source)){
       if(typeof source[key]==='number'&&typeof actual[key]==='number'){
         assert.ok(Math.abs(actual[key]-source[key])<1e-9,
           c.eventCode+' item '+(i+1)+' field '+key);
       }else assert.deepEqual(actual[key],source[key],
         c.eventCode+' item '+(i+1)+' field '+key);
     }
   }
   assert.equal(JSON.stringify(before),snapshot,'never mutate original ITEM rows');
 }
});
test('R4 EVENT item overlay rejects unsupported start, missing fields and unsafe data',()=>{
 const input=items(),before=JSON.stringify(input);
 for(const eventCode of ['manbiki','guildbattle','not-real','']){
   assert.throws(()=>projectR4EventItemParams({reviewed,eventCode,items:input}));
 }
 assert.throws(()=>projectR4EventItemParams({
   reviewed,eventCode:'ken-sale',items:input.slice(0,78)}));
 assert.throws(()=>projectR4EventItemParams({
   reviewed,eventCode:'ken-sale',items:input.map((x,i)=>i===39?{
     ...x,popular:Number.MAX_SAFE_INTEGER+2}:x)}));
 assert.equal(JSON.stringify(input),before);
});
