import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const script=await readFile(new URL('../local-ui/app.js',import.meta.url),'utf8');
const logic=script.slice(script.indexOf('function beginMutation('),script.indexOf("$('save-world').addEventListener"));
const harness=(fetch,renderError=false)=>new Function('fetch','renderError',logic+`
 let mutationPending=false,stateLoading=false,snapshot={world:{revision:1},shop:{money:100,paytoday:0}};
 const notices=[];const feedback=(...args)=>notices.push(args);
 const showState=data=>{if(renderError)throw Error('render');snapshot=data;};
 return {call,beginMutation,endMutation,notices,read:()=>snapshot,loading:v=>{stateLoading=v;}};
`)(fetch,renderError);
const state={world:{revision:2},shop:{money:80,paytoday:20}};
const response=(body,ok=true)=>({ok,json:async()=>body});
test('F2 simultaneous POSTs submit exactly one original payload, no client retries',async()=>{
 const requests=[];let release;
 const h=harness((url,options)=>{requests.push([url,options]);return new Promise(resolve=>{release=resolve;});});
 const payload={expectedRevision:1,itemId:10,requestedCount:1,marketShelf:0,expectedPrice:20};
 const first=h.call('/api/buy',payload,'購買');
 assert.equal(await h.call('/api/buy',payload,'購買'),false);
 assert.equal(h.beginMutation('重置測試世界'),false);
 assert.equal(requests.length,1);
 assert.deepEqual(JSON.parse(requests[0][1].body),payload);
 release(response({ok:true,code:'COMMITTED',state,details:{}}));
 assert.equal(await first,true);
 assert.deepEqual(h.read(),state);
 assert.equal(h.beginMutation('後續操作'),true);
 h.endMutation();
});
test('F2 initial read blocks writes, stale revision uses server state and never auto-retries',async()=>{
 let count=0;
 const h=harness(async()=>{count++;return response({ok:false,code:'REVISION_CONFLICT',state},false);});
 h.loading(true);
 assert.equal(await h.call('/api/buy',{}),false);
 assert.equal(count,0);
 h.loading(false);
 assert.equal(await h.call('/api/buy',{expectedRevision:1}),false);
 assert.equal(count,1);
 assert.deepEqual(h.read(),state);
 assert.match(h.notices.at(-1)[0],/REVISION_CONFLICT.*確認最新畫面/);
 assert.equal(h.notices.at(-1)[2],true);
 assert.equal(h.beginMutation('後續操作'),true);
});
test('F2 unknown network result is not reported as definite rejection or retried',async()=>{
 let count=0;
 const h=harness(async()=>{count++;throw Error('network');});
 assert.equal(await h.call('/api/use',{}),false);
 assert.equal(count,1);
 assert.match(h.notices.at(-1)[0],/結果未能確認.*勿直接重試/);
 assert.equal(h.beginMutation('後續操作'),true);
});
test('F2 committed response followed by rendering failure still reports confirmed commit',async()=>{
 const h=harness(async()=>response({ok:true,state,details:{}}),true);
 assert.equal(await h.call('/api/use',{}),false);
 assert.match(h.notices.at(-1)[0],/已由伺服器確認完成.*畫面更新失敗/);
 assert.equal(h.beginMutation('後續操作'),true);
});
test('F2 destructive local reset shares the lock; initial read validates HTTP status',()=>{
 const reset=script.slice(script.indexOf("$('reset-world').addEventListener"),script.indexOf("$('initialize').addEventListener"));
 assert.match(reset,/if\(mutationPending\|\|stateLoading\)return;/);
 assert.match(reset,/if\(!beginMutation\('重置測試世界'\)\)return;/);
 assert.match(reset,/finally\{\s*endMutation\(\);/);
 assert.match(reset,/confirm:'RESET_LOCAL_TEST_WORLD'/);
 assert.match(script,/stateLoading=true;[\s\S]*?if\(!res.ok\)throw Error\('HTTP '\+res.status\)/);
});
