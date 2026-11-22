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
