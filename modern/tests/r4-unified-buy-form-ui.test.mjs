/** Controlled browser-script test of the actual market click handler. No browser or GameCore simulation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const script=await readFile(new URL('../local-ui/app.js',import.meta.url),'utf8');
const start=script.indexOf("$('market-offers').addEventListener('click',event=>{");
const end=script.indexOf("$('use-count-presets').addEventListener('change',()=>{",start);
assert.ok(start>=0&&end>start);
function exercise({form,custom='',preset='10',disabled=false,canBuy=true,legacy=false}){
 let onClick;const calls=[],messages=[];
 const offer={itemId:63,name:'工具',canBuy,shelf:7,price:0,...(form===undefined?{}:{form})};
 const input={value:custom},select=legacy?null:{value:preset};
 const row={querySelector:s=>s.startsWith('input')?input:select};
 const button={dataset:{marketBuy:'63'},disabled,closest:()=>row};
 const sandbox={
   $:id=>({addEventListener:(kind,fn)=>{assert.equal(id,'market-offers');assert.equal(kind,'click');onClick=fn;}}),
   snapshot:{world:{revision:12},marketOffers:[offer]},
   call:(...args)=>calls.push(JSON.parse(JSON.stringify(args))),
   feedback:(...args)=>messages.push(args),
 };
 runInNewContext(script.slice(start,end),sandbox);
 onClick({target:{closest:()=>button}});
 return {calls,messages};
}
test('market UI source preset and custom count use the identical server CAS command fields',()=>{
 const form={available:true,options:[{count:1,label:'1'},{count:10,label:'10'}]};
 for(const [input,expected] of [[{form,preset:'10'},10],[{form,preset:'10',custom:'3'},3],[{legacy:true,custom:'2'},2]]){
   const r=exercise(input);
   assert.equal(r.calls.length,1);assert.equal(r.messages.length,0);
   assert.deepEqual(r.calls[0].slice(0,2),['/api/buy',{expectedRevision:12,itemId:63,requestedCount:expected,marketShelf:7,expectedPrice:0}]);
 }
});
test('market UI does not submit unavailable offers or invalid positive custom counts',()=>{
 for(const opts of [{form:{available:false}},{disabled:true},{canBuy:false}]){
   assert.equal(exercise(opts).calls.length,0);
 }
 for(const custom of ['-1','1.5','9007199254740992']){
   const r=exercise({form:{available:true},custom});
   assert.equal(r.calls.length,0);assert.equal(r.messages.length,1);
 }
});
