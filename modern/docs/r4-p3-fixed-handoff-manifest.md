# R4 → P3 共用時間與持久化：獨立驗證候選

> **2026-11-25｜現行基線同步：** 此為舊非跨期交接的歷史清冊；固定 #12 已驗收並封存，#14／#15／#17 已接續。保留下方 blob 與來源追溯，勿將其作為新的玩家基準或直接合併。 [最新基線、驗收與接續指引](current-baseline-status.md)。
>
> **下方為歷史內容，保留原始來源及當時紀錄。**


- 共同基底：`616c888ec4bfa1c45fdd242748e659298207455d`。
- 來源 R4 SHA：`085417ac929362d1099c74eaa2434244ed3148b2`；P3 唯讀對照：`087efeb9427739bf1c2217be463b44e522a77437`。
- 本分支不包含 P3 專屬配方引擎，不取代 P3 的 source registry 或 legacy career replay，不包含共同祖先之後的 R4 B50／外部磁碟子鏈。
- 這是非跨期共用功能的候選閉包，須以本分支自身 CI 驗證；36h、特殊 EVENT、完整 P3 玩家取得仍非正式授權。不得將 R4 主線 CI 當成本分支 CI。
- 以本文件所在 Git commit SHA 固定候選，不以持續變動的分支名作依賴。驗收後修正另發 SHA，不 force push。
- 本分支使用既有 pull_request workflow；Push 觸發只列 R4 原分支，不能宣稱有 Push run。CI Draft PR 的 base 指向共同祖先，禁止合併。

## 原始 R4 依賴 commits

自 `e2000adadf3b639c6ef3045eacfbaa692561236a`（僅作比較邊界，非本分支祖先）至來源 HEAD 的 14 個 commits。以下是來源追溯，不是要求 P3 cherry-pick 整條歷史。以共同祖先為父 commit，直接取下列確切 blobs；不引入 53 個前段 R4 期末 commits。

- `f6f5cad663bb3a03b62c3e0b5c8c9fd71a513fa4` — R4 P3 dependency: reuse pinned shared inventory review and apply source DataRead overlays before SortDT/PLUS
- `d3c7ccc9a0b60236aaac22e10a26016a12ebce57` — R4 P3 dependency: actual frozen pre-EVENT source differential with nine DataRead ITEM overlays
- `eb46e2866dfbafab0b2d33b2a70a4349b6c49128` — R4: prepare shared inventory EVENT effects, exact lottery draws and native hash replay policy
- `293178a9332b3ea0ca8cf0bbe0ddedcfd0c9a332` — R4: verify candidate native hash and range-aware entropy against frozen source
- `ea36cc36ffe1844ec0e8af522a6e854783c29ab9` — R4: connect shared pre-EVENT and normal EVENT phases with replayable source trace (noncommittable)
- `142155fdbf63529164010bfc25c3682e5b956a8a` — R4: compare composed normal-turn candidate with original pre-EVENT and EVENT source execution
- `ce59dba02b530273ebf923596807dd4413db80f0` — R4: opt-in reviewed normal-time GameCore command with exact source CAS replay
- `b9a58badd56902f5747da78267c0ac3e85e5a0d4` — R4: exercise legal local normal-time CAS and reject forged clock/assets/fixture commands
- `a74f58b1591d7d8ef590a7d1b337e6a339c5a042` — R4: shared bounded B43 normal-time history with exact trace replay and source anchor lineage
- `2f5b07169646bc420214090c2cad94a0de5cc33a` — R4: retain B43 two-slot storage and add optional verified shared time-history envelope
- `943b46eee6b74e66c3ea43c0ce1e4e328b15578a` — R4: opt in local HTTP reviewed time and persist exact bounded history across restarts
- `eda08964842b1e942b0d2c27bad2d8bd40a3b4de` — docs: record R4 P3 normal-time contract and immutable handoff acceptance gates
- `7d5db1f5571262d9e322b1da8e20b3e2c47c1ee1` — R4: authenticate bounded source-history continuation before local CAS
- `085417ac929362d1099c74eaa2434244ed3148b2` — R4: classify missing checkpoint dependencies as corrupt existing save slots

