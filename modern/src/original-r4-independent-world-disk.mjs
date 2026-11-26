/** Reviewed independent local world file projection.
 * B43 publishes a complete immutable file generation, not four live renames.
 * No original account/session, dragon or guild membership is manufactured.
 */
import {createHash} from 'node:crypto';
import {isR4IndependentCloseReview} from './original-r4-independent-close-candidate.mjs';
import {reviewR4CloseShopArchiveSource,projectR4CloseShopArchiveGeneration} from './original-r4-close-shop-archive-file.mjs';
import {reviewPeriodPlay,serializePeriodPlay,parsePeriodPlay} from './original-r4-period-play-file.mjs';
import {reviewTownFiles} from './original-r4-town-files.mjs';
import {reviewBackupDisk} from './original-r4-backup-disk.mjs';
import {reviewPeriodLog,projectCrossPeriodLogRows,projectReviewedEventLogRows,projectReviewedCommerceUseLogRows} from './original-r4-period-log-disk.mjs';
import {capReviewedCommerceCash} from './reviewed-normal-commerce-items.mjs';
import {projectReviewedWholesaleVoucherLogRows} from './original-r4-wholesale-voucher.mjs';
import {projectOriginalSoloSort} from './original-period-solo-sort.mjs';
import {PALACE_COMMAND,reviewOriginalPalaceRules,validatePalaceTown,describeOriginalPalace,projectOriginalPalaceMission} from './original-r4-palace-mission.mjs';
import {ARMY_COMMANDS,createIndependentArmyProjection} from './original-r4-independent-army.mjs';
export const R4_INDEPENDENT_DISK='r4-independent-source-disk.v1';
export const R4_SETTLED_STATE='source-reviewed-independent-settlement.v1';
const CANDIDATE='source-cross-period-candidate-not-committed';
const fail=s=>{throw new RangeError('R4 independent disk: '+s)};
const exact=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===k.split(',').sort().join(',');
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const backups=['log0.cgi','log1.cgi','log2.cgi','guildbal.cgi','play.cgi'];
const guild="use utf8;\n$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=();1;";
export function independentCandidateWorld(world){
  const {disk,...period}=world.period;
  return {...world,period:{...period,state:period.state===R4_SETTLED_STATE?CANDIDATE:period.state}};
}
function sha1(s){return typeof s==='string'?createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'):null}
export function createIndependentDiskProjection({sources,sort,street,r4CloseReview=null}){
  if(r4CloseReview!==null&&(!isR4IndependentCloseReview(r4CloseReview)||!street.reviewedNormalCommerce))fail('reviewed local closure required');
  const archive=r4CloseReview===null?null:reviewR4CloseShopArchiveSource(sources);
  const archiveName='log/delete.cgi',oldArchiveName='log/delete-old.cgi';
  const hasClosed=world=>Boolean(archive&&Object.hasOwn(world.period.disk?.live??{},archiveName));
  if(sha1(sources.newSource)!=='9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7')fail('frozen new.cgi required');
  const codec={reviewed:reviewPeriodPlay({writeSource:sources.writeSource,incFuncSource:sources.readSource,detailSource:sources.detailSource,configSource:sources.configSource},{crossPeriod:true,ordinaryMultiShelf:true,signedCash:street.reviewedNormalCommerce!==undefined,manualCommerce:street.reviewedManualCommerceEvents??null}),
    townReview:reviewTownFiles({custom:sources.customSource,read:sources.readSource,write:sources.writeSource})};
  reviewBackupDisk({period:sources.periodSource,write:sources.writeSource,config:sources.configSource});
  const log=reviewPeriodLog({log:sources.logSource,period:sources.periodSource,dsl:sources.itemDsl,config:sources.configSource});
  const palaceInputs=[sources.palaceViewSource,sources.palaceCommandSource,sources.palaceConfigSource];
  if(palaceInputs.some(s=>s!=null)&&palaceInputs.some(s=>s==null))fail('incomplete palace source set');
  const palace=palaceInputs.every(s=>s!=null)?reviewOriginalPalaceRules({
    viewSource:sources.palaceViewSource,handlerSource:sources.palaceCommandSource,
    configSource:sources.palaceConfigSource,readSource:sources.readSource}):null;
  const armyInputs=[sources.armyViewSource,sources.armyCommandSource,sources.armyFileSource,sources.armyCalcSource];
  if(armyInputs.some(s=>s!=null)&&armyInputs.some(s=>s==null))fail('incomplete army source set');
  const army=armyInputs.every(s=>s!=null)?createIndependentArmyProjection(sources):null;
  const palaceArgs={reviewed:palace,townReview:codec.townReview};
  const applyPalace=(world,command)=>projectOriginalPalaceMission({...palaceArgs,world,command});
  function wire(world,town){
    if(!world.market||world.period.eventState===null)fail('known source market and events required');
    return serializePeriodPlay({...codec,world:{lasttime:world.nowSeconds,people:world.period.dtPeople,nextid:100,blockip:'',taxRate:0,
      state:world.period.town,town,events:world.period.eventState,wholesale:world.market.wholesale,wholesaleCsv:world.market.originalWholesaleCsv,shops:world.shops}});
  }
  const entry=(bytes,mtime)=>({bytes,mtime});
  const capture=live=>Object.fromEntries(backups.map(n=>[n,live[n]]));
  function validateFiles(files,names,now){
    if(!exact(files,names.join(',')))fail('exact independent file set');
    for(const f of Object.values(files))if(!exact(f,'bytes,mtime')||typeof f.bytes!=='string'||!safe(f.mtime)||f.mtime>now||Buffer.byteLength(f.bytes)>160000)fail('bounded source file');
  }
  function validate(world){
    const d=world.period.disk;
    if(world.revision===0&&world.market===null){if(d!==undefined)fail('fresh world has no disk');return true;}
    if(!exact(d,palace?'source,live,backup,generations,townData':'source,live,backup,generations')||d.source!==R4_INDEPENDENT_DISK||!Array.isArray(d.generations)||d.generations.length!==3)fail('independent disk envelope required');
    const hasArmy=Boolean(army)&&Object.hasOwn(d.live??{},'army.cgi');
    const closed=hasClosed(world),oldArchive=Object.hasOwn(d.live??{},oldArchiveName);
    if((closed&&(world.shops.length!==0||world.period.settledCount<1))||(oldArchive&&!closed))fail('archive requires closed local career');
    validateFiles(d.live,[...backups,'guild.cgi','lasttime.cgi',...(hasArmy?['army.cgi']:[]),...(closed?[archiveName]:[]),...(oldArchive?[oldArchiveName]:[])],world.nowSeconds);
    if(army)army.validate(world);
    const town=palace?d.townData:{};
    if(palace)validatePalaceTown({...palaceArgs,town});
    if(d.live['play.cgi'].bytes!==wire(world,town)||d.live['lasttime.cgi'].mtime!==world.nowSeconds||d.live['lasttime.cgi'].bytes!==''||d.live['guildbal.cgi'].bytes!==''||d.live['guild.cgi'].bytes!==guild)fail('live source bytes differ from world');
    parsePeriodPlay({...codec,bytes:d.live['play.cgi'].bytes});
    for(const f of [d.backup,...d.generations])if(f!==null){validateFiles(f,backups,world.nowSeconds);const parsed=parsePeriodPlay({...codec,bytes:f['play.cgi'].bytes});if(palace)validatePalaceTown({...palaceArgs,town:parsed.town});}
    if(Buffer.byteLength(JSON.stringify(d))>100000)fail('independent source file history capacity');
    return true;
  }
  function finalize({before,command,applied,logRows=[],closeEffect=null}){
    const now=applied.nowSeconds??before.nowSeconds;
    const raw=applied.period??before.period;
    const {disk:unused,...period}=raw;
    if(period.state===CANDIDATE)period.state=R4_SETTLED_STATE;
    const shops=applied.shops.map(s=>{
      let next={...s};
      if(command.kind==='open-shop'){
        // Local single account has no original login/password/IP/session.
        // Only original unset fields are normalized on source-backed creation.
        next={pass:'',comment:'',remoteaddr:'',guild:'',blocklogin:'',nocheckip:'',job:'',
          rankingcount:0,dignity:0,profitstock:0,taxmode:0,drmoney:0,trush:0,exp:{},user:{},...next};
      }
      if(['edit-showcase','market-buy','use-item',PALACE_COMMAND,...ARMY_COMMANDS].includes(command.kind)||
         (street.reviewedDiscard===true&&command.kind==='discard-item')||
         (street.reviewedSweep===true&&command.kind==='sweep-shop'))next.lastlogin=now;
      const sorted=projectOriginalSoloSort({shop:next,reviewed:sort}).shop;
      return street.reviewedNormalCommerce===undefined?sorted:capReviewedCommerceCash(sorted,street.reviewedNormalCommerce);
    });
    const after={...before,shops,market:applied.market??before.market,nowSeconds:now,period,revision:before.revision+1};
    const old=before.period.disk;
    if(hasClosed(before)&&command.kind==='open-shop')fail('closed local career cannot reuse original shop id');
    const closes=before.shops.length===1&&shops.length===0;
    if(closes!==(closeEffect!==null))fail('shop removal requires exact CloseShop effect');
    if(closes&&(!archive||!old||command.kind!=='advance-reviewed-world-time'||period.settledCount!==before.period.settledCount+1||closeEffect.shop?.id!==before.shops[0].id||closeEffect.deletedSessions?.length!==0||closeEffect.remainingSessions?.length!==0||Object.hasOwn(old.live,'army.cgi')))fail('local closure requires no external account/session or army context');
    let town=palace?(old?.townData??{}):{};
    const newRows=[...logRows];
    if(command.kind===PALACE_COMMAND){
      if(!palace||!old)fail('palace source runtime required');
      const expected=applyPalace(before,command);
      if(!same(expected.shops,applied.shops)||!same(expected.receipt,applied.receipt))fail('palace successor drift');
      town=expected.town;
      newRows.unshift([now,0,0,shops[0].shopname+'が王様の使命を達成しました。'].join('\t')+'\n');
    }
    if(ARMY_COMMANDS.includes(command.kind)){
      if(!army||!old)fail('army source runtime required');
      const expected=army.apply(before,command);
      if(!same(expected.shops,applied.shops)||!same(expected.receipt,applied.receipt)||expected.armyBytes!==applied.armyBytes)fail('army successor drift');
      const r=expected.receipt;
      newRows.unshift([now,0,1,command.kind==='hire-army'?
        '僱用矮人兵士 '+r.count+' 名，單價 '+r.unitPrice+'，合計 '+r.cost+'；消耗時間 40 分鐘。':
        '解僱矮人兵士 '+r.count+' 名；消耗時間 10 分鐘。'].join('\t')+'\n');
    }
    const play=wire(after,town);
    // Local ordinary operation messages are explicit adapter logs, not a
    // claim of historical locale / original login / CGI formatting parity.
    if(command.kind==='open-shop')newRows.unshift([now,1,0,shops[0].shopname+'が新装開店しました。'].join('\t')+'\n');
    if(street.reviewedDiscard===true&&command.kind==='discard-item'){
      if(applied.receipt.source!=='r4-frozen-item-t-no-guild.v1'||applied.receipt.shopId!==1||typeof applied.receipt.originalMessage!=='string')fail('source discard log identity');
      newRows.unshift([now,0,1,applied.receipt.originalMessage].join('\t')+'\n');
    }
    const sourceUseLogs=street.reviewedCommerceUseLogs&&command.kind==='use-item'&&Object.hasOwn(applied.receipt,'originalInlineLogCalls');
    if(!sourceUseLogs&&['edit-showcase','market-buy','use-item'].includes(command.kind))
      newRows.unshift([now,0,1,'local '+command.kind].join('\t')+'\n');
    if(command.kind==='market-buy'&&street.marketBuy?.reviewedVoucher)newRows.unshift(...projectReviewedWholesaleVoucherLogRows({
      review:street.marketBuy.reviewedVoucher,before:before.shops[0],after:shops[0],command,receipt:applied.receipt,nowSeconds:now}));
    if(newRows.some(s=>typeof s!=='string'||!/^\d+\t[012]\t\d+\t[^\r\n\t]*\n$/.test(s)))fail('bounded log rows');
    // Only the reviewed item's callback may contribute mode 3. General
    // EVENT, palace, army, and adapter log input keeps its original guard.
    if(sourceUseLogs)newRows.unshift(...projectReviewedCommerceUseLogRows({reviewed:street.reviewedCommerceUseLogs,rule:street.useItem.getRule(command.itemId,command.useId),command,receipt:applied.receipt,nowSeconds:now}));
    let d;
    if(!old){
      if(command.kind!=='initialize-source-market'||before.revision!==0)fail('only fresh source initialization');
      const live=Object.fromEntries(backups.map(n=>[n,entry(n==='play.cgi'?play:'',now)]));
      live['guild.cgi']=entry(guild,now);live['lasttime.cgi']=entry('',now);
      d={source:R4_INDEPENDENT_DISK,live,backup:capture(live),generations:[null,null,null]};
    }else{
      const crossings=period.settledCount-before.period.settledCount;
      if(![0,1].includes(crossings))fail('one source boundary per command');
      const live={...old.live};
      if(closes){
        // The independent local adapter has no CGI request identity or
        // original subdata/session directory. Do not manufacture either.
        const projected=projectR4CloseShopArchiveGeneration({reviewed:archive,effect:closeEffect,nowSeconds:now,
          previous:live[archiveName]??null,previousOld:live[oldArchiveName]??null,
          scriptName:'',remoteAddress:'',remoteHost:'',trueIp:'',user:''});
        live[archiveName]=projected.live;if(projected.old!==null)live[oldArchiveName]=projected.old;
      }
      if(ARMY_COMMANDS.includes(command.kind))live['army.cgi']=entry(applied.armyBytes,now);
      // period.cgi copies the prior LIVE files, not the new settled play.
      const generations=crossings?[Object.fromEntries(backups.map(n=>[n,entry(old.live[n].bytes,now)])),...old.generations.slice(0,2)]:old.generations;
      // DataWrite checks the original backup play mtime, before RenewLog.
      const copy=old.backup['play.cgi'].mtime<now-3600;
      const backup=copy?Object.fromEntries(backups.map(n=>[n,entry(old.live[n].bytes,now)])):old.backup;
      if(crossings){live['guild.cgi']=entry(guild,now);live['guildbal.cgi']=entry('',now);}
      live['play.cgi']=entry(play,now);live['lasttime.cgi']=entry('',now);
      if(newRows.length){
        if(old.live['log1.cgi'].mtime<now-129600){live['log2.cgi']=old.live['log1.cgi'];live['log1.cgi']=old.live['log0.cgi'];live['log0.cgi']=entry(newRows.join(''),now);}
        else live['log0.cgi']=entry(newRows.join('')+old.live['log0.cgi'].bytes,now);
      }
      d={source:R4_INDEPENDENT_DISK,live,backup,generations};
    }
    if(palace)d={...d,townData:town};
    const next={...applied,shops,market:after.market,period:{...period,disk:d}};
    validate({...after,period:next.period});
    return next;
  }
  return Object.freeze({validate,finalize,hasClosed,...(army?{army:true,applyArmy:army.apply,describeArmy:army.describe}:{}),...(palace?{palace:true,applyPalace,describePalace:world=>describeOriginalPalace({...palaceArgs,world})}:{}),crossLogs:candidate=>projectCrossPeriodLogRows({reviewed:log,candidate,r4CloseReview}),
    normalLogs:(logs,nowSeconds)=>projectReviewedEventLogRows({reviewed:log,logs,nowSeconds})});
}
