# 《商人物語》標準街 Node.js 移植｜**新對話接力交接**（B-41）

> **用途**：使用者換聊天視窗後，新的助手只需先讀這份精簡可核對的 GitHub 文件，再依目前遠端 HEAD 核對後續工作。**不要**從舊聊天記憶推論最新狀態，也不要把文件內的 CI 數字視為未來 HEAD 的保證。

## 2026-11-21｜B-41 最新交接：真 #10 上架、來源自然販售與本機快轉

**已寫入工作分支，仍須以最終 HEAD 的 Push／PR 同 SHA CI 確認。** B-40 的真市場進貨已在同一記憶體 WorldState 上延伸至：初始化來源世界 → 開店 → 原版 59 項 PLUS 供貨子步驟 → 實際購得商品 #10（價格 5,000 G） → 倉庫使用現有 `edit-showcase` 合法第 1 架上架（單價 5,000 G、原版行動時間 600 秒） → 在店內快轉 1～60 分鐘，執行已審閱的原版自然販售區段，接著原版 59 項 PLUS／CheckWholeStore，並在同一個 CAS 世界提交資金、商品、人氣、今日銷售、供貨與 `nowSeconds`。**沒有人工灌入 #10**；原版 Perl 測試直接用 `buy-s.cgi` 與 `sc-s.cgi` 原始程式再接真 `inc-turn.cgi` 來源銷售片段。見 [B-41 完整對照、驗收與保留限制](b41-real-market-showcase-natural-sale.md)。

**使用者要求的快轉已加在現有原版風格介面**（`自店 > 店內`），有 **1／10／30 分鐘與 1 小時**快捷、**自填 1～60 分鐘**。不更動 B-40「交易」主選單／表格緊湊樣式；原版來源是依「秒數 `$timespan`」而非固定列舉選項執行，所以 1／10／30／60 是 UI 操作便利值，**不是冒稱為原版限定選單**。每次最多60分鐘，跨未實作的36小時結算邊界拒絕，不暗中跳過結算。此前 B-40 單獨「供貨子步驟」仍獨立，不推進時鐘。

**現況邊界：** 新 B-41 動作僅單店、商品 #10、合法原價架位、記憶體世界；銷售是否發生依原版抽樣，不保證每片都有成交。來源檢驗的正向測資為 30 分與 60 分；現有 GameCore 可保留原版 `costtoday` 小數，但正式期末結算尚未驗收。固定原版商品 DSL／Perl／Core 20 份、main、migration 均不可修改。沒有執行 FUNCSALE／FUNCTURN 通用回呼、跨店排序、跨期 `inc-period.cgi`、存讀檔、認證或多人；**此限定來源片段並非完整原版 `inc-turn.cgi` 真營業週期，也不代表已通用化的可玩閉環**。

**下一個 B-42 優先工作：** 以 B-41 已能在原版風格 UI 完成的真 #10 進貨／上架／販售為基礎，先解除「賣出一件後仍可繼續經營」的來源審查限制，依必要原版回呼及轉場順序補足可連續兩輪營業與期末結算；再完成可靠單機落盤、關閉服務重啟／載入後繼續經營。不可倒退成只做孤立 Perl 測試。按此文件、[優先序計畫](playable-loop-priority-plan.md)與最新版 HEAD 的真 CI 繼續，所有正式任務狀態維持現狀。

## B-40 使用者 UI 回饋與已提交的視覺修正（2026-11-21）

使用者在 Windows 實測時指出 B-40 灰綠 dashboard 卡片配色與實際原版《商人物語》印象差異過大，並要求直接 commit 以便預覽。已直接在 `test/task02-baseline-on-s1` 重排 `modern/local-ui/index.html`／`style.css`／`app.js`：以固定 `sindex.html`、`smain.html`、`custom/inc-menu.cgi` 為依據，恢復「自店／取引／情報／施設／交流」主選單及次選單、白底淡紫白表格、淺綠標題、淺黃選取提示、緊湊店舖資訊；世界 ID/revision/收據改成可展開的測試區。僅店內、倉庫、真市場進貨 #10 開放操作，其他分類與功能停用且如實顯示；未複製任何原始圖片或音樂。原版 Perl/DSL／GameCore／市場來源與交易 API 均未修改。HTTP E2E 已調整檢查選單、CSS 與真交易，詳細參考 [原版介面與 B-40 視覺修正](original-ui-reference-for-local-test.md)。

