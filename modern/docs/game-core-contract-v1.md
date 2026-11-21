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
