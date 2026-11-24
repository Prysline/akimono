/**
 * B-34 original Core bootstrap, NOT the real admin.cgi install.
 * Reads frozen source as text; executes only reviewed pure JS projections.
 * The 79-cell zero wholesale is the arithmetic interpretation of original
 * EMPTY third CSV, NOT an invented 79-cell initial data line.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
  encodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const files=await Promise.all([
  'custom/inc-item-data.cgi',
  'custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const [itemDsl,rebelDsl,originalAdminInitSource,
  originalDataReadSource,originalDataWriteSource]=files;
const street=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,
  originalDataReadSource,originalDataWriteSource,
});
const repo=createMemoryWorldAdapter(createMemoryWorld({
  worldId:'b34-source-init-sparse-world',streetId:'standard-street',
  nowSeconds:1_000_000,
}));
function commit(command){
  const r=executeMemoryCommand({repository:repo,streetModule:street,command});
  if(r.code!=='COMMITTED')
    throw new Error('B34 failed source-backed command '+command.kind+': '+r.code);
  return r;
}
const bootstrap=commit({
  kind:'initialize-source-market',expectedRevision:0,
});
const sourceInitialCsv=repo.read().market.originalWholesaleCsv;
const opened=commit({
  kind:'open-shop',expectedRevision:1,shopId:42,
  ownerName:'原版空白市場測試店主',shopName:'原版來源初始化商店',
});
const results=[];
for(const rev of [2,3]){
  const c=commit({
    kind:'use-item',itemId:79,useId:0,expectedRevision:rev,
    shopId:42,requestedCount:1,
  });
  results.push({
    revision:c.world.revision,originalGift:c.world.shops[0].item[78],
    originalMaps:[12,9,14].map(id=>[id,c.world.shops[0].item[id-1]]),
    wholesaleNumeric79:c.world.market.wholesale.length,
    originalWholeCsv:c.world.market.originalWholesaleCsv,
    wholesaleDefinedSlots:c.world.market.sparseWrittenSlots,
    shopTime:c.world.shops[0].time,
  });
}
const third=executeMemoryCommand({
  repository:repo,streetModule:street,
  command:{kind:'use-item',itemId:79,useId:0,expectedRevision:4,
    shopId:42,requestedCount:1},
});
console.log(JSON.stringify({
  scope:'Fixed original Core inc-admin-func.cgi init statement (no disk writes) + reviewed real Standard Street gift USE with Perl sparse market wire tracking',
  initial:{
    source:bootstrap.details.source,
    originalWholeCsv:sourceInitialCsv,
    originalWrittenSlots:0,
    numericProjection:bootstrap.world.market.wholesale.length,
    shopCountAtOriginalBootstrap:bootstrap.world.shops.length,
  },
  opened:{gift:opened.world.shops[0].item[78],showcaseTool:opened.world.shops[0].item[62]},
  results,
  thirdInsufficientGift:third.code,
  finalRevision:repo.read().revision,
  immutableJsonBytes:Buffer.byteLength(encodeMemorySnapshot(repo.read()),'utf8'),
  limitations:'Only source-backed first-time blank wholesale and one gift USE; no actual Perl CGI/admin install/real world file/market turn/auth/period/UI',
},null,2));
