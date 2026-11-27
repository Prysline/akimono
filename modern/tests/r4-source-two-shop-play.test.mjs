import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewPeriodPlay,serializePeriodPlay,parsePeriodPlay} from '../src/original-r4-period-play-file.mjs';
import {reviewTownFiles} from '../src/original-r4-town-files.mjs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={writeSource:read('./original-perl/write.cgi'),incFuncSource:read('./original-perl/inc-func.cgi'),
  detailSource:read('./original-perl/core-detail.cgi'),configSource:read('../../_config.cgi')};
const townReview=reviewTownFiles({custom:read('./original-perl/pinned-custom.cgi'),read:sources.incFuncSource,write:sources.writeSource});
const reviewed=reviewPeriodPlay(sources,{twoShopSource:true});
const probe=fileURLToPath(new URL('./original-perl/original-r4-data-write-files-probe.pl',import.meta.url));
const oracle=()=>JSON.parse(execFileSync('perl',[probe,'--two-active'],{encoding:'utf8',maxBuffer:8*1024*1024}));
const serialize=world=>serializePeriodPlay({reviewed,townReview,world});
const parse=bytes=>parsePeriodPlay({reviewed,townReview,bytes});

test('R4 isolated two active shops: actual source SortDT, DataWrite, commit and two DataRead reloads',()=>{
  assert.equal(reviewed.committable,false);
  const {cases}=oracle();
  assert.equal(cases.length,2);
  for(const [i,c] of cases.entries()){
    assert.equal(c.staged,c.live);
    assert.equal(c.commitMarkerGone,true);
    assert.equal(c.stagedMoved,true);
    const unchanged=structuredClone(c.input);
    assert.equal(serialize(c.input),c.live,'exact source bytes after sorting both shops');
    assert.deepEqual(c.input,unchanged,'pure wire projection');
    const world=parse(c.live);
    assert.deepEqual(world.shops.map(x=>x.id),i===0?[2,1]:[1,2]);
    assert.equal(world.shops.find(x=>x.id===2).item[78],2);
    assert.equal(world.shops.find(x=>x.id===2).money,23000);
    assert.equal(world.shops.find(x=>x.id===1).guild,'alpha');
    assert.equal(world.shops.find(x=>x.id===2).guild,'beta');
    assert.equal(serialize(world),c.live);
  }
  assert.deepEqual(cases[1].input.shops.map(x=>Number(x.id)),[2,1],
    'second source DataRead loaded the actual sorted prior bytes');
  assert.equal(parse(cases[1].live).shops[0].money,16900);
});

test('R4 two-shop source remains noncommittable, default single-shop gates unchanged',()=>{
  const {input,live}=oracle().cases[0];
  const single=reviewPeriodPlay(sources);
  assert.throws(()=>serializePeriodPlay({reviewed:single,townReview,world:input}),/active shop/);
  assert.throws(()=>parsePeriodPlay({reviewed:single,townReview,bytes:live}),/play layout/);
  assert.throws(()=>reviewPeriodPlay(sources,{twoShopSource:true,crossPeriod:true}),/isolated two-shop/);
  assert.throws(()=>serialize({...input,shops:[input.shops[0],{...input.shops[1],id:input.shops[0].id}]}),/identity/);
  assert.throws(()=>serialize({...input,shops:[input.shops[0],{...input.shops[1],name:input.shops[0].name}]}),/identity/);
  assert.throws(()=>serialize({...input,nextid:2}),/nextid/);
  assert.throws(()=>serialize({...input,shops:[...input.shops,{...input.shops[1],id:3}]}),/active shop/);
});
