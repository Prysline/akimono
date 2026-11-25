# R4 → P3 cross-period handoff candidate (2026-11-25)

> **2026-11-25｜現行基線同步：** The candidate was formally accepted at eeb96e45d9fe1a1ab5b206872d0ad90f3e807c8b, independent PR CI 45476330181, and its selected closure was integrated into P3 and promoted by #17. This copy records the original candidate manifest; the immutable handoff ref remains untouched. Do not consume it as a newer player architecture. [最新基線、驗收與接續指引](current-baseline-status.md)。
>
> **下方為歷史內容，保留原始來源及當時紀錄。**


**Status: unverified candidate, CI-only; do not merge or consume as an accepted dependency.**

- Parent (previous fixed handoff): `dffe18a60edc9f3ff9826342fcae4f9e7bc7959a`.
- Source: independently accepted R4 `d2dccdacb83925b6f0121bd7311f92be2e18d2da`; source Push CI 45474510079 and PR CI 45474525418, 1187 JS / 2489 Perl. Those runs do not establish this candidate's result.
- Exact source blobs selected for the standalone cross-period controller, persistence, source oracle and directly supporting file/codec/rollback tests. Static import and named source/probe references examined; completeness is subject to independent CI. No changes outside modern/. Existing old handoff manifest retained.
- Not a merge of R4; excluded army-only implementation, rebel-army/external-joint tests and unrelated progress/exit documents. B50 standalone file tests included because the cross-period oracle imports its commit/recovery implementation and supporting codecs. This is a candidate closure, not a claim of mathematical minimality.
- R4 standalone entrypoint retains its own opt-in architecture. P3 must reconcile the ten overlapping files and preserve its single v2 player path, registry, EXP and jobs; do not replace P3 entrypoint/save store with R4 versions.
- This candidate does not establish P3 #66/3, lostbook persistence, P3 regression or exit. No merge to R2.

## Selected source blobs

