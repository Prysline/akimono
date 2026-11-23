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

## R4 共用排序／人口式新增測試影響（2026-11-23）

| 實際檔案 | 凍結原版來源與風險 | 處置／替代證據 |
|---|---|---|
| `src/original-b41-playable-sale.mjs`、`src/original-r4-sorted-pre-event.mjs` | `inc-turn.cgi` ITEM 回呼後的真 `SortDT`，不能把排名更新挪到 PLUS 後 | 在 R4 不可提交純投影插入 Core `SortDT`，既有 R3 與 B-56 舊程式路徑維持 |
| `tests/original-perl/original-r4-sorted-pre-event-probe.pl`／`.t`、`tests/r4-sorted-pre-event.test.mjs` | `inc-func.cgi::GetDTPoint`、`core-detail.cgi::SortDT`；含合法買入後真正自然販售 | 直接抽取凍結 Perl 並逐欄對比 source-sorted shop；浮點維持費僅容忍 JSON 表示精度，其他欄位嚴格 |
| `src/original-b56-event-time-slice.mjs` 與 R4 Node 測試 | EVENT fixture 若跳過 SortDT 會讓後段 PLUS 與 EVENT 使用錯誤 point | R4 opt-in source sorting 後串同世界 EVENT fixture；仍拒絕把提供的排列視為原版 hash |
| `src/original-sparse-all-plus.mjs` | `inc-turn.cgi` PLUS 使用動態 `$DTpeople`，不能固定 500000 橫跨期末 | 非 500000 人口須使用 R4 來源受限純投影；其他路徑原子拒絕，原 B37／R3 回歸保留 |
| `tests/original-perl/original-r4-dynamic-population-plus-probe.pl`／`.t` | 原本源人口 500000 外，使用 250000／750000 的原版 59 PLUS＋CheckWholeStore | 執行真凍結原版，120 秒未飽和 #10 可區別人口效果，保留原版市場上限 |
| `tests/r4-dynamic-population-plus.test.mjs` | 新 Node 動態人口市場變動／RNG | 對真 Perl 79 欄、稀疏 CSV、抽樣逐筆差分；人工期末人口只供純函式測試、不進入 CAS／磁碟 |
| `tests/original-perl/OriginalSparseAllPlusHarness.pm`（僅測試 harness） | 之前測資永遠固定 DTpeople=500000，不能驗證原版人口式 | 增加選用 `dtPeople`，預設500000不變；凍結 `inc-turn.cgi`、Core／DSL SHA 均不改 |

R4／R0／R1 全量未完成；不刪既有原版 Node、Perl 差分，也不修改凍結來源的 expected values。

## R4 EVENT ITEM PARAM 受影響測試（2026-11-23）

| 來源／真實檔案 | 回歸風險 | 保留／新增測試和理由 |
|---|---|---|
| `src/original-r4-event-item-param.mjs`（新增） | `OutEventData` 在 DataRead 生效的商品欄位若誤用 DSL 宣告序或自行編造數學運算，將改變自然販售／PLUS | 從 B-53 審閱的 17 EVENT 解析九種有 PARAM 的編譯資料，執行來源運算式純投影，不會 commit 未知 EVENT |
| `tests/original-perl/original-r4-event-item-param-probe.pl`（新增） | 僅比對人工填寫 expected，未執行 Perl 真生成器 | 直接擷取凍結 `inc-makeitem.cgi` 的 `GetNumber/GetString/GetItemNumber/OutEventData` 相關原文，生成並執行 Perl ITEM 覆寫語句 |
| `tests/original-perl/original-r4-event-item-param.t`（新增） | 漏掉 17 EVENT 中的來源 PARAM、名稱轉數字與原版整數除法 | 9 類來源效果、每類 79 格 Perl ITEM、原版生成語句的基本確認 |
| `tests/r4-event-item-param.test.mjs`（新增） | Node 算法與原版 Perl 在 `pop/1.5`、`price*1.5`、`plus=...` 等有差分 | 直接原版生成運算的全部 79 ITEM × 九 EVENT 數值欄位差分、凍結編譯來源 drift 與非法輸入拒絕 |
| `tests/b56-source-event-time-slice.test.mjs` 與所有 R3 差分（保留） | 將新 ITEM PARAM 純演算錯認完整 EVENT 生命週期 | 保留 B-56 明示排列 fixture 的限制，R3 原路徑與原版 Perl Oracle 均未移除 |

