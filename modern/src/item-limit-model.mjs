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
