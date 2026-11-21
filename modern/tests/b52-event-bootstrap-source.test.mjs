import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewOriginalEmptyEventBootstrap,createOriginalEmptyEventState,
  validateOriginalEventBootstrapState,B52_EVENT_BOOTSTRAP,
} from '../src/original-event-world-bootstrap.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed,
  validateOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [adminSource,readSource,writeSource,periodSource,configSource]=await Promise.all([
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/period.cgi','_config.cgi',
].map(read));
const original=JSON.parse(execFileSync('perl',['original-b52-event-wire-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('B-52 original admin blank EVENT CSV really parses as empty map and writer round-trips a real expiry',()=>{
  assert.equal(original.initialActiveCount,0);
  assert.equal(original.eventWireEmpty,'\n');
  assert.equal(original.oneActiveWire,'rebel,123456\n');
  assert.deepEqual(original.oneActiveEvents,{rebel:'123456'});
  const source=reviewOriginalEmptyEventBootstrap({
    adminSource,readSource,writeSource,
  });
  assert.equal(source.source,B52_EVENT_BOOTSTRAP);
  assert.equal(source.initialActiveCount,0);
  assert.deepEqual(createOriginalEmptyEventState(source),{});
  assert.equal(validateOriginalEventBootstrapState(null),true);
  assert.equal(validateOriginalEventBootstrapState({}),true);
  assert.equal(validateOriginalEventBootstrapState({rebel:123456}),false);
  for(const broken of [
    {adminSource:adminSource.replace('500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0\\n\\n\\n//\\n','tampered')},
    {readSource:readSource.replace('%DTevent=split(/,/,$DATA[$idx++]);','%DTevent=();')},
    {writeSource:writeSource.replace('print OUT join(",",%DTevent)."\\n";','print OUT "FORKED";')},
  ])assert.throws(()=>reviewOriginalEmptyEventBootstrap({
    adminSource,readSource,writeSource,...broken,
  }),/B-52/);
});
test('B-52 initial source event map is empty, B-51 unknown legacy v2 remains compatible but forged active events reject',()=>{
  const reviewed=reviewOriginalPeriodBootstrap({
    periodSource,adminSource,readSource,writeSource,
    reviewedB41:{periodSeconds:129600,clockShiftSeconds:10800},
  });
  const seed=createOriginalPeriodSeed(reviewed);
  assert.deepEqual(seed.eventState,{});
  assert.equal(validateOriginalPeriodSeed(seed),true);
  assert.equal(validateOriginalPeriodSeed({...seed,eventState:null}),true);
  assert.equal(validateOriginalPeriodSeed({...seed,eventState:{happy:1030000}}),false);
  assert.equal(validateOriginalPeriodSeed({...seed,eventState:[]}),false);
  assert.equal(validateOriginalPeriodSeed({...seed,eventState:{hasOwnProperty:2}}),false);
});
