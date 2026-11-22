# R0–R2 第一階段｜共用市場進貨執行契約與測試對照

> 範圍：2026-11-22，僅 `test/task02-baseline-on-s1` 的 `modern/`。這是可執行共用買入規則的第一階段，**不是**全部商品、所有街道、原版 CGI HTTP、事件及 36 小時結算完成。原版凍結檔與原有 Perl 測試不變。

## R0｜既有實際架構及測試遷移對照

原本 `game-core-contract.mjs` 對各動作只執行版本檢查、來源模組 `apply`、WorldState 複製與 CAS；商品 #10／#11／#14 的原始商品確認和整套買入運算分別在三個來源模型。B-43 的雙世代存檔和本機 UI 都已存在，不需重寫；本階段保留原舊命令與原始 Perl 快照，驗證新命令後才考慮移除重複執行程式。

| 測試檔案（真實路徑） | 對象 | 原版依據／函式 | 具體驗證價值 | 本輪決定 | 新替代證據 |
|---|---|---|---|---|---|
| `modern/tests/original-market-buy10.test.mjs` | #10 進貨、Perl 探針、HTTP UI | 固定 Core `buy-s.cgi`、`GetWholeStore`、`UseTime` | 真批發供貨後買入、來源 Perl 差分、繁中 UI/API | **保留**，不刪原版差分與 E2E | `market-buy-core.test.mjs` 新命令 #10 與舊命令同世界比對 |
| `modern/tests/b58-source-loto-real-ticket-cas.test.mjs` | #11 抽獎卷取得及事件 | 原版 `buy-s.cgi`、`original-market-buy11-probe.pl`、LOTO 回呼 | 抽獎卷真取得、數值與後續事件觸發 | **保留**事件驗證；交易運算待下一輪去重 | 新命令 #11 共用運算與完整舊世界轉移比對 |
| `modern/tests/b62-real-sword-market-map-sale-cas.test.mjs` | #14 劍市地圖買入、使用、販售 | 原版 `buy-s.cgi`、`plug/use.cgi`、地圖 DSL | 來源供貨取得及地圖 USE→木刀→銷售閉環 | **保留** USE 與自然販售證據 | 新命令 #14 共用運算與完整舊世界轉移比對 |
| `modern/tests/b63-source-all-sword-map-outcomes-cas.test.mjs` | #14 全五類劍產物 | 原版 `plug/use.cgi`、`inc-makeitem.cgi` | 抽樣、配方、能力限額與回呼風險 | **保留**，非買入演算法重複 | 無替代必要 |
| `modern/tests/game-core-contract.test.mjs` | WorldState、版本、CAS、不可變性 | B-31 Core 來源界線 | 避免命令副作用與世界跨版汙染 | **保留**，舊基本契約仍要成立 | 新命令另驗證相同 Core CAS／rollback |
| `modern/tests/b43-durable-world-save.test.mjs` | 兩代磁碟存檔／故障回復 | 凍結 `DataWrite` 為參考；B-43 Node 存檔規約 | 防止存檔覆寫、損毀及跨世界污染 | **保留** | 新命令之後執行 B-43 `save/load` 實測 |
| `modern/tests/b41-real-playable-sale.test.mjs` | 本機市場進貨後上架及自然販售 | `buy-s.cgi`、`inc-turn.cgi`、`market.cgi` | 可操作流程不可被純模型測試替代 | **保留** | 本機 UI 仍以舊相容命令使用同一來源世界 |
| `modern/tests/original-sparse-all-plus.test.mjs` | 原版批發供貨模型 | `inc-turn.cgi`、`plug/whole.cgi` | 市場有貨來源及固定亂數／讀寫形狀 | **保留** | 共用買入從相同實際 PLUS 世界啟動 |
| `modern/tests/original-admin-sparse-market.test.mjs` | 空白初始批發市場與稀疏欄位 | `inc-admin-func.cgi`、`DataRead/Write` | 不偽造庫存、保持 CSV 格式 | **保留** | 共用買入來源編碼及售罄拒絕 |
| `modern/tests/market-buy-core.test.mjs`（新增） | 共用 `market-buy` | 上述凍結 Perl、三筆審閱商品及三種舊買入投影 | 同一演算法跨商品、超限／缺貨／缺錢、版本衝突、原世界不可變、真正磁碟往返 | **新增** | 本檔本身 |

`modern/tests/original-perl/*.t` 和固定 Perl 探針及 SHA 校驗不改：原版可執行函式與被隔離的 CGI 子流程仍是行為錨點。其餘原版商品使用、事件、結算、世界 IO 測試不屬市場進貨重寫範圍，維持現況、尚未宣稱已完成逐檔去重。**本輪無刪除測試、無孤兒 fixture 刪除。**

