/**
 * B-13 Core commit marker semantics, decision-only demonstration.
 * No files are read, written, renamed or deleted by this script.
 * Run in modern/: npm run demo:commit
 */
import { planWorldCommit } from '../src/world-commit-plan.mjs';

const scenarios = [
  { name: 'normal commit', abort: false, markerExists: false,
    stagedFilenames: ['world.cgi', 'bags.cgi', 'notes.txt'] },
  { name: 'discard without marker', abort: true, markerExists: false,
    stagedFilenames: ['world.cgi', 'bags.cgi'] },
  { name: 'recover pending commit after crash', abort: true, markerExists: true,
    stagedFilenames: ['world.cgi', 'bags.cgi'] },
  { name: 'clear stale marker without staged files', abort: true,
    markerExists: true, stagedFilenames: [] },
];
const decisions = scenarios.map(({ name, ...input }) => ({
  name, ...planWorldCommit(input),
}));
let rejectedOriginalRegexWildcard = false;
try {
  planWorldCommit({
    abort: false, markerExists: false,
    stagedFilenames: ['strangexcgi'],
  });
} catch (error) {
  rejectedOriginalRegexWildcard =
    /Ambiguous original Core filename selector/.test(error.message);
}
if (!rejectedOriginalRegexWildcard) {
  throw new Error('Unsafe filename unexpectedly accepted');
}
console.log(JSON.stringify({
  mode: 'frozen Core marker decision projection, NO file-system operations',
  source: 'original plug/write.cgi::DataCommitOrAbort, FILE_EXT=.cgi',
  decisions,
  rejectedOriginalRegexWildcard,
  partialCommitRisk:
    'A failure during a later rename can leave earlier files committed; ' +
    'marker-based recovery resumes, not an all-or-nothing rollback.',
  restrictions: [
    'no user files, real disk IO, lock acquisition, or OS rename',
    'no guarantee of transaction atomicity or crash safety',
    'only conservative .cgi basename allowlist; source regexp is broader',
    'does not replace full Core DataCommitOrAbort in the running game',
  ],
}, null, 2));