**下一步：** 先讓使用者在本機 `cd modern && npm run dev:local` 實際預覽，確認色彩與資訊配置；若有他的歷史伺服器截圖以截圖優先作局部修正，再依原計畫 B-41 在相同原版風格 UI 開發真正上架／自然販售。仍保留 Draft PR #1，不合併、不可修改 main/migration；只採用最新 HEAD 雙 CI 作回歸證據。Windows CRLF 讀取修正亦保留。

## B-40 後續修正｜Windows 原版來源 CRLF 啟動相容

Windows Git 的 `core.autocrlf` 可能使固定原版 CGI/DSL 在工作目錄成為 CRLF，B-34 仍以 `sub init\\n` 原版 LF 字串逐字核對，導致 `npm run dev:local` 啟動時在 `reviewOriginalSparseWorldBootstrap` 報 `fixed admin init source drift`。已在 `modern/src/local-source-text.mjs` 建立僅針對本機讀取結果的 CRLF→LF 正規化，`modern/scripts/dev-local.mjs` 對12份 CGI／DSL 來源輸入套用；禁止孤立 CR，原始檔、SHA、規則、審閱守門及分支沒有更改。新增 `modern/tests/local-source-text.test.mjs` 模擬 Windows 12份來源，實際核對可初始化真 StreetModule／GameCore 與開店；竄改原版內容仍然拒絕。

Windows 工作樹請先確認 `git status --short`，在 `test/task02-baseline-on-s1` 執行 `git pull --ff-only origin test/task02-baseline-on-s1`，再 `cd modern && npm run dev:local`。**不要重設工作樹、不要修改固定 CGI 來排除這個錯誤。** 手動／CI 詳情見 [B-40 本機操作文件](b40-local-browser-market-buy.md)。下一 B-41 上架→自然販售優先序不變；每次驗證以最新 HEAD Push/PR 同 SHA CI 為準。

## 2026-11-21｜B-40 最新開發交接（以下取代本檔 B-39 的「下一個 B-40」舊描述）

**新增加的真正玩家動作：** 在 Node 本機伺服器開啟 [可操作繁中介面](../local-ui/index.html)，經「初始化原版空白來源世界 → 開店 → 原版59項 PLUS 供貨子步驟 → 市場購買商品 #10 書本寫作工具 → 查看同一世界現金、倉庫與批發更新」。店內、市場、倉庫三頁籤由 [dev-local.mjs](../scripts/dev-local.mjs) HTTP API 接至 [GameCore／StreetModule／WorldState](../src/standard-street-module.mjs)，不是獨立 JSON demo，未實作功能停用。詳細 [B-40 執行／成功與拒絕操作、來源 Perl／Node 檢驗](b40-local-browser-market-buy.md)。

- 本機：`cd modern && npm run dev:local`，`http://127.0.0.1:4173`（僅 127.0.0.1）。Node 22+，關閉 Node 服務即失去世界；目前沒有正式存讀檔。
- 新來源審閱交易模組 [original-market-buy10.mjs](../src/original-market-buy10.mjs) 唯一開放 `buy-market-item-10`：商品 #10 原版 DSL 價格5000、持有上限20／每店批發上限10、單次市場交易時間600秒、原版可成交量縮減，以及商品／金錢／支出／行動時間／批發 sparse CSV 的單次 CAS 變更。別店、其他物品和 callback 尚未開放。
- 原版供貨不是人工插入：保留 B-34 初始市場空 CSV，經 B-37 真 `PLUS` + `CheckWholeStore` 抽樣運算，提供 60、600、3600 秒的**獨立來源子步驟**。**不**推進 WorldState 時鐘、不做自然販售／完整決算。隨機抽樣不是聲稱可重現 Perl 的 RNG 序列。
- [原版 Perl 的 buy-s.cgi 執行探針](../tests/original-perl/original-market-buy10-probe.pl)、[Node 回歸及實際本機 HTTP E2E](../tests/original-market-buy10.test.mjs) 核對無貨拒絕、有貨成交、扣款、庫存、批發、CAS 及可從 HTML 操作的 API。每次仍**必須依最新 HEAD 的 push/PR 同 SHA CI 結果**判斷是否完成驗收；不要用較早 B-39 CI 或中間紅燈／綠燈代表最終狀態。
- 正式任務 02／04／05 仍在進行中；此階段未完成商品完整 USE／自然販售／真正原版週期、CGI、認證、磁碟持久化、多人。原版20份 Core source SHA 和 DSL、main、migration 底分支保持不修改；Draft PR #1 保持開啟且不得合併。

