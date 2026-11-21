/**
 * B-37 reviewed original 59/79 PLUS directives from fixed Standard Street DSL.
 * Runs ORIGINAL inc-turn PLUS ordering and one CheckWholeStore numeric projection
 * after assumed preceding natural sales. Does NOT execute a whole CGI/turn.
 * Perl source-executed probe validates every compiled PLUS and sparse wire.
 */
import {ORIGINAL_SPARSE_MARKET_SOURCE,validateSourceSparseMarket}
  from './original-admin-world-bootstrap.mjs';
import {reviewOriginalSparseMultiPlus} from './original-sparse-multi-plus.mjs';

export const ALL_PLUS_SOURCE='core-b37-all-59-plus-original-sequence';
export const ORIGINAL_PLUS_PIN="-20m|-20m|-20m|-20m|-20m|-20m|-20m|6h|1h|20m|10m|1h|10h|1h|20h|20h|20h|-|-|20h|20h|20h|20h|-|1d|-|-|-|-|2h|-1h|5h|-1h|-1h|-|-|1d|-|5h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|-1h|5d|1d|30m|1d|20h|-|-1h|-1h|-|-|-|-|-|-|-|-|1h|-";
const bad=x=>{throw new RangeError('B-37 all original PLUS: '+x);};
const safe=(n,key,min=0)=>{if(!Number.isSafeInteger(n)||n<min)bad(key);return n;};
const marker=(s,fragment)=>{if(typeof s!=='string'||!s.includes(fragment))
  bad('original compiler/source drift: '+fragment);};
export function reviewOriginalSparseAllPlus({
  turnSource,wholeSource,configSource,compilerSource,model,compiled,
}){
  const prior=reviewOriginalSparseMultiPlus({
    turnSource,wholeSource,configSource,model,compiled,
  });
  marker(compilerSource,'$g_item->{plus}=0;');
  marker(compilerSource,'$g_item->{plus}=GetTime($1);');
  marker(compilerSource,'sub GetTime');
  marker(turnSource,'foreach my $cnt (1..$MAX_ITEM)');
  marker(turnSource,'$DTwholestore[$cnt-1]+=$ITEM->{plus}>0 ? $add : -$add;');
  marker(wholeSource,'sub CheckWholeStore');
  const rows=[...model.items].sort((a,b)=>a.id-b.id);
  if(rows.length!==79||model.maxItem!==79||
    rows.some((r,i)=>r.id!==i+1||!r.code||r.source!=='custom/inc-item-data.cgi'))
    bad('79 original items unavailable');
  if(rows.map(r=>r.plusRaw??'-').join('|')!==ORIGINAL_PLUS_PIN)
    bad('fixed 79-item PLUS inventory changed');
  if(!Array.isArray(compiled?.limits)||compiled.limits.length!==79||
    compiled.limits.some(v=>!v.code||!Number.isFinite(v.wslimit)))
    bad('original 79 item source wholesale caps missing');
  const factor={m:60,h:3600,d:86400,k:1000};
  const seconds=rows.map((r)=>{
    if(r.plusRaw===null)return 0;
    const m=/^(-?)([1-9][0-9]*)([mhd k])$/.exec(r.plusRaw);
    if(!m||m[3]===' ')bad('unsupported literal PLUS');
    const num=Number(m[2])*factor[m[3]];
    if(!Number.isSafeInteger(num)||num===0)bad('unsafe PLUS seconds');
    return m[1]?-num:num;
  });
  if(seconds.filter(Boolean).length!==59||
    seconds[0]!==-1200||seconds[9]!==1200||seconds[39]!==-3600)
    bad('original 59 item compiled evidence drift');
  return Object.freeze({
    source:ALL_PLUS_SOURCE,population:prior.population,maxUsers:prior.maxUsers,
    plusSeconds:Object.freeze(seconds),activeCount:59,absentCount:20,
    scope:'all actual 59 fixed PLUS item declarations; post-sale source loop & full 79 caps; not full inc-turn',
  });
}

