# P3 integration: one player save path (v2)

## Scope

- Draft PR #13 only. Baseline P3 #11 `087efeb9427739bf1c2217be463b44e522a77437`; immutable R4 handoff `dffe18a60edc9f3ff9826342fcae4f9e7bc7959a`. Initial mixed-mode integration `a0839e44a844551ea02566ed38eff95c401339aa` Actions 45416765444 passed 1252 Node / 2286 Perl, including real #66/0 and >128 history. This is historical evidence, not acceptance of this v2 candidate.
- Development-only v1 saves intentionally incompatible. No migration, no silent new anchor, no automatic delete/overwrite. User may use a new save directory or confirmed reset. The original Perl files and source evidence are untouched.
- `npm run dev:local` is the sole player entrypoint. It always uses reviewed normal time and B43 authenticated history. No mode switch, no fixture RNG or PLUS-only player command. `/api/advance-reviewed-time` takes revision/minutes only. Old routes reject; cross-shop audit is not authorized. UI routes reviewed time and hides old supply for the player.
- Outer B43 format v2. A/B slots, file bounds, atomic fsync/rename, canonical WorldState and history, revision/generation conflict, prefix lineage, and HMAC checkpoint authentication retained. SHA-256 covers format, generation, world and proof. Fresh source anchors regenerated; authenticated checkpoints only; no legacy anchor path. Runtime/source fingerprint still bound.
- Ordinary source commands are checked against exact schema, reviewed registry, full source replay and exact CAS. Ordinary one-shop stock/shelf/EXP/career shape validation is separate from the narrower whole-time projection. The latter remains source-gated (single shelf; supported stock, known normal EVENT, nonsettling period). No new multi-shop authorization or external special EVENT effects.
- P1/P2 medicine and dairy stock/sales and cow job/EXP are added to the reviewed single-shelf source differential, not merely accepted by history. Existing unsupported time states continue fail-closed, including multiple shelves, special EVENT and 36h crossing. Ordinary shelf resize/discard may be replayed only if actual reviewed transaction succeeds.

## Historical regression separation

The obsolete v1 engine and its controlled source-slice HTTP runner are isolated in `modern/tests/support/legacy-*`. They are not imported by the player entrypoint, require an isolated test save directory, and do not implement an available alternate player mode. Existing historical assertions are retained (including selected RNG, partial PLUS, and bounded B41/B56 diagnostics); success of these tests is not new player acceptance. Remove the test-only implementation only after equivalent source regression coverage can be retained without it. No v1 production compatibility requirement.

## Acceptance

- Verify exact integrated HEAD + actual CI merge tree and logs before merging. Candidate CI status must be recorded from the current run, not inferred.
- New real v2 tests cover prior #66/0 dual skills, P1 advanced medicine, P2 career/dairy, and explicit rejection of v1 with no disk overwrite. They use server RNG and normal time rather than fixture supply.
- Preserve previous P1/P2/P3 features and source audits. Remaining recipe-specific v2 tests, multi-shelf full-turn review, R4 36h settlement and external transactions still require positive evidence. Do not claim P3 or R4 complete or enter P4/P5.
