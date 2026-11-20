/**
 * B-06: Pure, atomic-in-memory projection of an unguilded peer purchase.
 *
 * Frozen references:
 *   katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365
 *   buy-s.cgi, plug/item.cgi::GetSaleTax/GetTimeDeal, plug/calc.cgi::UseTime
 *   Prysline/akimono custom/inc-item-data.cgi (Git blob 7a18185...)
 *
 * Deliberate reviewed scope:
 * - Peer store only (seller ID > 0), never wholesale (the original @@FUNCBUY
 *   market callback grants a gift for wholesale purchases >= 500000).
 * - Item #79 (gift voucher) only; its source @@ITEM has no funcb callback.
 * - No guilds. Sold-out rank penalty is projected with the original formula;
 *   a caller-supplied random() is REQUIRED only when the penalty is fractional.
 *   No implicit Math.random() or silent omission of sold-out side effects.
 * - No compiler, persistence, I/O, authentication, locks, logs or CGI.
 * - This returns NEW state values; "settled" means only the modeled memory
 *   projection and must not be mistaken for a persisted game transaction.
 */
import { quoteUnguildedPurchase } from './economy-model.mjs';

function fail(message) {
  throw new Error(message);
}
function whole(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RangeError(label + ' must be a safe integer >= ' + min);
  }
  return value;
}
function signed(value, label) {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(label + ' must be a safe integer');
  }
  return value;
}
function safeSum(left, right, label) {
  const value = left + right;
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(label + ' exceeds safe integer range');
  }
  return value;
}

/**
 * Check prerequisites and calculate from the CURRENT seller state, not an old
 * client-provided quote. All validation is done before returning new stores.
 *
 * Request fields:
 *   now, shelf, itemId, offeredPrice, requestedCount,
 *   itemLimit, baseTaxRate, sendItemTime, random? (only for fractional sold-out rankdown)
 *
 * The last 3 values MUST be supplied from a separately reviewed compiled
 * fixture and shop tax settings. They are not read from guessed DSL fields.
 */
