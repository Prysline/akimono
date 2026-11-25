# P3 cross-period integration intake / pre-crossing baseline

> **2026-11-25｜現行基線同步：** The intake candidate subsequently passed A–E at fixed P3 SHA b60c2078a2c63db71490980f0b113b3907d6d483 and was promoted by PR #17. Original candidate/pending-CI statements below are historical. See the current baseline and linked 86-path exit manifest. [最新基線、驗收與接續指引](current-baseline-status.md)。
>
> **下方為歷史內容，保留原始來源及當時紀錄。**


Status: **integration candidate, not P3 exit**. R4 formally approved the exact fixed dependency SHA during the intake. This branch now incorporates the fixed dependency closure, reconciled shared files, and a v2-only opt-in crossing candidate; CI remains the verification gate.

- P3 parent: `1126acc5bb2e89a45a917fcc6e4e1b81bdcb555d` (PR #13, PR CI 45472802522; 1267 JS / 2286 Perl).
- P3 original PR #11: `087efeb9427739bf1c2217be463b44e522a77437`, R2 base `8c6911b4e6a20e60950f83518b56f34a0720ddf1`.
- R4 read-only accepted source: `d2dccdacb83925b6f0121bd7311f92be2e18d2da` (Push 45474510079 and PR 45474525418; 1187 JS / 2489 Perl).
- Old nonsettling handoff: `dffe18a60edc9f3ff9826342fcae4f9e7bc7959a`; do not mistake for crossing.
- P3-prepared candidate PR #14: `eeb96e45d9fe1a1ab5b206872d0ad90f3e807c8b`, independent PR CI 45476330181 success, actual log 1179 JS / 2452 Perl (85 files), source verification success; true R4 crossing HTTP test passed. R4 formal publication: https://github.com/Prysline/akimono/pull/14#issuecomment-7143234504 (same SHA; green independent CI; no merge).
- The new integration branch is descended from PR #13 rather than PR #11 directly, preserving the already verified single v2 player and normal-time handoff. No merge or edits to #1/#11/#12/#13/#14, main or migration. All tracked changes under modern/.

## Exact blob comparison (read-only)
Full blob IDs, dash = absent. The historical document's reviewed-career-save-replay.mjs is absent at all four refs; current reviewed-world-time-history.mjs is the actual replay entry.

| Path | P3 | R4 | Old handoff | Candidate |
|---|---|---|---|---|
| modern/src/standard-street-module.mjs | 20b6ed5956a4603e20423a5a63404a7a53041703 | c270057c01216d64e2eead5da2da4d6a3e2d99d7 | 91df1f16b2e065de5fac9d8d3e31cea5927052aa | c270057c01216d64e2eead5da2da4d6a3e2d99d7 |
| modern/src/shared-use-item-core.mjs | 1f5112509d310b73bb69cf2497436232b55d4e6f | cd1d2cc4c1d8545abfc036e18bdd8edb83da7e09 | cd1d2cc4c1d8545abfc036e18bdd8edb83da7e09 | cd1d2cc4c1d8545abfc036e18bdd8edb83da7e09 |
| modern/src/original-b41-playable-sale.mjs | f9796a2549883cbe0ac894ffe1c764358dbe616e | df94942a5dcef116d65b380e7ed7a29a521ddcd1 | 3e837111d444b32fd2b4f210a6f9c32a3796060b | df94942a5dcef116d65b380e7ed7a29a521ddcd1 |
| modern/src/shared-showcase-price.mjs | f5fafa43ddaa01f4430e18e6e5a81c7d99506c62 | 136c94508ed96dc6914f8160307fb7964334f5a3 | 136c94508ed96dc6914f8160307fb7964334f5a3 | 136c94508ed96dc6914f8160307fb7964334f5a3 |
| modern/src/r3-reviewed-item-callback-stage.mjs | 249132fefcf5bd6537c720ec6150c27afafe3b95 | 249132fefcf5bd6537c720ec6150c27afafe3b95 | 249132fefcf5bd6537c720ec6150c27afafe3b95 | 249132fefcf5bd6537c720ec6150c27afafe3b95 |
| modern/src/game-core-contract.mjs | b838c194318cf538a2190d301f8c0355054b24f5 | b5ff31b7caa086e811ab7e4204aca8a5b23a8975 | b838c194318cf538a2190d301f8c0355054b24f5 | b5ff31b7caa086e811ab7e4204aca8a5b23a8975 |
| modern/src/local-world-save-store.mjs | 9f7cd599b39ba2d9328218e8a03a11fd758056d6 | bad3fd7bece902fc3d24270f95db62fa21728a7f | 7afbe4ca5de07e7513ab1d2224ec35c1983c93e2 | bad3fd7bece902fc3d24270f95db62fa21728a7f |
| modern/src/reviewed-career-save-replay.mjs | — | — | — | — |
| modern/src/reviewed-world-time-history.mjs | f87bc046e4531359d3232ee5abc4a79307a20884 | 2e2bf76436de0f39e65a30cbeb36cfbd724f8607 | d1e83ecdd9bf57f3fdc1ae1eed1422dfddf97b17 | 2e2bf76436de0f39e65a30cbeb36cfbd724f8607 |
| modern/src/reviewed-history-checkpoint-store.mjs | c26ff9792594129cb23f086c9f43a51708920c5c | d9581fbb64c0e1abd63b95658317a7226e180e5d | c26ff9792594129cb23f086c9f43a51708920c5c | d9581fbb64c0e1abd63b95658317a7226e180e5d |
| modern/src/original-r4-reviewed-world-time.mjs | 6b27f78e3ca10a1279c10db0f2fccc9fcd7e6011 | f60f9feebd7ce59dae08fdcee34a3714d8b3ecbe | 0385f2c0122ffdcd65ff7c5cac4d5ed2d281c241 | f60f9feebd7ce59dae08fdcee34a3714d8b3ecbe |
| modern/src/original-r4-cross-period-candidate.mjs | — | cba1d77c0da6fad713842c898e242ad4f7b200b3 | — | cba1d77c0da6fad713842c898e242ad4f7b200b3 |
| modern/src/original-r4-independent-world-disk.mjs | — | 6968d00638c76e96ab86f9a14ad20c9e867d902c | — | 6968d00638c76e96ab86f9a14ad20c9e867d902c |
| modern/src/r4-independent-period-disk-store.mjs | — | 81f79e8cccc5e395ff9b295d7d55f1118fb50db9 | — | 81f79e8cccc5e395ff9b295d7d55f1118fb50db9 |
| modern/scripts/dev-local.mjs | 1533f9ea9176fa91196e381a11d277653b165a3a | f4d61fdbe87b4789b787cd5b7120270401147cb7 | 016f83947214d4b49ad90778f0d4db1e32c98e26 | f4d61fdbe87b4789b787cd5b7120270401147cb7 |

Candidate delta vs old handoff: 80 added/changed paths; overlapping P3/candidate paths with divergent blobs: 10.
- modern/local-ui/app.js
- modern/local-ui/index.html
- modern/scripts/dev-local.mjs
- modern/src/local-world-save-store.mjs
- modern/src/original-b41-playable-sale.mjs
- modern/src/original-r4-reviewed-world-time.mjs
- modern/src/reviewed-world-time-history.mjs
- modern/src/standard-street-module.mjs
- modern/tests/r4-p3-pre-event-overlay.test.mjs
- modern/tests/r4-reviewed-time-http-history.test.mjs

## Integration boundaries from source inspection

- Retain P3 shared-use-item-core and shared-showcase-price: R4 blobs are identical to old handoff, not P3. P3 handles reviewed USE/career/skill and 1–8 shelf price rules. Item callback-stage is identical across both. The R4 new GameCore finalizeReviewedTransition hook must preserve CAS preflight and exact revision.
- original-r4-reviewed-world-time: P3 ordinaryKinds includes discard-item and does not permit sparse fixture commands. P3 ordinary validation covers full inventory, 1–8 shelves and career/EXP. R4 validates single-shelf P3 inventory even for ordinary commands; it includes reviewed-sparse-all-plus in the advertised ordinary kinds but explicitly rejects it in independent cross-period transition. Preserve P3 ordinary validators and reject fixture entry; keep reviewed time's narrower gate unless separately proven.
- R4 independent source disk controller projects source state, requires approved provenance, authorizes checkpoints via retained proof and attaches disk finalize to ordinary/normal/crossing transitions. Do not copy whole controller. R4 original-r4-period-play-file serializePeriodPlay requires showcasecount===1 and fixed one-element showcase/price arrays even in crossPeriod; P3 supports 1–8 ordinary shelves. Do not silently truncate shelves, broaden crossing gate, or remove original codec validation. Need source-backed codec/transition extension or explicit safe unsupported transition policy preserving existing noncrossing behavior.
- R4 independent disk projection and disk store both enforce 100000-byte source disk bounds. Measure actual long player history and preserve proof; do not discard files/evidence merely to pass >256 commands. R4 in-memory provenance cache bounded to 4096 identities; use authenticated checkpoint authorization, not arbitrary world state.
- P3 local-world-save-store v2 and history require fresh or authenticated checkpoint anchor, not legacy. R4 adds disk verify/stage and crossing trace + runtime policy; merge those into the one P3 v2 authority without admitting v1, reusing old signatures or overwriting legacy files. Keep real HMAC key, lineage, original SHA, generation, server-only draws and fingerprints.
- dev-local / UI: retain sole player v2 path, ordinary legal acquisition and user-visible safety boundaries; no supply fixture or debug RNG, no second competing clock, no implicit migration.
- R4 independent original time/period flow: full pre-EVENT natural sale + FUNCTURN/FUNCSALE + SortDT, exact period slice, period chain, population-dependent PLUS, EVENT, residual slice and immutable file generations. Original R4 acceptance is for independent single shop, not mixed P3 inventory or long checkpoint histories. External guild/dragon/army/territory/close/multi remain fail-closed.

## Independent test prepared on the P3 baseline

`tests/p3-v2-two-checkpoint-rotations.test.mjs`: genuine HTTP initial shop, gift maps, actual mining and market, source skill, iron sword crafting/EXP, 260 separate lawful one-unit iron discards (no time or resource injection). Two new checkpoint rotations, exact two v2 restart snapshots, preserved earned skill/product/EXP and period, negative checksum-correct forged latest product with older-slot fallback. This is a deliberate bounded history stress test, **not** natural long-term commerce or positive crossing evidence. CI outcome must be verified on the actual commit. Existing 128-command test continues to cover missing/modified key, prefix, and checkpoint authentication.

## Gate to next stage

R4 has formally published the fixed manifest; the selected closure is integrated. Retain exact head CI gates and reconcile any actual regressions without weakening source restrictions. Positive tests still required: #66/3 with all three skills and EXP >=500, actual source time and cross-period sale; two real settlements and restart/second generation; positive lostbook persistence from server RNG, source-file tamper and failure rollback, authenticated multi-checkpoint history across settlements, P1/P2 and all 20 recipe regression. No claim that these passed here. No merges.

## First integration candidate

R4 fixed manifest selected, not merged. All 10 overlapping paths reconciled; P3 shared-use and pricing remain unchanged. Ordinary multishelf source wire uses explicitly reviewed DataWrite join/DataRead split of both arrays, 1–8 ordinary shelves only; time still validates single shelf. Crossing is opt-in `AKIMONO_REVIEWED_CROSS_PERIOD=1` on the same P3 v2 authority and requires fresh save directory; existing normal-only runtime remains, not v1. Retain original disk file and history limits. The new source and HTTP tests are candidates until same SHA CI passes. Existing legacy files must not be silently migrated; no full P3 closeout claim.

## Follow-up hardening

The old status path fully replayed each saved command segment on every HTTP response. Exact already-verified envelope bytes may now reuse replay solely for display/status; HMAC, all retained prefixes and materialized source file bytes/mtime are still rechecked, and actual load/save/reset retain full replay. Multi-rotation history now checks every older retained segment and original fresh anchor, not only the newest HMAC and immediate prefix. Tests damage the oldest retained prefix while current slot bytes are untouched. Added source-derived boundary receipt and actual HTTP ledger assertions (EXP decay, rank, prize, sale/payment/tax history, maintenance, city tax, source generation) plus #70 natural sale and conditional FUNCTURN evidence. No limit increased, no archived evidence discarded, no new acquisition or clock authority. Actual CI results pending.
