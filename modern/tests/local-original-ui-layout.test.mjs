import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const load=relative=>readFile(new URL(relative,import.meta.url),'utf8');
const [html,script,css,adapter]=await Promise.all([
  load('../local-ui/index.html'),
  load('../local-ui/app.js'),
  load('../local-ui/style.css'),
  load('../scripts/dev-local.mjs'),
]);

test('player layout preserves original five groups and routes real balances separately',()=>{
  for(const group of ['自店','交易','情報','施設','交流'])
    assert.match(html,new RegExp('【'+group+'】'));
  assert.match(html,/data-tab="balance"/);
  assert.match(html,/id="tab-balance"/);
  assert.match(html,/id="balance-prev-sales"/);
  assert.match(html,/id="shop-title"/);
  assert.match(html,/id="owner-name"/);
  assert.match(html,/id="rank"/);
  // Popularity is not a league ranking. The UI never guesses a RANK number.
  assert.doesNotMatch(html,/RANK\s*\d+/);
  assert.match(script,/const hasPriorPeriod=Boolean\(w\?\.period\?\.settledCount>0\)/);
  assert.match(script,/hasPriorPeriod\?money\(shop\?\.saleyesterday\):'尚未決算'/);
});

test('warehouse categories link to original-style item details without fabricated prices',()=>{
  assert.match(html,/id="storage-inventory"/);
  assert.match(html,/id="inventory"/);
  assert.match(html,/id="tab-item"/);
  assert.match(html,/id="item-detail-owned"/);
  assert.match(html,/id="showcase-form"/);
  assert.match(html,/id="use-offers"/);
  assert.match(script,/catalog\.filter\(item=>shop\.item\[item\.itemId-1\]>0\)/);
  assert.match(script,/item\.flagRaw\.includes\('s'\)/);
  assert.match(script,/link\.dataset\.openItem=String\(item\.itemId\)/);
  assert.match(script,/selectedItemId=itemId/);
  assert.match(script,/renderItemInfo\(s\)/);
  assert.match(adapter,/basePrice:e\.basePrice,stockLimit:e\.stockLimit/);
  assert.match(adapter,/flagRaw:streetModule\.catalog\.items/);
  assert.match(html,/尚未具備完整來源資料/);
});

test('developer tools remain on their related pages and existing live commands stay wired',()=>{
  assert.match(html,/id="dev-toggle"/);
  assert.match(css,/\.dev-panel\{display:none\}/);
  assert.match(css,/body\.dev-mode \.dev-panel:not\(\[hidden\]\)\{display:block\}/);
  assert.match(html,/id="tab-shop"[\s\S]*?id="advance-time-form"[\s\S]*?id="tab-market"/);
  assert.match(html,/id="tab-market"[\s\S]*?id="supply"[\s\S]*?id="tab-stock"/);
  assert.match(html,/id="reset-world"/);
  assert.match(html,/id="receipt-details"/);
  for(const endpoint of ['/api/save','/api/load','/api/reset','/api/initialize',
    '/api/open-shop','/api/supply','/api/advance-time','/api/showcase',
    '/api/buy','/api/use'])
    assert.ok(script.includes(endpoint),'retains real handler for '+endpoint);
  assert.match(script,/if\(data\.state\)showState\(data\.state\)/);
  assert.match(script,/body\.classList\.toggle\('dev-mode'\)/);
});

test('compact original-like tables are centered by their own content width',()=>{
  assert.match(css,/table\{width:max-content;max-width:100%;margin-inline:auto/);
  assert.match(css,/\.table-scroll\{max-width:100%;overflow-x:auto\}/);
  assert.match(html,/id="market-offers"/);
  assert.match(html,/持有／上限/);
  assert.match(html,/data-go-tab="stock"/);
});
