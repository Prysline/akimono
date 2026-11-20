/**
 * Strict, non-evaluating subset of the frozen Core item compiler's LIMIT rule.
 *
 * Core: katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365
 * inc-makeitem.cgi :: GetBuffer(mode='item'), LIMIT stanza (lines 412-426).
 *
 * LIMIT A/B assigns item.limit = GetNumber(A) and item.wslimit =
 * GetNumber(B). Without /B, wslimit equals limit. The slash is NOT division.
 *
 * Scope deliberately excludes GetNumber's arbitrary Perl eval, symbolic
 * values, lvN multipliers, empty left-hand sides, negative/noninteger limits,
 * and implicit price-based defaults. Those require separate source review.
 */
export function compileLiteralItemLimit(raw) {
  if (typeof raw !== 'string') {
    throw new TypeError('Item LIMIT must be a source string');
  }
  const match = /^([0-9]+)(?:\/([0-9]+))?$/.exec(raw);
  if (!match) {
    throw new Error('Unsupported nonliteral item LIMIT: ' + raw);
  }
  const limit = Number(match[1]);
  const wslimit = match[2] === undefined ? limit : Number(match[2]);
  if (!Number.isSafeInteger(limit) || limit < 1 ||
      !Number.isSafeInteger(wslimit) || wslimit < 0) {
    throw new RangeError('Unsupported or unsafe literal item LIMIT: ' + raw);
  }
  return Object.freeze({ limit, wslimit, raw, mode: 'literal-core-limit-subset' });
}


/**
 * Core inc-makeitem.cgi subset for a *single* PRICE declaration and an optional
 * single LIMIT declaration. Requires source line order because PRICE initially
 * sets a default limit and LIMIT lvN scales the limit existing at that point.
 *
 * This is NOT an implementation of arbitrary GetNumber()/Perl eval, multiple
 * PRICE/LIMIT declarations, symbolic constants, zero-priced items or macros.
 * Caller must pass reviewed source line positions and a positive integer price.
 */
export function compileOrderedItemLimit({ price, priceLine, limitRaw = null, limitLine = null }) {
  if (!Number.isSafeInteger(price) || price <= 0) {
    throw new RangeError('Positive compiled item price required');
  }
  if (!Number.isSafeInteger(priceLine) || priceLine < 1) {
    throw new RangeError('Positive PRICE source line required');
  }
  if (limitRaw !== null && (!Number.isSafeInteger(limitLine) || limitLine < 1)) {
    throw new RangeError('Positive LIMIT source line required');
  }
  if (limitRaw === null && limitLine !== null) {
    throw new Error('LIMIT line provided without LIMIT source text');
  }

  // PRICE default, frozen Core lines 339-347:
  // int(1000000/price); clamp 1..2000; round to nearest ten if >100.
  let defaultLimit = Math.trunc(1000000 / price);
  defaultLimit = Math.max(1, Math.min(2000, defaultLimit));
  if (defaultLimit > 100) {
    defaultLimit = Math.trunc(defaultLimit / 10 + 0.5) * 10;
  }
  if (limitRaw === null) {
    return Object.freeze({
      limit: defaultLimit, wslimit: defaultLimit, raw: null,
      mode: 'core-price-default-subset',
    });
  }

  if (typeof limitRaw !== 'string') {
    throw new TypeError('Item LIMIT must be source text or null');
  }
  const levelMatch = /^lv([0-9]+(?:\.[0-9]+)?)(?:\/([0-9]+))?$/i.exec(limitRaw);
  if (!levelMatch) {
    // Legacy literal-only helper is unchanged, including rejecting zero limits.
    return compileLiteralItemLimit(limitRaw);
  }
  const level = Number(levelMatch[1]);
  const override = levelMatch[2] === undefined ? null : Number(levelMatch[2]);
  if (!Number.isFinite(level) || level < 0 ||
      (override !== null && !Number.isSafeInteger(override))) {
    throw new RangeError('Invalid or unsafe level LIMIT');
  }

  // If LIMIT lvN precedes PRICE, Perl ClearBuffer starts with undef limit.
  // The lv multiplication yields zero; PRICE subsequently sees !limit and
  // installs its default. Do not apply lvN in the wrong order.
  if (limitLine < priceLine) {
    return Object.freeze({
      limit: defaultLimit, wslimit: defaultLimit, raw: limitRaw,
      mode: 'core-price-after-level-fallback-subset',
    });
  }

  const limit = Math.trunc(defaultLimit * level / 5);
  const wslimit = override === null ? limit : override;
  if (!Number.isSafeInteger(limit) || limit < 0 ||
      !Number.isSafeInteger(wslimit) || wslimit < 0) {
    throw new RangeError('Unsafe level-derived LIMIT');
  }
  return Object.freeze({
    limit, wslimit, raw: limitRaw, mode: 'core-level-limit-subset',
  });
}
