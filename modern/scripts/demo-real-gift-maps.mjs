/**
 * B-33 real Standard Street source item #79 / first USE only.
 * Explicit 79-slot ZERO wholesale data below is a TEST FIXTURE,
 * not a known live market value or original start-world algorithm.
 * No original CGI, callback compiler top-level, auth, storage, or UI.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
  createMemoryWorld,validateMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand,encodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const street=createStandardStreetModule({itemDsl,rebelDsl});
const world=createMemoryWorld({
  worldId:'b33-real-gift-use-review',streetId:'standard-street',
  nowSeconds:1_000_000,
});
const initialRepo=createMemoryWorldAdapter(world);
const opened=executeMemoryCommand({
  repository:initialRepo,streetModule:street,
  command:{kind:'open-shop',expectedRevision:0,shopId:42,
    ownerName:'禮物卷測試店主',shopName:'真實商品交換來源測試商店'},
});
if(!opened.ok)throw new Error('Unexpected source new-shop rejection');
const missingMarket=executeMemoryCommand({
  repository:initialRepo,streetModule:street,
  command:{kind:'gift-exchange-maps',expectedRevision:1,shopId:42,
    requestedCount:1},
});
if(missingMarket.code!=='SOURCE_BOUNDARY_REJECTED')
  throw new Error('Unknown real market must be refused');
const explicitFixture=validateMemoryWorld({
  ...opened.world,
  market:{source:'explicit-b33-test-fixture',wholesale:Array(79).fill(0)},
});
const repo=createMemoryWorldAdapter(explicitFixture);
const results=[];
for(const revision of [1,2]){
  const x=executeMemoryCommand({
    repository:repo,streetModule:street,
    command:{kind:'gift-exchange-maps',expectedRevision:revision,shopId:42,
      requestedCount:1},
  });
  if(x.code!=='COMMITTED')throw new Error('Unexpected reviewed gift trade rejection');
  results.push({
    revision:x.world.revision,effectiveCount:x.details.effectiveCount,
    giftStock:x.world.shops[0].item[78],
    maps:[12,9,14].map(id=>({id,stock:x.world.shops[0].item[id-1]})),
    spentTime:x.world.shops[0].time,
    money:x.world.shops[0].money,
    originalWholesaleChecks:x.details.originalWholeStoreChecks,
  });
}
const stale=executeMemoryCommand({
  repository:repo,streetModule:street,
  command:{kind:'gift-exchange-maps',expectedRevision:1,shopId:42,
    requestedCount:1},
});
const noStock=executeMemoryCommand({
  repository:repo,streetModule:street,
  command:{kind:'gift-exchange-maps',expectedRevision:3,shopId:42,
    requestedCount:1},
});
console.log(JSON.stringify({
  origin:'real Standard Street custom/inc-item-data.cgi ITEM #79 gift, USE #0 交換地圖集',
  rule:{input:[[79,2]],output:[[12,1],[9,1],[14,1]],
    compilerTimeSeconds:street.reviewedGiftMapUse.time},
  explicitlyArtificialBoundary:'wholesale[0..78] is test-injected zero data, NOT a true world market; no CGI, real save, auth, events, other USE actions, or actual player session',
  withoutMarket:missingMarket.code,
  transactions:results,
  rejected:{stale:stale.code,insufficientGift:noStock.code},
  finalSnapshotBytes:Buffer.byteLength(encodeMemorySnapshot(repo.read()),'utf8'),
},null,2));
