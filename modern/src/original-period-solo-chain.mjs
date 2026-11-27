/**
 * B-50: assemble the reviewed original one-shop SOURCE settlement stages over
 * ONE shop and ONE city state, twice in sequence. NEVER commit to WorldState:
 * full inc-turn EVENT/FUNCTURN/FUNCSALE, DragonBalance, stale-shop closure,
 * guild data/files, backup/sessions and storage are outside this harness.
 *
 * The matching Perl test executes frozen SortDT, @@FUNCUPDATE before+after,
 * AddItem, the original ledger and territory source regions on this SAME
 * state, not separate cherry-picked fixture answers.
 */
import {reviewOriginalSoloSort,projectOriginalSoloSort}
  from './original-period-solo-sort.mjs';
import {reviewOriginalTopPrize,projectOriginalTopPrize}
  from './original-period-top-prize.mjs';
import {reviewOriginalPeriodShopLedger,projectOriginalPeriodShopLedger}
  from './original-period-shop-ledger.mjs';
import {reviewOriginalPeriodTerritory,projectOriginalPeriodTerritory}
  from './original-period-territory.mjs';
import {reviewR4DragonBalance,projectR4DragonBalance,
  projectR4DragonShopLedger,R4_DRAGON_BALANCE_SOURCE}
  from './original-r4-dragon-balance.mjs';
import {reviewR4DignityDecay,projectR4DignityDecay,
  R4_DIGNITY_SOURCE}
  from './original-r4-period-dignity-decay.mjs';
import {reviewR4GuildFee,projectR4GuildFee,R4_GUILD_FEE_SOURCE}
  from './original-r4-guild-period-fee.mjs';
import {reviewR4PostPeriodTechLoss,projectR4PostPeriodTechLoss,
  R4_TECH_LOSS_SOURCE} from './original-r4-post-period-tech-loss.mjs';
import {reviewR4PeriodShopExpiry,projectR4PeriodShopExpiry,
  R4_EXPIRED_SHOP_SOURCE} from './original-r4-period-shop-expiry.mjs';
import {reviewR4CloseShopEffects,projectR4CloseShopEffects,
  reviewR4ClosedShopPrune,projectR4ClosedShopPrune,
  R4_CLOSE_SHOP_EFFECT_SOURCE,R4_CLOSED_STORE_PRUNE_SOURCE}
  from './original-r4-close-shop-effects.mjs';
import {reviewR4PeriodBackupTail,projectR4PeriodBackupTail,
  R4_PERIOD_BACKUP_SOURCE}
  from './original-r4-period-backup-tail.mjs';

