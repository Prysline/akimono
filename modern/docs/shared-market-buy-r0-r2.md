# R0／R1 範圍紀錄與 R2-A～E 現況｜共用市場、交易、商品使用

> **2026-11-22 最新 R2-A 驗收判定（優先於本檔歷史初版紀錄）：R2-A「共用市場買入核心」已完成自身退出條件；R2-B／C／D／E 均未完成，R2 整體仍未完成。** 完成的是共用買入演算法與原版直接差分、全域／商品回呼時序及 fail-closed 邊界，**不是**全商品接入、正式 UI 遷移、刪除三條舊交易演算法或共用 USE。本檔可在沒有對話記憶時獨立閱讀；不可用舊標題或 CI 綠燈推論 R2 整體完成。只在 `test/task02-baseline-on-s1`／Draft PR #1 修改 `modern/`，不動凍結 Perl／DSL、其他分支與 Notion 正式狀態。

## 先讀：目前真正做了什麼、缺什麼

| 範圍 | 現況 | 可核對證據或尚缺條件 |
| --- | --- | --- |
| R0 基準盤點 | 市場進貨重點清冊已做；R0 全量尚未結案 | 下表只列與買入直接相關的代表性測試；**不是**原有全部測試逐檔「來源行為／風險／替代／處置」映射 |
| R1 共用契約 | `market-buy` 子契約已可執行；完整 R1 尚未結案 | `market-buy-core.mjs` 與本文契約存在；通用 ITEM／USE／EVENT 編譯及全回呼生命週期契約尚不完整 |
| **R2-A 買入核心** | **已完成 R2-A 退出條件** | Core 共用買入演算、#10／#11／#14 ×12 類原版 Perl 直接差分、原版全域／商品回呼順序及未支援效果明確拒絕，見下方 R2-A 完成證據；**不包含** B/C 的新商品接入與舊演算法去重 |
| **R2-B 資料驅動接入** | **未完成** | `standard-street-module.mjs` 的 `sharedBuyRules` 仍逐項硬列 #10／#11／#14；`marketBuy.getRule` 只能取得這三項 |
| **R2-C 唯一買入路徑** | **未完成** | 仍有 `buy-market-item-10/11/14` 分派到三套 `projectOriginalMarketBuy*`；本機 UI 尚未全面改送 `market-buy` |
| **R2-D 共用 USE／生產** | **未完成** | `use-item(itemId,useId,...)` 尚非正式共用執行命令；#79、#14 仍是來源特定操作 |
| **R2-E 真世界整合驗收** | **未完成** | 既有 CAS／磁碟保存及部分 Perl／Node 比對已通過，但未以統一路徑完成可重用買入＋USE＋HTTP／持久化端對端驗收 |

**唯一正確的結論：已有一個可測試的共用市場買入函式，不等於市場進貨架構已通用化；R2 沒有完成。** `market-buy` 不是只有改名字：目前三套舊演算法仍與它並存。#10／#11／#14 是已接入的測試樣本，**不是**原版合法商品的完整功能邊界。商品不在白名單時，目前會拒絕，但不能據此宣稱原版商品本身不合法或具有未知回呼。

### 已有實作的確切邊界

- [`market-buy-core.mjs`](../src/market-buy-core.mjs)：共同計算買入裁切、付款、`paytoday`、庫存、600 秒（由已審閱規則提供）、原版 72 小時 `UseTime` 上限與交易回執，透過 [`game-core-contract.mjs`](../src/game-core-contract.mjs) 的不可變快照／CAS 提交。
- [`standard-street-module.mjs`](../src/standard-street-module.mjs)：由已存在的三筆來源審閱模型手動組出 `sharedBuyRules`，提供商品順序、單店市場驗證、原版 79 欄 `SetWholeStore` 寫回；**尚無能自動讓來源合法一般商品接入的完整規則編譯／Registry**。
- 商品 #10／#11／#14 的 `buyCallback:null` 表示這三商品本輪沒有商品專屬買入回呼，**絕非全域 `@@FUNCBUY` 不存在**。標準街原版 DSL 的 `@@FUNCBUY`（`custom/inc-item-data.cgi:3369`）明確在市場買入每滿 500,000 G 時透過 `AddItemSub` 贈送 #79 禮物卷；三商品個別買入上限使成交總額均低於門檻，因此是**來源已證實的零效果**，不是跳過未知效果。Core 依來源審閱的門檻檢查；若未來商品可能觸發，缺少已審閱執行回呼即拒絕交易，不會默默省略。
- `buy-market-item-10/11/14` 舊命令目前仍各自呼叫三個舊 `projectOriginalMarketBuy*`，它們是**重複的正式可執行路徑**，不能稱為單純改名 alias；保留目的是遷移期間維持 UI 與既有回歸，不是架構上的永久需要。
- 本輪驗證的是既有單店、來源驗證市場、指定商品的受控範圍；沒有宣稱所有動態價格、全域回呼、公會、多店、所有合法商品或跨街道進貨已支援。


