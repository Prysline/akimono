/** Frozen army-s plus/fire arithmetic + same candidate's army wire.
 * No player authorization, formal WorldState mutation or disk publication.
 * Exact source inputs and current revision are required; external provenance
 * is NOT proved by supplied fixture bytes. Keep the GameCore commit guard.
 */
import {createHash} from 'node:crypto';
import {PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {parseArmyFile,serializeArmyFile} from './original-r4-army-files.mjs';
export const R4_ARMY_PERSONNEL_SOURCE='r4-frozen-army-personnel-candidate.v1';
const pins=Object.freeze({
  armyCommand:'6f457b78f530e37aa0ff4074358a57797f5087e2',
  army:'cd29bcbfe52bac84794c4c79426bd559d7616d85',
  calc:'586354a9a300e26d0e12a4efa512fa25760e3197',
  config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a0',
});
const reviewedSources=new WeakSet();
const fail=m=>{throw new RangeError('R4 army personnel: '+m)};
const safe=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,k)=>plain(x)&&Object.keys(x).sort().join(',')===k.split(',').sort().join(',');
export function reviewR4ArmyPersonnel(sources){
  if(!exact(sources,Object.keys(pins).join(',')))fail('exact source set required');
  for(const [name,sha] of Object.entries(pins)){
    const s=sources[name];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)
      fail('frozen source drift '+name);
  }
  const reviewed=Object.freeze({source:R4_ARMY_PERSONNEL_SOURCE,committable:false});
  reviewedSources.add(reviewed);return reviewed;
}
export function projectR4ArmyPersonnel({reviewed,world,armyBytes,command}){
  if(!reviewedSources.has(reviewed))fail('source review required');
  if(world?.schema!==PERIOD_WORLD_SCHEMA||!safe(world.revision)||!safe(world.nowSeconds)||
     world.events!==null||!Array.isArray(world.shops)||world.shops.length!==1)fail('explicit single-shop v2 fixture required');
  const shop=world.shops[0],now=world.nowSeconds,events=world.period?.eventState;
  if(!plain(shop)||shop.id!==1||shop.status!==1||!safe(shop.dignity)||
     !safe(shop.dignity*1000)||!Number.isSafeInteger(shop.money)||!safe(shop.time))fail('active source shop fields required');
  if(!plain(events)||Object.keys(events).some(k=>k!=='rebel')||
     (Object.hasOwn(events,'rebel')&&!safe(events.rebel,1)))fail('explicit reviewed event context required');
  if(!exact(command,'kind,expectedRevision,shopId,requestedCount')||
     !['hire-army','fire-army'].includes(command.kind)||command.expectedRevision!==world.revision||
     command.shopId!==shop.id||!safe(command.requestedCount,1))fail('exact command/revision required');
  // null means an explicitly absent fixture file, not proof of legitimate
  // creation. Missing or unknown evidence is never substituted for empty.
  if(armyBytes!==null&&(typeof armyBytes!=='string'||Buffer.byteLength(armyBytes)>160000))fail('bounded explicit army bytes or absent fixture required');
  const army=parseArmyFile(armyBytes===null?'\n\n':armyBytes,[shop.id]);
  const prior=army.armyById[shop.id]??0;
  const hiring=command.kind==='hire-army';
  const seconds=hiring?2400:600;
  const unit=hiring?(events.rebel?1500:1000):0;
  const max=hiring?shop.dignity*1000-prior:prior;
  // The original handler, unlike its UI, admits zero available stocktime
  // and may create time debt. A refusal produces no published successor.
  if(shop.time>now)fail('source time unavailable');
  const count=hiring?Math.max(0,Math.min(command.requestedCount,max,Math.trunc(shop.money/unit))):
    Math.min(command.requestedCount,max);
  if(!safe(count,1))fail('source quantity or funds unavailable');
  const time=Math.max(shop.time,now-259200)+seconds;
  const money=shop.money-count*unit;
  const nextCount=prior+(hiring?count:-count);
  if(!safe(time)||!Number.isSafeInteger(money)||!safe(nextCount))fail('source arithmetic overflow');
  const nextShop={...structuredClone(shop),money,time};
  const nextArmy={...army.armyById,[shop.id]:nextCount};
  const bytes=serializeArmyFile({armyById:nextArmy,riotIds:army.riotIds},[shop.id]);
  const receipt=Object.freeze({action:command.kind,source:reviewed.source,committable:false,
    count,unitPrice:unit,cost:count*unit,timeSeconds:seconds,armyBefore:prior,armyAfter:nextCount});
  return Object.freeze({source:reviewed.source,committable:false,shops:[nextShop],
    armyBytes:bytes,receipt});
}
