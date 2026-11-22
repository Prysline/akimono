# GameCore／StreetModule／WorldState｜現行責任契約修正（2026-11-22）

> **重要：下方 B-31 內容是第一個可執行契約的「歷史實作記錄」，不是正式最終架構。** B-31 已驗證版本／CAS／分派等最低層介面；但後續演進已顯示僅靠 streetModule.apply() 去承擔原版所有商業邏輯，會把各個來源審閱模型與商品／事件專用命令堆到 Standard Street。當前實作依然如此，這一節是目標合約及重構驗收，不代表程式已完成更改。權威工作序列見 [現行可玩閉環與共用核心計畫](playable-loop-priority-plan.md)。

## 為何 B-31 最初責任切分不能直接延用

B-31 文件第「三個模組及責任界線」表明 GameCore 不涉及商品 ID、原版 DSL、商品價格、回呼、交易收費和商業邏輯。這在最初僅做記憶體 CAS 的階段是合理的**受限實作宣告**，但不能把它升格為正式架構原則：原始 Core 的 inc-turn.cgi、plug/use.cgi、plug/whole.cgi、buy-s.cgi、inc-period.cgi 本來就是三條街道共享的運作規則；現在的 standard-street-module.mjs 則隨 B-40～B-63 擴充出多個依 ITEM #10／#11／#14、指定地圖及指定事件分流的 reviewed/project 命令。

代價不是「原版驗證太多」，而是**同一套來源已證明的算法沒有成為一次驗證、各街共用的正式執行能力**。每個微小功能因而重複遭遇來源 pinning、特殊抽樣、Perl fixture、Node 模型、CAS、存檔和 HTTP 整合的前置成本。沒有工時計時證據，不應量化為實測「10 倍」；這是由現有程式與階段紀錄可支持的結構性成本解釋。

## 正式責任（目標；尚待實作）

| 層次 | 規則責任 | 邊界與證據 |
| --- | --- | --- |
| **GameCore：共同規則引擎** | 共用命令校驗及調度，並真正執行原版共用的 UseTime、UseItem/MakeAmount、庫存、批發供需、玩家買賣、自然售出／人氣／稅、世界時間分段、商品及事件回呼序列、SortDT、36h 週期決算 | 據 Core inc-func.cgi、inc-turn.cgi、plug/use.cgi、buy-s.cgi、inc-period.cgi、inc-makeitem.cgi；共用公式只實作一次，必須可被多個 StreetModule 呼叫 |
| **StreetModule：街道差異與掛鉤** | 版本化設定、ITEM／USE／EVENT 編譯成果、職業／初始化參數、回呼行為、必需的特殊命令及特殊世界狀態；按原版時序提供 sale/use/turn/period 等擴充點 | 不重新實作一份市場、自然銷售或決算；URon 髒碗販售副作用、WAtlas 期末海域更新為跨街驗證 |
| **RulesCompiler／Registry** | 把已核對 DSL 語義、公式／預設、宏、USE／NEED／GET 與函式參考，編譯為安全、可檢查的資料及有限回呼；保留 source file／line／blob 與 unsupported 語義 | **不在正式玩家命令中任意 eval 原版 Perl**；未知語義明確拒絕並給出來源位置，但不可只因未知 itemId 就重寫 command |
| **WorldState／Persistence** | 街道及共用世界狀態、原版數值語義、版本、原子交易、失敗無副作用、可恢復落盤；未來可替換資料儲存 | GameCore 是規則權威，Repository 是持久化／CAS 權威，兩者不可互相猜測資金或庫存 |
| **UI／API** | 送一般命令、呈現權威資料與錯誤 | 不依 ITEM ID 自行算錢或直接做世界變更 |

**操作介面（示意，尚未實作）：** market-buy(shopId,itemId,count)、use-item(shopId,itemId,useId,count)、edit-showcase、advance-world-time。不同商品的合法行為經同一命令＋不同編譯資料與回呼表達；**絕不可因新增 ITEM #41／#42 而再新增一個 buy-market-item-41／42 Command**。

### 原版順序不得因抽象化被改掉

