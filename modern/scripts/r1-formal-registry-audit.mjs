// Read-only audit of the exact dev-local source wiring; no new runtime or fixture assets.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
export async function auditFormalRegistry(manifest,reviewedCrossPeriod=true){
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
// Windows Git checkouts can use CRLF while the frozen source review markers
// refer to the original LF Git blobs. Normalize only source inputs in memory.
const readPinnedSource=async rel=>normalizeLocalSourceText(await read(rel));
const [
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,originalBuySource,
  originalBuyItemSource,originalBuyCalcSource,
  originalMarketSource,originalItemSource,originalDetailSource,
  originalPeriodSource,originalUseSource,originalItemHelperSource,
  originalNewSource,originalCustomSource,originalLogSource,
]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/period.cgi',
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/core-inc-item.cgi',
  'modern/tests/original-perl/new.cgi','modern/tests/original-perl/pinned-custom.cgi','modern/tests/original-perl/pinned-log.cgi',
].map(readPinnedSource));

const streetModule=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,
  originalBuySource,originalBuyItemSource,originalBuyCalcSource,
  originalMarketSource,originalItemSource,originalDetailSource,
  originalUseSource,originalItemHelperSource,
  originalPeriodSource,originalNewSource,originalCustomSource,originalLogSource,
  enableReviewedNormalTime:true,enableReviewedCrossPeriod:reviewedCrossPeriod,
});

const entry=manifest.allBaselineBlobs.find(x=>x.path==='modern/scripts/dev-local.mjs');
const b=await readFile(path.join(root,entry.path));
if(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')!==entry.sha)throw Error('dev-local wiring drift: re-review audit setup');
const rows=manifest.features.map(f=>{
  if(f.kind==='ITEM'){const id=Number(f.id),e=streetModule.marketBuyRegistry.describe(id);return {kind:f.kind,id:f.id,compiled:Boolean(e),registered:Boolean(streetModule.marketBuyRegistry.getRule(id)),classification:e?.classification??null,reason:e?.reason??null};}
  if(f.kind==='USE'){const [id,use]=f.id.split('/').map(Number);const r=streetModule.useItem.getRule(id,use);return {kind:f.kind,id:f.id,registered:Boolean(r),reason:r?.scope??streetModule.useItem.describe(id,use)};}
  const e=streetModule.reviewedEventCatalog.declared.find(x=>x.code===f.id);return {kind:f.kind,id:f.id,compiled:e?.compiled??null};
});
return {rows,capabilities:streetModule.capabilities,marketEntries:streetModule.marketBuyRegistry.entries.length,zero13:streetModule.marketBuyRegistry.getRule(13)?.zeroPriceReviewed===true,market63:streetModule.marketBuyRegistry.getRule(63)};
}
