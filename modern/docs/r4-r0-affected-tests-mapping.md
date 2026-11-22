# R4 第一個來源工作包｜R0 受影響測試映射（2026-11-23）

**範圍：** 僅凍結原版 `inc-turn.cgi` 時間切割與 R3 既有跨期拒絕前置檢查。這不是 R0／R1 全量清冊，也不是 R4 結案。原有測試不刪減。

| 測試／程式 | 原版來源 | 回歸風險 | 處置／驗證 |
|---|---|---|---|
| `tests/r4-original-time-slices.test.mjs`（新增） | 原始 `inc-turn.cgi` `@timespan` 區塊及 `_config.cgi` | 跨 36h 應期末卻被誤快轉、零長尾段錯解 | 新增九案真 Perl ↔ Node 逐項差分；來源 drift 與非法／過大時間拒絕 |
| `tests/original-perl/original-r4-time-slices-probe.pl`（新增） | 凍結 `inc-turn.cgi` 的真原文 | 人工期末日期／時間預期值取代原版 | 直接擷取並執行原始區段，不修改凍結來源 |
| `tests/original-perl/original-r4-time-slices.t`（新增） | 同上 | Probe 出錯卻被 Node 當成資料 | 確認 Perl 真執行、九案、邊界與後繼時鐘 |
| `src/original-b41-playable-sale.mjs`（既有修改） | `inc-turn.cgi` 分段時序 | 原來 `Math.floor` 只驗證期號，不能供 R4 多段合成 | 採用已審閱的 source time slices；跨期仍拒絕而非跳過決算；R3 真 Perl 售量回歸全部保留 |
| `tests/b41-real-playable-sale.test.mjs`、`tests/r3-shared-natural-sale.test.mjs`（保留） | 原版自然販售、PLUS | 時間檢查變更誤傷非跨期成交 | 原完整 Node／Perl 回歸不更動 |
| `tests/b56-source-event-time-slice.test.mjs`（保留） | 原版 EVENT fixture | 將固定 EVENT 順序誤稱來源 hash | B-56 仍為明示順序 fixture；不擴權，不移除原測試 |
| `tests/b47-period-solo-sort.test.mjs`、`tests/b50-period-same-state-chain.test.mjs`（保留） | 原版 `SortDT`、`period.cgi` | 將非可提交期末子鏈當完整決算 | 保留來源 fixture，R4 正式期末仍待補齊外部依賴 |

完整 R4-A/B/C/D 的 EVENT／SortDT／期末／HTTP、CAS、雙世代存檔與重啟之新映射，須隨後續實際功能和測試逐案新增，不能僅以此表宣稱 R4 或 R0／R1 退出。

## EVENT hash 新增 R0 差分對照（2026-11-23）

| 路徑 | 原版來源／回歸風險 | 處置 |
|---|---|---|
| `tests/original-perl/original-r4-event-hash-order-probe.pl` | `inc-makeitem.cgi::OutEventData` 建立 `%EVENT`；若誤使用 DSL 排序會錯誤消耗 RNG | 從凍結編譯器來源擷取初始化 Perl 原文並執行，觀察真 `keys(%EVENT)`，不硬編排列 |
| `tests/original-perl/original-r4-event-hash-order.t` | `inc-turn.cgi` EVENT／DTevent hash 迴圈；忽略 disabled EVENT 或遺失活動鍵 | 保證真正 17 鍵、同 Perl 行程重複次序與三鍵明示 `%DTevent` fixture 的精確集合 |
| `tests/r4-original-event-hash-order.test.mjs` | 若把單次 Perl seed 的觀察當永遠不變的來源順序會產生假等價 | 多個獨立 Perl 行程的執行結果比對鍵集合，不要求不同行程排列相等或不等 |

## R4-B 真原版 SortDT 受影響測試

| 來源／路徑 | 風險 | 驗證／處置 |
|---|---|---|
| `src/original-b41-playable-sale.mjs` + 新 `src/original-r4-sorted-pre-event.mjs` | R3 回呼後若跳過 `SortDT`，後繼 PLUS／EVENT 看到錯誤 shop.point | R4 純投影在回呼後、PLUS 前接 B-47 原版已審閱算法，仍不宣告完整期末或 EVENT |
| `tests/original-perl/original-r4-sorted-pre-event-probe.pl` + `.t` | 以手寫 point 取代 Core 原算式或錯置排序位置 | 擷取凍結 Core `GetDTPoint` 和 `SortDT` 原文真 Perl 執行，確認原版順序 |
| `tests/r4-sorted-pre-event.test.mjs` | 獨立固定 shop 測試未涵蓋合法買入與自然販售 | 真市場買 #10 → 上架 → R3 共用販售+回呼 → R4 排序 → 59 PLUS，逐欄和 Perl 原版排序比較、拒絕零變動 |
