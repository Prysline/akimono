/** Frozen army.cgi facility quote, separate from army-s handler authority.
 * Original UI requires full stock time; the handler may create time debt.
 * A read-only source projection is NOT a CAS command, nor a proof of army
 * acquisition. The owning runtime must validate world and disk provenance.
 */
import {createHash} from 'node:crypto';
import {parseArmyFile} from './original-r4-army-files.mjs';
export const R4_ARMY_VIEW_SOURCE='r4-frozen-army-facility-view.v1';
const pins=Object.freeze({
  viewSource:'ed89b1213ec236eb224dac048314be4073c30566',
  calcSource:'586354a9a300e26d0e12a4efa512fa25760e3197',
  configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',
});
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 army view: '+m);};
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewR4ArmyView(sources){
  if(!plain(sources)||Object.keys(sources).sort().join(',')!==Object.keys(pins).sort().join(','))fail('exact source set required');
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)
      fail('source drift '+k);
  }
  const result=Object.freeze({source:R4_ARMY_VIEW_SOURCE,committable:false});
  reviews.add(result);return result;
}
// Source dropdown stops at the FIRST duplicate or unavailable value;
// do not deduplicate before walking the sorted source candidate list.
function sourceOptions(values,maximum){
  let old=0;const options=[];
  for(const n of [...values].sort((a,b)=>a-b)){
    if(n>maximum||n===old)break;
    options.push(n);old=n;
  }
  return options;
}
export function describeR4ArmyView({reviewed,world,armyBytes}){
  if(!reviews.has(reviewed))fail('source review required');
  if(world?.schema!=='akimono.memory-world.v2'||world.events!==null||
     !safe(world.nowSeconds)||!safe(world.revision)||!Array.isArray(world.shops)||world.shops.length!==1)
    fail('explicit independent shop context required');
  const shop=world.shops[0],events=world.period?.eventState;
  if(!plain(shop)||shop.id!==1||shop.status!==1||!safe(shop.dignity)||
     !safe(shop.dignity*1000)||!safe(shop.time)||!Number.isSafeInteger(shop.money))
    fail('active shop dignity, money and clock required');
  // The original facility reads only rebel from DTevent; normal market
  // events do not change this quote. Full event provenance belongs to the
  // owner, and this read-only function cannot authorize an EVENT transition.
  if(!plain(events)||Object.values(events).some(v=>!safe(v)))fail('known event context required');
  if(armyBytes!==null&&(typeof armyBytes!=='string'||Buffer.byteLength(armyBytes)>160000))
    fail('explicit bounded army bytes or absent file required');
  const army=parseArmyFile(armyBytes??'\n\n',[shop.id]);
  const count=army.armyById[shop.id]??0,maximum=shop.dignity*1000;
  const headroom=maximum-count,rebellion=Boolean(events.rebel),unitPrice=rebellion?1500:1000;
  const affordable=Math.trunc(shop.money/unitPrice);
  const time=Math.min(world.nowSeconds-shop.time,259200);
  const hireReason=headroom<=0?'dignity-capacity':shop.money<unitPrice?'funds':time<2400?'time':null;
  const fireReason=count===0?'no-army':time<600?'time':null;
  return Object.freeze({source:reviewed.source,committable:false,
    dignity:shop.dignity,maximum,count,riot:army.riotIds.includes(shop.id),
    rebellion,unitPrice,stockTimeSeconds:time,
    hireTimeSeconds:2400,fireTimeSeconds:600,
    hireMaximum:Math.max(0,Math.min(headroom,affordable)),fireMaximum:count,
    canHire:hireReason===null,canFire:fireReason===null,hireReason,fireReason,
    hireOptions:Object.freeze(hireReason===null?sourceOptions([1000,5000,10000,20000,headroom,affordable],Math.min(headroom,affordable)):[]),
    fireOptions:Object.freeze(fireReason===null?sourceOptions([1000,5000,10000,20000,count],count):[]),
  });
}