## R0｜市場買入相關舊測試之局部對照（不是 R0 全量結案）

原本 `game-core-contract.mjs` 對各動作只執行版本檢查、來源模組 `apply`、WorldState 複製與 CAS；商品 #10／#11／#14 的原始商品確認和整套買入運算分別在三個來源模型。B-43 的雙世代存檔和本機 UI 都已存在，不需重寫；本階段暫留舊命令與原始 Perl 快照以便新舊路徑交叉比對；**R2-C 的完成條件是完成遷移並移除重複正式交易邏輯**，不得把「考慮移除」當成可無期限維持雙引擎。

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

**R0 尚缺：** 這是買入重構的 10 筆重點映射，不是所有歷史測試逐筆處置清單；在 R2-E 結案前須補完受影響測試的「路徑／來源行為／風險／替代測試／處置／理由」，有替代證據才可合併或刪除。

`modern/tests/original-perl/*.t` 和固定 Perl 探針及 SHA 校驗不改：原版可執行函式與被隔離的 CGI 子流程仍是行為錨點。其餘原版商品使用、事件、結算、世界 IO 測試不屬市場進貨重寫範圍，維持現況、尚未宣稱已完成逐檔去重。**本輪無刪除測試、無孤兒 fixture 刪除。**

## R1｜目前已實作的 `market-buy` 子契約（不代表 R1 全量完成）

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
5. **原版回呼順序**：先完成帳務及商品變更，經過來源的商品初始化，再依序進入**全域 `FUNCBUY` → 商品 `FUNCBUY`**，最後交由街道批發市場 codec 寫回。原版標準街全域 `@@FUNCBUY` 並非空白，只有現行三商品單筆交易金額低於500,000 G門檻而不觸發禮物卷效果；真回呼實測與拒絕邊界請見下方 R2-A 完成證據。未審閱的效果拒絕，正式命令絕不 eval Perl。
6. GameCore 接著建構不可變 WorldState、修訂版 +1；`executeMemoryCommand` 經原有 CAS 一次提交，B-43 存檔工具沿用原結構。

此段是已實作買入命令的**狹義契約**，尚未覆蓋共用 `use-item`、全商品 DSL 語義／回呼、事件及全交易模型。StreetModule 在此子契約中**應只**提供來源審閱結果（商品、單價、持有上限、搬運時間、排序、回呼能力）、市場格式驗證與 `SetWholeStore` 序列化；目前三筆仍為手動白名單，未達資料驅動目標。Core 不內建標準街 ID 與 79 件商品；這裡 79 欄是 Standard Street 的凍結來源格式，不是所有街道的引擎假設。

## 已通過 R2-A 出口驗收的商品範圍與原版錨點（不代表 R2 全商品支援）

| 商品 | 原版商品資料（審閱值） | 共用命令範圍 |
|---|---|---|
| #10 書本寫作工具 | 價格 5000、店鋪上限 20、搬運 600 秒 | 固定來源的單店無公會批發買入 |
| #11 抽獎卷 | 價格 2000、店鋪上限 50、搬運 600 秒 | 同上；不自動執行 LOTO 活動 |
| #14 到劍市的地圖 | 價格 10000、店鋪上限 3、搬運 600 秒 | 同上；**買入不等於使用地圖或產生劍** |

