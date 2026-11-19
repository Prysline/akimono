/**
 * Demonstration of the limited, no-CGI Standard Street state model.
 *
 * Run from modern/: npm run demo:state
 * Prints a JSON snapshot; reads original DSL but writes no game data.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel, createStandardStreetShop, editShowcase } from '../src/standard-street-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [itemDsl, rebelDsl] = await Promise.all([
  'custom/inc-item-data.cgi',
  'custom/inc-rebel-data.cgi',
].map(file => readFile(path.join(root, file), 'utf8')));

const model = loadStandardStreetModel(itemDsl, rebelDsl);
const now = 1_000_000; // deterministic fixture timestamp, not wall clock
const shop = createStandardStreetShop(model, {
  now, id: 1, name: '示範店主', shopname: '標準街示範商店',
});
const showcased = editShowcase(model, shop, {
  now, shelf: 0, itemId: 79, per: 100,
});

console.log(JSON.stringify({
  scope: 'Node.js deterministic source-backed subset; NOT original CGI execution',
  itemDefinitionCount: model.items.length,
  initial: {
    cash: shop.money, remainingTimeSeconds: now - shop.time,
    showcase: shop.showcase, inventory: model.grants.map(grant => ({
      id: grant.id,
      name: model.items.find(item => item.id === grant.id)?.name,
      quantity: shop.item[grant.id - 1],
    })),
  },
  afterShowcase: {
    itemId: showcased.showcase[0],
    unitPrice: showcased.price[0],
    remainingTimeSeconds: now - showcased.time,
  },
}, null, 2));
