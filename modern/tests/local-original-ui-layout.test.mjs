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
  assert.match(html,/id="tab-use"/);
  assert.match(html,/id="tab-use-result"/);
  assert.match(script,/catalog\.filter\(item=>shop\.item\[item\.itemId-1\]>0\)/);
  assert.match(script,/item\.flagRaw\.includes\('s'\)/);
  assert.match(script,/link\.dataset\.openItem=String\(item\.itemId\)/);
  assert.match(script,/selectedItemId=itemId/);
  assert.match(script,/renderItemInfo\(s\)/);
  assert.match(adapter,/basePrice:e\.basePrice,stockLimit:e\.stockLimit/);
  assert.match(adapter,/flagRaw:item\?\.flagRaw/);
  assert.match(adapter,/type:item\?\.typeRaw/);
  assert.match(adapter,/costRaw:item\?\.costRaw/);
  assert.match(html,/熟練、行情與供需/);
  assert.match(html,/id="item-detail-cost"/);
  assert.match(html,/id="item-detail-info"/);
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

test('compact original-like tables are centered inside a stable responsive frame',()=>{
  assert.match(css,/\.shell\{width:fit-content;min-width:min\(100%,640px\);max-width:min\(100%,640px\)/);
  assert.match(css,/table\{width:max-content;max-width:100%;margin-inline:auto/);
  assert.match(css,/\.table-scroll\{max-width:100%;overflow-x:auto\}/);
  assert.match(html,/id="market-offers"/);
  assert.match(html,/持有／上限/);
  assert.match(html,/data-tab="stock"/);
  assert.match(html,/data-tab="market"/);
  assert.match(html,/data-tab="balance"/);
});

test('product details remain centered without a full-width shelf editor',()=>{
  assert.match(css,/#tab-item #item-detail-name\s*\{[\s\S]*?text-align:center/);
  assert.match(css,/#tab-item \.shelf-form\s*\{[\s\S]*?justify-content:center/);
  assert.match(css,/#tab-item \.shelf-form fieldset\s*\{[\s\S]*?width:fit-content;min-width:0;max-width:100%/);
  assert.match(css,/#tab-item \.source-use-section\s*\{[\s\S]*?width:fit-content;max-width:100%;margin:16px auto 0/);
  assert.match(css,/#tab-item \.source-use-section>\.sub-title\{text-align:center\}/);
  assert.match(html,/id="showcase-form"/);
  assert.match(html,/class="shelf-percent"/);
  assert.match(css,/#tab-item \.shelf-percent\{display:inline-flex;align-items:center;gap:4px\}/);
  assert.doesNotMatch(html,/<h2 class="section-title">● 商品明細<\/h2>/);
  assert.match(script,/\$\('showcase-form'\)\.addEventListener\('submit'/);
});

test('shared top area is compact without removing real navigation or shop stats',()=>{
  assert.match(css,/\.site-heading\{position:relative;[^\n]*padding-bottom:2px/);
  assert.match(css,/\.heading-top\{position:absolute;top:0;right:0/);
  assert.match(css,/\.site-heading h1\{font-size:20px/);
  assert.match(css,/\.status-table th,\.status-table td\{padding:2px 4px;min-width:0\}/);
  assert.match(css,/\.save-details\{margin:9px auto 3px/);
  assert.match(css,/body\.dev-mode \.local-note\{display:block\}/);
  for(const label of ['【自店】','【交易】','【情報】','【施設】','【交流】'])
    assert.ok(html.includes(label),'keeps navigation '+label);
  for(const id of ['store-name','money','rank','time','save-world','load-world','dev-toggle'])
    assert.ok(html.includes('id="'+id+'"'),'keeps top-level data and actions '+id);
});


test('single line original owner strip only appears where it is not duplicated',()=>{
  const summary=html.match(/<section id="status-summary"[\s\S]*?<\/section>/)?.[0]??'';
  assert.match(summary,/hidden>/);
  assert.equal((summary.match(/<tr>/g)??[]).length,1,
    'RANK, shop name, points, money, time share one logical row');
  assert.match(summary,/<th scope="row">RANK<\/th>[\s\S]*?<th scope="row">店名<\/th>[\s\S]*?<th scope="row">點數<\/th>[\s\S]*?<th scope="row">資金<\/th>[\s\S]*?<th scope="row">行動時間<\/th>/);
  for(const id of ['rank','store-name','shop-points','money','time'])
    assert.match(summary,new RegExp('id="'+id+'"'));
  assert.match(script,/function syncStatusVisibility\(\)/);
  assert.match(script,/currentTab==='shop'\|\|currentTab==='balance'/);
  assert.match(script,/text\('rank',number\(s\.shopSummary\?\.rankPosition\)\)/);
  assert.match(script,/text\('shop-points',number\(s\.shopSummary\?\.point\)\)/);
  assert.match(script,/Math\.trunc\(shop\.rank\/100\)\+'%'/);
  assert.match(css,/\.status-table\{width:max-content;max-width:none;font-size:12px;white-space:nowrap\}/);
  assert.match(css,/\.status-scroll\{max-width:100%;overflow-x:auto\}/);
});

test('manual local disk storage is at the bottom and collapsible, not in the header',()=>{
  const start=html.indexOf('id="save-section"');
  const pagesEnd=html.indexOf('id="tab-pending"');
  const footer=html.indexOf('<footer>');
  assert.ok(start>pagesEnd&&start<footer,'storage belongs after all game pages');
  assert.match(html,/<details id="save-section" class="save-details"/);
  assert.match(html,/id="save-world"/);
  assert.match(html,/id="load-world"/);
  assert.match(css,/\.save-details summary\{width:fit-content/);
  assert.match(script,/\$\('save-world'\)\.addEventListener/);
  assert.match(script,/\$\('load-world'\)\.addEventListener/);
});


test('shop overview and shelf restore original compact data tables without duplicate nav',()=>{
  const shop=html.slice(html.indexOf('id="tab-shop"'),html.indexOf('id="tab-market"'));
  assert.match(shop,/<table class="shop-info-table">/);
  assert.match(shop,/class="shop-icon-cell"/);
  for(const id of ['shop-info-name','owner-name','shop-info-money',
    'shop-info-time','shop-info-popularity'])
    assert.ok(shop.includes('id="'+id+'"'),'shop information cell '+id);
  assert.match(shop,/<table class="shelf-table">/);
  for(const header of ['架號','商品名稱','售價','標準價格','庫存',
    '本期售出','前期售出'])
    assert.ok(shop.includes('<th>'+header+'</th>'),'original shelf column '+header);
  for(const id of ['showcase','shop-shelf-price','shop-shelf-base-price',
    'shop-shelf-stock','shop-shelf-today','shop-shelf-yesterday'])
    assert.ok(shop.includes('id="'+id+'"'),'shelf data cell '+id);
  assert.match(shop,/<table class="shop-turnover-table"/);
  assert.doesNotMatch(shop,/data-go-tab=/,
    'top navigation replaces redundant in-shop links');
  assert.match(css,/#tab-shop \.shop-info-table,#tab-shop \.shelf-table/);
  assert.match(script,/text\('shop-info-popularity',Number\.isSafeInteger\(shop\?\.rank\)\?/);
  assert.match(script,/Math\.trunc\(shop\.rank\/100\)\+'%'/);
  assert.match(script,/text\('shop-shelf-price',hasShelf\?money\(shop\.price\[0\]\)/);
  assert.match(script,/text\('shop-shelf-today',hasShelf\?number\(shop\.itemtoday\?\.\[shelfId\]\?\?0\)/);
});


test('original-style USE flow has a compact list, detail form and result page',()=>{
  const product=html.slice(html.indexOf('id="tab-item"'),html.indexOf('id="tab-use"'));
  assert.match(product,/<ul id="use-offers" class="use-action-list">/);
  assert.doesNotMatch(product,/<table class="market-table">/,
    'avoid wide material, cost and execution grid in item details');
  assert.match(html,/<section id="tab-use" class="section pane" hidden>/);
  assert.match(html,/id="back-to-item"/);
  for(const id of ['use-detail-name','use-detail-item','use-detail-owned',
    'use-detail-materials','use-detail-money','use-detail-time',
    'use-detail-limit','use-action-form','use-count','perform-use',
    'use-result-count','use-result-money','use-result-time',
    'use-result-consumed','use-result-acquired'])
    assert.ok(html.includes('id="'+id+'"'),'original USE route element '+id);
  assert.match(script,/selectedUseId=useId/);
  assert.match(script,/button\.dataset\.openUse=String\(row\.useId\)/);
  assert.match(script,/selectTab\('use'\)/);
  assert.match(script,/call\('\/api\/use'/);
  assert.match(script,/renderUseResult\(data\.details,offer,before\.itemCatalog/);
  assert.match(script,/selectTab\('use-result'\)/);
  assert.match(script,/expectedRevision:before\.world\.revision,itemId,useId,requestedCount/);
  assert.match(css,/\.use-action-list\{/);
  assert.match(css,/\.use-detail-table\{/);
});
test('showcase edit shows verified original source time, not a guessed number',()=>{
  assert.match(html,/id="showcase-time-cost"/);
  assert.match(html,/調整或清空展示架均消耗/);
  assert.match(adapter,/showcaseEditTimeSeconds:streetModule\.showcaseEditTimeSeconds/);
  assert.match(script,/Number\.isSafeInteger\(s\.showcaseEditTimeSeconds\)/);
  assert.match(script,/conciseTimeText\(s\.showcaseEditTimeSeconds\)/);
  assert.match(css,/#tab-item \.shelf-form\{[\s\S]*?flex-direction:column/);
});
test('unreviewed disposal is not wired as a misleading browser-only mutation',()=>{
  assert.doesNotMatch(adapter,/case '\/api\/(?:throw|discard)'/);
  assert.doesNotMatch(script,/fetch\('\/api\/(?:throw|discard)'/);
});