export const B50_INTEGRATED_SOURCE='core-original-solo-period-phase-chain-no-world-commit';
const bad=x=>{throw new RangeError('B-50 same-state original period: '+x);};
const safe=(n,label,min=0)=>{
  if(!Number.isSafeInteger(n)||n<min)bad(label);
  return n;
};
const multiShelfChainReviews=new WeakSet();
const fullCommerceCloseReviews=new WeakSet();
export function reviewOriginalSoloPeriodPhaseChain({
  periodSource,configSource,itemDsl,model,compilerSource,
  writeSource=null,
  originalAddItemSource,detailSource,readSource,adminSource,
  bootstrapMeta,compiledLimits,includeReviewedDragon=false,
  includeReviewedDignity=false,includeReviewedGuild=false,
  includeReviewedPostTech=false,includeReviewedShopExpiry=false,
  includeReviewedActualCloseShop=false,
  includeReviewedPeriodBackup=false,includeReviewedSaleTax=false,
  includeReviewedMultiShelf=false,includeReviewedFullCommerceClose=false,includeReviewedLocalizedClose=false,
}){
  if(typeof includeReviewedMultiShelf!=='boolean')bad('explicit multi-shelf period opt-in');
  if(typeof includeReviewedFullCommerceClose!=='boolean'||
     includeReviewedFullCommerceClose&&(!includeReviewedMultiShelf||
       !includeReviewedShopExpiry||!includeReviewedActualCloseShop||
       includeReviewedDragon||includeReviewedGuild||includeReviewedPostTech||includeReviewedPeriodBackup))
    bad('explicit independent full commerce CloseShop source review required');
  if(typeof includeReviewedLocalizedClose!=='boolean'||includeReviewedLocalizedClose&&!includeReviewedFullCommerceClose)
    bad('localized CloseShop requires reviewed independent full commerce');
  // The new opt-in is only the independent prize/ledger/territory prefix.
  // External dragon, guild, archive and post-tech source branches retain
  // their single-shelf review except the independently reviewed full
  // commerce CloseShop archive + ledger chain. No external IO is enabled.
  if(includeReviewedMultiShelf&&(includeReviewedDragon||includeReviewedGuild||
     includeReviewedPostTech||includeReviewedActualCloseShop&&!includeReviewedFullCommerceClose||includeReviewedPeriodBackup))
    bad('unreviewed multi-shelf external period dependencies');
  if(!Array.isArray(compiledLimits)||compiledLimits.length!==79||
     compiledLimits.some(x=>!Number.isSafeInteger(x)||x<0))
    bad('exact original compiled 79 item limits required');
  const soloSort=reviewOriginalSoloSort({detailSource,readSource});
  const topPrize=reviewOriginalTopPrize({
    itemDsl,model,originalAddItemSource,periodSource,includeReviewedMultiShelf,
  });
  const ledger=reviewOriginalPeriodShopLedger({
    periodSource,configSource,itemDsl,model,compilerSource,includeReviewedMultiShelf,
  });
  if(typeof includeReviewedDragon!=='boolean'||
     typeof includeReviewedDignity!=='boolean'||
     typeof includeReviewedGuild!=='boolean'||
     typeof includeReviewedPostTech!=='boolean'||
     typeof includeReviewedShopExpiry!=='boolean'||
     typeof includeReviewedActualCloseShop!=='boolean'||
     typeof includeReviewedPeriodBackup!=='boolean')
    bad('explicit original source period feature opt-in boolean required');
  const dragon=includeReviewedDragon?
    reviewR4DragonBalance({periodSource}):null;
  const dignity=includeReviewedDignity?
    reviewR4DignityDecay({periodSource}):null;
  const guild=includeReviewedGuild?
    reviewR4GuildFee({periodSource}):null;
  const postTech=includeReviewedPostTech?
    reviewR4PostPeriodTechLoss({itemDsl,model,periodSource}):null;
  const shopExpiry=includeReviewedShopExpiry?
    reviewR4PeriodShopExpiry({periodSource,configSource,localized:includeReviewedLocalizedClose}):null;
  if(includeReviewedActualCloseShop&&!shopExpiry)
    bad('real CloseShop requires the source period owner-expiry gate');
  const actualClose=includeReviewedActualCloseShop?
    reviewR4CloseShopEffects({writeSource,readSource,configSource},{fullCommerce:includeReviewedFullCommerceClose}):null;
  const closedPrune=actualClose?
    reviewR4ClosedShopPrune({
      detailSource,writeSource,reviewedClose:actualClose,
    }):null;
  const periodBackup=includeReviewedPeriodBackup?
    reviewR4PeriodBackupTail({periodSource,configSource}):null;
  const territory=reviewOriginalPeriodTerritory({
    periodSource,adminSource,readSource,bootstrapMeta,includeReviewedSaleTax,
  });
  const markers=[
    '$DT[0]->{rankingcount}++;',
    'DragonBalance();',
    'UpdateResetBefore() if defined(&UpdateResetBefore);',
    '#前期の情報を保存',
    '$DT->{costtoday}=0;',
    '#爵位ポイント自然減少',
    'SortDT();',
    '#領土データ調整',
    'UpdateResetAfter() if defined(&UpdateResetAfter);',
    '#データバックアップ',
  ];
  let last=-1;
  for(const key of markers){
    const index=periodSource?.indexOf(key,last+1)??-1;
    if(index<=last)bad('original period phase order/source drift '+key);
    last=index;
  }
  if(typeof itemDsl!=='string'||!itemDsl.includes('sub UpdateResetAfter')||
     !itemDsl.includes('UpdateTodayEraseTech();')||
     !itemDsl.includes('next if $expsum<=4000;'))
    bad('Standard Street after-period skill callback drift');
  if(!periodSource.includes('if ($NOW_TIME-$DT->{foundation} > 43200')||
     !periodSource.includes('if ($DT->{lastlogin}+$EXPIRE_TIME<$NOW_TIME)'))
    bad('stale-shop closure source not locked');
  if(!periodSource.includes('require "$ITEM_DIR/funcupdate.cgi" if $DEFINE_FUNCUPDATE;')||
     !periodSource.includes('DragonBalance();'))
    bad('external update/dragon dependencies changed');
  const reviewed=Object.freeze({
    source:B50_INTEGRATED_SOURCE,
    soloSort,topPrize,ledger,territory,dragon,dignity,guild,postTech,
    shopExpiry,actualClose,closedPrune,periodBackup,
    compiledLimits:Object.freeze([...compiledLimits]),
    phases:Object.freeze(['SortDT-before','rankingcount++',
      ...(dragon?['DragonBalance-file-before-prize']:[]),
      'UpdateResetBefore-and-TopGetItem',
      ...(shopExpiry?[
        actualClose?'actual-frozen-CloseShop-status-session-archive':
          'original-absent-owner-CloseShop-call-only']:[]),
      ...(dragon?['dragon-shop-ledger-before-history']:[]),
      'single-shop-ledger',
      ...(guild?['guild-fee-and-attack-defense-after-sale-history']:[]),
      ...(dignity?['dignity-decline-before-second-SortDT']:[]),
      actualClose?'SortDT-after-closed-shop-prune':'SortDT-after',
      'unled-town',
      postTech?'UpdateResetAfter-technology-loss':'UpdateResetAfter-guard',
      ...(periodBackup?['original-period-backup-session-source-tail']:[])]),
    nonCommittable:true,
    scope:dragon||dignity||guild||postTech||shopExpiry||actualClose||periodBackup?
      'reviewed source opt-in single-shop original finances, actual CloseShop/SortDT pruning and/or frozen backup/session source tail; isolated Perl files verified but user/archive/guild IO only recorded, no atomic WorldState commit':
      'reviewed one active shop, no stale close/dragon/guild/events, exp sum <=4000, no skill items, source stage chain ONLY; not full period',
  });
  if(includeReviewedMultiShelf)multiShelfChainReviews.add(reviewed);
  if(includeReviewedFullCommerceClose)fullCommerceCloseReviews.add(reviewed);
  return reviewed;
}
/**
 * This pure phase chain takes the SAME object through source-backed stages.
 * The original starts from already sorted shops; we include SortDT-before
 * to align with inc-turn.cgi before inc-period.cgi.
 */