## R1｜共用命令的可執行契約

`market-buy` 請求欄位：

```js
{
  kind:'market-buy',
  expectedRevision: world.revision,
  shopId:1,
  itemId:10,
  requestedCount:2,
  marketShelf:0,
  expectedPrice:5000,
}
```

欄位必須完全符合、整數安全且 `requestedCount >= 1`；`marketShelf` 和 `expectedPrice` 是原版報價重檢，避免玩家操作時貨架或價格已變。成功回傳 `receipt`（商品、原申請量、實際量、單價、總價、時間、店舖及市場庫存前後、資金與 `paytoday` 前後）及新版世界；拒絕時世界不變。版本衝突回傳 `REVISION_CONFLICT`；無來源支持、資料非法或未審閱回呼回傳 `SOURCE_BOUNDARY_REJECTED`。

共用 GameCore 在 `market-buy-core.mjs` 執行：

1. 驗證街道已審閱的商品和市場；貨架位置按來源商品排列順序及當前正庫存重新計算。
2. 依原版 `CheckCount`、批發庫存和現金計算 `min(要求量, 持有上限-已持有, 市場庫存, trunc(現金/單價))`；零量拒絕，其餘合法超量**裁切**而非全部拒絕。
3. `UseTime` 不允許負的剩餘時間；超過 259200 秒的儲存時間先按來源上限縮至 259200 秒，再加買入時間。#10／#11／#14 原版市場運送時間均為 600 秒。
4. 扣除店鋪現金、增加 `paytoday` 與店鋪庫存、減少批發庫存；市場購買沒有販售稅。數值溢位拒絕。
5. **原版回呼順序**：先完成帳務及商品變更，再執行已審閱的 `FUNCBUY` JS 回呼，最後交由街道批發市場 codec 寫回。三項商品的已審閱範圍不執行額外回呼；未審閱的回呼直接拒絕，絕不執行 Perl。
6. GameCore 接著建構不可變 WorldState、修訂版 +1；`executeMemoryCommand` 經原有 CAS 一次提交，B-43 存檔工具沿用原結構。

StreetModule **只**提供來源審閱結果（商品、單價、持有上限、搬運時間、排序、回呼能力）、市場格式驗證與 `SetWholeStore` 序列化。Core 不內建標準街 ID 與 79 件商品；這裡 79 欄是 Standard Street 的凍結來源格式，不是所有街道的引擎假設。

## R2 第一階段可用範圍與原版錨點

| 商品 | 原版商品資料（審閱值） | 共用命令範圍 |
|---|---|---|
| #10 書本寫作工具 | 價格 5000、店鋪上限 20、搬運 600 秒 | 固定來源的單店無公會批發買入 |
| #11 抽獎卷 | 價格 2000、店鋪上限 50、搬運 600 秒 | 同上；不自動執行 LOTO 活動 |
| #14 到劍市的地圖 | 價格 10000、店鋪上限 3、搬運 600 秒 | 同上；**買入不等於使用地圖或產生劍** |

原版固定 Core：`738d71a2985fd088f2ca90f25145706392ee2365`。關鍵凍結快照：`modern/tests/original-perl/buy-s.cgi`（Git Blob `6ba8df9a733ed16c490389414cd94934fe1185ca`）、`whole.cgi`（`778badaf157326bcfd1f8fa1e310d94f94995eb3`）、`calc.cgi`（`586354a9a300e26d0e12a4efa512fa25760e3197`）、`inc-makeitem.cgi`（`1da8cce1e76ad6159325a37faec68efaa82c7f69`）；兩份 DSL 不修改。

目前只支援已審閱 #10／#11／#14，因其他商品的動態批發價格、編譯條件、`funcbuy`、職業／公會、多人及事件尚未形成可安全執行的資料／回呼合約。這是**來源覆蓋限制**，不是新版引擎的商品 ID 限制。單店世界、既有 local UI 與 B-43 存檔政策也保留其原有限制；擴充前須另行審閱對應來源。既有專用命令暫保留供回歸及 UI 相容，不宣稱已全部去重。

## 後續整合

先將更多已來源確認的商品編譯成果輸入同一 `market-buy`，補上真正的動態市場價格與回呼測試，完成 UI 對語義命令的遷移，再處理共享 USE／生產引擎；後續自然販售以 #41–#44 劍當資料案例，**不得**新增逐商品販售執行命令。
