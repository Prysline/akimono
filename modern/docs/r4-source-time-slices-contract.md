# R4-B｜凍結原版 36 小時時間片與 Perl 差分（2026-11-23）

**受控進展，不是 R4 完成宣告。**

- 新增 `src/original-r4-time-slices.mjs`：核對原版 `_config.cgi` 的 36h 週期與 JST／期末偏移，以及 `inc-turn.cgi` 的 `@timespan` 原始順序；只計算前後時間及期末旗標，不執行或假造 `SortDT`、結算、PLUS、EVENT。
- 新 Perl Oracle `original-r4-time-slices-probe.pl` 從**凍結 inc-turn.cgi 原文直接擷取並執行**時間切割區塊，對 9 組時間輸出原版 raw `[dateupdate,timespan]`，包含零尾段、恰好跨界、跨兩個以上週期。對應 `.t` 與 Node `r4-original-time-slices.test.mjs` 比較真正執行輸出；非人工 expected-values 假充差分。
- 來源的實際時間片順序：自然販售 → ITEM FUNCTURN → ITEM FUNCSALE → `SortDT()` → `RequireFile('inc-period.cgi') if $dateupdate && scalar(@DT)` → 59 PLUS／`CheckWholeStore` → EVENT 結束 → EVENT 開始 → NOWFUNC。每個時間片都需完整執行，**不允許合併後直接當普通快轉**。
- 本元件不是正式 WorldState 命令；原 R3 與 B-56 的未知期末／EVENT 仍 fail-closed。不把 Perl `keys(%EVENT)` 或 `keys(%DTevent)` 假設成 DSL 順序。B-44～B-50 期末子鏈為受控不提交 fixture，尚缺完整原版外部依賴與期末 CAS 整合。

**R4 剩餘退出阻塞：** 完整 17 EVENT 的原版鍵序與回呼／RNG，同期 `SortDT`＋`inc-period.cgi` 所需外部依賴、真跨期可提交多時間片、同世界自然販售／PLUS／EVENT／期末，以及真 HTTP 買入→USE→展示→多次營業→決算→雙世代保存→關服重啟的來源差分和雙 Actions 最終同 SHA 驗收。

不修改凍結原版 Perl、DSL、Core、其他分支或 Notion 正式任務；PR #1 仍須 Open／Draft。

**既有核心整合：** `original-b41-playable-sale.mjs::reviewB41Sale` 以凍結來源審閱時間切割順序，`projectSourcePreEventSaleSlice` 的跨期檢查改呼叫同一 `projectOriginalR4TimeSlices`。僅接受一個非跨期有效時間片；恰好到期、跨多期或來源漂移會在 WorldState 投影前拒絕。此更動不代表執行 `SortDT` 或期末，也不讓舊 B-41 後繼未知 EVENT 變成 `{}`。

## 2026-11-23｜R4-A 原版 EVENT Perl hash 遍歷 Oracle（受限）

新增 `original-r4-event-hash-order-probe.pl`：重用 B-53 直接執行凍結編譯器 `GetTime/GetNumber` 的 25 EVENT DSL 探針，取得編譯後 17 鍵；再從**凍結** `inc-makeitem.cgi::OutEventData` 擷取真正的 EVENT hash 初始化 Perl 原文，在 Perl 行程中執行。直接觀察 `keys(%EVENT)` 重複遍歷，以及明示人工已有 EVENT 三鍵資料的 `keys(%DTevent)`；新增原版 Perl `.t` 和 Node 多行程差分測試。

此工作包僅證明原版 EVENT 的編譯鍵集合、Perl hash 建立方式及真實鍵遍歷結果。不假設 Perl 不同行程 hash seed／順序固定，也不把測試取得的排列或 B-56 fixture 排列當成可泛用的原版順序。人工 `%DTevent` 三鍵**不是**真實遊戲的事件存續紀錄。尚未執行完整 EVENT 起迄／NOWFUNC、17 回呼與 RNG 效果，仍需來源整合後才能提交 WorldState；**R4-A 與整體 R4 尚未退出**。

