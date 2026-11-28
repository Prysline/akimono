/** Reviewed independent local world file projection.
 * B43 publishes a complete immutable file generation, not four live renames.
 * No original account/session, dragon or guild membership is manufactured.
 */
import {createHash} from 'node:crypto';
import {reviewPeriodPlay,serializePeriodPlay,parsePeriodPlay} from './original-r4-period-play-file.mjs';
import {reviewTownFiles} from './original-r4-town-files.mjs';
import {reviewBackupDisk} from './original-r4-backup-disk.mjs';
import {reviewPeriodLog,projectCrossPeriodLogRows,projectExternalCrossPeriodLogRows,projectReviewedArmyConflictLogRows,projectReviewedEventLogRows,projectReviewedCommerceUseLogRows} from './original-r4-period-log-disk.mjs';
import {capReviewedCommerceCash} from './reviewed-normal-commerce-items.mjs';
import {projectOriginalSoloSort} from './original-period-solo-sort.mjs';
import {PALACE_COMMAND,reviewOriginalPalaceRules,validatePalaceTown,describeOriginalPalace,projectOriginalPalaceMission} from './original-r4-palace-mission.mjs';
import {ARMY_COMMANDS,CONFLICT_COMMANDS,createIndependentArmyProjection} from './original-r4-independent-army.mjs';
import {LORD_COMMANDS,createIndependentLordProjection} from './original-r4-independent-lord.mjs';
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
export function createIndependentDiskProjection({sources,sort,street,externalRebel=false,lordFiscal=false}){
  if(lordFiscal&&(!externalRebel||!street.reviewedNormalCommerce))fail('fiscal requires external full commerce');
  const lord=lordFiscal?createIndependentLordProjection(sources):null;
  if(sha1(sources.newSource)!=='9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7')fail('frozen new.cgi required');
  const codec={reviewed:reviewPeriodPlay({writeSource:sources.writeSource,incFuncSource:sources.readSource,detailSource:sources.detailSource,configSource:sources.configSource},{crossPeriod:true,ordinaryMultiShelf:true,externalRebel,lordTaxWire:lordFiscal,signedCash:street.reviewedNormalCommerce!==undefined,manualCommerce:street.reviewedManualCommerceEvents??null}),
    townReview:reviewTownFiles({custom:sources.customSource,read:sources.readSource,write:sources.writeSource})};
  reviewBackupDisk({period:sources.periodSource,write:sources.writeSource,config:sources.configSource});
  const log=reviewPeriodLog({log:sources.logSource,period:sources.periodSource,dsl:sources.itemDsl,config:sources.configSource,...(externalRebel?{armyCommand:sources.armyCommandSource}:{})});
  const palaceInputs=[sources.palaceViewSource,sources.palaceCommandSource,sources.palaceConfigSource];
  if(palaceInputs.some(s=>s!=null)&&palaceInputs.some(s=>s==null))fail('incomplete palace source set');
  const palace=palaceInputs.every(s=>s!=null)?reviewOriginalPalaceRules({
    viewSource:sources.palaceViewSource,handlerSource:sources.palaceCommandSource,
    configSource:sources.palaceConfigSource,readSource:sources.readSource}):null;
  const armyInputs=[sources.armyViewSource,sources.armyCommandSource,sources.armyFileSource,sources.armyCalcSource];
  if(armyInputs.some(s=>s!=null)&&armyInputs.some(s=>s==null))fail('incomplete army source set');
  const army=armyInputs.every(s=>s!=null)?createIndependentArmyProjection(sources,{externalRebel}):null;
  if(externalRebel&&!army)fail('complete army source set required for external time');
  const palaceArgs={reviewed:palace,townReview:codec.townReview};
  const applyPalace=(world,command)=>projectOriginalPalaceMission({...palaceArgs,world,command});
  function wire(world,town,taxRate=0){
    if(!world.market||world.period.eventState===null)fail('known source market and events required');
    return serializePeriodPlay({...codec,world:{lasttime:world.nowSeconds,people:world.period.dtPeople,nextid:100,blockip:'',taxRate,
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
    if(!exact(d,'source,live,backup,generations'+(palace?',townData':'')+(lord?',lordTaxRate':''))||d.source!==R4_INDEPENDENT_DISK||!Array.isArray(d.generations)||d.generations.length!==3)fail('independent disk envelope required');
    if(lord&&(!safe(d.lordTaxRate)||d.lordTaxRate>40))fail('bounded fiscal rate');
    const hasArmy=Boolean(army)&&Object.hasOwn(d.live??{},'army.cgi');
    validateFiles(d.live,[...backups,'guild.cgi','lasttime.cgi',...(hasArmy?['army.cgi']:[])],world.nowSeconds);
    if(army)army.validate(world);
    const town=palace?d.townData:{};
    if(palace)validatePalaceTown({...palaceArgs,town});
    if(d.live['play.cgi'].bytes!==wire(world,town,d.lordTaxRate??0)||d.live['lasttime.cgi'].mtime!==world.nowSeconds||d.live['lasttime.cgi'].bytes!==''||d.live['guildbal.cgi'].bytes!==''||d.live['guild.cgi'].bytes!==guild)fail('live source bytes differ from world');
    parsePeriodPlay({...codec,bytes:d.live['play.cgi'].bytes});
    for(const f of [d.backup,...d.generations])if(f!==null){validateFiles(f,backups,world.nowSeconds);const parsed=parsePeriodPlay({...codec,bytes:f['play.cgi'].bytes});if(palace)validatePalaceTown({...palaceArgs,town:parsed.town});}
    if(Buffer.byteLength(JSON.stringify(d))>100000)fail('independent source file history capacity');
    return true;
  }
  function finalize({before,command,applied,logRows=[]}){
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
      if(['edit-showcase','market-buy','use-item',PALACE_COMMAND,...ARMY_COMMANDS,...(externalRebel?CONFLICT_COMMANDS:[]),...(lord?LORD_COMMANDS:[])].includes(command.kind))next.lastlogin=now;
      const sorted=projectOriginalSoloSort({shop:next,reviewed:sort}).shop;
      return street.reviewedNormalCommerce===undefined?sorted:capReviewedCommerceCash(sorted,street.reviewedNormalCommerce);
    });
    const after={...before,shops,market:applied.market??before.market,nowSeconds:now,period,revision:before.revision+1};
    const old=before.period.disk;
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
    const conflictAction=externalRebel&&CONFLICT_COMMANDS.includes(command.kind);
    if(conflictAction){
      if(!old)fail('source conflict disk required');
      const expected=army.applyConflict(before,command);
      if(!same(expected,applied))fail('conflict successor drift');
      const candidate={source:expected.receipt.source,committable:false,receipt:{...expected.receipt,committable:false}};
      newRows.unshift(...projectReviewedArmyConflictLogRows({reviewed:log,candidate,nowSeconds:now}));
    }
    const externalTime=externalRebel&&command.kind==='advance-reviewed-world-time'&&applied.receipt?.source==='r4-external-rebel-cross-period-candidate.v1';
    if(externalTime){
      const digest=bytes=>bytes===null?null:typeof bytes==='string'?createHash('sha256').update(bytes).digest('hex'):fail('explicit army bytes or absent stage');
      const trace=applied.receipt.sourceTrace;
      if(!old||trace?.liveArmySha256!==digest(old.live['army.cgi']?.bytes??null))fail('external time army preimage mismatch');
      if(trace.slices?.at(-1)?.stagedArmySha256!==digest(applied.armyBytes))fail('external time army staged bytes mismatch');
    }
    let lordTaxRate=lord?(old?.lordTaxRate??0):0;
    if(LORD_COMMANDS.includes(command.kind)){
      if(!lord||!old)fail('fiscal source required');
      const expected=lord.apply(before,command);
      if(!same(expected,applied))fail('fiscal successor drift');
      lordTaxRate=expected.lordTaxRate;
      newRows.unshift(...projectReviewedEventLogRows({reviewed:log,logs:expected.receipt.originalLogCalls.map(c=>c.slice(0,3)),nowSeconds:now}));
    }else if(externalTime&&lord){
      const slices=applied.receipt.lordTax;
      if(!Array.isArray(slices)||!slices.length||slices[0].townRateBefore!==lordTaxRate||
        slices.at(-1).townRateAfter!==applied.lordTaxRate||!safe(applied.lordTaxRate)||applied.lordTaxRate>40)fail('fiscal time lineage');
      lordTaxRate=applied.lordTaxRate;
    }else if(Object.hasOwn(applied,'lordTaxRate'))fail('unreviewed fiscal effect');
    const play=wire(after,town,lordTaxRate);
    // Local ordinary operation messages are explicit adapter logs, not a
    // claim of historical locale / original login / CGI formatting parity.
    if(command.kind==='open-shop')newRows.unshift([now,1,0,shops[0].shopname+'が新装開店しました。'].join('\t')+'\n');
    const sourceUseLogs=street.reviewedCommerceUseLogs&&command.kind==='use-item'&&Object.hasOwn(applied.receipt,'originalInlineLogCalls');
    if(!sourceUseLogs&&['edit-showcase','market-buy','use-item'].includes(command.kind))
      newRows.unshift([now,0,1,'local '+command.kind].join('\t')+'\n');
    if(newRows.some(s=>typeof s!=='string'||!(conflictAction?/^\d+\t[0123]\t\d+\t[^\r\n\t]*\n$/:/^\d+\t[012]\t\d+\t[^\r\n\t]*\n$/).test(s)))fail('bounded log rows');
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
      if(ARMY_COMMANDS.includes(command.kind)||conflictAction||externalTime&&applied.armyBytes!==null)live['army.cgi']=entry(applied.armyBytes,now);
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
    if(lord)d={...d,lordTaxRate};
    const next={...applied,shops,market:after.market,period:{...period,disk:d}};
    validate({...after,period:next.period});
    return next;
  }
  return Object.freeze({validate,finalize,...(lord?{lord:true,applyLord:lord.apply,describeLord:lord.describe}:{}),...(army?{army:true,applyArmy:army.apply,describeArmy:army.describe}:{}),...(palace?{palace:true,applyPalace,describePalace:world=>describeOriginalPalace({...palaceArgs,world})}:{}),crossLogs:candidate=>projectCrossPeriodLogRows({reviewed:log,candidate}),
    ...(externalRebel?{externalLogs:candidate=>projectExternalCrossPeriodLogRows({reviewed:log,candidate}),applyConflict:army.applyConflict,describeConflict:army.describeConflict}:{}),
    normalLogs:(logs,nowSeconds)=>projectReviewedEventLogRows({reviewed:log,logs,nowSeconds})});
}
