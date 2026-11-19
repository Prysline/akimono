import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDsl } from '../src/parse-dsl.mjs';
import { loadStandardStreetModel, createStandardStreetShop } from '../src/standard-street-model.mjs';
import { settleUnguildedPeerPurchase } from '../src/peer-trade-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [dsl, rebel] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi',
].map(p => readFile(path.join(root, p), 'utf8')));
const model = loadStandardStreetModel(dsl, rebel);

function pair() {
  const buyer = createStandardStreetShop(model, {
    now: 1_000_000, id: 101, name: '買家', shopname: '甲店',
  });
  const seller = createStandardStreetShop(model, {
    now: 1_000_000, id: 202, name: '賣家', shopname: '乙店',
  });
  // The original new-shop grant gives FIVE #79 vouchers to each player.
  seller.showcase[0] = 79;
  seller.price[0] = 10000;
  return { buyer, seller };
}
const request = Object.freeze({
  now: 1_000_000, shelf: 0, itemId: 79, offeredPrice: 10000,
  requestedCount: 4, itemLimit: 10, baseTaxRate: 10, sendItemTime: 1200,
});
function trade(buyer, seller, overrides = {}) {
  return settleUnguildedPeerPurchase(model, buyer, seller, { ...request, ...overrides });
}

test('B-06 original gift-voucher source has no per-item funcb and global buy hook is wholesale-only', () => {
  const parsed = parseDsl(dsl, 'custom/inc-item-data.cgi');
  const voucher = parsed.blocks.find(b => b.kind === 'ITEM' && b.fields.no?.[0]?.value === '79');
  assert.equal(voucher.fields.code[0].value, 'gift');
  assert.equal(voucher.fields.name[0].value, '禮物卷');
  assert.equal(voucher.fields.funcb, undefined);
  const hook = parsed.blocks.find(b => b.kind === 'FUNCBUY');
  assert.ok(hook);
  assert.match(hook.raw, /if\(\$BUY->\{whole\}\)/);
  assert.match(hook.raw, /@@ITEMNO"禮物卷"/);
});

test('B-06 in-memory peer transfer debits buyer and credits seller according to buy-s.cgi', () => {
  const { buyer, seller } = pair();
  const a = structuredClone(buyer), b = structuredClone(seller);
  const done = trade(buyer, seller);
  assert.equal(done.receipt.count, 4);
  assert.equal(done.receipt.tax, 4000);
  assert.equal(done.receipt.timeSeconds, 1200);
  assert.equal(done.buyer.item[78], 9);
  assert.equal(done.seller.item[78], 1);
  assert.equal(done.buyer.money, 60000);
  assert.equal(done.seller.money, 136000);
  assert.equal(done.buyer.paytoday, 40000);
  assert.equal(done.seller.saletoday, 40000);
  assert.equal(done.seller.taxtoday, 4000);
  assert.equal(done.seller.itemtoday[79], 4);
  assert.equal(done.seller.trush, 20000);
  assert.equal(done.buyer.time, 958000);
  assert.equal(done.seller.time, 956800);
  assert.equal(done.seller.rank, seller.rank);
  assert.equal(done.buyer.item[78] + done.seller.item[78], buyer.item[78] + seller.item[78]);
  assert.equal(done.buyer.money + done.seller.money + done.receipt.tax, a.money + b.money);
  assert.deepEqual(buyer, a);
  assert.deepEqual(seller, b);
  assert.match(done.receipt.scope, /no persistence/);
});

test('B-06 partial quantity is limited by cash and maintains money/stock invariants', () => {
  const { buyer, seller } = pair();
  buyer.money = 25000;
  const done = trade(buyer, seller);
  assert.equal(done.receipt.count, 2);
  assert.equal(done.receipt.buyerDebit, 20000);
  assert.equal(done.buyer.money, 5000);
  assert.equal(done.seller.money, 118000);
  assert.equal(done.seller.item[78], 3);
  assert.equal(done.buyer.item[78], 7);
});

test('B-06 destination inventory cap takes priority without mutating seller', () => {
  const { buyer, seller } = pair();
  buyer.item[78] = 9;
  const done = trade(buyer, seller);
  assert.equal(done.receipt.count, 1);
  assert.equal(done.buyer.item[78], 10);
  assert.equal(done.seller.item[78], 4);
  assert.equal(seller.item[78], 5);
});

