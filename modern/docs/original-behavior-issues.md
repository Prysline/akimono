# 原版相容性原則與已知異常行為

> 本檔是**問題／風險紀錄，不是要求自動修復的清單**。
> 來源固定為 `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`；
> 《商人物語》標準街現代化的首要目標是**重現原版程式實際執行的行為**。

## 開發契約（自第 21 階段起）

1. **原版結果優先。** 複刻商品數量、機率、經濟計算、存檔欄位、處理順序與極端值時，先執行固定 Core 的隔離測試並保留輸出。不要以常識、較漂亮的公式、負值歸零、平均分攤或安全限制直接修改原版結果。
2. **異常另外記載。** 看似錯誤或有風險的原版行為，記錄下方來源、觸發條件、例子、影響和建議的未來改善方向；是否「改規則」由後續明確決策處理，不與移植混在同一版。
3. **安全邊界仍要保留。** 未審查的原版外部事件／動態 `require`／CGI 回呼／正式存檔寫入，不能因「相容」而擅自啟動。純模型可忠實重現原版負值、超量、無序等**資料結果**，但並不因此取得正式帳號、鎖與檔案 I/O 權限。
4. **分清忠實模型與受限子集。** 原本僅涵蓋部分情境的 B-16～B-20 前置檢查，不能被當成「原版會拒絕這些資料」；逐步增加由原版測試覆蓋的忠實模型。先前測試的純函式／合成資料身份不變。
5. **所有原版快照必須未修改**，GitHub CI 仍驗證14份 Core Git Blob SHA；正式 CGI、`main`、`migration/standard-street-s1` 與真實存檔不在本階段修改範圍內。

## 已知原版行為／風險清單

