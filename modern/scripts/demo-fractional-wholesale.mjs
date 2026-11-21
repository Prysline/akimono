/**
 * B-04: decimal wholesale input audit, no CGI or wholesale inventory creation.
 * Run from modern/: npm run demo:wholesale
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel } from '../src/standard-street-model.mjs';
import { checkWholeStockCaps } from '../src/economy-model.mjs';
import {
  listReviewedFractionalWholesaleItems, compiledFractionalWholesaleById,
} from '../src/fractional-wholesale-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [items, rebels] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi',
].map(p => readFile(path.join(root, p), 'utf8')));
const model = loadStandardStreetModel(items, rebels);
const sourceItems = listReviewedFractionalWholesaleItems(model);
const fixtures = compiledFractionalWholesaleById(model);
const emptyStock = () => Array(model.maxItem).fill(0);

function example(shopCount, held20 = 0, held25 = 0) {
  const world = emptyStock();
  // Explicit SYNTHETIC initial wholesale stock to illustrate caps.
  world[19] = 10;
  world[24] = 10;
  const shops = Array.from({length:shopCount},()=>({item:emptyStock()}));
  if (shops.length) {
    shops[0].item[19] = held20;
    shops[0].item[24] = held25;
  }
  const market = checkWholeStockCaps(model, world, shops, fixtures);
  return {
    shopCount, shopsHeld20:held20, shopsHeld25:held25,
    totalCap20:Math.trunc(0.5 * (shopCount || 1) + 0.99),
    totalCap25:Math.trunc(1.5 * (shopCount || 1) + 0.99),
    marketStock20:market[19], marketStock25:market[24],
  };
}

console.log(JSON.stringify({
  mode: 'source-reviewed fractional wholesale cap subset (no CGI, no stock generation)',
  sourceItems,
  wholesaleCapExamples: [1,2,3,4,5].map(n=>example(n)),
  afterExistingShopStock: example(3, 1, 2),
  unsupported: [
    'full stock replenishment', 'wholesale buy callbacks', 'market pricing',
    'guilds', 'persistent Core world storage', 'CGI HTTP execution',
  ],
}, null, 2));
