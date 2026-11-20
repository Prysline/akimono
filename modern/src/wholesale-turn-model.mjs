/**
 * B-12: one-item, no-CGI source-audited projection of Core inc-turn.cgi
 * wholesale PLUS turnover and the subsequent plug/whole.cgi cap check.
 *
 * Fixed sources: katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365
 * inc-turn.cgi lines 258-280, plug/whole.cgi::CheckWholeStore,
 * inc-makeitem.cgi::GetTime, and Prysline/akimono Standard Street DSL.
 *
 * Critically NOT a full turn:
 * - The caller supplies a snapshot AFTER preceding natural sales, callbacks,
 *   ranking/period settlement and sorting. We do not perform any of those.
 * - Exactly one audited item is allowed; every other world and shop inventory
 *   entry must be zero, so missing caps on other items cannot be hidden.
 * - Input world/shops are never modified and nothing is stored or committed.
 * - A caller-provided random() in [0,1) is required when a stochastic
 *   adjustment is needed. This does NOT reproduce Perl's RNG sequence.
 * - maxUsers/population/timespanSeconds must be explicit: no guessed runtime.
 */
import { compileLiteralItemLimit } from './item-limit-model.mjs';

const AUDITED = Object.freeze([
  Object.freeze({ id: 1, code: 'yakusou', priceRaw: '50',
    limitRaw: '4000/1000', plusRaw: '-20m', line: 1672 }),
  Object.freeze({ id: 10, code: 'book-make', priceRaw: '5000',
    limitRaw: '20/10', plusRaw: '20m', line: 72 }),
  Object.freeze({ id: 40, code: 'ken-ki', priceRaw: '1200',
    limitRaw: '600', plusRaw: '-1h', line: 1265 }),
]);

function fail(message) { throw new Error(message); }
function natural(value, name, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RangeError(name + ' must be a safe integer >= ' + min);
  }
  return value;
}
function sourcePlusSeconds(raw) {
  const m = /^(-?)([1-9][0-9]*)(m|h|d|k)$/.exec(raw);
  if (!m) fail('Unsupported item PLUS source: ' + raw);
  const factor = { m: 60, h: 3600, d: 86400, k: 1000 }[m[3]];
  const seconds = Number(m[2]) * factor;
  if (!Number.isSafeInteger(seconds) || seconds === 0) {
    throw new RangeError('Unsafe PLUS seconds');
  }
  return m[1] ? -seconds : seconds;
}

function reviewedItem(model, id) {
  const fixed = AUDITED.find(x => x.id === id);
  if (!fixed) fail('Only source-audited PLUS items #1, #10, #40 supported');
  const item = model?.items?.find(x => x.id === id);
  if (!item || model.maxItem !== 79 || item.code !== fixed.code ||
      item.priceRaw !== fixed.priceRaw ||
      item.limitRaw !== fixed.limitRaw ||
      item.plusRaw !== fixed.plusRaw ||
      item.line !== fixed.line ||
      item.source !== 'custom/inc-item-data.cgi') {
    fail('PLUS source metadata changed; review required for item ' + id);
  }
  const plusSeconds = sourcePlusSeconds(item.plusRaw);
  const limits = compileLiteralItemLimit(item.limitRaw);
  return { id, plusSeconds, wslimit: limits.wslimit };
}

/** Exactly three source-reviewed PLUS directives, not the full item DSL. */
export function listReviewedWholesalePlusItems(model) {
  return Object.freeze(AUDITED.map(x => {
    const checked = reviewedItem(model, x.id);
    return Object.freeze({
      id: x.id, code: x.code, raw: x.plusRaw,
      plusSeconds: checked.plusSeconds, wslimit: checked.wslimit,
      line: x.line,
    });
  }));
}

function drawUnit(random) {
  if (typeof random !== 'function') {
    fail('PLUS randomness requires explicit random()');
  }
  const sample = random();
  if (typeof sample !== 'number' || !Number.isFinite(sample) ||
      sample < 0 || sample >= 1) {
    fail('random() must return a finite number in [0, 1)');
  }
  return sample;
}

