# 《商人物語》標準街 Node.js 移植｜**新對話接力交接**（B-36）

> **用途**：使用者換聊天視窗後，新的助手只需先讀這份精簡可核對的 GitHub 文件，再依目前遠端 HEAD 核對後續工作。**不要**從舊聊天記憶推論最新狀態，也不要把文件內的 CI 數字視為未來 HEAD 的保證。

## 最新工作界線

- GitHub repo：**`Prysline/akimono`**。
- 正式工作分支：**`test/task02-baseline-on-s1`**；Draft PR [#1](https://github.com/Prysline/akimono/pull/1)，base **`migration/standard-street-s1`**，**不得自行合併、不得改成 Ready for review**。此分支是唯一要接續的實作位置。
- 固定原始主分支 `main` 的已核對 SHA 為 `7301b0c2b1e27226d1770e153fa3c68cfeae6d48`；固定底分支 `migration/standard-street-s1` 已核對 SHA `585c77ba247510bcf3f22cf24c0c277b68d7d5a4`。**不得修改**原始 `main`、遷移底分支、原版 Core/CGI、`custom/inc-item-data.cgi`、`custom/inc-rebel-data.cgi`。
- 固定上游 Core：`katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`；兩份街道 DSL 固定 Git Blob SHA：商品 `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`、叛亂 `923634e58a05beca9ab004515fc7669d53a1ba3a`。
- `modern/tests/original-perl/` 已鎖定**19份來源原樣 Core 快照**（原18份＋B-34 新增 `core-inc-admin-func.cgi`，原版 Blob `2164b7e5abfea7a466235a8deba1543c2cc41515`）；GitHub Actions 逐份以 `git hash-object` 核對。
- 正式 Notion 12 任務：**01已完成；02、04、05進行中；其餘8項待辦**，非遊戲完工比例。任務02： https://app.notion.com/p/41db4185273f818f97d4fce172db36f8 ；任務04： https://app.notion.com/p/41db4185273f81288606d7d5a4375794 ；任務05： https://app.notion.com/p/41db4185273f812ea949dfcaf7c2def9 。

## 已真正實作與驗證的核心路線

1. B-01～B-30：原版商品上限、原版世界欄位與鎖／備份／寫入、原版市場／批發／時間／商品交易核心數值、部分原版回呼／實際 Perl 隔離；原版異常只記錄 [`original-behavior-issues.md`](original-behavior-issues.md)，**不可偷偷修復**。
2. B-31：純記憶體 `GameCore/StreetModule/WorldState`，嚴格 `revision`、`compareAndSwap` 與 JSON 快照，`standard-street` 最早只支援 `open-shop` 和 `edit-showcase`；不是真正磁碟／資料庫／多人遊戲。
3. B-32：人工A/B/C商品的來源 Perl `UseItem → lostbook` 連續兩次交叉驗證，**不代表**真實標準街 ITEM #1/#2/#3。
4. B-33：第一筆**真正**標準街 `ITEM #79 gift 禮物卷 / USE.no=0 交換地圖集`：消耗2張禮物卷，產出 ITEM #12 山區地圖、#9 礦山地圖、#14 劍市地圖各一張；固定原版編譯器 `ItemUseTimeRate=0.5` 令原始 `time 1h` 編成 `time/exptime=1800秒`，無自訂回呼、無熟練度、無金錢成本。原版商品上限79項已跨語言核對。當時因市場未驗證，僅限**明示人工批發全0**測資。
5. **B-34：** 追查到固定 Core `inc-admin-func.cgi::init` 第一次建立世界資料時，**批發庫存第三行是空字串**，而不是79個明文0；`inc-func.cgi::DataRead` 的 Perl `split` 得到**長度0稀疏陣列**。新 `original-admin-world-bootstrap.mjs` 只有在明確提供**原版管理員、讀取、寫入三份原文**且來源結構一致時，才允許對**空世界 `revision=0`** 執行選用 `initialize-source-market` 命令。它保存 `originalWholesaleCsv=''` 和 `sparseWrittenSlots=[]`，另外保留79格供數值運算的0視圖。B-34 使用真正原版 Perl `print DATA time()...` 子句（只在 scalar 記憶體把手執行，不跑整個 admin init）及完整原版 `UseItem` 核對後，將來源市場真正接到 B-33 的 `gift-exchange-maps`：在空世界初始化、真實標準街開店、連續兩筆交換後，庫存禮物卷 `5→3→1`、三種地圖各 `0→1→2`、世界版號 `0→1→2→3→4`。原版批發陣列只賦值位置78時，`DataWrite join` 文字是**78個逗號＋末尾一個0**，不是79個字面0；超限地圖會另寫位置8、11、13。詳見 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)。
6. **B-35：** 對已來源核對的 B-34 初始稀疏市場，實作**限定商品 #10 `book-make` 的 PLUS 20m**；Perl 真正抽取固定 `inc-turn.cgi` PLUS 原文迴圈、只把其他商品 PLUS 設為明示測試0，並直接呼叫完整固定 `whole.cgi::CheckWholeStore`。來源人口500000、MAX_USER=50、單一真新店、亂數抽樣由外部提供；三個受限後銷售時間片 `60/60/600秒` 的商品 #10 批發 `0→1→2→10`，記憶體版本 `2→3→4→5`。商品 #79 原版限額修正額外明確寫下索引78的0，證實稀疏CSV只定義索引9和78。**完整其他商品 PLUS、自然銷售／回呼／時間流逝／決算皆未執行**。詳見 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)。
7. **B-36（最新）：** 保留固定原版 `inc-turn.cgi` 的**完整 PLUS 迴圈原文片段**及 `plug/whole.cgi::CheckWholeStore`，在 B-34 空白稀疏市場與一間真實標準街新店上，只啟用三個固定來源商品：#1 藥草 `-20m`、#10 `book-make +20m`、#40 木刀 `-1h`。**其餘76項原版 PLUS 明示人工設0**，不是完整原版週期。原始 `DTpeople=500000`、`MAX_USER=50`，亂數百萬分位外部注入；三段來源時間片 `60/60/600` 秒讓商品 #10 批發 `0→1→3→10`，#1/#40 扣到負數後依原版 `CheckWholeStore` 歸0。批發 CSV 稀疏寫入索引 `[0,9,39,78]`，其餘空槽不補成0。另有**明示人工正庫存**的獨立扣貨 fixture 證實 #1 `20→19`、#40 `10→9`，不可誤稱是真實開服市場。Node `reviewed-sparse-multi-plus` 支援三筆 CAS 版本 `2→3→4→5`；沒有更新真世界時鐘、銷售、回呼、事件或持久化。詳見 [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)。
8. 最近**實作 HEAD** `637de9662eef9eed898729f3d754e021786b0062` 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/44859521110)、[PR CI](https://github.com/Prysline/akimono/actions/runs/44859526380) 兩份同 SHA success：**784 Node／1051 真正來源 Perl**（29份 `*.t`）、19份 Core SHA 與 DSL audit 完成。**文件後續更新的 HEAD 仍需重新驗證，同一 SHA 才能當完成依據。**

## 讀檔順序（新對話必做）

在新的對話中使用**已連接的 GitHub App／工具**，依序查看：
1. [Draft PR #1](https://github.com/Prysline/akimono/pull/1)（**讀回最新 head_sha、draft、merged、base**）與 [本交接文件](next-window-handoff.md)。
2. [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)（B-36）與 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)（B-35）與 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)（B-34 來源初始化）；[`reviewed-real-gift-use.md`](reviewed-real-gift-use.md)（B-33 真商品）；[`migration-progress-and-next-milestones.md`](migration-progress-and-next-milestones.md)（正式里程碑）。
3. [`original-sparse-multi-plus.mjs`](../src/original-sparse-multi-plus.mjs)、[`original-admin-world-bootstrap.mjs`](../src/original-admin-world-bootstrap.mjs)、[`reviewed-gift-map-use.mjs`](../src/reviewed-gift-map-use.mjs)、[`standard-street-module.mjs`](../src/standard-street-module.mjs)、[`game-core-contract.mjs`](../src/game-core-contract.mjs)。
4. [`OriginalSparseMultiPlusHarness.pm`](../tests/original-perl/OriginalSparseMultiPlusHarness.pm)、[`original-sparse-multi-plus.t`](../tests/original-perl/original-sparse-multi-plus.t)、[`original-sparse-multi-plus.test.mjs`](../tests/original-sparse-multi-plus.test.mjs)；原有 [`OriginalSparseWholesalePlusHarness.pm`](../tests/original-perl/OriginalSparseWholesalePlusHarness.pm)、[`original-sparse-wholesale-plus.t`](../tests/original-perl/original-sparse-wholesale-plus.t)、[`original-sparse-wholesale-plus.test.mjs`](../tests/original-sparse-wholesale-plus.test.mjs)，以及 [`OriginalAdminBootstrapHarness.pm`](../tests/original-perl/OriginalAdminBootstrapHarness.pm)、[`original-admin-sparse-market-probe.pl`](../tests/original-perl/original-admin-sparse-market-probe.pl)、[`original-admin-sparse-market.t`](../tests/original-perl/original-admin-sparse-market.t)、[`original-admin-sparse-market.test.mjs`](../tests/original-admin-sparse-market.test.mjs)。
5. GitHub Actions **同 SHA 的 push / PR 兩份 CI**、`modern/package.json`、`verify-modernization.yml`，確認既有測試與所有19個 Core source SHA、兩份 DSL audit 完全成功，再開始新的修改。

