/**
 * Deterministic, no-CGI projections of frozen Akimono Core economy rules.
 *
 * Source commit: katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365
 * - plug/whole.cgi: GetWholeStore, SetWholeStore, CheckWholeStore
 * - buy-s.cgi and plug/item.cgi: no-guild purchase QUOTE, not a transaction
 * - inc-turn.cgi lines 10-37: accounting-period segmentation
 * - inc-period.cgi: restricted, side-effect-free shop ledger rollover
 *
 * Compiled item data and guild/callback behaviour are NOT inferred.
 */
function reject(message) { throw new Error(message); }
function int(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RangeError(label + ' must be integer >= ' + min);
  }
  return value;
}
function requireCompiled(compiledById, id, keys) {
  const compiled = compiledById?.[id];
  if (!compiled) reject('Missing compiled fixture for item ' + id);
  for (const key of keys) {
    if (!(key in compiled)) reject('Missing compiled ' + key + ' for item ' + id);
    if (!Number.isFinite(compiled[key])) reject('Invalid compiled ' + key + ' for item ' + id);
  }
  return compiled;
}

export function projectWholeStore(model, wholeStock, compiledById) {
  if (wholeStock.length !== model.maxItem) reject('Whole stock array size differs from original ID capacity');
  const slots = [];
  for (let i = 0; i < wholeStock.length; i++) {
    const stock = int(wholeStock[i], 'wholeStock[' + i + ']');
    if (!stock) continue;
    const id = i + 1;
    const compiled = requireCompiled(compiledById, id, ['price', 'sort', 'pricebase', 'pricehalf']);
    if (compiled.price < 0 || compiled.pricehalf < 0) reject('Unsupported negative compiled price/pricehalf');
    let price = compiled.price;
    if (compiled.pricehalf) {
      const divisor = (stock - compiled.pricebase) / compiled.pricehalf + 1;
      if (divisor === 0) reject('Wholesale price formula divides by zero');
      price = Math.trunc(compiled.price / divisor);
      if (price <= 0 && compiled.price) price = 1;
    }
    if (!Number.isSafeInteger(price)) reject('Wholesale price is not safe integer');
    slots.push({ id, sort: compiled.sort, price, stock });
  }
  // Perl sort with equal keys does not promise stable order.
  if (new Set(slots.map(x => x.sort)).size !== slots.length) {
    reject('Ambiguous wholesale sort ties; compiled ordering fixture required');
  }
  slots.sort((a, b) => a.sort - b.sort);
  const item = Array(model.maxItem).fill(0);
  for (const x of slots) item[x.id - 1] = x.stock;
  return {
    shopname: '市場', showcasecount: slots.length,
    showcase: slots.map(x => x.id), price: slots.map(x => x.price),
    item,
  };
}

export function checkWholeStockCaps(model, wholeStock, shops, compiledById) {
  if (wholeStock.length !== model.maxItem) reject('Whole stock array size differs from original ID capacity');
  const updated = [...wholeStock];
  for (let i = 0; i < updated.length; i++) {
    int(updated[i], 'wholeStock[' + i + ']');
    const held = shops.reduce((sum, shop) =>
      sum + int(shop.item[i] ?? 0, 'shop inventory[' + i + ']'), 0);
    if (!updated[i] && !held) continue;
    const data = requireCompiled(compiledById, i + 1, ['wslimit']);
    const limit = data.wslimit < 0 ? -data.wslimit
      : Math.trunc(data.wslimit * (shops.length || 1) + 0.99);
    if (!Number.isSafeInteger(limit) || limit < 0) reject('Invalid wholesale limit');
    const heldCapped = Math.min(held, limit);
    if (held + updated[i] > limit) updated[i] = limit - heldCapped;
    updated[i] = Math.max(0, updated[i]);
  }
  return updated;
}

export function extractWholeStock(model, projectedMarket) {
  if (projectedMarket.item.length !== model.maxItem) reject('Wrong projected stock size');
  return projectedMarket.item.map((x, i) => int(x ?? 0, 'market item[' + i + ']'));
}

/**
 * Core buy-s.cgi subset: no-guild, pre-callback quote. No mutations or commit.
 * Original purchase also has guild adjustments, sold-out rank changes, hooks,
 * authentication, data locking, persistence and logs, none of which is modeled.
 */
