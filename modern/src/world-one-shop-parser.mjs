/**
 * B-17: strictly source-reviewed ONE-SHOP world envelope.
 *
 * Frozen Core inc-func.cgi::DataRead:
 *  1 time, 2 metadata, 3 wholesale, 4 event pairs (can require Perl),
 *  optionally town AutoVar string, exact "//" delimiter, then
 *  each shop's 32-field @DTindexnamelist CSV + one colon payload.
 * Frozen plug/write.cgi::DataWrite emits exactly these two lines/shop.
 *
 * This is a deliberately tiny read-only fixture subset:
 * - event line empty; optional town line only when EMPTY;
 * - exactly ONE shop; header has id,lastlogin,name,shopname,pass,money,time,
 *   rank, and every other Core header field empty;
 * - colon payload has exactly 7 positions; ONLY showcase, price and item
 *   lists may be populated (same nonzero count, <=79). Other parts blank;
 * - only strict ASCII fixture names; no passwords or full shop records are
 *   returned. No Perl AutoVar, event require, GetDTPoint or callbacks run.
 *
 * This does not weaken or change B-16's strict 5-line preflight. This separate
 * parser is for a known isolated source fixture, NOT real world load/commit.
 */
import {parseIsolatedWorldReadEnvelope,MAX_ISOLATED_WORLD_BYTES} from './world-read-preflight.mjs';

export const REVIEWED_SHOP_HEADER_FIELDS=Object.freeze([
  'id','lastlogin','name','shopname','pass','money','time','rank',
  'showcasecount','comment','saleyesterday','saletoday','costyesterday',
  'rankingcount','remoteaddr','dignity','rankingyesterday','paytoday',
  'payyesterday','profitstock','taxmode','costtoday','drmoney','taxyesterday',
  'trush','taxtoday','guild','blocklogin','nocheckip','foundation','job','icon',
]);
const SOURCE_HEADER_VALUES=Object.freeze([0,1,2,3,4,5,6,7]);
function reject(message){throw new Error(message)}
function natural(value,label){
  if(typeof value!=='string'|| !/^(?:0|[1-9][0-9]*)$/.test(value)) {
    reject('Unsupported '+label+' in reviewed shop');
  }
  const n=Number(value);
  if(!Number.isSafeInteger(n))reject('Unsafe '+label+' in reviewed shop');
  return n;
}
function list(raw,label){
  if(raw==='')reject('Missing '+label+' fixture slots');
  const parts=raw.split(',');
  if(parts.length>79)reject('Unreviewed '+label+' slot count');
  return Object.freeze(parts.map((x,i)=>natural(x,label+' #'+(i+1))));
}
function shopHeader(raw){
  const cells=raw.split(',');
  if(cells.length!==REVIEWED_SHOP_HEADER_FIELDS.length){
    reject('Core shop header must have exactly 32 source fields');
  }
  for(let i=0;i<cells.length;i++){
    if(!SOURCE_HEADER_VALUES.includes(i)&&cells[i]!==''){
      reject('Unreviewed Core shop header field: '+REVIEWED_SHOP_HEADER_FIELDS[i]);
    }
  }
  const id=natural(cells[0],'id');
  if(id===0)reject('Reviewed shop ID must be positive');
  natural(cells[1],'lastlogin');
  for(const [i,label] of [[2,'name'],[3,'shopname'],[4,'pass']]){
    if(!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(cells[i])){
      reject('Unsupported synthetic '+label+' fixture');
    }
  }
  const money=natural(cells[5],'money');
  natural(cells[6],'time');
  natural(cells[7],'rank');
  // Never return "pass"; this is a synthetic fixture only, not an
  // authentication/session parser and must not leak real credentials.
  return {id,name:cells[2],shopname:cells[3],money};
}
function shopPayload(raw){
  const p=raw.split(':');
  if(p.length!==7)reject('Core shop payload needs seven colon sections');
  for(let i=3;i<=6;i++){
    if(p[i]!=='')reject('Unreviewed Core shop payload section #'+(i+1));
  }
  const showcase=list(p[0],'showcase');
  const prices=list(p[1],'price');
  const inventory=list(p[2],'item');
  if(showcase.length!==prices.length||prices.length!==inventory.length) {
    reject('Reviewed shop lists must have equal slot counts');
  }
  return {showcase,prices,inventory};
}

/** Pure parsing; rejects all but a reviewed, one-shop Standard Street fixture. */
export function parseReviewedOneShopWorld(text){
  if(typeof text!=='string'||text.length===0)reject('Missing world fixture text');
  const bytes=Buffer.byteLength(text,'utf8');
  if(bytes>MAX_ISOLATED_WORLD_BYTES)reject('World fixture exceeds size limit');
  if(/[\r\x00-\x09\x0b-\x1f\x7f]/.test(text)){
    reject('Unreviewed world control character or CRLF');
  }
  const raw=text.endsWith('\n')?text.slice(0,-1):text;
  const lines=raw.split('\n');
  if(lines.length<7||lines.length>8)reject('Reviewed world must contain one two-line shop');
  let delimiterLine=4;
  if(lines[4]===''){
    delimiterLine=5;
  }else if(lines[4]!=='//'){
    reject('Dynamic town content is not reviewed');
  }
  if(lines[delimiterLine]!=='//')reject('Missing exact Core // separator');
  if(lines.length!==delimiterLine+3){
    reject('Incomplete or multiple Core shop records');
  }
  // Reuse all B-16 source-reviewed time, metadata, wholesale and event
  // validation rather than copying it and silently weakening its contract.
  const minimal=lines.slice(0,4).concat('//').join('\n')+'\n';
  const world=parseIsolatedWorldReadEnvelope(minimal);
  const header=shopHeader(lines[delimiterLine+1]);
  const body=shopPayload(lines[delimiterLine+2]);
  return Object.freeze({
    scope:'single synthetic shop only; no callbacks, I/O or live-world permission',
    mode:'strict one-shop Core line layout',
    lasttime:world.lasttime,
    metadata:world.metadata,
    wholesaleStock:world.worldStock,
    originalStockSlots:world.originalStockSlots,
    bytes,
    delimiterLine:delimiterLine+1,
    shopCount:1,
    shop:Object.freeze({...header,...body}),
    sourceHeaderFields:REVIEWED_SHOP_HEADER_FIELDS,
  });
}