## 精確檔案閉包

下列 24 個程式／測試檔案與來源 R4 blob 完全一致；共同祖先其他檔案保留不動。另加入本清冊及來源契約。舊來源 DSL、Core、CI workflow 保持共同祖先的原 blob。

| Path | Git blob SHA | Base blob |
| --- | --- | --- |
| `modern/scripts/dev-local.mjs` | `016f83947214d4b49ad90778f0d4db1e32c98e26` | `903819b55e369be85e6a3227a2650dd64a544812` |
| `modern/src/game-core-contract.mjs` | `b838c194318cf538a2190d301f8c0355054b24f5` | `585e2c3dd84b48c182abdae4fd7b94dba31f94b4` |
| `modern/src/local-world-save-store.mjs` | `7afbe4ca5de07e7513ab1d2224ec35c1983c93e2` | `bdd9eb89bdb7f3cde7f014a0f5f0a9bb97f0a469` |
| `modern/src/original-b41-playable-sale.mjs` | `3e837111d444b32fd2b4f210a6f9c32a3796060b` | `5a998966c917d41d37f7a1ea75189abeab003c34` |
| `modern/src/original-instant-event-callbacks.mjs` | `20037b8142b560ae5aeab583c56b06aaf09e43b6` | `1a9e54c9166c083361f2960cc3046598d4eecbe2` |
| `modern/src/original-r4-multi-event-order-fixture.mjs` | `3dc8d138df3d871bdd183d24c5229d64545efcf4` | `e724a6c39248c55649c25862a7fa4df844eab20a` |
| `modern/src/original-r4-normal-turn-candidate.mjs` | `a731b8d075a1fc37ac784c9fc604655079b64280` | new |
| `modern/src/original-r4-perl-hash-replay.mjs` | `8546a0051dba87455343c98c0686faf63506d7bf` | new |
| `modern/src/original-r4-pre-event-item-overlay.mjs` | `72b28f19242afac3c80cc8925312c17beb148d3b` | new |
| `modern/src/original-r4-reviewed-world-time.mjs` | `0385f2c0122ffdcd65ff7c5cac4d5ed2d281c241` | new |
| `modern/src/original-r4-sorted-pre-event.mjs` | `dff59aaf214a6f7a61d9023a451244066abaa5a2` | `e4e8c4df91f79cf3280278b5a43e40447d1afb89` |
| `modern/src/original-sparse-all-plus.mjs` | `c5bce229da9f5efefdd4aa062eb0676945d9fdd7` | `f29819babf631a58720565a6785e6b7dcbe15ea6` |
| `modern/src/r3-reviewed-item-callback-stage.mjs` | `249132fefcf5bd6537c720ec6150c27afafe3b95` | `fef5f3a42b85e50b416fde4d6afe8673346ba0e1` |
| `modern/src/r4-time-command-draws.mjs` | `fae66ea68b988f6b7758ba0769c1f383e1114530` | new |
| `modern/src/reviewed-history-checkpoint-store.mjs` | `c26ff9792594129cb23f086c9f43a51708920c5c` | new |
| `modern/src/reviewed-world-time-history.mjs` | `d1e83ecdd9bf57f3fdc1ae1eed1422dfddf97b17` | new |
| `modern/src/shared-showcase-price.mjs` | `136c94508ed96dc6914f8160307fb7964334f5a3` | `2a82ebdff62f49224c4fd026f13140c3b6031404` |
| `modern/src/shared-use-item-core.mjs` | `cd1d2cc4c1d8545abfc036e18bdd8edb83da7e09` | `a6306376f0d6af0fadf3e8565a1f8edfc33521fb` |
| `modern/src/standard-street-module.mjs` | `91df1f16b2e065de5fac9d8d3e31cea5927052aa` | `6127f4fd31f6a697e7fec5c54ffe87b07f174e62` |
| `modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl` | `52cb0ef03f08b4e88e7e5a676ca6ba41a9000813` | `05f59ba5e45fe3b8aaef8577a2091c1256291037` |
| `modern/tests/original-perl/original-r4-p3-pre-event-overlay-probe.pl` | `5097d0fa879f770f47281602c74aecf0d5ea18fe` | new |
| `modern/tests/r4-p3-pre-event-overlay.test.mjs` | `045b609c54fd03074dbc7af1d8367ae3ad79728c` | new |
| `modern/tests/r4-perl-hash-replay.test.mjs` | `aa4ec4740619345a910e59ea5e1ba78a80890965` | new |
| `modern/tests/r4-reviewed-time-http-history.test.mjs` | `89c82b379c17e477f40e69bafaebaff4ee4fc839` | new |