export function quoteUnguildedPurchase(model, buyer, seller, {
  shelf, itemId, offeredPrice, requestedCount, itemLimit, baseTaxRate, sendItemTime,
}) {
  int(shelf, 'shelf');
  int(itemId, 'itemId', 1);
  int(offeredPrice, 'offeredPrice');
  int(requestedCount, 'requestedCount', 1);
  int(itemLimit, 'itemLimit');
  int(baseTaxRate, 'baseTaxRate');
  int(sendItemTime, 'sendItemTime');
  if (buyer.id === seller.id) reject('Cannot buy from own shop');
  if ((buyer.guild ?? '') || (seller.guild ?? '')) reject('Guild pricing not supported by this quote');
  if (shelf >= seller.showcasecount) reject('Invalid seller showcase index');
  const item = model.items.find(x => x.id === itemId);
  if (!item) reject('Unknown item ID');
  if (item.price === null || item.price <= 0) reject('Original standard price unavailable');
  if (seller.showcase[shelf] !== itemId || seller.price[shelf] !== offeredPrice) {
    reject('Seller price or showcased item has changed');
  }
  const sellerStock = int(seller.item[itemId - 1] ?? 0, 'sellerStock');
  const buyerStock = int(buyer.item[itemId - 1] ?? 0, 'buyerStock');
  if (!sellerStock) reject('Seller is out of stock');
  const capacity = Math.max(0, itemLimit - buyerStock);
  let count = Math.min(requestedCount, capacity, sellerStock);
  if (offeredPrice > 0) count = Math.min(count, Math.trunc(buyer.money / offeredPrice));
  if (!count) reject('Zero purchasable quantity');
  const priceTotal = offeredPrice * count;
  const mul = Math.max(0.5, Math.min(2, 2 - (offeredPrice / item.price)));
  const timeSeconds = Math.trunc(sendItemTime * mul);
  const ratio = offeredPrice / item.price - 1;
  const down = ratio < 0 ? ratio + 1 : 1;
  const adjusted = ratio > 0 ? ratio * 5 : 0;
  let taxRate = Math.trunc((adjusted + baseTaxRate) * down + 0.5);
  taxRate = Math.min(taxRate, 99);
  const tax = Math.trunc(priceTotal * taxRate / 100);
  return Object.freeze({
    count, unitPrice: offeredPrice, buyerDebit: priceTotal,
    sellerProceeds: priceTotal - tax, taxRate, tax,
    sellerTrashIncrease: Math.trunc(priceTotal / 2), timeSeconds,
    scope: 'no-guild pre-callback quote (not committed)',
  });
}

/**
 * Core inc-turn.cgi: segmentation BEFORE running each period side effect.
 * A final zero-length segment at an exact boundary is represented faithfully.
 */
export function segmentAccountingPeriods({
  lastTime, now, periodSeconds = 129600, jstOffset = 32400, reviseSeconds = 21600,
}) {
  int(lastTime, 'lastTime');
  int(now, 'now');
  int(periodSeconds, 'periodSeconds', 1);
  int(jstOffset, 'jstOffset');
  int(reviseSeconds, 'reviseSeconds');
  if (now < lastTime) reject('Future lastTime unsupported');
  const shiftedNow = now + jstOffset - reviseSeconds;
  let shiftedLast = lastTime + jstOffset - reviseSeconds;
  const result = [];
  while (Math.trunc(shiftedLast / periodSeconds) < Math.trunc(shiftedNow / periodSeconds)) {
    if (result.length >= 10000) reject('Too many accounting periods');
    const delta = periodSeconds - shiftedLast % periodSeconds;
    result.push({ dateupdate: 1, seconds: delta });
    shiftedLast += delta;
  }
  result.push({ dateupdate: 0, seconds: shiftedNow - shiftedLast });
  return result;
}

/**
 * B-11: limited inc-period.cgi shop ledger projection; no guilds, dragons,
 * expiration, dignity, lord, city state, events, backup, randomness or file I/O.
 * Explicit compiled stock limits are required for nonzero inventory.
 */
export function rollShopLedgerSubset(shop, {
  rankingPosition, profitDayCount = 3, expDownRate = 60, expDownPoint = 5,
  showcaseCosts, itemLimitsById,
}) {
  int(rankingPosition, 'rankingPosition', 1);
  int(profitDayCount, 'profitDayCount', 1);
  int(expDownRate, 'expDownRate');
  int(expDownPoint, 'expDownPoint');
  if (shop.guild || shop.dragon || shop.dignity) {
    reject('Guild/dragon/dignity side effects not supported by ledger subset');
  }
  const showCost = showcaseCosts?.[shop.showcasecount - 1];
  int(showCost, 'showcaseCost');
  const runningCost = Math.trunc(shop.costtoday ?? 0) + showCost;
  const item = shop.item.map((n, index) => {
    if (!n) return 0;
    const limit = itemLimitsById?.[index + 1];
    int(limit, 'compiled stock limit for item ' + (index + 1));
    return Math.trunc(Math.min(n, limit));
  });
  const exp = {};
  for (const [id, val] of Object.entries(shop.exp ?? {})) {
    int(val, 'experience');
    let next = val;
    if (expDownRate) next -= Math.trunc(next * expDownRate / 1000);
    next -= expDownPoint;
    if (next > 0) exp[id] = next;
  }
  return {
    ...shop, item, exp,
    rankingyesterday: rankingPosition,
    profitstock: Math.trunc(((shop.profitstock ?? 0) * profitDayCount +
      (shop.saletoday ?? 0) - (shop.paytoday ?? 0)) / (profitDayCount + 1)),
    saleyesterday: shop.saletoday ?? 0, saletoday: 0,
    payyesterday: shop.paytoday ?? 0, paytoday: runningCost,
    itemyesterday: { ...(shop.itemtoday ?? {}) }, itemtoday: {},
    taxyesterday: shop.taxtoday ?? 0, taxtoday: 0,
    costyesterday: runningCost, costtoday: 0,
    money: shop.money - runningCost,
  };
}
