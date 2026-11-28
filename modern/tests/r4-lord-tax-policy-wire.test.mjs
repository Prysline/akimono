import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewLordTaxPolicy,projectLordTaxPolicy} from './support/r4-lord-tax-policy-candidate.mjs';
import {reviewPeriodPlay,serializePeriodPlay,parsePeriodPlay} from '../src/original-r4-period-play-file.mjs';
import {reviewTownFiles} from '../src/original-r4-town-files.mjs';
import {reviewR4LordSaleTax,createR4LordSaleTaxContext} from '../src/original-r4-lord-sale-tax.mjs';
const read=n=>readFileSync(new URL('./original-perl/'+n,import.meta.url),'utf8');
const dir=fileURLToPath(new URL('./original-perl/',import.meta.url));
const lord=read('pinned-lord-s.cgi'),reviewed=reviewLordTaxPolicy(lord);
const sources={writeSource:read('write.cgi'),incFuncSource:read('inc-func.cgi'),detailSource:read('core-detail.cgi'),
 configSource:readFileSync(new URL('../../_config.cgi',import.meta.url),'utf8')};
const wireReview=reviewPeriodPlay(sources,{crossPeriod:true,ordinaryMultiShelf:true,externalRebel:true,lordTaxWire:true});
const legacy=reviewPeriodPlay(sources,{crossPeriod:true,ordinaryMultiShelf:true,externalRebel:true});
const townReview=reviewTownFiles({custom:read('pinned-custom.cgi'),read:sources.incFuncSource,write:sources.writeSource});
const taxReview=reviewR4LordSaleTax({detail:sources.detailSource,item:read('item.cgi'),turn:read('inc-turn.cgi')});
const oracle=(fixture,command)=>JSON.parse(execFileSync('perl',['original-r4-lord-tax-policy-probe.pl'],{cwd:dir,input:JSON.stringify({fixture,command}),encoding:'utf8'}));
const base={revision:7,leader:1,actorId:1,taxRate:40,eventState:{},shops:[{id:1,name:'Owner',shopname:'Shop A',taxmode:0},{id:2,name:'Other',shopname:'Shop B',taxmode:2}]};
const cmd={kind:'lord-tax-side',actorId:1,expectedRevision:7,targetId:2,mode:'free'};
function worldFor(s,eventState,taxRate){
 const strings=['name','shopname','pass','comment','remoteaddr','guild','blocklogin','nocheckip','job'];
 const shop=Object.fromEntries(wireReview.shopFields.map(k=>[k,strings.includes(k)?'':0]));
 Object.assign(shop,{id:1,name:s.name,shopname:s.shopname,status:1,foundation:1000000,lastlogin:1000000,
  money:100000,rank:5000,showcasecount:1,showcase:[0],price:[0],item:Array(79).fill(0),
  itemyesterday:{},itemtoday:{},exp:{},user:{},taxtoday:1234,taxyesterday:567});
 if(Object.hasOwn(s,'taxmode'))shop.taxmode=s.taxmode;else delete shop.taxmode;
 return {lasttime:1000000,people:500000,nextid:100,blockip:'',taxRate,
  state:{leader:1,money:5000000,in:567,out:0,develop:5001,devem:123,safety:5001,safem:456,army:10000,robina:0,robinb:0},
  wholesale:Array(79).fill(0),wholesaleCsv:Array(79).fill(0).join(','),events:eventState,town:{},shops:[shop]};
}
for(const eventState of [{},{rebel:1259200}])for(const prior of [undefined,'',0,1,2])for(const mode of ['free','double','normal','reset']){
 test('R4 original lord taxside/treset and taxmode wire: '+JSON.stringify({eventState,prior:prior??'absent',mode}),()=>{
  const fixture=structuredClone({...base,eventState});
  if(prior===undefined)delete fixture.shops[1].taxmode;else fixture.shops[1].taxmode=prior;
  const command=mode==='reset'?{kind:'lord-tax-reset',actorId:1,expectedRevision:7}:{...cmd,mode};
  const before=structuredClone(fixture),original=oracle(fixture,command);
  const got=projectLordTaxPolicy({reviewed,fixture,command});
  assert.equal(original.ok,1);assert.deepEqual(got.fixture,original.fixture);assert.deepEqual(got.logs,original.logs);
  assert.deepEqual(original.trace,['lock','read-adapter','auth-adapter',...(original.logs.length?['log']:[]),'renew','stage-adapter','commit-adapter','unlock','render']);
  assert.equal(got.committable,false);assert.deepEqual(fixture,before);
  for(const [i,s] of got.fixture.shops.entries()){
   const world=worldFor(s,eventState,got.fixture.taxRate);
   const args={reviewed:wireReview,townReview};
   const bytes=serializePeriodPlay({...args,world});
   const parsed=parsePeriodPlay({...args,bytes});
   const modeColumn=bytes.split('\n')[6].split(',')[wireReview.shopFields.indexOf('taxmode')];
   assert.equal(modeColumn,original.wire[i].mode);
   assert.equal(parsed.shops[0].taxmode,modeColumn===''?'':Number(modeColumn));
   assert.equal(parsed.taxRate,40);assert.equal(parsed.shops[0].taxtoday,1234);assert.equal(parsed.shops[0].taxyesterday,567);
   assert.deepEqual(parsed.events,eventState);assert.deepEqual(parsed.state,world.state);
   assert.equal(serializePeriodPlay({...args,world:parsed}),bytes);
   const ctx=createR4LordSaleTaxContext({reviewed:taxReview,townTaxRate:parsed.taxRate,
    taxMode:parsed.shops[0].taxmode===''?undefined:parsed.shops[0].taxmode,eventState:parsed.events});
   assert.equal(ctx.userTaxRate,eventState.rebel||modeColumn==='1'?0:modeColumn==='2'?80:40);
   if(modeColumn==='')assert.throws(()=>parsePeriodPlay({reviewed:legacy,townReview,bytes}),/taxmode/);
  }
 });
}
test('R4 lord tax policy and opt-in wire fail closed on unauthorized command and malformed taxes',()=>{
 const before=structuredClone(base);
 for(const command of [{...cmd,expectedRevision:6},{...cmd,actorId:2},{...cmd,targetId:99},{...cmd,mode:'anything'}])
  assert.throws(()=>projectLordTaxPolicy({reviewed,fixture:base,command}),/R4 lord tax policy/);
 assert.equal(oracle(base,{...cmd,targetId:99}).ok,0);
 assert.equal(oracle(base,{...cmd,mode:'anything'}).ok,1,'raw fallback normal is not a public command');
 assert.throws(()=>projectLordTaxPolicy({reviewed,fixture:{...base,leader:2},command:cmd}),/current lord/);
 assert.deepEqual(base,before);
 const args={reviewed:wireReview,townReview},world=worldFor(base.shops[0],{},40);
 const bytes=serializePeriodPlay({...args,world});
 assert.throws(()=>serializePeriodPlay({...args,world:{...world,taxRate:41}}),/lord tax rate/);
 assert.throws(()=>serializePeriodPlay({...args,world:{...world,shops:[{...world.shops[0],taxmode:3}]}}),/shop tax mode/);
 const lines=bytes.split('\n'),header=lines[1].split(',');header[3]='41';lines[1]=header.join(',');
 assert.throws(()=>parsePeriodPlay({...args,bytes:lines.join('\n')}),/lord tax rate/);
 const broken=bytes.split('\n'),cols=broken[6].split(',');cols[wireReview.shopFields.indexOf('taxmode')]='3';broken[6]=cols.join(',');
 assert.throws(()=>parsePeriodPlay({...args,bytes:broken.join('\n')}),/shop tax mode/);
 assert.throws(()=>serializePeriodPlay({reviewed:{...wireReview},townReview,world}),/source review/);
 assert.throws(()=>reviewPeriodPlay(sources,{lordTaxWire:true}),/cross-period lord tax wire/);
});
