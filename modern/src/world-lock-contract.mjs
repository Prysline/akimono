/**
 * B-14 source-audited, IO-FREE projections of original Core plug/lock.cgi.
 *
 * Source: katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365,
 * plug/lock.cgi (Git blob 84382170f1b7f70348c4e2a91bf30b1d1043b964).
 * Acquiring a first lock calls DataCommitOrAbort(1) after LockSub, including
 * recovery of staged files when a commit marker is already present.
 *
 * This module NEVER acquires/relinquishes a real OS lock, opens a file, renames,
 * deletes, waits, runs the Perl recovery callback or claims multi-process
 * exclusivity. Caller-supplied rename/open results are OBSERVATIONS in fixtures,
 * not real operation requests.
 */

export const CORE_LOCK_RETRY = Object.freeze({
  acquireRenameAttempts: 5,
  checkedRenameAttempts: 5,
  checkedOpenAttempts: 6,
  waitAfterFailedRenameMs: 200,
  waitAfterFailedOpenMs: 200,
  waitAfterStaleReclaimMs: 100,
});

function fail(message) { throw new Error(message); }
function safeInteger(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RangeError(label + ' must be a safe integer >= ' + min);
  }
  return value;
}

/**
 * Review possible stale locks. Original LockSub scans /^$LOCK_FILE(\d+)/
 * after 5 base-renames fail, then checks NOW_TIME - timestamp >= timeout.
 *
 * The source's broad match also accepts malformed suffixes. This model
 * FAILS CLOSED on such names; only precise original-shaped owner basenames
 * (lockfile + digits + _pid + _remoteaddr) can be proposed for review.
 * Ordering is canonical, NOT the order returned by readdir or renamed by Core.
 */
export function reviewStaleWorldLocks({
  entries, nowSeconds, autoUnlockSeconds, lockFile = 'lockfile',
}) {
  safeInteger(nowSeconds, 'nowSeconds');
  safeInteger(autoUnlockSeconds, 'autoUnlockSeconds', 1);
  if (lockFile !== 'lockfile') fail('Unexpected lock basename: source review required');
  if (!Array.isArray(entries)) fail('entries must be an array of lock basenames');
  const seen = new Set();
  const reviewed = [];
  for (const name of entries) {
    if (typeof name !== 'string' || !/^[A-Za-z0-9_.:%-]{1,128}$/.test(name) ||
        name.includes('..')) fail('Unsafe lock basename');
    if (seen.has(name)) fail('Duplicate lock basename');
    seen.add(name);
    if (name === lockFile || !/^lockfile\d/.test(name)) continue;
    const owner = /^lockfile([0-9]+)_([1-9][0-9]*)_([A-Za-z0-9][A-Za-z0-9.:%-]*)$/.exec(name);
    if (!owner) fail('Ambiguous original stale lock filename: ' + name);
    const timestampSeconds = Number(owner[1]);
    if (!Number.isSafeInteger(timestampSeconds)) {
      throw new RangeError('Unsafe stale lock timestamp');
    }
    const ageSeconds = nowSeconds - timestampSeconds;
    // The original ignores future and not-yet-stale locks.
    if (ageSeconds < autoUnlockSeconds) continue;
    reviewed.push(Object.freeze({
      name, timestampSeconds, ageSeconds,
      processId: Number(owner[2]),
    }));
  }
  return Object.freeze(reviewed.sort((a,b)=>a.name.localeCompare(b.name)));
}

/**
 * Pure state projection after the caller OBSERVES an OS rename outcome.
 * "release-failed" follows the original's problematic behavior: it decrements
 * nesting to zero, logs error, yet retains the owned lock path. Never treat
 * that output as unlocked or safe to start a new write.
 */
export function projectWorldLockTransition({
  operation, heldDepth, observedRename,
}) {
  safeInteger(heldDepth, 'heldDepth');
  if (operation !== 'acquire' && operation !== 'release') {
    fail('operation must be acquire or release');
  }
  const record = (mode, depth, lockPathRetained, recover, safeForNewWrite, error) =>
    Object.freeze({
      mode, nextHeldDepth: depth,
      lockPathRetained, invokeDataCommitOrAbort1: recover,
      safeForNewWrite, error,
      scope: 'pure original Core lock transition; no OS operation',
    });
  if (operation === 'acquire' && heldDepth > 0) {
    if (observedRename !== undefined) fail('Nested acquisition does not rename');
    return record('nested-acquire', heldDepth + 1, true, false, true, null);
  }
  if (operation === 'release' && heldDepth === 0) {
    if (observedRename !== undefined) fail('Unlocked release does not rename');
    return record('no-op', 0, false, false, false, null);
  }
  if (operation === 'release' && heldDepth > 1) {
    if (observedRename !== undefined) fail('Nested release does not rename');
    return record('nested-release', heldDepth - 1, true, false, true, null);
  }
  if (typeof observedRename !== 'boolean') {
    fail('Explicit observedRename boolean required for outermost lock transition');
  }
  if (operation === 'acquire') {
    return observedRename
      ? record('acquired', 1, true, true, false, null)
      : record('busy', 0, false, false, false, 'busy');
  }
  return observedRename
    ? record('released', 0, false, false, false, null)
    : record('release-failed', 0, true, false, false, 'unlock error');
}

/**
 * Core RenameAndCheck tries rename up to five times; after a successful
 * rename it verifies source is absent and destination exists. A failed
 * verification loops again WITHOUT a sleep; a failed rename sleeps 0.2s.
 */
export function projectCheckedRenameAttempts(probes) {
  if (!Array.isArray(probes) || probes.length < 1 || probes.length > 5) {
    fail('Rename probes must be 1..5 observations');
  }
  let waits = 0;
  for (let index = 0; index < probes.length; index++) {
    const step = probes[index];
    if (!step || typeof step.renamed !== 'boolean') {
      fail('Rename probe requires renamed boolean');
    }
    if (step.renamed &&
        (typeof step.sourceExists !== 'boolean' ||
         typeof step.destinationExists !== 'boolean')) {
      fail('Successful rename needs source/destination observations');
    }
    if (!step.renamed) waits++;
    if (step.renamed && !step.sourceExists && step.destinationExists) {
      if (index !== probes.length - 1) fail('Extra probes after rename success');
      return Object.freeze({mode:'success', attempts:index+1, waits, reportError:false});
    }
  }
  if (probes.length !== 5) fail('Exhausted retry sequence must include all five probes');
  return Object.freeze({mode:'error', attempts:5, waits, reportError:true});
}

/**
 * OpenAndCheck uses count=5 with post-decrement in an error condition.
 * This yields up to SIX failed opens before OutError, and sleeps on the first
 * five failures only. It opens in >:encoding(UTF-8) mode on success.
 */
export function projectCheckedOpenAttempts(results) {
  if (!Array.isArray(results) || results.length < 1 || results.length > 6 ||
      results.some(v=>typeof v !== 'boolean')) {
    fail('Open results must be 1..6 booleans');
  }
  const firstSuccess=results.indexOf(true);
  if (firstSuccess >= 0) {
    if (firstSuccess !== results.length-1) fail('Extra probes after open success');
    return Object.freeze({
      mode:'success', attempts:firstSuccess+1,
      waits:firstSuccess, reportError:false, truncatesFile:true,
    });
  }
  if (results.length !== 6) fail('Exhausted open sequence must contain six failures');
  return Object.freeze({
    mode:'error', attempts:6, waits:5,
    reportError:true, truncatesFile:false,
  });
}
