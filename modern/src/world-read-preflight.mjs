/**
 * B-16: a deliberately NARROW, read-only preflight of the frozen Core
 * inc-func.cgi::DataRead world-file envelope.
 *
 * Frozen Core: katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365
 * lines 233-299: unchecked open/read, "no data" for empty reads, LF split,
 * mandatory searching for exact "//" with NO EOF bound, raw CSV splitting,
 * event require() and dynamic AutoVar/shop parsing.
 *
 * We do NOT execute DataRead, Perl require, AutoVar or shop callbacks.
 * A missing exact "//", CRLF delimiter, damaged metadata, malformed stock or
 * unreviewed dynamic event/town/shop sections fails CLOSED.
 *
 * Accepted subset: one synthetic no-event, no-town, no-shop world with exactly
 * five LF-delimited lines (time, metadata, stock, empty events, //); optional
 * final LF. The original Core can read much more than this. The accepted
 * subset must NOT be treated as permission to read or overwrite live game data.
 */
import { parseWorldWholesaleLine } from './world-wholesale-codec.mjs';

const ITEMS = 79;
export const MAX_ISOLATED_WORLD_BYTES = 1024 * 1024;

function fail(message) { throw new Error(message); }
function positiveInteger(raw, name, allowZero = true) {
  if (typeof raw !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(raw)) {
    fail('Invalid ' + name + ' in world header');
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || (!allowZero && value === 0)) {
    fail('Unsafe ' + name + ' in world header');
  }
  return value;
}
function finiteFileLength(number, label) {
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new RangeError(label + ' must be a nonnegative safe integer');
  }
  return number;
}

/**
 * Pure validation; text must already be supplied by an externally trusted
 * fixture. The original's unsafe, potentially endless separator scan is
 * replaced with a fixed five-line structural check.
 */
export function parseIsolatedWorldReadEnvelope(text) {
  if (typeof text !== 'string') fail('Missing world text');
  const lengthBytes = Buffer.byteLength(text, 'utf8');
  if (lengthBytes === 0) fail('Empty world text');
  if (lengthBytes > MAX_ISOLATED_WORLD_BYTES) {
    fail('World text exceeds isolated size limit');
  }
  if (/[\r\x00-\x09\x0b-\x1f\x7f]/.test(text)) {
    fail('World text has unsupported control characters or CRLF');
  }
  const withoutLastLF = text.endsWith('\n') ? text.slice(0,-1) : text;
  const lines = withoutLastLF.split('\n');
  if (lines.length < 5 || lines[4] !== '//') {
    if (lines.slice(5).includes('//')) {
      fail('Dynamic town/shop records are outside isolated world-read subset');
    }
    fail('World header missing exact // separator in reviewed position');
  }
  if (lines.length !== 5) {
    fail('Dynamic town/shop records are outside isolated world-read subset');
  }
  const timestamp = positiveInteger(lines[0], 'lasttime', false);
  const meta = lines[1].split(',');
  if (meta.length !== 5) fail('World metadata must have exactly five source fields');
  const population = positiveInteger(meta[0], 'people');
  const nextId = positiveInteger(meta[1], 'nextid');
  const blockIp = positiveInteger(meta[2], 'blockip');
  const taxRate = positiveInteger(meta[3], 'taxrate');
  if (!/^[0-9]+(?::[0-9]*)*$/.test(meta[4])) {
    fail('World state metadata is outside numeric source subset');
  }
  if (lines[3] !== '') {
    fail('Dynamic event require() is outside isolated world-read subset');
  }
  const originalStock = parseWorldWholesaleLine(lines[2], ITEMS);
  return Object.freeze({
    mode:'strict no-events/no-town/no-shops Core DataRead subset',
    lasttime:timestamp,
    metadata:Object.freeze({population,nextId,blockIp,taxRate,stateRaw:meta[4]}),
    worldStock:originalStock.stock,
    originalStockSlots:originalStock.suppliedSlots,
    bytes:lengthBytes,
    separatorLine:5,
    scope:'read-only source envelope, no Perl callbacks, no disk or live write',
  });
}

/**
 * Additional check for an external file read. A successful return with fewer
 * bytes than stat size must not be treated as a valid world. This does not
 * resolve TOCTOU/race conditions, file descriptors, hashes or durability.
 */
export function reviewIsolatedWorldRead({
  readSucceeded,sourceSizeBytes,observedBytesRead,worldText,
}) {
  if (typeof readSucceeded !== 'boolean') fail('readSucceeded must be explicit');
  finiteFileLength(sourceSizeBytes,'sourceSizeBytes');
  finiteFileLength(observedBytesRead,'observedBytesRead');
  if (!readSucceeded) fail('World input read failed');
  if (sourceSizeBytes !== observedBytesRead) fail('Incomplete world input read');
  if (typeof worldText !== 'string') fail('Missing world text');
  if (Buffer.byteLength(worldText,'utf8') !== observedBytesRead) {
    fail('World input byte count differs from supplied text');
  }
  const envelope = parseIsolatedWorldReadEnvelope(worldText);
  return Object.freeze({
    allowIsolatedInspection:true,
    envelope,
    scope:'verified observations only; no open/read lock, CGI or write authorization',
  });
}
