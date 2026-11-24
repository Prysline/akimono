# R4 第一個來源工作包｜R0 受影響測試映射（2026-11-23）

## 2026-11-24｜P3 優先：共用非跨期時間及 B-43 歷史

最新候選、介面及固定版本交接門檻見 [R4→P3 共用時間／持久化契約](./r4-p3-time-persistence-contract.md)。不等於 R4 全量退出或 P3 已可整合版本；原 36h/特殊 EVENT fail-closed 保留，舊期末子鏈成果保留。

## 2026-11-24｜R4 B-50 期末主檔、備份、封存及日誌共同子鏈

新增 [B-50 期末真檔案整合契約](./r4-b50-period-disk-contract.md)。真原版單店 B50 一/兩期全段期末、DragonBalance、CloseShop+真 archive、三代 backup/session 清理、每期 MakeGuildFile、transient guild reset、最終 WriteGuildData→DataWrite/DataFilesBackup→RenewLog→四檔共同 commit→DataRead；Node 由 live 讀取、真實 stage/recover、原版 log/mtime/失敗差分及 ready 摘要拒絕不完整 stage。屬明示空 EVENT、固定受控 RNG/每期 NOW_TIME 與隔離檔案，非全 inc-turn、正式 WorldState 或跨期授權。舊 36h fail-closed、eventState:null、R2/R3 保留。下一主線是既有自然販售/ITEM/SortDT/59 PLUS/完整 17 EVENT 與期末檔案同一來源連續整合，之後才正式 CAS/HTTP/save/restart。以最終同 SHA 雙 CI 為驗收依據。

## 2026-11-24｜R4 軍隊／城鎮及三檔共同 EVENT 子鏈

新增 [軍隊、城鎮及共同檔案契約](./r4-army-town-file-persistence-contract.md)。真原版 ReadArmy/WriteArmy、SetTownData/GetTownData、DataRead/DataWrite、多鍵 town、同 turn 多次 NOW live/stage 差異，及兩個特殊 EVENT 同一原版 END/START/NOW → army.cgi/guildbal.cgi/play.cgi 共同暫存與 commit/reload；原版 guildbattle transient guild=id 已獨立 codec，舊五欄仍嚴格。Node 真第三檔 rename 失敗、marker 復原；僅隔離來源子鏈，不是全 17 EVENT 或完整 B-50/WorldState，既有 36h fail-closed/eventState:null 不變。最終同 SHA Push/PR CI 為驗收依據。下一工作包完整 B-50 主檔與 DataFilesBackup、封存/Session/備份共同恢復及正式跨期正向整合；不再重做公會／軍隊／town 已驗收子集合。

## 2026-11-24｜R4 公會真檔案子工作包

新增 [公會持久化契約](./r4-guild-file-persistence-contract.md)：真原版公會定義、帳本、正負額、兩期 B-50、隔離多檔部分寫入及 marker 恢復。MakeGuildFile 不 reload %GUILD，WriteGuildData 仍用舊 keys；不把新公會缺帳本猜成零。僅已審閱檔案欄位、非正式 WorldState 提交；原版 hash 順序不宣稱等價。正式 36h fail-closed、eventState:null、R2/R3 原受控結論維持，R4/R5/R0/R1 全量未結案。以最後同一 HEAD 的 Push/PR Actions 為驗收依據；下一工作包軍隊/城鎮與主檔共同接合。

## 2026-11-24｜外部檔案／DataWrite 受影響 R0 映射（新增，不取代原回歸）

