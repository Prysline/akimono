/**
 * B-13 decision-only projection of the pinned original
 * plug/write.cgi::DataCommitOrAbort().
 *
 * Source: katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365
 * Standard Street configuration: FILE_EXT='.cgi', COMMIT_FILE='commit'.
 *
 * Original:
 *   @tempfile = grep(/.$FILE_EXT$/, readdir(DIR));
 *   if (@tempfile) {
 *     OpenAndCheck(marker),close(OUT) if !$abort;
 *     if (!$abort || -e marker) { RenameAndCheck each temporary file }
 *     else { unlink each temporary file }
 *   }
 *   unlink(marker) if -e marker;
 *
 * This returns an immutable *PLAN* only; no file operations, locks, atomics,
 * transactions, backups or real-world data are performed or implied.
 *
 * The original interpolated Perl regex /.$FILE_EXT$/ with '.cgi' effectively
 * acts as /..cgi$/, so "strangexcgi" also matches. For safety, this subset
 * REFUSES such ambiguous inputs rather than silently selecting them.
 * A rename failure can leave some live files replaced and marker still
 * present. Recovery with abort=true plus marker present resumes committing;
 * it is NOT guaranteed all-or-nothing rollback.
 */
const CORE_SOURCE_MATCHER = /..cgi$/;
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function fail(message) { throw new Error(message); }
function eligibleFiles(stagedFilenames) {
  if (!Array.isArray(stagedFilenames)) {
    fail('stagedFilenames must be an array of temporary filenames');
  }
  const seen = new Set();
  const selected = [];
  for (const name of stagedFilenames) {
    if (typeof name !== 'string' || !SAFE_FILENAME.test(name) ||
        name.includes('..')) {
      fail('Unsafe staged filename');
    }
    if (seen.has(name)) fail('Duplicate staged filename');
    seen.add(name);
    const matchesCore = CORE_SOURCE_MATCHER.test(name);
    const hasLiteralExtension = name.endsWith('.cgi') && name.length > 4;
    if (matchesCore !== hasLiteralExtension) {
      fail('Ambiguous original Core filename selector: ' + name);
    }
    if (matchesCore) selected.push(name);
  }
  // readdir(DIR) does not guarantee order, so this is only a canonical
  // presentation of the SET of affected file basenames, NOT Core move order.
  return Object.freeze(selected.sort());
}

/**
 * Compute the original decision table using a conservative filename subset.
 *
 * Inputs represent a snapshot from an externally held lock. This function
 * does not inspect the file system, and cannot ensure it stayed unchanged.
 */
export function planWorldCommit({ abort, markerExists, stagedFilenames }) {
  if (typeof abort !== 'boolean' || typeof markerExists !== 'boolean') {
    fail('abort and markerExists must be explicit booleans');
  }
  const files = eligibleFiles(stagedFilenames);
  const hasTempFiles = files.length > 0;
  const willCreateMarker = hasTempFiles && !abort;
  const willCommit = hasTempFiles && (!abort || markerExists);
  const mode = !hasTempFiles ? 'no-staged-files' :
    willCommit ? (abort ? 'recover' : 'commit') : 'discard';
  return Object.freeze({
    mode, abort, markerExists,
    matchedFilenames: files,
    renameFilenames: Object.freeze(willCommit ? [...files] : []),
    deleteFilenames: Object.freeze(hasTempFiles && !willCommit ? [...files] : []),
    createMarker: willCreateMarker,
    removeMarkerOnSuccess: markerExists || willCreateMarker,
    partialCommitPossibleOnRenameFailure: willCommit && files.length >= 2,
    scope: 'pure Core commit/abort decision; no actual FS/lock/atomicity',
  });
}
