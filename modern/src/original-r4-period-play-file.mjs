/** B-50-specific play wire: explicit full 32/11 fields, one or zero shops.
 * Older strict one-shop codec is unchanged. This does not authorize CAS.
 */
import {reviewR4DataWriteFiles} from './original-r4-data-write-files.mjs';
import {parseTownLine,serializeTownLine} from './original-r4-town-files.mjs';
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
function decimal(v){
  const s=String(v);
  if(!/^(0|[1-9]\d*)(\.\d{1,12})?$/.test(s)||!Number.isSafeInteger(Math.trunc(Number(s))))fail('invalid costtoday decimal');
  return s;
}
function field(v,k){
  if(textFields.has(k))return safeText(v,k);
  if(k==='rankingyesterday'&&v==='')return '';
  if(k==='costtoday')return decimal(v);
  return String(integer(v,k,k==='profitstock'?-Number.MAX_SAFE_INTEGER:0));
}
const plain=o=>o&&Object.getPrototypeOf(o)===Object.prototype;
function wireMap(m,k){
  if(!plain(m)||Object.keys(m).length>1)fail('one-key item/user map '+k);
  return Object.entries(m).flatMap(([id,v])=>{
    if(k==='user')return [safeText(id,k),safeText(v,k)];
    const n=integer(id,k,1);if(n>79)fail('item ID');
    return [String(n),String(integer(v,k))];
  }).join(',');
}
function wireArray(a,k,n){
  if(!Array.isArray(a)||a.length!==n)fail('array size '+k);
  return a.map(v=>integer(v,k)).join(',');
}
export function reviewPeriodPlay(sources){
  const data=reviewR4DataWriteFiles(sources);
  const r=Object.freeze({shopFields:data.shopFields,stateFields:data.stateFields,committable:false});reviews.add(r);return r;
}
function check(r){if(!reviews.has(r))fail('source review required')}
export function serializePeriodPlay({reviewed,townReview,world}){
  check(reviewed);
  if(!plain(world)||!plain(world.events)||Object.keys(world.events).length!==0||!Array.isArray(world.shops)||world.shops.length>1)fail('explicit empty EVENT and zero/one active shop required');
  const lines=[String(integer(world.lasttime,'lasttime',1)),
    [integer(world.people,'people'),integer(world.nextid,'nextid',1),safeText(world.blockip,'blockip'),integer(world.taxRate,'taxRate'),reviewed.stateFields.map(k=>integer(world.state?.[k],k)).join(':')].join(','),
    wireArray(world.wholesale,'wholesale',79),'',serializeTownLine({reviewed:townReview,town:world.town}),'//'];
  if(world.shops.length){
    const s=world.shops[0];
    if(s.status!==1||integer(s.id,'id',1)!==1||integer(s.foundation,'foundation',1)<1||integer(s.money,'money')>1000000000||integer(s.showcasecount,'showcasecount')!==1)fail('unreviewed B50 shop');
    lines.push(reviewed.shopFields.map(k=>field(s[k],k)).join(','));
    lines.push([wireArray(s.showcase,'showcase',1),wireArray(s.price,'price',1),wireArray(s.item,'item',79),...['itemyesterday','itemtoday','exp','user'].map(k=>wireMap(s[k],k))].join(':'));
  }
  return lines.join('\n')+'\n';
}
function readMap(s,k){
  if(s==='')return {};
  const a=s.split(',');if(a.length!==2||!a[0]||['__proto__','constructor','prototype'].includes(a[0]))fail('invalid map '+k);
  return {[a[0]]:k==='user'?a[1]:integer(a[1],k)};
}
export function parsePeriodPlay({reviewed,townReview,bytes}){
  check(reviewed);
  if(typeof bytes!=='string'||!bytes.endsWith('\n'))fail('invalid play bytes');
  const rows=bytes.slice(0,-1).split('\n');
  if(![6,8].includes(rows.length)||rows[3]!==''||rows[5]!=='//')fail('unreviewed play layout or EVENT');
  const h=rows[1].split(',');if(h.length!==5)fail('world header');
  const values=h[4].split(':');if(values.length!==11)fail('state fields');
  const world={lasttime:integer(rows[0],'lasttime',1),people:integer(h[0],'people'),nextid:integer(h[1],'nextid',1),blockip:h[2],taxRate:integer(h[3],'taxRate'),state:Object.fromEntries(reviewed.stateFields.map((k,i)=>[k,integer(values[i],k)])),wholesale:rows[2].split(',').map(v=>integer(v,'wholesale')),events:{},town:parseTownLine({reviewed:townReview,line:rows[4]}),shops:[]};
  if(rows.length===8){
    const cols=rows[6].split(',');if(cols.length!==32)fail('shop fields');
    const s=Object.fromEntries(reviewed.shopFields.map((k,i)=>[k,textFields.has(k)||k==='rankingyesterday'&&cols[i]===''?cols[i]:k==='costtoday'?Number(decimal(cols[i])):integer(cols[i],k,k==='profitstock'?-Number.MAX_SAFE_INTEGER:0)]));
    const parts=rows[7].split(':');if(parts.length!==7)fail('shop segments');
    s.status=1;
    for(const [i,k] of ['showcase','price','item'].entries())s[k]=parts[i].split(',').map(v=>integer(v,k));
    for(const [i,k] of ['itemyesterday','itemtoday','exp','user'].entries())s[k]=readMap(parts[i+3],k);
    world.shops.push(s);
  }
  // Validate every parsed field with the same strict writer. Compare wire
  // except town hash ordering (semantic map, never Perl order equivalence).
  const canonical=serializePeriodPlay({reviewed,townReview,world}).split('\n');const raw=bytes.split('\n');
  canonical[4]=raw[4];if(canonical.join('\n')!==bytes)fail('noncanonical play wire');
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
