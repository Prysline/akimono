import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {reviewR4VoluntaryCloseState,projectR4VoluntaryCloseState} from '../src/original-r4-voluntary-close-state.mjs';
import {R4_INDEPENDENT_DISK} from '../src/original-r4-independent-world-disk.mjs';
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const sourceTexts={membership:read('./original-perl/pinned-membership-user.cgi'),form:read('./original-perl/pinned-other.cgi'),compiler:read('./original-perl/inc-makeitem.cgi'),dsl:read('../../custom/inc-item-data.cgi'),core:read('./original-perl/inc-func.cgi'),writer:read('./original-perl/write.cgi'),subdata:read('./original-perl/pinned-user.cgi')};
const localeSources={coreLocaleSource:read('./original-perl/pinned-core-zh_TW.po'),localLocaleSource:read('../../locale/zh_TW.po'),localeLoaderSource:read('../../custom/inc-locale.cgi')};
const sources={sourceTexts,localeSources,detailSource:read('./original-perl/core-detail.cgi'),configSource:read('../../_config.cgi'),turnSource:read('./original-perl/inc-turn.cgi'),errorSource:read('./original-perl/pinned-error.cgi')};
const reviewed=reviewR4VoluntaryCloseState(sources);
function fixture(row){
  const {nowSeconds,...archiveContext}=row.context;
  const shop={...row.input.shop,pass:'',remoteaddr:'192.0.2.5'};
  archiveContext.user=shop.name;
  const live={'play.cgi':{bytes:'controlled source fixture',mtime:nowSeconds}};
  if(row.input.logPrior!==null)live['log/delete.cgi']={bytes:row.input.logPrior,mtime:nowSeconds-1};
  const world={worldId:'close-unit',streetId:'standard-street',revision:5,nowSeconds,shops:[shop],period:{disk:{source:R4_INDEPENDENT_DISK,live}}};
  return {reviewed,world,actorRef:{worldId:world.worldId,street:world.streetId,shopId:1,ownerName:shop.name},expectedRevision:5,confirmation:'closeshop',subdataNames:['1-alpha.cgi','2-keep.cgi'],archiveContext};
}
test('LC-D2 voluntary close delegates native archive and source prune, localizes exact original logs',()=>{
  const runner=fileURLToPath(new URL('./original-perl/original-r4-close-shop-archive-file-probe.pl',import.meta.url));
  const proof=JSON.parse(execFileSync('perl',[runner,'--full-commerce-shape'],{encoding:'utf8'}));
  for(const row of proof.cases.filter(r=>r.kind!=='missing')){
    const input=fixture(row),before=structuredClone(input.world),got=projectR4VoluntaryCloseState(input);
    // This oracle uses a single-key map and original true file append. Only
    // the voluntary reason, synthetic pass/IP and context USER are adapted.
    const baseline=row.output.liveLog;
    const prior=row.kind==='append'?row.input.logPrior:'';
    const record=baseline.slice(prior.length);
    const fields=sourceTexts.core.match(/@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/)[1].trim().split(/\s+/);
    const lines=record.split('\n');const header=lines[0].split('\t');header[5]=input.archiveContext.user;header[6]='自行關店';
    const cols=lines[1].split(',');cols[fields.indexOf('pass')]='';cols[fields.indexOf('remoteaddr')]='192.0.2.5';
    lines[0]=header.join('\t');lines[1]=cols.join(',');
    assert.equal(got.archiveGeneration.live.bytes,prior+lines.join('\n'));
    assert.equal(got.archiveGeneration.rotated,row.kind==='rotate');
    assert.equal(got.archiveGeneration.old?.bytes??null,row.output.oldLog);
    assert.deepEqual(got.activeShops,[]);assert.deepEqual(got.sourceLogCalls,[[1,0,input.world.shops[0].shopname+'將店鋪關閉了。']]);
    assert.deepEqual(got.blockIpEffect,{value:'192.0.2.5'});
    assert.deepEqual(got.subdataDeletionSelection,['1-alpha.cgi']);assert.equal(got.sessionIntent.deleteSessionFile,false);
    assert.equal(got.committable,false);assert.deepEqual(input.world,before);
    assert.deepEqual(projectR4VoluntaryCloseState({...input,expectedInterpreter:got.nativeInterpreter}),got);
    assert.throws(()=>projectR4VoluntaryCloseState({...input,expectedRevision:4}),/R4 lifecycle/);
    assert.throws(()=>projectR4VoluntaryCloseState({...input,archiveContext:{...input.archiveContext,user:'other'}}),/trusted owner/);
    assert.throws(()=>projectR4VoluntaryCloseState({...input,world:{...input.world,shops:[{...input.world.shops[0],pass:'synthetic'}]}}),/private legacy credential/);
  }
  assert.throws(()=>reviewR4VoluntaryCloseState({...sources,configSource:sources.configSource+'\n'}),/source drift/);
});


test('LC-D2 stable source shop ID100 close uses actual original archive ID and exact subdata scope',()=>{
  const runner=fileURLToPath(new URL('./original-perl/original-r4-close-shop-archive-file-probe.pl',import.meta.url));
  const proof=JSON.parse(execFileSync('perl',[runner,'--stable-full-commerce-shape'],{encoding:'utf8'}));
  const stable=reviewR4VoluntaryCloseState(sources,{stableSingleSource:true});
  const fields=sourceTexts.core.match(/@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/)[1].trim().split(/\s+/);
  for(const row of proof.cases.filter(r=>r.kind!=='missing')){
    assert.equal(row.input.shop.id,100);assert.equal(row.output.shop.id,100);
    const original=fixture(row);
    const input={...original,reviewed:stable,actorRef:{...original.actorRef,shopId:100},subdataNames:['100-alpha.cgi','2-keep.cgi','1-keep.cgi','1000-keep.cgi']};
    const before=structuredClone(input.world),got=projectR4VoluntaryCloseState(input);
    const prior=row.kind==='append'?row.input.logPrior:'';
    const lines=row.output.liveLog.slice(prior.length).split('\n');
    const header=lines[0].split('\t');header[5]=input.archiveContext.user;header[6]='自行關店';
    const cols=lines[1].split(',');assert.equal(cols[fields.indexOf('id')],'100');cols[fields.indexOf('pass')]='';cols[fields.indexOf('remoteaddr')]='192.0.2.5';
    lines[0]=header.join('\t');lines[1]=cols.join(',');
    assert.equal(got.archiveGeneration.live.bytes,prior+lines.join('\n'));
    assert.equal(got.archiveGeneration.old?.bytes??null,row.output.oldLog);
    assert.equal(got.archiveGeneration.rotated,row.kind==='rotate');
    assert.deepEqual(got.subdataDeletionSelection,['100-alpha.cgi']);
    assert.deepEqual(input.subdataNames.filter(n=>!got.subdataDeletionSelection.includes(n)).sort(),row.output.remainingSessions);
    assert.deepEqual(got.activeShops,[]);assert.equal(got.committable,false);assert.deepEqual(input.world,before);
    assert.throws(()=>projectR4VoluntaryCloseState({...input,reviewed}),/single-store disk world/);
    assert.throws(()=>projectR4VoluntaryCloseState({...input,actorRef:{...input.actorRef,shopId:1}}),/R4 lifecycle/);
    assert.throws(()=>projectR4VoluntaryCloseState({...input,world:{...input.world,shops:[input.world.shops[0],{...input.world.shops[0],id:101}]}}),/single-store disk world/);
  }
});
