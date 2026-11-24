import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand}
  from '../src/game-core-contract.mjs';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,
]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
].map(read));
const module=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,
});
const perl=JSON.parse(execFileSync('perl',['original-sparse-all-plus-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
const repo=createMemoryWorldAdapter(createMemoryWorld({
  worldId:'b37-all-plus-demo',streetId:'standard-street',nowSeconds:1000000,
}));
const run=(kind,expectedRevision,values={})=>executeMemoryCommand({
  repository:repo,streetModule:module,command:{kind,expectedRevision,...values},
});
for(const [kind,revision,payload] of [
  ['initialize-source-market',0,{}],
  ['open-shop',1,{shopId:42,ownerName:'原版測試店主',shopName:'標準街來源店'}],
  ['reviewed-sparse-all-plus',2,{timespanSeconds:60,
    randomDraws:perl.first.consumedSamples}],
  ['reviewed-sparse-all-plus',3,{timespanSeconds:600,
    randomDraws:perl.second.consumedSamples}],
  ['reviewed-sparse-all-plus',4,{timespanSeconds:3600,
    randomDraws:perl.third.consumedSamples}],
]){
  const result=run(kind,revision,payload);
  if(!result.ok)throw new Error(JSON.stringify(result));
}
const state=repo.read();
if(state.market.originalWholesaleCsv!==perl.third.wireCsv)
  throw new Error('B-37 final source Perl sparse wire mismatch');
console.log(JSON.stringify({
  scope:'B-37 59 real source PLUS in original order, post-sale source fragment only; no full CGI, clock, sales or persistence',
  itemWithPlus:module.reviewedAllPlus.activeCount,
  itemWithoutPlus:module.reviewedAllPlus.absentCount,
  revision:state.revision,
  worldClockUnchanged:state.nowSeconds===1000000,
  wholesaleItem10:state.market.wholesale[9],
  sparseDefinedPositions:state.market.sparseWrittenSlots.length,
  originalWholesaleCsv:state.market.originalWholesaleCsv,
},null,2));
