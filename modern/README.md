# 《商人物語》標準街 — 現代化移植工作區

此目錄位於移植分支 migration/standard-street-s1，從固定原版 Commit 7301b0c2b1e27226d1770e153fa3c68cfeae6d48 建立。原版 CGI 與 custom/ 保持不變。

## 本分支的第一步

直接使用儲存庫既有的兩份 DSL：../custom/inc-item-data.cgi 與 ../custom/inc-rebel-data.cgi，**不需要下載原版 CGI 執行環境**。

在 modern/ 執行：

    npm test
    npm run audit
    npm run audit:write

預期來源結構為 **79 ITEM、116 USE、25 EVENT、7 FUNC**，並核對兩份原始檔的固定 Git Blob SHA。解析器僅保留欄位、來源行號和原始區塊；不會執行 Perl、事件副作用、巨集、條件、職業加成、隨機計算及交易。

## 與先前 S1 v0.2.0 的關係

先前的獨立 S1 套件包含 TypeScript 語意模型與新店初始化投影。本分支目前先建立**直接利用現有 Git 原始碼的全量來源稽核入口**；上述既有 TypeScript 模組尚待逐檔整合進 modern/，不可將本目錄誤認為已完整合併先前的 ZIP。

未完成：商品數值／配方語意全面核對、事件及回呼移植、資料儲存、完整版 GameCore、前端、多人同步。目前已有原版 Perl 隔離測試，但沒有 CGI 端到端環境，也尚未具備整套原版行為的相容性保證。

原版程式授權與素材使用限制仍須遵守；未確認授權的圖片、音樂不納入新版。

## 任務 02｜不依賴 CGI 的 Node.js 狀態模型（2026-11-20）

此節對應新增的 `src/standard-street-model.mjs`，**直接讀取本 repo 原有的** `custom/inc-item-data.cgi` 與 `custom/inc-rebel-data.cgi`，不下載、不執行 CGI，不修改原版設定。

在 `modern/` 執行：

```sh
npm test
npm run audit
npm run demo:state
```

可重現示範 `npm run demo:state` 的固定輸入為 `now=1000000`，輸出新店初始現金 `100000`、剩餘時間 `43200` 秒、初始商品 `#63 展示架擴建拆卸工具 ×1` 與 `#79 禮物卷 ×5`；接著陳列 `#79`，單件價格 `10000`，剩餘時間變成 `42600` 秒。輸出為 JSON，可用作將來網頁端整合的初步資料契約。

| 可呼叫函式 | 目前範圍 |
| --- | --- |
| `loadStandardStreetModel(itemDsl, rebelDsl)` | 使用現有 `parseDsl`，核對 79 商品／116 USE／25 EVENT／7 FUNC 的靜態結構；擷取商品 ID、名稱、代碼、可辨識的價格、展示禁止旗標、初始商品與時間／資金宣告。遇到無法辨識的原版數值會保留 `priceRaw`，不執行任意 DSL 運算式。 |
| `createStandardStreetShop(model, input)` | 純函式建立來源可確認的新店主要狀態；商品庫存陣列按 `ID-1` 設定；**不**處理密碼、登入、帳號唯一性或存讀檔。 |
| `editShowcase(model, shop, edit)` | 純狀態轉移；按來源規則計算陳列商品、定價、600 秒操作時間、72 小時存量上限及缺貨／禁止陳列拒絕，輸入狀態不受修改。原 Perl `UseTime` 允許操作後時間變成負值，本模型保留此行為。 |
| `summarizeMarket(model, shops, fixture)` | 使用固定多店資料計算陳列庫存、銷量、加權市價與供需點數。此階段 `popular` 必須由測資顯式提供，**不能把未編譯的 `pop`／`lv` 設定假裝已編譯**。 |

