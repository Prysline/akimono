/**
 * No-CGI, no-storage demonstration of a reviewed peer purchase subset.
 * Run from modern/: npm run demo:peer
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel, createStandardStreetShop } from '../src/standard-street-model.mjs';
import { settleUnguildedPeerPurchase, listReviewedPeerItems } from '../src/peer-trade-model.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [items, rebels] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi',
].map(file => readFile(path.join(repo, file), 'utf8')));

const model = loadStandardStreetModel(items, rebels);
const now = 1_000_000;
const buyer = createStandardStreetShop(model, {
  now, id: 11, name: '買家', shopname: '甲店',
});
const seller = createStandardStreetShop(model, {
  now, id: 22, name: '賣家', shopname: '乙店',
});
seller.showcase[0] = 79;
seller.price[0] = 10000;
const originalMoney = buyer.money + seller.money;
const originalQuantity = buyer.item[78] + seller.item[78];

const result = settleUnguildedPeerPurchase(model, buyer, seller, {
  now, shelf: 0, itemId: 79, offeredPrice: 10000,
  requestedCount: 4, itemLimit: 10, baseTaxRate: 10, sendItemTime: 1200,
});

// Separate deterministic sold-out replay: seller's 5 vouchers are all bought.
// Rank 500 yields raw rankdown = 0.125, so draw 0.05 causes penalty 1.
const soldOutSeller = { ...seller, rank: 500 };
const soldOut = settleUnguildedPeerPurchase(model, buyer, soldOutSeller, {
  now, shelf: 0, itemId: 79, offeredPrice: 10000,
  requestedCount: 5, itemLimit: 10, baseTaxRate: 10, sendItemTime: 1200,
  random: () => 0.05, // injected fixed draw for replay; no Math.random()
});


// Separate fixtures: limits are explicit examples, NOT evaluated from DSL.
const reviewedItems = listReviewedPeerItems(model);
const herbSeller = { ...seller, item: [...seller.item], showcase: [1], price: [50] };
herbSeller.item[0] = 10;
const herbTrade = settleUnguildedPeerPurchase(model, buyer, herbSeller, {
  now, shelf: 0, itemId: 1, offeredPrice: 50,
  requestedCount: 3, itemLimit: 4000, baseTaxRate: 10, sendItemTime: 1200,
});
const swordSeller = { ...seller, item: [...seller.item], showcase: [40], price: [1200] };
swordSeller.item[39] = 8;
const swordTrade = settleUnguildedPeerPurchase(model, buyer, swordSeller, {
  now, shelf: 0, itemId: 40, offeredPrice: 1200,
  requestedCount: 2, itemLimit: 600, baseTaxRate: 10, sendItemTime: 1200,
});

console.log(JSON.stringify({
  mode: 'isolated in-memory peer transfer: no CGI, no persistence, no callbacks',
  before: {
    buyerCash: buyer.money, buyerGiftVouchers: buyer.item[78],
    sellerCash: seller.money, sellerGiftVouchers: seller.item[78],
  },
  after: {
    buyerCash: result.buyer.money, buyerGiftVouchers: result.buyer.item[78],
    buyerRemainingTimeSeconds: now - result.buyer.time,
    sellerCash: result.seller.money, sellerGiftVouchers: result.seller.item[78],
    sellerSaleToday: result.seller.saletoday,
    sellerTaxToday: result.seller.taxtoday,
  },
  receipt: result.receipt,
  reviewedPeerItemAllowlist: reviewedItems,
  additionalReviewedPeerTrades: [
    {
      itemId: 1, name: '藥草', requestedCount: 3,
      buyerQuantityAfter: herbTrade.buyer.item[0],
      sellerQuantityAfter: herbTrade.seller.item[0],
      sellerTaxToday: herbTrade.seller.taxtoday,
      sellerItemToday: herbTrade.seller.itemtoday[1],
      compiledItemLimit: 'explicit demonstration fixture 4000; not DSL evaluation',
    },
    {
      itemId: 40, name: '木刀', requestedCount: 2,
      buyerQuantityAfter: swordTrade.buyer.item[39],
      sellerQuantityAfter: swordTrade.seller.item[39],
      sellerTaxToday: swordTrade.seller.taxtoday,
      sellerItemToday: swordTrade.seller.itemtoday[40],
      compiledItemLimit: 'explicit demonstration fixture 600; not DSL evaluation',
    },
  ],
  soldOutWithInjectedRng: {
    note: 'separate scenario; seller rank 500, fixed random draw 0.05',
    sellerRankBefore: soldOutSeller.rank,
    sellerRankAfter: soldOut.seller.rank,
    sellerRemainingVouchers: soldOut.seller.item[78],
    itemCount: soldOut.receipt.count,
    penalty: soldOut.receipt.rankDown,
    soldOut: soldOut.receipt.soldOut,
  },
  invariants: {
    conservedGiftVouchers: result.buyer.item[78] + result.seller.item[78] === originalQuantity,
    originalCashEqualsNewCashPlusTax:
      result.buyer.money + result.seller.money + result.receipt.tax === originalMoney,
    originalSellerUnchanged: seller.item[78] === 5 && seller.money === 100000,
  },
  unsupported: [
    'non-injected fractional randomness', 'guild-linked trades', 'wholesale gift rewards',
    'other item callbacks', 'persistent commits', 'CGI requests',
  ],
}, null, 2));
