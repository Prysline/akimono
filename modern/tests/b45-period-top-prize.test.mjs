import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {
  reviewOriginalTopPrize,projectOriginalTopPrize,B45_PRIZE_SOURCE,
} from '../src/original-period-top-prize.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,originalAddItemSource,periodSource]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/use.cgi','modern/tests/original-perl/period.cgi',
].map(read));
const model=loadStandardStreetModel(itemDsl,rebelDsl);
const reviewed=reviewOriginalTopPrize({
  itemDsl,model,originalAddItemSource,periodSource,
});
const source=JSON.parse(execFileSync('perl',['original-b45-top-prize-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('B-45 9 first-rank prizes are compiled only from frozen Standard Street FUNCUPDATE and item limits',()=>{
  assert.equal(reviewed.source,B45_PRIZE_SOURCE);
  assert.equal(reviewed.topChoices.length,9);
  assert.deepEqual(reviewed.topChoices.map(x=>x.itemId),
    [79,79,79,79,79,64,27,28,29]);
  assert.deepEqual(reviewed.topChoices.map(x=>x.count),
    [5,4,3,2,1,1,1,1,1]);
  assert.throws(()=>reviewOriginalTopPrize({
    itemDsl:itemDsl.replace('CostShowcase2','CostShowcase2'),
    model,originalAddItemSource:originalAddItemSource.replace('return $count;','return $count + 1;'),
    periodSource,
  }),/drift/);
  assert.throws(()=>reviewOriginalTopPrize({
    itemDsl:itemDsl.replace(/\['禮物卷',\s*\[\[@@ITEMNO "禮物卷",\s*5\]/,
      "['禮物卷', [[@@ITEMNO \"禮物卷\", 6]"),
    model,originalAddItemSource,periodSource,
  }),/changed/);
});
test('B-45 source Perl callback winner gifts, item stock, cap overflow and rankingcount align with Node',()=>{
  assert.equal(source.cases.length,10);
  for(const row of source.cases){
    const original=structuredClone(row.input);
    const selected=projectOriginalTopPrize({
      shop:original,reviewed,
      drawMillionths:row.choice===0?0:Math.ceil(row.choice*1000000/9),
    });
    assert.equal(selected.source,B45_PRIZE_SOURCE);
    for(const key of Object.keys(row.output))
      assert.deepEqual(selected.shop[key],row.output[key],
        row.name+' '+key);
    assert.deepEqual(original,row.input);
    assert.equal(selected.prize.itemId,row.changedItems[0]);
    if(row.name==='prize-overflow'){
      assert.equal(selected.prize.granted,1);
      assert.equal(selected.prize.discarded,4);
    }
  }
});
test('B-45 fail closed for invalid prize RNG, unknown inventory, or bad ranking state',()=>{
  const shop=source.cases[0].input;
  for(const draw of [-1,1000000,0.5,NaN])
    assert.throws(()=>projectOriginalTopPrize({
      shop,reviewed,drawMillionths:draw,
    }),/B-45/);
  assert.throws(()=>projectOriginalTopPrize({
    shop:{...shop,item:[...shop.item.slice(1)]},reviewed,drawMillionths:0,
  }),/B-45/);
  assert.throws(()=>projectOriginalTopPrize({
    shop:{...shop,rankingcount:-1},reviewed,drawMillionths:0,
  }),/B-45/);
});
