import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOriginalEventStart} from '../src/original-event-start-gate.mjs';
import {
  reviewOriginalEventLifecycle,projectOriginalEventLifecycle,
  B49_EVENT_LIFECYCLE_SOURCE,
} from '../src/original-event-lifecycle.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [turnSource,compilerSource,itemDsl,rebelDsl]=await Promise.all([
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
].map(read));
const reviewedStart=reviewOriginalEventStart({
  turnSource,compilerSource,itemDsl,rebelDsl,
});
const reviewed=reviewOriginalEventLifecycle({turnSource,reviewedStart});
const oracle=JSON.parse(execFileSync('perl',['original-b49-event-lifecycle-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('B-49 frozen source original event expiry occurs strictly before start gate',()=>{
  assert.equal(reviewed.source,B49_EVENT_LIFECYCLE_SOURCE);
  assert.throws(()=>reviewOriginalEventLifecycle({
    turnSource:turnSource.replace(
      'if($DTevent{$key}<$temptimenow+$timespan)',
      'if($DTevent{$key}<=$temptimenow+$timespan)'),
    reviewedStart,
  }),/source expiry drift/);
  assert.throws(()=>reviewOriginalEventLifecycle({
    turnSource,reviewedStart:{source:'unverified'},
  }),/source event start review/);
});
test('B-49 original Perl combined lifecycle and Node match six exact expiry/start/rand paths',()=>{
  assert.equal(oracle.cases.length,6);
  for(const row of oracle.cases){
    const state=structuredClone(row.input);
    const result=projectOriginalEventLifecycle({
      ...state,reviewed,reviewedStart,
    });
    for(const field of [
      'expired','entered','groupNowOccupied','activeUntilSeconds',
      'randomDrawsUsed',
    ])assert.deepEqual(result[field],row.output[field],
      row.name+' original source field '+field);
    assert.deepEqual(state,row.input,'source input immutable');
  }
});
test('B-49 rejects unsupported callbacks, rand drifts and malformed event timelines',()=>{
  const fixture=oracle.cases[0].input;
  for(const diff of [
    {activeUntilSeconds:-1},
    {startSeconds:-1},
    {spanSeconds:0},
    {randomDraws:[]},
    {event:{...fixture.event,endfunc:'_local_'}},
    {event:{...fixture.event,nowfunc:'_local_'}},
  ])assert.throws(()=>projectOriginalEventLifecycle({
    ...fixture,...diff,reviewed,reviewedStart,
  }),/B-48|B-49/);
});
