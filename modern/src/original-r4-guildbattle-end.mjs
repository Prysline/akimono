/**
 * R4: original custom/inc-rebel-data.cgi guildbattle ENDFUNC.
 * Source-grounded single-event callback projection, NOT a full guild world.
 * Its dependency calls (ReadGuild, ReadGuildData, SetTownData) are represented
 * by an explicit finite input; the original Perl oracle stubs only this IO.
 * Source ties depend on Perl sort/hash iteration and must fail closed.
 */
import {parseDsl} from './parse-dsl.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
export const R4_GUILDBATTLE_END_SOURCE='r4-source-guildbattle-original-endfunc-v1';
const fail=x=>{throw new RangeError('R4 original guildbattle END: '+x);};
const lines=Object.freeze([
  'main::ReadGuild();',
  'main::ReadGuildData();',
  '@guildlist=sort{$b->{money}<=>$a->{money}}map{$main::GUILD_DATA{$_}->{guild}=$_;$main::GUILD_DATA{$_}}keys(%main::GUILD);',
  'my $Dguild=$guildlist[0]->{guild};',
  "main::SetTownData('dominion',$Dguild);",
  'return 1,"商會「".$main::GUILD{$Dguild}->[$GUILDIDX_name]."」在對抗戰中勝出了。恭喜。";',
]);
const own=(o,k)=>Object.hasOwn(o,k);
export function reviewR4GuildbattleEnd({rebelDsl,turnSource,compiledCatalog}){
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17)
    fail('reviewed 17 EVENT compiled catalog required');
  const event=compiledCatalog.compiled.find(e=>e.code==='guildbattle');
  if(!event||event.startProba!==0||
     event.baseTimeSeconds!==0||event.plusTimeSeconds!==0||
     event.callbacks.start!==null||event.callbacks.now!==null||
     event.callbacks.end!=='_local_'||!event.group)
    fail('source guildbattle compiled event drift');
  const parsed=parseDsl(rebelDsl,'custom/inc-rebel-data.cgi');
  const list=parsed.blocks.filter(x=>x.kind==='EVENT'&&
    x.fields.code?.[0]?.value==='guildbattle');
  if(parsed.issues.length||list.length!==1)
    fail('source guildbattle DSL changed');
  const b=list[0];
  const f=k=>b.fields[k]?.map(x=>x.value)??[];
  if(f('start').join(',')!=='0'||f('endfunc').join(',')!=='_local_'||
     f('info').join(',')!=='商會對抗戰正在進行中。'||f('func').length||
     f('startfunc').length||f('group').length)
    fail('guildbattle source fields changed');
  const raw=b.raw.split(/\r?\n/);
  const begin=raw.findIndex(x=>/^\s*endfunc\s+_local_\s*$/.test(x));
  const end=raw.findIndex((x,i)=>i>begin&&x.trim()==='_local_');
  const body=raw.slice(begin+1,end).map(x=>x.trim()).filter(Boolean);
  if(begin<0||end<=begin||body.length!==lines.length||
     body.some((line,i)=>line!==lines[i]))
    fail('original guildbattle end callback body drift');
  for(const marker of [
    '#イベント終了処理','if($DTevent{$key}<$temptimenow+$timespan)',
    'if($E->{endfunc})','RequireFile('+"'inc-event.cgi'"+');',
    'my $func="event::".$E->{endfunc};',
    '($ret,$msg)=&$func(split(/[:,]/,$E->{endfuncparam}));',
    'PushLog(2,0,$msg) if $msg;',
    'undef &$func;','delete $DTevent{$key};',
    'if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)',
  ])if(typeof turnSource!=='string'||!turnSource.includes(marker))
    fail('source END/START callback lifecycle drift '+marker);
  return Object.freeze({
    source:R4_GUILDBATTLE_END_SOURCE,eventCode:'guildbattle',
    group:event.group,startProba:0,baseTimeSeconds:0,
    plusTimeSeconds:0,committable:false,
    scope:'one externally seeded guildbattle END; exact frozen callback, unique guild money maximum, stubbed read/write dependencies, no real guild persistence/hash tie',
  });
}
const safe=n=>Number.isSafeInteger(n)&&n>=0;
/** END callback only. The shared 17-key gate owns START's rand(100000). */
export function projectR4GuildbattleEndCallback({reviewed,guilds,dominion=null}){
  if(reviewed?.source!==R4_GUILDBATTLE_END_SOURCE||
     reviewed.committable!==false||reviewed.eventCode!=='guildbattle'||
     !Array.isArray(guilds)||!guilds.length||guilds.length>100||
     !(dominion===null||typeof dominion==='string'))
    fail('source-reviewed original guildbattle callback and guild IO required');
  const used=new Set();
  const copies=guilds.map(g=>{
    if(!g||typeof g!=='object'||Array.isArray(g)||
       !['id,money,name','guild,id,money,name'].includes(Object.keys(g).sort().join(','))||
       typeof g.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(g.id)||
       used.has(g.id)||typeof g.name!=='string'||!g.name||
       g.name.length>100||!Number.isSafeInteger(g.money)||
       (Object.hasOwn(g,'guild')&&g.guild!==g.id))
      fail('unreviewed source guild snapshot');
    used.add(g.id);return {...g};
  });
  const max=Math.max(...copies.map(g=>g.money));
  const top=copies.filter(g=>g.money===max);
  if(top.length!==1)fail('unreviewed Perl hash/sort money tie');
  const winner=top[0];
  return Object.freeze({
    winner:winner.id,dominion:winner.id,
    guildRecords:Object.freeze(copies.map(g=>Object.freeze({...g,guild:g.id}))),
    message:'商會「'+winner.name+'」在對抗戰中勝出了。恭喜。',
    readGuildCalls:1,readGuildDataCalls:1,setTownCalls:1,
    committable:false,
  });
}
export function projectR4GuildbattleEnd({
  reviewed,startSeconds,spanSeconds,activeUntilSeconds=null,
  guilds,dominion=null,randomDraws,
}){
  if(reviewed?.source!==R4_GUILDBATTLE_END_SOURCE||
     reviewed.committable!==false||reviewed.startProba!==0||
     reviewed.eventCode!=='guildbattle')
    fail('source reviewed guildbattle END required');
  if(!safe(startSeconds)||!safe(spanSeconds)||spanSeconds<1||
     spanSeconds>3600||!safe(startSeconds+spanSeconds)||
     (activeUntilSeconds!==null&&!safe(activeUntilSeconds))||
     !Array.isArray(guilds)||!guilds.length||guilds.length>100||
     ![null,'string'].includes(dominion===null?null:typeof dominion))
    fail('source time, guilds and externally seeded activity required');
  const seen=new Set();
  const copies=guilds.map(g=>{
    if(!g||typeof g!=='object'||Array.isArray(g)||
       Object.keys(g).sort().join(',')!=='id,money,name'||
       typeof g.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(g.id)||
       seen.has(g.id)||typeof g.name!=='string'||!g.name||
       g.name.length>100||!Number.isSafeInteger(g.money))
      fail('source guild snapshot not supported');
    seen.add(g.id);
    return {...g};
  });
  const expiry=activeUntilSeconds!==null&&
    activeUntilSeconds<startSeconds+spanSeconds;
  const occupied=activeUntilSeconds!==null&&!expiry;
  const expectedDraws=occupied?0:1;
  if(!Array.isArray(randomDraws)||randomDraws.length!==expectedDraws||
     randomDraws.some(x=>!safe(x)||x>=1000000))
    fail('exact original START gate sample count required');
  const callback=expiry?projectR4GuildbattleEndCallback({
    reviewed,guilds:copies,dominion,
  }):null;
  const winner=callback?.winner??null;
  const nextDominion=callback?.dominion??dominion;
  const logs=callback?[[2,0,callback.message]]:[];
  const records=callback?.guildRecords??copies;
  return Object.freeze({
    source:reviewed.source,committable:false,
    activeUntilSeconds:occupied?activeUntilSeconds:null,
    eventPersisted:occupied,expired:expiry,winner,
    dominion:nextDominion,guildRecords:records,
    logs,readGuildCalls:expiry?1:0,readGuildDataCalls:expiry?1:0,
    setTownCalls:expiry?1:0,
    randomDrawRanges:occupied?[]:[100000],drawsUsed:expectedDraws,
    zeroStartTransient:!occupied,groupOccupied:true,
  });
}
