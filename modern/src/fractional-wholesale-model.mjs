/**
 * B-04 fractional wholesale input allowlist from frozen Standard Street DSL.
 *
 * Source: Prysline/akimono custom/inc-item-data.cgi
 * Git blob 7a18185e98b32aee82ca1ce30d6f3c395157dbcb.
 *
 * The original Core compiler assigns decimal LIMIT right operands to wslimit.
 * Core plug/whole.cgi::CheckWholeStore then uses
 *   int(wslimit * (shopCount || 1) + 0.99)
 * for nonnegative wslimit; held shop stock reduces world-stock allowance.
 *
 * This is an audited fixture builder, NOT market generation, availability,
 * a purchase, an automated stock replenishment, or a commodity trade allowlist.
 * In particular, #64 has noshowcase|onlysend restrictions, and some source
 * items have USE effects which are not executed here.
 */
import { compileLiteralItemLimit } from './item-limit-model.mjs';

const FROZEN_FRACTIONAL_ITEMS = Object.freeze([
  Object.freeze({ id: 20, code: 'book-ken', name: '劍的鍛造方法',
    priceRaw: '50000', limitRaw: '20/0.5', line: 754 }),
  Object.freeze({ id: 21, code: 'book-tate', name: '盾的製作方法',
    priceRaw: '50000', limitRaw: '20/0.5', line: 817 }),
  Object.freeze({ id: 22, code: 'book-yoroi', name: '鎧的製作方法',
    priceRaw: '50000', limitRaw: '20/0.5', line: 880 }),
  Object.freeze({ id: 23, code: 'book-tue', name: '杖的製作方法',
    priceRaw: '50000', limitRaw: '20/0.5', line: 944 }),
  Object.freeze({ id: 25, code: 'mino', name: '米諾陶洛斯♀',
    priceRaw: '10000', limitRaw: '20/1.5', line: 2271 }),
  Object.freeze({ id: 64, code: 'defence-manbiki', name: '看門機器人',
    priceRaw: '500000', limitRaw: '1/0.5', line: 2243 }),
  Object.freeze({ id: 66, code: 'book-sousyoku', name: '裝飾品加工入門',
    priceRaw: '50000', limitRaw: '20/0.5', line: 669 }),
]);

export function listReviewedFractionalWholesaleItems(model) {
  if (!model || model.maxItem !== 79 || !Array.isArray(model.items)) {
    throw new Error('Unexpected Standard Street item model');
  }
  const sourceIds = model.items.filter(item =>
    typeof item.limitRaw === 'string' &&
    /^[0-9]+\/[0-9]+\.[0-9]+$/.test(item.limitRaw),
  ).map(item => item.id).sort((a,b) => a-b);
  const reviewedIds = FROZEN_FRACTIONAL_ITEMS.map(item => item.id);
  if (sourceIds.length !== reviewedIds.length ||
      sourceIds.some((id, i) => id !== reviewedIds[i])) {
    throw new Error('Fractional wholesale item set changed; source review required');
  }
  return Object.freeze(FROZEN_FRACTIONAL_ITEMS.map(frozen => {
    const item = model.items.find(entry => entry.id === frozen.id);
    if (!item || item.code !== frozen.code ||
        item.name !== frozen.name || item.priceRaw !== frozen.priceRaw ||
        item.limitRaw !== frozen.limitRaw ||
        item.source !== 'custom/inc-item-data.cgi' ||
        item.line !== frozen.line) {
      throw new Error('Fractional wholesale source metadata mismatch: ' + frozen.id);
    }
    const compiled = compileLiteralItemLimit(item.limitRaw);
    if (!Number.isSafeInteger(compiled.limit) ||
        !Number.isFinite(compiled.wslimit) ||
        Number.isInteger(compiled.wslimit)) {
      throw new Error('Unexpected fractional wholesale compilation: ' + frozen.id);
    }
    return Object.freeze({
      id: item.id, code: item.code, name: item.name, source: item.source,
      line: item.line, priceRaw: item.priceRaw, limitRaw: item.limitRaw,
      limit: compiled.limit, wslimit: compiled.wslimit,
    });
  }));
}

/** Fixtures for *only* the seven reviewed decimal-wslimit IDs. */
export function compiledFractionalWholesaleById(model) {
  const result = Object.create(null);
  for (const item of listReviewedFractionalWholesaleItems(model)) {
    result[item.id] = Object.freeze({ wslimit: item.wslimit });
  }
  return Object.freeze(result);
}
