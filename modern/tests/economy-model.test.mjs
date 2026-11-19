import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel, createStandardStreetShop } from '../src/standard-street-model.mjs';
import {
  projectWholeStore, checkWholeStockCaps, extractWholeStock,
  quoteUnguildedPurchase, segmentAccountingPeriods, rollShopLedgerSubset,
} from '../src/economy-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [itemDsl, rebelDsl, cfg] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi', '_config.cgi',
].map(file => readFile(path.join(root, file), 'utf8')));
const model = loadStandardStreetModel(itemDsl, rebelDsl);
let nextID = 1;
function fresh() {
  return createStandardStreetShop(model, {
    now: 1_000_000, id: nextID++, name: '玩家', shopname: '標準街測試店',
  });
}
function stock() { return Array(model.maxItem).fill(0); }

test('B-04 original wholesale fixture calculates sort and market price', () => {
  const world = stock();
  world[4] = 5; world[9] = 20; world[10] = 1000;
  const compiled = {
    5: { price: 30, sort: 2, pricebase: 0, pricehalf: 0 },
    10: { price: 100, sort: 1, pricebase: 10, pricehalf: 10 },
    11: { price: 100, sort: 3, pricebase: 0, pricehalf: 1 },
  };
  const sourceBefore = structuredClone(world);
  const market = projectWholeStore(model, world, compiled);
  assert.equal(market.shopname, '市場');
  assert.equal(market.showcasecount, 3);
  assert.deepEqual(market.showcase, [10, 5, 11]);
  assert.deepEqual(market.price, [50, 30, 1]);
  assert.equal(market.item[9], 20);
  assert.equal(market.item[4], 5);
  assert.equal(market.item[10], 1000);
  assert.deepEqual(extractWholeStock(model, market), world);
  assert.deepEqual(world, sourceBefore);
});

test('B-04 world supply caps match original multi-shop and absolute rules', () => {
  const world = stock();
  world[9] = 30;
  world[4] = 5;
  world[10] = 1000;
  const buyer = fresh(), seller = fresh();
  buyer.item[9] = 10; seller.item[9] = 10;
  const out = checkWholeStockCaps(model, world, [buyer, seller], {
    5: { wslimit: 0 },
    10: { wslimit: 20 },
    11: { wslimit: -10 },
    63: { wslimit: 2 },
    79: { wslimit: 20 },
  });
  // Item 10: global allowance = 20 * 2 shops - 20 held = 20.
  assert.equal(out[9], 20);
  assert.equal(out[4], 0);
  assert.equal(out[10], 10);
  assert.equal(world[9], 30);
});

test('B-04 single shop limit fallback, already over-limit shop stock, and missing compiled fixture', () => {
  const world = stock(); world[9] = 30;
  const withoutStores = checkWholeStockCaps(model, world, [], { 10: { wslimit: 15 } });
  assert.equal(withoutStores[9], 15);
  const shop = fresh();
  shop.item[9] = 100;
  const over = checkWholeStockCaps(model, world, [shop], {
    10: { wslimit: 20 },
    63: { wslimit: 2 }, 79: { wslimit: 20 },
  });
  assert.equal(over[9], 0);
  assert.throws(() => checkWholeStockCaps(model, world, [], {}), /Missing compiled fixture/);
});

test('B-04 pricing fails explicitly on missing/unsafe compiled fields and ambiguous order', () => {
  const world = stock(); world[9] = 5; world[10] = 5;
  assert.throws(() => projectWholeStore(model, world, {
    10: { price: 100, pricebase: 0, pricehalf: 0, sort: 1 },
  }), /Missing compiled fixture/);
  const sameSort = {
    10: { price: 100, pricebase: 0, pricehalf: 0, sort: 1 },
    11: { price: 100, pricebase: 0, pricehalf: 0, sort: 1 },
  };
  assert.throws(() => projectWholeStore(model, world, sameSort), /sort ties/);
  assert.throws(() => projectWholeStore(model, world, {
    ...sameSort, 11: { ...sameSort[11], sort: 2, pricehalf: -2 },
  }), /negative/);
});