| ID | 原版位置 | 原始行為（不擅自修正） | 風險／與直覺的差異 | 處理 |
| --- | --- | --- | --- | --- |
| CORE-01 | [`plug/use.cgi` 208–224](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L208-L224) | `p<=0→0`、`p>=1000→cnt`；其他機率當 `cnt<20` 時逐個抽 `rand(1000)<p`，`cnt>=20` 使用 `int(sqrt(abs((-2*sigma*r1)*sin(2*3.1415926535*r2)))+ave+0.5)`，其中 `ave=cnt*(p/1000)`、`sigma=ave*(1-p/1000)`。**原版沒有最後對結果作 `min(cnt)`。** | 大額抽樣不是常見二項分布；平方根絕對值項**只會往平均值上方增加**，不應換成標準機率模型。 | B-21 原式與兩次 RNG 次序的純模型；Perl 隔離驗證 |
| CORE-02 | [`inc-period.cgi` 77–82](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-period.cgi#L77-L82) | 每日每個商品先按 `limit` 上限修正、再對存量 `int()`。負庫存例如 `-1.9` 仍變成 `-1`，**不會自動歸零**。 | 後續會接收到負庫存；「直接歸零」會改變原版值。 | B-21 恢復相容模型的帶符號數值；資料異常另行顯示 |
| CORE-03 | [`plug/use.cgi` 128–145](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L128-L145) | 生產超過商店庫存上限時，先計算 `trash = produced-(limit-oldStock)` 加到市場，再將商店新增量設定為 `limit-oldStock`。若原本 `oldStock>limit`，**新增量可以是負值**。 | 例如原有12、上限10、生產2：來源記錄 `discarded=4`，商店記錄 `additem=-2`，最終庫存10。 | B-21 不改算式；模擬原版的負新增量 |
| CORE-04 | [`plug/use.cgi` 149–150](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L149-L150) 與 [`plug/whole.cgi` 50–74](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/whole.cgi#L50-L74) | `CheckWholeStore` **在退回溢量之後**檢查全部商店與市場的總量；負 `wslimit` 取絕對值作固定上限，正值用 `int(wslimit*店數+0.99)`；有 `code` 的商品才修正、必要時將市場庫存截至0。 | 退回的庫存不保證全留在市場；某些沒有 `code` 的商品不會進入該修正。 | B-21 依確切順序模擬；不交換步驟 |
| CORE-05 | [`plug/use.cgi` 188–204](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L188-L204) | 熟練度總和超額時使用 Perl HASH `keys` 加上只比較熟練度值的 `sort`，沒有指定同值時的商品 ID tie-break。 | 同值的扣減先後可能依 Perl HASH 順序變動；不要假定商品 ID 排序就是原版。 | 保留原版隔離測試；不另加新 tie-break。B-19 受限模型目前遇同值仍可能拒絕，此限制只是**尚未覆蓋範圍**，不代表原版拒絕 |
| CORE-06 | [`plug/write.cgi` 的 `DataFilesBackup`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/write.cgi) | 原版備份開檔及複製未逐項檢查結果；來源缺失可能把先前備份截斷為空，函式仍返回。 | 有資料遺失風險。 | 來源缺陷保留隔離證據；**絕不為了相容而對正式檔案執行危險備份** |
| CORE-07 | [`inc-func.cgi` 的 `DataRead`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-func.cgi#L233-L299) | 尋找 `//` 的迴圈沒有 EOF 上限；截斷或特定換行可能卡住。 | 原版讀檔可卡死。 | 隔離 Perl 測試必須有 timeout；正式讀取流程尚未啟用 |

| CORE-08 | [`plug/use.cgi` 115–150](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L115-L150) | 同一商品可出現在多筆 `create` 中，原版依序處理每一筆；若 `MakeAmount` 算得非零，但前筆已使商店達上限，後筆仍可能 `push(additem,[itemId,0])`，並產生一筆丟棄紀錄。**全部 `create` 結束後才呼叫一次 `CheckWholeStore`**。 | 若誤將連續產出合併、略過零新增紀錄，或改成每產出一筆就修正市場，會失去原版紀錄與可能的市場計算順序。 | B-22 多商品、多商店原版 Perl 隔離測試與 Node 忠實數值模型；照原版保留零新增紀錄，不主動修復 |
| CORE-09 | [`plug/use.cgi` 90–104、115–126](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L90-L126) | `UseItem` 的材料前置檢查逐筆以**當時尚未消耗的庫存**比較，每筆重複材料不先合併；正式消耗時才逐筆遞減。兩筆各需同一商品6件、原有8件時，每筆前置都可能通過，最後庫存為 `8-6-6=-4`。 | 如果移植時將材料合併檢查或將負值直接歸零，都會改變原版實際結果；這也提醒呼叫者完整 `CheckUseItem` 的原始前置限制與本合成片段有不同責任。 | B-23 真正原版 Perl 段落與 Node 合成交易模型對照；保留原版負值，僅記錄風險，不主動修復 |
| CORE-10 | [`plug/use.cgi` 85–104、108–114](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L85-L114)、[`plug/calc.cgi::UseTime`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/calc.cgi) | 次數前置以原始 `DT.time` 計算可用時間；僅在次數確定為非零、真正呼叫 `UseTime` 時才把過久未用的 `DT.time` 更新為 `NOW_TIME-MAX_STOCK_TIME`，再加本次耗時。例：`NOW=1000000`、舊記錄700000、上限259200、使用耗時18，前置仍使用舊值；實際儲存時間變 `740818`。 | 不能提前修正時間上限再決定使用次數；新模型即使認為結果不合理，也不得更換處理順序。 | B-23 用未修改 Perl `GetItemUseTime / UseTime` 直接執行；Node 同值對照，無擅自修正 |

## 不屬於改規則的技術限制

- 浮點運算的語意以來源 Perl 表達式為準；JS `Math.sin`、`Math.sqrt`、原版 `rand` 與 JS 隨機種子的**位元級一致性尚未獲得全面證明**。B-21 先驗證相同兩次隨機輸入對公式的結果。
- 在未有可信檔案大小、鎖、備份與 CGI 端到端驗證前，**模型不是可直接上線的程式**。此技術邊界不等於更改原版遊戲規則。
- 若未來確定需要修正某一項原版缺陷，應以**獨立變更**明確標記「偏離原版」並另建相容性測試，不能隱含於移植。

## 使用方式

執行 `npm test`、`npm run demo:original-outcomes`，以既有 GitHub Actions 同 SHA 報告為檢驗來源。任務02保持進行中、PR #1 保持 Draft，**不合併**。
