/**
 * R2-D shared USE / manufacture transaction. GameCore owns one numeric
 * algorithm for every source-reviewed recipe. A StreetModule supplies
 * compiled rules, explicit callbacks and a wholesale wire adapter.
 * Unknown source effects are never treated as no-ops.
 */
import {projectOriginalUseTransaction} from './original-use-transaction-model.mjs';
import {readCommonUseEffectPlan} from './shared-use-effect-plan.mjs';
import {originalSourceUseClock,originalUseExperience}
  from './shared-use-experience.mjs';

export const USE_ITEM_COMMAND='use-item';
const fail=reason=>{throw new RangeError('R2-D shared USE: '+reason);};
const int=(n,label,min=0)=>{
  if(!Number.isSafeInteger(n)||n<min)fail(label);
  return n;
};
const exact=(object,required,optional=[])=>{
  const keys=Object.keys(object);
  if(keys.length<required.length||
     required.some(k=>!Object.hasOwn(object,k))||
     keys.some(k=>![...required,...optional].includes(k)))
    fail('unreviewed USE command fields');
};
const emptyEventState=world=>world.period===undefined||
  (world.period.eventState!==null&&
   world.period.eventState!==undefined&&
   typeof world.period.eventState==='object'&&
   !Array.isArray(world.period.eventState)&&
   Object.keys(world.period.eventState).length===0);
const noGuild=shop=>[undefined,null,0,'',false].includes(shop.guild);

/**
 * The only executable USE entry point. The common original transaction
 * orders gates, money, UseTime, materials, MakeAmount, creation and one
 * CheckWholeStore. Reviewed callbacks wrap its result in original order.
 * No product-ID branches live in GameCore.
 */
