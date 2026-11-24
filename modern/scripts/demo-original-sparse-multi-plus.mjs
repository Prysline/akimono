import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand}
  from '../src/game-core-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,originalConfigSource]
  =await Promise.all([
    'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
    'modern/tests/original-perl/core-inc-admin-func.cgi',
    'modern/tests/original-perl/inc-func.cgi',
    'modern/tests/original-perl/write.cgi',
    'modern/tests/original-perl/inc-turn.cgi',
    'modern/tests/original-perl/whole.cgi','_config.cgi',
  ].map(read));
const street=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,originalConfigSource,
});
const repo=createMemoryWorldAdapter(createMemoryWorld({
  worldId:'b36-multi-plus-demo',streetId:'standard-street',nowSeconds:1000000,
}));
const run=(kind,expectedRevision,details={})=>executeMemoryCommand({
  repository:repo,streetModule:street,command:{kind,expectedRevision,...details},
});
for(const [kind,rev,fields] of [
  ['initialize-source-market',0,{}],
  ['open-shop',1,{shopId:42,ownerName:'測試店主',shopName:'原版標準街店'}],
  ['reviewed-sparse-multi-plus',2,{timespanSeconds:60,randomDraws:[0,0,0,0]}],
  ['reviewed-sparse-multi-plus',3,{timespanSeconds:60,randomDraws:[0,900000,0,999999]}],
  ['reviewed-sparse-multi-plus',4,{timespanSeconds:600,randomDraws:[0,0,0]}],
]){
  const result=run(kind,rev,fields);
  if(!result.ok)throw new Error(JSON.stringify(result));
}
const w=repo.read();
console.log(JSON.stringify({
  scope:'B-36: only real #1,#10,#40 PLUS active; other 76 artificially zero; not a complete turn',
  revision:w.revision,worldClockUnchanged:w.nowSeconds===1000000,
  stockByItemId:Object.fromEntries([1,10,40,79].map(id=>[id,w.market.wholesale[id-1]])),
  sparseWrittenSlots:w.market.sparseWrittenSlots,
  originalWholesaleCsv:w.market.originalWholesaleCsv,
},null,2));
