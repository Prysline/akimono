# 《商人物語》正式開發基線與現況（2026-11-26，UTC+8）

本頁為現行 GitHub 開發狀態的統一入口。較早文件中的「最新權威」、未完成條件與舊分支起手提示均以本頁為準；歷史來源與當時的證據保留。不是 Notion 任務狀態更新，也不代表全原版功能結案。

## 正式基線與驗收

- P5 PR [#21](https://github.com/Prysline/akimono/pull/21) 已正式合併 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；驗收 HEAD `fc5dcbe89b2b2890a03013d2fdcebbad0ee5e9f0`、實際 checkout `8f4d70e71151a0d1be0b0a4b5890fc47adfaf9c5`、相同 tree `9a6c0d5837042c276eda13f78394025016d332b5`。[CI 45727603147](https://github.com/Prysline/akimono/actions/runs/45727603147) success：JS 1329/1329（0 失敗、0 跳過）、Perl 2456/2456（85 .t）、DSL/source pins 通過。16 原版市場案例，至少 4821 G 打工收入參與實際支出。

- Repo：[Prysline/akimono](https://github.com/Prysline/akimono)。
- 唯一正式現代化開發基線：[migration/standard-street-s1](https://github.com/Prysline/akimono/tree/migration/standard-street-s1)。P4 PR #20 已正式合併：merge `a9654531c64a82be19c135a9b806ff9ef5fa5a73`、PR HEAD `0aeaca696e533d3616b6f3b517fa47afbf6d1ff6`、tree `7e0e4909cd2569db438bdebc16c435c70f5627ef`。[CI 45653296366](https://github.com/Prysline/akimono/actions/runs/45653296366) exact HEAD、實際 checkout `a39f5f027eccc43997e0824c1af1704c658754d3` 同 tree：JavaScript 1325/1325（0 失敗、0 跳過）、Perl 2456/2456（85 .t）、DSL 與凍結 source blob 稽核成功。 每次開工仍先讀實際最新 HEAD、程式差異及 CI。
- 固定 P3 A–E 驗收版本 `b60c2078a2c63db71490980f0b113b3907d6d483`，[完整退出審計及 86 檔 blob 清冊](https://github.com/Prysline/akimono/pull/15#issuecomment-7143842268)；[正式整合 PR #17](https://github.com/Prysline/akimono/pull/17) 已於 2026-11-25 06:24 UTC+8 合併。原 migration 是 P3 實際祖先，累積 587 路徑，584 新增、3 修改、0 檔刪除。除 modern/ 外僅歷史 .gitignore 與 CI workflow；凍結原版 Core/CGI/DSL 不變。
- [目標 PR CI #45492647525](https://github.com/Prysline/akimono/actions/runs/45492647525) completed/success：JS 1317/1317，Perl 2456/2456（85 .t），DSL/source SHA 審計全部通過。實際 checkout merge `6825bab8cee1887012ef586e5c1fcc34324fe848` 及 #17 實際 merge tree 均等於 P3 驗收 tree；不是 migration push run。
- main `7301b0c2b1e27226d1770e153fa3c68cfeae6d48` 未修改。現代化基線不等於整款正式遊戲發行。

## 現行完成範圍

| 工作 | 判定 |
|---|---|
| R2、P1 進階製藥、P2 職業轉移／乳品 | 已審閱玩家路徑納入；不等於全部原版 USE 或 R0/R1 完成 |
| R3 共用定價與自然販售 | 已審閱來源與原有多架測試納入；正式 reviewed time 仍單架 |
| P3 A–E | 已完成：20/20 配方合法 HTTP、技能／EXP／材料／職業、跨期與 v2 保存 |
| R4 已交付的獨立單店跨期 | 已驗收且納入正式基線 |
| R4 公會／龍族／軍隊／領主／外部 IO／關店等 | 未納入正式玩家能力，研究續作；未審閱邊界 fail-closed |
| P4 | 已驗收並合併 #20；[來源審閱](p4-dairy-persistence-source-review.md)，真玩家七 USE、十牛、補充、販售與 v2 雙世代／checkpoint |
| P5 | 已正式驗收並合併 #21；[來源審閱](p5-book-work-persistence-source-review.md) 為候選歷史，以本頁及 merge commit 為準 |
| R0/R1 全量、R5、其他街道、多人與整款原版 | 不宣告完成 |

R4 固定跨期交接 `eeb96e45d9fe1a1ab5b206872d0ad90f3e807c8b`，#14 [獨立 CI 45476330181](https://github.com/Prysline/akimono/actions/runs/45476330181) 1179 JS / 2452 Perl；P3 #15 [CI 45481087114](https://github.com/Prysline/akimono/actions/runs/45481087114) 1317 JS / 2456 Perl。正式 #17 run 再次實證 #66/3 EXP 515→535、535→555、跨期後 517→537 真 lostbook；#70 自然販售 3 件、positive FUNCTURN=true（#15 run 為 4 件，皆為各自合法伺服器 RNG）。兩次結算 1→2、260 合法普通操作、兩次 checkpoint 輪替、雙世代與 Node 重啟；來源亂數、歷史前綴、HMAC、商品、磁碟篡改／阻塞的負面測試通過。不是無限經營或無限容量，也不是人工操作驗收。

## 本機正式玩家入口

```sh
cd modern
npm run dev:local
```

預設 reviewed normal time，瀏覽器 http://127.0.0.1:4173。跨期須明確 opt-in 並使用新獨立存檔目錄。POSIX shell（先 cd modern）：

```sh
AKIMONO_REVIEWED_CROSS_PERIOD=1 AKIMONO_SAVE_DIR="$HOME/akimono-cross-period-v2" npm run dev:local
```

PowerShell（先 cd modern）：

```powershell
$env:AKIMONO_REVIEWED_CROSS_PERIOD = '1'
$env:AKIMONO_SAVE_DIR = "$HOME/akimono-cross-period-v2"
npm run dev:local
```

上述目錄必須為新／符合 runtime fingerprint 的獨立存檔，勿覆蓋既有檔案。唯一正式玩家格式 `akimono.local-world-save.v2`；fresh 或 HMAC 認證 checkpoint、完整 retained prefix lineage、source/runtime fingerprint、雙世代與不可變來源檔。舊 v1／不相容 v2 拒絕，不自動遷移。顯式 save；未儲存操作不保證重啟保留。單本機程序，不支援多寫者。普通 1–8 展示架，reviewed time 限單店單架及已審閱 inventory/EVENT。未知 EVENT 不當成空。HTTP `/api/advance-reviewed-time` 只接受 expectedRevision/minutes；`/api/supply` 拒絕。不得注入資產、EXP、RNG 或時鐘。

## 分支管理與未完 R4

| 分支／PR | 角色 |
|---|---|
| migration/standard-street-s1 | 唯一正式現代化起點 |
| test/task02-baseline-on-s1 (#1) | R4 原工作線與歷史來源；仍 Draft |
| research/r4-guild-dragon-boundaries-20261125 (#16) | R4 獨立研究，保留原 base 和未完工作 |
| work/r4-on-p3-baseline-20261125 (#18) | 從 #17 正式基線出發的 R4 新續作，僅來源證據入場，尚未合併 |
| integration/p3-r4-cross-period-20261125 (#15) | P3 固定歷史驗收 |
| #11、#13、#15 | P3 祖先已納入 migration；PR 封存 |
| #12、#14 | 選擇性來源交接已納入；PR 封存，不是 Git merge |
| 其他 integration/work/handoff/backup | 保留追溯，不作新正式開發起點 |

本次同步初次查詢開啟 PR 為 #1、#16；再次查詢已新增 #18 R4 正式續作與本文件同步 #19。R4 #1 固定 `d2dccdacb83925b6f0121bd7311f92be2e18d2da`，原 Push 45474510079 / PR 45474525418 成功（1187 JS、2489 Perl），不替代新基線。

#16 的舊研究版本 `b429504e07acfa986642fba3ae964ec3aeb33190`，[CI 45484109364](https://github.com/Prysline/akimono/actions/runs/45484109364) failure：Node 1198/1198；Perl `original-r4-guild-establishment.t` 第 39、40 項帳本斷言失敗（期待 120000、50000，實得 undef）。**本次同步期間已修正：** 新 HEAD `6664d60af29b4974f9386bf5c97ce09cdd477637` 的 [CI 45576804253](https://github.com/Prysline/akimono/actions/runs/45576804253) completed/success，Node 1198/1198、Perl 2774/2774（94 .t），alpha/beta 帳本斷言均通過。修正版仍是獨立來源研究，未納入 migration、非正式 WorldState/CAS。[R4 研究文件（固定 SHA）](https://github.com/Prysline/akimono/blob/6664d60af29b4974f9386bf5c97ce09cdd477637/modern/docs/r4-guild-dragon-transaction-research-20261125.md)。

[#18 R4 新基線續作](https://github.com/Prysline/akimono/pull/18) 由 #17 merge `3b927866b4749aad3ffc583a9cf12bf3fb9eb783` 出發；入場 HEAD `19f35989b659fdfb3279e6cf4770d3fa6b72b322` 選擇性新增 33 份來源／歷史證據及 1 份清單，未覆寫既有檔案、未改 runtime。其 [CI 45577006632](https://github.com/Prysline/akimono/actions/runs/45577006632) 於本次複查時執行中；後續查 exact HEAD 結果。參見[入場清冊](https://github.com/Prysline/akimono/blob/19f35989b659fdfb3279e6cf4770d3fa6b72b322/modern/docs/r4-unified-baseline-intake-20261125.md)。#18 已採正確的新基線方向，仍 Draft，未完外部玩家功能不得宣告完成。

R4 可繼續獨立來源研究；欲納入正式玩家功能，從 migration 最新 HEAD 開新功能分支，選擇性移植已證明成果，重新驗證 v2/CAS/HMAC/source staging/Perl hash 與外部交易權限／副作用。不直接合併 #1/#16 或以舊 registry/存檔取代新架構。P4 已從 migration 出發並合併；P5 已從 #20 正式 HEAD 開隔離 #21 並驗收合併。保留原版、固定交接 refs，不 force push。現行 workflow 以 PR CI 為正式門檻；migration 尚未配置 push 觸發或強制 required checks，治理另開工作。

## R0／R1 稽核（候選，未結案）

[固定清冊](r0-full-baseline-audit.md)。#22 為 #18 上的 Draft 正常經營續作，未納入 migration；其範圍不得視為正式完成。

## 新工作窗起手提示

```text
繼續 Prysline/akimono 標準街現代化。先讀 migration/standard-street-s1 實際最新 HEAD、modern/docs/current-baseline-status.md、相關來源文件及 CI。#17 已提升 P3 A–E／R2、P1、P2 與已驗收 R4 單店跨期為唯一正式基線。新正式功能從 migration 開獨立分支，不用舊 #1/#11/#12/#13/#14/#15 作開發起點。R4 #1/#16 是研究來源，#18 是從正式基線出發的續作；#16 帳本修正版已通過獨立 CI，先查 #18 exact HEAD CI 與入場清冊，按需移植已證明成果，不重做 P3。區分來源 Oracle、fixture、真 HTTP/CAS 和正式驗收；保留唯一 v2、完整重播與安全拒絕。只改相關 modern/ 範圍，不碰凍結 Core/DSL/Perl、main、固定交接 refs 或 Notion；以目標 PR CI 驗收，合併依授權。
```

本次同步只更新文件，不修改程式、測試、workflow、研究分支或 Notion；原歷史正文保留。

## R0/R1 獨立收斂候選（2026-11-26）
正式 HEAD/tree 未變；#23/#24 的既有證據收斂於 [canonical manifest](r0-r1-baseline-manifest.json)，233 既有測試去重分類 111/32/90（有效/歷史/待補），另 5 新測試。#25 為 #22 R4 固定基線 CI 專用 Draft，不納入本線。整合候選尚未完成 exact HEAD CI，R0/R1 未結案。

## 已確認整合候選 CI 綠燈（固定版本）
[45765900966](https://github.com/Prysline/akimono/actions/runs/45765900966) job 139726608654：HEAD `b40dec8bfd28f6e655e48f5068c5ba280d5513b8`，checkout `41808264862039019cacbed13d552ee63b1d8e91` tree `de0452748ce90c5367beeb327b35cba0397e8f65` 相同。JS 1342/1342、0 fail/skip/cancelled，Perl 85 檔 2456/2456、Result PASS，所有 DSL 與原版 pins 步驟成功。R1 CAS race 與 fresh replay 均通過；P4 實測 96 opportunities、1 death、4 cows、rev81→86 保存／合法復原。此綠燈屬固定前一候選，不替代新 HEAD。

## 已確認 checkpoint 內層隔離 CI
[45794612974](https://github.com/Prysline/akimono/actions/runs/45794612974) job 139821957733，HEAD `f7a2c520d9a17fe66a6b08ec02073f61bdf3a1f8`、實際 checkout `0493bf2b80b4bd0677bccb92a00af91eb84a6c72` tree `1e66142f265ff0af160c3176b5107f09b6399f77` 相同。JS 1343/1343、0 fail/skip/cancelled，Perl 85 檔 2456/2456，所有 DSL/pin steps 成功。subtest 737 通過，八條 R1_INNER_GUARD 診斷逐一核對：inner MAC、fingerprint、interpreter、hash policy、draw policy、generation、anchor revision、origin；外層驗證先通過，再獨立指定原因及 HTTP 回退。P4 256 opportunities 觀察1 death、4 cows、rev216→221。僅固定前候選結果，新 HEAD 需重驗。R1-HTTP-01 獨立 strict repro 尚未執行；本機重新測 Git DNS 仍無法解析。

本批 R1 25 EVENT metadata oracle 與 gift 受控差分已逐項連結；14層 schema 檢查及六項負例待最新 CI。R0 既有分類覆核7、餘56。正式 runtime 未改。Canonical manifest 超過 Contents API 1MiB 文字回傳界線，續作從固定 tree 的 manifest blob SHA 使用 GitHub blob API 讀取，不把空 content 誤判檔案遺失。

本批 [禮物卷與市場差分](r0-gift-market-oracle-evidence.md) 補審5檔，103/233 已分類，收斂後補審40；既有待覆核56不變。新增五筆 ITEM/USE 差分連結；正式正向數不變。新候選 CI 待驗。

本批 R1 在既有 HTTP persistence 測試追加12個 transport/schema 拒絕案例（新增一個 subtest，五份候選 test files 數量不變），exact 新 HEAD CI 待驗；R1-HTTP-01 仍未實跑。

## 第九批與前候選 CI
前候選 [45804660497](https://github.com/Prysline/akimono/actions/runs/45804660497) job 139856600728：HEAD `1d3d112e3b5897e7c013ee5d8cf5906c12151c5a`、實際 checkout `c8bbf30ac5e0d6aa2f5dc321f8878dc0c76be121`，tree `41fce2eb2ef4c8ffcdb8cf9bca2c3f5cdf90c8c6` 相同。JS 1350/1350、0 fail/skip/cancelled、Perl 2456/2456（85 .t）、DSL/pins steps 全 success。僅該固定候選；本批新 HEAD 待驗。

[打工／展示架／lostbook](r0-work-showcase-lostbook-evidence.md) 4 檔已逐檔審閱，83 有效、24 歷史、126 待補（107/233），收斂後補審44、既有待覆核56。57 項已有精確測試證據；B-27 兩種打工與展示架1–4 callback probe 補鏈，5–8 不升格；B-30 合成 A/B/C 不硬映射正式 USE。正式 lawfulAcquisition/HTTP/v2 下界不變。R1-HTTP-01 strict repro 未實跑；本批無 runtime 修改。

第十批 [共用回呼／helper／材料與產出](r0-shared-helper-material-evidence.md) 補審 6 檔，89 有效、24 歷史、120 待補（113/233）；收斂後補審50，既有待覆核56。保留 B-26 stub、B-29 exact helper、B-22 數字片段的區分；沒有新增具體 ITEM/USE 正向旗標；未執行本批 CI。

第十一批 [USE 資格／交易／機率／經驗尾段](r0-use-gates-outcomes-experience-evidence.md) 補審8檔：97有效、24歷史、112待補（121/233）；收斂後補審58、既有待覆核56。B-21/B-23 Node 純投影與獨立 Perl Oracle 分開，B-24/B-25 有直接 probe 差分。均非正式玩家；功能矩陣正向下界不變。新候選 CI 待驗。

第十二批 [打工／職業／乳製品／派對](r0-r2-work-career-dairy-party-evidence.md) 補審4檔：101有效、24歷史、108待補（125/233）；收斂後補審62、既有待覆核56。20 USE rows 新增或補強原版交易差分（其中14職業逐選項），70 rows 有詳細證據；受控注入、正式正向不變。新候選 CI 待驗。

第十三批 [採集／多次地圖／廣告](r0-r2-gathering-advertisement-repeat-evidence.md) 補審4檔：105有效、24歷史、104待補（129/233）；收斂後補審66、既有待覆核56。10 USE rows 新增原版交易差分，80 rows 有詳細證據；#62/1 memory-only 保留正式 HTTP 拒絕。新候選 CI 待驗。

第十四批 [R2/R3 歷史 HTTP/v1](r0-legacy-r2-r3-http-evidence.md) 補審8檔：105有效、32歷史、96待補（137/233）；收斂後補審74、既有待覆核56。全部 spawn legacy server、fixed clock/RNG；B43 v1、兩店診斷與原版差分不升格，正式功能下界不變。R1-HTTP-01 嚴格腳本仍獨立、未實跑；本機 git ls-remote 再次 DNS 失敗，不以包裝預期失敗測試取得 npm 綠燈。

第十五批 [sparse PLUS](r0-sparse-plus-evidence.md) 補審6檔：111有效、32歷史、90待補（143/233）；收斂後補審80、既有待覆核56。B35/36/37 原版受控 PLUS／cap 差分，明示 ITEM #1/#10/#40 補鏈，82 筆功能有詳細證據；79槽向量不當作正式商品取得，正式正向下界不變。新候選 CI 待驗。

第十六批 [自然販售／#70 FUNCTURN](r0-natural-sale-functurn-evidence.md) 補審4檔：115有效、32歷史、86待補（147/233）；收斂後補審84、既有待覆核56。ITEM #10/#70 受控來源 Oracle／差分補鏈，83 筆有詳細證據；正式取得/HTTP/v2 下界不變。前候選 CI 45809746831 已核對 checkout 同 tree、1350 JS／2456 Perl 通過；新候選待驗。

第十七批 [R4 EVENT declarative／PARAM](r0-r4-declarative-event-evidence.md) 補審4檔：119有效、32歷史、82待補（151/233）；收斂後補審88、既有待覆核56。9 EVENT 純 PARAM 差分、其中7單 key END/START 生命週期；25 metadata 下界不變，83 筆功能有詳細證據；正式下界不變。新候選待 CI。

第十八批 [R4 B50 公會帳本／跨期磁碟](r0-r4-b50-disk-ledger-evidence.md) 補審4檔：123有效、32歷史、78待補（155/233）；收斂後補審92、既有待覆核56。原版 temp disk、受控 period prefix/tail、guild ledger、stage/receipt/recovery，不等於正式 v2 或原子 WorldState；83 詳細 rows、正式下界不變。新候選待 CI。

第十九批：[R4 多 EVENT/hash](r0-r4-multi-event-hash-evidence.md)，四檔有效；累計有效127、歷史32、待補74（159/233），收斂後逐檔審閱96；既有63中7覆核、56待覆核。七 EVENT 17-key 受控混合切片，非正式時間／callback／RNG/CAS/v2；詳細功能83，正式下界不變。

第二十批：[R4 guildbattle END／rebel NOW](r0-r4-guildbattle-rebel-callback-evidence.md)，四檔有效；累計有效131、歷史32、待補70（163/233，70.0%），收斂後逐檔審閱100、既有待覆核56。兩 EVENT 追加單 key callback Oracle/Node 差分，人工外部狀態與 IO stub；83 詳細 rows、正式下界不變。新候選 CI 待驗；R1-HTTP-01 尚未實跑。

第二十一批：[R4 RebelRobin period→NOW](r0-r4-rebel-period-now-evidence.md)，四檔有效；累計有效135、歷史32、待補66（167/233，71.7%），收斂後逐檔審閱104、既有待覆核56。rebel 七 trigger/extension、八 period→NOW 人工同片來源差分，非完整 period/軍隊結算/17 EVENT/正式時間。83 詳細 rows、正式下界不變。第二十批 CI 45814598758 queued，新候選待驗。

第二十二批：[R4 公會檔案／邊界／會費](r0-r4-guild-files-fee-evidence.md)，五檔有效；累計有效140、歷史32、待補61（172/233，73.8%），收斂後逐檔審閱109、既有待覆核56。實際隔離 stage/live、原版注入第2 rename 與 Node 目標目錄阻擋第2 rename 的 recovery、舊 keys/mtime/malformed 來源觀測；單店 dues 只 EditGuildMoney call stub。非正式 v2/全域原子或玩家能力；83 詳細 rows、正式下界不變。新候選 CI 待驗。

### 第 23 批：混合 support／instant EVENT

- 新審 4 檔：有效 144、歷史 32、待補 57；固定分母 233，分類收斂 176/233（75.5%）；累計另逐檔審閱 113 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-mixed-support-instant-evidence.md)：四 support／六 theft 同程序 hash＋受控 RNG 差分；共用 Perl .t 另有 loto/happy/iron/sword/guildbattle/rebel 原版斷言，對應 Node 檔另審。83 詳細功能列及正式取得/HTTP/v2 下界不變。未執行本批本地測試，CI 待核。

### 第 24 批：R4 混合 EVENT 其餘五份 Node 差分

- 新審 5 檔：有效 149、歷史 32、待補 52；固定分母 233，分類收斂 181/233（77.7%）；累計另逐檔審閱 118 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-mixed-loto-happy-iron-sword-guild-rebel-evidence.md)：loto/happy/iron-sword/guildbattle/rebel 共 21 受控 cases；第23批共享 Perl probe/.t 已審不重複；人工 stock/active state、clock jump、single shop、stub IO，非完整 period/正式玩家/真 RNG/CAS/HTTP/v2。83 詳細功能列與正式下界不變。未本地重跑，CI 待核。

### 第 25 批：R4 時鐘分割／動態人口 PLUS

- 新審 4 檔：有效 153、歷史 32、待補 48；固定分母 233，分類收斂 185/233（79.4%）；累計另逐檔審閱 122 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-clock-population-plus-evidence.md)：九時鐘 partition cases；三人口、120秒、59 PLUS/79 slots sparse wire 受控差分；非正式跨期人口生成、合法取得或正式時間/CAS/HTTP/v2。不升格 79 商品個別功能，83 詳細 rows 與正式下界不變。未本地重跑，最新 CI 待核。

### CI 補核：第16及18批

- run 45812881914 / job 139884994194：success，實際 checkout `161420e6fe1a81bfbc1503171cb6680109e1b14c`，tree `62f97bbcd1341a7e9202dda33facb9239f840a4a` 等於 HEAD `85882a1fa1d5f9aa6797507448e4296792a7bd60` tree。
- run 45813274369 / job 139886364325：success，實際 checkout `145516bf05207275c62b51d34ed5fa62ad0a37b2`，tree `9a5c64ecd7f56d50e0ff3b8496ddb5cee243e50c` 等於 HEAD `3ddcb0ca6890a14d5039a52bfd23f8b3458ad83a` tree。
- 兩 run 實際 JS 1350 tests / 1349 pass / 0 fail / 0 cancelled / 1 skip（P4 actual cow mortality: save before replacing, reload, NEED denial, legal replacement；No cow death occurred in bounded real player experiment），Perl 2456/2456、85檔 PASS；DSL/source pins 全通過。固定測試已存在 conditional skip；不是新確認程式故障，也不證該兩次死亡後完整鏈。先前 1350/1350 不替代這兩 run 或更新候選。

### 第 26 批：R4 SortDT pre-EVENT 單店排序

- 新審 2 檔：有效 155、歷史 32、待補 46；固定分母 233，分類收斂 187/233（80.3%）；累計另逐檔審閱 124 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-sorted-pre-event-evidence.md)：memory #10 買入/上架→受控 R3/R4 純 stage，Node R3 shop→原版 GetDTPoint/SortDT；單店點數差分、costtoday <1e-12、反轉 EVENT order fixture。null EVENT 負例傳錯 review 欄位，不獨立證明該 guard；未改原斷言。非原版整鏈、多店排序、正式跨期/玩家/CAS/HTTP/v2。83 詳細功能列及正式下界不變。未本地重跑，Git DNS 仍失敗，R1-HTTP-01 未實跑；新候選 CI 待核。

### CI 補核：第17及19批

- run 45813093496 / job 139885734085：success，HEAD `acc414314ef38cfb7f88af8148300954123e2427`、實際 checkout `d1fb90e7875af8d5bb314bc9db0e316cbe154611`，tree `47b3a37d9de7e133ee4ff2bcb3696e4d1ea3da6e` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- run 45813568842 / job 139887380057：success，HEAD `ed54848fc26e5800532b1b24001972b986df9a41`、實際 checkout `4e37acc8760eeaf78f69ff7f5045c9b78986c663`，tree `90eab3330c1b20f26944fae87f70b15e1aea13f7` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第16/18批 conditional skip 紀錄保留；第20–25批本次 API 查詢仍 in_progress，不能認列成功。

### 第 27 批：R4 P3 pre-EVENT overlay／跨期與記憶體 CAS

- 新審 1 檔：有效 156、歷史 32、待補 45；固定分母 233，分類收斂 188/233（80.7%）；累計另逐檔審閱 125 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-p3-pre-event-overlay-evidence.md)：11 subtests，九 PARAM overlay、normal/crossing source 差分、20+40 秒同 Perl process、受控記憶體 CAS 兩次36h、隔離四檔 stage/recovery；人工 stock/clock/tape，非正式 HTTP/真時鐘/v2 reload。九 EVENT 已補既有差分層；83 詳細功能列及正式下界不變。未本地重跑，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第 28 批：R4 兩期財務 prefix（龍賽／爵位／會費）

- 新審 2 檔：有效 158、歷史 32、待補 43；固定分母 233，分類收斂 190/233（81.5%）；累計另逐檔審閱 127 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-period-all-finance-evidence.md)：同一 Perl process 兩期，實際隔離 drapay read/unlink、525/0 會費呼叫、攻防、爵位與完整 shop/town 差分；Node 每期讀取 Oracle input，非獨立連續提交。人工 stock/clock/draw、guild IO stub；不證真公會金庫/正式時間/HTTP/CAS/v2。83 詳細功能列及正式下界不變。未本地重跑；R1-HTTP-01 未實跑。

### CI 補核：第22批

- run 45815056839 / job 139892525015：success，HEAD `57dfd4d950fd93854a757367f3fc34f4c7ad1348`、實際 checkout `8de14457b5c31055f9abb9a097c86c3cd0123137`，tree `beefcbf6efcca540f32280c5d8490ad574c0884e` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。非最新 HEAD 成功證明。

### 第 29 批：R4 龍賽檔案／兩期龍賽與爵位

- 新審 6 檔：有效 164、歷史 32、待補 37；固定分母 233，分類收斂 196/233（84.1%）；累計另逐檔審閱 133 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-dragon-period-evidence.md)：九龍賽檔案 cases、兩期龍賽及爵位 prefix；Perl 真隔離 drapay read/unlink，Node 純文字投影、每期重讀 Oracle input，非獨立連續提交。人工 stock/clock/rand、log stub；CAS 標題無 CAS 呼叫、legacy dignity 負例未隔離 guard；不證正式玩家／HTTP／v2。83 詳細功能列與正式下界不變。未本地重跑，Git DNS 失敗，R1-HTTP-01 未實跑；新候選 CI 待核。

### CI 補核：第20、21及23–27批

- 第20批 run 45814598758 / job 139890932520：success，HEAD `72b39f5710842a8118c2919a493b9403b123e0b2`、實際 checkout `f3649ef8d9cb0e72fdfcb5cd7ff7c15efd4c435d`，tree `35304b4e5cbe933090bf045c30b0b878658f8016` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第21批 run 45814822511 / job 139891712582：success，HEAD `a84d2de4a0f949312d7358a2a3a7263267bb9334`、實際 checkout `98ac80a195fe37720ca46fc888424890429170e0`，tree `aa1ca0de58e22b5e8a1ef19cb5b6a884947c1060` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第23批 run 45815436169 / job 139893860805：success，HEAD `15e35e984ce094e41b7e62236d9b21505249435f`、實際 checkout `f7c63a3309e8d82161ea851bd4e2fdde3de91621`，tree `0839dca1c1703a1fc8600af8e21b7932aa5ef976` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第24批 run 45815667129 / job 139894639625：success，HEAD `dcbc5fad1b88b014f1b08fd9c9423fbb2e4a7b6d`、實際 checkout `f35129062d5b19d999ea7891f31796b9159ea895`，tree `a8ec3fd305818929e1701500bb692ddfd41b7710` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第25批 run 45816082328 / job 139896056757：success，HEAD `d0091c4aa749146facb174caae95ecbb6b334c94`、實際 checkout `9dd1f4fafc092be77ae65ef97f31b2f26c6facb9`，tree `476346668feca40fa5f04571362561366b222da5` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第26批 run 45817237519 / job 139900009144：success，HEAD `ff9d9f66e525751376ee0038fdf5f928fa103835`、實際 checkout `a0dc80d63c303de94335ae467c5ce999ce6b9d08`，tree `e280d89198abc30b4a720baa33101bc5c2ee0816` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第27批 run 45817807463 / job 139901955114：success，HEAD `c8e18aa9682e5e288bdb6b468d6c171912a0664c`、實際 checkout `03baed3c358bfa6384fbf5f08e3e035f32b7c393`，tree `bcc51dc3ef7fe6b0892ed9d8b25a76e5bdf47cdc` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第28批 run 45818228163 尚 in_progress（本批查詢），前述結果不替代新 HEAD 驗收。

### 第 30 批：R4 店主缺席／兩期高 EXP 技術遺失

- 新審 6 檔：有效 170、歷史 32、待補 31；固定分母 233，分類收斂 202/233（86.7%）；累計另逐檔審閱 139 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-expiry-high-exp-tech-evidence.md)：九 expiry cases、嚴格12h/7d +1s 邊界；兩期原版真隔離 drapay、CloseShop call recorder（店鋪仍在）、高 EXP 18/24→19 遺失、38 保留、EXP4695→4409、8/6 draws。Node 每期重讀 Oracle input；人工 stock/EXP/clock/rand、guild/log IO stub，非真關店或正式玩家／HTTP／v2。新增四 ITEM 限定 Oracle/Node 詳細證據，87 詳細列、ITEM14/USE39/EVENT25；#38 僅保留分支，正式取得/HTTP/v2 下界不變。未本地重跑，R1-HTTP-01 未實跑；新候選 CI 待核。

### CI 補核：第28批

- run 45818228163 / job 139903387992：success，HEAD `d2870d55b0ee9b2a9ab5b92e396cd028d842146a`、實際 checkout `aa42c20422e4c112af7a68a42857ae38a9f30721`，tree `30f7ab262daf732b86c87ed92269612808591535` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。第29批 run 45824384633 查詢時 in_progress；不替代新 HEAD。

### 第三十一批：真 CloseShop／兩期結算

有效174、歷史32、待補27（206/233，88.4%）；收斂後逐檔補審143、原有分類重新覆核7（剩56）；候選新增5獨立計算。四份測試與兩份 probe 已逐檔實讀，見 [限定證據](r0-r4-real-close-evidence.md)。原版真隔離 session unlink、archive pre-zero 文字、status/money/rank 歸零、SortDT singleton prune；第二期 closed reference 仍結算 dragon1500、fee75、money1425、atk921，移除後不跑技術 rand。Node 每期 Oracle input，純投影；SetUserData/WriteErrorLog/EditGuildMoney 等外部呼叫記錄、DataWrite 未執行、備份尾段未跑。R1 詳細87，限定 ITEM14/USE39/EVENT25、正式取得/HTTP/v2 ITEM7/USE12/EVENT0 不變。CI29、30 本批查詢仍 in_progress，不繼承舊綠燈。

### 第三十二批：R4 關店封存磁碟／B50 串接

- 新審 3 檔：有效 177、歷史 32、待補 24；固定分母 233，分類收斂 209/233（89.7%）；收斂後另逐檔補審 146，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-close-shop-archive-evidence.md)：原版真隔離 CloseShop/WriteErrorLog 四例，新建、追加、30001 bytes 輪替、missing log 仍清零與 session unlink；SetUserData 原版 no-op。Node 真隔離 append/rename 與解碼文字差分，missing ENOENT；未測 30000 bytes 等值或跨檔原子性，輪替先於 context 驗證。B50 兩期 Perl 封存仍為 recorder，Node 每期 Oracle input、獨立 probe context，非兩期原版真磁碟差分或正式 WorldState commit。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，未本地重跑、R1-HTTP-01 未實跑；CI29–31 本批查詢仍 in_progress，新候選待驗。

### 第三十三批：R4 period 備份尾段／兩期真關店

- 新審 4 檔：有效 181、歷史 32、待補 20；固定分母 233，分類收斂 213/233（91.4%）；收斂後另逐檔補審 150，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-period-backup-full-tail-evidence.md)：兩期真隔離三代五檔 rename/copy、session strict mtime、MakeGuildFile recorder；joint probe 真 CloseShop/SortDT/drapay 及備份尾段，第二期 closed shop prune、draws4。人工 activeFiles 非 DataWrite 產物，Node 每期 Oracle input 純投影不寫檔；外部 archive/guild/log 呼叫記錄，缺世代、失敗/原子性未驗，不升格正式玩家。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑；新候選 CI 待驗。

### 第三十四批：R4 備份磁碟／DataWrite 及 DataRead

- 新審 4 檔：有效 185、歷史 32、待補 16；固定分母 233，分類收斂 217/233（93.1%）；收斂後另逐檔補審 154，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-backup-data-write-disk-evidence.md)：原版 backup prelude 3600s 嚴格 mtime、缺來源截斷／目的目錄錯誤後續仍 copy、lasttime 仍更新；blocked work stale generations。Node 真隔離兩期 rotation、preflight 拒絕，非中途 OS failure 原子性。DataWrite 原版兩次真單檔 stage/rename、同程序 DataRead reload 後人工修改；Node 窄序列化與真單檔 rename failure/recover/discard，不重算 point、非完整 period/鎖/CAS/v2。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑；CI29–33 查詢仍 in_progress，新候選待驗。

### 第三十五批：town／guildbattle END／play 磁碟

兩份待補轉有效：原版直接 END body 真隔離 guild/config/ledger read、兩次 DataWrite/DataRead，Node 真隔離讀檔及 town-only stage/rename/recovery；town map 比對不等於 hash order bytes，非完整 EVENT lifecycle、正式玩家、CAS 或 v2。Set/GetTownData key 不對稱保留原版行為。guildbattle 既有 Oracle/Node 層追加引用，詳細仍 87 項、其餘 133 項；正式下界不變。證據：[r0-r4-town-play-evidence.md](r0-r4-town-play-evidence.md)。R0 有效187、歷史32、待補14（219/233，94.0%）；收斂後逐檔補審156，既有重新覆核7，剩56；候選新增5獨立。

### CI 補核：第29、30批

- 第29批 run 45824384633 / job 139924653702：success，HEAD `4f855a10a908cd37e3a93ce1fcf45feae9b54596`、實際 checkout `cf0ed17acb13d9496cdf725e7ce29049228c3bef`、tree `bdc4bd9c8f5838ab206a29602fb487fa6820e51b` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第30批 run 45824834094 / job 139926235251：success，HEAD `a33b920e1256f2cdc33924c22a2c68b6d1f2e16c`、實際 checkout `f0061b9789777e98c23c64990958ae1c885675e4`、tree `9d535d3761a744111277bf393bf7fe898200db79` 一致；JS 1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔）PASS，DSL/source pins 通過。
- 第31–35批最後查詢仍 in_progress：45825399615、45826374794、45826749043、45827170541、45827783268；不替代新 HEAD 驗收。

### 第三十六批：UI 靜態回歸／原版 world 讀寫及提交

- 新審 5 檔有效：有效192、歷史32、待補9；固定233，分類收斂224/233（96.1%）；收斂後逐檔補審161，既有重新覆核7，剩56；候選新增5獨立。
- [逐檔證據](r0-ui-world-read-commit-evidence.md)：UI 為靜態字串/CSS/handler wiring，非瀏覽器或 HTTP/CAS；原版 DataRead 真隔離檔，非數字保留、缺 // / CRLF sentinel 需 alarm、duplicate ID 覆蓋及缺 payload 接受。DataWrite 無店 stage，人工 stock 變更，未 commit；DataCommitOrAbort 真隔離 rename、第二次注入失敗後 recovery、原版 selector wildcard，非多檔 atomic。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑。

### CI 補核：第31批

- run 45825399615 / job 139928131564：success，HEAD `afce18b527f3af777d4fdadfd8d968656b3a5aa5`、實際 checkout `79a8fedb61f5e2bbfeb497ed84552d82cf90ace5`、tree `4a1b80e0cbac00a01c1143bbdf973ef7bc9710dd` 一致；JS1350/1350、0 fail/skip/cancelled；Perl2456/2456（85檔）PASS；DSL/source pins 全部成功。第32–35批與 bb44e26 查詢仍 in_progress；不替代新 HEAD 驗收。

### 第三十七批：人工 world USE 序列／市場與批發來源

- 新審3檔有效：有效195、歷史32、待補6；固定233，分類收斂227/233（97.4%）；收斂後逐檔補審164，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-world-use-market-fixtures-evidence.md)：兩次人工 A/B/C USE 同 interpreter 但重建 state、各次 seed，真原版 lostbook、wholesale/callback/EXP 順序；人工 #10 市場統計與 sc-s CGI，時間先於拒絕，commit/IO stub；人工批發定價/limit、#20/#25 手填 DSL 數值非 compiler 或合法取得。非正式玩家、HTTP/CAS/v2/Node 差分；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。

### CI 補核：第33、34批

- 第33批 run 45826749043 / job 139932750970：success，HEAD `44b35c24ed74d64a832b667bf3afd696caa23e40`、實際 checkout `c782fa822d0d4a588b73ffa9ed58d9c37b52356d`、tree `2c23b96662fbab8d7ac4c10a70f6b8dceef014dc` 一致；JS1350/1350、0 fail/skip/cancelled；Perl2456/2456（85檔）PASS；DSL/source pins 全部成功。
- 第34批 run 45827170541 / job 139934197653：success，HEAD `0e875d4cc00a6e48c281229c71e96606d4dcdaa2`、實際 checkout `67e11542ee9a53ec6bcf947682d4d6eec5141ea9`、tree `8750adc80c962d205a40a72a4ab556e0037cb631` 一致；JS1350/1350、0 fail/skip/cancelled；Perl2456/2456（85檔）PASS；DSL/source pins 全部成功。
- 第32、35批及 bb44e26 最後查詢仍 in_progress；不替代新 HEAD 驗收。

### 第三十八批：peer trade 純投影／B-32 人工 USE 差分

- 新審2檔有效：有效197、歷史32、待補4；固定233，分類收斂229/233（98.3%）；收斂後逐檔補審166，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-peer-use-fixture-evidence.md)：peer #1/#40/#79 純記憶體投影，無 CAS；人工 stock/tax/time/RNG，非售完非法 rank -1 仍保留。B-32 三組兩步 Perl/Node、synthetic A/B/C、同 adapter 連續 CAS；shortage/time-gate 標題實際 COMMITTED、spoof 只改 worldId、no IO 只查 metadata、JSON 非 v2。無正式玩家、HTTP/v2；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。

### 第三十九批：R2 declarative／unified USE

- 新審2檔有效：有效199、歷史32、待補2；固定233，分類收斂231/233（99.1%）；收斂後逐檔補審168，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-r2-declarative-unified-use-evidence.md)：69 distinct recipe IDs 受控 Perl/Node、人工材料/EXP/job/time/draw，並非合法取得；#26/0 僅 metadata/drift。Unified #79 六例只驗 probe 長度，#14 六分支逐值差分、受控初始券換地圖、memory CAS 拒絕；非完整 compiler/CGI/HTTP/v2。R1 逐項尚待另行連結，詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 暫不變。