export function projectSharedUseItem({world,command,useItem}){
  exact(command,['kind','expectedRevision','shopId','itemId','useId',
    'requestedCount'],['randomDraws']);
  if(command.kind!==USE_ITEM_COMMAND)fail('command kind');
  int(command.shopId,'shopId',1);
  int(command.itemId,'itemId',1);
  int(command.useId,'useId');
  int(command.requestedCount,'requestedCount',1);
  if(!useItem||typeof useItem.getRule!=='function'||
     typeof useItem.validateWorld!=='function'||
     typeof useItem.writeMarket!=='function')
    fail('source USE registry/codec missing');
  const rule=useItem.getRule(command.itemId,command.useId);
  if(!rule||rule.itemId!==command.itemId||
     rule.useId!==command.useId||rule.supported!==true)
    fail(useItem.describe?.(command.itemId,command.useId)??
      'source USE not reviewed');
  const effects=readCommonUseEffectPlan(rule);
  if(!world.market||!Array.isArray(world.market.wholesale)||
     world.market.wholesale.length!==rule.limits.length)
    fail('missing explicit 79-slot source wholesale or marked test fixture');
  if(world.events!==null||!emptyEventState(world)||
     !useItem.validateWorld({world,rule}))
    fail('unreviewed source EVENT/market/world overlay');
  if(!Array.isArray(world.shops)||!world.shops.length||
     world.shops.length>12)fail('shop count');
  const shopIndex=world.shops.findIndex(s=>s.id===command.shopId);
  if(shopIndex<0)fail('unknown shop');
  const shop=world.shops[shopIndex];
  if(shop.status!==1||!noGuild(shop)||
     !Array.isArray(shop.item)||shop.item.length!==rule.limits.length)
    fail('unreviewed source status, guild or inventory');
  for(const row of world.shops){
    if(!Array.isArray(row.item)||row.item.length!==rule.limits.length)
      fail('shop inventory slots');
    row.item.forEach((v,i)=>int(v,'inventory '+i));
  }
  if(!world.market||!Array.isArray(world.market.wholesale)||
     world.market.wholesale.length!==rule.limits.length)
    fail('missing explicit 79-slot source wholesale or marked test fixture');
  world.market.wholesale.forEach((n,i)=>int(n,'wholesale '+i));
  for(const key of ['money','paytoday','time','rank'])int(shop[key],key);
  if(rule.singleUseOnly&&command.requestedCount!==1)
    fail('unreviewed original multiple USE');
  const expRecord=shop.exp??{};
  if(!expRecord||typeof expRecord!=='object'||Array.isArray(expRecord))
    fail('unreviewed EXP record');
  for(const [key,value] of Object.entries(expRecord)){
    if(!/^[1-9]\d*$/.test(key)||Number(key)>rule.limits.length)
      fail('EXP item key');
    if(int(value,'EXP amount')>1000)fail('EXP item cap');
  }
  const previousExp=expRecord[String(rule.itemId)]??0;
  if(rule.firstUseOnly&&previousExp!==0)
    fail('first-use-only reviewed rule');
  const effectiveClock=originalSourceUseClock({rule,job:shop.job??'',
    experience:previousExp});
  if(rule.requiresOwnedItem){
    if(shop.item[rule.itemId-1]<1||
       shop.item[rule.itemId-1]>rule.ownedMaximum)
      fail('source USE item not owned within reviewed limits');
  }
  if(rule.outputGuard==='no-overflow'){
    for(const output of rule.creates){
      const slot=output.itemId-1,limit=rule.limits[slot]?.limit;
      if(int(shop.item[slot],'preexisting output')>limit||
         world.market.wholesale[slot]!==0)
        fail('unreviewed original production overflow/wholesale');
    }
  }
  const draws=command.randomDraws??[];
  if(!Array.isArray(draws)||draws.some(n=>
     !Number.isSafeInteger(n)||n<0||n>=1000000))
    fail('invalid explicit random samples');
  let pointer=0;
  const random=()=>{
    if(pointer>=draws.length)fail('missing exact original random sample');
    return draws[pointer++]/1000000;
  };
  let doubled=false,resultOk=rule.resultOk??null;
  let creates=effects.creates;
  if(rule.beforeCallback){
    const callback=rule.beforeCallback;
    if(callback.kind!=='double-create'||callback.threshold!==100)
      fail('unreviewed before callback');
    doubled=random()*1000<=callback.threshold;
    if(doubled&&!callback.allowDouble)
      fail('source callback doubled production is not reviewed');
    if(doubled){
      creates=creates.map(row=>({...row,
        countPerUse:int(row.countPerUse*2,'doubled output count')}));
      resultOk=callback.resultOk;
    }
  }
  if(rule.afterCallback&&
     (rule.afterCallback.kind!=='lostbook'||
      ![10,25,50,100,200].includes(rule.afterCallback.threshold)||
      rule.afterCallback.consumedCount!==1))
    fail('unreviewed after callback');
  if(rule.experienceCallback&&
     (rule.experienceCallback.kind!=='gain-fixed-exp'||
      !Number.isSafeInteger(effects.expPoints)||
      effects.expPoints<1||effects.expPoints>1000))
    fail('unreviewed EXP callback');
  const original=projectOriginalUseTransaction({
    shops:world.shops.map(s=>s.item),
    actingShopIndex:shopIndex,items:rule.limits,
    wholesale:world.market.wholesale,uses:effects.uses,creates,
    requestedCount:command.requestedCount,
    experience:previousExp,needExperience:rule.needExperience??0,
    experienceOld:previousExp,job:shop.job??'',needJob:rule.needJob??'',
    point:shop.point??0,needPoint:rule.needPoint??0,
    rank:shop.rank,needPopularity:rule.needPopularity??0,
    needsEvent:false,eventActive:false,
    money:shop.money,costPerUse:rule.money,paytoday:shop.paytoday,
    nowSeconds:world.nowSeconds,storedTimeSeconds:shop.time,
    baseUseTimeSeconds:effectiveClock.base,trainedUseTimeSeconds:effectiveClock.trained,
    maxStockTimeSeconds:259200,shopStatus:true,random,
  });
  if(!original.performed||original.count<=0)
    fail('original GetUseItem/CheckUseItem effective count zero');
  if(rule.outputGuard==='no-overflow'&&original.multiItem.discarded.length)
    fail('unreviewed original manufacturing overstock');
  if(rule.outputAllowlist&&original.multiItem.added.some(row=>
      !rule.outputAllowlist.includes(row.itemId)))
    fail('source output callback/branch not reviewed');
  let destroyed=false;
  let useItems=original.multiItem.consumed.map(x=>[x.itemId,x.amount]);
  let useMsgs=original.multiItem.consumed.map((row,i)=>
    rule.sourceUseMessages?.[i]??null);
  let functionReturn=null;
  const stocks=[...original.shops[shopIndex]];
  if(rule.afterCallback){
    const callback=rule.afterCallback;
    destroyed=random()*1000<callback.threshold;
    if(destroyed&&!callback.allowLoss)
      fail('source lostbook effect not reviewed');
    if(destroyed){
      if(stocks[rule.itemId-1]<callback.consumedCount)
        fail('lostbook cannot consume item');
      stocks[rule.itemId-1]-=callback.consumedCount;
      useItems.push([rule.itemId,callback.consumedCount]);
      useMsgs.push(callback.message);
    }
    functionReturn='';
  }
  let added=original.multiItem.added.map(x=>[x.itemId,x.amount]);
  const discarded=original.multiItem.discarded.map(x=>[x.itemId,x.amount]);
  const nextShop={
    ...shop,item:stocks,money:original.money,
    paytoday:original.paytoday,time:original.storedTimeSeconds,
  };
  let inlineShowcase=null,inlineDairy=null,inlineWork=null;
  let inlineCareer=null,inlineParty=null,inlineAdvertisement=null;
  if(rule.inlineCallback?.kind==='advertise-self'){
    if(rule.itemId!==62||rule.useId!==0||
       !rule.singleUseOnly||original.count!==1||
       typeof useItem.runInlineCallback!=='function')
      fail('unreviewed source advertisement callback');
    inlineAdvertisement=useItem.runInlineCallback({
      rule,shop:nextShop,count:original.count,random,
    });
    if(!inlineAdvertisement||
       !Number.isSafeInteger(inlineAdvertisement.rank)||
       inlineAdvertisement.rank<0||inlineAdvertisement.rank>10000||
       typeof inlineAdvertisement.returned!=='string'||
       !Array.isArray(inlineAdvertisement.logCalls))
      fail('original advertising callback invalid');
    nextShop.rank=inlineAdvertisement.rank;
    functionReturn=inlineAdvertisement.returned;
  }
  if(rule.inlineCallback?.kind==='party-popularity'){
    if(rule.itemId!==77||rule.useId!==0||
       !rule.singleUseOnly||original.count!==1||
       typeof useItem.runInlineCallback!=='function')
      fail('unreviewed party popup callback');
    inlineParty=useItem.runInlineCallback({
      rule,shop:nextShop,count:original.count,random,
    });
    if(!inlineParty||!Number.isSafeInteger(inlineParty.rank)||
       inlineParty.rank<0||inlineParty.rank>10000||
       typeof inlineParty.returned!=='string'||
       !Array.isArray(inlineParty.logCalls))
      fail('source party popup result invalid');
    nextShop.rank=inlineParty.rank;
    functionReturn=inlineParty.returned;
  }
  if(rule.inlineCallback?.kind==='career-change'){
    if(rule.itemId!==78||rule.useId<0||rule.useId>13||
       !rule.singleUseOnly||original.count!==1||
       typeof useItem.runInlineCallback!=='function')
      fail('unreviewed career use callback');
    inlineCareer=useItem.runInlineCallback({
      rule,shop:nextShop,count:original.count,random,
    });
    if(!inlineCareer||!inlineCareer.exp||
       typeof inlineCareer.exp!=='object'||
       Array.isArray(inlineCareer.exp)||
       typeof inlineCareer.job!=='string'||
       typeof inlineCareer.returned!=='string'||
       !Array.isArray(inlineCareer.logCalls))
      fail('original career callback output invalid');
    nextShop.job=inlineCareer.job;
    nextShop.exp={...inlineCareer.exp};
    functionReturn=inlineCareer.returned;
  }
  if(rule.inlineCallback?.kind==='book-work'){
    if(rule.itemId!==13||rule.useId>1||
       typeof useItem.runInlineCallback!=='function')
      fail('unsupported work source callback');
    inlineWork=useItem.runInlineCallback({
      rule,shop:nextShop,count:original.count,random,
    });
    if(!inlineWork||!Number.isSafeInteger(inlineWork.moneyAfter)||
       inlineWork.moneyAfter<0||
       inlineWork.moneyBefore!==nextShop.money||
       inlineWork.earned!==(rule.useId===0?3000:10000)*original.count||
       !Array.isArray(inlineWork.logCalls))
      fail('original inline work projection mismatch');
    nextShop.money=inlineWork.moneyAfter;
    functionReturn=inlineWork.returned;
  }
  if(rule.inlineCallback&&
     ['milk-cow','drink-milk'].includes(rule.inlineCallback.kind)){
    if(typeof useItem.runInlineCallback!=='function'||
       ![25,26].includes(rule.itemId))
      fail('unreviewed dairy callback type');
    inlineDairy=useItem.runInlineCallback({
      rule,shop:nextShop,count:original.count,random,
    });
    if(!inlineDairy||!Array.isArray(inlineDairy.items)||
       inlineDairy.items.length!==rule.limits.length||
       !Number.isSafeInteger(inlineDairy.rank)||
       inlineDairy.rank<0||inlineDairy.rank>10000||
       typeof inlineDairy.returned!=='string'||
       !Array.isArray(inlineDairy.addItems)||
       !Array.isArray(inlineDairy.useItems))
      fail('source dairy inline result invalid');
    nextShop.item=[...inlineDairy.items];
    nextShop.rank=inlineDairy.rank;
    for(const item of inlineDairy.addItems)added.push([...item]);
    for(const item of inlineDairy.useItems)useItems.push([...item]);
    for(const msg of inlineDairy.useMessages)useMsgs.push(msg);
    functionReturn=inlineDairy.returned;
  }
  if(rule.inlineCallback?.kind==='showcase-resize'){
    if(rule.inlineCallback.kind!=='showcase-resize'||
      !rule.singleUseOnly||rule.itemId!==63||original.count!==1||
      typeof useItem.runInlineCallback!=='function')
      fail('unreviewed inline source callback');
    inlineShowcase=useItem.runInlineCallback({rule,shop:nextShop});
    if(!inlineShowcase||!Number.isSafeInteger(inlineShowcase.showcaseCountAfter)||
      inlineShowcase.showcaseCountAfter!==rule.inlineCallback.newCount||
      !Array.isArray(inlineShowcase.showcase)||
      !Array.isArray(inlineShowcase.prices)||
      inlineShowcase.showcase.length!==inlineShowcase.showcaseCountAfter||
      inlineShowcase.prices.length!==inlineShowcase.showcaseCountAfter)
      fail('source inline callback result invalid');
    nextShop.showcasecount=inlineShowcase.showcaseCountAfter;
    nextShop.showcase=[...inlineShowcase.showcase];
    nextShop.price=[...inlineShowcase.prices];
    functionReturn=inlineShowcase.returned;
  }
  if(pointer!==draws.length)
    fail('extra random samples beyond original call sequence');
  let experienceGain=0,experienceReductions=[];
  if(rule.experienceCallback){
    const next=originalUseExperience({records:expRecord,itemId:rule.itemId,
      points:effects.expPoints,count:original.count,
      limit:3600});
    nextShop.exp=next.exp;
    experienceGain=next.gained;
    experienceReductions=next.reductions;
  }
  const nextShops=world.shops.map((row,i)=>i===shopIndex?nextShop:
    {...row,item:[...original.shops[i]]});
  const market=useItem.writeMarket({world,rule,original});
  const acquired=original.multiItem.samples.filter(x=>x.phase==='create')
    .map(x=>({
      itemId:x.itemId,attemptedCount:x.request,
      probabilityPermille:creates.find(c=>c.itemId===x.itemId).probabilityPermille,
      produced:x.amount,drawCount:x.draws,branch:x.branch,
    }));
  return {
    shops:nextShops,market,
    receipt:{
      action:USE_ITEM_COMMAND,shopId:command.shopId,
      itemId:rule.itemId,useId:rule.useId,source:rule.source,
      sourceFile:rule.sourceFile,sourceLine:rule.sourceLine,
      sourceUseItemId:rule.itemId,useNo:rule.useId,
      requestedCount:command.requestedCount,effectiveCount:original.count,
      moneySpent:original.moneySpent,timeSpentSeconds:original.timeSpentSeconds,
      experienceGain,experienceReductions,
      useTimeSeconds:original.useTimeSeconds,
      originalUseItem:useItems,originalUseMsg:useMsgs,
      originalAddItem:added,
      originalAddMsg:added.map(([id],index)=>
        index>=original.multiItem.added.length&&inlineDairy?
          inlineDairy.addMessages[index-original.multiItem.added.length]:
          rule.outputMessages?.[id]??null),
      originalFunctionReturn:functionReturn,originalResultOk:resultOk,
      ...(inlineDairy||inlineWork||inlineCareer||inlineParty||
         inlineAdvertisement?{
        originalInlineLogCalls:(inlineAdvertisement?.logCalls??
          inlineParty?.logCalls??inlineCareer?.logCalls??
          inlineDairy?.logCalls??inlineWork.logCalls),
      }:{}),
      ...(inlineShowcase?{
        showcaseCountBefore:inlineShowcase.showcaseCountBefore,
        showcaseCountAfter:inlineShowcase.showcaseCountAfter,
      }:{}),
      originalWholeStoreChecks:original.wholeStoreChecks,
      randomDrawsUsed:pointer,callbackOrder:Object.freeze([
        ...(rule.beforeCallback?['before-use']:[]),
        'check-use','account','materials','make-amount','check-whole-store',
        ...(rule.afterCallback?['after-use']:[]),
        ...(inlineShowcase||inlineDairy||inlineWork||inlineCareer||
           inlineParty||inlineAdvertisement?['source-inline-callback']:[]),
        ...(rule.experienceCallback?['experience']:[]),
      ]),
      doubleRewardTriggered:doubled,mapDestroyed:destroyed,
      acquired,discarded,
      spentGift:useItems.find(([id])=>id===rule.itemId)?.[1]??0,
      gainedMaps:added,
      mapBefore:shop.item[rule.itemId-1],
      mapAfter:nextShop.item[rule.itemId-1],
      sourceScope:rule.scope,
    },
  };
}