export function projectOriginalSparseAllPlus({
  world,reviewed,compiled,timespanSeconds,randomDraws,
  reviewedB39Span8640=false,
}){
  if(reviewed?.source!==ALL_PLUS_SOURCE||
    reviewed.population!==500000||reviewed.maxUsers!==50||
    reviewed.activeCount!==59||reviewed.absentCount!==20||
    reviewed.plusSeconds?.length!==79)
    bad('reviewed source metadata');
  safe(timespanSeconds,'positive timespan',1);
  // B-37's public command stays <=3600. Only a B-39 source-reviewed
  // internal caller can request exactly 8640s; never surfaced as command input.
  if(timespanSeconds>3600 && !(reviewedB39Span8640===true &&
    timespanSeconds===8640))bad('post-sale timespan beyond reviewed bound');
  if(!Array.isArray(randomDraws)||randomDraws.length>118||
    randomDraws.some(v=>!Number.isSafeInteger(v)||v<0||v>=1000000))
    bad('explicit random millionths, maximum 118 samples');
  if(world?.market?.source!==ORIGINAL_SPARSE_MARKET_SOURCE||
    !validateSourceSparseMarket(world.market)||
    world.events!==null||!Array.isArray(world.shops)||
    world.shops.length!==1)
    bad('requires original sparse market and exactly one shop');
  if(!Array.isArray(compiled?.limits)||compiled.limits.length!==79)
    bad('79 source caps required');
  const shop=world.shops[0];
  if(!Array.isArray(shop?.item)||shop.item.length!==79||
    shop.item.some(v=>!Number.isSafeInteger(v)||v<0))
    bad('79 safe shop inventories required');
  const next=[...world.market.wholesale];
  const slots=new Set(world.market.sparseWrittenSlots);
  const changes=[];let used=0;
  function rand(){
    if(used===randomDraws.length)bad('missing original random draw');
    return randomDraws[used++]/1000000;
  }
  const coeff=(reviewed.maxUsers+world.shops.length-2)*0.2+1;
  for(let i=0;i<79;i++){
    const plus=reviewed.plusSeconds[i];
    if(plus===0)continue;
    const start=used;
    let add=timespanSeconds/Math.abs(plus)*reviewed.population/
      (100000/coeff);
    if(!Number.isFinite(add)||add<0)bad('unsafe original PLUS arithmetic');
    if(add>0){
      add=add/2+rand()*(add/2);
      if(add<1&&add>0&&rand()*(1/add)<1)add=1;
    }else add=0;
    const amount=safe(Math.trunc(add),'original int(add)');
    const signed=plus>0?amount:-amount;
    const updated=next[i]+signed;
    if(!Number.isSafeInteger(updated))bad('unrepresentable pre-cap wholesale');
    next[i]=updated;
    slots.add(i); // Perl += writes a previously undefined slot, even for 0.
    changes.push({itemId:i+1,plusSeconds:plus,drawsUsed:used-start,
      units:amount,signedDelta:signed});
  }
  for(let i=0;i<79;i++){
    const limit=compiled.limits[i];if(!limit.code)continue;
    const cap=limit.wslimit<0?-limit.wslimit:
      Math.trunc(limit.wslimit*(world.shops.length||1)+0.99);
    safe(cap,'compiled source CheckWholeStore cap');
    if(shop.item[i]+next[i]>cap){
      next[i]=cap-Math.min(shop.item[i],cap);
      slots.add(i);
    }
    if(next[i]<0){next[i]=0;slots.add(i);}
    safe(next[i],'final wholesale');
  }
  if(used!==randomDraws.length)bad('unused source random samples');
  const defined=[...slots].sort((a,b)=>a-b),present=new Set(defined);
  const csv=Array.from({length:(defined.at(-1)??-1)+1},
    (_,i)=>present.has(i)?String(next[i]):'').join(',');
  const market={...world.market,wholesale:next,
    originalWholesaleCsv:csv,sparseWrittenSlots:defined};
  if(!validateSourceSparseMarket(market))bad('invalid source sparse result');
  return {shops:world.shops,market,receipt:{
    action:'reviewed-sparse-all-plus',source:ALL_PLUS_SOURCE,
    timespanSeconds,drawsUsed:used,
    activeItemIds:changes.map(c=>c.itemId),
    signedChanges:changes,
    sparseWrittenSlots:defined,originalWholesaleCsv:csv,
    scope:'all 59 original PLUS declarations + one full 79 item cap, with explicit sampled rand; no natural sales/events/real time/CGI/persistence',
  }};
}
