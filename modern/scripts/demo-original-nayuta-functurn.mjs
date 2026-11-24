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
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
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
const perl=JSON.parse(execFileSync('perl',['original-nayuta-functurn-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
const repository=createMemoryWorldAdapter(createMemoryWorld({
  worldId:'b39-nayuta-demo',streetId:'standard-street',nowSeconds:1000000,
}));
function exec(repo,kind,revision,payload={}){
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind,expectedRevision:revision,...payload}});
  if(!result.ok)throw Error(JSON.stringify(result));
  return result;
}
exec(repository,'initialize-source-market',0);
exec(repository,'open-shop',1,{shopId:42,
  ownerName:'B39來源店主',shopName:'B39來源新店'});
const base=repository.read();
const empty=exec(repository,'reviewed-nayuta-functurn',2,{
  randomDraws:perl.empty.consumedSamples,
});
const synthetic={...base,shops:[{
  ...base.shops[0],item:base.shops[0].item.map((v,i)=>i===69?1:v),
  showcase:[70],price:[50000],
}]};
const seeded=createMemoryWorldAdapter(synthetic);
const shown=exec(seeded,'reviewed-nayuta-functurn',2,{
  randomDraws:perl.displayed.consumedSamples,
});
if(shown.world.market.originalWholesaleCsv!==perl.displayed.originalWholesaleCsv||
  empty.world.market.originalWholesaleCsv!==perl.empty.originalWholesaleCsv)
  throw Error('B-39 original Perl sparse market mismatch');
console.log(JSON.stringify({
  scope:'B-39 real source ITEM70 FUNCTURN after original natural region; other callbacks/SortDT/period SKIPPED, artificial ITEM70 stock',
  realEmptyShop:{saleCount:empty.details.saleCount,
    rank:empty.world.shops[0].rank,sourceRandomDraws:empty.details.drawsUsed},
  artificialNayutaShop:{saleCount:shown.details.saleCount,
    rankAfterOriginalCallback:shown.world.shops[0].rank,
    callbackRankIncrease:shown.details.callback.rankIncrease,
    sourceRandomDraws:shown.details.drawsUsed,
    sparseMarketDefinedSlots:shown.world.market.sparseWrittenSlots.length,
  },
  wholePlusSourceItemCount:59,
},null,2));
