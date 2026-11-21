# B-56｜在真實世界同一筆 CAS 接入原版事件啟動與即時回呼

> 2026-11-22。本階段將 B-55 已由真 Perl 對照的「偷竊／強盜」回呼，接在 B-41 來源自然販售與 B-37 全部 59 項 PLUS 之後，形成內部受控的單一時間片。**不是已開放玩家的完整自然事件引擎。**

## 已落實的流程

- 依固定原版 inc-turn.cgi 核對次序：自然販售與商品回呼 → SortDT → 可能的期末結算 → 59 個 PLUS → CheckWholeStore → EVENT 到期 → EVENT 啟動 → 活動 EVENT 每期回呼 → 時鐘更新。
- B-56 受限於單一真來源店鋪與 #10 合法展示架，保留原 B-41 已審查的販售／PLUS 效果。只接受已知「沒有活動 EVENT」的 v2 世界；任何已發生活動或未知事件狀態都拒絕。
- 依**完整 17 個**已編譯事件的顯式排列，逐項先消耗原版 rand(100000) 抽樣，保留同群阻擋及原版 startproba=0 特例，不會只抽已完成的偷竊、強盜。
- manbiki、goutou 通過啟動門檻時，呼叫 B-55 經真 Perl 驗證的即時來源回呼。由於 startfunc 回傳 0，不把事件登記成「活動中」，也不把失竊當成商品銷售。
- rebel、guildbattle 的 startproba=0 雖必定進入啟動分支，但無 startfunc、無期限，因此不會新增活動事件；仍會消耗原版入口亂數並在該時間片設同群阻擋。
- **其他任何事件通過啟動門檻，一律拒絕整個命令**，GameCore CAS 版號不動，店鋪、批發及時鐘皆不寫入；不略過其原版影響以取得綠燈。
- 成功的時間片若沒有任何持續事件，period.eventState 保存已驗證的空活動表，而不是假設存在時間中的活動事件。

## 新增內容與驗證

- [來源事件時間片](../src/original-b56-event-time-slice.mjs)：reviewB56EventSlice、projectB56EventSlice。
- [StreetModule](../src/standard-street-module.mjs) 新增內部命令 advance-source-time-reviewed-events，沒有新增 HTTP route 或玩家觸發按鈕。
- [GameCore](../src/game-core-contract.mjs) 以同一筆 revision compare-and-swap 提交經審閱的分鐘數、店鋪、批發與空 EVENT 狀態。
- [B-56 整合測試](../tests/b56-source-event-time-slice.test.mjs)：真的建立原版空白市場、開店、59項 PLUS 供貨、買 #10、上架，與原 B-41 販售結果對照，再驗證強盜 rank 扣減、現金及市場一致、原子保存／重載，並執行下一個來源安全時間片；測試缺失、過多抽樣、排列不全與未知事件被啟動的拒絕路徑。

### 必須保留的差異

Perl 的 keys(%EVENT) **不是** DSL 宣告順序，也不是 Node 可以從來源直接得知的固定順序。因此 B-56 的 eventHashOrderFixture 必須由測試呼叫端**明示全部17個不重複 code 的排列**；程式只能確認它是合法排列，不能認證它就是實際 Perl 行程採用的 hash 順序。saleDraws 與 eventDraws 是前後相接的外部百萬分位來源測試樣本，不是保存或重建 Perl 亂數狀態。

這個受控版本也尚未處理其他 15 項事件的持續效果、到期回呼、活動期 nowfunc、期間相關市場參數，亦未解鎖原版 36 小時跨期結算。既有玩家 advance-source-time 仍會將未審查的 EVENT 狀態標為未知；不能將 B-56 稱為「完整真實自然事件」。

## 工作約束與下一步

繼續在 test/task02-baseline-on-s1 與 GitHub Draft PR #1 開發；原始 main、migration 底分支、Core Perl 與兩份 DSL 不修改，PR 不合併。後續優先移植能直接影響店鋪／世界的其他事件啟動回呼，再處理活動事件生命週期、亂數順序可重現途徑、同一玩家時間片和36h跨期結算，直到前端可完整玩完一個閉環才做人工集中驗收。
