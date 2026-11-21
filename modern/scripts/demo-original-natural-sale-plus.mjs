import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand}
  from '../src/game-core-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi','modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi','modern/tests/original-perl/whole.cgi',
  '_config.cgi','modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/market.cgi','modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
];
const [
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,originalMarketSource,
  originalItemSource,originalDetailSource,
]=await Promise.all(paths.map(read));
const street=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,originalMarketSource,
  originalItemSource,originalDetailSource,
});
const perl=JSON.parse(execFileSync('perl',['original-natural-sale-plus-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
const repository=createMemoryWorldAdapter(createMemoryWorld({
  worldId:'b38-natural-demo',streetId:'standard-street',nowSeconds:1000000,
}));
function execute(repo,kind,revision,data={}){
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind,expectedRevision:revision,...data}});
  if(!result.ok)throw new Error(JSON.stringify(result));
  return result;
}
execute(repository,'initialize-source-market',0);
execute(repository,'open-shop',1,{shopId:42,ownerName:'來源測試店主',shopName:'B38真新店'});
const originalBeforeSale=repository.read();
const real=execute(repository,'reviewed-natural-sale-plus',2,{
  randomDraws:perl.sourceIdle.consumedSamples,
});
const w=real.world;
if(w.market.originalWholesaleCsv!==perl.sourceIdle.originalWholesaleCsv)
  throw new Error('B-38 real new shop source market mismatch');
const synthetic={...originalBeforeSale,shops:[{
  ...originalBeforeSale.shops[0],
  item:originalBeforeSale.shops[0].item.map((v,i)=>i===9?1:v),
  showcase:[10],price:[5000],
}]};
const artificialRepo=createMemoryWorldAdapter(synthetic);
const sold=execute(artificialRepo,'reviewed-natural-sale-plus',2,{
  randomDraws:perl.sourceSale.consumedSamples,
});
if(sold.world.market.originalWholesaleCsv!==perl.sourceSale.originalWholesaleCsv)
  throw new Error('B-38 artificially seeded sale source market mismatch');
console.log(JSON.stringify({
  scope:'B-38 isolated original natural sales region THEN original all-PLUS; callbacks/SortDT/period SKIPPED, no CGI or actual acquisition',
  realNewShop:{saleCount:real.details.natural.saleCount,
    rank:real.world.shops[0].rank,drawsUsed:real.details.drawsUsed},
  artificialItem10Shop:{saleCount:sold.details.natural.saleCount,
    money:sold.world.shops[0].money,rank:sold.world.shops[0].rank,
    drawsUsed:sold.details.drawsUsed},
  allPlusActive:59,sparseSlots:sold.world.market.sparseWrittenSlots.length,
},null,2));