export function projectOriginalSoloPeriodPhaseChain({
  reviewed,shop,town,dtPeople,
  awardDrawMillionths,territoryDrawMillionths,
  payoutText=null,dignityDrawMillionths=null,guildContext=null,
  postTechDraws=null,nowSeconds=null,
  sessionFileNames=null,periodBackupState=null,archiveHashOrders=null,
}){
  if(reviewed?.source!==B50_INTEGRATED_SOURCE||
     reviewed.nonCommittable!==true)
    bad('reviewed non-committable sources required');
  if(!shop||shop.id!==1||shop.status!==1||
     !Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(shop.showcase)||!Array.isArray(shop.price)||
     (multiShelfChainReviews.has(reviewed)?
       !Number.isSafeInteger(shop.showcasecount)||shop.showcasecount<1||shop.showcasecount>8||
       shop.showcase.length!==shop.showcasecount||shop.price.length!==shop.showcasecount:
       shop.showcasecount!==1||shop.showcase.length!==1||shop.price.length!==1)||
     (!reviewed.guild&&!(shop.guild===undefined||shop.guild===''))||
     (!reviewed.dragon&&![undefined,0].includes(shop.dragon))||
     (!reviewed.dignity&&![undefined,0].includes(shop.dignity))||
     (!reviewed.dragon&&![undefined,0].includes(shop.drmoney))||
     (reviewed.dragon&&
       (![undefined,'number'].includes(typeof shop.dragon)||
        ![undefined,'number'].includes(typeof shop.drmoney)))||
     !(shop.exp===undefined||(
       shop.exp!==null&&typeof shop.exp==='object'&&!Array.isArray(shop.exp)&&
       Object.values(shop.exp).every(x=>Number.isSafeInteger(x)&&x>=0)&&
       (reviewed.postTech!==null||
        Object.values(shop.exp).reduce((a,b)=>a+b,0)<=4000)))
    )
    bad('external guild, dragon, high EXP or post-period callback dependency');
  if(reviewed.dragon!==null&&(
     reviewed.dragon.source!==R4_DRAGON_BALANCE_SOURCE||
     reviewed.dragon.committable!==false))
    bad('original DragonBalance source contract required');
  if(reviewed.dragon===null&&payoutText!==null)
    bad('dragon payout file cannot be supplied without source review');
  if(reviewed.dignity!==null&&(
      reviewed.dignity.source!==R4_DIGNITY_SOURCE||
      reviewed.dignity.committable!==false||
      reviewed.dignity.drawRange!==100))
    bad('dignity source contract required');
  if(reviewed.dignity===null&&dignityDrawMillionths!==null)
    bad('dignity random draws cannot be provided without original source');
  if(reviewed.guild!==null&&(
      reviewed.guild.source!==R4_GUILD_FEE_SOURCE||
      reviewed.guild.committable!==false||
      reviewed.guild.feeDivisor!==1000))
    bad('guild member source dues review required');
  if(reviewed.guild===null&&guildContext!==null)
    bad('unsupported original guild account IO in period chain');
  if(reviewed.postTech!==null&&(
     reviewed.postTech.source!==R4_TECH_LOSS_SOURCE||
     reviewed.postTech.committable!==false||
     reviewed.postTech.triggerExperience!==4000||
     reviewed.postTech.drawRange!==14000||
     reviewed.postTech.techniques?.length!==4))
    bad('source-reviewed post-period technical-loss contract required');
  if(reviewed.postTech===null&&postTechDraws!==null)
    bad('unreviewed post-period technique RNG on WorldState');
  if(reviewed.shopExpiry!==null&&(
    reviewed.shopExpiry.source!==R4_EXPIRED_SHOP_SOURCE||
    reviewed.shopExpiry.committable!==false||
    reviewed.shopExpiry.closeShopEffectKnown!==false||
    reviewed.shopExpiry.absenceLimitSeconds!==604800))
    bad('original absent-owner CloseShop source contract required');
  if(reviewed.shopExpiry===null&&nowSeconds!==null)
    bad('unreviewed absent-owner time on original period');
  if(reviewed.shopExpiry!==null)
    safe(nowSeconds,'actual original period NOW_TIME');
  if(reviewed.actualClose!==null&&(
     reviewed.actualClose.source!==R4_CLOSE_SHOP_EFFECT_SOURCE||
     reviewed.actualClose.committable!==false||
     reviewed.closedPrune?.source!==R4_CLOSED_STORE_PRUNE_SOURCE||
     reviewed.closedPrune.committable!==false))
    bad('true frozen CloseShop and SortDT reviewer required');
  if(reviewed.actualClose===null&&sessionFileNames!==null)
    bad('unreviewed external CloseShop session inventory cannot be supplied');
  const fullCommerceClose=fullCommerceCloseReviews.has(reviewed);
  if(Boolean(reviewed.actualClose?.fullCommerceArchive)!==fullCommerceClose||
     (!fullCommerceClose&&archiveHashOrders!==null))
    bad('unreviewed full commerce CloseShop archive hash order');
  if(reviewed.periodBackup!==null&&(
     reviewed.periodBackup.source!==R4_PERIOD_BACKUP_SOURCE||
     reviewed.periodBackup.committable!==false||
     reviewed.periodBackup.actualFileIOCommitted!==false))
    bad('original frozen period backup reviewer required');
  if(reviewed.periodBackup===null&&periodBackupState!==null)
    bad('unreviewed backup or session files supplied to period chain');
  if(reviewed.periodBackup!==null&&(
     !periodBackupState||typeof periodBackupState!=='object'||
     Array.isArray(periodBackupState)))
    bad('original full backup/session disk snapshot required');
  if(reviewed.periodBackup!==null&&nowSeconds!==null&&
     periodBackupState.nowSeconds!==nowSeconds)
    bad('original source backup NOW_TIME must match period NOW_TIME');
  safe(shop.foundation,'original shop foundation');
  safe(shop.lastlogin,'original shop lastlogin');
  safe(shop.time,'original shop time');
  safe(dtPeople,'original previous city population',1);
  if(!Array.isArray(territoryDrawMillionths)||
     territoryDrawMillionths.length!==2)
    bad('two reviewed source town draws required');
  const beforeSort=projectOriginalSoloSort({shop,reviewed:reviewed.soloSort});
  // Original order: SortDT (inc-turn) -> DragonBalance file read
  // -> UpdateResetBefore prize -> shop dragon ledger -> histories.
  const payout=reviewed.dragon?
    projectR4DragonBalance({
      reviewed:reviewed.dragon,shops:[beforeSort.shop],payoutText,
      applyShopLedger:false,
    }):null;
  const award=projectOriginalTopPrize({
    shop:payout?.shops[0]??beforeSort.shop,reviewed:reviewed.topPrize,
    drawMillionths:awardDrawMillionths,
  });
  // Frozen period.cgi checks absent owners inside its per-shop loop,
  // AFTER UpdateResetBefore, BEFORE dragon ledger and sale histories.
  // CloseShop itself is unreviewed external IO: record the exact call,
  // never delete a shop, mutate owner records or claim a transaction.
  const expiryEffect=reviewed.shopExpiry?
    projectR4PeriodShopExpiry({
      reviewed:reviewed.shopExpiry,shop:award.shop,nowSeconds,
    }):null;
  // True write.cgi CloseShop executes during the original per-shop loop,
  // BEFORE dragon income and the historical ledger. Source SortDT removes
  // the status=0 shop only after the financial and dignity stages.
  // SetUserData and WriteErrorLog remain recorded external calls.
  if(reviewed.actualClose!==null&&expiryEffect?.expiredOwner&&
     !Array.isArray(sessionFileNames))
    bad('real CloseShop requires explicit source session file inventory');
  if(fullCommerceClose&&!expiryEffect?.expiredOwner&&archiveHashOrders!==null)
    bad('no archive order before actual CloseShop');
  const actualCloseEffect=reviewed.actualClose&&expiryEffect?.expiredOwner?
    projectR4CloseShopEffects({
      reviewed:reviewed.actualClose,shopId:shop.id,
      shop:award.shop,sessionFileNames,reason:expiryEffect.closeCalls[0].reason,archiveHashOrders,
    }):null;
  const shopAfterClose=actualCloseEffect?.shop??award.shop;
  const dragonSettlement=reviewed.dragon?
    projectR4DragonShopLedger({
      reviewed:reviewed.dragon,shops:[shopAfterClose],
    }):null;
  const accounting=projectOriginalPeriodShopLedger({
    shop:dragonSettlement?.shops[0]??shopAfterClose,
    reviewed:reviewed.ledger,
    reviewedDragonSettlement:dragonSettlement,
    reviewedDignity:reviewed.dignity,
    reviewedGuild:reviewed.guild,
    reviewedPostTech:reviewed.postTech,
    reviewedActualClose:actualCloseEffect,
    limits:reviewed.compiledLimits,
  });
  // In the frozen source guild fees follow saleyesterday assignment and
  // upkeep, then precede the last exp/dignity block and SortDT. Original
  // guild treasury edits are still external calls, never fake writes.
  const guildEffect=reviewed.guild?
    projectR4GuildFee({
      reviewed:reviewed.guild,shop:accounting.shop,
      guild:guildContext,
    }):null;
  const dignityEffect=reviewed.dignity?
    projectR4DignityDecay({
      reviewed:reviewed.dignity,
      dignity:guildEffect?.shop.dignity??accounting.shop.dignity??0,
      randomDrawMillionths:dignityDrawMillionths,
    }):null;
  const beforeAfterSort=dignityEffect?{
    ...(guildEffect?.shop??accounting.shop),
    dignity:dignityEffect.dignityAfter,
  }:(guildEffect?.shop??accounting.shop);
  const closedSort=actualCloseEffect?
    projectR4ClosedShopPrune({
      reviewed:reviewed.closedPrune,closeEffect:actualCloseEffect,
    }):null;
  const afterSort=closedSort?{shop:null}:
    projectOriginalSoloSort({
      shop:beforeAfterSort,reviewed:reviewed.soloSort,
    });
  const city=projectOriginalPeriodTerritory({
    reviewed:reviewed.territory,town,dtPeople,
    shopCount:1,taxIn:accounting.shop.taxyesterday,
    drawMillionths:territoryDrawMillionths,
    leaderShopExists:false,activeEventKeys:[],
  });
  // Frozen UpdateResetAfter executes after the post-period SortDT and
  // territory section. Lost items only affect the NEXT period's ranking.
  if(closedSort&&reviewed.postTech&&
     (!Array.isArray(postTechDraws)||postTechDraws.length!==0))
    bad('original UpdateResetAfter has no shops after CloseShop/SortDT');
  const techLoss=reviewed.postTech&&!closedSort?
    projectR4PostPeriodTechLoss({
      reviewed:reviewed.postTech,shop:afterSort.shop,
      randomDraws:postTechDraws,
    }):null;
  // Original backup/session tail happens AFTER UpdateResetAfter. The
  // genuine three-directory file operations are exercised in a separate
  // frozen Perl tempfile oracle, but this projection NEVER writes disk.
  const periodBackupEffect=reviewed.periodBackup?
    projectR4PeriodBackupTail({
      reviewed:reviewed.periodBackup,...periodBackupState,
    }):null;
  return Object.freeze({
    source:reviewed.source,
    shop:techLoss?.shop??afterSort.shop,
    town:city.town,
    dtPeople:city.dtPeople,
    pointsBefore:beforeSort.shop.point,
    pointsAfter:afterSort.shop?.point??null,
    ...(closedSort?{
      closedShop:beforeAfterSort,
      activeShops:closedSort.activeShops,
      actualCloseEffect,
      closedSortSource:closedSort.source,
    }:{}),
    prize:award.prize,
    maintenance:accounting.chargedMaintenance,
    ...(reviewed.dragon?{
      dragonLogs:dragonSettlement.logs,
      dragonPayoutFileConsumed:payout.payoutFileConsumed,
      dragonSource:reviewed.dragon.source,
    }:{}),
    ...(reviewed.dignity?{
      dignityEffect,
      dignitySource:reviewed.dignity.source,
    }:{}),
    ...(reviewed.guild?{
      guildContext:guildEffect.guild,
      guildMoneyEdits:guildEffect.editGuildMoneyCalls,
      guildSource:reviewed.guild.source,
    }:{}),
    ...(reviewed.postTech?{
      postTechLoss:techLoss,
      postTechSource:reviewed.postTech.source,
    }:{}),
    ...(reviewed.shopExpiry?{
      shopExpiry:expiryEffect,
      shopExpirySource:reviewed.shopExpiry.source,
    }:{}),
    ...(reviewed.periodBackup?{
      periodBackup:periodBackupEffect,
      periodBackupSource:reviewed.periodBackup.source,
    }:{}),
    phases:reviewed.phases,
    nonCommittable:true,
    worldStateWritten:false,
    limitation:reviewed.scope,
  });
}
