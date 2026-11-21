/**
 * B-38: original natural-sales subregion followed immediately by the exact
 * source 59-PLUS loop and original CheckWholeStore, on ONE shop.
 * The region BETWEEN these original blocks (item turn/sale callbacks,
 * sorting, period settlement) is intentionally NOT executed. Sale fixture
 * with one #10 item is explicitly ARTIFICIALLY stocked: no acquisition.
 * Source-populated variables and random draw order are compared directly
 * with Perl. Never claim this is one complete inc-turn.cgi.
 */
import {parseDsl} from './parse-dsl.mjs';
import {projectOriginalSparseAllPlus,ALL_PLUS_SOURCE}
  from './original-sparse-all-plus.mjs';
import {validateSourceSparseMarket,ORIGINAL_SPARSE_MARKET_SOURCE}
  from './original-admin-world-bootstrap.mjs';

export const NATURAL_PLUS_SOURCE='core-b38-one-shop-natural-region-then-all-plus';
function bad(message){throw new RangeError('B-38 natural source boundary: '+message);}
function marker(content,want){
  if(typeof content!=='string'||!content.includes(want))
    bad('frozen original source drift: '+want);
}
function integer(n,label,min=0){
  if(!Number.isSafeInteger(n)||n<min)bad(label);
  return n;
}
const first=(block,key)=>block?.fields[key]?.[0]?.value;
export function reviewOriginalNaturalSalePlus({
  turnSource,marketSource,itemSource,detailSource,configSource,
  compilerSource,itemDsl,reviewedAllPlus,
}){
  if(reviewedAllPlus?.source!==ALL_PLUS_SOURCE||
     reviewedAllPlus.activeCount!==59||reviewedAllPlus.population!==500000||
     reviewedAllPlus.maxUsers!==50)bad('B-37 reviewed original 59 PLUS missing');
  const fragments=[
    [turnSource,'#店舗・商品別来客数計算処理'],
    [turnSource,'GetMarketStatus();'],
    [turnSource,'#店舗別売上処理ループ'],
    [turnSource,'$sale=$buypeople/2*0+rand($buypeople * ($rank>1?1:$rank));'],
    [turnSource,'if(rand(1/$sale)<1){$sale=1;}'],
    [turnSource,'my($taxrate,$tax)=GetSaleTax($itemno,$sale,$saleprice,GetUserTaxRate($DT,$DTTaxrate));'],
    [turnSource,'$DT->{item}[$itemno-1]-=$sale;'],
    [turnSource,'$DT->{costtoday}+=$costsum*$timespan/86400;'],
    [turnSource,'#@@item 処理準備'],
    [turnSource,'#@@item funct 処理'],
    [turnSource,'#@@item funcs 処理'],
    [turnSource,'SortDT();'],
    [turnSource,'#決算処理'],
    [turnSource,'#市場商品数のUP/DOWN処理'],
    [marketSource,'sub GetMarketStatus'],
    [marketSource,'my $seed=$DTpeople*$SALE_SPEED/3/50;'],
    [marketSource,'$ITEM->{marketprice}=int($ITEM->{todayprice}/$stock) if $stock;'],
    [itemSource,'sub GetSaleTax'],
    [itemSource,'my $tax=int($price*$taxrate/100);'],
    [detailSource,'sub GetUserTaxRate'],
    [detailSource,'return $usertax*2 if ($DT->{taxmode}==2);'],
    [configSource,'$SALE_SPEED'],
    [configSource,'$POP_DOWN_RATE'],
    [compilerSource,'sub GetTime'],
    [compilerSource,'$g_item->{point}=int($g_item->{popular} * 100 / 24 / 36);'],
  ];
  for(const [text,want] of fragments)marker(text,want);
  if(!/\$SALE_SPEED\s*=\s*12\s*;/.test(configSource)||
     !/\$POP_DOWN_RATE\s*=\s*5\s*;/.test(configSource))
    bad('fixed original sale speed and rank-down rate changed');
  const blocks=parseDsl(itemDsl,'custom/inc-item-data.cgi').blocks;
  const get=id=>blocks.find(b=>b.kind==='ITEM'&&first(b,'no')===String(id));
  const book=get(10),gift=get(79),tool=get(63);
  if(first(book,'code')!=='book-make'||first(book,'price')!=='5000'||
     first(book,'pop')!=='20d'||first(book,'cost')!=='100'||
     first(book,'point')!==undefined||first(book,'funcs')!==undefined||
     first(book,'funct')!==undefined||
     first(gift,'code')!=='gift'||first(gift,'cost')!=='10'||
     first(gift,'price')!=='10000'||first(tool,'code')!=='edit-showcase'||
     first(tool,'cost')!==undefined)
    bad('fixed #10/#63/#79 source sale fixture changed');
  return Object.freeze({
    source:NATURAL_PLUS_SOURCE,timespanSeconds:1728,
    saleItemId:10,salePrice:5000,popularSeconds:1728000,
    point:Math.trunc(1728000*100/24/36),bookCost:100,
    giftCost:10,popDownRate:5,saleSpeed:12,userTaxRate:0,
    supported:Object.freeze(['original-new-shop-no-showcase','explicit-artificial-one-item-10-showcase']),
    scope:'single isolated original natural region, SKIPS original callbacks/sorting/period, then exact B-37 PLUS+cap',
  });
}
export function projectOriginalNaturalSalePlus({
  world,reviewed,reviewedAllPlus,compiled,randomDraws,
}){
  if(reviewed?.source!==NATURAL_PLUS_SOURCE||reviewedAllPlus?.source!==ALL_PLUS_SOURCE||
     reviewed.timespanSeconds!==1728||reviewed.saleItemId!==10||
     reviewed.point!==200000||reviewed.popularSeconds!==1728000||
     reviewed.salePrice!==5000||reviewed.giftCost!==10||reviewed.bookCost!==100||
     reviewed.popDownRate!==5||reviewed.saleSpeed!==12||reviewed.userTaxRate!==0)
    bad('reviewed natural source contract');
  if(!Array.isArray(randomDraws)||randomDraws.length>121||
     randomDraws.some(v=>!Number.isSafeInteger(v)||v<0||v>=1000000))
    bad('explicit complete shared random stream (integer millionths)');
  if(world?.market?.source!==ORIGINAL_SPARSE_MARKET_SOURCE||
     !validateSourceSparseMarket(world.market)||world.market.originalWholesaleCsv!==''||
     world.events!==null||world.nowSeconds!==1000000||
     !Array.isArray(world.shops)||world.shops.length!==1)
    bad('only fresh source sparse first-world market and one shop');
  const shop=world.shops[0];
  if(shop?.status!==1||shop.rank!==5010||shop.money!==100000||
     shop.showcasecount!==1||!Array.isArray(shop.showcase)||
     !Array.isArray(shop.price)||shop.showcase.length!==1||
     shop.price.length!==1||!Array.isArray(shop.item)||
     shop.item.length!==79||shop.item[62]!==1||shop.item[78]!==5||
     ![0,1].includes(shop.item[9])||
     shop.item.some((n,i)=>!Number.isSafeInteger(n)||n<0||
       (![9,62,78].includes(i)&&n!==0))||
     ![0,10].includes(shop.showcase[0])||
     (shop.showcase[0]===0&&(shop.price[0]!==0||shop.item[9]!==0))||
     (shop.showcase[0]===10&&(shop.price[0]!==5000||shop.item[9]!==1))||
     ![undefined,0].includes(shop.trush)||
     shop.saletoday!==0||shop.taxtoday!==0||shop.costtoday!==0||
     Object.keys(shop.itemtoday??{}).length!==0||
     Object.keys(shop.itemyesterday??{}).length!==0)
    bad('only reviewed original new shop / synthetic one-item showcase');
  if(!Array.isArray(compiled?.limits)||compiled.limits.length!==79)
    bad('source 79 wholesale caps missing');
  let used=0;
  function rand(){
    if(used===randomDraws.length)bad('missing natural/PLUS random draw');
    return randomDraws[used++]/1000000;
  }
  const display=shop.showcase[0]===10,span=reviewed.timespanSeconds;
  let count=0,rankup=0,rankdown=0;
  let money=shop.money,trush=shop.trush??0,saletoday=0,taxtoday=0;
  let tempRank=shop.rank+(display?1000:0);
  const items=[...shop.item],itemtoday={...shop.itemtoday};
  if(display){
    // Original buypeoplebase=1 when one #10 item offered at source price.
    const buyerBase=1;
    const buyers=reviewedAllPlus.population*reviewed.saleSpeed/
      reviewed.popularSeconds*span/86400;
    const buyersTemp=buyers/(buyerBase+1);
    const buyersResult=tempRank/(tempRank/1)*buyersTemp;
    let sale=0;
    if(buyersResult>0)sale=rand()*buyersResult;
    if(sale<1&&sale>0&&rand()*(1/sale)<1)sale=1;
    sale=Math.trunc(sale);
    if(sale>0){
      sale=Math.min(sale,items[9]);
      // Original GetMarketStatus: marketprice=5000; seed=40000,
      // uppoint=int(stock/seed*1728000)=43. Original source
      // GetSaleTax with shop taxmode0 / world taxrate0: rate0/tax0.
      const marketPoint=Math.max(10,Math.min(1000,Math.trunc(
        items[9]/(reviewedAllPlus.population*reviewed.saleSpeed/3/50)*
        reviewed.popularSeconds)));
      const rankupmulti=((10-shop.rank/1000)**2)/5;
      const extra=rand()*(rankupmulti/marketPoint*reviewed.point/10*sale);
      rankup+=Math.min(extra,span/3);
      const soldPrice=sale*reviewed.salePrice;
      money+=soldPrice;trush+=soldPrice;saletoday+=soldPrice;
      items[9]-=sale;itemtoday[10]=(itemtoday[10]??0)+sale;
      if(items[9]===0)rankdown+=(shop.rank/100)**3/1000;
      count=sale;
    }
    // Displayed but unsold item would result in fractional source cost
    // in this fixed 1728sec fixture; fail closed instead of rounding.
    if(count!==1)bad('only source-reviewed positive sale fixture supported');
  }
  rankdown+=Math.sqrt(span)*(shop.rank/1000)**reviewed.popDownRate/
    (5**reviewed.popDownRate*20)*shop.showcasecount;
  rankdown*=0.75+trush/10000000;
  let delta=Math.abs(rankup-rankdown);
  if(delta<1&&rankdown>0&&rand()*(1/delta)<1)delta=1;
  const rank=Math.min(10000,Math.max(0,shop.rank+
    Math.trunc(rankup>rankdown?delta:-delta)));
  const upkeep=items[78]*reviewed.giftCost+
    (items[9]?(display?items[9]/10:items[9])*reviewed.bookCost:0);
  const accrued=upkeep*span/86400;
  if(!Number.isSafeInteger(accrued))bad('unrepresentable fractional upkeep');
  trush+=Math.trunc(accrued);
  const newShop={
    ...shop,item:items,money,trush,rank,temprank:tempRank,
    saletoday,taxtoday,costtoday:accrued,itemtoday,
    _sale_count_:count?{'10':{count,price:count*reviewed.salePrice}}:{},
  };
  for(const [v,label] of [[newShop.money,'money'],[newShop.trush,'trush'],
    [newShop.rank,'rank'],[newShop.costtoday,'costtoday']])
    integer(v,label);
  const naturalDraws=used;
  // Exact same caller-provided stream flows into the original PLUS stage.
  const projected=projectOriginalSparseAllPlus({
    world:{...world,shops:[newShop]},reviewed:reviewedAllPlus,
    compiled,timespanSeconds:span,randomDraws:randomDraws.slice(used),
  });
  return {
    shops:projected.shops,market:projected.market,
    receipt:{
      action:'reviewed-natural-sale-plus',source:NATURAL_PLUS_SOURCE,
      saleScope:display?'explicit artificial #10 starting item':'real new shop with empty showcase',
      natural:{itemId:display?10:0,saleCount:count,
        moneyAfter:money,trushAfter:trush,rankAfter:rank,
        costToday:accrued,drawsUsed:naturalDraws},
      plus:{drawsUsed:projected.receipt.drawsUsed,activeItems:59},
      drawsUsed:naturalDraws+projected.receipt.drawsUsed,
      originalWholesaleCsv:projected.market.originalWholesaleCsv,
      sparseWrittenSlots:projected.market.sparseWrittenSlots,
      scope:'original source natural sales region, SKIPPED item callbacks/SortDT/period, original 59 PLUS+full cap; fixed one shop, no actual acquisition/time/CGI/persistence',
    },
  };
}
