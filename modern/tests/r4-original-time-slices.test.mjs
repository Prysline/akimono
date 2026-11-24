import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOriginalR4TimeSlices,projectOriginalR4TimeSlices,
  R4_TIME_SLICE_SOURCE} from '../src/original-r4-time-slices.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [turnSource,configSource]=await Promise.all([
  read('modern/tests/original-perl/inc-turn.cgi'),read('_config.cgi')]);
const reviewed=reviewOriginalR4TimeSlices({turnSource,configSource});
const perl=JSON.parse(execFileSync('perl',['original-r4-time-slices-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8'}));
test('R4 36h clock review rejects frozen inc-turn/config drift',()=>{
  assert.equal(reviewed.source,R4_TIME_SLICE_SOURCE);
  assert.equal(reviewed.periodSeconds,129600);
  assert.equal(reviewed.shiftSeconds,10800);
  assert.throws(()=>reviewOriginalR4TimeSlices({
    turnSource:turnSource.replace(
      'push(@timespan,[1,$ONE_DAY_TIME-($lasttime%$ONE_DAY_TIME)]);',
      'push(@timespan,[0,$ONE_DAY_TIME-($lasttime%$ONE_DAY_TIME)]);'),
    configSource}),/drift/);
  assert.throws(()=>reviewOriginalR4TimeSlices({
    turnSource,configSource:configSource.replace('3600*36','3600*24')}),/drift/);
});
test('R4 clock projection equals executable frozen Perl, including zero tails',()=>{
  assert.equal(perl.cases.length,9);
  for(const c of perl.cases){
    const out=projectOriginalR4TimeSlices({
      lastSeconds:c.lastSeconds,nowSeconds:c.nowSeconds,reviewed});
    assert.deepEqual(out.rawSlices.map(s=>[s.dateupdate,s.timespanSeconds]),
      c.rawSlices,c.name);
    assert.deepEqual(
      out.effectiveSlices.map(s=>[s.dateupdate,s.timespanSeconds]),
      c.rawSlices.filter(([,seconds])=>seconds>0),c.name);
    assert.equal(out.lastTimeAfter,c.lastTimeAfter,c.name);
    assert.equal(out.nowAfter,c.nowAfter,c.name);
    assert.equal(out.crossesSettlement,
      c.rawSlices.some(([flag,seconds])=>flag===1&&seconds>0),c.name);
  }
});
test('R4 planner fails closed on invalid/unreviewed or excessive clocks',()=>{
  for(const [lastSeconds,nowSeconds] of [
    [-1,0],[0,-1],[10,9],[0.5,1],[0,Number.MAX_SAFE_INTEGER],
    [1,Infinity]]){
    assert.throws(()=>projectOriginalR4TimeSlices({
      lastSeconds,nowSeconds,reviewed}));
  }
  assert.throws(()=>projectOriginalR4TimeSlices({
    lastSeconds:1,nowSeconds:2,
    reviewed:{...reviewed,periodSeconds:86400}}));
  assert.throws(()=>projectOriginalR4TimeSlices({
    lastSeconds:0,nowSeconds:129600*130,reviewed}),/too many/);
});
