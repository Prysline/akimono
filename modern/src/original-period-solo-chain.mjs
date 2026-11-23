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

export const B50_INTEGRATED_SOURCE='core-original-solo-period-phase-chain-no-world-commit';
const bad=x=>{throw new RangeError('B-50 same-state original period: '+x);};
const safe=(n,label,min=0)=>{
  if(!Number.isSafeInteger(n)||n<min)bad(label);
  return n;
};
export function reviewOriginalSoloPeriodPhaseChain({
  periodSource,configSource,itemDsl,model,compilerSource,
  originalAddItemSource,detailSource,readSource,adminSource,
  bootstrapMeta,compiledLimits,includeReviewedDragon=false,
}){
  if(!Array.isArray(compiledLimits)||compiledLimits.length!==79||
     compiledLimits.some(x=>!Number.isSafeInteger(x)||x<0))
    bad('exact original compiled 79 item limits required');
  const soloSort=reviewOriginalSoloSort({detailSource,readSource});
  const topPrize=reviewOriginalTopPrize({
    itemDsl,model,originalAddItemSource,periodSource,
  });
  const ledger=reviewOriginalPeriodShopLedger({
    periodSource,configSource,itemDsl,model,compilerSource,
  });
  if(typeof includeReviewedDragon!=='boolean')
    bad('explicit original DragonBalance opt-in boolean required');
  const dragon=includeReviewedDragon?
    reviewR4DragonBalance({periodSource}):null;
  const territory=reviewOriginalPeriodTerritory({
    periodSource,adminSource,readSource,bootstrapMeta,
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
  return Object.freeze({
    source:B50_INTEGRATED_SOURCE,
    soloSort,topPrize,ledger,territory,dragon,
    compiledLimits:Object.freeze([...compiledLimits]),
    phases:Object.freeze(['SortDT-before','rankingcount++',
      ...(dragon?['DragonBalance-file-before-prize']:[]),
      'UpdateResetBefore-and-TopGetItem',
      ...(dragon?['dragon-shop-ledger-before-history']:[]),
      'single-shop-ledger','SortDT-after','unled-town',
      'UpdateResetAfter-guard']),
    nonCommittable:true,
    scope:dragon?
      'reviewed single-shop original DragonBalance file IO then real shop payout before history, no stale close/guild/events/backup, exp sum <=4000; noncommittable period phase chain':
      'reviewed one active shop, no stale close/dragon/guild/events, exp sum <=4000, no skill items, source stage chain ONLY; not full period',
  });
}
/**
 * This pure phase chain takes the SAME object through source-backed stages.
 * The original starts from already sorted shops; we include SortDT-before
 * to align with inc-turn.cgi before inc-period.cgi.
 */
export function projectOriginalSoloPeriodPhaseChain({
  reviewed,shop,town,dtPeople,
  awardDrawMillionths,territoryDrawMillionths,
  payoutText=null,
}){
  if(reviewed?.source!==B50_INTEGRATED_SOURCE||
     reviewed.nonCommittable!==true)
    bad('reviewed non-committable sources required');
  if(!shop||shop.id!==1||shop.status!==1||
     !Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(shop.showcase)||shop.showcase.length!==1||
     !Array.isArray(shop.price)||shop.price.length!==1||
     shop.showcasecount!==1||
     !(shop.guild===undefined||shop.guild==='')||
     (!reviewed.dragon&&![undefined,0].includes(shop.dragon))||
     ![undefined,0].includes(shop.dignity)||
     (!reviewed.dragon&&![undefined,0].includes(shop.drmoney))||
     (reviewed.dragon&&
       (![undefined,'number'].includes(typeof shop.dragon)||
        ![undefined,'number'].includes(typeof shop.drmoney)))||
     !(shop.exp===undefined||(
       shop.exp!==null&&typeof shop.exp==='object'&&!Array.isArray(shop.exp)&&
       Object.values(shop.exp).every(x=>Number.isSafeInteger(x)&&x>=0)&&
       Object.values(shop.exp).reduce((a,b)=>a+b,0)<=4000))
    )
    bad('external guild, dragon, high EXP or post-period callback dependency');
  if(reviewed.dragon!==null&&(
     reviewed.dragon.source!==R4_DRAGON_BALANCE_SOURCE||
     reviewed.dragon.committable!==false))
    bad('original DragonBalance source contract required');
  if(reviewed.dragon===null&&payoutText!==null)
    bad('dragon payout file cannot be supplied without source review');
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
  const dragonSettlement=reviewed.dragon?
    projectR4DragonShopLedger({
      reviewed:reviewed.dragon,shops:[award.shop],
    }):null;
  const accounting=projectOriginalPeriodShopLedger({
    shop:dragonSettlement?.shops[0]??award.shop,
    reviewed:reviewed.ledger,
    reviewedDragonSettlement:dragonSettlement,
    limits:reviewed.compiledLimits,
  });
  const afterSort=projectOriginalSoloSort({
    shop:accounting.shop,reviewed:reviewed.soloSort,
  });
  const city=projectOriginalPeriodTerritory({
    reviewed:reviewed.territory,town,dtPeople,
    shopCount:1,taxIn:accounting.shop.taxyesterday,
    drawMillionths:territoryDrawMillionths,
    leaderShopExists:false,activeEventKeys:[],
  });
  return Object.freeze({
    source:reviewed.source,
    shop:afterSort.shop,
    town:city.town,
    dtPeople:city.dtPeople,
    pointsBefore:beforeSort.shop.point,
    pointsAfter:afterSort.shop.point,
    prize:award.prize,
    maintenance:accounting.chargedMaintenance,
    ...(reviewed.dragon?{
      dragonLogs:dragonSettlement.logs,
      dragonPayoutFileConsumed:payout.payoutFileConsumed,
      dragonSource:reviewed.dragon.source,
    }:{}),
    phases:reviewed.phases,
    nonCommittable:true,
    worldStateWritten:false,
    limitation:reviewed.scope,
  });
}
