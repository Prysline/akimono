import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileReviewedGiftMapUse} from '../src/reviewed-gift-map-use.mjs';
import {
  reviewOriginalSoloPeriodPhaseChain,projectOriginalSoloPeriodPhaseChain,
} from '../src/original-period-solo-chain.mjs';
import {reviewGuildLedger,parseGuildLedger,persistGuildPeriod} from '../src/original-r4-guild-ledger-file.mjs';
import {writeFile} from 'node:fs/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourcePaths={
  periodSource:'modern/tests/original-perl/period.cgi',
  writeSource:'modern/tests/original-perl/write.cgi',
  configSource:'_config.cgi',
  itemDsl:'custom/inc-item-data.cgi',
  rebelDsl:'custom/inc-rebel-data.cgi',
  compilerSource:'modern/tests/original-perl/inc-makeitem.cgi',
  originalAddItemSource:'modern/tests/original-perl/use.cgi',
  detailSource:'modern/tests/original-perl/core-detail.cgi',
  readSource:'modern/tests/original-perl/inc-func.cgi',
  adminSource:'modern/tests/original-perl/core-inc-admin-func.cgi',
  errorSource:'modern/tests/original-perl/pinned-error.cgi',
  userSource:'modern/tests/original-perl/pinned-user.cgi',
};
const sources=Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(
  async([key,p])=>[key,await readFile(path.join(root,p),'utf8')],
)));
const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
const compiled=compileReviewedGiftMapUse({
  itemDsl:sources.itemDsl,rebelDsl:sources.rebelDsl,model,
});
const reviewed=reviewOriginalSoloPeriodPhaseChain({
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(x=>x.limit),
  includeReviewedDragon:true,includeReviewedDignity:true,
  includeReviewedGuild:true,includeReviewedPostTech:true,
  includeReviewedShopExpiry:true,includeReviewedActualCloseShop:true,
});
const ledgerSource=await readFile(path.join(root,'modern/tests/original-perl/pinned-guild.cgi'),'utf8');
const ledgerReviewed=reviewGuildLedger(ledgerSource);
const probe=name=>JSON.parse(execFileSync('perl',[name],{
  cwd:path.join(root,'modern/tests/original-perl'),
  encoding:'utf8',maxBuffer:4*1024*1024,
}));

test('B50 two periods use real Perl ledger IO and Node ledger restart',async()=>{
  const oracle=probe('original-r4-b50-guild-ledger-probe.pl');
  assert.equal(oracle.cases.length,2);
  const dir=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-guild-'));
  try{
    const live=path.join(dir,'guildbal.cgi');
    await writeFile(live,oracle.initialLedger);
    for(const row of oracle.cases){
      assert.deepEqual(parseGuildLedger(await readFile(live,'utf8'),'guild-a'),row.ledgerBefore);
      const result=projectOriginalSoloPeriodPhaseChain({reviewed,...row.input});
      assert.deepEqual(result.guildMoneyEdits,row.output.guildMoneyEdits);
      assert.deepEqual(result.guildContext,row.output.guildContext);
      const disk=await persistGuildPeriod({reviewed:ledgerReviewed,directory:dir,id:'guild-a',inputGuild:row.input.guildContext,outputGuild:result.guildContext,edits:result.guildMoneyEdits});
      assert.deepEqual(disk.ledger,row.ledgerAfter);
      assert.deepEqual(disk.ledger,parseGuildLedger(row.ledgerBytes,'guild-a'));
      assert.equal(disk.committable,false);
    }
    const row=oracle.cases[1],before=await readFile(live,'utf8');
    await assert.rejects(persistGuildPeriod({reviewed:ledgerReviewed,directory:dir,id:'guild-a',inputGuild:{...row.input.guildContext,atk:-1},outputGuild:row.output.guildContext,edits:[]}),/unreviewed period input/);
    assert.equal(await readFile(live,'utf8'),before);
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('guild ledger rejects drift, duplicate keys and incomplete rows',()=>{
  assert.throws(()=>reviewGuildLedger(ledgerSource+' '),/source drift/);
  assert.throws(()=>parseGuildLedger('guild-a\tmoney\t1\n','guild-a'),/shape/);
  assert.throws(()=>parseGuildLedger('guild-a\tmoney\t1\tmoney\t2\tin\t0\tatk\t0\tdef\t0\n','guild-a'),/invalid ledger field/);
});