原版固定 Core：`738d71a2985fd088f2ca90f25145706392ee2365`。關鍵凍結快照：`modern/tests/original-perl/buy-s.cgi`（Git Blob `6ba8df9a733ed16c490389414cd94934fe1185ca`）、`whole.cgi`（`778badaf157326bcfd1f8fa1e310d94f94995eb3`）、`calc.cgi`（`586354a9a300e26d0e12a4efa512fa25760e3197`）、`inc-makeitem.cgi`（`1da8cce1e76ad6159325a37faec68efaa82c7f69`）；兩份 DSL 不修改。

**目前實作會以固定 #10／#11／#14 的 `sharedBuyRules` 拒絕其他商品；這是暫時的程式接入白名單，並非已證明其他原版合法商品無法共用。** 尚需調查／編譯各商品實際價格條件、`FUNCBUY`、職業、公會等來源差異，支援已核對的共同語義並只對確實未知或不能表達的分支拒絕。單店、目前 UI 及存檔原有界線不變；**三條專用命令仍各自執行舊演算法，R2-C 不可在此狀態結案。**

## R2-A～E 明確工作包、驗收與退出條件（下一個無記憶工作窗照此執行）

以下 A～E 是對既定 **R2｜共用市場／交易／商品使用** 的細分執行工作包，**不是額外的新里程碑**；階段可能為完成驗證而交錯實作，但不得省略驗收。狀態見本檔開頭，**沒有任何階段可因僅有綠燈而自動轉成「完成」**。

### R2-A｜共用市場買入核心穩定化｜**已完成自身退出條件**（2026-11-22）

**驗收結論：** 真正執行同一個 `market-buy-core.mjs` 共用買入公式，Core 不硬寫 Standard 商品 ID；不同商品由 StreetModule 提供已審閱規格。直接執行固定原版 Perl `buy-s.cgi`／`GetWholeStore`／`SetWholeStore`／`CheckCount`／`GetTimeDeal`／`UseTime` 的 `modern/tests/original-perl/original-r2a-market-buy-oracle.pl`，與新 `market-buy` 指令**逐項比較三種原版合法商品各 12 類、合計 36 組**。並非只與先前 Node 專用交易模型交叉比對。

**12 類來源情境（每種商品均跑）：** 一般成交、要求量超額裁切、可支付額裁切、持有上限餘量裁切、持有上限拒絕、零資金拒絕、過期價格拒絕、錯誤貨架拒絕、零申請量拒絕、72 小時儲存時間上限裁切、未來店鋪時間拒絕、批發缺貨拒絕。對每個成功案例比較：`purchasedCount`、現金、`paytoday`、商品庫存、店鋪時間、批發數值、**完整 79 欄原版 `SetWholeStore` CSV 與稀疏定義索引**；失敗案例比較原版**未提交**與 Node 原世界／版本不變。已有連續三商品 CAS、回執、雙世代磁碟保存／重載後續操作測試。這些是 R2-A 驗證範圍，不代表有實機 CGI HTTP 或多人行為。

**被舊測試漏掉的原版 `@@FUNCBUY`：** 標準街 `custom/inc-item-data.cgi:3369` 的**全域**買入回呼，在來源 `if($BUY->{whole})` 下按 `int(成交額/500000)` 贈送 #79 禮物卷並寫入日誌。三個已審閱商品的單店持有上限 × 標價都低於 500,000 G，因此本階段的成功買入不觸發贈禮，**不可寫成「原版沒有全域 FUNCBUY」**。`standard-street-module.mjs` 檢查固定 DSL 的原文門檻／效果與原版 buy-s 回呼入口；`market-buy-core.mjs` 區分全域和商品回呼，交易額達門檻卻無已審閱處理器時 **fail closed**；本階段**未實作超門檻贈禮副作用**，待 R2-B 特殊規則接入及 R2-C 正式遷移驗收。原版 Perl 探針會執行由原始 `@@FUNCBUY` 本體隔離建立的全域回呼（僅將原版 `@@ITEMNO"禮物卷"` 巨集核對替換為 #79），並以**明示人工商品回呼測資**驗證真 `buy-s.cgi` 順序是「買方帳務／庫存完成 → `RequireFile("inc-item.cgi")` → 全域 `FUNCBUY` → 商品 `FUNCBUY` → `SetWholeStore`」；相同順序的 Node hook 測試與缺失回呼拒絕均通過。人工回呼僅用來測生命週期，**不代表原版三商品有該商品回呼**。