function purchasePair(price = 10000, sellerQuantity = 5) {
  const buyer = fresh(), seller = fresh();
  seller.item[78] = sellerQuantity;
  seller.showcase[0] = 79;
  seller.price[0] = price;
  return { buyer, seller };
}
function quote(buyer, seller, options = {}) {
  return quoteUnguildedPurchase(model, buyer, seller, {
    shelf: 0, itemId: 79, offeredPrice: seller.price[0], requestedCount: 4,
    itemLimit: 10, baseTaxRate: 10, sendItemTime: 1200,
    ...options,
  });
}

test('B-06 no-guild quote uses original item price, caps and sale tax', () => {
  const { buyer, seller } = purchasePair();
  const buyerBefore = structuredClone(buyer), sellerBefore = structuredClone(seller);
  const result = quote(buyer, seller);
  assert.equal(result.count, 4);
  assert.equal(result.unitPrice, 10000);
  assert.equal(result.buyerDebit, 40000);
  assert.equal(result.taxRate, 10);
  assert.equal(result.tax, 4000);
  assert.equal(result.sellerProceeds, 36000);
  assert.equal(result.sellerTrashIncrease, 20000);
  assert.equal(result.timeSeconds, 1200);
  assert.match(result.scope, /not committed/);
  assert.deepEqual(buyer, buyerBefore);
  assert.deepEqual(seller, sellerBefore);
});

test('B-06 supply, capacity, cash and higher price cap the purchasable count', () => {
  const { buyer, seller } = purchasePair(10000, 2);
  assert.equal(quote(buyer, seller).count, 2);
  buyer.money = 15000;
  assert.equal(quote(buyer, seller).count, 1);
  buyer.money = 100000;
  assert.equal(quote(buyer, seller, { itemLimit: 6 }).count, 1);
  assert.throws(() => quote(buyer, seller, { itemLimit: 5 }), /Zero purchasable/);
});

test('B-06 positive premium and discount follow original GetSaleTax and GetTimeDeal', () => {
  const { buyer, seller } = purchasePair(12000);
  buyer.money = 100000;
  const premium = quote(buyer, seller, { requestedCount: 2 });
  assert.equal(premium.buyerDebit, 24000);
  assert.equal(premium.taxRate, 11);
  assert.equal(premium.tax, 2640);
  assert.equal(premium.timeSeconds, 960);
  seller.price[0] = 8000;
  const discount = quote(buyer, seller, { requestedCount: 2 });
  assert.equal(discount.taxRate, 8);
  assert.equal(discount.tax, 1280);
  assert.equal(discount.timeSeconds, 1440);
});

test('B-06 rejects stale offer, own-shop purchase, and guild trade', () => {
  const { buyer, seller } = purchasePair();
  assert.throws(() => quote(buyer, buyer), /own shop/);
  assert.throws(() => quote(buyer, seller, { offeredPrice: 9999 }), /changed/);
  seller.guild = 'red';
  assert.throws(() => quote(buyer, seller), /Guild/);
});

test('B-06 rejects insufficient cash or stock; does not mutate stores', () => {
  const { buyer, seller } = purchasePair();
  buyer.money = 0;
  assert.throws(() => quote(buyer, seller), /Zero purchasable/);
  buyer.money = 100000;
  seller.item[78] = 0;
  assert.throws(() => quote(buyer, seller), /out of stock/);
});

test('B-12 original _config.cgi timing constants match projection defaults', () => {
  assert.match(cfg, /^\$ONE_DAY_TIME\s*=\s*3600\*36;/m);
  assert.match(cfg, /^\$DATE_REVISE_TIME\s*=\s*3600\*6;/m);
  assert.match(cfg, /^\$TZ_JST\s*=\s*60\*60\*9;/m);
});

test('B-12 no boundary: one non-update time span', () => {
  assert.deepEqual(segmentAccountingPeriods({lastTime: 0, now: 100}), [
    { dateupdate: 0, seconds: 100 },
  ]);
});