## 下一段工作的精確目標（B-37 候選）

B-36 已完成**三商品受限 PLUS fixture**與原版完整 `CheckWholeStore`，下一階段須先**逐筆審閱其餘原版非零 PLUS 與全商品原版編譯值**，才可宣稱真正所有商品在同一時間片共同更新；不可因本階段在測試層停用其餘76項 PLUS 就稱為真實市場週期。接著追查同週期自然販售、`GetMarketStatus`、回呼、人口與時間切段，補足本機存讀檔前的經營閉環。另一項重要工作是 `GetUseItem/CheckUseItem` 的真實使用入口，仍不得自行開放其餘115筆 USE。每段必須有直接原文 Perl 測試與 Node 比對。

**未完成且不得聲稱已完成：** 所有商品使用、完整週期／市價／自動販售、真正磁碟讀寫／鎖／備份／回滾、密碼認證、HTTP、繁體中文可玩前端、其他街道、多人世界。所有 B-36 `WorldState` 操作仍只在**記憶體**中，初始化命令並非真實玩家行為或安全的原版遊戲管理操作。

## 新視窗起手提示（直接複製）

```text
繼續《商人物語》標準街 Node.js 移植。請先使用已連接 GitHub 讀取 Prysline/akimono 的 test/task02-baseline-on-s1 分支 modern/docs/next-window-handoff.md，並核對 Draft PR #1 最新 HEAD 和同 SHA CI。再讀 modern/docs/reviewed-original-sparse-market-init.md、modern/docs/migration-progress-and-next-milestones.md。接續第三十七階段的來源驗證與實際程式開發。B-36 只啟用 ITEM #1/#10/#40 的來源 PLUS，其他76項是人工0；優先逐筆盤點真正標準街所有非零 PLUS，核對原版編譯結果、同一時間片順序與亂數，再擴充嚴格來源 Perl／Node 對照，禁止直接宣稱完整市場；不得推測未驗證規則。原版 Core/CGI/DSL、main、migration/standard-street-s1 不得更動，Draft PR #1 不得合併；原版異常只記錄，不擅自修正。完成後必須跑同 SHA Node／Perl CI，更新 PR 與 Notion 02／04／05 和進度文件。全程繁體中文回報，可直接開始實作，不需先重述長歷史。
```

**分窗建議**：在本輪 B-36 文檔與 CI 同 SHA 完成後，直接另開**同一個 ChatGPT 專案的新聊天視窗**，貼上上段提示。**舊窗保留只讀作歷史紀錄**；不要兩個視窗**同時**往相同分支推送修改，否則會產生覆寫／測試 HEAD 不一致的風險。
