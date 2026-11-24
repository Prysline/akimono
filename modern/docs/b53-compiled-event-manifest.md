# B-53｜原版 EVENT 編譯清單：25 宣告／17 可進入／8 原版排除

> **程式結果是事件定義清單，不是事件引擎或玩家已觸發的事件。** B-52 的初始活動事件實例表 `period.eventState={}`、推進後 `null` 仍適用；不能將宣告清單當成已執行或沒有事件。

## 固定來源規則與實際審閱

[來源原樣的 Standard Street ITEM DSL](../../custom/inc-item-data.cgi) 有 23 個 EVENT 宣告，[原始叛亂與商會戰 DSL](../../custom/inc-rebel-data.cgi) 有 2 個，合計 25 個。固定 [`inc-makeitem.cgi`](../tests/original-perl/inc-makeitem.cgi) 的 `GetNumber`、`GetTime` 及 EVENT 序列化規則：

- `start 10%` 編譯成 `startproba=100`（原版把百分比乘10）；`start 7%` → 70，`start 100%` → 1000。
- 原版同一 EVENT 中重複 `start` 時，後面的值會覆蓋前面的值。原始 `priceup-yakusou` 等四個缺貨事件原本寫 `start 50%`，後面再寫 `start -1`，**真正編譯時被排除**。四個 `kill-*` 事件也使用 -1，總共排除 8 個。
- `start 0` **不會**被原版編譯器排除；叛亂 `rebel` 與商會戰 `guildbattle` 都保留在編譯後的表，並且原版 `inc-turn.cgi` 在抽樣後還有 `|| $E->{startproba}==0`。不能當成沒機率所以不會執行。
- 原版 `GetTime('5h')` → 18,000 秒，`48h` → 172,800 秒。每一筆 EVENT 的持續時間、群組、startfunc/endfunc/func 原文都保留；動態 Perl 回呼仍是未執行的不透明來源。
- **17 個會編入原版事件表：其中 15 個正機率、2 個 start=0。** 不應把 25 個宣告直接都跑一遍，也不能把 17 個編譯項當作目前活動中的事件。

## 程式與原版證據

[Node 來源編譯清單](../src/original-event-compiled-catalog.mjs) 只接受固定原版 EVENT 及編譯規則；欄位 `declared` 包含 25 個原文宣告，`compiled` 包含 17 個原版允許進入運行時的定義，明確記錄每個 code、start 寫入順序、編譯後 startproba、basetime/plustime、group、callback 名稱及來源行。**`runtimeSupported=false`**：不進行事件、獎品、價格或城市副作用，也沒有啟動 EVENT 的 GameCore 命令。

[真原版 Perl 編譯器函式探針](../tests/original-perl/original-b53-event-catalog-probe.pl) 擷取並真的執行固定 `GetNumber` / `GetTime` 兩個原版 Perl 函式，對 ITEM DSL 與 rebel DSL 的 25 個事件標頭轉成編譯值。對照 [Node 測試](../tests/b53-event-catalog-source.test.mjs) 的**每一筆事件** code、group、start 值、時間秒數、函式來源旗標、是否編入，並驗證來源變動會拒絕。原版 Perl [斷言](../tests/original-perl/original-b53-event-catalog.t) 也確認 25／17／8 及零機率的兩項事件。

[Standard Street 模組](../src/standard-street-module.mjs) 已將這份 reviewed catalog 暴露為只讀 `reviewedEventCatalog`；本機繁中介面會顯示「原版25個宣告／編入17個／效果尚未移植」，但不會允許使用者觸發未審查的事件效果。B-43 的真 HTTP 初始化＋存檔重啟驗證同一份來源數量。

## 剩餘必須實作才可真正跨期

此清單仍是事件編譯資料。真正 `inc-turn.cgi` 使用 `keys(%EVENT)` 遍歷 Perl hash，**不是 EVENT 在 DSL 中的宣告順序**；後續事件執行不可直接照這份陣列順序抽樣並宣稱完全對照原版。回呼還包括抽獎、偷竊、強盜、人氣及資金變動、感謝祭、價格／流通量調整、叛亂、商會戰及原版 `DTevent` 生命周期。需在玩家世界中處理來源 EVENT 的起始、過期、群組、回呼、來源亂數以及原始市場／商店／城市副作用，並以同一筆可恢復 WorldState 原子提交；不能允許玩家反覆重試未支援的隨機事件，藉此抹去真事件。

B-50 期末的同商店／城市兩期來源純投射及 B-51／B-52 真玩家城市、事件初始存讀檔已存在，**但真正的36h跨期仍未解鎖**。最後驗證同一繁中 UI「開店→進貨→上架→自然販售→真跨期結算→磁碟保存→停止重啟→續營」後，才依使用者要求集中人工驗收一次。

保持 main、migration、固定原版 Core、兩份 DSL 不變，PR #1 保持 Draft、未合併。
