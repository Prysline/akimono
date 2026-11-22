/**
 * B-62. Original sword market has NO natural wholesale supply: ITEM #40
 * PLUS=-1h, so a fresh market cannot honestly sell #40. Source-valid path:
 * buy the genuine ITEM #14 sword-market map (PLUS=1h) through frozen
 * buy-s.cgi; execute a STRICTLY REVIEWED original #14 USE branch which
 * produces only wood swords, not phantom wholesale or unreviewed goods.
 *
 * The original USE has five probabilistic sword outputs and two callbacks.
 * B-62 accepts only the reviewed non-doubling, non-destroying map branch and
 * only wood-sword output, rejecting all other results atomically. Original
 * event / 36h / unknown item callback behavior is still fail-closed.
 */
import {parseDsl} from './parse-dsl.mjs';
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';

export const B62_MAP_SOURCE='b62-original-real-sword-map-market-and-bounded-use';
const fail=s=>{throw new RangeError('B-62 actual sword map: '+s);};
const safe=(n,k,min=0)=>{if(!Number.isSafeInteger(n)||n<min)fail(k);return n;};
const val=(b,k)=>b?.fields?.[k]?.map(x=>x.value)??[];
const first=(b,k)=>val(b,k)[0];
const mkItemIds=[40,41,42,43,44];
const chance=[400,350,150,60,30];