**下一個玩家操作優先 B-41：** 使用本機介面內真購得的 #10，依來源現有 `edit-showcase` 及 B-38 reviewed natural-sale 投射路徑，在相同 WorldState 連接「庫存真上架 → 自然販售 → 現金與庫存變更」；只補阻擋這條鏈的原版必要回呼與時鐘處理。接著依順序接「完整週期結算 → 可重啟讀取的單機存檔」。不要回去做 B-40 以外零散原版細節。

## 最新工作界線

- GitHub repo：**`Prysline/akimono`**。
- 正式工作分支：**`test/task02-baseline-on-s1`**；Draft PR [#1](https://github.com/Prysline/akimono/pull/1)，base **`migration/standard-street-s1`**，**不得自行合併、不得改成 Ready for review**。此分支是唯一要接續的實作位置。
- 固定原始主分支 `main` 的已核對 SHA 為 `7301b0c2b1e27226d1770e153fa3c68cfeae6d48`；固定底分支 `migration/standard-street-s1` 已核對 SHA `585c77ba247510bcf3f22cf24c0c277b68d7d5a4`。**不得修改**原始 `main`、遷移底分支、原版 Core/CGI、`custom/inc-item-data.cgi`、`custom/inc-rebel-data.cgi`。
- 固定上游 Core：`katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`；兩份街道 DSL 固定 Git Blob SHA：商品 `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`、叛亂 `923634e58a05beca9ab004515fc7669d53a1ba3a`。
- `modern/tests/original-perl/` 已鎖定**20份來源原樣 Core 快照**（原18份＋B-34 原始管理員 `core-inc-admin-func.cgi` Blob `2164b7e5abfea7a466235a8deba1543c2cc41515`＋B-38 固定 `core-detail.cgi` 原版 `plug/detail.cgi` Blob `9a83d26fb29edee4032958f1e6de837a250f3384`）；GitHub Actions 逐份以 `git hash-object` 核對。
- 正式 Notion 12 任務：**01已完成；02、04、05進行中；其餘8項待辦**，非遊戲完工比例。任務02： https://app.notion.com/p/41db4185273f818f97d4fce172db36f8 ；任務04： https://app.notion.com/p/41db4185273f81288606d7d5a4375794 ；任務05： https://app.notion.com/p/41db4185273f812ea949dfcaf7c2def9 。

## 已真正實作與驗證的核心路線

1. B-01～B-30：原版商品上限、原版世界欄位與鎖／備份／寫入、原版市場／批發／時間／商品交易核心數值、部分原版回呼／實際 Perl 隔離；原版異常只記錄 [`original-behavior-issues.md`](original-behavior-issues.md)，**不可偷偷修復**。
2. B-31：純記憶體 `GameCore/StreetModule/WorldState`，嚴格 `revision`、`compareAndSwap` 與 JSON 快照，`standard-street` 最早只支援 `open-shop` 和 `edit-showcase`；不是真正磁碟／資料庫／多人遊戲。
3. B-32：人工A/B/C商品的來源 Perl `UseItem → lostbook` 連續兩次交叉驗證，**不代表**真實標準街 ITEM #1/#2/#3。
4. B-33：第一筆**真正**標準街 `ITEM #79 gift 禮物卷 / USE.no=0 交換地圖集`：消耗2張禮物卷，產出 ITEM #12 山區地圖、#9 礦山地圖、#14 劍市地圖各一張；固定原版編譯器 `ItemUseTimeRate=0.5` 令原始 `time 1h` 編成 `time/exptime=1800秒`，無自訂回呼、無熟練度、無金錢成本。原版商品上限79項已跨語言核對。當時因市場未驗證，僅限**明示人工批發全0**測資。
5. **B-34：** 追查到固定 Core `inc-admin-func.cgi::init` 第一次建立世界資料時，**批發庫存第三行是空字串**，而不是79個明文0；`inc-func.cgi::DataRead` 的 Perl `split` 得到**長度0稀疏陣列**。新 `original-admin-world-bootstrap.mjs` 只有在明確提供**原版管理員、讀取、寫入三份原文**且來源結構一致時，才允許對**空世界 `revision=0`** 執行選用 `initialize-source-market` 命令。它保存 `originalWholesaleCsv=''` 和 `sparseWrittenSlots=[]`，另外保留79格供數值運算的0視圖。B-34 使用真正原版 Perl `print DATA time()...` 子句（只在 scalar 記憶體把手執行，不跑整個 admin init）及完整原版 `UseItem` 核對後，將來源市場真正接到 B-33 的 `gift-exchange-maps`：在空世界初始化、真實標準街開店、連續兩筆交換後，庫存禮物卷 `5→3→1`、三種地圖各 `0→1→2`、世界版號 `0→1→2→3→4`。原版批發陣列只賦值位置78時，`DataWrite join` 文字是**78個逗號＋末尾一個0**，不是79個字面0；超限地圖會另寫位置8、11、13。詳見 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)。
6. **B-35：** 對已來源核對的 B-34 初始稀疏市場，實作**限定商品 #10 `book-make` 的 PLUS 20m**；Perl 真正抽取固定 `inc-turn.cgi` PLUS 原文迴圈、只把其他商品 PLUS 設為明示測試0，並直接呼叫完整固定 `whole.cgi::CheckWholeStore`。來源人口500000、MAX_USER=50、單一真新店、亂數抽樣由外部提供；三個受限後銷售時間片 `60/60/600秒` 的商品 #10 批發 `0→1→2→10`，記憶體版本 `2→3→4→5`。商品 #79 原版限額修正額外明確寫下索引78的0，證實稀疏CSV只定義索引9和78。**完整其他商品 PLUS、自然銷售／回呼／時間流逝／決算皆未執行**。詳見 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)。
7. **B-36：** 保留固定原版 `inc-turn.cgi` 的**完整 PLUS 迴圈原文片段**及 `plug/whole.cgi::CheckWholeStore`，在 B-34 空白稀疏市場與一間真實標準街新店上，只啟用三個固定來源商品：#1 藥草 `-20m`、#10 `book-make +20m`、#40 木刀 `-1h`。**其餘76項原版 PLUS 明示人工設0**，不是完整原版週期。原始 `DTpeople=500000`、`MAX_USER=50`，亂數百萬分位外部注入；三段來源時間片 `60/60/600` 秒讓商品 #10 批發 `0→1→3→10`，#1/#40 扣到負數後依原版 `CheckWholeStore` 歸0。批發 CSV 稀疏寫入索引 `[0,9,39,78]`，其餘空槽不補成0。另有**明示人工正庫存**的獨立扣貨 fixture 證實 #1 `20→19`、#40 `10→9`，不可誤稱是真實開服市場。Node `reviewed-sparse-multi-plus` 支援三筆 CAS 版本 `2→3→4→5`；沒有更新真世界時鐘、銷售、回呼、事件或持久化。詳見 [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)。
8. **B-37：** 固定標準街 DSL 共79 ITEM，依專案 `parseDsl` 與原版 `inc-makeitem.cgi::GetTime` 核對 **59項有 PLUS、20項無 PLUS 而由編譯器預設0**；初次快速掃描漏掉 #16「皮革加工入門」、#17「木工加工入門」的 `PLUS 20h`，現已訂正並納入79格固定來源清單。真原版 Perl 直接編譯59項，執行固定 `inc-turn.cgi` 原文 **PLUS 迴圈**及完整 `whole.cgi::CheckWholeStore`；Node 選用命令 `reviewed-sparse-all-plus` 必須另外提供並核對固定原版編譯器才開啟。真原版管理員批發初始空白 CSV、單間標準街新店、人口500000／MAX_USER50；三段受控後銷售時間片60／600／3600秒及明示 `rand` 消耗，全部79數值欄、**60個有定義的稀疏欄位**與 Perl 原文 CSV 逐項一致。#10 首60秒0→1，後續受上限10約束；`revision 2→3→4→5`，世界時鐘、商店與事件不更新。另有商品 #79「交換地圖集」先交易、後接全商品 PLUS 的受控整合測試。**未執行前段自然販售、回呼、完整時間／結算／CGI／檔案／多人**。[B-37來源與限制](reviewed-original-sparse-all-plus.md)。
9. **B-38：** 固定原版 `inc-turn.cgi` 的「店舗・商品別来客数計算處理」至「@@item 処理準備」前**自然販售原文區段**，直接執行固定原版 `plug/market.cgi::GetMarketStatus`、`plug/item.cgi::GetSaleTax` 與新增20th不改原文 Core 快照 `plug/detail.cgi::GetUserTaxRate`（Blob `9a83d26fb29edee4032958f1e6de837a250f3384`），然後**跳過**原版商品 FUNCTURN/FUNCSALE 回呼、`SortDT`、期末決算，再執行真正原版59項 PLUS 迴圈及完整79項 `CheckWholeStore`。**這是隔離的兩個來源區段串接，不是真完整週期。** 在真原版管理員初始空白批發、人口500000／MAX_USER50、只有一間新店、1728秒人工時間片下，真新店空展示架：售0、金錢100000、人氣5009、共消耗72筆 rand。另**人工**新增 #10 書本寫作工具1個且以5000上架（**沒有真的執行購買或入庫**）：原文販售確實售1、金錢105000、人氣4915、當期售額5000、稅0、`trush=5001`，自然銷售3筆 rand 再接 PLUS 72筆 rand，合計75筆；兩個案例最後稀疏市場60格定義，Perl／Node 的79格 CSV 和世界狀態一致。重要測試器根因：B-33 `OriginalGiftMapUseHarness` 只留 `code/name/scale/limit/wslimit`，不含 `price`；B-38 已由原版 `GetBuffer` 編譯 `ITEM#10 price=5000`、`pop=20d`、`point=200000` 與維持費，**不是修原版公式**。詳見 [B-38 來源與限制](reviewed-original-natural-sale-plus.md)。
10. **B-39（最新）：** 在原版固定標準街79 ITEM 中，**僅 #70 那由多的項鍊**宣告 `funct _local_`：標準價50000、`pop 2d`、`point 20000`、持有成本200、`PLUS=0`、批發限額0。隔離 Perl 直接使用**真正原版行內 callback 主體**，再由固定 `inc-turn.cgi` **原版 FUNCTURN 逐項派送迴圈**選擇持有商品的店家；只有第一展示架 #70 且售價不高於50000才加人氣，依 `TIMESPAN/86.4` 取整或以原版 rand 進位，上限10000。獨立來源測試：60秒 rand0→+1、999999→0，標價50001不加，初始人氣9980→10000。新來源固定8640秒人工時間片（B-37 對外原有最長3600秒**不變**）在單店依原版自然銷售→真 FUNCTURN→原版59項 PLUS／全79項上限：真新店空展示架售0、人氣5007、成本5、rand60次、稀疏市場60格有定義；**人工增加1件 #70 並以50000上架**、以明示rand保留庫存後，原版自然人氣5007再由回呼+100至**5107**、成本7、總 rand61次、稀疏市場61格有定義。Perl/Node 79欄批發、CSV、財務與亂數對照一致。**跳過其它商品回呼、FUNCSALE、SortDT、結算、真進貨、真時間、磁碟與CGI**。見 [B-39 原文測試與界線](reviewed-original-nayuta-functurn.md)。
11. **程式驗證 HEAD** `0265bd0a632b6567ebbfbfd33e9ff6c27f15fcd3`：[push CI](https://github.com/Prysline/akimono/actions/runs/44878580737)、[PR CI](https://github.com/Prysline/akimono/actions/runs/44878586451) **同 SHA success**，**807／807 Node、1138／1138 原版 Perl（32個 `*.t`）**，20份 Core Blob SHA、2份 DSL audit 均成功。**文件後續 HEAD 必須重新核對同 SHA 的兩份 CI。**

## 讀檔順序（新對話必做）

在新的對話中使用**已連接的 GitHub App／工具**，依序查看：
1. [Draft PR #1](https://github.com/Prysline/akimono/pull/1)（**讀回最新 head_sha、draft、merged、base**）與 [本交接文件](next-window-handoff.md)。
2. [`reviewed-original-nayuta-functurn.md`](reviewed-original-nayuta-functurn.md)（B-39）、[`reviewed-original-natural-sale-plus.md`](reviewed-original-natural-sale-plus.md)（B-38）與 [`reviewed-original-sparse-all-plus.md`](reviewed-original-sparse-all-plus.md)（B-37）與 [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)（B-36）與 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)（B-35）與 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)（B-34 來源初始化）；[`reviewed-real-gift-use.md`](reviewed-real-gift-use.md)（B-33 真商品）；[`migration-progress-and-next-milestones.md`](migration-progress-and-next-milestones.md)（正式里程碑）。
3. [`original-nayuta-functurn.mjs`](../src/original-nayuta-functurn.mjs)、[`original-natural-sale-plus.mjs`](../src/original-natural-sale-plus.mjs)、[`original-sparse-all-plus.mjs`](../src/original-sparse-all-plus.mjs)、[`original-sparse-multi-plus.mjs`](../src/original-sparse-multi-plus.mjs)、[`original-admin-world-bootstrap.mjs`](../src/original-admin-world-bootstrap.mjs)、[`reviewed-gift-map-use.mjs`](../src/reviewed-gift-map-use.mjs)、[`standard-street-module.mjs`](../src/standard-street-module.mjs)、[`game-core-contract.mjs`](../src/game-core-contract.mjs)。
4. [`OriginalNayutaFuncturnHarness.pm`](../tests/original-perl/OriginalNayutaFuncturnHarness.pm)、[`original-nayuta-functurn.t`](../tests/original-perl/original-nayuta-functurn.t)、[`original-nayuta-functurn.test.mjs`](../tests/original-nayuta-functurn.test.mjs)，以及 [`OriginalNaturalSalePlusHarness.pm`](../tests/original-perl/OriginalNaturalSalePlusHarness.pm)、[`original-natural-sale-plus.t`](../tests/original-perl/original-natural-sale-plus.t)、[`original-natural-sale-plus.test.mjs`](../tests/original-natural-sale-plus.test.mjs)，以及 [`OriginalSparseAllPlusHarness.pm`](../tests/original-perl/OriginalSparseAllPlusHarness.pm)、[`original-sparse-all-plus.t`](../tests/original-perl/original-sparse-all-plus.t)、[`original-sparse-all-plus.test.mjs`](../tests/original-sparse-all-plus.test.mjs)，以及 [`OriginalSparseMultiPlusHarness.pm`](../tests/original-perl/OriginalSparseMultiPlusHarness.pm)、[`original-sparse-multi-plus.t`](../tests/original-perl/original-sparse-multi-plus.t)、[`original-sparse-multi-plus.test.mjs`](../tests/original-sparse-multi-plus.test.mjs)；原有 [`OriginalSparseWholesalePlusHarness.pm`](../tests/original-perl/OriginalSparseWholesalePlusHarness.pm)、[`original-sparse-wholesale-plus.t`](../tests/original-perl/original-sparse-wholesale-plus.t)、[`original-sparse-wholesale-plus.test.mjs`](../tests/original-sparse-wholesale-plus.test.mjs)，以及 [`OriginalAdminBootstrapHarness.pm`](../tests/original-perl/OriginalAdminBootstrapHarness.pm)、[`original-admin-sparse-market-probe.pl`](../tests/original-perl/original-admin-sparse-market-probe.pl)、[`original-admin-sparse-market.t`](../tests/original-perl/original-admin-sparse-market.t)、[`original-admin-sparse-market.test.mjs`](../tests/original-admin-sparse-market.test.mjs)。
5. GitHub Actions **同 SHA 的 push / PR 兩份 CI**、`modern/package.json`、`verify-modernization.yml`，確認既有測試與所有20個 Core source SHA、兩份 DSL audit 完全成功，再開始新的修改。

