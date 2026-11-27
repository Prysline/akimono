import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {reviewTownScenery,projectTownScenery} from '../src/original-r4-town-scenery.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const town=file('./original-perl/pinned-town-scenery.cgi');
const custom=file('../../custom/inc-town.cgi');
const probe=file('./original-perl/original-r4-town-scenery-probe.pl');
const sources={town:readFileSync(town,'utf8'),custom:readFileSync(custom,'utf8')};
const reviewed=reviewTownScenery(sources);
function compare(patch={}){
  const nowSeconds=patch.nowSeconds??14400;
  const input={nowSeconds,develop:4500,safety:4000,rebel:false,leaderId:2,balanceName:'領主代行',
    shops:[{id:2,shopname:'最初的店',name:'店主乙',lastlogin:nowSeconds-600},
      {id:1,shopname:'第二家店',name:'店主甲',lastlogin:nowSeconds-599},
      {id:3,shopname:'不活動的店',name:'店主丙',lastlogin:nowSeconds-601}],
    guest:false,boardMtime:123456,...patch};
  const before=JSON.stringify(input);
  const got=projectTownScenery({reviewed,...input});
  const want=JSON.parse(execFileSync('perl',[probe,town,custom,JSON.stringify(input)],{encoding:'utf8',timeout:10000}));
  assert.deepEqual(Object.fromEntries(Object.keys(want).map(k=>[k,got[k]])),want);
  assert.equal(got.committable,false);
  assert.equal(JSON.stringify(input),before);
  return got;
}
test('R4 town scenery actual Perl guest/player paths, ordered shops, and original development thresholds',()=>{
  for(const develop of [4500,4501,5500,5501,6500,6501]){
    const p=compare({develop,guest:false});
    const g=compare({develop,guest:true});
    assert.equal(p.slots[7].route,'army');
    assert.equal(g.slots[7].route,null);
    assert.equal(g.slots[9].route,null);
    assert.deepEqual(p.activeShops,['最初的店','第二家店']);
  }
});
test('R4 town scenery actual Perl hour phases, safety threshold, leader and rebellion override',()=>{
  for(const phase of [0,1,2,3])compare({nowSeconds:(4+phase)*3600,safety:3999});
  compare({nowSeconds:25200,safety:4000});
  compare({nowSeconds:25200,safety:3999,leaderId:0});
  for(const phase of [0,1,2,3])compare({nowSeconds:(4+phase)*3600,rebel:true,safety:3999});
  const empty=compare({shops:[],leaderId:0});
  assert.equal(empty.activeText,'なし');
});
test('R4 town scenery pins and candidate boundary',()=>{
  assert.throws(()=>reviewTownScenery({...sources,town:sources.town+' '}),/source drift/);
  assert.throws(()=>reviewTownScenery({...sources,custom:sources.custom+' '}),/source drift/);
  assert.throws(()=>projectTownScenery({reviewed:{committable:false}}),/source review required/);
});
