import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOriginalCompiledEventCatalog}
  from '../src/original-event-compiled-catalog.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {reviewR4EventItemParams} from '../src/original-r4-event-item-param.mjs';
import {reviewOriginalR4DeclarativeEventCycle,
  projectOriginalR4DeclarativeEventCycle,R4_DECLARATIVE_EVENT_CODES,
  R4_DECLARATIVE_EVENT_SOURCE}
  from '../src/original-r4-declarative-event-cycle.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,turnSource,compilerSource,readSource]=
  await Promise.all([
    'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
    'modern/tests/original-perl/inc-turn.cgi',
    'modern/tests/original-perl/inc-makeitem.cgi',
    'modern/tests/original-perl/inc-func.cgi',
  ].map(read));
const catalog=reviewOriginalCompiledEventCatalog({
  itemDsl,rebelDsl,compilerSource,turnSource});
const params=reviewR4EventItemParams({
  catalog,compilerSource,model:loadStandardStreetModel(itemDsl,rebelDsl)});
const reviewed=reviewOriginalR4DeclarativeEventCycle({
  compiledCatalog:catalog,reviewedParams:params,itemDsl,turnSource,readSource});
const oracle=JSON.parse(execFileSync('perl',
  ['original-r4-declarative-event-cycle-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8'}));
const items=()=>Array.from({length:79},(_,i)=>{
  const id=i+1;return {itemId:id,price:1000+5*id,
    pricebase:2000+7*id,pricehalf:3000+11*id,
    popular:5000+20*id,plus:60+id,point:100+id};
});
function execute(eventCode,input,rows){
  const next=projectOriginalR4DeclarativeEventCycle({
    reviewed,eventCode,items:rows,...input});
  return next;
}
test('R4 source review locks seven declarations, data-read loader and stage order',()=>{
  assert.equal(reviewed.source,R4_DECLARATIVE_EVENT_SOURCE);
  assert.equal(reviewed.committable,false);
  assert.deepEqual(Object.keys(reviewed.events),[...R4_DECLARATIVE_EVENT_CODES]);
  assert.throws(()=>reviewOriginalR4DeclarativeEventCycle({
    compiledCatalog:catalog,reviewedParams:params,itemDsl,turnSource,
    readSource:readSource.replace('foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}',''),
  }),/source drift/);
});
test('R4 seven original Perl END/START and generated ITEM overlays: 4 boundary cases each',()=>{
  assert.equal(oracle.eventCount,7);
  const basis=items(),snapshot=JSON.stringify(basis);
  for(const entry of oracle.cases){
    const event=reviewed.events[entry.eventCode];
    for(const k of ['startProba','baseTimeSeconds','plusTimeSeconds',
      'startMessage','endMessage','paramCount'])
      assert.equal(event[k],entry.metadata[k],entry.eventCode+' '+k);
    for(const c of entry.cases){
      const output=execute(entry.eventCode,c.input,basis);
      for(const k of ['activeAtDataRead','expired','started',
        'activeUntilSeconds','drawsUsed'])
        assert.equal(output[k],c.output[k],entry.eventCode+' '+c.name+' '+k);
      assert.deepEqual(output.logs,c.output.logs,entry.eventCode+' '+c.name+' logs');
      assert.deepEqual(output.dataReadItems,c.output.dataReadItems,
        entry.eventCode+' '+c.name+' all ITEMs');
      assert.equal(output.committable,false);
    }
  }
  assert.equal(JSON.stringify(basis),snapshot,'no mutations');
});
test('R4 seven-event continuous source timeline: start -> DataRead -> boundary -> expiry',()=>{
  const fields=['itemId','price','pricebase','pricehalf','popular','plus','point'];
  for(const entry of oracle.cases){
    let previous=null,startedCount=0,expiredCount=0,activeReadCount=0;
    for(const step of entry.timeline){
      assert.equal(step.input.activeUntilSeconds,previous,
        entry.eventCode+' contiguous source state');
      const actual=execute(entry.eventCode,step.input,items());
      const expected=step.output;
      for(const k of ['activeAtDataRead','expired','started',
        'activeUntilSeconds','drawsUsed'])
        assert.equal(actual[k],expected[k],entry.eventCode+' timeline '+k);
      assert.deepEqual(actual.logs,expected.logs,entry.eventCode+' timeline log');
      assert.deepEqual(actual.dataReadItems.map(item=>fields.map(k=>item[k])),
        expected.changedItems,entry.eventCode+' timeline original ITEM overlay');
      previous=actual.activeUntilSeconds;
      if(actual.started)startedCount++;
      if(actual.expired)expiredCount++;
      if(actual.activeAtDataRead)activeReadCount++;
    }
    assert.equal(startedCount,1,entry.eventCode+' start once');
    assert.equal(expiredCount,1,entry.eventCode+' expires once');
    assert.ok(activeReadCount>1,entry.eventCode+' applies on future DataReads');
  }
});
test('R4 declarative event rejects unreviewed state/draws and leaves input atomic',()=>{
  const before=items(),snapshot=JSON.stringify(before);
  const base={reviewed,eventCode:'boom-posyon',items:before,
    startSeconds:1000000,spanSeconds:3600};
  assert.throws(()=>projectOriginalR4DeclarativeEventCycle({...base,
    randomDraws:[]}),/missing/);
  assert.throws(()=>projectOriginalR4DeclarativeEventCycle({...base,
    randomDraws:[999999,0]}),/unused/);
  assert.throws(()=>projectOriginalR4DeclarativeEventCycle({...base,
    randomDraws:[0,0,0],activeUntilSeconds:-1}),/expiration/);
  assert.throws(()=>projectOriginalR4DeclarativeEventCycle({...base,
    randomDraws:[0,0,0],spanSeconds:129600}),/span/);
  assert.throws(()=>projectOriginalR4DeclarativeEventCycle({...base,
    randomDraws:[0,0,0],eventCode:'rebel'}),/key/);
  assert.equal(JSON.stringify(before),snapshot);
});
