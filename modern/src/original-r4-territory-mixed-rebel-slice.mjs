/** One original territory region (optional) + all 17 EVENT gates + lazy
 * army LIVE read and prospective stage. This is an externally seeded
 * pre-EVENT candidate, not a whole player time command, CAS or disk write.
 * The sale, full shop ledger, PLUS and wholesale prefix are not done here.
 */
import {projectOriginalTerritoryConflict} from './original-period-territory.mjs';
import {projectOriginalR4MultiEventFixture,R4_MULTI_EVENT_FIXTURE_SOURCE} from './original-r4-multi-event-order-fixture.mjs';
import {parseArmyFile,serializeArmyFile} from './original-r4-army-files.mjs';
export const R4_TERRITORY_MIXED_SOURCE='r4-territory-mixed-rebel-event-live-stage-candidate.v1';
const fail=m=>{throw new RangeError('R4 territory mixed candidate: '+m)};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join(',')===keys.split(',').sort().join(',');
export function projectR4TerritoryMixedRebelSlice({reviewedTerritory,reviewedEvent,period=null,
  town,taxRate,balJob,balName,liveArmyBytes,pendingArmyBytes=null,
  items,shop,startSeconds,spanSeconds,activeUntilSeconds,activeHashOrderFixture,
  eventHashOrderFixture,nowHashOrderFixture,guildContext=null,randomDrawProvider}){
  if(reviewedEvent?.source!==R4_MULTI_EVENT_FIXTURE_SOURCE||reviewedEvent.committable!==false||
     !reviewedEvent.rebel||typeof randomDrawProvider!=='function'||
     !shop||shop.id!==1||shop.status!==1||!town||
     !Number.isSafeInteger(taxRate)||taxRate<0||
     typeof balJob!=='string'||typeof balName!=='string'||
     !(liveArmyBytes===null||typeof liveArmyBytes==='string')||
     !(pendingArmyBytes===null||typeof pendingArmyBytes==='string')||
     !activeUntilSeconds||typeof activeUntilSeconds!=='object'||Array.isArray(activeUntilSeconds))
    fail('explicit noncommittable source slice context required');
  const samples=[],ranges=[];
  // Existing EVENT callbacks may peek before drawing. The same slot and
  // range must return the same value; do not advance the real cursor twice.
  const sample=(index,range)=>{
    if(!Number.isSafeInteger(index)||index<0||index>samples.length||index>=105)fail('shared RNG cursor');
    if(index<samples.length){
      if(ranges[index]!==range)fail('shared RNG range drift');
      return samples[index];
    }
    const v=randomDrawProvider(index,range);
    samples.push(v);ranges.push(range);return v;
  };
  let nextTown={...town},events={...activeUntilSeconds},settlement=null;
  if(period!==null){
    if(!exact(period,'dtPeople,dtUserCount,activeShopIds,taxIn,nowSeconds')||
       !Array.isArray(period.activeShopIds)||period.activeShopIds.length!==1||period.activeShopIds[0]!==shop.id||
       !Number.isSafeInteger(period.nowSeconds)||period.nowSeconds<startSeconds+spanSeconds)
      fail('single post-SortDT source shop and command NOW required');
    settlement=projectOriginalTerritoryConflict({reviewed:reviewedTerritory,town:nextTown,
      ...period,activeUntilSeconds:events.rebel??null,balJob,balName,randomDrawProvider:sample});
    nextTown=settlement.town;
    if(settlement.activeUntilSeconds===null)delete events.rebel;
    else events.rebel=settlement.activeUntilSeconds;
  }
  const periodDrawCount=settlement?.drawsUsed??0;
  if(periodDrawCount!==samples.length)fail('territory RNG cursor drift');
  const {people,...city}=nextTown;
  let armyRead=false;
  const event=projectOriginalR4MultiEventFixture({reviewed:reviewedEvent,items,shop,startSeconds,spanSeconds,
    activeUntilSeconds:events,activeHashOrderFixture,eventHashOrderFixture,nowHashOrderFixture,
    guildContext,rebelContext:{town:city,taxRate,balJob,balName,armyById:{},riotIds:[]},
    exactTicketDraws:true,reviewedExternalDraws:true,
    randomDrawProvider:(index,range)=>sample(periodDrawCount+index,range),
    readRebelArmy:()=>{
      if(armyRead||liveArmyBytes===null||liveArmyBytes.length>160000)fail('bounded explicit live army file required for NOW');
      armyRead=true;
      const read=parseArmyFile(liveArmyBytes,[shop.id]);
      return {armyById:Object.fromEntries(Object.entries(read.armyById).filter(([id])=>Number(id)===shop.id)),riotIds:read.riotIds};
    }});
  const evidenceRanges=[...(settlement?.randomDrawRanges??[]),...event.randomDrawRanges];
  if(evidenceRanges.length!==ranges.length||evidenceRanges.some((range,i)=>range!==ranges[i])||
     event.drawsUsed+periodDrawCount!==samples.length||
     armyRead!==(event.rebelNowCallbacks.length===1))
    fail('mixed source trace drift');
  const stagedArmyBytes=armyRead?serializeArmyFile(event.rebelContext,[shop.id]):pendingArmyBytes;
  return Object.freeze({source:R4_TERRITORY_MIXED_SOURCE,committable:false,worldStateWritten:false,
    settlement,event,town:{...event.rebelContext.town,...(people===undefined?{}:{people})},
    taxRate:event.rebelContext.taxRate,activeUntilSeconds:event.activeUntilSeconds,
    armyRead,liveArmyBytes,stagedArmyBytes,randomDrawRanges:ranges,consumedSamples:samples,
    drawsUsed:samples.length,logs:[...(settlement?.logs??[]),...event.logs]});
}
