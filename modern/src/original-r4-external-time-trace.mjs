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
