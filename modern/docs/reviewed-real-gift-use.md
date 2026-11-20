# 第三十三階段｜第一筆真正標準街商品 `ITEM #79 / USE #0` 接入 Game Core

## 已完成的是哪一筆真實商品規則

本階段首次把**原版標準街真正商品**的來源已審核使用動作，接入第31階段的 `standard-street` StreetModule 和 Game Core 命令介面，而不再使用第32階段人工 A/B/C 商品。

來源未改：[固定原始標準街 `custom/inc-item-data.cgi`](https://github.com/Prysline/akimono/blob/7301b0c2b1e27226d1770e153fa3c68cfeae6d48/custom/inc-item-data.cgi)，**`ITEM #79`**（`code=gift`，原名「禮物卷」）第一個 **`@@USE`（原始編譯後 `USE.no=0`）**：「交換地圖集」。

| 欄位／原版項目 | 真實 DSL | 固定原版編譯後的限制 |
| --- | --- | --- |
| 使用來源 | `ITEM 79 / code gift / USE 0` | 唯一被允許的商品使用動作 |
| 使用材料 | `use 2 禮物卷` | `item 79` 消耗2，`proba 1000` |
| 產出 | `get 1 到附近山區的地圖` | `item 12` 取得1 |
| 產出 | `get 1 到附近礦山的地圖` | `item 9` 取得1 |
| 產出 | `get 1 到劍市的地圖` | `item 14` 取得1 |
| 原始時間 | `time 1h` | 標準街 `ItemUseTimeRate=0.5` → **`time 1800`、`exptime 1800`** |
| 原版錢／熟練度 | 這筆 USE 未設 `price/money`、`exp` | 使用成本0、沒有熟練度獎勵 |
| 特殊函式 | 未設 `func/funcb` | **無自訂回呼**，不是聲稱其他 USE 也無特殊效果 |
| 商品上限 | 禮物卷 `limit 10/0`；三種地圖各 `limit 3/3` | 前值是店鋪上限，後值是批發上限；不是數字除法 |
| 結果文字 | `okmsg 感謝您的使用` | 編譯結果中的 `message.resultok` |

本階段**不包含其餘115筆 USE**，也不代表地圖商品本身的探索 USE 可執行。

## 來源忠實性的證據：原版**編譯器子函式**與真實 `UseItem`

採用固定上游 `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365` 的不可變快照：

- [實際來源 Perl 編譯器隔離器](../tests/original-perl/OriginalGiftMapUseHarness.pm) **原樣擷取並執行固定 `inc-makeitem.cgi` 的 `GetTime`、`GetNumber`、`GetString`、`GetItemNumber`、`ClearBuffer`、`GetBuffer` 子函式**。只餵給它們實際來源中已檢查過的79項商品 `PRICE/LIMIT` 及禮物卷第一筆 `USE` 資料。原版不安全的完整編譯器頂層（刪除生成資料、建目錄、寫檔、維護鎖、完整 DSL 巨集及未知回呼）**完全不執行**。
- 79項商品的店鋪與批發上限，逐筆由固定原版 Perl 編譯函式真正計算；另一側 Node 使用[已審核 `item-limit-model` 數值規則](../src/item-limit-model.mjs) 重建。包括原版編號13和63 **`price=0` 但有明文 `limit=1/1` 的情況；不可強加「所有 ITEM PRICE 必須為正」。
- 同一隔離 Perl 執行環境真正執行**完整固定 `plug/use.cgi::UseItem` 原文**，其 `MakeAmount`、`calc.cgi::UseTime/GetItemUseTime`、`whole.cgi::CheckWholeStore` 也均為來源原函式。`RequireFile("inc-item.cgi")` 仍只使用已有 B-30 的嚴格記錄型替身；這筆 USE 沒有自訂函式，因此沒有執行未知回呼。
- [原版 Perl 六種情境 JSON 探針](../tests/original-perl/original-gift-map-use-probe.pl)：單次交換1、同筆交換2、請求3但材料只允許2、請求0、三次連續交換（第3次不足材料）、地圖上限已滿。**共6種場景、8次受控真 Perl `UseItem` 執行**。Node 在[跨語言測試](../tests/reviewed-gift-map-use.test.mjs)中逐筆對比79項上限、庫存、時間、金錢、原始結果及明確批發資料。
- [53項原版 Perl 直接斷言](../tests/original-perl/original-gift-map-use.t)：驗證編譯出的 `USE.no=0`、原始材料及三張地圖的確切 ITEM 編號、時間倍率、商品上限、結果訊息、連續交易與超限時結果。

## Node 真實標準街模組新增的單一命令

[來源審核的單筆禮物卷使用模型](../src/reviewed-gift-map-use.mjs) 僅接受原樣 DSL 的**確切七類欄位**、前五筆禮物卷 USE 總數及**第一筆**受審閱動作；核對 `ItemUseTimeRate`、所有79項明文 `PRICE/LIMIT` 與目標商品名稱／編號。來源欄位、數量、機率、特殊回呼或未審核語法改變，**拒絕運行**，不推測結果。

[標準街 StreetModule](../src/standard-street-module.mjs) 新增唯一命令 `gift-exchange-maps`，要求：

- `shopId`：必須是已開店的真實標準街商店，且有完整79格原版商品庫存。
- `requestedCount`：非負安全整數；來源資格、可用時間、材料庫存會按原版 `UseItem` 順序修正真正可執行次數。
- `expectedRevision`：第31階段新增世界版本欄位，僅用於純記憶體命令的衝突防止，不是原版商品數值。
- **禁止**任何未審閱的 `itemId`、自訂材料、價錢、回呼或概率欄位；其他115筆 USE 及原始25筆事件仍**沒有變成可執行**。

### 特別重要：批發市場仍是**人工、明確標記的世界測試輸入**

第31階段開店後 `WorldState.market=null`，代表正式市場尚未實作。這個單一商品 USE 必須按原版順序呼叫 `CheckWholeStore`，因此**不能**悄悄把 `null` 當成批發0或跳過原版市場修正。

目前只有當外部測試**明確提供**：

```js
market: {
  source: 'explicit-b33-test-fixture',
  wholesale: Array(79).fill(0)
}
```


時，才允許在**受控的真實商品測試**中執行 `gift-exchange-maps`。這個79格初始批發數列是**人工測試注入**，**不是已確認的原版世界開服市場初始化值**；在沒有它時命令回 `SOURCE_BOUNDARY_REJECTED`，不扣商品、不修改金錢或時間，也不遞增世界版號。

這個限制是**刻意保留未完成的真實市場整合缺口**，不是將原版規則修改成一個新市場系統。商品使用通道只供明確標記的測試資料驗證，不能直接作為正式伺服器或玩家端交易入口。

### 可重現的來源商品狀態

第31階段真正標準街新店（此例 `nowSeconds=1,000,000`）依已審核 `FUNCNEW` 取得**ITEM #63 展示架工具1個、ITEM #79 禮物卷5張**。在*人工批發全0測資*下：

| 狀態 | 禮物卷 #79 | 山區地圖 #12 | 礦山地圖 #9 | 劍市地圖 #14 | 店鋪時間戳 | 世界版本 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 開店、人工批發測資已注入 | 5 | 0 | 0 | 0 | 956800 | 1 |
| 第一次交換 | 3 | 1 | 1 | 1 | 958600 | 2 |
| 第二次交換 | 1 | 2 | 2 | 2 | 960400 | 3 |
| 第三次：材料不足，拒絕 | 1 | 2 | 2 | 2 | 960400 | 3 |

**兩次交換金錢仍為100000，當日支出0，未新增熟練度**。由於真實三種地圖均限制店鋪持有3份，本例沒有超限。另有明確合成上限測試：三種地圖原本各3份時，原版仍扣2張禮物卷、消耗時間，原始 `additem` 留下三個 **0**，批發投影依原版 `CheckWholeStore` 歸0；不能因為存滿便擅自把整個操作視為不成立。

### 原版訊息陣列相容性（CORE-21）

禮物卷的 `use/get` 沒有任何第四欄訊息。原版生成記錄缺少 `message` 鍵，但真正原版 `UseItem` 仍在每個**實際材料／產出**步驟 `push`：結果的 `usemsg=[undef]`、`addmsg=[undef,undef,undef]`。

Node 會在來源輸出的 JSON `receipt` 中保留對應 `null` 陣列元素；**不能省略整個陣列，也不能憑空補字串**。這項特殊來源順序獨立記錄於 [CORE-21](original-behavior-issues.md)。

## 實際交付物與驗收邊界

| 檔案 | 作用 |
| --- | --- |
| [`src/reviewed-gift-map-use.mjs`](../src/reviewed-gift-map-use.mjs) | 嚴格限定真實禮物卷第一筆使用動作與79項來源商品上限，純數值投影 |
| [`src/standard-street-module.mjs`](../src/standard-street-module.mjs) | 新增唯一真商品使用命令 `gift-exchange-maps`；其他商品 USE 不支援 |
| [`tests/original-perl/OriginalGiftMapUseHarness.pm`](../tests/original-perl/OriginalGiftMapUseHarness.pm) | 只抽取原版編譯器安全子函式＋完整原版 Core 商品使用函式，源 DSL 人工市場79格執行 |
| [`tests/original-perl/original-gift-map-use-probe.pl`](../tests/original-perl/original-gift-map-use-probe.pl) | 6種情境8次受控來源 Perl 商品使用、涵蓋多次、上限滿、材料不足 |
| [`tests/original-perl/original-gift-map-use.t`](../tests/original-perl/original-gift-map-use.t) | **53項**真正原版 Perl 編譯／執行／結果斷言 |
| [`tests/reviewed-gift-map-use.test.mjs`](../tests/reviewed-gift-map-use.test.mjs) | **27項** Node 測試，含所有79項上限與6場景原始 Perl 對照 |
| [`scripts/demo-real-gift-maps.mjs`](../scripts/demo-real-gift-maps.mjs) | 新店 → 明示注入人工市場 → 兩次實際來源禮物卷交換 → 失敗拒絕的純記憶體示範 |

```sh
cd modern
npm test
npm run demo:real-gift-use
cd tests/original-perl
prove -v original-gift-map-use.t
```


**仍未完成**：真實批發市場初始化／資料提交與其他商品市場變化、完整 `GetUseItem/CheckUseItem` 正式顯示與權限、所有其餘 USE／函式／工作倍率、其他事件、世界存取、玩家帳號、身份驗證、鎖／備份、完整原版 CGI、Web UI 和多人世界。**CI 全過僅代表本階段限定的已覆蓋案例成功，不能視為完整可玩或正式任務05驗收完成。**

原版兩份街道 DSL、原先14份加後續4份共18份固定 Core Blob SHA、`main`、`migration/standard-street-s1` 都不修改。變更只在 `test/task02-baseline-on-s1` 的 Draft PR #1。