## 原版 UI 參考與後續實際操作驗收

**使用者補充：可參考原始介面。** 先讀 [原始標準街介面來源與 B-40 測試 UI 對照](original-ui-reference-for-local-test.md)：已核對標準街 `sindex.html`／`smain.html`／`custom/inc-menu.cgi` 與固定原版 Core `inc-main.cgi`／`stock.cgi`／`shop-m.cgi`／`sc-s.cgi`。B-40 本機繁中測試 UI 優先保留原版自店／市場／倉庫選單、店內金錢／人氣／時間資訊、商品價格／可購量／庫存與架位操作；改善表格可讀性，不直接復用無授權圖片或舊 CGI 密碼/憑證。後端資料與功能仍以原版來源驗證及真 Game Core 命令為準。

## 現行工作順序：先完成可玩的經營閉環

**以 [現行工作優先序與最小可玩閉環](playable-loop-priority-plan.md) 為後續開發優先依據。** 使用者已明確要求「紀錄應有的順序和工作規劃，不要老是追究小細節」。**下一輪 B-40 必須同步建立實際可啟動的繁體中文本機瀏覽器測試介面與真正進貨，讓使用者可以點選操作、觀察扣款／庫存／市場、查看失敗原因**；後續在同一 UI 逐步加上上架／販售、必要回呼與結算、真存檔，最後整理正式繁中網頁，再做麵店和多人。原版 Perl／Node 比對照舊，但僅擴張足以驗證當前功能的規則；不再只為了另一項函式或斷言數而開新階段。

