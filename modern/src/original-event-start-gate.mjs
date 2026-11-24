/**
 * B-48 original inc-turn.cgi EVENT start gate, isolated before real world
 * integration. It is NOT complete events: active event expiry, EVENT effects,
 * startfunc/endfunc/nowfunc, market price changes and period settlement
 * remain unreviewed. Reject such branches instead of skipping callbacks.
 */
export const B48_EVENT_START_SOURCE='core-inc-turn-compiled-event-start-gate';
const fail=m=>{throw new RangeError('B-48 source EVENT: '+m)};
const safe=(v,name,min=0)=>{if(!Number.isSafeInteger(v)||v<min)fail(name);return v};
function assertNeedle(text,needle,label){
  if(typeof text!=='string'||!text.includes(needle))fail(label+' source changed');
}
export function reviewOriginalEventStart({turnSource,compilerSource,itemDsl,rebelDsl}){
  for(const [needle,label] of [
    ['#イベント開始処理','event region'],
    ['foreach my $key (keys(%EVENT))','event hash order'],
    ['next if $group{$E->{group}};','group guard'],
    ['rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0','zero-probability exception'],
    ["$DTevent{$key}=$temptimenow+int(rand($timespan))+$E->{basetime}+int(rand($E->{plustime})) if ($E->{basetime}+$E->{plustime});",'source event time'],
    ['$group{$E->{group}}=1;','group occupancy'],
    ['if($E->{startfunc})','original startfunc gate'],
  ])assertNeedle(turnSource,needle,label);
  for(const [needle,label] of [
    ["print EOUT \"'$s',\\n\" if $event->{startproba}!=-1;",'disabled event compiler'],
    ['$event->{startproba},','compiled event probability'],
    ['$event->{startfunc},','compiled event callback'],
    ['$event->{basetime},','compiled event duration'],
  ])assertNeedle(compilerSource,needle,label);
  for(const [s,needle]of [
    [rebelDsl,'\tcode\t\trebel'],
    [rebelDsl,'\tcode\t\tguildbattle'],
    [itemDsl,'@@EVENT'],
  ])assertNeedle(s,needle,'Standard Street event list');
  if(!/@@event\s*\n\s*start\s+0\s*\n\s*code\s+rebel/.test(rebelDsl)||
     !/@@event\s*\n\s*start\s+0\s*\n\s*code\s+guildbattle/.test(rebelDsl))
    fail('fixed source start=0 special events changed');
  return Object.freeze({
    source:B48_EVENT_START_SOURCE,
    rawRebelStart:0,rawGuildBattleStart:0,
    scope:'one isolated callback-free compiled EVENT gate only; no active events, event callbacks, multievent ordering or world writes',
  });
}
export function projectOriginalEventStart({
  reviewed,event,spanSeconds,startSeconds,groupOccupied,randomDraws,
}){
  if(reviewed?.source!==B48_EVENT_START_SOURCE)fail('original source review missing');
  const span=safe(spanSeconds,'span',1);
  safe(startSeconds,'start timestamp');
  if(typeof groupOccupied!=='boolean')fail('groupOccupied must be boolean');
  if(!event||typeof event!=='object'||Array.isArray(event)||
     typeof event.code!=='string'||!event.code||
     typeof event.group!=='string'||event.group.length>100||
     !Number.isSafeInteger(event.startproba)||event.startproba<0||
     !Number.isSafeInteger(event.basetime)||event.basetime<0||
     !Number.isSafeInteger(event.plustime)||event.plustime<0||
     event.startfunc!==''||event.endfunc!==''||event.nowfunc!=='')
    fail('only callback-free compiled EVENT with nonnegative probability');
  const samples=randomDraws;
  if(!Array.isArray(samples)||samples.length>3||
     samples.some(x=>!Number.isSafeInteger(x)||x<0||x>=1000000))
    fail('bounded exact shared original rand millionths');
  let pos=0;
  const rand=max=>{
    if(pos>=samples.length)fail('missing EVENT rand draw');
    return samples[pos++]/1000000*max;
  };
  let entered=false,expiresAt=null;
  if(!groupOccupied){
    const threshold=span*event.startproba/864;
    // Original rand(100000) is evaluated BEFORE the "|| startproba==0".
    const tested=rand(100000)<threshold;
    entered=tested||event.startproba===0;
    if(entered && event.basetime+event.plustime>0){
      expiresAt=startSeconds+Math.trunc(rand(span))+event.basetime+
        Math.trunc(rand(event.plustime));
      if(!Number.isSafeInteger(expiresAt))fail('unsafe original event end time');
    }
  }
  if(pos!==samples.length)fail('unused source EVENT random draws');
  return Object.freeze({
    source:reviewed.source,eventCode:event.code,
    entered,groupBlocked:groupOccupied,groupNowOccupied:groupOccupied||entered,
    expiresAt,randomDrawsUsed:pos,
    scope:reviewed.scope,
  });
}
