import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewNormalCommerceItems,validateNormalCommerceInventory} from '../src/reviewed-normal-commerce-items.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileReviewedGiftMapUse} from '../src/reviewed-gift-map-use.mjs';
import {reviewOriginalCompiledEventCatalog} from '../src/original-event-compiled-catalog.mjs';
import {reviewOriginalInstantEventCallbacks,projectOriginalInstantEventCallback} from '../src/original-instant-event-callbacks.mjs';
import {reviewOriginalSupportEventCallbacks,projectOriginalSupportEventCallback} from '../src/original-b57-support-event-callbacks.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const files={itemDsl:'custom/inc-item-data.cgi',rebelDsl:'custom/inc-rebel-data.cgi',
  compilerSource:'modern/tests/original-perl/inc-makeitem.cgi',
  showcaseSource:'modern/tests/original-perl/sc-s.cgi',turnSource:'modern/tests/original-perl/inc-turn.cgi'};
const sources=Object.fromEntries(await Promise.all(Object.entries(files).map(
  async ([key,p])=>[key,await readFile(path.join(root,p),'utf8')])));
const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
const compiled=compileReviewedGiftMapUse({...sources,model});
const normalCommerce=reviewNormalCommerceItems(sources);
const reviewedInventory={normalCommerce,compiled};
const compiledCatalog=reviewOriginalCompiledEventCatalog(sources);
const instant=reviewOriginalInstantEventCallbacks({...sources,compiledCatalog});
const support=reviewOriginalSupportEventCallbacks({...sources,compiledCatalog});
const oracle=file=>JSON.parse(execFileSync('perl',[file,'--multi-shelf'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
})).cases;
function compare(row,project,reviewed){
  const shop=row.input.shop,prior=JSON.stringify(shop);
  const actual=project({...row.input,reviewed,reviewedInventory});
  assert.equal(JSON.stringify(shop),prior,row.name+' pure input');
  for(const key of ['item','rank','money'])
    assert.deepEqual(actual.shop[key],row.output[key],row.name+' '+key);
  for(const key of ['returnCode','message','randomDrawsUsed'])
    assert.equal(actual[key],row.output[key],row.name+' '+key);
  assert.equal(actual.eventPersisted,false);
  assert.deepEqual(actual.shop.showcase,shop.showcase);
  assert.deepEqual(actual.shop.price,shop.price);
  return actual;
}
test('R4 expanded source shape separates lawful command provenance from stock and EXP bounds',()=>{
  const item=Array(79).fill(0);item[61]=1;item[64]=1;item[70]=1;item[76]=1;
  const shop={item,exp:{62:100,65:100},job:'peddle',showcasecount:3,
    showcase:[65,71,77],price:[50000,3000,200000]};
  assert.equal(validateNormalCommerceInventory(shop,compiled,normalCommerce),true);
  for(const delta of [
    {item:item.map((n,i)=>i===61?2:n)},
    {exp:{62:1001}},{exp:{80:1}},{exp:{'062':1}},
    {exp:{1:1000,2:1000,3:1000,4:1000}},
    {showcase:[64,71,77]},{price:[0,3000,200000]},
    {showcasecount:9,showcase:Array(9).fill(0),price:Array(9).fill(0)},
  ])assert.throws(()=>validateNormalCommerceInventory({...shop,...delta},compiled,normalCommerce),/normal commerce ITEM/);
  assert.throws(()=>validateNormalCommerceInventory(shop,compiled,{...normalCommerce}),/actual frozen ITEM review/);
});
test('R4 source multi-shelf theft and robbery use successive remaining inventory and original RNG',()=>{
  const rows=oracle('original-b55-instant-event-callback-probe.pl');
  assert.equal(rows.length,8);
  for(const row of rows)compare(row,projectOriginalInstantEventCallback,instant);
  assert.equal(rows[0].output.item[39],81);
  assert.equal(rows[1].output.item[39],57);
  assert.throws(()=>projectOriginalInstantEventCallback({...rows[0].input,reviewed:instant}),/B-55/);
});
test('R4 source funding and popularity callbacks support each of 1..8 shelves without new EVENT authority',()=>{
  const rows=oracle('original-b57-support-event-probe.pl');
  assert.equal(rows.length,16);
  for(const row of rows)compare(row,projectOriginalSupportEventCallback,support);
  assert.throws(()=>projectOriginalSupportEventCallback({...rows[2].input,reviewed:support}),/B-57/);
});
