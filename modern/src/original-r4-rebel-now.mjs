/**
 * R4 original rebel NOWFUNC, externally seeded and IO-injected PURE projector.
 * Not a GameCore commit, NOT real army file IO.
 */
import {parseDsl} from './parse-dsl.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
export const R4_REBEL_NOW_SOURCE='r4-source-rebel-nowfunc-army-fixture';
const fail=s=>{throw new RangeError('R4 original rebel NOW: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const townKeys=['leader','money','in','out','develop','devem','safety','safem','army','robina','robinb'];
function fingerprint(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  return h;
}
export function reviewR4RebelNow({compiledCatalog,rebelDsl,turnSource,periodSource}){
  const e=compiledCatalog?.compiled?.find(e=>e.code==='rebel');
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||!e||e.startProba!==0||
     e.baseTimeSeconds!==0||e.plusTimeSeconds!==0||
     e.callbacks.start!==null||e.callbacks.end!==null||
     e.callbacks.now!=='_local_')
    fail('frozen rebel catalog changed');
  const source=parseDsl(rebelDsl,'custom/inc-rebel-data.cgi');
  const matches=source.blocks.filter(b=>b.kind==='EVENT'&&
    b.fields.code?.[0]?.value==='rebel');
  if(source.issues.length||matches.length!==1||
     matches[0].fields.start?.[0]?.value!=='0')
    fail('frozen rebel DSL changed');
  const raw=matches[0].raw.split(/\r?\n/);
  const first=raw.findIndex(x=>/^\s*func\s+_local_\s*$/.test(x));
  const last=raw.findIndex((x,i)=>i>first&&x.trim()==='_local_');
  const lines=raw.slice(first+1,last).map(x=>x.trim()).filter(Boolean);
  if(first<0||last<=first||lines.length!==82||
     fingerprint(lines.join('\n'))!==198275166)
    fail('full frozen rebel NOWFUNC body drift');
  for(const s of [
    '@event::DT=@DT;',
    'foreach my $key (keys(%DTevent))',
    'my $extfile=GetPath($ITEM_DIR,"event-n",$key);',
    'my($msg)=&$func(split(/[:,]/,$E->{funcparam}));',
    'delete $INC{$extfile};',
  ])if(typeof turnSource!=='string'||!turnSource.includes(s))
    fail('original NOWFUNC call path changed');
  for(const s of ['RebelRobin();','if ($DTevent{rebel})',
    '$DTevent{rebel}=$NOW_TIME+86400*3;'])
    if(typeof periodSource!=='string'||!periodSource.includes(s))
      fail('original rebel period trigger changed');
  return Object.freeze({source:R4_REBEL_NOW_SOURCE,committable:false,
    eventCode:'rebel',group:e.group,
    scope:'full frozen rebel NOWFUNC on externally seeded one event and explicit army/city; IO stubbed, no true WorldState or period settlement'});
}
export function projectR4RebelNow({
  reviewed,startSeconds,spanSeconds,activeUntilSeconds,town,shops,
  riotIds,armyById,randomDraws,taxRate=0,balJob='外敵',balName='首領'
}){
  if(reviewed?.source!==R4_REBEL_NOW_SOURCE||reviewed.committable!==false||
     !safe(startSeconds)||!safe(spanSeconds)||spanSeconds<1||
     spanSeconds>3600||!safe(activeUntilSeconds)||
     activeUntilSeconds<startSeconds+spanSeconds||
     !town||typeof town!=='object'||Array.isArray(town)||
     Object.keys(town).sort().join(',')!==townKeys.slice().sort().join(',')||
     townKeys.some(x=>!safe(town[x]))||
     !Array.isArray(shops)||!shops.length||shops.length>100||
     !Array.isArray(riotIds)||!armyById||typeof armyById!=='object'||
     Array.isArray(armyById)||!Array.isArray(randomDraws)||
     randomDraws.length>2||!safe(taxRate)||
     typeof balJob!=='string'||typeof balName!=='string')
    fail('unreviewed army/town/time/fixture');
  const city={...town},idMap=new Map();
  const shopsOut=shops.map((s,i)=>{
    if(!s||typeof s!=='object'||Array.isArray(s)||
       Object.keys(s).sort().join(',')!=='army,id,money,name,shopname'||
       !safe(s.id)||s.id===0||idMap.has(s.id)||
       !safe(s.money)||!safe(s.army)||
       typeof s.name!=='string'||typeof s.shopname!=='string')
      fail('unreviewed source shop snapshot');
    idMap.set(s.id,i);return {...s};
  });
  const army={...armyById},riot=new Set();
  if(Object.keys(army).some(x=>!/^[1-9]\d*$/.test(x)||
     !idMap.has(Number(x))||!safe(army[x])))fail('invalid ARMY map');
  for(const id of riotIds){
    if(!safe(id)||!idMap.has(id)||riot.has(id)||
       !Object.hasOwn(army,String(id)))
      fail('invalid RIOT membership');
    riot.add(id);
  }
  let used=0,deleted=false,rate=taxRate,amount=0,rebels=0;
  const logs=[],ranges=[];
  const draw=r=>{
    if(used>=randomDraws.length)fail('source rebel RNG exhausted');
    const v=randomDraws[used++];
    if(!safe(v)||v>=1000000)fail('source rebel RNG sample invalid');
    ranges.push(r);return Math.trunc(v*r/1000000);
  };
  let time=Math.trunc(spanSeconds/3);
  if(city.army+city.robina>15000)time*=2;
  if(city.safety>2500)city.safety-=Math.trunc(spanSeconds/20);
  if(city.develop>2500)city.develop-=Math.trunc(spanSeconds/20);
  if(city.robinb){
    city.robinb-=time;
    if(draw(100)>75)city.robinb+=Math.trunc(time/2);
    city.robinb=Math.max(0,city.robinb);
    amount+=time*2;rebels+=city.robinb;
  }
  for(const id of riot){
    shopsOut[idMap.get(id)].army=army[id];
    army[id]=Math.max(0,army[id]-time);
    amount+=time;rebels+=army[id];
  }
  if(rebels<200){
    deleted=true;riot.clear();
    logs.push([2,0,'叛亂被護衛軍鎮壓了。']);
  }else{
    amount+=draw(5);
    if(city.robina){city.robina=Math.max(0,city.robina-amount);amount=0;}
    if(amount)city.army-=amount;
    if(city.army+city.robina<200){
      deleted=true;
      for(const id of riot)delete army[id];
      riot.clear();
      logs.push([2,0,'護衛軍被叛軍殲滅了。領主被趕出了城堡。']);
      if(new Set(shopsOut.map(s=>s.army)).size!==shopsOut.length)
        fail('unreviewed equal-army sort');
      const ranked=[...shopsOut].sort((a,b)=>b.army-a.army);
      let winner=ranked[0].id;
      if(winner===city.leader){
        if(!ranked[1])fail('missing second rebel successor');
        winner=ranked[1].id;
      }
      if(city.robinb>ranked[0].army)winner=0;
      city.robina=0;city.money=Math.max(0,city.money);
      if(winner){
        const shop=shopsOut[idMap.get(winner)];
        logs.push([2,0,'首領 '+shop.name+'（'+shop.shopname+'）成為了新的領主。']);
        city.leader=winner;city.army=rebels;city.robinb=0;
      }else{
        logs.push([2,0,'首領 '+balJob+balName+'成為了新的領主。']);
        city.leader=0;city.army=0;city.robina=10000;city.robinb=0;
        city.develop=5001;city.safety=5001;city.devem=0;city.safem=0;
        rate=0;const gift=Math.trunc(city.money/500)*10+10;
        city.money=0;
        for(const shop of shopsOut)shop.money+=gift;
        logs.push([2,0,balJob+balName+'將城鎮資金'+gift+'分配給居民了。']);
      }
    }
  }
  if(used!==randomDraws.length)fail('source rebel RNG samples unused');
  if(Object.values(city).some(v=>!safe(v))||
     shopsOut.some(s=>!safe(s.money)||!safe(s.army)))
    fail('source projected result not persistable');
  return Object.freeze({
    source:reviewed.source,committable:false,
    town:city,shops:shopsOut,riotIds:[...riot].sort((a,b)=>a-b),
    armyById:army,taxRate:rate,activeUntilSeconds:deleted?null:activeUntilSeconds,
    eventPersisted:!deleted,logs,readArmyCalls:1,writeArmyCalls:1,
    randomDrawRanges:ranges,drawsUsed:used,returnCode:0,
  });
}
