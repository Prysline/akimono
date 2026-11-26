/** Native external time receipt; army bytes remain in the source disk envelope.
 * Trace construction grants no command, CAS, or history authority. */
import {createHash} from 'node:crypto';
import {R4_EXTERNAL_CROSS_PERIOD_CANDIDATE} from './original-r4-external-cross-period-candidate.mjs';
import {R4_EXTERNAL_COMMAND_HASH_POLICY} from './original-r4-perl-hash-replay.mjs';
const digest=s=>s===null?null:createHash('sha256').update(s,'utf8').digest('hex');
export function projectExternalTimeTrace(candidate){
  if(candidate?.source!==R4_EXTERNAL_CROSS_PERIOD_CANDIDATE||candidate.committable!==false||
    candidate.evidence?.hashPolicy!==R4_EXTERNAL_COMMAND_HASH_POLICY)throw new RangeError('R4 external time trace: complete source candidate required');
  const e=candidate.evidence;
  return {drawPolicy:e.drawPolicy,hashPolicy:e.hashPolicy,seed:e.seed,interpreter:e.interpreter,
    dataReadOrder:e.dataReadOrder,liveArmySha256:digest(candidate.liveArmyBytes),
    slices:e.slices.map(s=>({dateupdate:s.dateupdate,spanSeconds:s.spanSeconds,periodRebel:s.periodRebel,
      activeOrder:s.activeOrder,eventOrder:s.eventOrder,nowOrder:s.nowOrder,afterOrder:s.afterOrder,
      preEventDraws:s.preEventDraws,eventDrawRanges:s.eventDrawRanges,eventSamples:s.eventSamples,
      armyRead:s.armyRead,stagedArmySha256:digest(s.stagedArmyBytes),periodLogs:s.periodLogs,logs:s.eventLogs,
      stateSha256:digest(JSON.stringify([s.town,s.shop,s.eventState,s.transientArmy,s.preEvent.market.originalWholesaleCsv]))}))};
}

/** Sales belong to the source pre-EVENT stages, not stock deltas (theft,
 * callbacks, prizes and army combat may also mutate the same world).
 * The per-item wire can carry a reviewed multi-shelf result once the
 * normal-commerce owner supplies it; this function never enables shelves.
 */
export function projectExternalSaleReceipt(candidate){
  if(candidate?.source!==R4_EXTERNAL_CROSS_PERIOD_CANDIDATE||candidate.committable!==false||
    candidate.evidence?.hashPolicy!==R4_EXTERNAL_COMMAND_HASH_POLICY)
    throw new RangeError('R4 external sale receipt: reviewed candidate required');
  const fail=()=>{throw new RangeError('R4 external sale receipt: inconsistent source slice totals')};
  const safe=n=>Number.isSafeInteger(n)&&n>=0;
  const add=(a,b)=>{const n=a+b;if(!safe(n))fail();return n};
  const input=candidate.evidence.slices;
  if(!Array.isArray(input)||input.length<1||input.length>2||
    (input.length===2&&(input[0].dateupdate!==1||input[1].dateupdate!==0)))fail();
  let naturalSaleCount=0;
  const soldByItem={};
  const sliceSales=input.map(slice=>{
    const r=slice.preEvent?.receipt;
    if(![0,1].includes(slice.dateupdate)||!safe(slice.spanSeconds)||slice.spanSeconds===0||
      !safe(r?.naturalSaleCount))fail();
    const count=r.naturalSaleCount;
    const supplied=r.soldByItem??(count?{[r.soldItemId]:count}:{});
    if(!supplied||typeof supplied!=='object'||Array.isArray(supplied)||
      Object.getPrototypeOf(supplied)!==Object.prototype)fail();
    let total=0;
    const byItem={};
    for(const [id,n] of Object.entries(supplied)){
      if(!/^[1-9][0-9]?$/.test(id)||Number(id)>79||!safe(n)||n===0)fail();
      total=add(total,n);byItem[id]=n;
      soldByItem[id]=add(soldByItem[id]??0,n);
    }
    if(total!==count)fail();
    naturalSaleCount=add(naturalSaleCount,total);
    return {dateupdate:slice.dateupdate,spanSeconds:slice.spanSeconds,naturalSaleCount:total,soldByItem:byItem};
  });
  return {naturalSaleCount,soldByItem,sliceSales};
}
