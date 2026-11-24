# B-59｜真實「發現新的鐵礦脈」持續事件、原版批發補貨、跨時間片到期及磁碟續玩

> 2026-11-22。延續 B-58 真買 #10／#11、自然販售、真抽獎及 B-56 完整 17 鍵顯式 EVENT gate，本輪接入**第一個有真實持續期、會改變下一回合市場供貨的原版事件** `plusup-tetu`。此功能仍為單店、受控內部原版事件時間片，尚非公用玩家自然事件或原版所有 EVENT／36h 期末結算。

## 來源機制與順序

固定 `custom/inc-item-data.cgi` 的 `@@EVENT code plusup-tetu`，原文 `start 10%`（原版編譯為 `startProba=100`）、`basetime 12h`、`plustime 12h`，`startmsg 發現新的鐵礦脈`、`endmsg 新的鐵礦脈已經關閉了`，唯一 `param 鐵塊 plus=720`；無 `startfunc`、`endfunc`、`func`。商品「鐵塊」是實際 **ITEM #5**，原本的批發 `plus -20m`（-1200 秒），事件啟動後的來源編譯器實際會寫出 `$ITEM[5]->{plus}=720;`；這是正向補貨，並非 -1200 的小幅修正。

固定 Core 的 `inc-turn.cgi` 開頭先載入 EVENT 定義、再 `DataRead()`；固定 `inc-func.cgi` 的 `DataRead` 從 `%DTevent` 讀取活動期限並 `require` 活動事件檔，實際套用 ITEM #5 新 `plus`。**因此事件啟動的同一時間片，前面已經執行過的批發補貨不能被回溯改寫；下次載入世界，才開始使用正向 `plus=720`**。

此後的原版順序為自然販售 → 59 項 PLUS 批發市場變動 → `CheckWholeStore()` → 已存在 EVENT 的到期檢查 → 17 項 EVENT gate → 期間回呼。到期條件為 `expiresAt < sliceEnd`（嚴格小於）；`expiresAt === sliceEnd` 仍佔用事件群組、不消耗新的 EVENT gate 亂數。跨片到期時，由於 EVENT 的參數在本片開頭已透過 DataRead 載入，**本次補貨仍受鐵礦事件影響，事件結束後再下一片才恢復原本 -20m**。到期之後群組解除，當片也可重新抽事件並重新啟動；`endmsg` 在新 `startmsg` 之前。

啟動期限按原版 `startTime + int(rand(span)) + 43200 + int(rand(43200))`；在原始完整 17 鍵 gate 的 `rand(100000)` 之後，額外精確消耗兩筆明示百萬分位樣本。活動以 `period.eventState = {'plusup-tetu': 絕對到期秒數}` 存入真實 v2 WorldState，沒有合成其他事件。活動群組持續有效時，不再消耗這個 EVENT 的 gate 亂數。

## 交付程式及測試

- [B-59 真原版持續事件審查](../src/original-b59-iron-event-lifecycle.mjs) 審查固定 DSL、原版編譯器、DataRead、EVENT 到期順序、ITEM #5 正負 PLUS、起訖訊息及編譯後 17 鍵目錄。僅允許單一且時間安全的 `plusup-tetu`；未知／多個／格式錯誤的活動事件不能略過。
- [B-37 59項原版 PLUS](../src/original-sparse-all-plus.mjs) 只有收到 B-59 已審查的來源契約及本片開頭已存在鐵礦事件，才把 `ITEM[5].plus` 覆寫成 720；其餘 78 項不改，仍跑原有相同數量的原版亂數、79項上限、稀疏市場 wire。若有已知活動事件卻走只處理原始 PLUS 的孤立指令，會拒絕，而不是偷偷略過效果。
- [B-41 真自然販售](../src/original-b41-playable-sale.mjs) 與 [B-56 完整內部事件時間片](../src/original-b56-event-time-slice.mjs)：真世界先依本片 DataRead 的活動狀態計算補貨，再到期刪除/啟動新事件，單筆 GameCore revision CAS 更新批發市場、店鋪、時鐘、活動到期表與回執。已知活動狀態不允許從只含 B-41 販售、無事件生命週期的舊命令悄悄走過。舊 B-41 `eventState=null` 的**未知狀態語義保留**，沒有偽裝為空表。
- [B-43 雙世代存檔](../src/local-world-save-store.mjs) 僅增加這個固定來源的單一活動事件結構驗證（及真買 #11 抽獎卷非展示庫存 ≤50），其餘時間、原版城市數值、狀態欄位、79欄商品仍嚴格驗證；新事件可存檔 → 真從磁碟讀回 → 新世界 adapter 繼續執行。
- [原版 Perl 真執行探針](../tests/original-perl/original-b59-iron-event-probe.pl) 與 [Perl 斷言](../tests/original-perl/original-b59-iron-event.t)：從原版 DSL 和真 `GetTime`／`GetNumber`／`GetItemNumber` 核對生成的 ITEM5 賦值，直接 `eval` 固定 `inc-turn.cgi` **完整原版 EVENT 結束＋開始區段**，驗證啟動、群組阻擋、等於邊界、到期門檻失敗、到期後立即重啟，以及日誌順序。批發部分直接跑固定原版 **59項 `PLUS` 程式片段＋`whole.cgi::CheckWholeStore`**，比較套用活動前後鐵塊的真市場庫存與 79欄輸出；這是來源片段實際執行，不是完整 CGI 主流程。
- [B-59 Node 真世界對照／持續期 CAS／重載測試](../tests/b59-source-iron-event-live-lifecycle.test.mjs)：跨語言逐步核對 Perl 事件到期時間、日志、實際市場 ITEM5 供貨；正式真進貨 #10 上架 → 受控 EVENT 啟動 → 磁碟保存後使用**另一個新 adapter** 讀檔續玩 → 下一片市場補貨改變 → 連續 11 個一小時片驗證群組阻擋 → `expiresAt===sliceEnd` 仍有效 → 下一片到期時仍用活動補貨 → 再下一片回復原版負向補貨 → 重新保存載入，以及缺亂數／未移植事件／非法活動表／錯誤來源／revision 衝突全程拒絕且不污染原世界。

事件的啟動與結束文字暫寫入 CAS `eventLogEmissions` 回執，**尚未等價實作原版持久化日誌**。不能把它宣稱為正式玩家可查的事件記錄。

## 必須保留的界線

**仍非完整原版 EVENT 引擎。** `eventHashOrderFixture` 仍是內部呼叫端顯式提供全部 17 編譯鍵排列，**不等同** Perl `keys(%EVENT)` 的當次 hash 迭代順序，受控亂數序列也不代表還原原版 PRNG。現在實際會執行的 STARTFUNC 有 manbiki、goutou、getmoney、getpop、loto；新增的 `plusup-tetu` 是第一個有持續期限且能改動真實市場的無回呼活動。其餘帶持續市場修飾／期間回呼／結束回呼的 EVENT 還不支援，一旦觸發整筆拒絕；跨期 36 小時仍不支援，不能默認跳過決算。#10／#11 以外的玩家商品、玩家 HTTP 事件 UI、多玩家與持久化事件日誌也未完成。

保持分支 `test/task02-baseline-on-s1`、Draft PR #1 不合併，主分支、遷移底分支、固定 Core／DSL 不改。下一階段優先釐清其餘持續事件的 `pop/price/plus` 參數與商品需求／市價讀入關係，然後朝完整 36h 原版期末結算與玩家遊戲閉環前進。

**CI 計數與最後 SHA 須以本文件提交後最新 HEAD 的 Push／PR 同 SHA 驗證為準**，不可引用中間 SHA 的結果。
