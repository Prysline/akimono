/** R3 shared frozen inc-turn natural-sale arithmetic.
 * Works on one to eight source-reviewed shelves of one source shop.
 * Source ITEM metadata and exact RNG samples are supplied by the StreetModule.
 * Callbacks, 59 PLUS, EVENT and settlement remain in their original stages.
 */
const fail=s=>{throw new RangeError('R3 shared natural-sale: '+s);};
const int=(v,s,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)fail(s);
  return v;
};

/** Original inc-turn.cgi shop loop + market.cgi::GetMarketStatus.
 * The first shelf uses fourth-power demand; the second uses third-power
 * demand. Multiple shelves of the SAME ITEM share a demand denominator,
 * doubled source market-stock entries and one inventory pool.
 * Source multiplayer, >8 shelves and live EVENT overlays are not reviewed.
 */
export function projectSharedNaturalSale({
  shop,rule=null,saleRules=null,upkeepCosts,spanSeconds,randomDraws,
  popularOverride=null,population=500000,saleSpeed=12,
  popDownRate=5,baseUpkeep=0,reviewedSignedCash=false,recordShelfSales=false,
}){
  int(spanSeconds,'timespan',1);int(population,'population',1);
  int(saleSpeed,'speed',1);int(popDownRate,'pop down',1);
  int(baseUpkeep,'base upkeep');
  if(!shop||!Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(shop.showcase)||!Array.isArray(shop.price)||
     shop.showcase.length!==shop.price.length||
     shop.showcase.length<1||shop.showcase.length>8||
     (shop.showcase.length>1&&shop.showcasecount!==shop.showcase.length)||
     !upkeepCosts||typeof upkeepCosts!=='object'||
     !Array.isArray(randomDraws)||randomDraws.length>121||
     randomDraws.some(n=>!Number.isSafeInteger(n)||n<0||n>=1000000))
    fail('invalid source shop or draws');
  const shelfCount=shop.showcase.length;
  if(shelfCount>1&&(rule!==null||!saleRules||
     typeof saleRules!=='object'||popularOverride!==null))
    fail('multi-shelf source rules or EVENT overlay not reviewed');

  const active=[],market=new Map(),displayedTypes=new Set();
  let sourceGroup=null,demandScanOpen=true;
  const sourceRule=id=>shelfCount===1?rule:saleRules?.[id]??null;
  for(let shelf=0;shelf<shelfCount;shelf++){
    const id=int(shop.showcase[shelf],'source shelf item');
    const listed=int(shop.price[shelf],'source shelf price');
    if(id===0){
      if(listed!==0||(shelfCount===1&&rule!==null))
        fail('invalid empty source shelf');
      continue;
    }
    const r=sourceRule(id);
    if(!r||r.itemId!==id||int(r.unitPrice,'source base price',1)<1||
       listed<1||int(r.popularSeconds,'source popularity')<0||
       (r.popularSeconds===0&&(id!==65||r.zeroPopularReviewed!==true))||
       int(r.point,'source point')<0||id>79)
      fail('displayed ITEM price or rule not source reviewed');
    if(shelfCount===1&&rule?.itemId!==id)
      fail('single original shelf rule mismatch');
    const type=r.itemType??(shelfCount===1?'single-reviewed':'');
    if(!type)fail('multi-shelf source ITEM type not reviewed');
    displayedTypes.add(type);
    // Frozen inc-turn first scans the specialty group and accumulates
    // buypeoplebase in the SAME loop. The first unlike displayed type
    // breaks that scan BEFORE its weight is counted, even with zero stock.
    // GetMarketStatus and the subsequent sale loop still visit every shelf.
    if(demandScanOpen){
      if(sourceGroup!==null&&sourceGroup!==type)demandScanOpen=false;
      else sourceGroup=type;
    }
    const stock=int(shop.item[id-1],'source showcased stock');
    if(stock===0)continue;
    const exponent=shelf===0?4:3;
    const ratio=r.unitPrice/listed;
    const weight=ratio**exponent;
    if(!Number.isFinite(weight)||weight<0)
      fail('unsafe original per-shelf demand ratio');
    const existing=market.get(id)??{
      stock:0,weightedPrice:0,buypeoplebase:0,rule:r,
    };
    existing.stock+=stock; // Original GetMarketStatus counts each occupied shelf
    existing.weightedPrice+=stock*listed;
    if(demandScanOpen)existing.buypeoplebase+=weight;
    market.set(id,existing);
    active.push({shelf,id,listed,ratio,weight,rule:r});
  }
  const rankBefore=int(shop.rank,'rank');
  const temprank=rankBefore+(displayedTypes.size===1?1000:0);
  const item=[...shop.item],itemtoday={...shop.itemtoday};
  const cashMin=reviewedSignedCash?-Number.MAX_SAFE_INTEGER:0;
  let money=int(shop.money,'money',cashMin);
  let trush=int(shop.trush??0,'trush');
  let saletoday=int(shop.saletoday,'saletoday');
  let taxtoday=int(shop.taxtoday??0,'taxtoday');
  let used=0;
  const rand=()=>{
    if(used>=randomDraws.length)fail('missing natural/PLUS source draw');
    return randomDraws[used++]/1000000;
  };
  const sourcePopular=r=>popularOverride??r.popularSeconds;
  const seed=population*saleSpeed/3/50;
  for(const status of market.values()){
    status.marketprice=Math.trunc(status.weightedPrice/status.stock);
    const popular=sourcePopular(status.rule);
    status.uppoint=popular===0?100:Math.max(10,Math.min(1000,
      Math.trunc(status.stock/seed*popular)));
  }

  let sold=0,rankUp=0,rankDown=0;
  const soldByItem={},shelfSales=[];
  const saleRecords={};
  const showcasedWithStock=new Set();
  for(const {shelf,id,listed,ratio,weight,rule:r} of active){
    if(item[id-1]===0)continue; // May have sold out on an earlier shelf
    showcasedWithStock.add(id);
    const status=market.get(id);
    const rankWeight=temprank<100?99:temprank;
    if(temprank===0)fail('unreviewed zero-rank source shop normalization');
    // Frozen inc-turn skips buypeople assignment when POP is zero.
    // The item still contributes to the display group and upkeep above.
    const popular=sourcePopular(r);
    const visitors=popular===0?0:population*saleSpeed/popular*
      spanSeconds/86400 * weight/(status.buypeoplebase+1)*
      (rankWeight/temprank);
    let saleRank=ratio;
    if(saleRank<1)saleRank/=(listed-r.unitPrice)/10000;
    const buyerPool=visitors*(saleRank>1?1:saleRank);
    if(!Number.isFinite(buyerPool)||buyerPool<0)
      fail('unsafe original price demand');
    let amount=buyerPool>0?rand()*buyerPool:0;
    if(amount<1&&amount>0&&rand()*(1/amount)<1)amount=1;
    amount=Math.trunc(amount);
    if(amount>0){
      const take=Math.min(amount,int(item[id-1],'stock'));
      const rankUpMulti=((10-rankBefore/1000)**2)/5;
      const priceRate=Math.min(2,status.marketprice/listed);
      const contribution=Math.min(rand()*(rankUpMulti/status.uppoint*
        r.point/10*take*priceRate),spanSeconds/3);
      rankUp+=contribution;
      const proceeds=int(take*listed,'proceeds');
      // Frozen item.cgi::GetSaleTax; base source UserTaxRate is zero.
      let taxRate=listed/r.unitPrice-1;
      if(taxRate>0)taxRate*=5;
      let taxDown=1;
      if(taxRate<0){taxDown=taxRate+1;taxRate=0;}
      taxRate=Math.min(99,Math.trunc(taxRate*taxDown+0.5));
      const tax=int(Math.trunc(proceeds*taxRate/100),'sale tax');
      money=int(money+proceeds-tax,'money after sale',cashMin);
      trush=int(trush+proceeds,'trush after sale');
      saletoday=int(saletoday+proceeds,'saletoday after sale');
      taxtoday=int(taxtoday+tax,'taxtoday after sale');
      const stockBefore=item[id-1];
      item[id-1]-=take;
      // Evidence from the very same sequential inventory mutation. No
      // separate price, RNG, demand, stock or tax calculation.
      if(recordShelfSales)shelfSales.push({shelf,itemId:id,count:take,unitPrice:listed,
        gross:proceeds,tax,stockBefore,stockAfter:item[id-1]});
      itemtoday[id]=int((itemtoday[id]??0)+take,'itemtoday');
      sold+=take;
      soldByItem[id]=(soldByItem[id]??0)+take;
      const record=saleRecords[id]??{count:0,price:0};
      record.count+=take;record.price+=proceeds;
      saleRecords[id]=record;
      if(item[id-1]===0)rankDown+=(rankBefore/100)**3/1000;
    }
  }
  rankDown+=Math.sqrt(spanSeconds)*(rankBefore/1000)**popDownRate/
    (5**popDownRate*20)*shelfCount;
  rankDown*=0.75+trush/10000000;
  let delta=Math.abs(rankUp-rankDown);
  if(delta<1&&rankDown>0&&rand()*(1/delta)<1)delta=1;
  const rank=Math.max(0,Math.min(10000,
    rankBefore+Math.trunc(rankUp>rankDown?delta:-delta)));
  let upkeep=baseUpkeep;
  for(let id=1;id<=item.length;id++){
    const count=int(item[id-1],'item count');
    if(!count)continue;
    const cost=upkeepCosts[id];
    if(!Number.isSafeInteger(cost)||cost<0)
      fail('unknown source upkeep for ITEM '+id);
    upkeep+=cost*(showcasedWithStock.has(id)?count/10:count);
  }
  const accrual=upkeep*spanSeconds/86400;
  const costtoday=shop.costtoday+accrual;
  if(!Number.isFinite(costtoday)||costtoday<0||
     Math.abs(costtoday)>Number.MAX_SAFE_INTEGER)
    fail('unsafe fractional upkeep');
  trush=int(trush+Math.trunc(accrual),'integer upkeep waste');
  return {shop:{
      ...shop,item,itemtoday,money,trush,saletoday,taxtoday,rank,temprank,
      costtoday,_sale_count_:saleRecords,
    },sold,soldByItem,...(recordShelfSales?{shelfSales}:{}),drawsUsed:used};
}