R0／R1 全量仍未完成；R4 真 EVENT 啟動／結束／NOWFUNC、期末合成及 HTTP/CAS／雙代存檔重啟的受影響映射必須待真正加入後補足，不能以本組純計算測試代替。


## 2026-11-23｜R4 彩券混合 EVENT 測試映射

- 保留既有 `r4-multi-event-order.test.mjs`、`r4-mixed-instant-gate.test.mjs` 與原 Perl 回歸，不破壞七種持續 EVENT、兩種支援回呼、偷搶機器人及 RNG。修改 `original-r4-mixed-support-gate-probe.pl`／`original-r4-mixed-instant-gate.t`，新增 `r4-mixed-loto-gate.test.mjs`，以同一原版 `rand(6096454)` 及 17-key 真 hash 遍歷，比較現金／票數／日誌及後續抽樣。
- B-58 的 `b58-source-loto-real-ticket-cas.test.mjs` 和 `original-b58-loto-event.t` 仍檢驗五種獎等及精確整數邊界；R4 多事件樣本精度較低，不替代此驗收。R0／R1 全量與 R4 完整退出仍未達成。

## 2026-11-23｜R4 感謝祭 NOWFUNC 混合事件測試

- 更新 `src/original-r4-multi-event-order-fixture.mjs`：來源審閱 `happy` 持續時間、到期、同片 NOWFUNC、每有效片獨立 `rand(int(TIMESPAN/36))` 並與 STARTFUNC 共用 RNG；明示同 Perl 行程 `nowHashOrderFixture`，禁止使用 JS 物件遍歷假稱 Perl hash 原序。
- 更新真 Perl `original-r4-mixed-support-gate-probe.pl`／`original-r4-mixed-instant-gate.t`，新增 Node `r4-mixed-happy-now-gate.test.mjs`，同世界比較八個同時生效 EVENT、79 ITEM、店鋪金錢／人氣／票券／機器人／日誌與 RNG 呼叫順序；保留 B-60 單事件及 B-58、R4 前輪完整回歸。未審閱事件 fail-closed 和不可正式提交界線不變。

## 2026-11-23｜R4 鐵礦脈／劍需求多事件映射

- `src/original-r4-multi-event-order-fixture.mjs` 加入已審閱 B-59/B-61 的 EVENT ITEM PARAM／START／END。原版 `original-r4-mixed-support-gate-probe.pl`、`original-r4-mixed-instant-gate.t` 擴大十個 durable EVENT 同時活動、當片／下片 ITEM、生存與重啟。新增 Node `r4-mixed-iron-sword-gate.test.mjs`，保留所有 B-59／B-61 獨立 Perl 案及 R4 happy/loto/instant 既有測試，不修改原版 source。其他事件 callback 和世界跨期仍是 fail-closed。

## 2026-11-23｜R4 guildbattle 真 END 回呼映射

- `src/original-r4-guildbattle-end.mjs`（新增）：凍結 rebel DSL 的群戰結束正文、唯一公會最高資金、城市 dominion 更新與回傳訊息，拒絕 ties／不支援資料；不得以 JS 自訂排序替代 Perl keys/sort。
- `tests/original-perl/original-r4-guildbattle-end-probe.pl`／`.t`（新增）：原文 Perl END／START＋編譯回呼，僅 stub ReadGuild／ReadGuildData／SetTownData，監控函式呼叫與原 RNG。
- `tests/r4-source-guildbattle-end.test.mjs`（新增）：逐欄來源比對、獨立 Perl 行程、不變性與 fail-closed；未整合至正式單一 WorldState 或完整 36h 決算，原 R4 回歸與 R0/R1 邊界不變。
