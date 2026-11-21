# B-57｜原版資金援助／人氣提升真回呼接入玩家世界

> 2026-11-22。延續 B-56 的完整 17 鍵受控 EVENT gate 與 B-55 的偷竊／強盜，新增真正原版 **getmoney 資金援助**、**getpop 人氣提升** `startfunc`，可以在 B-40 原版進貨、B-41 真自然販售與全部 59 項 PLUS 之後，於**同一筆 GameCore CAS** 更新玩家的真實商店。**仍非公開玩家自然事件或完整 EVENT 引擎**。

## 來源語義與實際效果

來源一律維持固定：`custom/inc-item-data.cgi`，固定 Core `inc-makeitem.cgi`、`inc-turn.cgi`（20份 Core 快照不修改）。新增 `original-b57-support-event-callbacks.mjs` 嚴格逐行核對兩段原版 STARTFUNC 本體、編譯器參數及 `MaxMoney` 欄位：

- `getmoney`：原版 `start 30%` → 編譯機率300，`startfunc _local_(100000)`。原文是 `foreach(reverse(@DT))`，每店先 `rand(1000)>300` 決定是否跳過；若選中就將現金加100000，並依 `MaxMoney 999999999`（由 Core 編譯器寫入 `$MAX_MONEY`）限制上限。回傳 `(0,訊息)`；沒選中仍消耗一次亂數並返回0。此訊息中的 `GetMoneyString` 在來源 Perl 探針使用**明示整數文字替身**，不宣稱原版 GUI 金額格式等價。
- `getpop`：原版 `start 30%` → 編譯機率300，`startfunc _local_(1000)`。依相同 `reverse(@DT)`／一次 `rand(1000)>300`，選中才加1000人氣，上限10000；回傳 `(0,訊息)`，未選中也返回0。
- **來源回傳0**：即使確實加錢／加人氣，也不在 `DTevent` 生成一筆活動期限、不佔用成功啟動群組、不把補助算成商品販售收入。
- 在本次仍受限制的單店場景，兩者各只有一筆 `rand(1000)`；原版先逐一執行 B-56 事件 gate 的 `rand(100000)`，通過後才抽回呼。B-56 的 `eventHashOrderFixture` 仍需完整提供全部17鍵的**外部顯式順序**，絕不假定那就是 Perl `keys(%EVENT)` 的迭代序列。

## 程式與驗證

- [B-57 原始回呼來源審閱／投射](../src/original-b57-support-event-callbacks.mjs)：`reviewOriginalSupportEventCallbacks`、`projectOriginalSupportEventCallback`。以完整源碼語句與原版編譯參數保護變動，限定 79 庫存槽、單間商店與明確合法金額／人氣；外部百萬分位亂數必須精確一筆，不可少、不可多。
- [真原版 Perl 探針](../tests/original-perl/original-b57-support-event-probe.pl)、[Perl 斷言](../tests/original-perl/original-b57-support-event.t)：直接從固定 `@@EVENT` 擷取完整原版兩段 STARTFUNC 主體，經 Perl `eval` 真執行，不是假造結果；涵蓋未命中、`rand(1000)==300` 與超過300的臨界、金額／人氣上限、原版連續資金援助與人氣提升，並核對實際返值、訊息與亂數消耗。
- [Node 回歸與真商店 CAS](../tests/b57-source-support-events-live-cas.test.mjs)：將上述 Perl 結果逐案與 Node 對照；以真來源空白世界 → 真開店 → 全59項 PLUS供貨 → 真買#10 → 原價上架 → 原版自然販售之後，在一筆 CAS 中啟動 getmoney 與 getpop，核對金錢／人氣、存貨／市場／帳務不變部分、空活動表與 GameCore revision；B-43 雙世代磁碟保存與重讀仍一致。未支援 `loto`、亂數數量不符、事件鍵不完整與舊 revision 均拒絕且不寫入世界。
- [B-56 原子事件時間片](../src/original-b56-event-time-slice.mjs) 只在 B-57 來源審閱成立時派送這兩個回呼；[StreetModule](../src/standard-street-module.mjs) 帶入來源審閱契約。沒有新增 HTTP 端點或玩家觸發按鈕。

## 仍未完成

**不代表所有原版事件能自然發生**：現行玩家介面仍走 B-41 `advance-source-time`，會如實把未執行的事件狀態標成未知。B-57 使用的是 B-56 的**內部完整17鍵顯式順序測試**，尚不能再現 Perl hash 的當次排列與程序 RNG 序列。其餘會有期限或未移植效果的 EVENT 一旦通過 gate 仍整筆拒絕，並未假裝發生。未知／已存在活動事件、nowfunc、endfunc、跨店、通用商品、完整排序、36小時期末結算和真正玩家自然事件尚未接入。

維持 `test/task02-baseline-on-s1`、Draft PR #1，**不合併**；主分支、遷移底分支、固定原版 Core/CGI/DSL 及玩家 UI 均不修改。後續優先處理剩餘事件真效果，然後打通已驗證的單一玩家時間片與36h期末／存檔續玩閉環。
