/**
 * Audit-only deterministic LIMIT demo; no Perl eval and no CGI.
 * Run from modern/: npm run demo:limits
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel } from '../src/standard-street-model.mjs';
import { compileOrderedItemLimit } from '../src/item-limit-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [items, rebels] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi',
].map(p => readFile(path.join(root, p), 'utf8')));
const model = loadStandardStreetModel(items, rebels);
const reviewed = model.items.find(item => item.id === 1);
const reviewedLimit = compileOrderedItemLimit({
  price: reviewed.price,
  priceLine: reviewed.priceSourceLine,
  limitRaw: reviewed.limitRaw,
  limitLine: reviewed.limitSourceLine,
});
console.log(JSON.stringify({
  mode: 'frozen Core PRICE/LIMIT order subset, no Perl eval',
  pinnedStandardStreet: {
    totalItems: model.items.length,
    explicitLimitCount: model.items.filter(item => item.limitRaw !== null).length,
    levelLimitCount: model.items.filter(item => /^lv/i.test(item.limitRaw ?? '')).length,
    reviewedItem1: {
      id: reviewed.id, code: reviewed.code,
      priceLine: reviewed.priceSourceLine, limitLine: reviewed.limitSourceLine,
      ...reviewedLimit,
    },
  },
  // Everything in this section is a synthetic compiler fixture, not an
  // active Standard Street item and not compiled by running original Perl.
  syntheticExamples: {
    omittedLimit: compileOrderedItemLimit({ price: 749, priceLine: 10 }),
    levelAfterPrice: compileOrderedItemLimit({
      price: 10000, priceLine: 10, limitRaw: 'lv2.5', limitLine: 11,
    }),
    levelBeforePrice: compileOrderedItemLimit({
      price: 10000, priceLine: 11, limitRaw: 'lv2.5', limitLine: 10,
    }),
    separateWholesaleLimit: compileOrderedItemLimit({
      price: 10000, priceLine: 10, limitRaw: 'lv2.5/0', limitLine: 11,
    }),
  },
  unsupported: [
    'arbitrary Perl GetNumber eval', 'zero-priced default inference',
    'multiple PRICE/LIMIT declarations', 'macro expansion',
    'full original compiler or CGI execution',
  ],
}, null, 2));
