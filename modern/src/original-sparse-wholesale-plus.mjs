/**
 * B-35 narrow ORIGINAL inc-turn.cgi PLUS fragment, after preceding sales and
 * callbacks. Item #10 ONLY is PLUS-active in this deliberately bounded Perl
 * fixture; every other item's PLUS is suppressed, NOT a real full turn.
 * CheckWholeStore nevertheless applies to all 79 source-compiled limits.
 * The B-34 sparse wholesale wire is preserved independently of the numeric
 * 79-slot projection. No clock update, CGI, disk I/O, or hidden randomness.
 */
import {listReviewedWholesalePlusItems} from './wholesale-turn-model.mjs';
import {
  ORIGINAL_SPARSE_MARKET_SOURCE,validateSourceSparseMarket,
} from './original-admin-world-bootstrap.mjs';

export const REVIEWED_SPARSE_PLUS_SOURCE='core-b35-post-sale-one-plus';
const META='500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0';
function fail(message){throw new RangeError('B-35 source boundary: '+message);}
function integer(value,name,min=0){
  if(!Number.isSafeInteger(value)||value<min)fail(name);
  return value;
}
export function reviewOriginalSparsePlusTurn({turnSource,wholeSource,configSource,model,compiled}){
  const excerpts=[
    [turnSource,'$add=$timespan/abs($ITEM->{plus})*$DTpeople/(100000/(($MAX_USER+$#DT-1)*0.2+1));'],
    [turnSource,'if($add>0){$add=$add/2+rand($add/2);}else{$add=0;}'],
    [turnSource,'if($add<1 && $add>0){if(rand(1/$add)<1){$add=1;}}'],
    [turnSource,'$DTwholestore[$cnt-1]+=$ITEM->{plus}>0 ? $add : -$add;'],
    [turnSource,'CheckWholeStore();'],
    [wholeSource,'sub CheckWholeStore'],
    [wholeSource,'my $shopcount=@DT; $shopcount||=1;'],
    [wholeSource,'$DTwholestore[$cnt-1]=$limitcount-$limit;'],
    [wholeSource,'$DTwholestore[$cnt-1]=0 if $DTwholestore[$cnt-1]<0;'],
  ];
  for(const [content,marker] of excerpts){
    if(typeof content!=='string'||!content.includes(marker))
      fail('fixed Core PLUS/wholesale source drift');
  }
  if(typeof configSource!=='string'||
     !/\$MAX_USER\s*=\s*50\s*;/.test(configSource))
    fail('fixed MAX_USER=50 config drift');
  const item=listReviewedWholesalePlusItems(model).find(x=>x.id===10);
  if(item?.code!=='book-make'||item.raw!=='20m'||
     item.plusSeconds!==1200||item.wslimit!==10)
    fail('source ITEM #10 PLUS drift');
  if(!compiled||compiled.itemId!==79||
     !Array.isArray(compiled.limits)||compiled.limits.length!==79||
     compiled.limits[9]?.wslimit!==10||
     compiled.limits.some(x=>!x.code||!Number.isFinite(x.wslimit)))
    fail('full source limits unavailable');
  return Object.freeze({
    source:REVIEWED_SPARSE_PLUS_SOURCE,itemId:10,index:9,
    plusSeconds:1200,population:500000,maxUsers:50,maxItem:79,
    scope:'one positive post-sale fragment; only ITEM #10 PLUS-active; 79 ITEM CheckWholeStore; no full inc-turn execution',
  });
}
export function projectOriginalSparsePlusTurn({
  world,reviewed,compiled,timespanSeconds,randomDraws,
}){
  if(reviewed?.source!==REVIEWED_SPARSE_PLUS_SOURCE||
     reviewed.itemId!==10||reviewed.plusSeconds!==1200||
     reviewed.population!==500000||reviewed.maxUsers!==50)
    fail('reviewed source missing');
  integer(timespanSeconds,'positive bounded timespan',1);
  if(timespanSeconds>3600)fail('timespan fixture exceeds reviewed bound');
  if(!Array.isArray(randomDraws)||randomDraws.length>2||
     randomDraws.some(n=>!Number.isSafeInteger(n)||n<0||n>=1000000))
    fail('explicit unit draws must be integer millionths');
  if(world?.market?.source!==ORIGINAL_SPARSE_MARKET_SOURCE||
     !validateSourceSparseMarket(world.market)||
     world.market.originalBootstrapMeta!==META||
     world.events!==null||
     !Array.isArray(world.shops)||world.shops.length!==1)
    fail('requires source-reviewed sparse market and exactly one shop');
  const before=world.market.wholesale;
  const after=[...before];
  const slots=new Set(world.market.sparseWrittenSlots);
  let used=0;
  function rand(){
    if(used>=randomDraws.length)fail('missing explicit random draw');
    return randomDraws[used++]/1000000;
  }
  // Source: $#DT=0 with one shop, MAX_USER=50, original initial DTpeople=500000.
  const coefficient=(reviewed.maxUsers+world.shops.length-2)*0.2+1;
  let add=timespanSeconds/reviewed.plusSeconds*reviewed.population/
    (100000/coefficient);
  if(!Number.isFinite(add)||add<0)fail('unsafe source PLUS base');
  if(add>0){
    add=add/2+rand()*(add/2);
    if(add<1&&add>0&&rand()*(1/add)<1)add=1;
  }else add=0;
  const units=Math.trunc(add);
  integer(units,'computed units');
  after[9]+=units; // Perl += defines the previously undefined sparse slot.
  integer(after[9],'item #10 post PLUS stock');
  slots.add(9);
  for(let i=0;i<79;i++){
    const config=compiled.limits[i];
    if(!config.code)continue;
    const wslimit=config.wslimit;
    const held=world.shops.reduce((sum,shop)=>{
      if(!Array.isArray(shop.item)||shop.item.length!==79)
        fail('shop inventory length');
      return sum+integer(shop.item[i],'shop stock');
    },0);
    integer(held,'total held stock');
    const cap=wslimit<0?-wslimit:Math.trunc(wslimit*(world.shops.length||1)+0.99);
    integer(cap,'original CheckWholeStore cap');
    if(held+after[i]>cap){
      after[i]=cap-Math.min(held,cap);
      slots.add(i);
    }
    if(after[i]<0){after[i]=0;slots.add(i);}
    integer(after[i],'post cap wholesale');
  }
  if(used!==randomDraws.length)fail('unused random draws');
  const defined=[...slots].sort((a,b)=>a-b);
  const present=new Set(defined);
  const csv=Array.from({length:(defined.at(-1)??-1)+1},(_,i)=>
    present.has(i)?String(after[i]):'').join(',');
  const market={
    ...world.market,wholesale:after,originalWholesaleCsv:csv,
    sparseWrittenSlots:defined,
  };
  if(!validateSourceSparseMarket(market))fail('invalid sparse result');
  return {
    shops:world.shops,market,
    receipt:{
      action:'reviewed-sparse-plus',source:REVIEWED_SPARSE_PLUS_SOURCE,
      itemId:10,timespanSeconds,drawsUsed:used,addedUnits:units,
      item10Before:before[9],item10After:after[9],
      sparseWrittenSlots:defined,originalWholesaleCsv:csv,
      scope:'post-sale synthetic fixture; ONLY #10 PLUS active; all 79 caps checked; no real turn/clock/persistence',
    },
  };
}
