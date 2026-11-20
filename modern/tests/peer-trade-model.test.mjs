import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDsl } from '../src/parse-dsl.mjs';
import { loadStandardStreetModel, createStandardStreetShop } from '../src/standard-street-model.mjs';
import { settleUnguildedPeerPurchase, listReviewedPeerItems } from '../src/peer-trade-model.mjs';

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

test('B-06 sold-out #79 at initial rank uses deterministic Core floor, no RNG', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  const snapshot = structuredClone({ buyer, seller });
  const result = trade(buyer, seller);
  assert.equal((5010 / 100) ** 3 / 1000 > 125, true);
  assert.equal(result.receipt.soldOut, true);
  assert.equal(result.receipt.rankDown, 125);
  assert.equal(result.receipt.rankBefore, 5010);
  assert.equal(result.receipt.rankAfter, 4885);
  assert.equal(result.seller.rank, 4885);
  assert.equal(result.seller.item[78], 0);
  assert.equal(result.buyer.item[78], 9);
  assert.equal(result.receipt.tax, 4000);
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

test('B-06 non-sold-out trade never draws randomness', () => {
  const { buyer, seller } = pair();
  const result = trade(buyer, seller, { random: () => { throw Error('unexpected RNG'); } });
  assert.equal(result.receipt.soldOut, false);
  assert.equal(result.receipt.rankDown, 0);
  assert.equal(result.receipt.rankBefore, null);
  assert.equal(result.receipt.rankAfter, null);
  assert.equal(result.seller.rank, seller.rank);
});

test('B-06 original fractional rankdown uses injected rand(1/penalty) < 1', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  seller.rank = 500; // (500/100)^3 / 1000 = 0.125
  let used = 0;
  const lower = trade(buyer, seller, { random: () => { used++; return 0.124999; } });
  const upper = trade(buyer, seller, { random: () => { used++; return 0.125; } });
  assert.equal(used, 2);
  assert.equal(lower.receipt.rankDown, 1);
  assert.equal(lower.seller.rank, 499);
  assert.equal(upper.receipt.rankDown, 0);
  assert.equal(upper.seller.rank, 500);
});

test('B-06 identical injected random values replay to identical entire state', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  seller.rank = 500;
  const a = trade(buyer, seller, { random: () => 0.05 });
  const b = trade(buyer, seller, { random: () => 0.05 });
  assert.deepEqual(a, b);
  assert.equal(a.receipt.rankDown, 1);
});

test('B-06 rank 1000 uses deterministic whole penalty 1 and does not draw RNG', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  seller.rank = 1000;
  const result = trade(buyer, seller, { random: () => { throw Error('unexpected RNG'); } });
  assert.equal(result.receipt.rankDown, 1);
  assert.equal(result.seller.rank, 999);
});

test('B-06 rank 0 incurs no penalty and never consumes RNG', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  seller.rank = 0;
  const result = trade(buyer, seller, { random: () => { throw Error('unexpected RNG'); } });
  assert.equal(result.receipt.rankDown, 0);
  assert.equal(result.seller.rank, 0);
});

test('B-06 rank 2500 fractional remainder is truncated in original Core', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  seller.rank = 2500;
  const result = trade(buyer, seller, { random: () => { throw Error('unexpected RNG'); } });
  assert.equal(result.receipt.rankDown, 15); // (25^3)/1000 => 15.625
  assert.equal(result.seller.rank, 2485);
});

test('B-06 fractional sold-out penalty requires an explicit RNG source', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  seller.rank = 500;
  const original = structuredClone({buyer,seller});
  assert.throws(() => trade(buyer, seller), /requires injected random/);
  assert.deepEqual({buyer,seller}, original);
});

test('B-06 invalid injected random results reject without any partial store mutations', () => {
  for (const value of [-0.001, 1, NaN, Infinity, '0.1', null]) {
    const { buyer, seller } = pair();
    seller.item[78] = 4;
    seller.rank = 500;
    const before = structuredClone({buyer,seller});
    assert.throws(() => trade(buyer, seller, { random: () => value }), /\[0, 1\)/);
    assert.deepEqual({buyer,seller}, before);
  }
});

test('B-06 random callback failure cannot return half-updated shops', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  seller.rank = 500;
  const before = structuredClone({ buyer, seller });
  assert.throws(() => trade(buyer, seller, { random: () => { throw Error('seed exhausted'); } }), /seed exhausted/);
  assert.deepEqual({buyer,seller}, before);
});

test('B-06 sold-out behavior also applies when quantity is capped by seller stock', () => {
  const { buyer, seller } = pair();
  seller.item[78] = 4;
  const result = trade(buyer, seller, { requestedCount: 10 });
  assert.equal(result.receipt.count, 4); // buyer capacity is 5
  assert.equal(result.receipt.soldOut, true);
  assert.equal(result.seller.item[78], 0);
  assert.equal(result.seller.rank, 4885);
});

