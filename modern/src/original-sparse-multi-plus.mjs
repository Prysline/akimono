/**
 * B-36 source-backed post-sale fixture: only true Standard Street item
 * #1 (-20m), #10 (+20m), #40 (-1h) have PLUS. Other 76 PLUS=0
 * in the original Perl probe, NOT a full market turn or persistence.
 */
import {reviewOriginalSparsePlusTurn} from './original-sparse-wholesale-plus.mjs';
import {listReviewedWholesalePlusItems} from './wholesale-turn-model.mjs';
import {ORIGINAL_SPARSE_MARKET_SOURCE,validateSourceSparseMarket}
  from './original-admin-world-bootstrap.mjs';
export const MULTI_PLUS_SOURCE='core-b36-post-sale-three-plus';
const fixed=[{id:1,plus:-1200,cap:1000},{id:10,plus:1200,cap:10},
  {id:40,plus:-3600,cap:600}];
function bad(x){throw new RangeError('B-36 multi PLUS: '+x);}
function safe(x,label,min=0){if(!Number.isSafeInteger(x)||x<min)bad(label);return x;}
export function reviewOriginalSparseMultiPlus({turnSource,wholeSource,configSource,model,compiled}){
  const prior=reviewOriginalSparsePlusTurn({turnSource,wholeSource,configSource,model,compiled});
  for(const marker of ['foreach my $cnt (1..$MAX_ITEM)',
    'next if !$ITEM[$cnt]->{code};','my $ITEM=$ITEM[$cnt];',
    'if($ITEM->{plus}!=0)','$add=int($add);']){
    if(!turnSource.includes(marker))bad('source drift: '+marker);
  }
  const items=listReviewedWholesalePlusItems(model);
  if(items.length!==3||items.some((x,i)=>x.id!==fixed[i].id||
    x.plusSeconds!==fixed[i].plus||x.wslimit!==fixed[i].cap||
    compiled.limits[x.id-1]?.wslimit!==fixed[i].cap))bad('three ITEM source drift');
  return Object.freeze({source:MULTI_PLUS_SOURCE,
    population:prior.population,maxUsers:prior.maxUsers,
    activeItemIds:Object.freeze(fixed.map(x=>x.id)),
    plusSeconds:Object.freeze(fixed.map(x=>x.plus))});
}
export function projectOriginalSparseMultiPlus({
  world,reviewed,compiled,timespanSeconds,randomDraws,
}){
  if(reviewed?.source!==MULTI_PLUS_SOURCE||
    reviewed.population!==500000||reviewed.maxUsers!==50||
    reviewed.activeItemIds?.join(',')!=='1,10,40'||
    reviewed.plusSeconds?.join(',')!=='-1200,1200,-3600')bad('reviewed contract');
  safe(timespanSeconds,'positive timespan',1);
  if(timespanSeconds>3600)bad('timespan exceeds bounded source fixture');
  if(!Array.isArray(randomDraws)||randomDraws.length>6||
    randomDraws.some(v=>!Number.isSafeInteger(v)||v<0||v>=1000000))
    bad('explicit millionth draws');
  if(world?.market?.source!==ORIGINAL_SPARSE_MARKET_SOURCE||
    !validateSourceSparseMarket(world.market)||world.events!==null||
    !Array.isArray(world.shops)||world.shops.length!==1)
    bad('original sparse market and one shop required');
  if(!Array.isArray(compiled?.limits)||compiled.limits.length!==79)
    bad('79 compiled source limits');
  const shop=world.shops[0];
  if(!Array.isArray(shop?.item)||shop.item.length!==79||
    shop.item.some((v,i)=>!Number.isSafeInteger(v)||v<0||
      (i!==62&&i!==78&&v!==0))||
    shop.item[62]!==1||shop.item[78]!==5)
    bad('only source new-shop inventory fixture reviewed');
  const before=world.market.wholesale,after=[...before];
  const slots=new Set(world.market.sparseWrittenSlots);
  const changes=[];let used=0;
  function rand(){
    if(used>=randomDraws.length)bad('missing draw');
    return randomDraws[used++]/1000000;
  }
  const coeff=(reviewed.maxUsers+world.shops.length-2)*0.2+1;
  for(const item of fixed){
    const i=item.id-1,start=used;
    let add=timespanSeconds/Math.abs(item.plus)*reviewed.population/
      (100000/coeff);
    if(!Number.isFinite(add)||add<0)bad('source PLUS arithmetic');
    if(add>0){
      add=add/2+rand()*(add/2);
      if(add<1&&add>0&&rand()*(1/add)<1)add=1;
    }else add=0;
    const units=safe(Math.trunc(add),'source units');
    const delta=item.plus>0?units:-units;
    const candidate=after[i]+delta;
    if(!Number.isSafeInteger(candidate))bad('source stock overflow');
    after[i]=candidate;slots.add(i); // += writes undef even when units=0.
    changes.push({itemId:item.id,plusSeconds:item.plus,
      drawsUsed:used-start,units,signedDelta:delta,beforeCap:candidate});
  }
  // Frozen whole.cgi::CheckWholeStore, ONCE after all PLUS.
  for(let i=0;i<79;i++){
    const limit=compiled.limits[i];if(!limit.code)continue;
    const cap=limit.wslimit<0?-limit.wslimit:
      Math.trunc(limit.wslimit*(world.shops.length||1)+0.99);
    safe(cap,'source wholesale cap');
    if(shop.item[i]+after[i]>cap){
      after[i]=cap-Math.min(shop.item[i],cap);slots.add(i);
    }
    if(after[i]<0){after[i]=0;slots.add(i);}
    safe(after[i],'final stock');
  }
  if(used!==randomDraws.length)bad('extra unused draws');
  const sorted=[...slots].sort((a,b)=>a-b),present=new Set(sorted);
  const csv=Array.from({length:(sorted.at(-1)??-1)+1},
    (_,i)=>present.has(i)?String(after[i]):'').join(',');
  const market={...world.market,wholesale:after,
    sparseWrittenSlots:sorted,originalWholesaleCsv:csv};
  if(!validateSourceSparseMarket(market))bad('sparse serialization');
  return {shops:world.shops,market,receipt:{
    action:'reviewed-sparse-multi-plus',source:MULTI_PLUS_SOURCE,
    items:changes,drawsUsed:used,timespanSeconds,
    sparseWrittenSlots:sorted,originalWholesaleCsv:csv,
    scope:'3 active PLUS, other 76 synthetic zero, source full cap; NO full inc-turn/clock/CGI/persistence',
  }};
}