| 檔案 | 原版風險／來源 | 驗證與限制 |
|---|---|---|
| src/original-r4-data-write-files.mjs | write.cgi::DataWrite、inc-func.cgi::DataRead/AutoVar、core-detail.cgi::SortDT；不能憑空假定 Perl hash 順序或多檔原子 | 原版 4 Git blob SHA + 32/11 欄契約，限定單活店、79 ITEM、0/1-key map，受限暫存檔寫入、實際 rename/recovery；committable:false |
| tests/original-perl/original-r4-data-write-files-probe.pl 及 .t | 人工 expected 冒充原版寫檔；兩期 reset 造成假延續 | 執行未修改原版 DataWrite / DataCommitOrAbort / DataRead，File::Temp 兩期同一 live play.cgi，確認原始 stage/live、已停業店排除 |
| tests/r4-source-data-write-files.test.mjs | JS 假寫檔、UTF-8 位元組差異、失敗被當成功、非法 hash 排列 | 原版實際檔案 Perl 比較，Node 真 stage/rename、dest 佔用導致失敗保留 marker、恢復、abort unlink；原回歸不刪 |
| src/original-r4-close-shop-archive-file.mjs；tests/r4-source-close-shop-archive-file.test.mjs；tests/original-perl/original-r4-close-shop-archive-file-probe.pl 與 .t | 原版關店封存被當 recorder，寫檔失敗被誤報成功 | 原版 pinned-user/error 真執行 CloseShop＋WriteErrorLog 與 Node 真 UTF-8 append/rotate/missing-dir 逐內容對照，失敗不會變成成功 receipt |
| tests/r4-source-b50-archive-disk-chain.test.mjs | isolated 封存測試未連到 B-50 | 直接從 B-50 兩期同一店／城市的 actualCloseEffect 寫真 Node log，仍 nonCommittable |
| docs/r4-external-file-effects-contract.md | 將 SetUserData/EditGuildMoney/SetTownData recorder 當磁碟交易、混淆 DataRead 與不存在 read.cgi | 實際來源定義／呼叫、讀寫資料、格式、失敗與未實作邊界明列；B-13/14/15 保留 |

正式 B-50 跨檔共同交易、完整 CloseShop 原子封存、公會/軍隊、WorldState/CAS/HTTP、R0/R1 全量仍是未通過項目。


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

## 2026-11-23｜R4 rebel 原版 NOWFUNC 來源差分映射

- `src/original-r4-rebel-now.mjs`（新增）：以 82 行正文指紋鎖住原版叛軍／護衛軍／城鎮金錢和領主轉換，受控純函式；拒絕未來源審閱的軍隊、城市、狀態與 RNG。
- `tests/original-perl/original-r4-rebel-now-probe.pl`、`.t`（新增）：真凍結 NOWFUNC 在 inc-turn 原文中 require 執行，八組分支＋Perl rand(100)>75 浮點界線；隔離全域 `@DT` 快照、記錄真 Log、ReadArmy/WriteArmy 及 RNG。未改動原始 Perl／DSL。
- `tests/r4-source-rebel-now.test.mjs`（新增）：城市／店鋪／RIOT／ARMY／領主／訊息／亂數逐欄 Node ↔ 真 Perl 差分、多行程、失敗零變動；保留舊 R4 EVENT 與 B50 非提交期末，尚未是正式 R4 完整世界。

## 2026-11-23｜R4 period RebelRobin／同片 NOWFUNC 來源對映

- `src/original-r4-rebel-period-trigger.mjs` + `tests/original-perl/original-r4-rebel-period-trigger-probe.pl`／`.t` + `tests/r4-source-rebel-period-trigger.test.mjs`：原版 `period.cgi` 子程序與 3 天延長分支，城市／領主／RNG／日誌全欄差分；控制真實 rand 的 30% 浮點邊界。
- `src/original-r4-rebel-period-to-now.mjs` + `tests/original-perl/original-r4-rebel-period-now-probe.pl`／`.t` + `tests/r4-source-rebel-period-now.test.mjs`：期末 source 先於 END／START／NOW，原版單事件雙片段同一 Perl 程序測試；檢查初次叛亂與當片效果、既有活動被鎮壓、原版 start=0 閘門亂數，以及來源輸入原子不可變。
- 以上均無權繞過 `committable:false`。R4 17-key 外部活動整合、完整跨 36h 期末及 WorldState／CAS 皆未驗證。完整阻塞清冊新增 `docs/r4-exit-audit.md`。

## 2026-11-23｜R4 rebel／guildbattle 共用 17-key 原文 Perl 差分映射

