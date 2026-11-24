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
const module=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,originalConfigSource,
});
const repository=createMemoryWorldAdapter(createMemoryWorld({
  worldId:'b35-demonstration',streetId:'standard-street',nowSeconds:1000000,
}));
const call=(kind,expectedRevision,args={})=>executeMemoryCommand({
  repository,streetModule:module,command:{kind,expectedRevision,...args},
});
for(const step of [
  ['initialize-source-market',0,{}],
  ['open-shop',1,{shopId:42,ownerName:'來源測試店主',shopName:'標準街商店'}],
  ['reviewed-sparse-plus',2,{timespanSeconds:60,randomDraws:[0]}],
  ['reviewed-sparse-plus',3,{timespanSeconds:60,randomDraws:[0]}],
  ['reviewed-sparse-plus',4,{timespanSeconds:600,randomDraws:[0]}],
]){
  const result=call(...step);
  if(!result.ok)throw new Error(JSON.stringify(result));
}
const world=repository.read();
console.log(JSON.stringify({
  scope:'B-35 one item #10 post-sale PLUS-only synthetic fixture, not real turn or I/O',
  revision:world.revision,item10Wholesale:world.market.wholesale[9],
  giftWholesale:world.market.wholesale[78],
  giftOwned:world.shops[0].item[78],
  sparseWrittenSlots:world.market.sparseWrittenSlots,
  originalWholesaleCsv:world.market.originalWholesaleCsv,
},null,2));
