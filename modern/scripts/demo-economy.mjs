/**
 * Deterministic no-CGI demo of economy submodels, not a complete game.
 * Run from modern/: npm run demo:economy
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel, createStandardStreetShop } from '../src/standard-street-model.mjs';
import {
  projectWholeStore, quoteUnguildedPurchase,
  segmentAccountingPeriods, rollShopLedgerSubset,
} from '../src/economy-model.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [dsl, rebels] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi',
].map(f => readFile(path.join(repo, f), 'utf8')));
const model = loadStandardStreetModel(dsl, rebels);
const now = 1_000_000;
const buyer = createStandardStreetShop(model, {
  now, id: 1, name: '測試買家', shopname: '甲店',
});
const seller = createStandardStreetShop(model, {
  now, id: 2, name: '測試賣家', shopname: '乙店',
});
seller.showcase[0] = 79; // original Standard Street gift voucher
seller.price[0] = 10000;
const quote = quoteUnguildedPurchase(model, buyer, seller, {
  shelf: 0, itemId: 79, offeredPrice: 10000,
  requestedCount: 4, itemLimit: 10,
  baseTaxRate: 10, sendItemTime: 1200,
});

// Explicit SYNTHETIC compiled wholesale fixture, not DSL-compiled data.
const whole = Array(model.maxItem).fill(0);
whole[9] = 20;
const wholesale = projectWholeStore(model, whole, {
  10: { price: 100, sort: 1, pricebase: 10, pricehalf: 10 },
});
const periodSegments = segmentAccountingPeriods({ lastTime: 118700, now: 118900 });
buyer.profitstock = 1000;
buyer.saletoday = 900;
buyer.paytoday = 100;
buyer.costtoday = 7;
buyer.exp = { 79: 500 };
const settled = rollShopLedgerSubset(buyer, {
  rankingPosition: 1,
  showcaseCosts: [0],
  itemLimitsById: { 63: 1, 79: 10 },
});
console.log(JSON.stringify({
  mode: 'No-CGI source-backed subset, with explicit synthetic compiled fixtures',
  purchaseQuoteOnly: quote,
  wholesaleSyntheticFixture: {
    itemId: wholesale.showcase[0],
    stock: wholesale.item[9],
    marketPrice: wholesale.price[0],
  },
  accountingPeriodSeconds: periodSegments,
  shopLedgerSubset: {
    profitstock: settled.profitstock,
    saleyesterday: settled.saleyesterday,
    payyesterday: settled.payyesterday,
    paytoday: settled.paytoday,
    exp79: settled.exp[79],
  },
  unsupported: [
    'guild adjustments', 'buy callbacks', 'purchase commit',
    'full city settlement', 'file persistence', 'CGI server',
  ],
}, null, 2));
