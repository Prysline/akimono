/**
 * B-14 deterministic, source-reviewed Core lock/IO lifecycle demonstration.
 * No OS lock, file I/O, sleeps, renames, or original Perl execution here.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORE_LOCK_RETRY, reviewStaleWorldLocks, projectWorldLockTransition,
  projectCheckedRenameAttempts, projectCheckedOpenAttempts,
} from '../src/world-lock-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cfg=await readFile(path.join(root,'_config.cgi'),'utf8');
if (!/\$LOCK_FILE\s*=\s*'lockfile'\s*;/.test(cfg) ||
    !/\$AUTO_UNLOCK_TIME\s*=\s*60\s*;/.test(cfg)) {
  throw new Error('Standard Street lock configuration changed; review required');
}
const candidates=reviewStaleWorldLocks({
  entries:['lockfile900_122_192.0.2.25','lockfile999_124_198.51.100.2','lockfile'],
  nowSeconds:1000,autoUnlockSeconds:60,
});
const examples={
  firstAcquire: projectWorldLockTransition({
    operation:'acquire',heldDepth:0,observedRename:true,
  }),
  nestedAcquire: projectWorldLockTransition({operation:'acquire',heldDepth:1}),
  nestedRelease: projectWorldLockTransition({operation:'release',heldDepth:2}),
  releaseSucceeded: projectWorldLockTransition({
    operation:'release',heldDepth:1,observedRename:true,
  }),
  releaseFailed: projectWorldLockTransition({
    operation:'release',heldDepth:1,observedRename:false,
  }),
  checkedRenameAfterTwoFailures:projectCheckedRenameAttempts([
    {renamed:false},{renamed:false},
    {renamed:true,sourceExists:false,destinationExists:true},
  ]),
  checkedOpenAtSixthAttempt:projectCheckedOpenAttempts([
    false,false,false,false,false,true,
  ]),
};
console.log(JSON.stringify({
  mode:'pure original Core lock and checked IO projection; NO live filesystem actions',
  source:'frozen plug/lock.cgi and configured LOCK_FILE=lockfile',
  attempts:CORE_LOCK_RETRY,
  staleCandidates:candidates,
  examples,
  caution:[
    'An acquired outer lock must finish DataCommitOrAbort(1) before a new write.',
    'UnLock rename failure retains the original path despite depth reaching zero.',
    'Core stale reclaim and regex selection are not a race-free lock protocol.',
    'RenameAndCheck retries are not an atomic multi-file transaction.',
    'OpenAndCheck uses truncating >:encoding(UTF-8) mode, with no fsync guarantee.',
    'The model makes decisions from observations; it does not acquire any OS lock.',
  ],
},null,2));
