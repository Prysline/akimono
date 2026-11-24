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
import {
  reviewR4CloseShopArchiveSource,appendR4CloseShopArchiveSandbox,
} from '../src/original-r4-close-shop-archive-file.mjs';

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
const archiveReviewed=reviewR4CloseShopArchiveSource(sources);
const probe=name=>JSON.parse(execFileSync('perl',[name],{
  cwd:path.join(root,'modern/tests/original-perl'),
  encoding:'utf8',maxBuffer:4*1024*1024,
}));

test('R4 existing B-50 same-shop two-period source chain feeds its actual CloseShop archive to real Node filesystem without WorldState commit',async()=>{
  const original=probe('original-r4-period-real-close-chain-probe.pl');
  const logContext=probe('original-r4-close-shop-archive-file-probe.pl').cases[0].context;
  assert.equal(original.cases.length,2);
  const dir=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-archive-'));
  try{
    await mkdir(path.join(dir,'log'));
    let archived=0;
    for(const [i,row] of original.cases.entries()){
      const result=projectOriginalSoloPeriodPhaseChain({
        reviewed,...row.input,
      });
      assert.equal(result.nonCommittable,true);
      assert.equal(result.worldStateWritten,false);
      assert.deepEqual(result.shop,row.output.shop,
        'shared source chain real original period '+(i+1)+' shop outcome');
      if(!result.actualCloseEffect) {
        assert.equal(row.output.closeArchived??null,null,
          'first source period did not close or write archive');
        continue;
      }
      assert.equal(i,1,'second continuous same shop/source world closes');
      assert.equal(result.actualCloseEffect.archived,row.output.closeArchived,
        'existing full original-period Perl oracle captured exact CloseShop payload');
      const disk=await appendR4CloseShopArchiveSandbox({
        reviewed:archiveReviewed,effect:result.actualCloseEffect,
        sandboxDirectory:dir,...logContext,
      });
      assert.equal(disk.committable,false);
      assert.equal(disk.worldStateWritten,false);
      assert.ok(disk.bytesAppended>0);
      const onDisk=await readFile(path.join(dir,'log','delete.cgi'),'utf8');
      assert.ok(onDisk.includes(row.output.closeArchived));
      assert.equal(onDisk.split('\n')[0].split('\t').length,7,
        'actual log archive line has seven original source TSV fields');
      archived++;
    }
    assert.equal(archived,1,'actual shared source chain archived one expired shop');
  } finally {await rm(dir,{recursive:true,force:true});}
});
