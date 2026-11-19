/**
 * Minimal, deterministic Standard Street projection for the browser-era GameCore.
 * Source of truth: Standard Street DSL and the frozen Core implementation.
 *
 * This module does NOT evaluate Perl, @@FUNCNEW callbacks, events, recipes,
 * user authentication, CGI requests, random sales or persistence.
 */
import { parseDsl, validateStandardStreet } from './parse-dsl.mjs';

const STOCK_CAP_SECONDS = 72 * 60 * 60; // Standard Street _config.cgi
const CORE_RANK = 5010;                 // Core new.cgi
const CORE_SHOWCASE_COUNT = 1;         // Core new.cgi

function fail(message) {
  throw new Error(message);
}

function integer(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RangeError(label + ' must be a safe integer >= ' + min);
  }
  return value;
}

/** Strict non-evaluating subset of inc-makeitem.cgi::GetNumber/GetTime. */
export function parseSourceNumber(value) {
  if (typeof value !== 'string' || !value.trim()) fail('Empty DSL number');
  const multiplier = { k: 1000, m: 60, h: 3600, d: 86400 };
  const factors = value.trim().split('*').map(x => x.trim());
  if (!factors.length || factors.length > 4) fail('Unsupported DSL number: ' + value);
  let result = 1;
  for (const factor of factors) {
    const match = /^(\d+(?:\.\d+)?)([kmhd]?)$/i.exec(factor);
    if (!match) fail('Unsupported DSL number: ' + value);
    result *= Number(match[1]) * (multiplier[match[2].toLowerCase()] ?? 1);
  }
  if (!Number.isSafeInteger(result) || result < 0) {
    fail('Unsupported noninteger or unsafe DSL number: ' + value);
  }
  return result;
}

function first(block, field) {
  return block.fields[field]?.[0]?.value;
}

function readDefine(define, name) {
  const found = (define.fields.set ?? []).map(entry => {
    const match = /^([A-Za-z_]\w*)\s+(.+)$/.exec(entry.value.trim());
    return match ? { key: match[1], value: match[2], line: entry.line } : null;
  }).find(entry => entry?.key === name);
  if (!found) fail('Missing Standard Street define: ' + name);
  return found.value;
}

/**
 * Extract a *limited* source-backed data model. Original inline Perl is retained
 * in parseDsl source blocks and is not executed or blindly translated.
 */
export function loadStandardStreetModel(itemDsl, rebelDsl) {
  const main = parseDsl(itemDsl, 'custom/inc-item-data.cgi');
  const rebel = parseDsl(rebelDsl, 'custom/inc-rebel-data.cgi');
  const audit = validateStandardStreet([main, rebel]);
  if (!audit.ok) fail('Standard Street DSL source audit failed');
  const define = main.blocks.find(block => block.kind === 'DEFINE');
  const hook = main.blocks.find(block => block.kind === 'FUNCNEW');
  if (!define || !hook) fail('Standard Street init source blocks missing');

  // Do not interpret arbitrary Perl: recognize only the original tested hook's
  // source-specific, declarative item grants.
  if (!hook.raw.includes('@@VALUE"NewShopItem"') ||
      !hook.raw.includes('$DT->{item}[$item->{no}-1]+=$val')) {
    fail('Unrecognized Standard Street FUNCNEW; explicit review required');
  }

  const items = [...main.blocks, ...rebel.blocks]
    .filter(block => block.kind === 'ITEM')
    .map(block => {
      const id = Number(first(block, 'no'));
      integer(id, 'Original item ID', 1);
      const name = first(block, 'name');
      const code = first(block, 'code');
      if (!name || !code) fail('Missing item name/code: ' + id);
      const priceRaw = first(block, 'price') ?? null;
      let price = null;
      if (priceRaw !== null) {
        try { price = parseSourceNumber(priceRaw); } catch { /* uncompiled expression */ }
      }
      return Object.freeze({
        id, name, code, price, priceRaw,
        flagRaw: first(block, 'flag') ?? '',
        source: block.file, line: block.startLine,
      });
    });
  const maxItem = Math.max(...items.map(item => item.id));
  const ids = new Set(items.map(item => item.id));
  if (ids.size !== items.length || maxItem !== 79 ||
      Array.from({ length: maxItem }, (_, i) => i + 1).some(id => !ids.has(id))) {
    fail('Expected contiguous original item IDs 1..79');
  }

  const grantsRaw = readDefine(define, 'NewShopItem').split(':');
  if (grantsRaw.length % 2 || !grantsRaw.length) fail('Invalid NewShopItem DSL pairs');
  const grants = [];
  for (let i = 0; i < grantsRaw.length; i += 2) {
    const key = grantsRaw[i].trim();
    const qty = parseSourceNumber(grantsRaw[i + 1]);
    const item = items.find(entry => entry.code === key || entry.name === key);
    if (!item || !qty) fail('Invalid starting item: ' + key);
    grants.push(Object.freeze({ id: item.id, count: qty, key }));
  }

  return Object.freeze({
    maxItem, items: Object.freeze(items),
    grants: Object.freeze(grants),
    money: parseSourceNumber(readDefine(define, 'NewShopMoney')),
    stockTime: parseSourceNumber(readDefine(define, 'NewShopTime')),
    showcaseEditTime: parseSourceNumber(first(define, 'timeeditshowcase')),
    maxMoney: parseSourceNumber(first(define, 'maxmoney')),
    stockCap: STOCK_CAP_SECONDS,
    sourceMode: 'reviewed-declarative-subset',
    unsupported: Object.freeze([
      'arbitrary Perl callbacks', 'recipes', 'events', 'authentication',
      'CGI transactions', 'storage', 'automatic sales',
    ]),
  });
}

