/**
 * B-18 read-only source-audited extension for SYNTHETIC one-shop history.
 *
 * Frozen Core inc-func.cgi::DataRead:
 *   @DT{qw(itemyesterday itemtoday exp)} = map{{split(/,/,$_)}} @list[3,4,5];
 *   $list[6] ? tie($DT{user},"AutoVar",
 *                 [\$DT{user},$list[6],"HASH",'[\t,]']) : ($DT{user}={});
 * Frozen AutoVar::FETCH lazily splits user source text into a HASH, while
 * original AutoVar::Get returns its RAW string until FETCH.
 *
 * This stricter, IO-FREE model accepts only small reviewed synthetic pairs:
 *   - history key is item ID 1..79; count is a safe nonnegative integer;
 *   - user names are ASCII fixture identifiers, values safe nonnegative
 *     integers, split by comma OR tab exactly as frozen AutoVar allows.
 * Odd-length/duplicate/empty/overflow pairs fail closed (unlike original).
 * The user identity values NEVER leave this module. We only return a COUNT.
 *
 * It REUSES, not changes, B-17 parseReviewedOneShopWorld by constructing a
 * separate copy with trailing sections empty; B-17 remains strict by itself.
 * Neither module parses real authentication data, hash persistence semantics
 * beyond this small subset, events, AutoVar callbacks or live world files.
 */
import {parseReviewedOneShopWorld} from './world-one-shop-parser.mjs';
import {MAX_ISOLATED_WORLD_BYTES} from './world-read-preflight.mjs';

const MAX_ITEM=79;
const MAX_FIXTURE_USERS=8;
function reject(message){throw new Error(message);}
function safeNumber(text,label){
  if(typeof text!=='string'|| !/^(?:0|[1-9][0-9]*)$/.test(text)){
    reject('Unsupported '+label+' in reviewed history');
  }
  const number=Number(text);
  if(!Number.isSafeInteger(number))reject('Unsafe '+label+' in reviewed history');
  return number;
}
function history(raw,label){
  if(raw==='')return Object.freeze([]);
  const x=raw.split(',');
  if(x.length%2!==0 || x.length>MAX_ITEM*2){
    reject('Unpaired or excess '+label+' entries');
  }
  const result=[];
  const used=new Set();
  for(let i=0;i<x.length;i+=2){
    const itemId=safeNumber(x[i],label+' item ID');
    const value=safeNumber(x[i+1],label+' value');
    if(itemId===0||itemId>MAX_ITEM)reject('Unreviewed '+label+' item ID');
    if(used.has(itemId))reject('Duplicate '+label+' item ID');
    used.add(itemId);
    result.push(Object.freeze({itemId,value}));
  }
  return Object.freeze(result.sort((a,b)=>a.itemId-b.itemId));
}
function userCount(raw){
  if(raw==='')return 0;
  // The frozen Core uses AutoVar 'HASH' separator /[\t,]/.
  const parts=raw.split(/[\t,]/);
  if(parts.length===0 || parts.length%2!==0 ||
     parts.length>MAX_FIXTURE_USERS*2){
    reject('Unpaired or excess user fixture entries');
  }
  const used=new Set();
  for(let i=0;i<parts.length;i+=2){
    if(!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(parts[i])){
      reject('Unsafe synthetic user fixture key');
    }
    safeNumber(parts[i+1],'user fixture value');
    if(used.has(parts[i]))reject('Duplicate user fixture key');
    used.add(parts[i]);
  }
  return used.size;
}

/** Validates a source-shaped one-shop fixture with optional map sections. */
export function parseReviewedShopHistoryWorld(text){
  if(typeof text!=='string'||text.length===0)reject('Missing history world text');
  const bytes=Buffer.byteLength(text,'utf8');
  if(bytes>MAX_ISOLATED_WORLD_BYTES)reject('World fixture exceeds size limit');
  // Tabs are allowed ONLY in the isolated final user-pairs section.
  // CR/LF delimiters and other control codes must not be hidden by
  // removing the optional user tail before invoking B-17.
  if(/[\r\x00-\x08\x0b-\x1f\x7f]/.test(text)){
    reject('Unreviewed world control characters or CRLF');
  }
  const endsLF=text.endsWith('\n');
  const lines=(endsLF?text.slice(0,-1):text).split('\n');
  // A world with one shop has either 7 lines (no town) or 8 (blank town).
  if(lines.length!==7 && lines.length!==8){
    reject('Reviewed history world must contain exactly one two-line shop');
  }
  const delimiter=lines[4]==='//'?4:lines[4]===''?5:-1;
  if(delimiter<0 || lines[delimiter]!=='//'){
    reject('Missing exact Core shop delimiter or unreviewed town');
  }
  if(lines.length!==delimiter+3){
    reject('Incomplete or multiple history shop records');
  }
  const payloadIndex=delimiter+2;
  const pieces=lines[payloadIndex].split(':');
  if(pieces.length!==7)reject('Core history payload needs seven colon sections');
  const [yesterday,today,exp,users]=pieces.slice(3);
  const safeUserCount=userCount(users);
  const historyRecords=Object.freeze({
    itemyesterday:history(yesterday,'itemyesterday'),
    itemtoday:history(today,'itemtoday'),
    exp:history(exp,'exp'),
  });
  // B-17 checks all other world and shop data, including the exact 32
  // source header fields, safe first three payload sections and the absence
  // of event/town/shop dynamic execution.
  const sanitized=[...lines];
  sanitized[payloadIndex]=pieces.slice(0,3).join(':')+'::::';
  const base=parseReviewedOneShopWorld(sanitized.join('\n')+(endsLF?'\n':''));
  return Object.freeze({
    scope:'reviewed synthetic history only; no AutoVar execution, auth, IO or commit',
    mode:'strict one-shop Core map history',
    lasttime:base.lasttime,
    metadata:base.metadata,
    wholesaleStock:base.wholesaleStock,
    shop:base.shop,
    shopCount:1,
    history:historyRecords,
    syntheticUserEntryCount:safeUserCount,
    bytes,
  });
}