/**
 * Source-derived expected world change for ONE reviewed item for ONE positive
 * inc-turn timespan, followed by the original wholesale cap.
 *
 * Source formula:
 *   add = timespan / abs(plus) * DTpeople /
 *         (100000 / ((MAX_USER + $#DT - 1) * 0.2 + 1))
 *   add = add/2 + rand(add/2) (if add>0)
 *   if 0<add<1: possibly raise to 1 using rand(1/add)<1
 *   add = int(add)
 *   world += plus>0 ? add : -add
 *   CheckWholeStore() (clamps to 0 and caps with shop inventory)
 */
export function projectReviewedWholesaleTurnItem(model, worldStock, shops, {
  itemId, timespanSeconds, population, maxUsers, random,
}) {
  const item = reviewedItem(model, itemId);
  natural(timespanSeconds, 'timespanSeconds');
  natural(population, 'population');
  natural(maxUsers, 'maxUsers', 1);
  if (!Array.isArray(worldStock) || worldStock.length !== model.maxItem) {
    fail('World inventory must have exactly 79 slots');
  }
  if (!Array.isArray(shops)) fail('Shops must be a current snapshot array');
  const index = itemId - 1;
  for (let i = 0; i < worldStock.length; i++) {
    natural(worldStock[i], 'worldStock[' + i + ']');
    if (i !== index && worldStock[i] !== 0) {
      fail('Other world inventory requires complete turn/cap fixtures');
    }
  }
  let held = 0;
  for (const shop of shops) {
    if (!Array.isArray(shop?.item) || shop.item.length !== model.maxItem) {
      fail('Shop inventory must have exactly 79 slots');
    }
    for (let i = 0; i < shop.item.length; i++) {
      natural(shop.item[i], 'shop inventory[' + i + ']');
      if (i !== index && shop.item[i] !== 0) {
        fail('Other shop inventory requires complete turn/cap fixtures');
      }
    }
    held += shop.item[index];
    if (!Number.isSafeInteger(held)) throw new RangeError('Held stock overflow');
  }

  const coefficient = (maxUsers + shops.length - 2) * 0.2 + 1;
  if (!Number.isFinite(coefficient) || coefficient <= 0) {
    fail('Invalid original wholesale population coefficient');
  }
  const originalStock = worldStock[index];
  let base = 0, sampled = 0, units = 0, drawsUsed = 0;
  if (timespanSeconds > 0 && population > 0) {
    base = timespanSeconds / Math.abs(item.plusSeconds) *
      population / (100000 / coefficient);
    if (!Number.isFinite(base) || base < 0) fail('Unsupported PLUS add base');
    if (base > 0) {
      // Core rand(max) is equivalent to unit draw * max, not rounding.
      sampled = base / 2 + drawUnit(random) * base / 2;
      drawsUsed++;
      if (sampled > 0 && sampled < 1) {
        if (drawUnit(random) * (1 / sampled) < 1) sampled = 1;
        drawsUsed++;
      }
      units = Math.trunc(sampled);
      if (!Number.isSafeInteger(units)) {
        throw new RangeError('Unsafe wholesale turnover quantity');
      }
    }
  }
  const signedDelta = item.plusSeconds > 0 ? units : -units;
  const beforeCap = originalStock + signedDelta;
  if (!Number.isSafeInteger(beforeCap)) {
    throw new RangeError('Wholesale candidate inventory overflow');
  }
  const shopCountForCap = shops.length || 1;
  const totalCap = Math.trunc(item.wslimit * shopCountForCap + 0.99);
  if (!Number.isSafeInteger(totalCap) || totalCap < 0) {
    throw new RangeError('Unsafe wholesale global cap');
  }
  // plug/whole.cgi caps only if held+candidate exceeds totalCap; afterwards
  // clamps negative market stock to zero. When shops already over cap,
  // resulting wholesale stock is zero and shops themselves are not rewritten.
  const maxMarketStock = Math.max(0, totalCap - Math.min(held, totalCap));
  const finalStock = Math.max(0, Math.min(beforeCap, maxMarketStock));
  const nextWorldStock = [...worldStock];
  nextWorldStock[index] = finalStock;
  return Object.freeze({
    worldStock: nextWorldStock,
    receipt: Object.freeze({
      scope: 'one-item post-callback PLUS projection; no CGI/commit',
      itemId, plusRaw: AUDITED.find(x => x.id === itemId).plusRaw,
      plusSeconds: item.plusSeconds, timespanSeconds, population, maxUsers,
      shopCount: shops.length, held,
      base, sampled, drawsUsed, units, signedDelta,
      originalStock, beforeCap, totalCap, finalStock,
    }),
  });
}
