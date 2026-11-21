# B-38｜原版自然銷售區段 → 全59項 PLUS 的受控跨語言對照

> **本階段並未執行完整原版 `inc-turn.cgi`。** 實際抽取並執行固定原版自然銷售區段（原 `inc-turn.cgi`「店舗・商品別来客數計算」起至「@@item 処理準備」前），然後**跳過**原版中間的 FUNCTURN／FUNCSALE 商品回呼、`SortDT` 與可能的 `inc-period.cgi` 決算，再執行原版 `inc-turn.cgi` 的全部59項 PLUS 原文迴圈及完整 `plug/whole.cgi::CheckWholeStore`。因此它是兩段原版數值函式的**受控相接測試**，不能當成一個已實作的真實營業週期。

## 來源、必要修正與不變條件

- 原版 `inc-turn.cgi` Blob `b8a4980275f475a952846a8d6072fad45f8dff50`；`plug/market.cgi` Blob `1aca77e9b373c25e53e445d64c101a7cc2246825` 的 `GetMarketStatus`；`plug/item.cgi` Blob `b39400d7dc0ab80062c392ae2bbc923e24ecacf8` 的 `GetSaleTax`；新增固定原版 `plug/detail.cgi` 原樣快照 `core-detail.cgi`，Blob `9a83d26fb29edee4032958f1e6de837a250f3384`，使用原函式 `GetUserTaxRate`。原版 `inc-makeitem.cgi` `GetTime/GetBuffer` 用於比對商品 #10 的標準價格、人氣、熱門度及維持費，原版商品 #79 的維持費。
- 原有19份原版 Core 快照**完全不改**；新增第20份 `core-detail.cgi` 原樣來源並加入 GitHub Actions `git hash-object` 檢查。原版兩份 DSL、main 與 migration base 不更動。
- **修正的是隔離測試器，不是原版遊戲公式：** B-33 原先為了單項 USE 只將 `code/name/scale/limit/wslimit` 放進測試用 `@ITEM`，**沒有存 `price`**。B-38 初次把它直接用於自然銷售時，原版標準價成了0而導致售量判斷失真；現改由真正固定 `inc-makeitem.cgi::GetBuffer` 重新核對、注入 `ITEM #10 price=5000`，也核對 `pop=20d`（1728000秒）、`point=200000`、`cost=100` 及 #79 `cost=10`。沒有修改原版 Perl 自然販售數學或 RNG 門檻。
- 設定來自固定 `_config.cgi`：`SALE_SPEED=12`、`POP_DOWN_RATE=5`、`MAX_USER=50`；人口使用 B-34 來源初值 `DTpeople=500000`，同世界只有一間新店，原版稀疏批發 CSV 起點空白。來源世界時鐘固定1000000，單一後續時間片 **1728秒**（受控數值，使本次來源維持費恰好為整數1，能保留在 B-31 JSON-safe WorldState）。
- 來源固定的 `rand` 被隔離 Perl 測試器攔截成0至999999的單位百萬分位整數抽樣。自然銷售直接消耗同一份抽樣序列的前綴；再把**尚未消耗的部分**依原樣交給 B-37 全商品 PLUS。不是兩次各自亂數種子，也不是聲稱 Node 和 Perl PRNG 相容。

## 兩條明確區分來源的驗證案例

| 驗證 | 真正原版新店（空展示架） | 額外人工 #10 測資 |
| --- | ---: | ---: |
| 初始商品狀態 | #63 工具1、#79 禮物卷5 | 上述真初始商品，再**人工**加 #10 書本寫作工具1個 |
| 展示架 | 原版新店空展示架 `[0]` | **人工**展示 #10，標價5000 |
| 自然銷售 | 0個 | #10 售出1個 |
| 本段後現金 | 100000 | 105000 |
| 本段後人氣 `rank` | 5009 | 4915 |
| 本段 `costtoday`、`trush` | 1、1 | 1、5001 |
| 本段自然銷售消耗 `rand` | 0次 | 3次 |
| 自然銷售＋全項 PLUS 總消耗 | 72次 | 75次 |
| 最終稀疏批發已定義槽數 | 60個 | 60個 |

兩例都直接執行同一段原版市場供貨迴圈：真正59項有 PLUS、20項缺省為0，最後執行一次全79商品上限檢查。直接原版 Perl 輸出的**全部79項批發數值、原始 CSV、稀疏 definedness、亂數消耗數量**與 Node 相符。測試世界在命令成功後 `revision 2→3`；`nowSeconds` 未更新。失敗／超額亂數／來源漂移／版本衝突不提交。

**人工 #10 庫存是獨立的測試注入。** 目前並沒有把「向市場進貨、取得 #10、正式上架」串成玩家可執行交易。此人工測資只用於驗證原版自然販售區段真的會售出、更新金錢／`saletoday`／`itemtoday`／`taxtoday`／人氣／`trush`，並把來源 `_sale_count_` 留在尚未執行 FUNCSALE 的狀態，不偽裝成完整回呼流程。

## 本輪實作與尚未完成

- `modern/src/original-natural-sale-plus.mjs`：嚴格來源審閱、單店空展示架或明確人工 #10 測資、共用亂數序列、受控源碼片段銜接、CAS 市場結果。
- `modern/tests/original-perl/OriginalNaturalSalePlusHarness.pm`：直接抽取固定原文自然銷售區段，使用已鎖定 `GetMarketStatus`、`GetSaleTax`、`GetUserTaxRate`，並在跳過回呼／排序／決算後執行 B-37 原版59項 PLUS 原文。測試器來源載入在 Perl `main` package，避免誤裝載到測試套件命名空間。
- `modern/tests/original-perl/original-natural-sale-plus.t`、`original-natural-sale-plus-probe.pl` 與 `modern/tests/original-natural-sale-plus.test.mjs`：正面自然販售／原版來源對照、源碼漂移、失敗不修改世界。 `npm run demo:original-natural-plus` 納入 CI。
- 程式同 SHA `b89f644b53e892066d431d17fbbf11309d4d3621` 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/44874943493)、[PR CI](https://github.com/Prysline/akimono/actions/runs/44874947974) 都 success：**799／799 Node、1106／1106 真正原版 Perl（31個 `*.t`）**；原有19份 Core 加新增1份 Core detail 全部 SHA 不變，兩份標準街原始 DSL audit 通過。後續文件提交 HEAD 仍須再核對相同 SHA 的兩條 CI。

**沒有完成：** 自然銷售與 FUNCSALE/FUNCTURN 回呼真的接在同一原版週期、跨店排序、跨期決算、遊戲時鐘與人口變更、事件、真正商品取得／市場進貨、完整世界磁碟存讀與鎖／回滾、登入／HTTP／繁體中文 UI、多玩家或第二街道。Notion 02／04／05 仍進行中，不能用測試數量推論遊戲完成率。

**B-39 建議：** 先挑一個真實 `FUNCSALE` 或 `FUNCTURN`，逐筆審閱原版商品編譯、目標店家、回呼參數與原版迴圈，在獨立受控測資中驗證自然販售之後、全項 PLUS 之前的真實接合；另一條並行路線是原版批發／購買 #10 的真交易入口，需有獨立 Perl 來源及持久化界線。