## 歷史紀錄：B-40 開始前的精確目標（已進入程式階段，最新狀態見本檔開頭）

B-39 已有真正 ITEM #70 FUNCTURN 回呼的原文隔離驗證，不是玩家可以自行購買的完整遊戲。**B-40 第一優先是可啟動的本機測試 UI＋原版真市場進貨 ITEM #10**：以固定 `buy-s.cgi`／市場與批發來源實際完成付款、購買、庫存更新，接現有 `WorldState`，並驗證至少一筆成功與拒絕路徑。完成後直接把真庫存接展示架與自然販售。**本輪必須有實際可執行的啟動指令（規劃 `npm run dev:local`）、瀏覽器網址與手動成功／拒絕測試步驟，並把畫面資料接真 Game Core／WorldState；不能只有 JSON demo 或測試輸出。** 原版市場初始若沒有 #10 貨源，必須先經合法供貨來源才能購買，不得灌入人工貨源。**只在目前真閉環必要時**才補 FUNCSALE、SortDT 或期末結算；其餘未相關回呼、事件／115 USE 暫不擴大。不更改原版來源／分支、維持双 CI；不能因測試固定秒數、人工庫存就聲稱可玩。

**未完成且不得聲稱已完成：** 所有商品使用、完整週期／市價／自動販售、真正磁碟讀寫／鎖／備份／回滾、密碼認證、HTTP、繁體中文可玩前端、其他街道、多人世界。所有 B-39 `WorldState` 操作仍只在**記憶體**中，初始化命令並非真實玩家行為或安全的原版遊戲管理操作。

