import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseSourceNumber, loadStandardStreetModel,
  createStandardStreetShop, editShowcase, summarizeMarket,
} from '../src/standard-street-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [itemDsl, rebelDsl, config] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi', '_config.cgi',
].map(file => readFile(path.join(root, file), 'utf8')));
const model = loadStandardStreetModel(itemDsl, rebelDsl);

function fresh(now = 1_000_000) {
  return createStandardStreetShop(model, {
    now, id: 42, name: '測試店主', shopname: '測試標準街', icon: 3,
  });
}

test('model is loaded from both untouched original DSL files', () => {
  assert.equal(model.sourceMode, 'reviewed-declarative-subset');
  assert.equal(model.items.length, 79);
  assert.equal(model.maxItem, 79);
  assert.equal(new Set(model.items.map(item => item.id)).size, 79);
  assert.equal(model.items[0].id, 10); // source-order is NOT item-ID order
});

test('B-01 declarative init derives exact starting resources from source', () => {
  assert.equal(model.money, 100000);
  assert.equal(model.stockTime, 43200);
  assert.deepEqual(model.grants.map(x => [x.id, x.count, x.key]), [
    [63, 1, '展示架擴建拆卸工具'],
    [79, 5, '禮物卷'],
  ]);
});

test('B-01 generated state mirrors supported Core initialization fields', () => {
  const shop = fresh();
  assert.equal(shop.id, 42);
  assert.equal(shop.status, 1);
  assert.equal(shop.money, 100000);
  assert.equal(shop.moneystock, 0);
  assert.equal(shop.time, 956800);
  assert.equal(shop.rank, 5010);
  assert.equal(shop.showcasecount, 1);
  assert.deepEqual(shop.showcase, [0]);
  assert.deepEqual(shop.price, [0]);
  assert.equal(shop.item.length, 79);
  assert.equal(shop.item[62], 1);
  assert.equal(shop.item[78], 5);
  assert.equal(shop.item.reduce((sum, n) => sum + n, 0), 6);
  assert.deepEqual(shop.itemtoday, {});
  assert.deepEqual(shop.itemyesterday, {});
  assert.equal(shop.lastlogin, 1_000_000);
  assert.equal(shop.foundation, 1_000_000);
  for (const key of ['saletoday','saleyesterday','paytoday','payyesterday','costtoday',
    'costyesterday','taxtoday','taxyesterday']) assert.equal(shop[key], 0);
});

test('B-01 does not share inventory between shops', () => {
  const a = fresh();
  const b = fresh();
  a.item[62] = 0;
  a.showcase[0] = 63;
  assert.equal(b.item[62], 1);
  assert.equal(b.showcase[0], 0);
});

test('B-01 refuses missing identity or invalid ID', () => {
  assert.throws(() => createStandardStreetShop(model, { now: 1, id: 0, name: 'A', shopname: 'B' }), RangeError);
  assert.throws(() => createStandardStreetShop(model, { now: 1, id: 1, name: '', shopname: 'B' }), /required/);
});

test('initial inventory is allocated by item ID - 1, not DSL declaration order', () => {
  const shop = fresh();
  const item63 = model.items.find(item => item.id === 63);
  const item79 = model.items.find(item => item.id === 79);
  assert.equal(item63.name, '展示架擴建拆卸工具');
  assert.equal(item79.name, '禮物卷');
  assert.notEqual(model.items.findIndex(item => item.id === 63), 62);
  assert.equal(shop.item[62], 1);
  assert.equal(shop.item[78], 5);
});

test('original _config.cgi and DEFINE agree with fixed model timings', () => {
  assert.match(config, /^\$MAX_STOCK_TIME\s*=\s*72\*60\*60;/m);
  assert.equal(model.stockCap, 259200);
  assert.equal(model.showcaseEditTime, 600);
  assert.equal(model.maxMoney, 999999999);
});

test('safe numeric DSL subset supports simple multiplications and duration suffixes', () => {
  assert.equal(parseSourceNumber('12*60*60'), 43200);
  assert.equal(parseSourceNumber('10m'), 600);
  assert.equal(parseSourceNumber('20s'.replace(/s$/, '')), 20); // seconds are plain numbers
  assert.equal(parseSourceNumber('3h'), 10800);
  assert.equal(parseSourceNumber('2k'), 2000);
  assert.throws(() => parseSourceNumber('process.exit(1)'), /Unsupported/);
  assert.throws(() => parseSourceNumber('$DYNAMIC_VALUE'), /Unsupported/);
});

test('B-03 showcase model prices a stocked real item at its original DSL price', () => {
  const shop = fresh();
  shop.item[9] = 2; // original item ID 10
  const updated = editShowcase(model, shop, { now: 1_000_000, shelf: 0, itemId: 10, per: 100 });
  assert.equal(model.items.find(item => item.id === 10).price, 5000);
  assert.equal(updated.showcase[0], 10);
  assert.equal(updated.price[0], 5000);
  assert.equal(updated.time, shop.time + 600);
  assert.equal(shop.showcase[0], 0); // immutable state transition
  assert.equal(shop.time, 956800);
});