### 第四十批：R3 natural sale／五劍取得販售，分類收斂完成

- 新審2檔（1有效、1歷史）：有效200、歷史33、待補0；固定233，分類收斂233/233（100%）；收斂後逐檔補審170，既有重審7、剩56；新增5獨立。不是全量重審或 R0 結案。
- [逐檔證據](r0-r3-natural-sword-sales-evidence.md)：原版 24 stock/display＋24 price＋24 pre-EVENT＋16 multi-shelf，人工 stock／固定 draw；單架 draw 只 <= 原版總量，多架精確 natural，整合才比全79 wholesale及總 draw；#70 有 owner 只 Perl。五劍 Node 合法來源路徑受控 memory CAS，但使用舊時間命令與真隔離 legacy v1（重載非新 process），非正式 HTTP/v2 或逐劍完整原版差分。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 暫不變。
- 下一步：重新逐檔覆核剩餘56份原有分類；完成後逐項補 R1 14層，R5 仍只規劃。

### CI 補核：第32、35批

- 第32批 run 45826374794 / job 139931469807：success，HEAD `ff70e04ccb59d2c02427304c801d58f86ec9caf1`、實際 checkout `6513eeabaf9fd1a59ba4e6ebb3585dda6f756690`、tree `146f8eebeb674fa69072ced446fcf4584be09c56` 一致；JS1350/1350、0 fail/skip/cancelled；Perl2456/2456（85檔）PASS；DSL/source pins 全部成功。
- 第35批 run 45827783268 / job 139936292121：success，HEAD `ec0acb2ddcbb6fc8f3202f42ae06ff7a9929e6cf`、實際 checkout `daed658b9f8c0ff6c9e42d88e2fc89c5d8599f3e`、tree `f19fff358cac10436785f9b2f95778ea932c6883` 一致；JS1350/1350、0 fail/skip/cancelled；Perl2456/2456（85檔）PASS；DSL/source pins 全部成功。
- 新 HEAD 未驗；保留第16、18批 cow mortality skip 歷史，不沿用舊綠燈。

### 第四十一批：B44–B47 既有分類重新覆核

- 八檔既有有效分類維持：有效200、歷史33、待補0；固定233、分類100%；新逐檔170，既有63重審15、剩48；實際逐檔累計185/233（79.4%）。
- [逐檔證據](r0-b44-b47-rereview-evidence.md)：B44 原版 ledger 79槽但77槽人工9999，#10/#79 手填 cap；B45 原版 prize callback＋AddItem/排名計數，ITEMNO regex 代換，WriteLog stub，JS no-op DSL mutation 不算 drift；B46 同 Perl interpreter 兩次無領袖 territory，Node 每次 Oracle input、非兩期完整結算；B47 單店 SortDT/GetDTPoint 四例，two-sales 人工帳。均非正式 HTTP/v2/CAS、完整 period。R1 詳細87與限定/正式下界不變。