test('B-12 exactly crosses shifted accounting boundary and emits zero trailing segment', () => {
  const spans = segmentAccountingPeriods({lastTime: 118700, now: 118800});
  assert.deepEqual(spans, [
    { dateupdate: 1, seconds: 100 }, { dateupdate: 0, seconds: 0 },
  ]);
});

test('B-12 crossing boundary midpoint yields accounting + regular segments', () => {
  const spans = segmentAccountingPeriods({lastTime: 118700, now: 118900});
  assert.deepEqual(spans, [
    { dateupdate: 1, seconds: 100 }, { dateupdate: 0, seconds: 100 },
  ]);
});

test('B-12 starting exactly at boundary has no empty first accounting segment', () => {
  assert.deepEqual(segmentAccountingPeriods({lastTime: 118800, now: 118900}), [
    { dateupdate: 0, seconds: 100 },
  ]);
});

test('B-12 multi-period run conserves elapsed seconds', () => {
  const spans = segmentAccountingPeriods({lastTime: 0, now: 259200});
  assert.deepEqual(spans, [
    { dateupdate: 1, seconds: 118800 },
    { dateupdate: 1, seconds: 129600 },
    { dateupdate: 0, seconds: 10800 },
  ]);
  assert.equal(spans.reduce((s, item) => s + item.seconds, 0), 259200);
});

test('B-12 refuses future lastTime and invalid periods', () => {
  assert.throws(() => segmentAccountingPeriods({lastTime: 10, now: 9}), /Future/);
  assert.throws(() => segmentAccountingPeriods({lastTime: 0, now: 10, periodSeconds: 0}), RangeError);
});

function rolloverInput() {
  const shop = fresh();
  shop.profitstock = 1000;
  shop.saletoday = 900; shop.paytoday = 100;
  shop.taxtoday = 35;
  shop.costtoday = 7;
  shop.itemtoday = { 79: 3 };
  shop.exp = { 79: 500, 63: 1 };
  shop.item[78] = 20;
  return shop;
}
function roll(shop, overrides = {}) {
  return rollShopLedgerSubset(shop, {
    rankingPosition: 2, showcaseCosts: [0], itemLimitsById: { 63: 1, 79: 10 },
    ...overrides,
  });
}

test('B-11 partial ledger rollover exactly follows profit/exp formula and copy semantics', () => {
  const shop = rolloverInput();
  const before = structuredClone(shop);
  const after = roll(shop);
  assert.equal(after.profitstock, 950);
  assert.equal(after.rankingyesterday, 2);
  assert.equal(after.saleyesterday, 900);
  assert.equal(after.saletoday, 0);
  assert.equal(after.payyesterday, 100);
  assert.equal(after.paytoday, 7);
  assert.equal(after.taxyesterday, 35);
  assert.equal(after.taxtoday, 0);
  assert.equal(after.costyesterday, 7);
  assert.equal(after.costtoday, 0);
  assert.equal(after.money, 99993);
  assert.equal(after.item[78], 10);
  assert.deepEqual(after.itemyesterday, { 79: 3 });
  assert.deepEqual(after.itemtoday, {});
  assert.deepEqual(after.exp, { 79: 465 });
  assert.deepEqual(shop, before);
  shop.itemtoday[79] = 100;
  assert.equal(after.itemyesterday[79], 3);
});

test('B-11 showcase costs are assessed after past paytoday is saved', () => {
  const shop = rolloverInput();
  const after = roll(shop, { showcaseCosts: [2000] });
  assert.equal(after.profitstock, 950);
  assert.equal(after.payyesterday, 100);
  assert.equal(after.paytoday, 2007);
  assert.equal(after.money, 97993);
});

test('B-11 unknown compiled stock cap and unsupported guild side effects are refused', () => {
  const shop = rolloverInput();
  assert.throws(() => roll(shop, { itemLimitsById: {} }), /compiled stock limit/);
  shop.guild = 'guild-1';
  assert.throws(() => roll(shop), /Guild/);
});
