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
  assert.match(script,/warehouse\?item\.storage:item\.flagRaw\.split\('\|'\)\.includes\('noshowcase'\)/);
  assert.match(script,/link\.dataset\.openItem=String\(item\.itemId\)/);
  assert.match(script,/selectedItemId=itemId/);
  assert.match(script,/renderItemInfo\(s\)/);
  assert.match(adapter,/basePrice:e\.basePrice,stockLimit:e\.stockLimit/);
  assert.match(adapter,/flagRaw:item\?\.flagRaw/);
  assert.match(adapter,/type:item\?\.typeRaw/);
  assert.match(adapter,/costRaw:item\?\.costRaw/);
  assert.match(html,/class="muted dev-panel" data-dev-panel>熟練度來源：商品 EXP/);
  assert.match(html,/<th>持有／上限<\/th><th>熟練度<\/th>/);
  assert.match(html,/<th>數量／上限<\/th><th>售出／前期<\/th><th>熟練度<\/th><th>陳列<\/th><th>市價<\/th><th>供需平衡<\/th>/);
  assert.match(html,/id="warehouse-type"/);
  assert.match(adapter,/warehouse:world&&streetModule\.describeWarehouse/);
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
  assert.match(script,/function showcaseSlotDescription\(s,index\)/);
  assert.match(script,/option\.textContent='架'\+\(index\+1\)\+'（'\+/);
  assert.match(html,/id="showcase-shelf" aria-label="選擇展示架（括號內為目前商品）"/);
  assert.doesNotMatch(html,/id="shelf-item"/);
  assert.match(script,/const itemId=selectedItemId;/);
  assert.doesNotMatch(html,/id="showcase-shelf-current"/);
  assert.doesNotMatch(script,/function updateShowcaseShelfCurrent\(/);
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
  assert.match(html,/id="source-shelf-sale-boundary"/);
  assert.match(script,/const sourceSaleSupported=Boolean\(shop&&/);
  assert.match(script,/shop\.showcasecount>=1&&shop\.showcasecount<=\(snapshot\?\.reviewedTimeMode===true&&!snapshot\?\.reviewedFullCommerce\?1:8\)/);
  assert.match(script,/shop\.showcasecount===1\|\|w\?\.period\?\.eventState!==null/);
  assert.match(script,/shop&&shop\.showcasecount>1\?/);
  assert.match(html,/id="showcase-shelf"/);
  assert.match(shop,/<table class="shop-turnover-table"/);
  assert.match(shop,/id="showcase-shelves"/);
  assert.match(script,/dataset\.shelfAction=hasItem\?'remove':'open'/);
  assert.match(shop,/id="shop-showcase-time"/);
  assert.match(script,/text\('shop-showcase-time',Number\.isSafeInteger\(shelfEditSeconds\)\?/);
  assert.match(script,/button\.className='text-link shelf-action-link'/);
  assert.match(script,/td\.append\(button\);tr\.append\(td\);shelfBody\.append\(tr\)/);
  assert.doesNotMatch(script,/time\.textContent='行動時間：'/);
  assert.match(css,/\.shelf-action-link\{font-weight:normal;white-space:nowrap\}/);
  assert.match(html,/<th>行動時間<\/th><th>購買<\/th>/);
  assert.match(script,/cell\(Number\.isSafeInteger\(offer\.timeSeconds\)\?\s*conciseTimeText\(offer\.timeSeconds\):'—'\)/);
  assert.match(script,/\$\('showcase-shelves'\)\.addEventListener\('click'/);
  assert.match(script,/expectedRevision:snapshot\.world\.revision,itemId:0,per:100,shelf/);
  // A36 restores the three source inc-main.cgi scene actions, not duplicate navigation elsewhere.
  const sceneStart=shop.indexOf('id="owner-scene"');
  const sceneEnd=shop.indexOf('id="shop-shelf-maintenance"');
  assert.ok(sceneStart>=0&&sceneEnd>sceneStart);
  const scene=shop.slice(sceneStart,sceneEnd);
  assert.deepEqual([...scene.matchAll(/data-go-tab="([^"]+)"/g)].map(m=>m[1]),['news','stock','sweep']);
  assert.doesNotMatch(shop.slice(0,sceneStart)+shop.slice(sceneEnd),/data-go-tab=/,
    'no redundant in-shop links outside the original scene');
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
  assert.match(script,/const requestedCount=offer\.detail\?\.noCount\?1:Number\(manual!==''\?manual:\$\('use-count-presets'\)\.value\)/);
  assert.match(script,/text\('shop-points',number\(s\.shopSummary\?\.point\)\)/);
  assert.match(css,/\.use-action-list\{/);
  assert.match(css,/\.use-detail-table\{/);
});
test('showcase edit shows verified original source time, not a guessed number',()=>{
  assert.match(html,/id="showcase-time-cost"/);
  assert.match(html,/調整展示架消耗/);
  assert.match(adapter,/showcaseEditTimeSeconds:streetModule\.showcaseEditTimeSeconds/);
  assert.match(script,/Number\.isSafeInteger\(s\.showcaseEditTimeSeconds\)/);
  assert.match(script,/conciseTimeText\(s\.showcaseEditTimeSeconds\)/);
  assert.match(css,/#tab-item \.shelf-form\{[\s\S]*?flex-direction:column/);
});
test('discard is a CAS StreetModule command and never a browser-only stock mutation',()=>{
  assert.match(adapter,/case '\/api\/discard'/);
  assert.match(adapter,/kind:'discard-item'/);
  assert.match(script,/call\('\/api\/discard'/);
  assert.match(html,/id="discard-form"/);
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

test('compact original showcase editor retains each occupied shelf and syncs custom integer prices',()=>{
  const form=html.match(/<form id="showcase-form"[\s\S]*?<\/form>/)?.[0]??'';
  assert.match(form,/id="showcase-shelf"/);
  assert.doesNotMatch(form,/id="shelf-item"/);
  assert.match(form,/標準價格的/);
  for(const p of ['50','60','70','80','90','110','120'])
    assert.match(form,new RegExp('<option value="'+p+'">'+p+'%<\/option>'));
  assert.match(form,/<option value="100" selected>相等<\/option>/);
  assert.match(form,/<option value="custom">自訂比例<\/option>/);
  assert.match(form,/id="shelf-price-custom"/);
  assert.match(form,/id="shelf-price-direct"/);
  assert.match(script,/function syncShelfCustomRatio\(\)/);
  assert.match(script,/function syncShelfCalculatedPrice\(\)/);
  assert.match(script,/Math\.trunc\(base\*ratio\/100\)/);
  assert.match(script,/showcaseSlotDescription\(s,index\)\+listed/);
  assert.match(script,/listedPrice===computed\?0:listedPrice/);
  const render=script.match(/function renderItemInfo\(s\)\{[\s\S]*?\n\$\('use-offers'\)/)?.[0]??'';
  assert.doesNotMatch(render,/\bshelfSelect\b|\bnewlyOpened\b/);
  assert.match(script, /\$\('use-section'\)\.hidden=useOffers\.length===0/);
  assert.match(css,/#tab-item \.shelf-form fieldset\{[\s\S]*?flex-wrap:wrap/);
  assert.match(css,/#tab-item #showcase-shelf\{width:152px/);
  assert.match(css,/\.discard-section \.inline-form label\{[\s\S]*?flex-direction:row/);
});

test('palace page uses the server audience quote and revision-only completion, not browser assets',()=>{
  assert.match(html,/data-tab="palace"/);
  assert.match(html,/id="tab-palace"/);
  for(const id of ['palace-point','palace-required-point','palace-dignity','palace-mission','palace-item','palace-stock','palace-complete'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(script,/currentGroup=\['market','palace','survey'\]\.includes\(name\)\?'trade':'self'/);
  assert.match(script,/const p=s\?\.palace/);
  assert.match(script,/\$\('palace-mission'\)\.hidden=!canMeet/);
  assert.match(script,/palaceSubmitting\|\|!s\?\.world\|\|!canMeet\|\|p\?\.canComplete!==true/);
  assert.match(script,/await call\('\/api\/palace-complete',\{expectedRevision:before\.world\.revision\}/);
  assert.match(adapter,/case '\/api\/palace-complete'/);
});


test('full commerce USE result shows original message branch and zero-retained output',async()=>{
  const originalSubmit=await load('./original-perl/core-item-submit.cgi');
  assert.match(originalSubmit,/if\(\$USE->\{result\}->\{additem\}\[0\]\)/);
  assert.match(originalSubmit,/\$USE->\{result\}->\{message\}->\{resultok\}/);
  assert.match(originalSubmit,/\$USE->\{result\}->\{message\}->\{resultng\}/);
  const start=script.indexOf('function renderUseResult(');
  const end=script.indexOf("\n$('inventory').addEventListener",start);
  assert.ok(start>=0&&end>start);
  const render=new Function('text','number','money','conciseTimeText',script.slice(start,end)+'\nreturn renderUseResult;');
  const run=(data)=>{
    const fields={};
    render((id,value)=>fields[id]=value,String,String,String)(data,{useName:'測試'},[{itemId:16,name:'皮革加工入門'}]);
    return fields;
  };
  const base={originalResultOk:'寫作完成',originalResultNg:'寫作失敗',effectiveCount:1,moneySpent:0,timeSpentSeconds:5400};
  assert.equal(run({...base,originalAddItem:[]})['use-result-message'],'寫作失敗');
  const success=run({...base,originalAddItem:[[16,0]]});
  assert.equal(success['use-result-message'],'寫作完成');
  assert.equal(success['use-result-acquired'],'皮革加工入門 × 0');
  assert.equal(run({...base,originalAddItem:[[16,2]],originalFunctionReturn:'回呼',originalAddMsg:['取得訊息',null],originalUseMsg:['消耗訊息']})['use-result-message'],'回呼；取得訊息；寫作完成；消耗訊息');
  assert.equal(run({originalResultOk:'舊 receipt',originalAddItem:[]})['use-result-message'],'舊 receipt');
});


test('source discard and sweep use server quotes, original controls and strict revision contracts',()=>{
  assert.match(html,/data-tab="sweep"/);
  for(const id of ['discard-options','sweep-form','sweep-options','sweep-hours','sweep-report','stock-trash-warning','stock-list-content','shop-info-clean'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(script,/discardQuote=\(s\.discardOffers\?\?\[\]\)/);
  assert.match(script,/if\(s\.reviewedDiscard\)discardCount\.removeAttribute\('max'\)/);
  assert.match(script,/\$\('stock-list-content'\)\.hidden=Boolean\(q\?\.stockBlocked\)/);
  assert.match(script,/call\('\/api\/sweep',\{expectedRevision:before\.world\.revision,requestedHours\}/);
  assert.match(adapter,/exactKeys\(body,'expectedRevision,requestedHours'\)/);
});


test('source balance view displays source-ledger maintenance, historical taxes, job and elapsed founding time',()=>{
  for(const id of ['balance-prev-cost','balance-prev-tax','balance-base-tax','balance-exp','balance-job','balance-dignity','balance-wins','balance-clean'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(adapter,/balance:world&&streetModule\.describeBalance/);
  assert.match(script,/money\(balance\.accruedMaintenance\)\+' \+ '\+money\(balance\.shelfMaintenance\)/);
  assert.match(script,/text\('balance-founded',balance\.foundedLabel\)/);
});


test('original market survey and product detail use server market status, separate from wholesale offers',()=>{
 assert.match(html,/data-tab="survey"/);
 for(const id of ['market-survey-rows','item-market-price','item-market-low','item-market-high','item-market-balance'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(script,/s\.warehouse\?\.survey/);
 assert.match(script,/s\.warehouse\?\.marketItems\?\.find/);
});


test('source newspaper shows authorized bulletin rows with literal query, private markers and pagination',()=>{
 for(const id of ['news-search','news-target','news-keyword','news-mode','news-events','news-rows','news-prev','news-page','news-next'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/data-tab="news"/);
 assert.match(adapter,/news:world&&streetModule\.describeNews/);
 assert.match(script,/queryOriginalNews\(source,newsQuery\)/);
 assert.match(script,/p\.textContent=row\.private/);
});


test('source shelf tax and owner event/topic and special sale warnings are visible',()=>{
 for(const id of ['shop-shelf-tax-heading','shop-shelf-maintenance','shop-recent-title','shop-recent-rows','item-sale-warning'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(adapter,/showcaseView:world&&streetModule\.describeShowcase/);
 assert.match(script,/s\.showcaseView\?\.rows\[index\]/);
 assert.match(script,/source\?\.recentRows/);
 assert.match(script,/status\?\.saleWarning/);
});


test('source market buy form retains source presets and server-only transaction identity',()=>{
 assert.match(script,/offer\.form\?offer\.form\.available:offer\.canBuy/);
 assert.match(script,/presets\.dataset\.marketPreset/);
 assert.match(script,/requestedCount:requested/);
 assert.match(script,/marketShelf:offer\.shelf,expectedPrice:offer\.price/);
});


test('source supply graph geometry is shared by all three retail read views',()=>{
 assert.match(script,/renderMarketBalance\(balance,row\.balance,row\.graph\)/);
 assert.match(script,/renderMarketBalance\(\$\('item-market-balance'\),status\?\.balance,status\?\.graph\)/);
 assert.match(script,/renderMarketBalance\(addCell\(tr,'—'\),warehouse\?item\.balance:null,warehouse\?item\.graph:null\)/);
 assert.match(css,/\.source-market-bar\.saturated/);
 assert.match(css,/\.source-market-bar\.shortage/);
});


test('source market list pages keep full server offer identity and original page controls',()=>{
 for(const id of ['market-page-top','market-page-bottom'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(adapter,/marketPageRows:streetModule\.marketPageRows/);
 assert.match(script,/sourcePage\(offers\.length,s\.marketPageRows,marketPage\)/);
 assert.match(script,/offers\.slice\(page\.start,page\.end\+1\)/);
 assert.match(script,/sourcePageNumbers\(page\.page,page\.pageMax\)/);
 assert.match(script,/marketShelf:offer\.shelf,expectedPrice:offer\.price/);
});

test('source wholesale details present server ITEM text and warnings without changing purchase identity',()=>{
 assert.match(script,/if\(offer\.detail\)/);
 assert.match(script,/d\.info\.split/);
 assert.match(script,/d\.saleWarning/);
 assert.match(script,/offer\.detail\?\.actionLabel/);
 assert.match(script,/marketShelf:offer\.shelf,expectedPrice:offer\.price/);
});

test('original library opens its eight source chapters without HTML injection',()=>{
  assert.match(html,/data-tab="library"/);assert.match(html,/id="tab-library"/);
  assert.match(script,/fetch\('\/api\/library'/);assert.match(script,/node\.textContent=part\.text/);
  assert.match(adapter,/url\.pathname==='\/api\/library'/);
  assert.match(css,/#library-body\{white-space:pre-wrap/);
});

test('original local owner help uses source projection and opens original library chapter',()=>{
  assert.match(html,/id="owner-help"/);assert.match(html,/id="owner-help-library"/);
  assert.match(script,/renderOwnerHelp\(s\)/);assert.match(script,/selectTab\('library',id\)/);
  assert.match(adapter,/describeOriginalOwnerHelp\(\{reviewed:reviewedOwnerHelp,world\}\)/);
});

test('original settlement notice uses the server source clock, not browser time',()=>{
  assert.match(script,/s\.settlementMenu\?\.label/);
  assert.match(adapter,/settlementMenu:world&&reviewedCrossPeriod\?describeOriginalSettlementMenu/);
});

test('owner time label uses the original server clock on all owner views',()=>{
  assert.match(script,/s\.ownerClock\?\.label/);
  for(const id of ['time','shop-info-time','balance-time'])assert.ok(script.includes("text('"+id+"',actionTime)"));
  assert.match(adapter,/ownerClock:reviewedFullCommerce\?describeOriginalOwnerClock/);
});

test('original shop scene renders source dialogue as text, without synthetic customer effects',()=>{
  assert.match(html,/id="owner-scene"/);
  assert.match(script,/p\.textContent=customer\.text/);
  assert.match(adapter,/ownerScene:reviewedFullCommerce\?describeOriginalOwnerScene/);
});

test('original USE form uses reviewed count choices, material consumption and nocount presentation',()=>{
  assert.match(adapter,/describeOriginalUseForm\(\{reviewed:reviewedUseForm,offer,rule:streetModule.useItem.getRule/);
  for(const id of ['use-detail-info','use-detail-requirements','use-count-first-unit','use-count-last-unit'])assert.ok(html.includes('id="'+id+'"'));
  assert.match(script,/row\.consumptionLabel/);assert.match(script,/detail\.options\.filter/);
  assert.match(script,/\$\(id\)\.hidden=Boolean\(detail\?\.noCount\)/);
  assert.match(script,/text\('perform-use',detail\?\.action/);
});


test('R4 original comment has two local owner form entries sharing one HTTP command',()=>{
 assert.match(html,/data-tab="procedures"/);
 assert.match(html,/id="tab-procedures"[\s\S]*?id="comment-form"[\s\S]*?id="shop-comment-input"/);
 assert.match(html,/id="tab-shop"[\s\S]*?id="owner-comment-form"[\s\S]*?id="owner-comment-input"/);
});

test('R4 icon form offers separate registration and procedures entries with concrete IDs',()=>{
 assert.match(html,/id="open-icon"/);assert.match(html,/id="owner-icon-select"/);
 assert.match(html,/id="owner-icon-dialog"/);assert.match(html,/id="owner-portrait"/);
});

test('R4 owner portrait is shared by shop and source balance view',()=>{
  assert.match(html,/<img id="balance-portrait" width="48" height="48"/);
  assert.match(html,/id="balance-portrait-placeholder"/);
  assert.match(script,/portrait\(\$\('balance-portrait'\),\$\('balance-portrait-placeholder'\),shop\?\.icon,shop\?\.name\)/);
});

test('source USE list renders projected names and original entry eligibility',()=>{
  const fn=script.slice(script.indexOf('function renderSourceUseEntry('),script.indexOf('function renderItemInfo('));
  const document={createElement:tag=>({tag,dataset:{},children:[],append(x){this.children.push(x)}})};
  const render=new Function('document',fn+';return renderSourceUseEntry;')(document);
  const hidden=render({itemId:10,useId:0,sourceUseOk:false,sourceDisplayName:'？？？？？？？？'},{canUse:false,useName:'秘密',materialRoutes:[{name:'秘密'}]});
  assert.equal(hidden.children[0].tag,'span');
  assert.equal(hidden.children[0].textContent,'？？？？？？？？');
  assert.equal(hidden.children.length,1);
  const visible=render({itemId:10,useId:0,sourceUseOk:true,sourceDisplayName:'寫作'},{canUse:false});
  assert.equal(visible.children[0].tag,'button');
  assert.deepEqual(visible.children[0].dataset,{openUse:'0',useItem:'10'});
  assert.equal(visible.children[0].textContent,'寫作');
  assert.match(script,/offer\.sourceUseOk===false\|\|currentTab/);
});

test('owner scene uses source gold, garbage rows, duplicate shelves and genuine navigation',()=>{
  const fn=script.slice(script.indexOf('function renderOwnerHelp('),script.indexOf('const toggle='));
  const nodes=new Map();
  const node=()=>({hidden:false,textContent:'',children:[],replaceChildren(){this.children=[]},append(x){this.children.push(x)}});
  const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
  const render=new Function('$','text','document','catalogItem',fn+';return renderOwnerHelp;')($,(id,value)=>{$(id).textContent=value},{createElement:node},(s,id)=>s.itemCatalog.find(x=>x.itemId===id));
  const ownerScene={goldCount:6,garbageRows:[1,3],displayedItems:[79,79],helper:{sprite:0,text:'歡迎光臨'},customers:[null,{sprite:5,text:'購物'}]};
  render({ownerScene,itemCatalog:[{itemId:79,name:'禮物'}]});
  assert.equal($('owner-scene').hidden,false);
  assert.equal($('owner-scene-gold').textContent,'金幣 × 6（圖片未提供）');
  assert.deepEqual($('owner-scene-garbage').children.map(x=>x.textContent),['垃圾袋 × 1（圖片未提供）','垃圾袋 × 3（圖片未提供）']);
  assert.equal($('owner-scene-items').textContent,'店內陳列：禮物、禮物（圖片未提供）');
  assert.equal($('owner-scene-sweep').hidden,false);
  assert.deepEqual($('owner-scene-customers').children.map(x=>x.textContent),['（原版空位）','購物']);
  render({ownerScene:{...ownerScene,goldCount:0,garbageRows:[],displayedItems:[],customers:[]},itemCatalog:[]});
  assert.equal($('owner-scene-gold').hidden,true);assert.equal($('owner-scene-items').hidden,true);
  assert.equal($('owner-scene-sweep').hidden,true);assert.deepEqual($('owner-scene-garbage').children,[]);
  render({ownerScene:null,itemCatalog:[]});assert.equal($('owner-scene').hidden,true);
  const sceneHtml=html.slice(html.indexOf('id="owner-scene"'),html.indexOf('id="shop-shelf-maintenance"'));
  for(const tab of ['news','stock','sweep']){
    assert.ok(sceneHtml.includes('data-go-tab="'+tab+'"'));
    assert.ok(html.includes('id="tab-'+tab+'"'));
  }
  assert.ok(script.includes('()=>selectTab(button.dataset.goTab)'));
});

test('source stocked showcase links preserve shelf identity, current price and return entry',()=>{
  const fn=script.slice(script.indexOf('function sourceShelfItemTarget('),script.indexOf('function renderSourceUseEntry('));
  // Only the two functions are evaluated; no browser state or runtime writes.
  const code=fn.slice(0,fn.indexOf('\n}',fn.indexOf('function openItem('))+2);
  const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:''});return nodes.get(id)};
  const state={reviewedFullCommerce:true,shop:{showcasecount:3,showcase:[79,79,10],price:[10000,12345,5000],item:Array(79).fill(0)}};
  state.shop.item[78]=3;
  const harness=new Function('$','text','snapshot','selectTab','code',
    'let selectedItemId=null,selectedUseId=null,selectedShelfIndex=0,pendingShelfIndex=null,itemBackTab="stock",lastPricingItemId=null;'+code+';return {sourceShelfItemTarget,openItem,setPending:n=>pendingShelfIndex=n,get:()=>({selectedItemId,selectedShelfIndex,itemBackTab,lastPricingItemId})};');
  const tabs=[],api=harness($,(id,value)=>{$(id).textContent=value},state,t=>tabs.push(t),code);
  assert.equal(api.sourceShelfItemTarget(state,2),null);
  assert.equal(api.sourceShelfItemTarget({...state,reviewedFullCommerce:false},0),null);
  assert.equal(api.sourceShelfItemTarget(state,-1),null);
  const target=api.sourceShelfItemTarget(state,1);
  assert.deepEqual(target,{itemId:79,shelf:1,price:12345});
  api.openItem(target.itemId,target);
  assert.deepEqual(api.get(),{selectedItemId:79,selectedShelfIndex:1,itemBackTab:'shop',lastPricingItemId:null});
  assert.equal($('shelf-price-direct').value,'12345');assert.equal($('back-to-stock').textContent,'［返回店內］');
  api.openItem(79);assert.equal(api.get().selectedShelfIndex,0);assert.equal(api.get().itemBackTab,'stock');
  api.setPending(2);api.openItem(79);assert.equal(api.get().selectedShelfIndex,2);
  assert.deepEqual(tabs,['item','item','item']);
  assert.match(script,/link\.dataset\.shelfAction='detail'/);
  assert.match(script,/sourceShelfItemTarget\(snapshot,shelf\)/);
  assert.match(script,/openItem\(target\.itemId,target\)/);
  assert.match(script,/selectTab\(itemBackTab\)/);
});

test('reviewed discard presentation hides source flag t forms and distinguishes human flag h',()=>{
  const fn=script.slice(script.indexOf('function renderDiscardPresentation('),script.indexOf('function renderItemInfo('));
  const nodes=new Map();
  const $=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)};
  const render=new Function('$','text',fn+';return renderDiscardPresentation;')($,(id,value)=>{$(id).textContent=value});
  const reviewed={reviewedDiscard:true},shop={};
  for(const [flagRaw,verb,prohibited] of [['notrash','丟棄',true],['human|notrash','解雇',true],['human','解雇',false],['','丟棄',false]]){
    render(reviewed,{name:'測試商品',flagRaw},shop,!prohibited);
    assert.equal($('discard-form').hidden,prohibited);
    assert.equal($('discard-title').hidden,prohibited);
    assert.equal($('discard-submit').disabled,prohibited);
    assert.equal($('discard-submit').textContent,verb);
    assert.equal($('discard-choice-caption').textContent,verb+'數量');
    if(prohibited)assert.equal($('discard-note').textContent,'※測試商品是無法'+verb+'的');
  }
  render(reviewed,{name:'測試人員',flagRaw:'human'},shop,false);
  assert.equal($('discard-form').hidden,false);
  assert.equal($('discard-submit').disabled,true);
  render({}, {name:'舊模式',flagRaw:'human|notrash'},shop,false);
  assert.equal($('discard-form').hidden,false);
  assert.equal($('discard-submit').textContent,'丟棄');
  render(reviewed,null,null,false);
  assert.equal($('discard-form').hidden,true);
  assert.equal($('discard-note').hidden,true);
  assert.match(script,/renderDiscardPresentation\(s,item,shop,canDiscard\)/);
  for(const id of ['discard-title','discard-choice-caption','discard-submit','discard-note'])assert.ok(html.includes('id="'+id+'"'));
});