**驗證結果：** [GitHub Actions 自動測試](https://github.com/Prysline/akimono/actions) 已於本分支執行 Node 原有來源稽核與新模型測試，以及 88 項隔離 Perl 測試。完整驗證以該次 CI run 紀錄為準。

**邊界與限制：** 這是「依已審查原始碼建立的可執行規則子集」，不是 CGI 編譯器的 Perl 回呼執行，也沒有實作商品使用、事件、隨機售出、真實市場週期、持久化、權限、安全或完整多人 Core；未提供的規則須逐項核對來源後才會增補。**禁止將這一階段的 Node 綠燈當成整體遊戲相容證明。**

目前 CGI 環境不可用，這些模型與測試均不要求 CGI 伺服器。本節新增程式不會合入 `main`，除非審查通過。

## 第二批：批發市場、交易報價、36 小時週期與部分決算

新增 `src/economy-model.mjs`、`tests/economy-model.test.mjs`，以已固定的 Core Commit `738d71a2985fd088f2ca90f25145706392ee2365` 為依據；**不啟動 CGI、不執行 Perl 回呼、不讀寫正式世界資料**。

在 `modern/` 執行：

```sh
npm test
npm run demo:economy
```

| Node 函式 | 原版程式依據 | 已實作的可重現範圍 |
| --- | --- | --- |
| `projectWholeStore` | `plug/whole.cgi::GetWholeStore` | 根據顯式提供的已編譯商品 `price/pricebase/pricehalf/sort` fixture 計算批發價及陳列順序；同排序值可能造成跨語言歧義，因此明確拒絕。 |
| `checkWholeStockCaps` / `extractWholeStock` | `CheckWholeStore/SetWholeStore` | 含每店庫存上限、負數 `wslimit` 絕對上限、數量與商品 ID-1 的索引；不產生外部存檔。 |
| `quoteUnguildedPurchase` | `buy-s.cgi`、`plug/item.cgi::GetTimeDeal/GetSaleTax` | 無公會、商品標準價格可確認時的預估數量、買家支出、賣家稅後所得、耗時。**只回傳報價，不變更買賣雙方狀態，更不代表完成交易。** |
| `segmentAccountingPeriods` | `inc-turn.cgi` 第 10–37 行、標準街 `_config.cgi` | 決算 36 小時（129600 秒）、JST +9h、時間修正 6h，含跨單期、跨多期、恰好在邊界的 0 秒尾段。 |
| `rollShopLedgerSubset` | `inc-period.cgi` 店鋪計算片段 | 固定排名、獲利平滑值、當期／前期帳轉移、維護費、經驗衰減及庫存上限；拒絕公會／龍賽／爵位等尚未實作的副作用。 |

**原始碼完整性：** 此模組不是把 `inc-period.cgi`、`buy-s.cgi` 當作獨立 Node 程式自動翻譯；原版商品的 `limit`、市場 `sort`／`pricehalf`／`wslimit` 與城市參數若未有已編譯資料，需由測資顯式輸入，**不能自行猜測**。

**缺口：** B-06 現已能在記憶體中處理「無公會、指定商品、不售罄」的限定玩家交易；仍缺商品泛用交易、售罄人氣變動、公會費、商品 `funcbuy` 回呼及真實存檔提交／回滾；B-11 城市／領主／公會／事件／隨機及備份等全套決算；B-12 真正執行跨期自然銷售與決算。未涵蓋的範圍均未驗收。

對於要觀察執行結果的開發者，`npm run demo:economy` 提供 JSON，範例的已編譯批發數值是**合成測資**，並不是從 Perl 編譯器實際生成；買賣結果是**報價**而不是已提交的交易。

## 第三批：無公會、非售罄的玩家交易狀態轉移

新增 `src/peer-trade-model.mjs`、`tests/peer-trade-model.test.mjs` 與 `scripts/demo-peer-trade.mjs`。固定原始來源是 Core `buy-s.cgi`（Git Blob `6ba8df9a733ed16c490389414cd94934fe1185ca`）、`plug/item.cgi`、`plug/calc.cgi`，以及標準街商品 DSL（Git Blob `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`）。所有新增程式均在 `modern/`，不修改 CGI 原版。

在 `modern/` 執行：

```sh
npm test
npm run demo:peer
```

`settleUnguildedPeerPurchase(model, buyer, seller, request)` **只在記憶體建立兩份新的交易後商店物件**，同時計算並保留交易憑據；不會修改傳入商店、寫入資料庫或提交原版 CGI 交易。只接受下列已審查的固定範圍：

- **玩家對玩家**（不包含批發市場）；雙方有效、不同 ID、不屬於公會。標準街商品 `#79 禮物卷` 的 `@@ITEM` 原始定義沒有 `funcb`，標準街全域 `@@FUNCBUY` 的贈券效果限 `$BUY->{whole}` 批發市場。**其他商品須逐一核對後才可擴展**。
- **非售罄**：若交易會讓賣方商品庫存歸零，直接拒絕。這是避免偷偷省略原版「售罄可能扣人氣且涉及亂數」的副作用，**不代表原版禁止買光商品**。
- `itemLimit`（已編譯商品持有上限）、`baseTaxRate`（賣方基礎稅率）、`sendItemTime`（商品搬運基準時間）、`now` 等輸入須顯式提供。本函式不虛構商品編譯產物、城市稅率或管理者設定。
- 成功時重新檢查現時售價與庫存，依 `quoteUnguildedPurchase` 算出可購數，更新買方 `money/item/paytoday/time` 與賣方 `money/item/itemtoday/saletoday/taxtoday/trush`，時間存量先依 72 小時上限裁切。失敗時不返回任何更新狀態。無真實儲存層時，不聲稱已具備持久化原子提交。
- `npm run demo:peer` 以商品 `#79`、售價 10000、購買4件建立固定 JSON：買家現金100000→60000、禮物卷5→9；賣家現金100000→136000、禮物卷5→1；稅4000、耗時1200秒；兩店合計商品件數守恆且現金總和加上稅額守恆。

**尚未支援：** 售罄人氣、商品買入回呼、公會調價與公會帳本、批發市場交易與贈券、身份驗證、交易鎖定、真實回滾、持久化、CGI、多人同步。此功能僅為逐項核對過的 **Node.js 單機狀態轉移子集**，不等於原版整體交易相容。

GitHub Actions 會執行 Node 測試、兩個既有示範、這次新增示範、固定原始碼 Blob 檢查及既有原版 Perl 隔離測試。