test('B-03 explicit price overrides percentage, up to max money', () => {
  const shop = fresh();
  shop.item[9] = 1;
  const updated = editShowcase(model, shop, {
    now: 1_000_000, shelf: 0, itemId: 10, per: 150, priceOverride: 175,
  });
  assert.equal(updated.price[0], 175);
  const capped = editShowcase(model, shop, {
    now: 1_000_000, shelf: 0, itemId: 10, priceOverride: 2_000_000_000,
  });
  assert.equal(capped.price[0], 999999999);
});

test('B-03 percentage clamped to [1,200] like CheckCount', () => {
  const shop = fresh();
  shop.item[9] = 1;
  assert.equal(editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:10,per:0}).price[0],50);
  assert.equal(editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:10,per:999}).price[0],10000);
});

test('B-03 clearing a shelf costs the same 600 seconds', () => {
  const shop = fresh();
  shop.showcase[0] = 10;
  shop.price[0] = 5000;
  const updated = editShowcase(model, shop, { now: 1_000_000, shelf: 0, itemId: 0 });
  assert.deepEqual(updated.showcase, [0]);
  assert.deepEqual(updated.price, [0]);
  assert.equal(updated.time, shop.time + 600);
});

test('B-03 missing stock, forbidden item and invalid shelf reject atomically', () => {
  const shop = fresh();
  const before = structuredClone(shop);
  assert.throws(() => editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:10}), /stock/);
  assert.throws(() => editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:63}), /cannot be showcased/);
  assert.throws(() => editShowcase(model,shop,{now:1_000_000,shelf:1,itemId:0}), /Invalid showcase/);
  assert.throws(() => editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:80}), /Invalid showcase/);
  assert.deepEqual(shop, before);
});

test('B-03 exhausted time prevents edit, without modifying state', () => {
  const shop = fresh();
  shop.time = 1_000_001;
  assert.throws(() => editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:0}), /negative/);
  assert.equal(shop.time, 1_000_001);
});

test('B-03 original UseTime semantics can carry remaining time into debt', () => {
  const shop = fresh();
  shop.time = 999700; // 300 seconds remaining
  const updated = editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:0});
  assert.equal(updated.time,1_000_300); // original Perl does not enforce >= 600 seconds
});

test('B-03 original UseTime caps accumulated stock at 72 hours before edit', () => {
  const shop = fresh();
  shop.time = 1_000_000 - 300_000;
  const updated = editShowcase(model,shop,{now:1_000_000,shelf:0,itemId:0});
  assert.equal(updated.time,1_000_000 - 259_200 + 600);
});

function offered(stock, price, today = 0, yesterday = 0) {
  const shop = fresh();
  shop.item[9] = stock;
  shop.showcase[0] = 10;
  shop.price[0] = price;
  shop.itemtoday = { 10: today };
  shop.itemyesterday = { 10: yesterday };
  return shop;
}

test('B-05 two offered shops produce original weighted market statistics', () => {
  const result = summarizeMarket(model,
    [offered(5, 100, 2, 1), offered(15, 300, 3, 4)],
    { people: 100, saleSpeed: 12, popularityById: { 10: 80 } },
  );
  const item = result[10];
  assert.equal(item.todaystock, 20);
  assert.equal(item.todayprice, 5000);
  assert.equal(item.marketprice, 250);
  assert.equal(item.marketpricelow, 100);
  assert.equal(item.marketpricehigh, 300);
  assert.equal(item.todaysale, 5);
  assert.equal(item.yesterdaysale, 5);
  assert.equal(item.uppoint, 200);
});

test('B-05 demand point clamps to 10, 1000, or neutral 100 for pop=0', () => {
  const shops = [offered(20, 100)];
  for (const [popular, expected] of [[1, 10], [10000, 1000], [0, 100]]) {
    const result = summarizeMarket(model, shops, {
      people: 100, saleSpeed: 12, popularityById: { 10: popular },
    });
    assert.equal(result[10].uppoint, expected);
  }
});

test('B-05 items outside shelves are not offered, but recorded sales count', () => {
  const shop = fresh();
  shop.item[9] = 100;
  shop.itemtoday = { 10: 4 };
  const result = summarizeMarket(model, [shop], {
    people: 100, saleSpeed: 12, popularityById: {},
  });
  assert.equal(result[10].todaystock, 0);
  assert.equal(result[10].marketprice, 0);
  assert.equal(result[10].todaysale, 4);
});

test('B-05 missing compiled popularity never pretends to be original game value', () => {
  assert.throws(() => summarizeMarket(model, [offered(1, 100)], {
    people: 100, saleSpeed: 12, popularityById: {},
  }), /Compiled popularity fixture required/);
});