test('B-06 successive non-sold-out trades accumulate previous accounting counters', () => {
  const { buyer, seller } = pair();
  const first = trade(buyer, seller, { requestedCount: 2 });
  const second = trade(first.buyer, first.seller, { requestedCount: 2 });
  assert.equal(second.buyer.item[78], 9);
  assert.equal(second.seller.item[78], 1);
  assert.equal(second.seller.itemtoday[79], 4);
  assert.equal(second.seller.saletoday, 40000);
  assert.equal(second.seller.taxtoday, 4000);
  assert.equal(second.seller.trush, 20000);
  assert.equal(second.buyer.paytoday, 40000);
  assert.equal(second.buyer.time, 959200);
  assert.equal(second.seller.money, 136000);
});

test('B-06 zero-priced voucher transfers at zero tax and twice the time cost', () => {
  const { buyer, seller } = pair();
  seller.price[0] = 0;
  buyer.money = 0;
  const done = trade(buyer, seller, { offeredPrice: 0, requestedCount: 2 });
  assert.equal(done.receipt.count, 2);
  assert.equal(done.receipt.tax, 0);
  assert.equal(done.receipt.timeSeconds, 2400);
  assert.equal(done.buyer.money, 0);
  assert.equal(done.seller.money, 100000);
  assert.equal(done.buyer.item[78], 7);
  assert.equal(done.seller.item[78], 3);
});

test('B-06 caps buyer stored time at original 72 hours before charging', () => {
  const { buyer, seller } = pair();
  buyer.time = request.now - model.stockCap - 1200;
  const done = trade(buyer, seller, { requestedCount: 1 });
  assert.equal(done.buyer.time, request.now - model.stockCap + 1200);
});

test('B-06 may enter time debt after a purchase, matching Core UseTime', () => {
  const { buyer, seller } = pair();
  buyer.time = request.now - 200; // enough to start, not enough to finish
  const done = trade(buyer, seller, { requestedCount: 1 });
  assert.equal(done.buyer.time, request.now + 1000);
});

test('B-06 stale client price fails atomically; no hidden cached quote is trusted', () => {
  const { buyer, seller } = pair();
  const originalBuyer = structuredClone(buyer);
  const originalSeller = structuredClone(seller);
  seller.price[0] = 11000;
  assert.throws(() => trade(buyer, seller), /changed/);
  assert.deepEqual(buyer, originalBuyer);
  assert.deepEqual(seller.price[0], 11000);
  assert.equal(seller.item[78], originalSeller.item[78]);
});

test('B-06 deliberately rejects sold-out rank side effect, with all inputs untouched', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  const snapshot = structuredClone({ buyer, seller });
  assert.throws(() => trade(buyer, seller), /Sold-out rank side effect/);
  assert.deepEqual({ buyer, seller }, snapshot);
});

test('B-06 refuses wholesale sales, callbacks of other items, guild and self-purchase', () => {
  const { buyer, seller } = pair();
  assert.throws(() => trade(buyer, { ...seller, id: 0 }), /seller id/);
  assert.throws(() => trade(buyer, seller, { itemId: 10 }), /reviewed callback-free/);
  assert.throws(() => trade(buyer, seller, { itemId: 63 }), /reviewed callback-free/);
  assert.throws(() => trade(buyer, buyer), /own shop/);
  seller.guild = 'guild';
  assert.throws(() => trade(buyer, seller), /Guild-linked/);
});

test('B-06 rejects inactive stores and negative time before any transition', () => {
  const { buyer, seller } = pair();
  assert.throws(() => trade({ ...buyer, status: 0 }, seller), /active/);
  assert.throws(() => trade(buyer, { ...seller, status: 0 }), /active/);
  assert.throws(() => trade({ ...buyer, time: request.now + 1 }, seller), /time/);
});

test('B-06 refuses unspecified compiled limits/tax/duration rather than inventing them', () => {
  const { buyer, seller } = pair();
  const { itemLimit, ...missingLimit } = request;
  assert.throws(() => settleUnguildedPeerPurchase(model, buyer, seller, missingLimit), /itemLimit/);
  const { baseTaxRate, ...missingTax } = request;
  assert.throws(() => settleUnguildedPeerPurchase(model, buyer, seller, missingTax), /baseTaxRate/);
  const { sendItemTime, ...missingTime } = request;
  assert.throws(() => settleUnguildedPeerPurchase(model, buyer, seller, missingTime), /sendItemTime/);
});

test('B-06 invalid numeric state cannot corrupt monetary accounting', () => {
  const { buyer, seller } = pair();
  assert.throws(() => trade({ ...buyer, money: Number.MAX_SAFE_INTEGER + 1 }, seller), RangeError);
  assert.throws(() => trade(buyer, { ...seller, money: Number.MAX_SAFE_INTEGER }), /safe integer range/);
  assert.throws(() => trade({ ...buyer, item: [5] }, seller), /shape/);
});