test('B-06 formula clamps the rank to zero when penalty is larger than rank', () => {
  const {buyer, seller} = pair();
  seller.item[78] = 4;
  seller.rank = 100000; // 1000^3 / 1000 = 1,000,000
  const result = trade(buyer, seller);
  assert.equal(result.receipt.rankDown, 1000000);
  assert.equal(result.receipt.rankAfter, 0);
  assert.equal(result.seller.rank, 0);
});

test('B-06 invalid seller rank rejects sold-out, but the normal non-sold-out path remains unchanged', () => {
  const { buyer, seller } = pair();
  seller.rank = -1;
  const normal = trade(buyer, seller);
  assert.equal(normal.seller.rank, -1);
  seller.item[78] = 4;
  assert.throws(() => trade(buyer, seller), /seller rank/);
});

function pairForItem(itemId, price, sellerCount) {
  const shops = pair();
  shops.seller.item[itemId - 1] = sellerCount;
  shops.seller.showcase[0] = itemId;
  shops.seller.price[0] = price;
  return shops;
}

test('B-06 source-reviewed allowlist preserves three exact DSL identities and locations', () => {
  const rows = listReviewedPeerItems(model);
  assert.deepEqual(rows, [
    { id: 1, code: 'yakusou', name: '藥草', price: 50, limitRaw: '4000/1000',
      source: 'custom/inc-item-data.cgi', line: 1672 },
    { id: 40, code: 'ken-ki', name: '木刀', price: 1200, limitRaw: '600',
      source: 'custom/inc-item-data.cgi', line: 1265 },
    { id: 79, code: 'gift', name: '禮物卷', price: 10000, limitRaw: '10/0',
      source: 'custom/inc-item-data.cgi', line: 2717 },
  ]);
  assert.ok(Object.isFrozen(rows));
  for (const id of [1, 40, 79]) {
    const item = model.items.find(entry => entry.id === id);
    assert.equal(item.funcbRaw, null);
    assert.equal(item.flagRaw, '');
    assert.ok(item.price > 0);
  }
});

test('B-06 original @@FUNCBUY remains wholesale-only; USE callbacks do not imply safe peer approval', () => {
  const parsed = parseDsl(dsl, 'custom/inc-item-data.cgi');
  const hook = parsed.blocks.find(entry => entry.kind === 'FUNCBUY');
  assert.ok(hook);
  assert.match(hook.raw, /if\(\$BUY->\{whole\}\)/);
  const item14 = parsed.blocks.find(entry =>
    entry.kind === 'ITEM' && entry.fields.no?.[0]?.value === '14');
  const useWithCallback = parsed.blocks.find(entry =>
    entry.kind === 'USE' && entry.ownerItemLine === item14.startLine &&
    entry.fields.funcb?.[0]?.value === '_local_');
  assert.ok(useWithCallback, 'source item #14 USE callback must remain opaque');
  const { buyer, seller } = pairForItem(14, 5000, 3);
  assert.throws(() => trade(buyer, seller, { itemId: 14, offeredPrice: 5000 }),
    /reviewed callback-free/);
});

test('B-06 peer purchase of reviewed #1 藥草 transfers source-priced stock and seller tax', () => {
  const { buyer, seller } = pairForItem(1, 50, 10);
  const before = structuredClone({ buyer, seller });
  const receipt = trade(buyer, seller, {
    itemId: 1, offeredPrice: 50, requestedCount: 3,
    itemLimit: 4000,
  });
  assert.equal(receipt.receipt.itemId, 1);
  assert.equal(receipt.receipt.count, 3);
  assert.equal(receipt.receipt.buyerDebit, 150);
  assert.equal(receipt.receipt.tax, 15);
  assert.equal(receipt.receipt.sellerProceeds, 135);
  assert.equal(receipt.receipt.soldOut, false);
  assert.equal(receipt.buyer.item[0], 3);
  assert.equal(receipt.seller.item[0], 7);
  assert.equal(receipt.buyer.money, 99850);
  assert.equal(receipt.seller.money, 100135);
  assert.equal(receipt.seller.itemtoday[1], 3);
  assert.equal(receipt.seller.trush, 75);
  assert.equal(receipt.seller.saletoday, 150);
  assert.equal(receipt.seller.taxtoday, 15);
  assert.equal(receipt.buyer.item[0] + receipt.seller.item[0], 10);
  assert.equal(receipt.buyer.money + receipt.seller.money + receipt.receipt.tax, 200000);
  assert.deepEqual({ buyer, seller }, before);
});