**來源及可查測試：** `modern/tests/original-perl/original-r2a-market-buy-oracle.pl`（新）、`modern/tests/market-buy-core.test.mjs`（加入三個新測試）、`modern/src/market-buy-core.mjs`（全域→商品回呼順序與拒絕）、`modern/src/standard-street-module.mjs`（原版全域回呼門檻來源審核）。原版 `modern/tests/original-perl/{buy-s.cgi,whole.cgi,item.cgi,calc.cgi}`、兩份 DSL 均未修改。

**驗收 CI 的程式版本：** `bd7a504bdc473a0bd34c1beb5efab8ae621d2381`，[GitHub Actions #45011886766](https://github.com/Prysline/akimono/actions/runs/45011886766) `completed/success`：Node **903/903**、Perl **1,867/1,867**（52 檔），固定 Core SHA、DSL 稽核與其他 workflow 步驟皆通過。文件提交後的**最新 HEAD 須重新核對**同 SHA CI；不得拿此歷史驗證當未來功能成功證據。

**R2-A 完成≠R2 完成：** 三件商品仍靠 `sharedBuyRules` 手動接入（R2-B 未完成）；`buy-market-item-10/11/14` 仍分流舊 `projectOriginalMarketBuy*`，本機 UI 未全面遷移（R2-C 未完成）；通用 `use-item` 與真世界買入→USE 結案驗收尚未完成（R2-D/E 未完成）。本階段不刪原本 Perl 探針、舊專用程式或測試，待 R2-C/E 按測試遷移清單去重。

### R2-B｜商品 DSL 資料驅動接入｜未完成

**工作：** 建立從固定來源 ITEM/原版編譯或可追溯來源審閱結果到 MarketBuyRule 的可重用 Registry/Compiler；輸出商品 ID、排序／庫存索引、來源檔與行號／版本、價格或計價策略、上限、原版買入時間、條件、已審閱買入回呼與具體 unsupported 原因。規則不用手動寫 #10/#11/#14 的 `sharedBuyRules`；對已支援的共同語義，新的原版合法商品應由**資料**接入。

**退出條件：** 已驗證的 #10/#11/#14 由新資料流程取得相同行為；另外用來源支持的不同合法普通商品驗證無需新增專用命令／演算法即可買入；至少涵蓋動態定價與回呼的來源分類（若尚未支援，按特定來源語義明確拒絕並留缺口，不能假稱全部商品都支援）。未支援情境需列出 itemId、來源位置、具體原因，**單純不在三件商品清單不算合理理由**；原版來源 SHA／DSL 不改。

### R2-C｜買入執行路徑與測試遷移｜未完成

**工作：** 本機 UI／HTTP API／內部買入呼叫全面改用 `market-buy`。若有外部相容需求，可在經驗證的轉接層把舊命令**轉換成**相同共用命令，但不得仍呼叫獨立交易演算法。移除沒有正式用途的 `projectOriginalMarketBuy10/11/14` 交易實作及硬編碼分派；來源比對探針可留作測試證據，不等於保留雙引擎。

**退出條件：** 從可操作繁中 UI 到 GameCore 只有**一套正式市場買入運算**；原三商品及其他已支援普通商品交易均走同一命令；沒有殘留商品編號型買入入口作為第二套交易；實測 HTTP／WorldState/CAS／存檔、原版 Perl 差分仍對齊；舊測試依 R0 清冊改寫、合併或保留必要差異，不因舊內部函式被刪而使保護消失。

### R2-D｜共用商品使用與製作｜未完成

**工作：** 正式建立 `use-item(shopId,itemId,useId,count,...)`（實際欄位須按來源定稿），集中 `GetUseItem/CheckUseItem/UseItem`、原版次數裁切、金錢／時間／材料、`MakeAmount`／市場修正、使用前後回呼與 EXP，以及必要的來源亂數順序。StreetModule 只交付已編譯的 USE／NEED／GET 與原版特殊效果；不為每個 USE 增加一個 `command.kind`。

**退出條件：** 用同一正式 USE 命令與流程重現已審閱的 #79 禮物卷地圖交換以及 #14 劍市地圖首次使用受審閱結果；保留真原版 Perl 的次數、消耗、產物、損毀／亂數、回呼及拒絕時序；第二次使用等未驗證語義應記具體缺口，不可無聲放行或憑空填入，也不可因已測首次使用就宣稱全部 USE 已通用。

### R2-E｜共同操作真世界整合與結案｜未完成

**工作：** 同一真實 WorldState 中由原版合法市場取得→買入→USE／製作→庫存與市場更新；使用現行本機 UI／HTTP／CAS、B-43 雙世代磁碟存檔及重新載入，測成功／拒絕／版本競爭／已存與損毀復原。

**退出條件：** 對 #10/#11/#14 與已審閱 #79/#14 USE 的必要原版 Perl／Node／HTTP 證據、帳務／時間／商品／批發稀疏資料與回呼生命週期一致；跨商品與跨 USE 不需改命令種類或複製完整流程；同 HEAD 的 Push 與 Draft PR CI `completed/success`，原版 Core／DSL SHA 稽核通過。R0 受影響測試映射更新完成、過時專用執行器與重複測試已按證據移除／改寫。**完成 E 且 A～D 各自合格，才能宣告整體 R2 完成。**

## R2 與後續里程碑界線

- **R2**：市場買入／交易／USE／製作，與原版特殊回呼的安全擴充；單店真世界可測並具備 UI、CAS、持久化接入。不要求先完成全遊戲事件、所有街道、多人世界。
- **R3**：共同自然販售、世界時間／PLUS／商品 FUNCTURN/FUNCSALE（以 #10、#40、#41～#44 等來源合法商品驗證）。不得在 R2 之名逐劍新增販售命令。
- **R4**：完整 EVENT、SortDT、36 小時期末轉場與必要期末擴充；無來源支持時不得偷跨期。
- **R5**：R1～R4 串成一個繁中瀏覽器可從開店玩到下一期、磁碟重啟續營的單機閉環，再做使用者一次集中人工驗收。

## 下一個工作窗必須先做的事

1. 讀 [正式 R0–R7 計畫](playable-loop-priority-plan.md)、本文件、[最新交接](next-window-handoff.md)、[GameCore 責任契約](game-core-contract-v1.md) 及真實程式與相關測試；以 PR #1 **當下** head_sha 確認分支、Draft 與未合併，不可以歷史 SHA 當現況。
2. **R2-A 已完成自身退出驗收；接著優先 R2-B 商品資料驅動規則與 R2-C 唯一買入路徑／舊程式去重**，再以 R2-D／E 完成共用 USE 與真世界結案；不要直接跳 R3／R4 或為新商品複製專用引擎。
3. 每輪回報實際支援商品及 USE 範圍、來源例外與具體拒絕原因、共用命令／特殊回呼、移除或改寫之舊命令及測試、原版對照、可玩操作與最新 HEAD 的 CI；**不要只報測試數或「第一階段完成」**。
4. 保留主線 `main`、基底 `migration/standard-street-s1`、固定 Perl/DSL、Notion 不變；PR #1 保持 Draft、不合併。

## 已有 CI 的歷史證據（不是任何未來 HEAD 的自動通行證）

2026-11-22 的共用買入初版程式基準為 `b2bfffc7a41a4d275043f448ad27541fdb704f98`，當時 [Actions run #45008806146](https://github.com/Prysline/akimono/actions/runs/45008806146) 顯示 Node 900/900、Perl 1,867/1,867（52 檔）通過；**這只證明當時受測程式與現有案例通過，不表示 R2-A～E 已完成，也不能拿來取代之後新 HEAD 的 CI。**

