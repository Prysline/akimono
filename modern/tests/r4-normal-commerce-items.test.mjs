import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewNormalCommerceItems} from '../src/reviewed-normal-commerce-items.mjs';
import {projectSharedNaturalSale} from '../src/shared-natural-sale-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths={itemDsl:'custom/inc-item-data.cgi',
  compilerSource:'modern/tests/original-perl/inc-makeitem.cgi',
  showcaseSource:'modern/tests/original-perl/sc-s.cgi',
  turnSource:'modern/tests/original-perl/inc-turn.cgi'};
const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(
  async ([key,p])=>[key,await readFile(path.join(root,p),'utf8')])));
const review=reviewNormalCommerceItems(sources);
const perl=name=>JSON.parse(execFileSync('perl',[name],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('R4 full commerce ITEM compiler matches frozen Perl PRICE/POP/POINT/COST/TYPE/FLAG for all 79',()=>{
  assert.deepEqual(review.items,perl('original-normal-commerce-item-compiler.pl'));
  assert.equal(Object.keys(review.upkeepCosts).length,79);
  assert.equal(Object.keys(review.saleRules).length,67);
  assert.equal(Object.values(review.saleRules).filter(r=>r.popularSeconds>0).length,66);
  assert.equal(review.saleRules[64],undefined);
  assert.equal(review.saleRules[65].popularSeconds,0);
  assert.equal(review.saleRules[65].zeroPopularReviewed,true);
  assert.equal(review.saleRules[77].popularSeconds,1440000);
  assert.equal(review.saleRules[79].popularSeconds,72000);
  for(const key of Object.keys(sources))
    assert.throws(()=>reviewNormalCommerceItems({...sources,[key]:sources[key]+'\n'}),/source drift/);
});
test('R4 original natural-sale arithmetic for all source-listable ITEMs and mixed zero-POP shelves (isolated)',()=>{
  const rows=perl('original-normal-commerce-natural-probe.pl');
  assert.equal(rows.length,69);
  assert.deepEqual(rows.slice(0,67).map(x=>Number(x.name.slice(5))),
    Object.keys(review.saleRules).map(Number));
  for(const row of rows){
    const shop=row.input,prior=JSON.stringify(shop);
    const rule=shop.showcasecount===1?review.saleRules[shop.showcase[0]]:null;
    const actual=projectSharedNaturalSale({shop,rule,
      saleRules:shop.showcasecount>1?review.saleRules:null,
      upkeepCosts:review.upkeepCosts,spanSeconds:3600,randomDraws:row.draws});
    assert.equal(JSON.stringify(shop),prior,row.name+' pure projection');
    assert.equal(actual.drawsUsed,row.used,row.name+' source draws');
    for(const k of ['item','itemtoday','_sale_count_','money','rank','temprank','trush','saletoday','taxtoday'])
      assert.deepEqual(actual.shop[k],row.output[k],row.name+' '+k);
    assert.ok(Math.abs(actual.shop.costtoday-row.output.costtoday)<1e-8,row.name+' upkeep');
    if(shop.showcase.includes(65)){
      assert.equal(actual.shop.item[64],1);
      assert.equal(actual.soldByItem[65],undefined);
    }
  }
  const shop=rows.find(x=>x.name==='item-65').input;
  assert.throws(()=>projectSharedNaturalSale({shop,rule:{...review.saleRules[65],zeroPopularReviewed:false},
    upkeepCosts:review.upkeepCosts,spanSeconds:3600,randomDraws:[500000]}),/source reviewed/);
});
