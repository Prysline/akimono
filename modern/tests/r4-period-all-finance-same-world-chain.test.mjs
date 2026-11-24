import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileReviewedGiftMapUse} from '../src/reviewed-gift-map-use.mjs';
import {createMemoryWorld,createMemoryWorldAdapter}
  from '../src/game-core-contract.mjs';
import {
  reviewOriginalSoloPeriodPhaseChain,projectOriginalSoloPeriodPhaseChain,
  B50_INTEGRATED_SOURCE,
} from '../src/original-period-solo-chain.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const names=[
  'periodSource','configSource','itemDsl','rebelDsl','compilerSource',
  'originalAddItemSource','detailSource','readSource','adminSource',
];
const paths=[
  'modern/tests/original-perl/period.cgi','_config.cgi',
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
];
const sources=Object.fromEntries(names.map((name,i)=>[name,paths[i]]));
for(const key of names)sources[key]=await read(sources[key]);
const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
const compiled=compileReviewedGiftMapUse({
  itemDsl:sources.itemDsl,rebelDsl:sources.rebelDsl,model,
});
const contract=reviewOriginalSoloPeriodPhaseChain({
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(it=>it.limit),
});
const oracle=JSON.parse(execFileSync('perl',['original-b50-period-chain-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));

const allFinanceContract=reviewOriginalSoloPeriodPhaseChain({
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(it=>it.limit),
  includeReviewedDragon:true,includeReviewedDignity:true,
  includeReviewedGuild:true,
});
const financeOracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-all-finance-source-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));



test('R4 two real frozen pre-backup periods jointly execute dragon, dignity and guild fee',()=>{
  assert.equal(allFinanceContract.nonCommittable,true);
  assert.equal(allFinanceContract.phases.length,11);
  assert.equal(allFinanceContract.guild.committable,false);
  const oracle=financeOracle();
  assert.equal(oracle.cases.length,2);
  for(const [i,row] of oracle.cases.entries()){
    const before=JSON.stringify(row.input);
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:allFinanceContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop,
      'period '+(i+1)+' exact frozen Perl shop after ALL financial sections');
    assert.deepEqual(got.town,row.output.town,
      'period '+(i+1)+' source city');
    assert.equal(got.dtPeople,row.output.dtPeople);
    assert.equal(got.pointsBefore,row.output.pointsBefore);
    assert.equal(got.pointsAfter,row.output.pointsAfter);
    assert.deepEqual(got.guildContext,row.output.guildContext,
      'guild combat attrs persist in original same-world period');
    assert.deepEqual(got.guildMoneyEdits,row.output.guildMoneyEdits,
      'actual original EditGuildMoney IO calls, NOT claims of storage');
    assert.equal(got.dragonPayoutFileConsumed,true);
    assert.equal(got.dignityEffect.dignityAfter,row.output.shop.dignity);
    assert.equal(got.nonCommittable,true);
    assert.equal(got.worldStateWritten,false);
    assert.equal(before,JSON.stringify(row.input),'pure source snapshots');
  }
  const [a,b]=oracle.cases;
  assert.deepEqual(a.output.guildMoneyEdits,
    [{guildId:'guild-a',amount:525}],
    'first guild fee uses 10500 post-dragon saleyesterday * 50 / 1000');
  assert.deepEqual(b.output.guildMoneyEdits,
    [{guildId:'guild-a',amount:0}],
    'second guild fee sees no sales after negative dragon');
  assert.equal(a.output.guildContext.atk,960);
  assert.equal(a.output.guildContext.def,450);
  assert.equal(b.input.guildContext.atk,960);
  assert.equal(b.output.guildContext.atk,921);
  assert.equal(b.output.guildContext.def,405);
  assert.equal(b.output.shop.dragon,-500);
  assert.equal(b.output.shop.dignity,23);
  assert.equal(b.output.shop.payyesterday,517);
});

test('source-period guild fee, DragonBalance and dignity are stable between actual Perl processes',()=>{
  for(let i=0;i<2;i++)for(const row of financeOracle().cases){
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:allFinanceContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.guildContext,row.output.guildContext);
    assert.deepEqual(got.guildMoneyEdits,row.output.guildMoneyEdits);
  }
});

test('guild cash is an IO call only; unsupported membership/corrupt financial source fails closed',()=>{
  const row=financeOracle().cases[0].input;
  const before=JSON.stringify(row);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:contract,...row,
  }),/external guild/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:allFinanceContract,...row,guildContext:null,
  }),/source guild membership/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:allFinanceContract,...row,
    guildContext:{...row.guildContext,id:'non-member'},
  }),/source guild membership/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:allFinanceContract,...row,
    guildContext:{...row.guildContext,feeRate:1001},
  }),/source guild membership/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:{...allFinanceContract,
      guild:{...allFinanceContract.guild,committable:true}},...row,
  }),/guild member source dues review/);
  assert.equal(JSON.stringify(row),before);
});