export function settleUnguildedPeerPurchase(model, buyer, seller, request) {
  if (!model || !buyer || !seller || !request) fail('Missing transaction data');
  const now = whole(request.now, 'now');
  const buyerId = whole(buyer.id, 'buyer id', 1);
  const sellerId = whole(seller.id, 'seller id', 1);
  if (buyerId === sellerId) fail('Cannot buy from own shop');
  if (buyer.status !== 1 || seller.status !== 1) fail('Both stores must be active');
  if ((buyer.guild ?? '') !== '' || (seller.guild ?? '') !== '') {
    fail('Guild-linked trade requires an unimplemented guild ledger');
  }

  const reviewedItem = model.items?.find(item => item.id === 79);
  if (request.itemId !== 79 || reviewedItem?.code !== 'gift' ||
      reviewedItem.name !== '禮物卷') {
    fail('Only reviewed callback-free peer item #79 is supported');
  }
  if (!Array.isArray(buyer.item) || !Array.isArray(seller.item) ||
      buyer.item.length !== model.maxItem || seller.item.length !== model.maxItem) {
    fail('Incorrect shop inventory shape');
  }
  const buyerTimestamp = signed(buyer.time, 'buyer time');
  const cap = whole(model.stockCap, 'stock cap', 1);
  if (now < buyerTimestamp) fail('Insufficient available time');
  whole(buyer.money, 'buyer money');
  whole(seller.money, 'seller money');

  // buy-s.cgi handles stock caps and affordability first, then UseTime,
  // GetSaleTax, inventory, balances and accounting counters.
  const quote = quoteUnguildedPurchase(model, buyer, seller, request);
  const index = 78;
  const sellerStock = whole(seller.item[index], 'seller item #79');
  const soldOut = sellerStock === quote.count;
  // Core buy-s.cgi: sold-out rankdown = (seller.rank / 100)^3 / 1000.
  // When 0 < rankdown < 1, the original uses rand(1 / rankdown) < 1 to
  // round the penalty stochastically to 1, otherwise int(rankdown) = 0.
  // All other amounts have deterministic int(rankdown), no RNG consumption.
  let rankBefore = null;
  let rawRankDown = 0;
  let rankDown = 0;
  let needsRandom = false;
  if (soldOut) {
    rankBefore = whole(seller.rank, 'seller rank');
    rawRankDown = (rankBefore / 100) ** 3 / 1000;
    if (!Number.isFinite(rawRankDown) || rawRankDown < 0) {
      fail('Invalid sold-out rank penalty');
    }
    if (rawRankDown > 0 && rawRankDown < 1) {
      if (typeof request.random !== 'function') {
        fail('Fractional sold-out rank penalty requires injected random()');
      }
      needsRandom = true;
    } else {
      rankDown = Math.trunc(rawRankDown);
    }
  }
  const buyerStock = whole(buyer.item[index], 'buyer item #79');
  const payable = whole(quote.buyerDebit, 'buyer debit');
  if (payable > buyer.money) fail('Insufficient buyer cash');

  const newTime = safeSum(
    now - buyerTimestamp > cap ? now - cap : buyerTimestamp,
    quote.timeSeconds, 'buyer action timestamp',
  );
  const newBuyerMoney = buyer.money - payable;
  const newSellerMoney = safeSum(seller.money, quote.sellerProceeds, 'seller money');
  const buyerPaytoday = safeSum(whole(buyer.paytoday ?? 0, 'buyer paytoday'),
    payable, 'buyer paytoday');
  const sellerSaletoday = safeSum(whole(seller.saletoday ?? 0, 'seller saletoday'),
    payable, 'seller saletoday');
  const sellerTaxtoday = safeSum(whole(seller.taxtoday ?? 0, 'seller taxtoday'),
    quote.tax, 'seller taxtoday');
  const sellerTrush = safeSum(whole(seller.trush ?? 0, 'seller trush'),
    quote.sellerTrashIncrease, 'seller trush');
  const priorItemToday = whole((seller.itemtoday ?? {})[79] ?? 0,
    'seller itemtoday #79');
  const nextItemToday = safeSum(priorItemToday, quote.count, 'seller itemtoday');

  const nextBuyerItem = [...buyer.item];
  nextBuyerItem[index] = safeSum(buyerStock, quote.count, 'buyer inventory');
  const nextSellerItem = [...seller.item];
  nextSellerItem[index] = sellerStock - quote.count;

  // Resolve randomness only AFTER all other arithmetic has been validated.
  // random() has no default: replaying the same injected value reproduces
  // the same result. The external RNG's state is outside this pure-state API.
  if (needsRandom) {
    const draw = request.random();
    if (typeof draw !== 'number' || !Number.isFinite(draw) || draw < 0 || draw >= 1) {
      fail('Injected random() must return a finite number in [0, 1)');
    }
    rankDown = draw * (1 / rawRankDown) < 1 ? 1 : 0;
  }
  const rankAfter = soldOut ? Math.max(0, rankBefore - rankDown) : null;

  const nextBuyer = {
    ...buyer, money: newBuyerMoney, time: newTime,
    paytoday: buyerPaytoday, item: nextBuyerItem,
  };
  const nextSeller = {
    ...seller, money: newSellerMoney, trush: sellerTrush,
    saletoday: sellerSaletoday, taxtoday: sellerTaxtoday,
    ...(soldOut ? { rank: rankAfter } : {}),
    item: nextSellerItem,
    itemtoday: { ...(seller.itemtoday ?? {}), 79: nextItemToday },
  };
  return {
    buyer: nextBuyer, seller: nextSeller,
    receipt: Object.freeze({
      ...quote, buyerId, sellerId, itemId: 79,
      soldOut, rankDown, rankBefore, rankAfter,
      scope: 'in-memory unguilded peer transfer with sold-out rank projection; no persistence',
    }),
  };
}
