/**
 * B-34 source-verified first-world initialization, not complete CGI/admin.
 * Fixed inc-admin-func.cgi::init writes a BLANK third wholesale CSV line.
 * DataRead split(/,/, '', MAX_ITEM) yields a zero-length Perl array.
 * The 79-slot zero NUMERIC projection is distinct from the original wire.
 */
import {parseWorldWholesaleLine} from './world-wholesale-codec.mjs';

export const ORIGINAL_SPARSE_MARKET_SOURCE='core-admin-init-sparse-b34';
const BOOTSTRAP_META='500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0';
const ORIGINAL_LITERAL=String.raw`print DATA time()."\n500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0\n\n\n//\n";`;
function fail(message){throw new Error('B-34 original world bootstrap: '+message);}
export function reviewOriginalSparseWorldBootstrap({
  adminSource,readSource,writeSource,maxItem=79,
}){
  if(maxItem!==79)fail('only Standard Street 79 ITEM slots reviewed');
  for(const [source,marker,label] of [
    [adminSource,'sub init\n','admin init'],
    [adminSource,ORIGINAL_LITERAL,'init wholesale blank world data'],
    [adminSource,'if(!-e "$DATA_DIR/$DATA_FILE$FILE_EXT")',
      'non-overwriting initial world gate'],
    [readSource,'@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM);',
      'DataRead wholesale CSV'],
    [writeSource,'print OUT join(",",@DTwholestore)."\\n";',
      'DataWrite wholesale CSV'],
  ]){
    if(typeof source!=='string'||!source.includes(marker))
      fail('fixed '+label+' source drift');
  }
  const blank=parseWorldWholesaleLine('',maxItem);
  if(blank.suppliedSlots!==0||blank.stock.length!==79||
     blank.stock.some(x=>x!==0))fail('unexpected sparse decoder');
  return Object.freeze({
    source:ORIGINAL_SPARSE_MARKET_SOURCE,sourceFile:'inc-admin-func.cgi',
    sourceFunction:'init',sourceDataRead:'inc-func.cgi::DataRead',
    sourceDataWrite:'plug/write.cgi::DataWrite',
    initialMeta:BOOTSTRAP_META,originalWholesaleCsv:'',
    initiallyDefinedSlots:0,maxItem:79,
    numericView:Object.freeze([...blank.stock]),
    meaning:'blank wholesale source line; Perl zero-length sparse array; zero numeric projection does not mean 79 serialized zeros',
  });
}

/** Source-verified B-34 market, only applicable to a fresh empty memory
 * world revision 0. Does not read/write the real original world file.
 */
export function createOriginalSparseMarket(reviewed){
  if(!reviewed||reviewed.source!==ORIGINAL_SPARSE_MARKET_SOURCE||
     reviewed.originalWholesaleCsv!==''||
     reviewed.initiallyDefinedSlots!==0||
     reviewed.maxItem!==79)fail('reviewed original init contract');
  return {
    source:ORIGINAL_SPARSE_MARKET_SOURCE,
    wholesale:[...reviewed.numericView],originalWholesaleCsv:'',
    sparseWrittenSlots:[],originalBootstrapMeta:reviewed.initialMeta,
    numericProjection:'zero where Perl wholesale slot undefined, not original wire representation',
  };
}

/** SOURCE array write-tracing for ONLY B-33 deterministic gift #79 / USE #0.
 * Original production overflow writes first; then CheckWholeStore writes for
 * cap and negative-store conditions. Preserve sparse array slot definedness.
 */
export function traceOriginalSparseGiftWholesale({world,compiled,original}){
  const market=world?.market;
  if(market?.source!==ORIGINAL_SPARSE_MARKET_SOURCE)
    fail('not an original sparse bootstrap market');
  const written=market.sparseWrittenSlots;
  if(!Array.isArray(written)||!Array.isArray(market.wholesale)||
     market.wholesale.length!==79||
     !Array.isArray(original?.multiItem?.discarded))
    fail('invalid sparse source snapshot');
  const slots=new Set();
  for(const index of written){
    if(!Number.isSafeInteger(index)||index<0||index>=79||slots.has(index))
      fail('invalid or repeated source written slot');
    slots.add(index);
  }
  // Original creation overflow: DTwholestore[itemno-1] += trash.
  for(const row of original.multiItem.discarded)slots.add(row.itemId-1);
  const shopStocks=original.shops,afterOverflow=original.multiItem.marketAfterOverflow;
  if(!Array.isArray(afterOverflow)||afterOverflow.length!==79)
    fail('intermediate original wholesale state missing');
  for(let index=0;index<79;index++){
    const config=compiled.limits[index];
    if(!config.code)continue;
    const sum=shopStocks.reduce((a,row)=>a+row[index],0);
    const cap=config.wslimit<0?-config.wslimit:
      Math.trunc(config.wslimit*(shopStocks.length||1)+0.99);
    if(sum+afterOverflow[index]>cap || afterOverflow[index]<0)
      slots.add(index);
  }
  const sorted=[...slots].sort((a,b)=>a-b);
  const wholesale=[...original.wholesale];
  const last=sorted.length?sorted.at(-1):-1;
  const wire=Array.from({length:last+1},(_,i)=>slots.has(i)
    ?String(wholesale[i]):'').join(',');
  return Object.freeze({
    source:ORIGINAL_SPARSE_MARKET_SOURCE,
    wholesale,originalWholesaleCsv:wire,sparseWrittenSlots:sorted,
    originalBootstrapMeta:market.originalBootstrapMeta,
    numericProjection:market.numericProjection,
  });
}

export function validateSourceSparseMarket(market){
  if(market?.source!==ORIGINAL_SPARSE_MARKET_SOURCE)return false;
  if(market.originalBootstrapMeta!==BOOTSTRAP_META||
     !Array.isArray(market.sparseWrittenSlots)||
     !Array.isArray(market.wholesale)||market.wholesale.length!==79)
    return false;
  const positions=market.sparseWrittenSlots;
  if(positions.some((v,i)=>!Number.isSafeInteger(v)||v<0||v>=79||
     (i>0&&v<=positions[i-1])))return false;
  if(market.wholesale.some(v=>!Number.isSafeInteger(v)||v<0))
    return false;
  // GetWholeStore/SetWholeStore writes the entire 79-position array,
  // including undef fields at the end: Perl join retains trailing commas.
  // Distinguish this from the B-34/B-37 compact sparse initializer shape.
  const wireMode=market.sourceWriteShape;
  if(wireMode!==undefined&&wireMode!=='whole-store-79')return false;
  const present=new Set(positions),last=wireMode==='whole-store-79'?
    78:positions.length?positions.at(-1):-1;
  const expected=Array.from({length:last+1},(_,i)=>
    present.has(i)?String(market.wholesale[i]):'').join(',');
  return market.originalWholesaleCsv===expected &&
    market.wholesale.every((v,i)=>present.has(i)||v===0);
}