test('B-06 peer purchase of reviewed #40 木刀 transfers its own inventory slot and counters', () => {
  const { buyer, seller } = pairForItem(40, 1200, 10);
  const result = trade(buyer, seller, {
    itemId: 40, offeredPrice: 1200, requestedCount: 5,
    itemLimit: 600,
  });
  assert.equal(result.receipt.itemId, 40);
  assert.equal(result.receipt.tax, 600);
  assert.equal(result.buyer.item[39], 5);
  assert.equal(result.seller.item[39], 5);
  assert.equal(result.buyer.money, 94000);
  assert.equal(result.seller.money, 105400);
  assert.equal(result.buyer.paytoday, 6000);
  assert.equal(result.seller.itemtoday[40], 5);
  assert.equal(result.seller.trush, 3000);
  assert.equal(result.buyer.item[78], 5); // gift voucher grant unaffected
});

test('B-06 sequential trades of two allowlisted IDs do not overwrite itemtoday keys', () => {
  const { buyer, seller } = pairForItem(1, 50, 10);
  seller.item[39] = 8;
  const first = trade(buyer, seller, {
    itemId: 1, offeredPrice: 50, requestedCount: 2,
    itemLimit: 4000,
  });
  const sellerNext = { ...first.seller, showcase: [40], price: [1200] };
  const second = trade(first.buyer, sellerNext, {
    itemId: 40, offeredPrice: 1200, requestedCount: 2,
    itemLimit: 600,
  });
  assert.deepEqual(second.seller.itemtoday, { 1: 2, 40: 2 });
  assert.equal(second.buyer.item[0], 2);
  assert.equal(second.buyer.item[39], 2);
  assert.equal(second.seller.item[0], 8);
  assert.equal(second.seller.item[39], 6);
  assert.equal(second.buyer.paytoday, 2500);
  assert.equal(second.seller.saletoday, 2500);
  assert.equal(second.seller.taxtoday, 250);
});

test('B-06 sold-out reviewed #1 藥草 honors fractional rank RNG injection', () => {
  const { buyer, seller } = pairForItem(1, 50, 3);
  seller.rank = 500;
  const result = trade(buyer, seller, {
    itemId: 1, offeredPrice: 50, requestedCount: 3,
    itemLimit: 4000, random: () => 0.05,
  });
  assert.equal(result.seller.item[0], 0);
  assert.equal(result.seller.rank, 499);
  assert.equal(result.receipt.rankDown, 1);
  assert.equal(result.receipt.soldOut, true);
  assert.equal(result.seller.itemtoday[1], 3);
});

test('B-06 sold-out reviewed #40 木刀 uses fixed rankdown without random draw', () => {
  const { buyer, seller } = pairForItem(40, 1200, 2);
  const result = trade(buyer, seller, {
    itemId: 40, offeredPrice: 1200, requestedCount: 2,
    itemLimit: 600, random: () => { throw Error('unexpected RNG'); },
  });
  assert.equal(result.seller.item[39], 0);
  assert.equal(result.seller.rank, 4885);
  assert.equal(result.receipt.rankDown, 125);
});

test('B-06 reviewed identity guard rejects changed original metadata before mutation', () => {
  const {buyer,seller} = pairForItem(1, 50, 10);
  const base = model.items;
  for (const corrupted of [
    {code:'other'}, {name:'魔法草'}, {price:9999}, {limitRaw:'4001/1000'},
    {funcbRaw:'_local_'}, {flagRaw:'noshowcase'}, {line:1673},
    {source:'custom/unexpected-data.cgi'},
  ]) {
    const tampered = { ...model,
      items: base.map(item => item.id === 1 ? { ...item, ...corrupted } : item),
    };
    const snapshot = structuredClone({buyer,seller});
    assert.throws(() => settleUnguildedPeerPurchase(tampered,buyer,seller,{
      ...request, itemId:1, offeredPrice:50, itemLimit:4000,
    }), /source metadata mismatch/);
    assert.deepEqual({buyer,seller},snapshot);
  }
});

test('B-06 source-defined inventory limits are never silently compiled from slash expressions', () => {
  const {buyer,seller} = pairForItem(1, 50, 10);
  const {itemLimit, ...without} = {...request, itemId:1, offeredPrice:50};
  assert.throws(() => settleUnguildedPeerPurchase(model,buyer,seller,without), /itemLimit/);
  const result = trade(buyer,seller,{itemId:1,offeredPrice:50,itemLimit:6,requestedCount:9});
  assert.equal(result.receipt.count,6); // fixture, not inferred from 4000/1000
  assert.equal(result.buyer.item[0],6);
  assert.equal(result.seller.item[0],4);
});

test('B-06 stale price remains rejected for new allowlisted items', () => {
  const {buyer,seller}=pairForItem(40,1200,10);
  const snapshot=structuredClone({buyer,seller});
  assert.throws(() => trade(buyer,seller,{
    itemId:40,offeredPrice:1250,itemLimit:600,
  }), /changed/);
  assert.deepEqual({buyer,seller},snapshot);
});
