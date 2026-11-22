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
  assert.match(html,/class="muted dev-panel" data-dev-panel>熟練度來源：商品 EXP/);
  assert.match(html,/<th>持有／上限<\/th><th>熟練度<\/th>/);
  assert.match(html,/<th>數量／上限<\/th><th>熟練度<\/th><th>陳列<\/th>/);
  assert.match(script,/sourceProficiency\(shop,item\.itemId\)/);
  assert.match(script,/number\(item\.count\)\+'／'\+number\(item\.stockLimit\)/);
  assert.match(script,/dev\.className='dev-panel dev-raw-value'/);
  assert.match(script,/\(exp\/10\)\.toLocaleString\('zh-TW'\)\+'%'/);
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
    '本期售出','前期售出','操作'])
    assert.ok(shop.includes('<th>'+header+'</th>'),'original shelf column '+header);
  assert.match(shop,/id="showcase-shelves"/);
  assert.match(script,/shop\.showcase\[index\]/);
  assert.match(script,/shop\.price\[index\]/);
  assert.match(script,/shop\.showcasecount/);
  assert.match(html,/id="showcase-shelf"/);
  assert.match(shop,/<table class="shop-turnover-table"/);
  assert.match(shop,/id="showcase-shelves"/);
  assert.match(script,/dataset\.shelfAction=hasItem\?'remove':'open'/);
  assert.match(script,/time\.textContent='行動時間：'/);
  assert.match(html,/<th>行動時間<\/th><th>購買<\/th>/);
  assert.match(script,/cell\(Number\.isSafeInteger\(offer\.timeSeconds\)\?\s*conciseTimeText\(offer\.timeSeconds\):'—'\)/);
  assert.match(script,/\$\('showcase-shelves'\)\.addEventListener\('click'/);
  assert.match(script,/expectedRevision:snapshot\.world\.revision,itemId:0,per:100,shelf/);
  assert.doesNotMatch(shop,/data-go-tab=/,
    'top navigation replaces redundant in-shop links');
  assert.match(css,/#tab-shop \.shop-info-table,#tab-shop \.shelf-table/);
  assert.match(script,/text\('shop-info-popularity',Number\.isSafeInteger\(shop\?\.rank\)\?/);
  assert.match(script,/Math\.trunc\(shop\.rank\/100\)\+'%'/);
  assert.match(script,/money\(shop\.price\[index\]\)/);
  assert.match(script,/number\(shop\.itemtoday\?\.\[itemId\]\?\?0\)/);
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
    'use-detail-limit','use-action-form','use-count-presets','use-count','perform-use',
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
  assert.match(script,/maxUseCount/);
  assert.match(script,/maxUseCountReason/);
  assert.match(html,/id="use-estimated-time"/);
  assert.match(script,/function updateUseEstimate\(\)/);
  assert.match(script,/const timeSuffix=Number\.isSafeInteger\(row\.timePerUseSeconds\)/);
  assert.match(script,/use-count'\)\.addEventListener\('input',updateUseEstimate/);
  assert.match(script,/const requestedCount=Number\(manual!==''\?manual:\$\('use-count-presets'\)\.value\)/);
  assert.match(script,/text\('shop-points',number\(s\.shopSummary\?\.point\)\)/);
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


test('raw EXP and popularity source internals remain developer-only while action times remain player-visible',()=>{
  const stock=html.slice(html.indexOf('id="tab-stock"'),
    html.indexOf('id="tab-item"'));
  const shop=html.slice(html.indexOf('id="tab-shop"'),
    html.indexOf('id="tab-market"'));
  assert.match(stock,/class="muted dev-panel" data-dev-panel>熟練度來源/);
  assert.match(shop,/id="dev-popularity-raw"/);
  assert.match(shop,/class="muted dev-panel" data-dev-panel>/);
  assert.match(css,/\.dev-panel\{display:none\}/);
  assert.match(css,/body\.dev-mode \.dev-panel:not\(\[hidden\]\)\{display:block\}/);
  assert.match(script,/dev\.textContent=Number\.isSafeInteger\(raw\)/);
  assert.match(script,/缺少材料 ID #/);
  assert.match(script,/本次預估行動時間：/);
  assert.match(script,/dataset\.shelfIndex=String\(index\)/);
  assert.match(html,/id="market-offers"/);
});

test('bottom return controls and discard stay in the player workflow',()=>{
  const item=html.slice(html.indexOf('id="tab-item"'),html.indexOf('id="tab-use"'));
  const use=html.slice(html.indexOf('id="tab-use"'),html.indexOf('id="tab-use-result"'));
  const result=html.slice(html.indexOf('id="tab-use-result"'),html.indexOf('id="tab-balance"'));
  assert.ok(item.indexOf('id="back-to-stock"')>item.indexOf('id="use-offers"'));
  assert.ok(use.indexOf('id="back-to-item"')>use.indexOf('id="use-estimated-time"'));
  assert.ok(result.indexOf('id="result-back-to-item"')>
    result.indexOf('id="use-result-message"'));
  assert.match(item,/id="discard-form"/);
  assert.match(script,/call\('\/api\/discard'/);
  assert.match(css,/\.back-row\{display:flex;justify-content:center/);
});