## P3 整合介面及不可跨越界線

- `attachR4ReviewedTimeController({street,sources,reviewedDataRead})` 使用呼叫方真正已審閱的 StreetModule；來源 key 必須與 R4 adapter 一致。既有 R4 factory opt-in `enableReviewedNormalTime:true`。
- Core `{kind:"advance-reviewed-world-time",expectedRevision,minutes}`；1..60 整數。HTTP `POST /api/advance-reviewed-time` 僅接收 expectedRevision、minutes，禁止 fixture RNG、legacy time、PLUS-only supply。
- `beginReviewedWorldHistory`、`appendReviewedWorldHistory`、`verifyReviewedWorldHistory` 注入 P3 自己的 ordinary schema／source draws verifier／createInitialWorld，不能複製 R4 較窄的 USE registry 取代 P3。先 preview，再 append（continuation 帶 checkpointStore、generation 與 policy）、saveStore.preflight、最後 exact CAS，成功才換 proof。
- `createLocalWorldSaveStore({directory,marketBuyRegistry,useItem,historyReplay:{requireProof:true,checkpointStore,verify}})`。P3 原本的 careerReplay 路徑須保留為舊模式，不可直接覆蓋 P3 dev-local.mjs 或 local-world-save-store.mjs。新模式拒絕未有相容來源 proof 的世界。
- `createReviewedHistoryCheckpointStore({directory,sourceFingerprint,interpreter})`；runtime fingerprint 由實際 runtime 及凍結來源建立。舊 runtime 的 signed checkpoint 不能假設可跨版本或跨分支移植。保存 key、prefix 檔及兩個 world slot；不得把 key 納入 Git 或 HTTP。
- 共用庫存形狀、EXP 上限、職業、單店單 shelf 與 P3 製成品 source-sale projection 已有 R4 差分。P3 本身的 registry、製成品 showcase、RNG 策略及舊存檔升級仍需在 P3 整合驗收。不能把形狀 fixture 當成合法取得。
- P3 現有測試用 PLUS-only 與 fixture RNG；不能當真正時間驗收。既有時間起點 1000000，期界 1026000，僅 26000s；四次 #37 前置修行 + #37/2 每次 21600s，單修行共 108000s，初始預算 43200s，至少需要再 64800s，尚未計材料與製作。跨 36h 必須繼續 fail-closed；本分支不提供假結算。
- Node 22、可執行 native Perl（實際 version/arch fingerprint）、同一凍結 Core/DSL 與本地持久化檔案系統必要。Perl 固定 hash policy 與 server draw policy 不宣稱歷史 CGI PRNG 等價。

## CI

獨立 CI 必須取得本分支確切 HEAD 的真實 logs：完整 Node 測試、DSL audit、SHA-pinned Core checks、全部原版 Perl 及 B43 HTTP checkpoint regression。以下 R4 原分支證據僅作來源追溯：`085417ac929362d1099c74eaa2434244ed3148b2` push 45412334326、PR 45412344954，1180 JS／2489 Perl。不可替代獨立驗證。
