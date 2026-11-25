/** Original palace task configuration and guarded local player transition.
 * Uses the existing reviewed shop score, shared TownData wire and server
 * command-draw policy. Does not authorize guilds, armies or multi-shop play.
 * The HTTP/CAS/history owner must verify the whole successor.
 */
import {createHash} from 'node:crypto';
import {calculateSourceShopPoint} from './original-period-solo-sort.mjs';
import {getTownData,setTownData} from './original-r4-town-files.mjs';
import {sourceCommandDraws} from './local-source-command-draws.mjs';
export const PALACE_COMMAND='complete-palace-mission';
const pins={viewSource:'e197a6f05c6d155e3a38aadebf92682a4b20b565',
  handlerSource:'f3a918d6fcffd435e478dce53b812a89c1429ef2',
  configSource:'d8ccf91ccb8978c2de542d5a19db59ca168ec47e',
  readSource:'e7a8add7b0291901e71fe797783b664dff1568a0'};
const fail=m=>{throw new RangeError('R4 palace: '+m)};
const reviews=new WeakSet();
const safe=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,k)=>plain(x)&&Object.keys(x).sort().join(',')===k;
export function reviewOriginalPalaceRules(sources){
  if(!exact(sources,Object.keys(pins).sort().join(',')))fail('exact source set required');
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const rows=[...sources.configSource.matchAll(/^\(\$msg\[(\d+)\],\$itemno\[(\d+)\],\$count\[(\d+)\]\)=\(l\('([^']*)'\),(\d+),(\d+)\);$/gm)];
  const threshold=Number(sources.configSource.match(/^\$deny_point=(\d+);$/m)?.[1]);
  if(rows.length!==6||threshold!==20000||rows.some((row,i)=>row.slice(1,4).some(n=>Number(n)!==i)||!safe(Number(row[5]),1)||Number(row[5])>79||!safe(Number(row[6]),1)))fail('unreviewed palace configuration');
  const r=Object.freeze({source:'r4-frozen-palace-mission.v1',threshold,
    tasks:Object.freeze(rows.map((row,index)=>Object.freeze({index,message:row[4],itemId:Number(row[5]),count:Number(row[6])})))});
  reviews.add(r);return r;
}
function check(r){if(!reviews.has(r))fail('source review required')}
export function validatePalaceTown({reviewed,townReview,town}){
  check(reviewed);
  // DTtown is separate from STATE city fields and DTevent. Only evt is
  // currently reviewed in the independent player runtime.
  if(!plain(town)||Object.keys(town).some(k=>k!=='evt')||
     (Object.hasOwn(town,'evt')&&(!/^[0-5]$/.test(town.evt)||typeof town.evt!=='string')))fail('unreviewed shared palace town wire');
  const raw=getTownData({reviewed:townReview,town,key:'evt'});
  if(raw!==''&&!/^[0-5]$/.test(raw))fail('invalid mission index');
  return raw===''?0:Number(raw);
}
export function describeOriginalPalace({reviewed,townReview,world}){
  check(reviewed);
  const index=validatePalaceTown({reviewed,townReview,town:world.period?.disk?.townData});
  if(world.shops.length===0)return null;
  if(world.shops.length!==1||world.shops[0].id!==1||world.shops[0].status!==1)fail('single active source shop required');
  const shop=world.shops[0],task=reviewed.tasks[index];
  if(!Array.isArray(shop.item)||shop.item.length!==79||!safe(shop.item[task.itemId-1])||!safe(shop.dignity))fail('source inventory and dignity required');
  const point=calculateSourceShopPoint(shop),owned=shop.item[task.itemId-1];
  return Object.freeze({index,message:task.message,itemId:task.itemId,count:task.count,owned,
    point,requiredPoint:reviewed.threshold,dignity:shop.dignity,
    canMeet:point>=reviewed.threshold,canComplete:point>=reviewed.threshold&&owned>=task.count});
}
export function projectOriginalPalaceMission({reviewed,townReview,world,command}){
  check(reviewed);
  if(world.schema!=='akimono.memory-world.v2'||world.events!==null||
     !exact(command,'expectedRevision,kind,shopId')||command.kind!==PALACE_COMMAND||command.shopId!==1||
     !safe(world.revision)||command.expectedRevision!==world.revision)fail('exact source command and revision required');
  const status=describeOriginalPalace({reviewed,townReview,world});
  if(!status?.canMeet)fail('original audience requires 20000 source-derived points');
  if(!status.canComplete)fail('mission inventory insufficient');
  const shop=structuredClone(world.shops[0]);
  if(!safe(shop.dignity+1))fail('dignity overflow');
  // Original int(rand(6)); use the established repeatable server millionth
  // draw policy, not a supplied Perl stream or client-provided RNG.
  const [sample]=sourceCommandDraws({world,kind:PALACE_COMMAND,args:{shopId:1},count:1});
  const nextIndex=Math.floor(sample*reviewed.tasks.length/1000000);
  shop.item[status.itemId-1]-=status.count;
  shop.dignity++;
  const town=setTownData({reviewed:townReview,town:world.period.disk.townData,key:'evt',value:String(nextIndex)}).town;
  return {shops:[shop],town,receipt:{action:PALACE_COMMAND,source:reviewed.source,
    point:status.point,missionIndex:status.index,nextMissionIndex:nextIndex,itemId:status.itemId,
    consumedCount:status.count,dignityBefore:status.dignity,dignityAfter:shop.dignity}};
}