- 入口先由 GetUseItem／CheckUseItem 處理職業修飾、來源定義的使用前回呼及材料持有檢查；UseItem 再依熟練、職業、人氣、事件、資金、可用時間及材料**縮減實際次數**，接著扣資金／時間、逐材料與 GET 執行 MakeAmount、於原版位置 CheckWholeStore、使用後回呼，最後處理 EXP；這是兩個函式的相鄰責任，不可把 CheckUseItem 的回呼簡化成「扣費之前一律驗證」。
- 世界時間片：自然販售 → 商品 FUNCTURN → FUNCSALE → SortDT → 達期界時 inc-period.cgi → 市場 PLUS／上限 → EVENT 結束／開始／持續效果。
- 週期回呼：街道 UpdateResetBefore／UpdateResetAfter 對應原版固定相對位置。URon 原版覆寫整份 inc-turn.cgi，須先比對所有差異再選適當擴充點，不能只保留髒碗一行而假定其他完全相同。
- 所有原版 Perl 亂數、hash 順序、整數截斷、稀疏陣列與副作用風險維持可測；尚無等價方案者不能假稱已精確重現。

## 驗收門檻應依正式任務分層，不能要求全遊戲完成才驗收介面契約

**任務04｜GameCore／StreetModule／WorldState 架構契約的完成條件：**

1. Core 實際具有**至少一種可運行的共同商業規則流程**（例如同一個通用市場進貨及商品使用命令可處理兩種來源合法商品），不只是呼叫街道模組；新商品不需要新 command 型別。
2. 有可執行的街道設定／規則掛鉤合約，已核對的共用演算、街道參數、特殊回呼、時序及狀態變更的責任界線清楚，並以**兩種來源支持的街道差異案例或等效契約測試**證明不把 Standard ID 寫死在共同公式。實際完整 URon/WAtlas 玩法可以在任務08／12 才驗收。
3. WorldState／Repository 的 schema、CAS、失敗無副作用和本機儲存邊界有可重用測試；原版來源 SHA 與已驗證行為覆蓋仍保留，**舊測試檔可在新增替代測試且證明覆蓋等價後改寫、合併或移除**，不要求維持全部歷史斷言。若尚不支援某個合法分支，應依具體未支援語義拒絕並明示，而非把所有未列白名單商品視為不合法。
4. 同一 HEAD Push／Draft PR CI completed/success，沒有以新增抽象介面冒充已移植完整 Core。

**任務05～07｜完整規則及標準街閉環的後續驗收：** 通用 USE、市場、販售、時間與事件／36h期末能在真玩家世界執行並保存、重啟後續營；這不是任務04單一階段必須一次完成的前置條件。

**任務08／12｜跨街道擴充的後續驗收：** URon 售出麵食生成髒碗與 WAtlas 期末海域更新使用**同一**共同 Core，不重新複製自然販售或決算；不把人工測試街道誤認為正式的原版差異驗證。

**測試治理：** 每個新增的共同執行能力須新增原版差分、共用命令、街道差異及 CAS／持久化風險測試；每個被取代的 B-xx 專用命令／模型須檢查其舊測試，屬重複或綁定過時內部實作且已有同等覆蓋者應移除，留下清楚的新舊測試／來源行為對照。不得用刪測試換取 CI 綠燈，也不得把測試斷言總數當作完成度。詳細準則見 [現行計畫的重構測試治理](playable-loop-priority-plan.md)。

**狀態：以上是重整後的驗收規格，尚未代表新共同規則引擎已完成。** 現有 B-31 記憶體命令契約、B-43 本機存檔及 B-01～B-63 原版對照成果保留。

---

## B-31 第一版介面與來源驗證（歷史紀錄）

# 第三十一階段｜Game Core／Street Module／World State 的第一個可執行介面

## 定位：開始正式任務04，但尚未完成所有正式驗收