- src/original-r4-multi-event-order-fixture.mjs：整合已審閱 rebel NOW、guildbattle END，校核原版 START／END／NOW，於 NOW 自刪前依真 Perl 遍歷順序操作；未知活動、缺 IO 快照與亂數不匹配均 fail-closed。
- src/original-r4-guildbattle-end.mjs：新增無虛構 gate RNG 的純 END callback，與既有單事件回呼共用來源結果；公會最高資金同額拒絕。
- tests/original-perl/original-r4-mixed-support-gate-probe.pl 與 original-r4-mixed-instant-gate.t：凍結 DSL 的真 rebel／guildbattle callback 直接載入原始 17-key Perl 回合；在 event-n GetPath 捕捉 NOW 真遍歷，並監測受控軍隊／公會 IO。
- tests/r4-mixed-guildbattle-end-gate.test.mjs 與 r4-mixed-rebel-now-gate.test.mjs：對 END 到期、NOW 自刪、十種 durable 與 happy 共存、原版時間序、Perl 多行程 hash／RNG、79 ITEM、shop/town/guild/army 的逐欄差分及無審閱／無資料／亂數不足失敗零變動。

本批只完成來源控制條件下的全 17-key 特殊事件共用測試，並未證成真外部 IO、可提交期末或 HTTP／重啟；完整 R4 仍未退出。

## 2026-11-23｜R4 DragonBalance 真檔案與 B-50 兩期接入影響

- src/original-r4-dragon-balance.mjs、tests/original-perl/original-r4-dragon-balance-probe.pl／.t、tests/r4-source-dragon-balance.test.mjs：直接執行凍結 DragonBalance 讀檔並 unlink 9 案；因 original chop 會截斷末行字元，需精確比對而非改為 chomp。
- src/original-period-solo-chain.mjs、src/original-period-shop-ledger.mjs：新增明示 DragonBalance 來源審閱後的 B-50 opt-in，仍拒絕獨立 B44 假龍賽、陌生結算 receipt、未審閱店鋪或 period。保留既有 source B50 舊測試。
- tests/original-perl/original-r4-period-dragon-chain-probe.pl／.t 與 tests/r4-period-dragon-same-world-chain.test.mjs：同一原始店鋪／城市連續兩個期末 pre-backup 前綴、真 drapay 檔案消耗、+500／-1000 跨期、維持費 17、SortDT／獎品／城市人口逐欄等價；WorldState 寫入及真備份未經驗收，R4 不退出。

## 2026-11-23｜R4 同世界兩期公會會費／爵位／高 EXP 技術遺忘映射

- `src/original-r4-period-dignity-decay.mjs`、`src/original-r4-guild-period-fee.mjs`、`src/original-r4-post-period-tech-loss.mjs`：真 frozen source `period.cgi`／Standard Street DSL 的位置、公式、防禦先乘 9/10，再加會費除以 800、上限 1000、不定序外部資料與四技術持有者按序 `rand(14000)`。Guild `EditGuildMoney` 只記錄 IO 呼叫，不誤算為可持久化金錢。
- `src/original-period-solo-chain.mjs`、`src/original-period-shop-ledger.mjs`：明示 `includeReviewedDignity`／`includeReviewedGuild`／`includeReviewedPostTech` opt-in，保持 `UpdateResetBefore` → 店鋪收益／歷史與維持費 → Guild → Dignity → SortDT → 城市 → `UpdateResetAfter` 的凍結程式順序。舊 B44／B50 預設拒絕高熟練度、外部公會與龍賽，WorldState 仍不可提交。
- `tests/original-perl/original-r4-guild-period-fee-probe.pl`、`.t`、`tests/r4-source-guild-period-fee.test.mjs`：七個真原版資金／攻防情境與每個 `EditGuildMoney` 呼叫、來源改寫與非法會員防護。
- `tests/original-perl/original-r4-period-dragon-dignity-probe.pl`、`original-r4-period-all-finance-source-probe.pl`、`original-r4-period-high-exp-tech-probe.pl`，各自搭配 `.t` 及同名 Node 來源差分：同一張真 Perl 店鋪與城市跨兩期保留高 EXP、四技術庫存、財務、城市／人口與共享 RNG；自動核對第二期因前期扣除商品而少用 `rand(14000)`，以及 Perl `WriteLog` 過濾不誤含頒獎訊息。原版 hash／Perl seed、真公會資料檔、Store CAS、backup/session、HTTP 正式跨期均不因此授權。

## 2026-11-23｜R4 正式 GameCore v2 時間與期別變更：來源轉場守門

