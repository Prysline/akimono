import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {reviewOriginalUseDisclosure,listOriginalUseDisclosure} from '../src/original-r4-use-disclosure.mjs';
const root=new URL('./original-perl/',import.meta.url);
const files={itemDsl:'../../../custom/inc-item-data.cgi',listSource:'core-item-detail.cgi',formSource:'core-item-m.cgi',submitSource:'core-item-submit.cgi',useSource:'use.cgi',compilerSource:'inc-makeitem.cgi',helperSource:'core-inc-item.cgi'};
const sources=Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k,p])=>[k,await readFile(new URL(p,root),'utf8')])));
const reviewed=reviewOriginalUseDisclosure(sources);
test('all 116 frozen USE disclosures match generated Perl records and both original gates',()=>{
  const fixtures=['','drug','tool','weapon','armor','material','book','cow','peddle'].flatMap(job=>[0,1,5,10,30,10000].map(n=>({job,item:Array(79).fill(n)})));
  const observed=JSON.parse(execFileSync('perl',['use-disclosure-a35.pl'],{cwd:root,encoding:'utf8',input:JSON.stringify(fixtures),maxBuffer:16*1024*1024}));
  assert.equal(observed.length,fixtures.length);
  for(const [i,shop] of fixtures.entries()){
    const before=structuredClone(shop);
    const actual=listOriginalUseDisclosure({reviewed,shop}).sort((a,b)=>a.itemId-b.itemId||a.useId-b.useId);
    assert.equal(actual.length,116);
    assert.deepEqual(actual,observed[i]);
    assert.deepEqual(shop,before);
  }
});
test('source disclosure is independent of execution rules and rejects source drift',()=>{
  const shop={item:Array(79).fill(0),money:0,time:0,exp:{}};
  const list=()=>listOriginalUseDisclosure({reviewed,shop});
  assert.equal(list().find(q=>q.itemId===14&&q.useId===0).sourceUseOk,true);
  assert.equal(list().find(q=>q.itemId===10&&q.useId===0).sourceDisplayName,'？？？？？？？？');
  const before=list();shop.money=999999;shop.exp={10:1000};shop.time=999999;assert.deepEqual(list(),before);
  shop.item.fill(10000);assert.ok(list().every(q=>q.sourceNameVisible&&q.sourceUseOk&&!q.sourceDispOk));
  assert.throws(()=>listOriginalUseDisclosure({reviewed:{...reviewed},shop}),/source review required/);
  for(const key of Object.keys(sources))assert.throws(()=>reviewOriginalUseDisclosure({...sources,[key]:sources[key]+'\n'}),/source drift/);
});