## 2026-11-23｜R4-B SortDT 接入來源共用引擎（非完整回合）

已新增 `original-r4-sorted-pre-event.mjs`；核對凍結 `inc-turn.cgi` 中 `_sale_count_` 清理 → `SortDT()` → 期末 → 59 PLUS → EVENT 的相對順序。R3 唯一自然販售／ITEM 回呼在 R4 純投影路徑增加既有 B-47 `projectOriginalSoloSort`，其位置**確實在 PLUS 前**；既有 R3 與 B-56 預設執行仍維持原受限行為。直接凍結 `inc-func.cgi::GetDTPoint`、`core-detail.cgi::SortDT` Perl 原文 Oracle，並以合法市場進貨→上架→販售的同一世界比較 Node R4 排序、原版 shop 全欄、PLUS、RNG、未知事件拒絕及零變動。**本純投影不寫 `period`、不能提交正式完整回合，未支援期末或 EVENT。**

## 2026-11-23｜R4 SortDT 同世界事件 fixture 與動態人口 PLUS（來源局部）

1. **正確的 SortDT 位置：** `src/original-r4-sorted-pre-event.mjs` 使用真凍結 Core `GetDTPoint`／`SortDT`，R3 共享自然販售與 ITEM 回呼後、59 PLUS 前執行。Perl `original-r4-sorted-pre-event-probe.pl` 逐欄核對；Perl 的 `costtoday` JSON 輸出位數與 Node 不同，維持費以 1e-12 浮點序列化容差核對，其他欄位嚴格比較。
2. **EVENT 順序受控組合：** 既有 B-56 事件 fixture 可選擇 R4 真 SortDT 前段，對同一世界連接已審閱事件（仍需呼叫端提供合法 17 鍵排列）；它不是原版 Perl process hash 真實序列認證，不提供正式玩家 EVENT 通道。
3. **期末人口來源依賴：** 凍結 `inc-turn.cgi` 的 59 PLUS 使用 `$DTpeople`，不是永久固定初始 500,000。新增共用 PLUS `r4PeriodPopulation` 受控純投影、來源公式漂移檢查與明確拒絕未審閱人口；原版 Perl harness 只補可注入的 `dtPeople` 測試參數，未改凍結 `inc-turn.cgi`／`whole.cgi`。
4. **真差分：** `original-r4-dynamic-population-plus-probe.pl` 在人口 250,000／500,000／750,000、120 秒（#10 尚未上限飽和）直接執行 59 PLUS＋完整 `CheckWholeStore`，Perl `.t` 與 Node 比對 79 個市場欄位、原始 CSV、稀疏定義位與逐筆 RNG。這是純人口公式差分，**沒有捏造成功的期末 WorldState 或存檔**。

### R4 正式退出未通過的來源語義

- 17 EVENT：B-55～61 已審閱的 8 類效果／2 個 zero-start 受限來源測試仍依賴 fixture；尚缺 7 類來源事件 `boom-posyon`、`tate-sale`、`yoroi-sale`、`tue-sale`、`plusdown-yakusou`、`plusup-misuriru`、`plusup-oriharukon` 的完整生命週期／ITEM overlay；既存 `rebel`／`guildbattle` 作用與所有 START／END／NOWFUNC 的真 Perl hash 原序、RNG 仍需全程核對。
- 36h：B-50 是同狀態原版期末子鏈而非正式 WorldState，尚未把 SortDT、期末、城市人口與稅、PLUS、EVENT 逐片原序合成至可提交的跨期核心；雙世代存檔目前不授權已結算 period。
- 真 HTTP：目前缺少「買入→USE／製作→展示→多次營業→跨期決算→存檔→重啟繼續」的源碼等價驗收。**R4 不宣告結案，不移除跨期與未知事件的 fail-closed。**


## 2026-11-23｜R4-A：九種 EVENT ITEM PARAM 真原版編譯差分（受控純投影）

