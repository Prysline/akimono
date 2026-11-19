/**
 * No-CGI, no-storage demonstration of a reviewed peer purchase subset.
 * Run from modern/: npm run demo:peer
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel, createStandardStreetShop } from '../src/standard-street-model.mjs';
import { settleUnguildedPeerPurchase } from '../src/peer-trade-model.mjs';

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
  invariants: {
    conservedGiftVouchers: result.buyer.item[78] + result.seller.item[78] === originalQuantity,
    originalCashEqualsNewCashPlusTax:
      result.buyer.money + result.seller.money + result.receipt.tax === originalMoney,
    originalSellerUnchanged: seller.item[78] === 5 && seller.money === 100000,
  },
  unsupported: [
    'sold-out rank effects', 'guild-linked trades', 'wholesale gift rewards',
    'other item callbacks', 'persistent commits', 'CGI requests',
  ],
}, null, 2));
