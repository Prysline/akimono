/**
 * B-49 one-event source lifecycle (expiry before start, with group suppression).
 * ORIGINAL inc-turn.cgi code is exercised separately in original Perl tests.
 * No event callbacks, item modifiers, multiple event hash keys, nowfunc,
 * territory or whole-turn persistence. Do not run as a live street command.
 */
import {B48_EVENT_START_SOURCE,projectOriginalEventStart}
  from './original-event-start-gate.mjs';

export const B49_EVENT_LIFECYCLE_SOURCE='core-inc-turn-one-event-expiry-before-start';
const fail=x=>{throw new RangeError('B-49 original EVENT lifecycle: '+x)};
const safe=(x,name)=>{if(!Number.isSafeInteger(x)||x<0)fail(name);return x};
export function reviewOriginalEventLifecycle({turnSource,reviewedStart}){
  if(reviewedStart?.source!==B48_EVENT_START_SOURCE)
    fail('source event start review must succeed first');
  const a=turnSource?.indexOf('#イベント終了処理')??-1;
  const b=turnSource?.indexOf('#イベント開始処理',a)??-1;
  const c=turnSource?.indexOf('foreach my $key (keys(%DTevent))',b)??-1;
  if(a<0||b<=a||c<=b)fail('original expiry/start order changed');
  const expiry=turnSource.slice(a,b);
  const start=turnSource.slice(b,c);
  for(const text of [
    'if(%DTevent)',
    'if($DTevent{$key}<$temptimenow+$timespan)',
    'if($E->{endfunc})',
    'delete $DTevent{$key};',
    '$group{$E->{group}}=1;',
  ])if(!expiry.includes(text))fail('source expiry drift '+text);
  for(const text of [
    'foreach my $key (keys(%EVENT))',
    'next if $group{$E->{group}};',
    '|| $E->{startproba}==0',
  ])if(!start.includes(text))fail('source start drift '+text);
  return Object.freeze({
    source:B49_EVENT_LIFECYCLE_SOURCE,
    startSource:reviewedStart.source,
    scope:'single original callback-free event expiry + start ordering; excludes all actual EVENT callbacks/nowfuncs and WorldState commits',
  });
}
export function projectOriginalEventLifecycle({
  reviewed,reviewedStart,event,
  spanSeconds,startSeconds,activeUntilSeconds,randomDraws,
}){
  if(reviewed?.source!==B49_EVENT_LIFECYCLE_SOURCE||
     reviewed.startSource!==B48_EVENT_START_SOURCE)
    fail('source lifecycle review missing');
  const seconds=safe(spanSeconds,'span');
  if(seconds===0)fail('span zero');
  const started=safe(startSeconds,'source period segment beginning');
  const end=started+seconds;
  if(!Number.isSafeInteger(end))fail('time overflow');
  if(activeUntilSeconds!==null)safe(activeUntilSeconds,'active event expires');
  // Original uses strict '<'; equal-to-end is still occupying the group.
  const expired=activeUntilSeconds!==null&&activeUntilSeconds<end;
  const occupied=activeUntilSeconds!==null&&!expired;
  const begun=projectOriginalEventStart({
    reviewed:reviewedStart,event,spanSeconds:seconds,
    startSeconds:started,groupOccupied:occupied,randomDraws,
  });
  return Object.freeze({
    source:reviewed.source,
    expired,
    entered:begun.entered,
    groupNowOccupied:begun.groupNowOccupied,
    activeUntilSeconds:begun.expiresAt??(occupied?activeUntilSeconds:null),
    randomDrawsUsed:begun.randomDrawsUsed,
    scope:reviewed.scope,
  });
}
