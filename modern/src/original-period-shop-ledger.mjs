/**
 * B-44 reviewed single-shop settlement LEDGER phase of frozen Core period.cgi.
 * This is a pure preparatory projection, not an entire inc-period.cgi turn.
 * No WorldState write: prizes, world territory, events, callbacks, guilds,
 * ranking order, stale-shop closure, backup and sessions remain unimplemented.
 */
import {R4_DRAGON_BALANCE_SOURCE} from './original-r4-dragon-balance.mjs';
import {R4_DIGNITY_SOURCE} from './original-r4-period-dignity-decay.mjs';
import {R4_GUILD_FEE_SOURCE} from './original-r4-guild-period-fee.mjs';
import {R4_TECH_LOSS_SOURCE} from './original-r4-post-period-tech-loss.mjs';
import {R4_CLOSE_SHOP_EFFECT_SOURCE}
  from './original-r4-close-shop-effects.mjs';
export const B44_LEDGER_SOURCE='core-inc-period-single-shop-ledger-before-dignity';
const fail=x=>{throw new RangeError('B-44 source-period ledger: '+x);};
const check=(n,key,min=0)=>{if(!Number.isSafeInteger(n)||n<min)fail(key);return n;};
const guard=(s,frag,label)=>{if(typeof s!=='string'||!s.includes(frag))fail('source drift: '+label);};
export function reviewOriginalPeriodShopLedger({
  periodSource,configSource,itemDsl,model,compilerSource,
}){
  for(const [needle,label] of [
    ['$DT->{rankingyesterday}=$dtcount;','ranking index before daily ledger'],
    ['$DT->{profitstock}=int(($DT->{profitstock}*$PROFIT_DAY_COUNT+$DT->{saletoday}-$DT->{paytoday})/($PROFIT_DAY_COUNT+1));','three-period weighted profit'],
    ['$DT->{saleyesterday}=$DT->{saletoday};','sales yesterday'],
    ['$DT->{saletoday}=0;','sales today clear'],
    ['$DT->{payyesterday}=$DT->{paytoday};','purchases yesterday'],
    ['$DT->{paytoday}=0;','purchases today clear'],
    ['$DT->{itemyesterday}=$DT->{itemtoday};','item history'],
    ['$DT->{itemtoday}={};','item today clear'],
    ['$DT->{taxyesterday}=$DT->{taxtoday};','tax history'],
    ['$DT->{taxtoday}=0;','tax today clear'],
    ['$DT->{item}[$cnt-1]=$ITEM[$cnt]->{limit} if $DT->{item}[$cnt-1]>$ITEM[$cnt]->{limit};','79 item caps'],
    ['$DT->{item}[$cnt-1]=int($DT->{item}[$cnt-1]);','Perl int stock'],
    ['my $cost=int($DT->{costtoday});','floor maintenance'],
    ['$cost+=$SHOWCASE_COST[$DT->{showcasecount}-1];','shelf maintenance'],
    ['$DT->{money}-=$cost;','maintenance cash charge'],
    ['$DT->{paytoday}+=$cost;','new period payment'],
    ['$DT->{costyesterday}=$cost;','cost history'],
    ['$DT->{costtoday}=0;','cost today clear'],
    ['$DT->{exp}{$key}-=int($DT->{exp}{$key}*$EXP_DOWN_RATE/1000) if $EXP_DOWN_RATE;','exp percentage decay'],
    ['$DT->{exp}{$key}-=$EXP_DOWN_POINT;','exp point decay'],
    ['delete $DT->{exp}{$key} if $DT->{exp}{$key}<=0;','remove zero exp'],
  ])guard(periodSource,needle,label);
  for(const [needle,label] of [
    ['$PROFIT_DAY_COUNT','period weighted average'],
    ['$EXP_DOWN_RATE','exp rate'],
    ['$EXP_DOWN_POINT','exp points'],
  ])guard(configSource,needle,label);
  if(!/\$PROFIT_DAY_COUNT\s*=3\s*;/.test(configSource)||
     !/\$EXP_DOWN_RATE\s*=60\s*;/.test(configSource)||
     !/\$EXP_DOWN_POINT\s*=5\s*;/.test(configSource))
    fail('Standard Street 3/60/5 period configuration drift');
  if(typeof itemDsl!=='string'||!/^\s*CostShowcase1\s+0\s*(?:#.*)?$/mi.test(itemDsl)||
     !/^\s*CostShowcase2\s+2000\s*(?:#.*)?$/mi.test(itemDsl))
    fail('Standard Street one-showcase source maintenance drift');
  guard(compilerSource,'GetDefineList("costshowcase"," ",1)','original showcase maintenance compiler');
  guard(compilerSource,'print OUT "\\@SHOWCASE_COST=qw($ary);\\n";','original showcase maintenance output');
  if(!model||model.maxItem!==79||
     !Array.isArray(model.items)||model.items.length!==79)
    fail('79-item Standard Street source catalog required');
  // The source lists CostShowcase1 0; original compiler indexes it as [0].
  // Never treat unspecified other shelf counts as zero.
  if(model.showcaseMaintenanceSource!==undefined&&
     model.showcaseMaintenanceSource!=='CostShowcase1=0')
    fail('reviewed showcase maintenance changed');
  return Object.freeze({
    source:B44_LEDGER_SOURCE,profitDayCount:3,
    expDownRate:60,expDownPoint:5,showcaseCount:1,
    showcaseDailyCost:0,maxItem:79,
    scope:'single shop period ledger/history/limits/exp only; no complete settlement or state writes',
  });
}
function checkedItemToday(value,key){
  if(value===null||typeof value!=='object'||Array.isArray(value))fail(key);
  const keys=Object.keys(value);
  if(keys.some(k=>!/^([1-9]|[1-6][0-9]|7[0-9])$/.test(k)))fail(key+' item id');
  return Object.fromEntries(keys.map(k=>[k,check(value[k],key+' qty')]));
}
function expMap(value){
  if(value===undefined)return {};
  return checkedItemToday(value,'exp');
}
/**
 * Project exactly the per-store ledger core subblock with guards for source
 * branches that the playable one-shop demo has not materialized.
 */
export function projectOriginalPeriodShopLedger({
  shop,reviewed,limits,reviewedDragonSettlement=null,
  reviewedDignity=null,reviewedGuild=null,reviewedPostTech=null,
  reviewedActualClose=null,
}){
  if(reviewed?.source!==B44_LEDGER_SOURCE||reviewed.showcaseDailyCost!==0)
    fail('reviewed source required');
  // The original dragon payout source stage is BEFORE this history block.
  // B-44 standalone remains unchanged: any dragon requires a matching
  // source-reviewed R4 shop-ledger result on this exact shop snapshot.
  const dragonAuthorized=reviewedDragonSettlement!==null&&
    reviewedDragonSettlement.source===R4_DRAGON_BALANCE_SOURCE&&
    reviewedDragonSettlement.committable===false&&
    reviewedDragonSettlement.shops?.length===1&&
    ['id','money','dragon','drmoney','saletoday','paytoday'].every(k=>
      reviewedDragonSettlement.shops[0][k]===shop?.[k]);
  if(reviewedDragonSettlement!==null&&!dragonAuthorized)
    fail('unreviewed or mismatched original dragon settlement receipt');
  const dignityAuthorized=reviewedDignity!==null&&
    reviewedDignity.source===R4_DIGNITY_SOURCE&&
    reviewedDignity.committable===false&&
    reviewedDignity.probabilityThreshold===25&&
    reviewedDignity.drawRange===100;
  if(reviewedDignity!==null&&!dignityAuthorized)
    fail('unreviewed source dignity review for original per-shop ledger');
  const guildAuthorized=reviewedGuild!==null&&
    reviewedGuild.source===R4_GUILD_FEE_SOURCE&&
    reviewedGuild.committable===false&&
    reviewedGuild.feeDivisor===1000;
  if(reviewedGuild!==null&&!guildAuthorized)
    fail('unreviewed source guild member fee review');
  const techAuthorized=reviewedPostTech!==null&&
    reviewedPostTech.source===R4_TECH_LOSS_SOURCE&&
    reviewedPostTech.committable===false&&
    reviewedPostTech.triggerExperience===4000&&
    reviewedPostTech.drawRange===14000&&
    reviewedPostTech.techniques?.length===4;
  if(reviewedPostTech!==null&&!techAuthorized)
    fail('unreviewed original high-EXP UpdateResetAfter');
  const closedAuthorized=reviewedActualClose!==null&&
    reviewedActualClose.source===R4_CLOSE_SHOP_EFFECT_SOURCE&&
    reviewedActualClose.committable===false&&
    reviewedActualClose.closed===true&&
    reviewedActualClose.shop?.id===shop?.id&&
    reviewedActualClose.shop?.status===0&&
    shop?.status===0;
  if(reviewedActualClose!==null&&!closedAuthorized)
    fail('unreviewed or mismatched real original CloseShop state');
  if(!shop||(!closedAuthorized&&shop.status!==1)||
     shop.showcasecount!==1||
     (!guildAuthorized&&shop.guild&&shop.guild!=='')||
     (!dragonAuthorized&&(
       shop.dragon&&shop.dragon!==0||shop.drmoney&&shop.drmoney!==0))||
     (!dignityAuthorized&&shop.dignity&&shop.dignity!==0))
    fail('unreviewed guild, dragon, dignity or shop state');
  if(!Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(limits)||limits.length!==79)
    fail('source shop stock and item limits');
  for(let i=0;i<79;i++){
    check(shop.item[i],'item['+i+']');
    check(limits[i],'limit['+i+']');
  }
  const previousProfit=check(shop.profitstock??0,'profitstock',-Number.MAX_SAFE_INTEGER);
  const sales=check(shop.saletoday,'saletoday');
  const payment=check(shop.paytoday,'paytoday');
  const taxes=check(shop.taxtoday,'taxtoday');
  const money=check(shop.money,'money',-Number.MAX_SAFE_INTEGER);
  const cost=shop.costtoday;
  if(typeof cost!=='number'||!Number.isFinite(cost)||cost<0||
     !Number.isSafeInteger(Math.trunc(cost)))
    fail('source fractional costtoday');
  const lastSales=checkedItemToday(shop.itemtoday,'itemtoday');
  const exp=expMap(shop.exp);
  const profit=Math.trunc((previousProfit*3+sales-payment)/4);
  const upkeep=Math.trunc(cost)+reviewed.showcaseDailyCost;
  if(!Number.isSafeInteger(previousProfit*3+sales-payment)||
     !Number.isSafeInteger(money-upkeep))
    fail('unsafe source arithmetic');
  const nextExp=Object.fromEntries(Object.entries(exp).flatMap(([id,v])=>{
    if(v>1000&&!techAuthorized)fail('unreviewed experience cap');
    const down=v-Math.trunc(v*60/1000)-5;
    return down>0?[[id,down]]:[];
  }));
  return Object.freeze({
    shop:{
      ...shop,
      profitstock:profit,
      rankingyesterday:1,
      saleyesterday:sales,saletoday:0,
      payyesterday:payment,paytoday:upkeep,
      itemyesterday:lastSales,itemtoday:{},
      taxyesterday:taxes,taxtoday:0,
      item:shop.item.map((n,i)=>Math.trunc(Math.min(n,limits[i]))),
      money:money-upkeep,
      costyesterday:upkeep,costtoday:0,
      exp:nextExp,
    },
    chargedMaintenance:upkeep,
    source:reviewed.source,
    scope:reviewed.scope,
  });
}