## 新視窗起手提示（B-41 起直接複製）

```text
繼續《商人物語》標準街 Node.js 現代化。先連接 GitHub 的 Prysline/akimono，讀取 test/task02-baseline-on-s1 最新 HEAD、Draft PR #1 的 Push／PR 同 SHA CI，優先閱讀 modern/docs/playable-loop-priority-plan.md、modern/docs/original-ui-reference-for-local-test.md、modern/docs/next-window-handoff.md 及 modern/docs/b40-local-browser-market-buy.md。B-40 已在同一 GameCore／StreetModule／WorldState 加入真正商品 #10 市場進貨和可執行繁中本機 UI：cd modern && npm run dev:local，瀏覽器 http://127.0.0.1:4173；若 CI 紅燈先修正，不把失敗當成功。B-41 起直接擴充同一個 UI 的真上架→自然販售，使用上一步真正買到的商品庫存。再完成週期結算與可重啟的單機存讀檔。不要以獨立 JSON demo、人工貨源或拆散的測試取代操作閉環；尚未完成的功能必須明確停用。B-37 真 PLUS 目前只是抽樣供貨子步驟，不得假稱有真時鐘或完整週期。只在目前玩家路徑需要時補原版回呼、SortDT 等細節，原版 Perl／Node 比對與 Push／PR 雙 CI 繼續跑。main、migration/standard-street-s1、固定 Core/CGI/DSL 不修改，Draft PR 不合併；更新 GitHub 文件與 Notion，提供可實際操作的繁中成功／拒絕步驟。
```

**本檔先前 B-39 數值、CI、B-40 開發要求為保留的歷史紀錄；以最新遠端 HEAD 和本檔開頭的 B-40 交接為準。**
