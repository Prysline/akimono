/**
 * B-52: exact first-world EVENT wire evidence from frozen original CGI.
 * Admin emits a BLANK event CSV line, inc-func::DataRead converts that to
 * empty %DTevent, and write.cgi serializes %DTevent on its own line.
 * These are active EVENT instances, NOT the 25 compiled EVENT definitions.
 * Once a new turn advances without reviewing callbacks we must revert to
 * UNKNOWN (null), not keep claiming there were zero events.
 */
export const B52_EVENT_BOOTSTRAP='original-admin-empty-DTevent-first-world';
const fail=s=>{throw new RangeError('B-52 event bootstrap: '+s);};
const payload='500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0';
const sourceMarker=payload+'\\n\\n\\n//\\n';
export function reviewOriginalEmptyEventBootstrap({
  adminSource,readSource,writeSource,
}){
  if(typeof adminSource!=='string'||!adminSource.includes(sourceMarker)||
     !adminSource.includes('print DATA time().'))
    fail('original admin event/market blank lines changed');
  if(typeof readSource!=='string'||!readSource.includes(
    '%DTevent=split(/,/,$DATA[$idx++]);')||
     !readSource.includes('foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'))
    fail('original DataRead event instance parsing changed');
  if(typeof writeSource!=='string'||!writeSource.includes(
    'print OUT join(",",%DTevent)."\\n";'))
    fail('original DataWrite EVENT wire changed');
  return Object.freeze({
    source:B52_EVENT_BOOTSTRAP,initialActiveCount:0,
    initialActiveEvents:Object.freeze({}),
    scope:'original first-world active-event map only; does not compile event definitions or simulate any event',
  });
}
export function createOriginalEmptyEventState(reviewed){
  if(reviewed?.source!==B52_EVENT_BOOTSTRAP||
     reviewed.initialActiveCount!==0||
     reviewed.initialActiveEvents===null||
     Object.keys(reviewed.initialActiveEvents).length!==0)
    fail('reviewed original empty event map required');
  return {};
}
/** No fabricated active events. null means unknown after an unreviewed turn. */
export function validateOriginalEventBootstrapState(state){
  return state===null || (state!==null&&typeof state==='object'&&
    !Array.isArray(state)&&Object.keys(state).length===0&&
    (Object.getPrototypeOf(state)===Object.prototype||
     Object.getPrototypeOf(state)===null));
}