沿用 [Notion 任務04](https://app.notion.com/p/41db4185273f81288606d7d5a4375794) 的三項驗收：核心輸入／輸出及商店、世界、商品／行動／事件資料結構；街道專屬效果的擴充界線；本機與伺服器重用規則的設計與取捨。

本階段交付**可真正執行且通過測試的第一版契約**，而不是可玩的完整 Core：新增純函式 `GameCore`、可插拔 `StreetModule`、不可變 `WorldState` 和只在記憶體內運作的 `WorldRepository`。只支援兩個**來源已經過舊階段驗證**的標準街操作：`open-shop`（固定 Core `new.cgi` 與標準街 `@@FUNCNEW` 的受審閱宣告子集）及 `edit-showcase`（固定 Core `sc-s.cgi` 與標準街受審閱商品資訊）。

**明確未完成：** 標準街真實商品使用流程、供需、銷售、事件執行、週期結算、真實存讀檔、帳號、權限／授權、網頁、多人的世界同步。因此 Notion 任務04**可以進行中，但不能標記為已完成**。正式任務02仍持續進行中，作為來源忠實性驗證依賴。

## 三個模組及責任界線

| 模組 | 交付檔案 | 真正執行 | 不涉及 |
| --- | --- | --- | --- |
| **Game Core** | [`src/game-core-contract.mjs`](../src/game-core-contract.mjs) | `applyGameCommand({world,command,streetModule})`：驗證版本、街道 ID、可支援命令、呼叫街道模組、產生下一版純世界狀態與 receipt；回傳拒絕時保留原始快照 | 商品 ID、原版 DSL、商品價格、回呼、交易收費、完整商業邏輯 |
| **Street Module** | [`src/standard-street-module.mjs`](../src/standard-street-module.mjs) | 讀取現有標準街兩份原始 DSL；使用 B-01 已建立的來源驗證 `createStandardStreetShop`、`editShowcase`；只允許 `open-shop`／`edit-showcase` | 源碼中其他 `USE`、`EVENT`、`@@FUNCITEM`／未知回呼的執行或默許成功 |
| **World State / Repository** | `src/game-core-contract.mjs` | `createMemoryWorld`、`validateMemoryWorld`、`encodeMemorySnapshot`、`decodeMemorySnapshot`；`createMemoryWorldAdapter` 的記憶體讀取與 `compareAndSwap`，以及 `executeMemoryCommand` | 真實世界檔案／資料庫、檔案鎖、併發程序、斷電恢復、主帳號與伺服器身分驗證 |

## 明確的 JSON 介面（皆為**本階段合成記憶體世界**）

```js
const world = createMemoryWorld({
  worldId: 'synthetic-world',
  streetId: 'standard-street',
  nowSeconds: 1000000,
});

// schema = 'akimono.memory-world.v1'
// world = {
//   schema, worldId, streetId, revision: 0, nowSeconds,
//   shops: [], market: null, events: null
// }
//
// market 和 events MUST remain null before their real source-backed
// meanings, update rules and required data are reviewed.
//
// command = {
//   kind: 'open-shop', expectedRevision: 0,
//   shopId: 1, ownerName: '店主', shopName: '標準街測試店'
// }
// result = {
//   ok: true, code: 'APPLIED', world: {revision: 1, ...},
//   details: {action: 'open-shop', shopId: 1, ...}
// }
```

- `revision` 是**此新版記憶體 API 的並行版本欄位**，不是 Perl 原版新增的店鋪數值規則。命令必須帶 `expectedRevision`；過期就回 `REVISION_CONFLICT`，不修改世界。
- `StreetModule` 介面為 `{id,capabilities,metadata,catalog,apply({world,command})}`。核心**不含任何標準街特定商品或價格公式**，同一核心可使用不同街道模組；將來可讓本機或多人伺服器呼叫**同一套純函式核心**。這不表示多人權限／授權已完成。
- `StreetModule.catalog.items`（79筆：`id/name/code/priceRaw/limitRaw/flagRaw` 和來源）／`uses`（116筆）／`events`（25筆）均來自原版 DSL 的只讀結構解析。USE／EVENT 紀錄保留 `sourceFile`、`sourceLine`、`ownerItemLine`、`sourceFields[欄位名][] = {raw,line}`，而且全部都明確標 `runtimeSupported:false`。**來源原文≠已完成商品使用或事件編譯器。**
- `open-shop` 只呼叫原本來源忠實的新店初始化模型，初始化原版初始資金（範例10萬）、剩餘時間（範例43200秒）、初始商品與單一展示架；新增相同 `shopId` 會被拒絕，既有店資料保持不變。它不是完整帳號註冊或世界創建流程。
- `edit-showcase` 在指定已存在店鋪中編輯一格，保留來源對商品庫存、禁止展示旗標、定價和操作時間的既有驗證。沒有任何未審閱的預設價格被憑空補入。
- `market:null`、`events:null` 是**未實作的明確空值**，不是「市場庫存為零」、「所有事件不觸發」或正式原版世界狀態。`period-settlement`、`market-sale`、`use-item`、`buy`、`event` 等均返回 `UNSUPPORTED_ACTION`，**不應由前端當成成功執行**。
- `SOURCE_BOUNDARY_REJECTED`（已知命令卻未通過來源模型資料檢查）、`STREET_MISMATCH`、`REVISION_CONFLICT`、`UNSUPPORTED_ACTION` 都返回 `ok:false` 且不改變世界。這些錯誤碼是**新版 API 介面**，不是原版使用者文案。
- `WorldState` 必須是有限、安全整數、非循環的純 JSON 資料。解碼不接受未知 `schema`、額外頂層欄位、重複店鋪 ID、非 JSON 值或壞格式。這些都是**合成測試資料與序列化限制**，不是替原版 Perl 增加新的數值規則。
- `encodeMemorySnapshot` 只回傳字串；`decodeMemorySnapshot` 只解析並驗證純資料。**完全沒有 IO**，不可以因為 API 有 snapshot 一詞就宣稱支援實際遊戲存讀檔。
- 記憶體 `compareAndSwap` 比對 `revision`，另外防止世界 ID、街道 ID、世界時間和一次跳多版被接受。這不包含磁碟原子性／跨程序交易；多使用者伺服器還需要權威的帳號授權及持久化實作。

## 最小來源支持流程與拒絕案例

```text
固定原版 DSL（讀取，不執行 Perl）
    │
    ▼
Standard Street Module — catalog 非執行原文、2 種明確可執行命令
    │
    ▼
Game Core — 純命令處理，版本、街道 ID 與支援能力驗證
    │
    ▼
World State（新版合成記憶體）— 不可變 shops、revision
    │
    ▼
Memory CAS adapter — 本次提交或 REVISION_CONFLICT
```

```sh
cd modern
npm test
npm run demo:game-core
```

[`tests/game-core-contract.test.mjs`](../tests/game-core-contract.test.mjs) 直接使用兩份原版 DSL 和固定 `new.cgi`、`sc-s.cgi` 快照，對照原本 `createStandardStreetShop`／`editShowcase` 的結果，並測試：

- 新店初始化、原版限定來源操作及「新增店→修改展示架」不可變狀態連續轉移；
- 模組沒有接入市場／事件或任何未知回呼時，命令**嚴格拒絕**；
- 同一版本兩個提案只有第一個可 `compareAndSwap`，過期提案不得覆蓋；
- 失敗命令不修改資金、庫存、世界、事件／市場空值，沒有自動「修正」原版；
- 非 JSON 世界、非安全整數、未知 schema／額外欄位拒絕，以及 JSON snapshot 的確定性 round-trip；
- 另外用**明確標示非真實遊戲**的人工測試街道證明通用 Core 可被另一個 StreetModule 驅動，而非為標準街寫死。

## 取捨與下一步

本階段**選擇維持 Node.js 22＋ESM＋純函式**，因為目前先驗證原版資料模型與模組界線；**尚未**決定正式前端框架、多人 DB、伺服器部署或資料安全策略。現有 memory CAS adapter 可先讓本機測試與將來伺服器共用同一套核心程式，**不能**保證正式的併發安全、權限或持久化。

**正式任務04尚需完成**：真正 Core 命令的完整資料結構與事件／街道特殊效果掛鉤、世界市場狀態及後續結算；補齊來源依據及單機／多人 adapter 規格，才能將任務04改為已完成。其後優先依任務05～07串「進貨→使用→陳列→市場銷售→週期結算→可信狀態快照」；不可用 mock 自創原版數值或暗中跳過未審閱 callback。

原始 `main`／`migration/standard-street-s1`、兩份原版 DSL、已固定18份 Core Blob SHA 及 Stage30 的 CORE-01～CORE-20 注意事項均不修改。變更只放測試／移植分支與 Draft PR，原版資料不寫入。
