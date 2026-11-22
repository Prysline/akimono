/**
 * R3 shared source natural-sale arithmetic. The caller must supply vetted
 * original ITEM parameters and must execute callbacks, PLUS and EVENT
 * separately in the original inc-turn.cgi order. Never a complete turn.
 */
const fail=s=>{throw new RangeError('R3 shared natural-sale: '+s);};
const int=(v,s,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)fail(s);
  return v;
};

/** Frozen inc-turn.cgi lines 39–196; market.cgi::GetMarketStatus.
 * Supported scope: one store, one first-position showcase at original price.
 * No ITEM-specific algorithm exists here.
 */
export function projectSharedNaturalSale({
  shop,rule,upkeepCosts,spanSeconds,randomDraws,
  popularOverride=null,population=500000,saleSpeed=12,
  popDownRate=5,baseUpkeep=50,
}){
  int(spanSeconds,'timespan',1);int(population,'population',1);
  int(saleSpeed,'speed',1);int(popDownRate,'pop down',1);
  int(baseUpkeep,'base upkeep');
  if(!shop||!Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(shop.showcase)||shop.showcase.length!==1||
     !Array.isArray(shop.price)||shop.price.length!==1||
     !upkeepCosts||typeof upkeepCosts!=='object'||
     !Array.isArray(randomDraws)||randomDraws.length>121||
     randomDraws.some(n=>!Number.isSafeInteger(n)||n<0||n>=1000000))
    fail('invalid source shop or draws');
  const displayed=shop.showcase[0],id=rule?.itemId??0;
  if((displayed===0&&rule!==null)||
     (displayed!==0&&(!rule||id!==displayed||
        rule.unitPrice!==shop.price[0])))
    fail('displayed ITEM not source reviewed at original price');
  const popular=popularOverride??rule?.popularSeconds??null;
  if(rule!==null&&(
     !Number.isSafeInteger(id)||id<1||id>79||
     !Number.isSafeInteger(popular)||popular<=0||
     !Number.isSafeInteger(rule.point)||rule.point<0))
    fail('invalid source popular/point');
  let used=0;
  const rand=()=>{
    if(used>=randomDraws.length)fail('missing natural/PLUS source draw');
    return randomDraws[used++]/1000000;
  };
  const item=[...shop.item],itemtoday={...shop.itemtoday};
  const rankBefore=int(shop.rank,'rank');
  let money=int(shop.money,'money');
  let trush=int(shop.trush??0,'trush');
  let saletoday=int(shop.saletoday,'saletoday');
  const temprank=rankBefore+(displayed!==0?1000:0);
  let sold=0,rankUp=0,rankDown=0;
  if(rule!==null&&item[id-1]>0){
    // Original price/display price=1, buypeoplebase=1, single shop rank ratio=1.
    const buyerPool=population*saleSpeed/popular*spanSeconds/86400/2;
    let sale=buyerPool>0?rand()*buyerPool:0;
    if(sale<1&&sale>0&&rand()*(1/sale)<1)sale=1;
    sale=Math.trunc(sale);
    if(sale>0){
      const stock=int(item[id-1],'stock');
      sold=Math.min(sale,stock);
      const seed=population*saleSpeed/3/50;
      const uppoint=Math.max(10,Math.min(1000,
        Math.trunc(stock/seed*popular)));
      const rankUpMulti=((10-rankBefore/1000)**2)/5;
      rankUp=Math.min(rand()*(rankUpMulti/uppoint*
        rule.point/10*sold),spanSeconds/3);
      const proceeds=int(sold*rule.unitPrice,'proceeds');
      money=int(money+proceeds,'money after sale');
      trush=int(trush+proceeds,'trush after sale');
      saletoday=int(saletoday+proceeds,'saletoday after sale');
      item[id-1]-=sold;
      itemtoday[id]=int((itemtoday[id]??0)+sold,'itemtoday');
      if(item[id-1]===0)rankDown+=(rankBefore/100)**3/1000;
    }
  }
  rankDown+=Math.sqrt(spanSeconds)*(rankBefore/1000)**popDownRate/
    (5**popDownRate*20);
  rankDown*=0.75+trush/10000000;
  let delta=Math.abs(rankUp-rankDown);
  if(delta<1&&rankDown>0&&rand()*(1/delta)<1)delta=1;
  const rank=Math.max(0,Math.min(10000,rankBefore+
    Math.trunc(rankUp>rankDown?delta:-delta)));
  let upkeep=baseUpkeep;
  for(let i=0;i<item.length;i++){
    const count=int(item[i],'item count');
    if(!count)continue;
    const cost=upkeepCosts[i+1];
    if(!Number.isSafeInteger(cost)||cost<0)
      fail('unknown source upkeep for ITEM '+(i+1));
    upkeep+=cost*(displayed===i+1?count/10:count);
  }
  const accrual=upkeep*spanSeconds/86400;
  const costtoday=shop.costtoday+accrual;
  if(!Number.isFinite(costtoday)||costtoday<0||
     Math.abs(costtoday)>Number.MAX_SAFE_INTEGER)
    fail('unsafe fractional upkeep');
  trush=int(trush+Math.trunc(accrual),'integer upkeep waste');
  return {shop:{
      ...shop,item,itemtoday,money,trush,saletoday,rank,temprank,costtoday,
      _sale_count_:sold?{[id]:{count:sold,price:sold*rule.unitPrice}}:{},
    },sold,drawsUsed:used};
}
