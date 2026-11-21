/**
 * B-12 read/write contract for ONLY the world's wholesale-inventory CSV line.
 *
 * Frozen Core source:
 * inc-func.cgi::DataRead: line 1 lasttime, line 2 metadata, line 3
 *   @DTwholestore = split(/,/, $DATA[$idx++], $MAX_ITEM)
 * plug/write.cgi::DataWrite:
 *   print OUT "$DTlasttime\n$DTpeople,...\n";
 *   print OUT join(",", @DTwholestore)."\n";
 *
 * Scope: in-memory text, exactly one line extracted/replaced. We never parse,
 * generate, or validate shops, events, town, guild data, locks, backups or the
 * original on-disk transaction. This strict safe-integer subset deliberately
 * rejects unverified numeric formats the Perl runtime might coerce.
 *
 * A short/blank legacy line is interpreted as missing stock 0 ONLY in this
 * explicit, supported numeric subset; unchanged text retains its original
 * byte-for-byte shape. Changed inventories are written canonically as 79
 * decimal integer cells; all other world-file text stays exactly unchanged.
 */

const DEFAULT_ITEMS = 79;

function error(message) { throw new Error(message); }
function validCount(count) {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new RangeError('maxItem must be a positive safe integer');
  }
  return count;
}
function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(label + ' must be a nonnegative safe integer');
  }
  return value;
}

/** Mirrors Core's 1-based item ID -> 0-based position, but never executes Perl. */
export function parseWorldWholesaleLine(csv, maxItem = DEFAULT_ITEMS) {
  validCount(maxItem);
  if (typeof csv !== 'string' || /[\r\n]/.test(csv)) {
    error('Wholesale line must be one line of text');
  }
  const rawCells = csv === '' ? [] : csv.split(',');
  if (rawCells.length > maxItem) error('Wholesale line exceeds original MAX_ITEM slots');
  const stock = Array(maxItem).fill(0);
  for (let i = 0; i < rawCells.length; i++) {
    const raw = rawCells[i];
    if (raw === '') continue; // Original Perl can write empty undefined slots.
    if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) {
      error('Unsupported wholesale stock cell at item #' + (i + 1));
    }
    const value = Number(raw);
    stock[i] = count(value, 'wholesale item #' + (i + 1));
  }
  return Object.freeze({
    stock: Object.freeze(stock),
    originalCsv: csv,
    suppliedSlots: rawCells.length,
    maxItem,
  });
}

export function serializeWorldWholesaleLine(stock, maxItem = DEFAULT_ITEMS) {
  validCount(maxItem);
  if (!Array.isArray(stock) || stock.length !== maxItem) {
    error('Whole stock must contain exactly ' + maxItem + ' item slots');
  }
  for (let i = 0; i < stock.length; i++) count(stock[i], 'wholesale item #' + (i + 1));
  return stock.join(',');
}

// Preserve original LF/CRLF line endings and trailing-newline state.
// The caller supplies a *complete*, preexisting in-memory world text fixture.
// We require a complete first-three-line prefix and refuse mixed newline
// conventions to keep text replacement unambiguous.
function splitWorldPrefix(text) {
  if (typeof text !== 'string' || text.includes('\0') || /(^|[^\r])\r(?!\n)/.test(text)) {
    error('World snapshot must be UTF-8-like text without NUL or bare CR');
  }
  const first = /^(.*?)(\r?\n)/.exec(text);
  if (!first) error('World snapshot missing first-line timestamp');
  const start2 = first[0].length;
  const second = /^(.*?)(\r?\n)/.exec(text.slice(start2));
  if (!second) error('World snapshot missing metadata line');
  const start3 = start2 + second[0].length;
  const third = /^(.*?)(\r?\n|$)/.exec(text.slice(start3));
  if (!third) error('World snapshot missing wholesale line');
  if (first[2] !== second[2]) error('Mixed newline styles before wholesale line');
  if (third[2] && third[2] !== first[2]) error('Mixed newline styles at wholesale line');
  const prefix = text.slice(0, start3);
  if (first[1] === '' || second[1] === '' || third[1] === '' && text.length === start3) {
    // Blank third line WITH newline is a possible sparse stock line, so allow it.
    error('World snapshot missing required header or wholesale line');
  }
  // The other world sections may use either events/town/shops/etc and are
  // intentionally opaque, not validated or rewritten.
  return {
    prefix,
    wholesaleCsv: third[1],
    wholesaleEol: third[2],
    tail: text.slice(start3 + third[0].length),
  };
}

/** Extract only line 3 while retaining exact raw text for later replacement. */
export function readWorldWholesaleSnapshot(text, maxItem = DEFAULT_ITEMS) {
  const pieces = splitWorldPrefix(text);
  const parsed = parseWorldWholesaleLine(pieces.wholesaleCsv, maxItem);
  return Object.freeze({
    stock: parsed.stock,
    originalCsv: parsed.originalCsv,
    suppliedSlots: parsed.suppliedSlots,
    maxItem,
  });
}

/**
 * Pure in-memory replacement: keep the world's first two lines and everything
 * after line 3 exactly unchanged; replace only line 3 if stock actually differs.
 * Preserve original sparse spelling on a no-op for a lossless identity roundtrip.
 */
export function writeWorldWholesaleSnapshot(text, nextStock, maxItem = DEFAULT_ITEMS) {
  const pieces = splitWorldPrefix(text);
  const before = parseWorldWholesaleLine(pieces.wholesaleCsv, maxItem);
  const normalized = serializeWorldWholesaleLine(nextStock, maxItem);
  if (nextStock.every((value, index) => value === before.stock[index])) return text;
  return pieces.prefix + normalized + pieces.wholesaleEol + pieces.tail;
}