已新增 `src/original-r4-event-item-param.mjs`：從 B-53 已經直接與凍結 Perl `GetNumber/GetTime` 核對的 17 個編譯後 EVENT 中，建立**9 個有 ITEM PARAM 宣告的事件**之來源運算式清單。來源 ITEM 名稱經標準街 79 ITEM model 解析；不建立每個商品的專用回呼或硬寫固定市場結果。只支援原版 `inc-makeitem.cgi::OutEventData` 生成的 `price`、`pricebase`、`pricehalf`、`popular`、`point`、`plus` 數值變動；除法依凍結 Perl `int` 截斷。

**直接原版 Oracle：** `tests/original-perl/original-r4-event-item-param-probe.pl` 執行凍結原版 `GetItemNumber`、`GetString`、`GetNumber` 與 `OutEventData` 中真正的 ITEM PARAM 程式生成區段，在 Perl 記憶體中執行生成的 `$ITEM[n]` 運算；`.t` 與 `tests/r4-event-item-param.test.mjs` 逐項比對九種 EVENT、79 項商品和六種數值欄位，驗證未審閱事件／不安全來源與輸入拒絕、世界不變。這個 Oracle 使用**人工原始數值的隔離商品 fixture**測運算式，並非已連接 DataRead 與動態 EVENT 的真玩家世界。

**尚未完成：** EVENT 原版 17-key hash 與已存在 EVENT 的實際起訖和同組互斥、所有回呼／RNG、依 DataRead 時點對當期的 ITEM overlay、生效持續及過期、R3 自然販售與 36h 期末合成後的可提交同世界差分。因此 `projectR4EventItemParams` 保留 `committable:false`，不授權外部正式時間命令、不把來源未證實的 EVENT 當空事件。R4-A 和 R4 整體都**不宣告退出**。

## 2026-11-23｜R4 七種宣告式 EVENT 的單事件連續來源差分（受控，不可提交）

新增 src/original-r4-declarative-event-cycle.mjs，直接由凍結 Standard Street DSL、B-53 真編譯後的 17 EVENT、前述九種 ITEM PARAM 來源運算子，審閱七種沒有自訂回呼的事件：boom-posyon、tate-sale、yoroi-sale、tue-sale、plusdown-yakusou、plusup-misuriru、plusup-oriharukon。一致實作：每個時間片開頭 DataRead 只讀取先前已存在的 EVENT；END 階段以嚴格小於判定到期，然後才評估下一次 START gate 與兩筆 duration RNG；當片新開始的事件不會倒灌影響當片的 ITEM 欄位。到期發生於時間片內時，該片開頭的 ITEM overlay 仍照原版適用。

新增 tests/original-perl/original-r4-declarative-event-cycle-probe.pl 和 .t，直接在 Perl 記憶體中執行凍結 inc-makeitem.cgi::OutEventData 的 ITEM PARAM 生成片段與凍結 inc-turn.cgi 的完整 EVENT END/START 原文（單一 EVENT 鍵，故沒有假造 17-key hash 遍歷順序）。Node tests/r4-declarative-event-cycle.test.mjs 比較七類事件各四種到期情境、全部 79 ITEM 數值欄位、隨機數消耗、日誌，以及從開始跨多個連續 3600 秒時間片直到實際到期後的 DataRead 與再觸發 gate。

仍保留嚴格界線：committable:false，一次只允許單一來源事件；不是同一個玩家 WorldState 的自然販售、PLUS、EVENT 17-key hash 與全局 RNG、36h 結算、HTTP/CAS、存檔或重啟。rebel、guildbattle 的 callback、已存在的其他 durable EVENT 同時作用及所有同組互斥均未授權。本驗證提升七種 EVENT 的局部可信度，不能宣告 R4 完成。同輪同步修復 tests/local-original-ui-layout.test.mjs 一個原先未跳脫左括號的無效 regex，使獨立 UI 佈局測試可被 Node 解析。