export function reviewOriginalB62SwordMap({
  itemDsl,model,compiled,reviewedMarket10,
  buySource,wholeSource,calcSource,itemSource,
  compilerSource,useSource,readSource,
}){
  if(reviewedMarket10?.itemId!==10||
     reviewedMarket10.marketTimeSeconds!==600||!itemDsl)
    fail('B-40 reviewed original buy prerequisite');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('source DSL error');
  const items=parsed.blocks.filter(x=>x.kind==='ITEM');
  const map=items.find(x=>first(x,'no')==='14');
  const wood=items.find(x=>first(x,'no')==='40');
  const mapModel=model?.items?.find(x=>x.id===14);
  if(!map||!wood||!mapModel||mapModel.code!=='shiire-ken'||
     mapModel.name!=='到劍市的地圖'||mapModel.price!==10000||
     mapModel.priceRaw!=='10000'||mapModel.plusRaw!=='1h'||
     mapModel.limitRaw!=='3/3'||mapModel.flagRaw!=='noshowcase'||
     mapModel.funcbRaw!==null||
     compiled?.limits?.[13]?.limit!==3||
     compiled.limits[13].wslimit!==3||
     first(wood,'plus')!=='-1h'||first(wood,'pop')!=='3h'||
     first(wood,'price')!=='1200'||first(wood,'limit')!=='600'||
     compiled.limits[39]?.limit!==600||
     compiled.limits[39]?.wslimit!==600)
    fail('original source #14 map/#40 wood-sword item drift');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===map.startLine);
  if(uses.length!==1)fail('original sword map USE not unique');
  const use=uses[0];
  for(const [k,expected]of [
    ['time','4h'],['exptime','2h'],['exp','2%'],['price','12000'],
    ['func','lostbook'],['param','100'],['funcb','_local_'],
    ['name','去劍的市場收購'],['action','購買'],
  ]){
    if(val(use,k).length!==1||first(use,k)!==expected)
      fail('original map USE '+k+' source drift');
  }
  if(val(use,'use').length||val(use,'get').length!==5||
     val(use,'needexp').length||val(use,'need').length||
     val(use,'needpoint').length||val(use,'needevent').length)
    fail('source map material/need/output changed');
  for(let i=0;i<5;i++){
    const n=model.items.find(x=>x.id===mkItemIds[i]);
    if(val(use,'get')[i].trim()!==
       '10 '+n.name+' '+[40,35,15,6,3][i]+'%')
      fail('source original map GET reward #'+n.id);
  }
  for(const [source,needle]of [
    [buySource,'$DTS=GetWholeStore();'],
    [buySource,'$DT->{item}[$itemno-1]+=$num;'],
    [buySource,'$DT->{paytoday}+=$num*$price;'],
    [wholeSource,'sub GetWholeStore'],
    [wholeSource,'sub CheckWholeStore'],
    [calcSource,'sub GetItemUseTime'],
    [calcSource,'sub UseTime'],
    [itemSource,'sub GetTimeDeal'],
    [useSource,'sub UseItem'],
    [useSource,'sub MakeAmount'],
    [useSource,'$itemcount=MakeAmount($item->{count}*$count,$item->{proba});'],
    [useSource,'CheckWholeStore();'],
    [useSource,'$USE->{result}->{function_return}=&$itemfunc();'],
    [useSource,'$DT->{exp}->{$USE->{itemno}}+=$expplus;'],
    [compilerSource,'if($2 eq \'%\'){$num*=10;}'],
    [readSource,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'],
  ])if(typeof source!=='string'||!source.includes(needle))
    fail('original fixed Core compiler/source drift '+needle);
  // Original pre-callback doubles create counts, before source UseItem.
  if(!use.raw.includes('return 0 if rand(1000)>100;')||
     !use.raw.includes('$_->{count}*=2;')||
     !use.raw.includes('foreach(@{$USE->{result}->{create}})'))
    fail('original sword map funcb source changed');
  const position=model.items.indexOf(mapModel);
  if(position<0||!Number.isSafeInteger(position))fail('source market sort');
  return Object.freeze({
    source:B62_MAP_SOURCE,mapItemId:14,swordItemId:40,position,
    mapPrice:10000,mapStockLimit:3,mapWholesaleLimit:3,
    mapBuyTimeSeconds:600,woodPrice:1200,woodStockLimit:600,
    mapUsePrice:12000,mapUseTimeSeconds:7200,
    mapUseExp:20,callbackChance:100,
    outputs:Object.freeze(mkItemIds.map((itemId,i)=>Object.freeze({
      itemId,probabilityPermille:chance[i],count:10,
    }))),
    scope:'original map market purchase + strictly reviewed map-use branch yielding only #40, exp accounting and no callback side effects; not all source USE outcomes',
    publicGameplay:false,
  });
}
export function quoteOriginalMarket14({world,model,reviewed}){
  if(reviewed?.source!==B62_MAP_SOURCE||
     !validateSourceSparseMarket(world?.market)||
     model?.items?.[reviewed.position]?.id!==14)
    fail('original source map quote requires reviewed market');
  const stock=safe(world.market.wholesale[13],'#14 wholesale');
  const shelf=model.items.slice(0,reviewed.position)
    .filter(item=>world.market.wholesale[item.id-1]>0).length;
  return Object.freeze({
    itemId:14,name:'到劍市的地圖',price:reviewed.mapPrice,
    marketStock:stock,shelf:stock?shelf:null,
    owned:world.shops[0]?.item?.[13]??0,
    limit:reviewed.mapStockLimit,
    canBuy:stock>0&&world.shops?.length===1,
  });
}
export function projectOriginalMarketBuy14({
  world,model,reviewed,shopId,requestedCount,marketShelf,expectedPrice,
}){
  safe(shopId,'shopId',1);safe(requestedCount,'count',1);
  safe(marketShelf,'market shelf');safe(expectedPrice,'quote price');
  if(reviewed?.source!==B62_MAP_SOURCE||world.events!==null||
     world.shops?.length!==1||!validateSourceSparseMarket(world.market))
    fail('one source reviewed market/shop required');
  const shop=world.shops[0];
  if(shop.id!==shopId||shop.status!==1||shop.item?.length!==79)
    fail('original shop identity');
  const before=safe(shop.item[13],'#14 owned');
  if(before>3)fail('map ownership exceeds source item limit');
  const q=quoteOriginalMarket14({world,model,reviewed});
  if(q.shelf===null||q.marketStock<1||
     marketShelf!==q.shelf||expectedPrice!==q.price)
    fail('original market map unavailable or stale quote');
  const count=Math.min(requestedCount,3-before,q.marketStock,
    Math.trunc(safe(shop.money,'cash')/q.price));
  if(count<1)fail('real source map purchase rejected');
  const elapsed=world.nowSeconds-safe(shop.time,'shop time');
  if(elapsed<0)fail('original UseTime exceeded source balance');
  const timeBase=elapsed>259200?world.nowSeconds-259200:shop.time;
  const total=safe(count*q.price,'purchase sum');
  const items=[...shop.item];items[13]=safe(before+count,'map after');
  const wholesale=[...world.market.wholesale];
  wholesale[13]=safe(q.marketStock-count,'market after');
  const present=new Set(wholesale.map((n,i)=>
    n>0||i===13?i:-1).filter(i=>i>=0));
  const slots=[...present].sort((a,b)=>a-b);
  const csv=Array.from({length:79},(_,i)=>
    present.has(i)?String(wholesale[i]):'').join(',');
  const market={...world.market,wholesale,
    originalWholesaleCsv:csv,sparseWrittenSlots:slots,
    sourceWriteShape:'whole-store-79'};
  if(!validateSourceSparseMarket(market))
    fail('original full 79 item market save wire');
  return {
    shops:[{...shop,item:items,
      money:safe(shop.money-total,'money after'),
      paytoday:safe(shop.paytoday+total,'paytoday'),
      time:safe(timeBase+reviewed.mapBuyTimeSeconds,'time after'),
    }],market,
    receipt:{action:'buy-market-item-14',source:reviewed.source,
      itemId:14,requestedCount,purchasedCount:count,
      marketShelf,unitPrice:q.price,totalPaid:total,
      marketBefore:q.marketStock,marketAfter:wholesale[13],
      ownedBefore:before,ownedAfter:items[13],
      timeConsumedSeconds:600,
      scope:'genuine B-40 fixed buy-s.cgi original map market purchase; no synthetic sword stock',
    },
  };
}
export function projectOriginalSwordMapUse({
  world,reviewed,shopId,randomDraws,
}){
  safe(shopId,'shopId',1);
  if(reviewed?.source!==B62_MAP_SOURCE||world.events!==null||
     world.shops?.length!==1||!validateSourceSparseMarket(world?.market))
    fail('reviewed original map source world');
  if(!Array.isArray(randomDraws)||randomDraws.length!==52||
     randomDraws.some(n=>!Number.isSafeInteger(n)||n<0||n>=1000000))
    fail('exact original funcbefore + 50 MakeAmount + lostbook draws');
  const shop=world.shops[0];
  if(shop.id!==shopId||shop.status!==1||shop.item?.length!==79||
     shop.item[13]<1||shop.item[13]>3||
     shop.exp!==undefined&&(
       shop.exp===null||typeof shop.exp!=='object'||
       Object.keys(shop.exp).some(k=>k!=='14'||shop.exp[k]!==20)))
    fail('legit purchased map and reviewed experience history required');
  if(shop.exp?.['14']!==undefined)
    fail('repeat map use with experience-reduced time not yet reviewed');
  if(shop.time+reviewed.mapUseTimeSeconds>world.nowSeconds)
    fail('original map use requires two hours of spendable time');
  if(shop.money<reviewed.mapUsePrice)
    fail('source map use requires 12000 funds');
  // GetUseItem invokes functionbefore which may double all five output
  // counts. The current branch MUST skip this side-effect. Unreviewed
  // callback branches are rejected, never silently ignored.
  if(randomDraws[0]<=100000)
    fail('source sword-market pre-callback doubled rewards unreviewed');
  const outputs=[];
  let used=1;
  for(let i=0;i<5;i++){
    let count=0;
    for(let j=0;j<10;j++){
      const draw=randomDraws[used++];
      if(draw<chance[i]*1000)count++;
    }
    outputs.push({itemId:mkItemIds[i],produced:count});
  }
  if(outputs.slice(1).some(x=>x.produced!==0))
    fail('other four sword creations unreviewed; no CAS mutation');
  // True Standard Street lostbook callback calls Core UseItem on 10%
  // (rand(1000)<100). This initial milestone handles only its safe
  // no-destruction branch; deliberately reject instead of faking it.
  if(randomDraws[51]<100000)
    fail('original lostbook map destruction callback unreviewed');
  const acquired=outputs[0].produced;
  const items=[...shop.item],old=safe(items[39],'existing wooden sword');
  if(old+acquired>600)
    fail('source #40 original inventory cap/overflow branch unreviewed');
  items[39]=old+acquired;
  const money=safe(shop.money-12000,'use money');
  const paytoday=safe(shop.paytoday+12000,'use paytoday');
  const time=safe(shop.time+7200,'use time');
  return {
    shops:[{...shop,item:items,money,paytoday,time,
      exp:{14:20}}],
    receipt:{
      action:'use-original-sword-map-14',source:reviewed.source,
      sourceUseItemId:14,useNo:0,
      sourceMapWasOwned:shop.item[13],
      sourceMapRetained:items[13],
      swordsCreated:acquired,woodStockBefore:old,
      woodStockAfter:items[39],moneySpent:12000,
      timeSpentSeconds:7200,experienceGain:20,
      callbackDoubleTriggered:false,callbackLostbookTriggered:false,
      randomDrawsUsed:52,createdResults:outputs,
      sourceScope:'real SOURCE #14 use: no-double/no-lostbook/only #40 success branch; all other RNG outcomes fail closed',
    },
  };
}