| Path | Previous blob | R4 source blob |
|---|---|---|
| `modern/docs/r4-b50-period-disk-contract.md` | new | `235c0771b08471941dd8fea760060e9bc2f77a30` |
| `modern/local-ui/app.js` | 9b44f196feb70a2c7c62eb19b73c093efca6d969 | `01eb3327d9d2ac5de44ce3896c48a01fd0ef2235` |
| `modern/local-ui/index.html` | 9b20759621c5fab482b1876c76a57af4c4f1af32 | `b9c58707667f44d1e1ab096124f1876e26476ed0` |
| `modern/scripts/dev-local.mjs` | 016f83947214d4b49ad90778f0d4db1e32c98e26 | `f4d61fdbe87b4789b787cd5b7120270401147cb7` |
| `modern/src/game-core-contract.mjs` | b838c194318cf538a2190d301f8c0355054b24f5 | `b5ff31b7caa086e811ab7e4204aca8a5b23a8975` |
| `modern/src/local-world-save-store.mjs` | 7afbe4ca5de07e7513ab1d2224ec35c1983c93e2 | `bad3fd7bece902fc3d24270f95db62fa21728a7f` |
| `modern/src/original-b41-playable-sale.mjs` | 3e837111d444b32fd2b4f210a6f9c32a3796060b | `df94942a5dcef116d65b380e7ed7a29a521ddcd1` |
| `modern/src/original-b60-happy-event-nowfunc.mjs` | 045c6b6f1854b32bb295d8c82452d9270b25add0 | `4e4a73f171359c7f254105cea50af2c8bea6cb75` |
| `modern/src/original-b61-sword-demand-event.mjs` | cc62661eb9690f6493f6d614e84f0ed4a08bd9c8 | `953ed50777cc8aaefc36bafd3b5cd2488b1ef487` |
| `modern/src/original-period-solo-chain.mjs` | a3241af8d5285e41c48e87579385d9d85aea576a | `0c83f75a8a4090c0fa8318ab1f5f2f37c846c37d` |
| `modern/src/original-period-territory.mjs` | 3c416afe2c0a841158b07ab361abd08cfa5ef3ab | `528291611e001e8cc79d5648b9ec9b2713973c97` |
| `modern/src/original-r4-b50-period-disk.mjs` | new | `94ed86f2e3ccb2673b25009d0d19539f1c8eb999` |
| `modern/src/original-r4-backup-disk.mjs` | new | `f556966c221811df66b112a02b80c7fab7aac81a` |
| `modern/src/original-r4-close-shop-archive-file.mjs` | new | `3ad6e474644c188163284ef904f448e54016177b` |
| `modern/src/original-r4-cross-period-candidate.mjs` | new | `cba1d77c0da6fad713842c898e242ad4f7b200b3` |
| `modern/src/original-r4-cross-period-disk.mjs` | new | `f489e4c70b656d6a6e5ec7a332f2daca5dbd5898` |
| `modern/src/original-r4-data-write-files.mjs` | new | `8541d7cd933cfe2b45d50330808f2494a541ab97` |
| `modern/src/original-r4-external-files-sandbox.mjs` | new | `7e2b5c16688ced71ddc2f998b9f3636d87458f64` |
| `modern/src/original-r4-guild-files.mjs` | new | `0a3db9a0d8056986674ea5424d0e5ab72777d239` |
| `modern/src/original-r4-guild-ledger-file.mjs` | new | `218a4dacefdeed7096f200a8fed01d07d37f031c` |
| `modern/src/original-r4-independent-world-disk.mjs` | new | `6968d00638c76e96ab86f9a14ad20c9e867d902c` |
| `modern/src/original-r4-multi-event-order-fixture.mjs` | 3dc8d138df3d871bdd183d24c5229d64545efcf4 | `f8658ecd281cc5969f5b96f0ef6862a7ac8b8720` |
| `modern/src/original-r4-period-backup-tail.mjs` | new | `dea341ab09cf7d96e72d706c4678aed7944f65e9` |
| `modern/src/original-r4-period-log-disk.mjs` | new | `276dda4c393cda70f6fe40f58492cb0aece86319` |
| `modern/src/original-r4-period-play-file.mjs` | new | `4d69cfc25748df950b71b3fcdfb96ac7b793e8a2` |
| `modern/src/original-r4-perl-hash-replay.mjs` | 8546a0051dba87455343c98c0686faf63506d7bf | `9030d921341fba317927b45ec34a942d825ef09b` |
| `modern/src/original-r4-pre-event-item-overlay.mjs` | 72b28f19242afac3c80cc8925312c17beb148d3b | `3043e42b8697bb2867e1472b8bea036581578140` |
| `modern/src/original-r4-reviewed-world-time.mjs` | 0385f2c0122ffdcd65ff7c5cac4d5ed2d281c241 | `f60f9feebd7ce59dae08fdcee34a3714d8b3ecbe` |
| `modern/src/original-r4-town-files.mjs` | new | `b1b902e6e0bc94a278a92dfcd546f215ec4e19d6` |
| `modern/src/r4-independent-period-disk-store.mjs` | new | `81f79e8cccc5e395ff9b295d7d55f1118fb50db9` |
| `modern/src/r4-time-command-draws.mjs` | fae66ea68b988f6b7758ba0769c1f383e1114530 | `6a114773023849577f2ed6f3041eb2cb9508d6ad` |
| `modern/src/reviewed-history-checkpoint-store.mjs` | c26ff9792594129cb23f086c9f43a51708920c5c | `d9581fbb64c0e1abd63b95658317a7226e180e5d` |
| `modern/src/reviewed-world-time-history.mjs` | d1e83ecdd9bf57f3fdc1ae1eed1422dfddf97b17 | `2e2bf76436de0f39e65a30cbeb36cfbd724f8607` |
| `modern/src/standard-street-module.mjs` | 91df1f16b2e065de5fac9d8d3e31cea5927052aa | `c270057c01216d64e2eead5da2da4d6a3e2d99d7` |
| `modern/tests/original-perl/OriginalR4CrossPeriodDiskHarness.pm` | new | `f87890944dacfe26aef3e7321993600c2fdbb620` |
| `modern/tests/original-perl/OriginalR4PreEventHarness.pm` | new | `8dac0fb2bf9869fd82e58d2d74e883652d9a9686` |
| `modern/tests/original-perl/original-r4-b50-guild-ledger-probe.pl` | new | `c5353d075368a13add3473ea0dbfd7e60a4d3526` |
| `modern/tests/original-perl/original-r4-b50-guild-ledger.t` | new | `0f9452a3c3cd0fdf84bb9e622dcf0f6682997aa0` |
| `modern/tests/original-perl/original-r4-b50-period-disk-probe.pl` | new | `c3a46207080afdb36a77404fd53f1a9a01a83364` |
| `modern/tests/original-perl/original-r4-b50-period-disk.t` | new | `a464de4166f2345849d24098e6eef71505dedb95` |
| `modern/tests/original-perl/original-r4-backup-rotation-failure-probe.pl` | new | `b6d4edd33a302fe2b9990d3e42da8ff59c9f55f7` |
| `modern/tests/original-perl/original-r4-close-shop-archive-file-probe.pl` | new | `6310534c78aed2ed774edc621e15129fbda5c296` |
| `modern/tests/original-perl/original-r4-close-shop-archive-file.t` | new | `f49436f2cfb2f5f75fd5757c7064c1528f737d0b` |
| `modern/tests/original-perl/original-r4-data-files-backup-probe.pl` | new | `521f4825ec9b875d72a2f7e415b4d3162730f4a5` |
| `modern/tests/original-perl/original-r4-data-files-backup.t` | new | `1f07d11c5a55b36846179a4ce211b6c9d6003c90` |
| `modern/tests/original-perl/original-r4-data-write-files-probe.pl` | new | `093652b30dd6c6613498f7b43f37ef1fb2c04f36` |
| `modern/tests/original-perl/original-r4-data-write-files.t` | new | `18ef7b6e53770b65212e697057b2bdc39137b68f` |
| `modern/tests/original-perl/original-r4-guild-file-edge-probe.pl` | new | `1a8190b45600ebf4729127b8066ab76c18b4f372` |
| `modern/tests/original-perl/original-r4-guild-file-edge.t` | new | `f2a3496bd7037698f1a6f875c760fa0020b1ac4b` |
| `modern/tests/original-perl/original-r4-guild-files-probe.pl` | new | `9830328ca2ab1b645f4eee2d30cc14ba34ce868f` |
| `modern/tests/original-perl/original-r4-guild-files.t` | new | `10f2958a01ea1f97dc047917555e482a7a26c059` |
| `modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl` | 52cb0ef03f08b4e88e7e5a676ca6ba41a9000813 | `8dce648a46c402330db8bfe79b1afa40312a340c` |
| `modern/tests/original-perl/original-r4-p3-pre-event-overlay-probe.pl` | 5097d0fa879f770f47281602c74aecf0d5ea18fe | `e21213fa1b453bf542c294b44f46f51ef59a2e3d` |
| `modern/tests/original-perl/original-r4-period-backup-tail-probe.pl` | new | `5247dc34ff07db135455558c0502d57ee2944b6c` |
| `modern/tests/original-perl/original-r4-period-backup-tail.t` | new | `8c0a38c4209ef5aa4d508c1b9bafdb938ef58983` |
| `modern/tests/original-perl/original-r4-period-full-tail-close-probe.pl` | new | `cb942ca6c6b8a2441e65e326b1e1df566a8f19f2` |
| `modern/tests/original-perl/original-r4-period-full-tail-close.t` | new | `67008678e70d0046027477d92c21b21388cc54b8` |
| `modern/tests/original-perl/original-r4-town-play-probe.pl` | new | `cf0d043270c8a643d6d695c7599e652cf6ebff5c` |
| `modern/tests/original-perl/original-r4-town-play.t` | new | `d86e91d951ca4d18f1cb0bb9fdbe366b75e5588c` |
| `modern/tests/original-perl/pinned-config.cgi` | new | `010e43766c1b78c7572cbc0aded2daf03dc07a1e` |
| `modern/tests/original-perl/pinned-custom.cgi` | new | `93d7f77df648df0c46e5dca4763afd3d2c48654b` |
| `modern/tests/original-perl/pinned-error.cgi` | new | `16b619dffd91a3b67095177b7da464de264f1aa3` |
| `modern/tests/original-perl/pinned-guild.cgi` | new | `6593aa8a3ae4a1695c2418f12a3776f0053454ac` |
| `modern/tests/original-perl/pinned-guildsub.cgi` | new | `4dee1edeeedf3b482b8786111e1e5d626095f8d5` |
| `modern/tests/original-perl/pinned-log.cgi` | new | `0f9143c49d1552233f27754e3937e1cdc2740f0a` |
| `modern/tests/original-perl/pinned-sub.cgi` | new | `33c767f434d7d6f0c5e9e0c9a291472b3a0f3b25` |
| `modern/tests/original-perl/pinned-user.cgi` | new | `46fe3b13e68ee83997aa919125ab210372af2822` |
| `modern/tests/r4-p3-pre-event-overlay.test.mjs` | 045b609c54fd03074dbc7af1d8367ae3ad79728c | `a81e534e460f0c113fe87e2f52b08b4a976fa81f` |
| `modern/tests/r4-period-full-tail-close-chain.test.mjs` | new | `46a81e2349e9e52034abc058be6d48c32b886a8f` |
| `modern/tests/r4-reviewed-time-http-history.test.mjs` | 89c82b379c17e477f40e69bafaebaff4ee4fc839 | `e2f576bfc63e67f02a5dc7f6420e154c8f292743` |
| `modern/tests/r4-source-b50-archive-disk-chain.test.mjs` | new | `979996f47565aedc764caf2731b02ce90483385a` |
| `modern/tests/r4-source-b50-guild-ledger.test.mjs` | new | `262cb992337ee4db069af0d35f9ddcc8d485c316` |
| `modern/tests/r4-source-b50-period-disk.test.mjs` | new | `773567de97be906a306e8db5cd410b1119f53a81` |
| `modern/tests/r4-source-backup-disk.test.mjs` | new | `fdc7609130dbbaf7e83fd568f6545a55eade340b` |
| `modern/tests/r4-source-close-shop-archive-file.test.mjs` | new | `3b278eece56f1c50071b6286edf3d76385b15e60` |
| `modern/tests/r4-source-data-write-files.test.mjs` | new | `36b1685bc4312b8ea51ee0646de05db6e07d5894` |
| `modern/tests/r4-source-guild-files.test.mjs` | new | `92311b606d11e0104e1ea9e303a45b8bf65e2274` |
| `modern/tests/r4-source-period-backup-tail.test.mjs` | new | `dc4e749d9ecf0d39dc7225b7c481ce97d8241384` |
| `modern/tests/r4-source-town-play.test.mjs` | new | `b9a9de12fb30ed21f22dae8f496556cdb99ccba2` |

## Excluded changed paths

- `modern/README.md`
- `modern/docs/b50-source-same-state-period-chain.md`
- `modern/docs/migration-progress-and-next-milestones.md`
- `modern/docs/next-window-handoff.md`
- `modern/docs/r4-army-town-file-persistence-contract.md`
- `modern/docs/r4-exit-audit.md`
- `modern/docs/r4-external-file-effects-contract.md`
- `modern/docs/r4-guild-file-persistence-contract.md`
- `modern/docs/r4-p3-time-persistence-contract.md`
- `modern/docs/r4-r0-affected-tests-mapping.md`
- `modern/docs/r4-source-time-slices-contract.md`
- `modern/src/original-r4-army-files.mjs`
- `modern/tests/original-perl/original-r4-external-joint-probe.pl`
- `modern/tests/original-perl/original-r4-external-joint.t`
- `modern/tests/original-perl/original-r4-rebel-army-disk-probe.pl`
- `modern/tests/original-perl/original-r4-rebel-army-disk.t`
- `modern/tests/original-perl/pinned-army.cgi`
- `modern/tests/r4-source-external-joint.test.mjs`
- `modern/tests/r4-source-rebel-army-disk.test.mjs`