- `src/original-r4-world-transition-gate.mjs`：綁定凍結 `inc-turn.cgi` 時鐘分割與 `_config.cgi`，只容許 B-51 初始 period 或現有單種 B-59／B-60／B-61 受審核 EVENT 的**未跨 36 小時**安全轉場；已結算期、未知多 EVENT、城市偽改、時鐘倒退均拒絕。
- `src/game-core-contract.mjs`：v2 的 `period`／時鐘變化必須於 CAS 之前得到 `StreetModule.reviewPeriodTransition` 許可；任何缺失／拒絕或明示非提交的來源純投影返回 `SOURCE_BOUNDARY_REJECTED`，不中斷 v1 泛用既有操作。
- `src/standard-street-module.mjs`：以真 source text 審閱並接入新的 `reviewPeriodTransition`，不把未實作的 R4 `period-settlement` 暴露為玩家可用命令。
- `tests/r4-source-world-transition-cas-guard.test.mjs`：原版時鐘跨界、城市／期數／事件假造、缺審閱器、舊 v1 保留、真記憶體 CAS 狀態不變，以及雙世代實際 B-43 save/load 不因拒絕而重寫。**此切片沒有正向 36h 結算，R4 仍不可退出。**

## 2026-11-23｜R4 真本機 HTTP 來源 CAS 與過期店關店來源觸發

- `src/game-core-contract.mjs`／`scripts/dev-local.mjs`：來源專用的 v2 Memory CAS adapter 在建立、load 與每次直接 CAS 時檢查原版合法初始期別、36h 時鐘及來源不支援的已結算狀態；泛用 adapter／舊 v1 保持原樣。
- `tests/r4-source-world-transition-cas-guard.test.mjs`：新增直通 compareAndSwap 門檻、偽造審閱器／城市／事件／已結算世界拒絕、兩個實際 B-43 磁碟世代完整性；已知單 EVENT 也不許在零時間內被偽造。
- `tests/r4-source-cas-http-save-restart.test.mjs`：真 HTTP 開店、供貨、買 #10 → 36h 期末拒絕 → save 兩代 → Node restart → load 世界完全一致及再度拒絕。不能把負向 E2E 當成完成正向 R4 退出。
- `src/original-r4-period-shop-expiry.mjs`、`tests/original-perl/original-r4-period-shop-expiry-probe.pl`／`.t`、`tests/r4-source-period-shop-expiry.test.mjs`：九種真凍結 Perl 未登入逾期條件、`CloseShop` 外部呼叫及原始日誌完全對照；關店真正外部檔案更新仍禁止提交。

## 2026-11-24｜原版 CloseShop 實效＋真備份／Session 尾段測試對映

- `src/original-r4-close-shop-effects.mjs`、`tests/original-perl/original-r4-close-shop-effects-probe.pl`：真原版 CloseShop 封存來源欄位、受控暫存 Session 刪除、status=0 後原版 SortDT 排除和 DataWrite inactive 過濾；外部 SetUserData／WriteErrorLog 只記錄呼叫。
- `tests/original-perl/original-r4-period-real-close-chain-probe.pl`：單一原版 Perl 行程連續兩期，第二期確實關店並保留來源龍賽、公會及城市結算；Node `r4-period-real-close-source-chain.test.mjs` 同狀態比對。
- `src/original-r4-period-backup-tail.mjs`、`tests/original-perl/original-r4-period-backup-tail-probe.pl`／`.t`、`tests/r4-source-period-backup-tail.test.mjs`：原版三代目錄真 rename、五檔 UTF-8 寫入、mtime 嚴格 Session 過期及外部 MakeGuildFile 呼叫差分。不得推論真玩家資料檔 CAS／Backup 成功。
- `src/original-period-solo-chain.mjs`、`tests/original-perl/original-r4-period-full-tail-close-probe.pl`／`.t`、`tests/r4-period-full-tail-close-chain.test.mjs`：明示來源 opt-in 後，單一 Perl 行程兩期期末原始前綴 + 真備份尾段，逐欄比對商店關閉、城鎮、外部 Guild 呼叫、三代備份及 Session；`nonCommittable:true`、正常 GameCore 期末仍 fail-closed。
