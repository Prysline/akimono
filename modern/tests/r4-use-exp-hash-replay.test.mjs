import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewUseExpHash,r4UseExpHashSeed,resolveR4UseExpOrder} from '../src/original-r4-use-exp-hash-replay.mjs';
import {originalUseExperience} from '../src/shared-use-experience.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={useSource:read('./original-perl/use.cgi'),readSource:read('./original-perl/inc-func.cgi')};
const review=reviewUseExpHash(sources);
const probe=fileURLToPath(new URL('./original-perl/original-r4-use-exp-hash-probe.pl',import.meta.url));
test('R4 full commerce equal EXP overflow follows native frozen UseItem tail under explicit replay seed',()=>{
  const cases=[
    {records:{9:900,12:900,15:900,16:900},itemId:62,points:100,count:1},
    {records:{9:900,12:900,15:900,62:900},itemId:62,points:100,count:1},
    {records:{9:700,12:700,15:700,16:700,17:700,62:100},itemId:62,points:100,count:1},
    {records:{9:1000,12:1000,15:1000,62:600},itemId:62,points:100,count:1},
  ];
  for(let revision=10;revision<18;revision++)for(const row of cases){
    const world={worldId:'source-exp-ties',revision,nowSeconds:1000000};
    const command={kind:'use-item',expectedRevision:revision,shopId:1,itemId:row.itemId,useId:0,requestedCount:row.count};
    const resolveOrder=args=>resolveR4UseExpOrder({...args,review,world,command});
    const actual=originalUseExperience({...row,resolveOrder});
    const expected=JSON.parse(execFileSync('perl',[probe],{input:JSON.stringify({entries:Object.entries(row.records),target:row.itemId,points:row.points,count:row.count}),encoding:'utf8',env:{...process.env,PERL_HASH_SEED:r4UseExpHashSeed({world,command}),PERL_PERTURB_KEYS:'0'}}));
    assert.deepEqual(actual.exp,expected.exp);
    assert.equal(actual.previous,expected.expold);
    assert.deepEqual(actual,originalUseExperience({...row,resolveOrder}));
    assert.equal(Object.values(actual.exp).reduce((a,b)=>a+b,0),3600);
  }
  assert.throws(()=>originalUseExperience(cases[0]),/ambiguous Perl hash tie/);
  assert.throws(()=>originalUseExperience({...cases[0],resolveOrder:()=>['62']}),/invalid reviewed EXP order/);
  assert.throws(()=>reviewUseExpHash({...sources,useSource:sources.useSource+' '}),/source drift/);
});

test('R4 local self rumor defense writes EXP #62 before #65 gain and native tie redistribution (isolated)',()=>{
  for(let revision=21;revision<29;revision++)for(const before of [{9:900,12:900,15:900,16:900},{9:900,12:900,15:900,16:800,62:100}]){
    const records={...before,62:Math.max(0,(before[62]??0)-100)};
    const world={worldId:'source-local-rumor-exp-ties',revision,nowSeconds:1000000,shops:[{id:1,exp:before}]};
    const command={kind:'use-item',expectedRevision:revision,shopId:1,itemId:65,useId:0,requestedCount:1,targetShopId:1};
    const actual=originalUseExperience({records,itemId:65,points:200,count:1,
      resolveOrder:args=>resolveR4UseExpOrder({...args,review,world,command})});
    const expected=JSON.parse(execFileSync('perl',[probe],{input:JSON.stringify({
      entries:Object.entries(before),selfRumorFailure:true,target:65,points:200,count:1
    }),encoding:'utf8',env:{...process.env,PERL_HASH_SEED:r4UseExpHashSeed({world,command}),PERL_PERTURB_KEYS:'0'}}));
    assert.deepEqual(actual.exp,expected.exp);
    assert.equal(actual.previous,expected.expold);
    assert.equal(Object.values(actual.exp).reduce((a,b)=>a+b,0),3600);
  }
});
