# 第三十二階段｜原版商品交易在同一個合成 World State 連續保留狀態

## 本階段的精確範圍

此階段把第三十階段**已由固定原版 Perl 真正執行並驗證**的 `plug/use.cgi::UseItem → CheckWholeStore → 標準街 lostbook → inc-item.cgi::UseItem/UseItemSub → 熟練度尾段`，接進第三十一階段的 **Game Core／Street Module／World State** 命令與記憶體版本介面。

<b>最重要的來源區分：</b>第三十階段測試中的「商品 A／B／C」（商品編號 1／2／3）是**人工數值測試資料**，用以使原版 Core 的交易順序、負數、滿額、巢狀回呼與熟練度可重現。它們**不是** `custom/inc-item-data.cgi` 真正編號 1／2／3 的藥草、野獸皮革、樹枝，也**不是**實際標準街的商品配方、成本與持有上限。**不得**將此測試直接套用到真正 `standard-street` 世界的79格庫存，更不可當成可用的玩家商品使用功能。

因此，本階段**刻意將測試模組命名為另一個 `streetId='source-use-fixture-b32'`**，把人工商品及數值隔離在此命名空間中，並保留真正的 [`standard-street-module.mjs`](../src/standard-street-module.mjs) 仍只支援之前來源已審核的 `open-shop`、`edit-showcase`。此舉是在移植到可玩 Core 前確保「來源原版算式驗證」與「正式街道商品規則」不混淆。

## 來源與實際執行的原版 Perl

仍固定使用 `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`，原先14份＋後加4份共18份固定 Core Git Blob SHA 快照及原版兩份 DSL **完全不修改**。

在 B-30 的 `OriginalFullUseLostbookHarness.pm` 只增加**人工狀態輸入選項**，讓下一次仍然執行**相同原版 Perl 函式本文**，但將上一次的庫存、別店庫存、批發數量、現金、`paytoday`、`DT.time`、熟練度與合成 `NOW_TIME` 作為下一次測資。原版 `UseItem`、`MakeAmount`、`UseTime/GetItemUseTime`、`CheckWholeStore`、`item::lostbook`、`item::UseItem/UseItemSub` 的公式／函式本文仍從固定來源抽出，**沒有擅自修改原版遊戲算式、順序、條件或原版 Source 快照**。

[`original-world-use-sequence-probe.pl`](../tests/original-perl/original-world-use-sequence-probe.pl) 對三種兩筆交易序列（兩次都觸發 `lostbook`、第一次跳過／第二次觸發、兩次都無回呼）執行**六次真正 Perl 原版函式交易**，產出每一步實際觀察的 JSON；[`original-world-use-sequence.t`](../tests/original-perl/original-world-use-sequence.t) 再以 **40 項獨立 Perl 斷言**檢查兩次狀態正確延續、來源 callback 前後順序、以及原始 `count=0` 退回時完全沒有額外扣款、時間或商品變動。

[`reviewed-use-fixture-street.test.mjs`](../tests/reviewed-use-fixture-street.test.mjs) 的 **23 項 Node 測試**包含上面六次原版 Perl 的主要結果逐欄對照，再將結果透過 B-31 `executeMemoryCommand` 真正提交到記憶體 `WorldState`，核對版本號、商店／市場資料、原版 `USE.result` 的當次 receipt、重播與錯誤拒絕。原 B-30 的13組單次 Perl 對照與全部既有測試照舊執行。

## 新增的介面與資料流

