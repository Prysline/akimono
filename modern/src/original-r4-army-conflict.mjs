/** Frozen original army-s conflict commands, and the separate original
 * facility visibility gate. This is an externally seeded differential
 * candidate, NEVER a player command, CAS transition or save authority.
 */
import {reviewR4ArmyPersonnel} from './original-r4-army-personnel.mjs';
import {reviewR4ArmyView} from './original-r4-army-view.mjs';
import {parseArmyFile,serializeArmyFile} from './original-r4-army-files.mjs';
export const R4_ARMY_CONFLICT_SOURCE='r4-frozen-army-conflict-command-candidate.v1';
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 army conflict: '+m)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const plain=o=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).sort().join(',')===keys.split(',').sort().join(',');
const kinds=['start-rebellion','join-rebellion','dispatch-guard'];
const townKeys='leader,money,in,out,develop,devem,safety,safem,army,robina,robinb';
export function reviewR4ArmyConflict(sources){
  if(!exact(sources,'armyCommand,army,calc,config,view'))fail('exact source set required');
  const {armyCommand,army,calc,config,view}=sources;
  reviewR4ArmyPersonnel({armyCommand,army,calc,config});
  reviewR4ArmyView({viewSource:view,calcSource:calc,configSource:config});
  const reviewed=Object.freeze({source:R4_ARMY_CONFLICT_SOURCE,committable:false});
  reviews.add(reviewed);return reviewed;
}
function context({reviewed,world,armyBytes,shopId}){
  if(!reviews.has(reviewed))fail('source review required');
  if(world?.schema!=='akimono.memory-world.v2'||world.events!==null||
     !safe(world.revision)||!safe(world.nowSeconds)||!safe(world.nowSeconds+259200)||
     !Array.isArray(world.shops)||!world.shops.length||world.shops.length>100)
    fail('explicit v2 fixture required');
  const ids=world.shops.map(s=>s?.id);
  if(ids.some(id=>!safe(id)||id===0)||new Set(ids).size!==ids.length)fail('unique current shop IDs required');
  const shop=world.shops.find(s=>s.id===shopId);
  if(!plain(shop)||shop.status!==1||!safe(shop.time)||
     typeof shop.shopname!=='string'||!shop.shopname||/[\r\n\t]/.test(shop.shopname))
    fail('active fixture actor required');
  const {town,eventState:events}=world.period??{};
  if(!exact(town,townKeys)||Object.values(town).some(n=>!safe(n)))fail('explicit source town required');
  if(!plain(events)||Object.keys(events).some(k=>k!=='rebel')||
     (Object.hasOwn(events,'rebel')&&(!safe(events.rebel)||events.rebel===0)))
    fail('explicit rebel-only event context required');
  if(armyBytes!==null&&(typeof armyBytes!=='string'||Buffer.byteLength(armyBytes)>160000))
    fail('explicit army bytes or missing file required');
  const army=parseArmyFile(armyBytes??'\n\n',ids);
  return {ids,shop,town,events,army,count:army.armyById[shopId]??0,
    riot:army.riotIds.includes(shopId),now:world.nowSeconds};
}
export function describeR4ArmyConflict(input){
  const {shop,town,events,count,riot,now}=context(input);
  const stockTimeSeconds=Math.min(now-shop.time,259200);
  // Original view: ArmyRebel iff current army, no rebel and not leader.
  // ArmyAction has BOTH side forms if current army, active rebel, not riot.
  const canStart=count>=2500&&!events.rebel&&town.leader!==shop.id&&stockTimeSeconds>=1800;
  const canSide=count>0&&Boolean(events.rebel)&&!riot&&stockTimeSeconds>=1200;
  return Object.freeze({source:R4_ARMY_CONFLICT_SOURCE,committable:false,
    canStart,canJoin:canSide,canDispatch:canSide,stockTimeSeconds,
    armyCount:count,riot,rebellion:Boolean(events.rebel),isLeader:town.leader===shop.id});
}
export function projectR4ArmyConflictCommand({reviewed,world,armyBytes,command,requireFacility=false}){
  if(!plain(command)||!kinds.includes(command.kind)||
     !exact(command,command.kind==='dispatch-guard'?'kind,expectedRevision,shopId':'kind,expectedRevision,shopId,confirmation')||
     command.expectedRevision!==world?.revision||typeof requireFacility!=='boolean')
    fail('exact command/revision required');
  const input={reviewed,world,armyBytes,shopId:command.shopId};
  const {ids,shop,town,events,army,count,riot,now}=context(input);
  const start=command.kind==='start-rebellion',join=command.kind==='join-rebellion';
  if(requireFacility){
    const q=describeR4ArmyConflict(input);
    if(!(start?q.canStart:join?q.canJoin:q.canDispatch))fail('facility eligibility');
  }
  if((start||join)&&command.confirmation!=='rebel')fail('source confirmation required');
  if(start&&count<2500)fail('source army minimum');
  if(!start&&!join&&riot)fail('source riot cannot dispatch');
  if(shop.time>now)fail('source time unavailable');
  const timeSeconds=start?1800:1200;
  const time=Math.max(shop.time,now-259200)+timeSeconds;
  if(!safe(time))fail('source clock overflow');
  const nextTown={...town},eventState={...events},armyById={...army.armyById};
  const riots=new Set(army.riotIds),logs=[];
  if(start){
    eventState.rebel=now+259200;riots.add(shop.id);
    if(nextTown.safety>5000)nextTown.safety=Math.trunc(nextTown.safety*9/10);
    logs.push([2,0,shop.shopname+'の指揮でドワーフ兵士が武装蜂起。反乱が始まりました！']);
  }else if(join){
    riots.add(shop.id);
    logs.push([3,0,shop.shopname+'が反乱に呼応し，参戦しました！']);
  }else{
    const key=town.leader===shop.id?'army':'robina';
    nextTown[key]+=count;
    if(key==='robina')logs.push([3,0,shop.shopname+'は領主に味方し，義勇兵を派遣しました。']);
    delete armyById[shop.id];
  }
  if(Object.values(nextTown).some(n=>!safe(n)))fail('source town overflow');
  const bytes=serializeArmyFile({armyById,riotIds:[...riots].sort((a,b)=>a-b)},ids);
  const receipt=Object.freeze({source:reviewed.source,committable:false,action:command.kind,
    timeSeconds,armyBefore:count,armyAfter:start||join?count:0,logs});
  return Object.freeze({source:reviewed.source,committable:false,shops:world.shops.map(s=>s.id===shop.id?{...structuredClone(s),time}:structuredClone(s)),
    town:nextTown,eventState,armyBytes:bytes,receipt});
}
