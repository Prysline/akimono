import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  B48_EVENT_START_SOURCE,reviewOriginalEventStart,projectOriginalEventStart,
} from '../src/original-event-start-gate.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [turnSource,compilerSource,itemDsl,rebelDsl]=await Promise.all([
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'custom/inc-item-data.cgi',
  'custom/inc-rebel-data.cgi',
].map(read));
const inputs={turnSource,compilerSource,itemDsl,rebelDsl};
const reviewed=reviewOriginalEventStart(inputs);
const oracle=JSON.parse(execFileSync('perl',['original-b48-event-start-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('B-48 source EVENT compiler includes 0 and excludes -1; Core still executes 0 gate',()=>{
  assert.equal(reviewed.source,B48_EVENT_START_SOURCE);
  assert.equal(reviewed.rawRebelStart,0);
  assert.equal(reviewed.rawGuildBattleStart,0);
  assert.throws(()=>reviewOriginalEventStart({
    ...inputs,turnSource:turnSource.replace(
      '|| $E->{startproba}==0',''),
  }),/source changed/);
  assert.throws(()=>reviewOriginalEventStart({
    ...inputs,compilerSource:compilerSource.replace(
      "if $event->{startproba}!=-1;","if $event->{startproba}!=0;"),
  }),/source changed/);
  assert.throws(()=>reviewOriginalEventStart({
    ...inputs,rebelDsl:rebelDsl.replace('start\t\t0','start\t\t-1'),
  }),/changed/);
});
test('B-48 original Perl EVENT gate matches Node, source rand prefix and no fake active EVENT',()=>{
  assert.equal(oracle.cases.length,5);
  for(const row of oracle.cases){
    const {event,spanSeconds,startSeconds,groupOccupied,randomDraws}=row.input;
    const n=projectOriginalEventStart({reviewed,event,spanSeconds,
      startSeconds,groupOccupied,randomDraws});
    const p=row.output;
    for(const [field,val] of [
      ['entered',p.entered],
      ['groupNowOccupied',p.groupNowOccupied],
      ['expiresAt',p.expiresAt],
      ['randomDrawsUsed',p.randomDrawsUsed],
    ])assert.equal(n[field],val,row.name+' source event '+field);
    assert.equal(p.activeCount,n.expiresAt===null?0:1);
    assert.equal(p.logCount,0,'synthetic source has no notices');
  }
});
test('B-48 missing or extra event draws, callbacks and uncompiled disabled events fail closed',()=>{
  const baseline={...oracle.cases[0].input,reviewed};
  for(const overrides of [
    {randomDraws:[]},{randomDraws:[700000,0]},
    {event:{...baseline.event,startfunc:'_local_'}},
    {event:{...baseline.event,endfunc:'_local_'}},
    {event:{...baseline.event,nowfunc:'_local_'}},
    {event:{...baseline.event,startproba:-1}},
    {event:{...baseline.event,startproba:1.5}},
    {groupOccupied:'no'},
  ])assert.throws(()=>projectOriginalEventStart({...baseline,...overrides}),
    /B-48/);
  assert.throws(()=>projectOriginalEventStart({
    ...baseline,event:{...baseline.event,basetime:3600},
  }),/B-48/);
});
