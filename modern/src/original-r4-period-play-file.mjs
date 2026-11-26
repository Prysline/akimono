import {R4_MANUAL_COMMERCE_EVENT_CODES,isReviewedManualCommerceEvents,projectManualCommerceEventItems,reviewManualCommerceEvents,reviewedManualSaleRule,isReviewedManualSaleRule} from './original-r4-manual-commerce-events.mjs';
/** B-50-specific play wire: explicit full 32/11 fields, one or zero shops.
 * Older strict one-shop codec is unchanged. This does not authorize CAS.
 */
import {reviewR4DataWriteFiles} from './original-r4-data-write-files.mjs';
import {parseTownLine,serializeTownLine} from './original-r4-town-files.mjs';
import {parseWorldWholesaleLine} from './world-wholesale-codec.mjs';
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const reviews=new WeakSet(),fail=m=>{throw new RangeError('R4 period play: '+m)};
const textFields=new Set(['name','shopname','pass','comment','remoteaddr','guild','blocklogin','nocheckip']);
const safeText=(v,k)=>{if(typeof v!=='string'||/[\r\n,\t:]/.test(v))fail('invalid text '+k);return v};
function integer(v,k,min=0){
  const n=typeof v==='string'&&/^-?(0|[1-9]\d*)$/.test(v)?Number(v):v;
  if(!Number.isSafeInteger(n)||n<min)fail('invalid integer '+k);
  return n;
}
function decimal(v,crossPeriod=false){
  const s=String(v);
  const pattern=crossPeriod?/^(0|[1-9]\d*)(\.\d{1,20})?(e[+-]?\d{1,3})?$/:/^(0|[1-9]\d*)(\.\d{1,12})?$/;
  if(!pattern.test(s)||!Number.isSafeInteger(Math.trunc(Number(s)))||Number(s)<0)fail('invalid costtoday decimal');
  return s;
}
const fieldMin=(k,signedCash)=>k==='profitstock'||(k==='money'&&signedCash)?-Number.MAX_SAFE_INTEGER:0;
function field(v,k,crossPeriod=false,signedCash=false){
  if(textFields.has(k)||crossPeriod&&k==='job')return safeText(v,k);
  if(k==='rankingyesterday'&&v==='')return '';
  if(k==='costtoday')return decimal(v,crossPeriod);
  return String(integer(v,k,fieldMin(k,signedCash)));
}
const plain=o=>o&&Object.getPrototypeOf(o)===Object.prototype;
function wireMap(m,k,crossPeriod=false){
  if(!plain(m)||Object.keys(m).length>(crossPeriod?79:1))fail('one-key item/user map '+k);
  return Object.entries(m).flatMap(([id,v])=>{
    if(k==='user'){
      if(crossPeriod&&(!id||!v||['__proto__','constructor','prototype'].includes(id)))fail('invalid user map');
      return [safeText(id,k),safeText(v,k)];
    }
    const n=integer(id,k,1);if(n>79||crossPeriod&&String(n)!==id)fail('item ID');
    return [String(n),String(integer(v,k))];
  }).join(',');
}
function wireArray(a,k,n){
  if(!Array.isArray(a)||a.length!==n)fail('array size '+k);
  return a.map(v=>integer(v,k)).join(',');
}
const normalEvents=new Set(['boom-posyon','ken-sale','tate-sale','yoroi-sale','tue-sale','plusdown-yakusou','plusup-tetu','plusup-misuriru','plusup-oriharukon','happy']);
const knownEvent=(code,reviewed)=>normalEvents.has(code)||Boolean(reviewed.manualCommerce&&R4_MANUAL_COMMERCE_EVENT_CODES.includes(code));
function eventWire(events,reviewed){
  if(!plain(events)||Object.keys(events).length>normalEvents.size+(reviewed.manualCommerce?4:0))fail('known EVENT map required');
  return Object.entries(events).flatMap(([code,until])=>{
    if(!knownEvent(code,reviewed))fail('unreviewed EVENT '+code);
    return [code,String(integer(until,'EVENT expiry',1))];
  }).join(',');
}
function readEvents(line,reviewed){
  if(line==='')return {};
  const a=line.split(','),out={};if(a.length%2)fail('invalid EVENT pairs');
  for(let i=0;i<a.length;i+=2){if(!knownEvent(a[i],reviewed)||Object.hasOwn(out,a[i]))fail('duplicate or unknown EVENT');out[a[i]]=integer(a[i+1],'EVENT expiry',1);}
  return out;
}
function sparseWire(world){
  const p=parseWorldWholesaleLine(world.wholesaleCsv,79);
  if(!Array.isArray(world.wholesale)||world.wholesale.length!==79||p.stock.some((v,i)=>v!==world.wholesale[i]))fail('sparse wholesale numeric view mismatch');
  return p.originalCsv;
}
export function reviewPeriodPlay(sources,{crossPeriod=false,ordinaryMultiShelf=false,signedCash=false,manualCommerce=null}={}){
  if(manualCommerce!==null&&(!crossPeriod||!isReviewedManualCommerceEvents(manualCommerce)))fail('manual commerce wire review');
  if(typeof crossPeriod!=='boolean'||typeof ordinaryMultiShelf!=='boolean'||typeof signedCash!=='boolean'||(ordinaryMultiShelf||signedCash)&&!crossPeriod)fail('explicit cross-period wire opt-in');
  // DataWrite joins the actual arrays; DataRead splits both full arrays.
  // This only extends ordinary disk encoding, not the single-shelf time gate.
  if(ordinaryMultiShelf&&(!sources.writeSource.includes('join(",",@{$DT->{showcase}})')||!sources.writeSource.includes('join(",",@{$DT->{price}})')||!sources.incFuncSource.includes('@DT{qw(showcase price)}=map{[split(/,/,$_)]}@list[0,1];')))fail('source showcase wire drift');
  const data=reviewR4DataWriteFiles(sources);
  const r=Object.freeze({shopFields:data.shopFields,stateFields:data.stateFields,committable:false,crossPeriod,ordinaryMultiShelf,signedCash,manualCommerce});reviews.add(r);return r;
}
function check(r){if(!reviews.has(r))fail('source review required')}
export function serializePeriodPlay({reviewed,townReview,world}){
  check(reviewed);
  if(!plain(world)||!plain(world.events)||(!reviewed.crossPeriod&&Object.keys(world.events).length!==0)||!Array.isArray(world.shops)||world.shops.length>1)fail('explicit empty EVENT and zero/one active shop required');
  const lines=[String(integer(world.lasttime,'lasttime',1)),
    [integer(world.people,'people'),integer(world.nextid,'nextid',1),safeText(world.blockip,'blockip'),integer(world.taxRate,'taxRate'),reviewed.stateFields.map(k=>integer(world.state?.[k],k)).join(':')].join(','),
    reviewed.crossPeriod?sparseWire(world):wireArray(world.wholesale,'wholesale',79),reviewed.crossPeriod?eventWire(world.events,reviewed):'',serializeTownLine({reviewed:townReview,town:world.town}),'//'];
  if(world.shops.length){
    const s=world.shops[0];
    const shelves=integer(s.showcasecount,'showcasecount',1);
    if(s.status!==1||integer(s.id,'id',1)!==1||integer(s.foundation,'foundation',1)<1||integer(s.money,'money',fieldMin('money',reviewed.signedCash))>(reviewed.signedCash?999999999:1000000000)||shelves>(reviewed.ordinaryMultiShelf?8:1))fail('unreviewed B50 shop');
    lines.push(reviewed.shopFields.map(k=>field(s[k],k,reviewed.crossPeriod,reviewed.signedCash)).join(','));
    lines.push([wireArray(s.showcase,'showcase',shelves),wireArray(s.price,'price',shelves),wireArray(s.item,'item',79),...['itemyesterday','itemtoday','exp','user'].map(k=>wireMap(s[k],k,reviewed.crossPeriod))].join(':'));
  }
  return lines.join('\n')+'\n';
}
function readMap(s,k,crossPeriod=false){
  if(s==='')return {};
  const a=s.split(','),out={};
  if(a.length%2||a.length>(crossPeriod?158:2))fail('invalid map '+k);
  for(let i=0;i<a.length;i+=2){const id=a[i];if(!id||Object.hasOwn(out,id)||['__proto__','constructor','prototype'].includes(id))fail('invalid map '+k);out[id]=k==='user'?a[i+1]:integer(a[i+1],k);}
  wireMap(out,k,crossPeriod);return out;
}
export function parsePeriodPlay({reviewed,townReview,bytes}){
  check(reviewed);
  if(typeof bytes!=='string'||!bytes.endsWith('\n'))fail('invalid play bytes');
  const rows=bytes.slice(0,-1).split('\n');
  if(![6,8].includes(rows.length)||(!reviewed.crossPeriod&&rows[3]!=='')||rows[5]!=='//')fail('unreviewed play layout or EVENT');
  const h=rows[1].split(',');if(h.length!==5)fail('world header');
  const values=h[4].split(':');if(values.length!==11)fail('state fields');
  const world={lasttime:integer(rows[0],'lasttime',1),people:integer(h[0],'people'),nextid:integer(h[1],'nextid',1),blockip:h[2],taxRate:integer(h[3],'taxRate'),state:Object.fromEntries(reviewed.stateFields.map((k,i)=>[k,integer(values[i],k)])),wholesale:reviewed.crossPeriod?[...parseWorldWholesaleLine(rows[2],79).stock]:rows[2].split(',').map(v=>integer(v,'wholesale')),events:reviewed.crossPeriod?readEvents(rows[3],reviewed):{},...(reviewed.crossPeriod?{wholesaleCsv:rows[2]}:{}),town:parseTownLine({reviewed:townReview,line:rows[4]}),shops:[]};
  if(rows.length===8){
    const cols=rows[6].split(',');if(cols.length!==32)fail('shop fields');
    const s=Object.fromEntries(reviewed.shopFields.map((k,i)=>[k,textFields.has(k)||reviewed.crossPeriod&&k==='job'||k==='rankingyesterday'&&cols[i]===''?cols[i]:k==='costtoday'?Number(decimal(cols[i],reviewed.crossPeriod)):integer(cols[i],k,fieldMin(k,reviewed.signedCash))]));
    const parts=rows[7].split(':');if(parts.length!==7)fail('shop segments');
    s.status=1;
    for(const [i,k] of ['showcase','price','item'].entries())s[k]=parts[i].split(',').map(v=>integer(v,k));
    for(const [i,k] of ['itemyesterday','itemtoday','exp','user'].entries())s[k]=readMap(parts[i+3],k,reviewed.crossPeriod);
    world.shops.push(s);
  }
  // Validate every parsed field with the same strict writer. Compare wire
  // except town hash ordering (semantic map, never Perl order equivalence).
  const canonical=serializePeriodPlay({reviewed,townReview,world}).split('\n');const raw=bytes.split('\n');
  canonical[4]=raw[4];
  if(reviewed.crossPeriod&&rows.length===8){
    // Numeric hash keys may be emitted in any Perl order; compare semantics,
    // not JS property enumeration order. Validate all pairs above first.
    const cols=canonical[6].split(','),sourceCols=raw[6].split(',');
    cols[reviewed.shopFields.indexOf('costtoday')]=sourceCols[reviewed.shopFields.indexOf('costtoday')];canonical[6]=cols.join(',');
    const seg=canonical[7].split(':'),original=raw[7].split(':');
    for(let i=3;i<7;i++)seg[i]=original[i];canonical[7]=seg.join(':');
  }
  if(canonical.join('\n')!==bytes)fail('noncanonical play wire');
  return world;
}
async function rootFor(directory){
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-period-disk-'))fail('isolated sandbox required');
  return root;
}
async function noMarker(root){try{await lstat(path.join(root,'commit.cgi'));fail('pending commit requires recovery')}catch(e){if(e.code!=='ENOENT')throw e}}
export async function stagePeriodPlay({reviewed,townReview,directory,world}){
  const bytes=serializePeriodPlay({reviewed,townReview,world}),root=await rootFor(directory);await noMarker(root);
  const stage=path.join(root,'stage');await mkdir(stage,{recursive:true});if(!(await lstat(stage)).isDirectory())fail('real stage required');
  await writeFile(path.join(stage,'play.cgi'),bytes,{flag:'wx'});
  return {bytes,committable:false,worldStateWritten:false};
}
export async function readPeriodPlay({reviewed,townReview,directory}){
  const root=await rootFor(directory);await noMarker(root);
  const p=path.join(root,'play.cgi');if(!(await lstat(p)).isFile())fail('regular live play required');
  return parsePeriodPlay({reviewed,townReview,bytes:new TextDecoder('utf-8',{fatal:true}).decode(await readFile(p))});
}