/** Pure state initialization; no passwords, auth, real storage or CGI. */
export function createStandardStreetShop(model, input) {
  const now = integer(input.now, 'now');
  const id = integer(input.id, 'id', 1);
  if (!input.name || !input.shopname) fail('Shop and owner names required');
  const item = Array(model.maxItem).fill(0);
  for (const grant of model.grants) item[grant.id - 1] += grant.count;
  return {
    id, status: 1, name: input.name, shopname: input.shopname,
    icon: input.icon ?? 0, lastlogin: now, foundation: now,
    money: model.money, moneystock: 0, time: now - model.stockTime,
    rank: CORE_RANK,
    showcasecount: CORE_SHOWCASE_COUNT,
    showcase: [0], price: [0], item,
    saleyesterday: 0, saletoday: 0,
    costtoday: 0, costyesterday: 0,
    paytoday: 0, payyesterday: 0,
    taxtoday: 0, taxyesterday: 0,
    itemtoday: {}, itemyesterday: {},
    rankingyesterday: '',
  };
}

function bounded(value, low, high, name) {
  if (!Number.isFinite(value)) throw new RangeError(name + ' must be finite');
  return Math.min(Math.max(Math.trunc(value), low), high);
}

/**
 * A pure projection of Core sc-s.cgi and calc.cgi::UseTime.
 * A rejected edit never mutates the supplied state. CGI lock/commit is not modeled.
 * The original UseTime allows negative remaining time after a successful edit.
 */
export function editShowcase(model, shop, { now, shelf, itemId, per = 100, priceOverride = 0 }) {
  integer(now, 'now');
  integer(shelf, 'shelf');
  integer(itemId, 'itemId');
  if (shop.status !== 1) fail('Shop is not active');
  if (shelf >= shop.showcasecount || itemId > model.maxItem) fail('Invalid showcase');
  const item = model.items.find(entry => entry.id === itemId);
  if (itemId !== 0 && !item) fail('Unknown item');
  if (item?.flagRaw.includes('noshowcase')) fail('Item cannot be showcased');
  const count = bounded(per, 1, 200, 'per');
  const fixedPrice = bounded(priceOverride, 0, model.maxMoney, 'priceOverride');
  if (item && !shop.item[itemId - 1]) fail('Item out of stock');
  if (now < shop.time) fail('Available time is negative');
  if (item && !fixedPrice && item.price === null) {
    fail('Uncompiled item price: ' + item.code);
  }
  let price = itemId === 0 ? 0
    : fixedPrice || Math.trunc(item.price * count / 100);
  price = Math.min(price, model.maxMoney);
  const displayedId = itemId && price ? itemId : 0;
  const cappedTimestamp = now - shop.time > model.stockCap
    ? now - model.stockCap : shop.time;
  const updated = {
    ...shop,
    time: cappedTimestamp + model.showcaseEditTime,
    showcase: [...shop.showcase],
    price: [...shop.price],
  };
  updated.showcase[shelf] = displayedId;
  updated.price[shelf] = displayedId ? price : 0;
  return updated;
}

/**
 * Pure projection of Core plug/market.cgi::GetMarketStatus.
 * "popular" must come from an explicit compiled fixture, not guessed from DSL
 * POP/lv modifiers. Stats are computed from scratch per call.
 */
export function summarizeMarket(model, shops, { people, saleSpeed, popularityById }) {
  if (!(people > 0) || !(saleSpeed > 0)) fail('Positive people/saleSpeed required');
  const seed = people * saleSpeed / 3 / 50;
  const stats = Object.fromEntries(model.items.map(entry => [entry.id, {
    id: entry.id, todaystock: 0, todayprice: 0,
    todaysale: 0, yesterdaysale: 0,
    marketprice: 0, marketpricelow: null,
    marketpricehigh: null, uppoint: 0,
  }]));
  for (const shop of shops) {
    for (let shelf = 0; shelf < shop.showcasecount; shelf++) {
      const id = shop.showcase[shelf];
      const stock = shop.item[id - 1];
      if (!id || !stock) continue;
      const stat = stats[id];
      if (!stat) fail('Unknown marketed item: ' + id);
      const price = shop.price[shelf];
      stat.todaystock += stock;
      stat.todayprice += price * stock;
      stat.marketpricelow = stat.marketpricelow === null
        ? price : Math.min(stat.marketpricelow, price);
      stat.marketpricehigh = stat.marketpricehigh === null
        ? price : Math.max(stat.marketpricehigh, price);
    }
    for (const [id, count] of Object.entries(shop.itemtoday ?? {})) {
      if (!stats[id]) fail('Unknown item sales: ' + id);
      stats[id].todaysale += count;
    }
    for (const [id, count] of Object.entries(shop.itemyesterday ?? {})) {
      if (!stats[id]) fail('Unknown previous item sales: ' + id);
      stats[id].yesterdaysale += count;
    }
  }
  for (const stat of Object.values(stats)) {
    if (!stat.todaystock) continue;
    const popular = popularityById[stat.id];
    if (!Number.isFinite(popular) || popular < 0) {
      fail('Compiled popularity fixture required for item ' + stat.id);
    }
    const point = popular === 0 ? 100 : Math.trunc(stat.todaystock / seed * popular);
    stat.uppoint = Math.max(10, Math.min(1000, point));
    stat.marketprice = Math.trunc(stat.todayprice / stat.todaystock);
  }
  return stats;
}