- [`reviewed-use-fixture-street.mjs`](../src/reviewed-use-fixture-street.mjs) 提供 `createReviewedUseFixtureWorld`、`createFixtureState`、`createReviewedUseFixtureStreetModule`，且特別以 `SOURCE_USE_FIXTURE_STREET_ID='source-use-fixture-b32'` 表示**人工測試街道**，不能誤作原版標準街。
- `WorldState.shops[0]`（人工店 #42）中保留 `item[0..2]`、`money`、`paytoday`、`time`、`exp`、`status`；`WorldState.shops[1]`（人工店 #43）保留別店三格商品庫存；`WorldState.market.wholesale` 僅為此**人工 Core 市場 fixture** 的三格批發庫存；`events=null`（沒有執行事件）。
- `source-fixture-use` 命令限 `shopId=42`、非負整數 `requestedCount`、整數 `param1`、已審閱的 `callback='lostbook'`／空回呼，以及明確的 `perlRandBucket`，**不接受任何額外商品 ID、配方或私自改費用的欄位**。
- `source-fixture-use` 先讀取**當前快照**，呼叫 B-30 的原版數值投影（保留巢狀後置回呼與一次批發檢查），再由 B-31 `WorldState` 的 `compareAndSwap` 將下一筆庫存、金錢、時間、熟練度及批發量一起提交。`receipt` 另回傳當筆原版 `USE.result`、`sourceTrace`、回呼看到的庫存／熟練度及一次市場檢查數。
- `originalPerlDraw` 原版 `rand(1000)` 是浮點數，而 B-31 記憶體命令契約刻意限定可安全序列化的整數。因本次固定 `lostbook` 的 `param1` 是**整數門檻**，原版 `rand(1000)<param1` 與 `floor(rand(1000))<param1` **邏輯完全相同**。B-32 明確使用 Perl 實測或合成的 `perlRandBucket=floor(originalPerlDraw)`，**不生成「等價的 JS Perl 隨機種子」**；不外推至需要浮點隨機結果或非整數門檻的未驗證場景。
- `source-fixture-use` 若原版有效次數 `count=0`，來源交易沒有實際效果，這層**新版 World State 契約**直接拒絕提交，不憑空增加版本。這個版本拒絕是**新版命令語意**，不宣稱原版 Perl CGI 回傳相同錯誤訊息。
- 既有 `standard-street` 模組仍**不支援** `source-fixture-use`、`use-item`、市場銷售、其他商品回呼與事件；正式標準街的79格商品／每筆配方仍須逐項來源審核。

## 可重現的「兩次記憶體交易」範例

以人工商店 A/B/C 初始 `stocks=[8,4,3]`、`other=[3,4,2]`、批發 `[4,0,-5]`、金錢70、當日支出5、時間950、`NOW_TIME=1000`、熟練度200、每次請求1次及確定觸發 `lostbook`（`param1=1000`）：

| 時間點 | 商品庫存 | 金錢 | 當日支出 | 商店時間 | 熟練度 | 世界版本 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 人工起始 | `[8,4,3]` | 70 | 5 | 950 | 200 | 0 |
| 真正原版 Perl 第一次使用後 | `[9,6,5]` | 50 | 25 | 968 | 230 | 1 |
| 真正原版 Perl 第二次使用後 | `[9,6,5]` | 30 | 45 | 986 | 260 | 2 |

這兩次商品使用的 `CheckWholeStore` 每筆都只呼叫**一次**，後置 `lostbook` 仍只在市場修正後執行。回呼觀察到熟練度先後是200、230；原版尾段分別增加到230、260。對於人工商品 C，第二次已經在取得前到達上限，因此批發第3格會維持原版觀察值 `-3`，**不是先前未觀察而猜測的 -1**；沒有任何額外補修復或第二次市場計算。

## 同一套純 Core 與未驗證邊界

```sh
cd modern
npm test
npm run demo:world-use
cd tests/original-perl
prove -v original-world-use-sequence.t
```

新增示範 [`demo-world-use-sequence.mjs`](../scripts/demo-world-use-sequence.mjs) 透過純記憶體同一個 World State 先後使用兩次，然後證明**過期版本命令不會重複扣款**，未支援市場銷售也不修改世界。**全部資料只存在程式記憶體，JSON snapshot 仍是純字串，沒有真實 IO。**

本階段**沒有**：真正標準街的 `USE` 原版編譯／選擇／回呼、完整79件商品的正式限額、權限／帳號、真正檔案存讀、CGI、真人商店、市場銷售、週期結算、完整玩家介面、多人資料庫。數值範圍和失敗代碼是測試介面限制，不是原版新增的遊戲規則。

### 下一步

**第三十三階段**應優先選出一個**真實標準街 DSL 的明確 `ITEM+USE`**，逐段對照固定原版 `inc-makeitem.cgi` 輸出的 `USE` 欄位和允許回呼，在同一個 `standard-street` 的79格庫存中建立來源認可的交易資料模型；沒有足夠來源證據時就停在拒絕而不轉成默認數值。其後才逐步將真實市場銷售、週期結算接到同一 World State，達到 Notion 任務05～07最小可玩閉環的正式驗收，不能拿這個**人工 Core fixture** 當成已完成商品系統。
