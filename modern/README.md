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

**驗證結果：** [GitHub Actions 自動測試](https://github.com/Prysline/akimono/actions) 已於本分支執行 Node 來源稽核與子集規則模型；第十階段已達 **121 項 Node 測試與 96 項原版 Perl 隔離斷言**，具體以最新 CI run 為準。

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

**原始碼完整性：** 此模組不是把 `inc-period.cgi`、`buy-s.cgi` 當作獨立 Node 程式自動翻譯；三種已審查商品的純整數 `LIMIT` 現在依固定 Core 規則安全編譯，但其他商品的非字面值限額、市場 `sort`／`pricehalf` 與城市參數若未有已編譯資料，仍需明確測資，**不能自行猜測**。

**缺口：** B-06 現已能在記憶體中處理「無公會、三種來源已審查商品」的玩家交易，含固定亂數注入的售罄人氣下降；仍缺商品泛用交易、公會費、商品 `funcbuy` 回呼及真實存檔提交／回滾；B-11 城市／領主／公會／事件／隨機及備份等全套決算；B-12 真正執行跨期自然銷售與決算。未涵蓋的範圍均未驗收。

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
- **售罄處理**：若交易把賣家庫存扣至 0，依原版 `buy-s.cgi` 進行人氣下降；當下降基數介於0與1時，要求注入 `random()` 產生可重現的 `[0,1)` 數值。沒有亂數來源時明確拒絕；非售罄或下降基數為整數／大於1時不取亂數。
- `itemLimit` 現已從白名單商品的原始字面值 `LIMIT` 依固定 Core 規則編譯；呼叫者如額外提供 `itemLimit`，必須與編譯值相等，否則拒絕。`baseTaxRate`（賣方基礎稅率）、`sendItemTime`（商品搬運基準時間）、`now` 仍須顯式提供。本函式不虛構城市稅率或其他尚未審查的設定。
- 成功時重新檢查現時售價與庫存，依 `quoteUnguildedPurchase` 算出可購數，更新買方 `money/item/paytoday/time` 與賣方 `money/item/itemtoday/saletoday/taxtoday/trush`，時間存量先依 72 小時上限裁切。失敗時不返回任何更新狀態。無真實儲存層時，不聲稱已具備持久化原子提交。
- `npm run demo:peer` 以商品 `#79`、售價 10000、購買4件建立固定 JSON：買家現金100000→60000、禮物卷5→9；賣家現金100000→136000、禮物卷5→1；稅4000、耗時1200秒；兩店合計商品件數守恆且現金總和加上稅額守恆。

**尚未支援：** 未經審查的其他商品與買入回呼、公會調價與公會帳本、批發市場交易與贈券、身份驗證、交易鎖定、真實回滾、持久化、CGI、多人同步。售罄人氣現僅對已審查的 #1、#40、#79 無公會交易實作；不代表全商品或原版 Perl RNG 等價。此功能僅為逐項核對過的 **Node.js 單機狀態轉移子集**，不等於原版整體交易相容。

GitHub Actions 會執行 Node 測試、兩個既有示範、這次新增示範、固定原始碼 Blob 檢查及既有原版 Perl 隔離測試。

## 第四批：售罄人氣變動（固定亂數來源，無 CGI）

新增售罄行為至 `src/peer-trade-model.mjs` 原有的 `settleUnguildedPeerPurchase`，不是新的 CGI 伺服器，也不是整體遊戲的隨機系統。原版證據為固定 [Core `buy-s.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/buy-s.cgi) 於商品扣庫存之後、`$DTS->{item}[$itemno-1]==0` 且非同公會交易的排名變動區段。

原始程式的核心運算如下，對 JavaScript 只重建已核對的**無公會玩家交易 #79** 子集：

```perl
my $rankdown+=($DTS->{rank}/100)**3/1000;
if($rankdown<1 && $rankdown>0)
  {$rankdown=1 if rand(1/$rankdown)<1;}
$DTS->{rank}-=int($rankdown);
$DTS->{rank}=0 if $DTS->{rank}<0;
```

目前 Node 規則：

- 若賣方庫存**未歸零**，`rank` 不變，`random()` 不會被呼叫。
- 若賣方庫存歸零，計算 `rawRankDown=(rank/100)^3/1000`。當 `rawRankDown >= 1` 時依原版 `int` 截斷扣分；`rawRankDown=0` 不扣分；扣到負值時人氣下限為0。
- 當 `0 < rawRankDown < 1` 時，**必須**傳入 `request.random` 函式並回傳有限 `[0,1)` 數值；實際判斷與原版 `rand(1/rawRankDown)<1` 同型。若未提供或輸出無效，會明確拒絕，而不是偷偷使用 `Math.random()`。函式外部的 RNG 狀態不在本純狀態模型的回滾保證內。
- `receipt` 加入 `soldOut`、`rankDown`、`rankBefore`、`rankAfter`，可觀察是否降人氣與計算結果。

測試涵蓋原人氣 `5010→4885`（扣125）、`2500→2485`（扣15）、`1000→999`（扣1）、`500→499或500`（受固定亂數影響）、`0→0`、高人氣扣到0、無效／缺失亂數、相同亂數重播、非售罄不取亂數與物件不變性。這些是 **Node.js 測試**；原版 CGI 並未啟動，也不宣稱 Node RNG 與 Perl 內建亂數序列相同。

在 `modern/`：

```sh
npm test
npm run demo:peer
```

`npm run demo:peer` 會保留既有非售罄交易示範，再輸出獨立售罄案例：賣家商品 #79 庫存5→0、初始人氣500、固定注入抽樣0.05，期望人氣500→499。兩種情境不共用交易後商店，避免誤當作完整儲存流程。

**仍未支援：** 其他商品的 `funcb`、批發市場、`@@FUNCBUY` 送禮、公會與所有外部副作用、授權、交易鎖與真正提交。此結果只支持有限範圍的可重現交易投影。

## 第五批：來源審查商品白名單（2026-11-20）

延續前述交易與售罄子集，將 `settleUnguildedPeerPurchase` 可處理商品從 #79 增加為 **#1 藥草、#40 木刀、#79 禮物卷**；同時從 `loadStandardStreetModel` 保留每件 `@@ITEM` 原始 `limit` 與 `funcb` 欄位（`limitRaw`、`funcbRaw`），讓審查可以精確比對來源。

| 原版商品 ID | code | 名稱 | 原版定價 | 原始 `limit` 宣告 | `@@ITEM` 起始行 |
| ---: | --- | --- | ---: | --- | ---: |
| 1 | `yakusou` | 藥草 | 50 | `4000/1000` | 1672 |
| 40 | `ken-ki` | 木刀 | 1200 | `600` | 1265 |
| 79 | `gift` | 禮物卷 | 10000 | `10/0` | 2717 |

以上都來自未修改的 `custom/inc-item-data.cgi`（Git Blob `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`）；三件商品的**商品層級** `funcbRaw` 均為 `null`，`flagRaw` 為空。原版全域 `@@FUNCBUY` 的增送禮物卷邏輯仍然只針對 `$BUY->{whole}` **批發市場**。**商品使用（`@@USE`）回呼與買入回呼是不同作用點**；例如 #14 的 USE 區塊含 `funcb _local_`，不得因此推定它可以由目前的玩家交易模型處理。

`listReviewedPeerItems(model)` 返回經核對的三件白名單商品與來源行號；`settleUnguildedPeerPurchase` 不只檢查 ID，還比對原版名稱、代碼、價格、價格原文、限額原文、旗標、商品層級回呼、原檔路徑與行號。如果某欄位改動，**拒絕交易並要求重新審查**；不會自動把全部79件商品加入白名單。商品庫存索引與 `itemtoday` 均按被核對的實際商品 ID 更新，非寫死 #79。

**編譯範圍更新：** 第八階段新增可安全解析的原版字面值 `LIMIT A/B` 與 `LIMIT A` 子集，並對這三件白名單商品自動產生 `limit/wslimit`（不是完整 Perl 商品編譯器）。`baseTaxRate`、`sendItemTime` 仍必須顯式傳入。詳見下方第八階段的來源對照與不支援語法。

此階段增加 **10 個 Node.js 測試**，包括白名單完整比對、#1 與 #40 交易／售罄、連續跨商品購買、不同商品賣出紀錄分隔、非法 ID 與資料變更拒絕、價格過期、缺少編譯限額等。合計 **82 項 Node 測試／88 項原版 Perl 隔離斷言**。CI 同時跑來源稽核及 `npm run demo:peer`；示範會獨立輸出 #1、#40 和先前 #79 的狀態，不會寫入資料檔。

仍未支援：其他商品及未審查之回呼、公會／批發交易、真正授權與多人持久化、CGI HTTP 端到端。後續擴充應採**逐商品固定來源審查**，不能僅以沒有直接 `funcb` 作為全面開放條件。

## 第六批：精確重建原版字面值 LIMIT A/B 子集（第八階段）

來源是固定 [Core `inc-makeitem.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-makeitem.cgi#L412-L426) 商品解析段，已將未修改原始檔存成 `modern/tests/original-perl/inc-makeitem.cgi`（Git Blob `1da8cce1e76ad6159325a37faec68efaa82c7f69`），CI 會驗證其 SHA。這是**來源稽核**，並不是在 Node 中執行 Perl 管理端商品編譯。

Core 的 `LIMIT` 宣告不是算術除法：`A/B` 將 `A` 解析為店鋪上限 `limit`、`B` 解析為批發上限 `wslimit`；省略斜線時，`wslimit=limit`。在原編譯流程中，商品的 `price` 預設值可能先設定缺少的上限，但本批**只處理明確的正整數左值及可選的非負整數右值**，不推測缺失左值的預設或其他運算。

| 審查商品 | 原始 `limitRaw` | 解析 `limit` | 解析 `wslimit` |
| --- | --- | ---: | ---: |
| #1 藥草 | `4000/1000` | 4000 | 1000 |
| #40 木刀 | `600` | 600 | 600 |
| #79 禮物卷 | `10/0` | 10 | 0 |

新增 `src/item-limit-model.mjs` 的 `compileLiteralItemLimit(raw)`：

- 第八階段起初只接受整數字面值 `LIMIT A/B` 或 `LIMIT A`；第十階段已將**斜線右側**的合法非負十進位小數納入安全解析。回傳不可修改的 `{limit,wslimit,raw,mode}`；左側持有上限仍須正整數，變數、任意算式、負值與多重斜線依然拒絕。原版 `GetNumber` 可以執行 `eval`，本模組**絕不執行任意 Perl 或 JS 內容**。
- `listReviewedPeerItems(model)` 現額外回傳 `limit` 與 `wslimit`。`settleUnguildedPeerPurchase` 在已審查 #1／#40／#79 交易時計算此限額，並用來源編譯結果作為實際買方庫存上限；呼叫端可以**省略** `itemLimit`，若傳入的數字與來源不相符就拒絕，不接受任意測試數值覆寫。
- 售罄人氣、價格檢查、原本的純狀態不變性都保留；`baseTaxRate` 和 `sendItemTime` 仍需提供已審查的參數。此處 `wslimit` 作為來源核對數值列入回傳憑據，**尚未自動整合整個批發交易或商品生成流程**。

新增 `tests/item-limit-model.test.mjs` **12項 Node 測試**，並將既有交易測試改為驗證來源限額、不允許呼叫端使用不一致的值。示範 `npm run demo:peer` 改由模型自動編譯三件商品的上限，不再把固定買家限額標成合成測資。最後的驗證結果依 GitHub Actions 當次執行紀錄為準；原有 **88 項 Perl 隔離斷言**數量不變。

**該階段未涵蓋：** 原版完整 `GetNumber`、`lv` 依賴、商品缺省 `LIMIT` 時的價格推定、批發市場全流程、全部 79 件商品、帳號／公會／回呼／CGI 實機與持久化。後續第九階段已額外建立受限的 `lvN` 與價格預設值模型（詳見下方），但仍不是原版完整編譯器。

## 第七批：PRICE 預設上限與 LIMIT lvN（第九階段）

固定來源：Core [`inc-makeitem.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-makeitem.cgi) 的 `ClearBuffer`（初始商品值）、`PRICE`（第330–348行）、`LIMIT`（第412–425行）。**本次只擴充可重現的非執行性解析子集，沒有執行 Perl 的 `eval` 或完整 CGI 商品編譯**。

新增 `compileOrderedItemLimit({price,priceLine,limitRaw,limitLine})`，以**單次、已核對的正整數商品定價**與原始欄位行號計算限定的來源行為：

- `PRICE>0` 且之前沒有非零 `limit` 時，原版預設值為 `int(1000000/price)`，先限制於 `1..2000`；若值大於100，再用 `int(limit/10+0.5)*10` 取最接近的十位數。例如定價749→預設1340、定價10000→預設100、定價2000000→預設1。預設 `wslimit=limit`。
- `LIMIT lvN` 在已有價格預設值之後出現時，以 **`int(當前limit * N/5)`** 產生持有量上限；不含右側 `/B` 時 `wslimit=limit`，若有 `/B` 則獨立指定批發上限。使用正整數定價10000的合成例子，`lv2.5` → 店鋪50／批發50，`lv2.5/0` → 店鋪50／批發0。
- **欄位順序不可互換：** 若 `LIMIT lvN` 出現在 `PRICE` 之前，在原版尚未有預設 `limit` 時，初始乘法取得0；隨後的 `PRICE` 才以價格公式填入預設值，覆蓋當時的批發值。定價10000、先 `lv2.5/8` 再 `PRICE` 的合成例子結果是店鋪100／批發100，不是50／8。
- 明確的純數字 `LIMIT A/B` 繼續由前階段的 `compileLiteralItemLimit` 處理，與其現有交易模型行為一致。
- 只接受正整數價格、安全行號、單次 `PRICE` 與可選的一次 `LIMIT`；`lvN` 的 `N` 限非負十進位數字，第十階段起右側 `/B` 也允許安全的非負十進位小數。拒絕符號、任意 Perl 指令、超出安全整數範圍及未審查語法。某些合法 Perl 語法仍會被此受限模型拒絕，不宣稱完整相容。

**目前標準街來源實際情況：** 對固定 `custom/inc-item-data.cgi` 的79件 `@@ITEM` 逐項檢查後，**79件都有明確 `LIMIT`，0件使用 `LIMIT lvN`**。因此第九階段新增的 `lvN` 與缺省上限測試使用的是**合成商品編譯測資**，不是聲稱現有商品已啟用這兩種情形。Node 讀取器現在保留 `priceSourceLine`、`limitSourceLine` 來源資訊供日後審查；但若某商品的 `PRICE` 寫在 `@@USE` 區塊之後，現有 `parseDsl` 不一定把該欄位歸入 `@@ITEM`，需要直接查原始 DSL 行號而不是填入猜測值。原始商品 #63 的順序測試即直接核對固定原檔行1909與2007，不推定模型有解析該價格欄位。

本階段在 `tests/item-limit-model.test.mjs` **增加15項 Node測試**，涵蓋預設上限、數值截斷、十位四捨五入、`lvN` 倍率與右側批發限額、先後順序、資料來源行號、拒絕不安全輸入、全部79件商品現況。既有三件商品 #1／#40／#79 的玩家交易白名單**未擴大**，交易上限繼續沿用已審查的純數字 `LIMIT`；不會在交易時套用未審核的 `lvN` 或價格預設推導。

可在 `modern/` 使用：

```sh
npm test
npm run demo:limits
npm run demo:peer
```

`npm run demo:limits` 同時列出已確認的真實標準街 #1 商品限額，以及**分開標記**的合成預設與 `lvN` 範例；新增命令已加入 GitHub Actions。這仍是單機規則稽核，不是啟動 CGI、Perl 編譯器或持久化世界資料。

## 第八批：批發市場的小數供貨上限（第十階段）

**原始碼證據：** 固定 Core [`inc-makeitem.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-makeitem.cgi#L86-L105) 的 `GetNumber` 可解析十進位小數，`LIMIT`（第412–425行）把斜線右側數值直接指派給 `wslimit`；固定 Core [`plug/whole.cgi::CheckWholeStore`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/whole.cgi) 在非負上限時使用 `int(wslimit * (shopcount || 1) + 0.99)`，並扣除各店**已持有**的商品數量，得出批發市場還能保留的整數庫存上限。

`LIMIT 20/0.5` 不是除法、不是保證每店有半件供應；是「店鋪持有上限20、批發總量計算係數0.5」。原版沒有在這個步驟生成新商品，只有把已存在的批發庫存修正至不超過總量上限。批發展示價格與買入贈券等程序仍是其他獨立規則。

固定 `custom/inc-item-data.cgi`（Git Blob `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`）有**恰好7件**使用非負小數 `wslimit`：

| 商品 ID | 原版名稱 | 原始 `LIMIT` | 店鋪持有上限 `limit` | 批發係數 `wslimit` |
| ---: | --- | --- | ---: | ---: |
| 20 | 劍的鍛造方法 | `20/0.5` | 20 | 0.5 |
| 21 | 盾的製作方法 | `20/0.5` | 20 | 0.5 |
| 22 | 鎧的製作方法 | `20/0.5` | 20 | 0.5 |
| 23 | 杖的製作方法 | `20/0.5` | 20 | 0.5 |
| 25 | 米諾陶洛斯♀ | `20/1.5` | 20 | 1.5 |
| 64 | 看門機器人 | `1/0.5` | 1 | 0.5 |
| 66 | 裝飾品加工入門 | `20/0.5` | 20 | 0.5 |

**注意：** #64 原版帶有 `noshowcase|onlysend` 旗標；這張表只是來源的**批發上限編譯資料**，不是玩家間交易白名單、批發購買權限，也不是宣稱七件商品皆可在市場購買。

`src/item-limit-model.mjs` 的 `compileLiteralItemLimit` 現只在斜線右側允許非負十進位小數；左側 `limit` 仍限定正安全整數。拒絕 `1/.5`、`1/-0.5`、算式、浮點溢位、不安全精度及多重斜線；`compileOrderedItemLimit` 的 `lvN/B` 亦可使用右側已檢查的小數值，不需要執行 Perl `eval`。

新增 `src/fractional-wholesale-model.mjs`：`listReviewedFractionalWholesaleItems(model)` 會逐件比對**商品 ID、代碼、名稱、原定價文字、原始 LIMIT、檔名及行號**；只針對完全相同的7件提供 `compiledFractionalWholesaleById(model)`，給既有 `checkWholeStockCaps` 使用。資料變更或突然新增其他小數商品時拒絕，不自行全面開放所有商品或進行交易。

| 商店數 | 係數0.5 的整數總量上限 | 係數1.5 的整數總量上限 |
| ---: | ---: | ---: |
| 1 | 1 | 2 |
| 2 | 1 | 3 |
| 3 | 2 | 5 |
| 4 | 2 | 6 |
| 5 | 3 | 8 |

例如三店時 `wslimit=0.5` 的總上限2；若商店已持有1，批發市場可剩1；`wslimit=1.5` 的總上限5、商店已持有2時批發市場可剩3。**此計算不代表市場一定能補滿上限。**

驗證包含：

- 新增 **6 個商品限額 Node 測試**及 **6 個批發市場 Node 測試**，合計目前 **121／121** 通過；與原始字面值來源、浮點解析與防止來源改動連動。
- 在既有 `modern/tests/original-perl/whole-store.t` 新增 **8 項直接執行原版 Perl `CheckWholeStore` 的斷言**：由 88 項增為 **96／96 項原版 Perl 隔離測試成功**。這些 Perl 測試採明確的數值 fixture，不代表啟動原版商品管理 CGI 或完整 Perl 商品編譯。
- 新增 `npm run demo:wholesale`（`scripts/demo-fractional-wholesale.mjs`）並納入 CI；示範使用**合成的初始批發庫存10**，以真實商品來源導出的係數顯示不同店數及已有庫存的結果。既有 Node 與 Perl 原版快照、DSL audit、其餘示範均保留。

在 `modern/` 執行：

```sh
npm test
npm run demo:wholesale
```

**剩餘限制：** 沒有實作市場的補貨來源、批發買入回呼、完整商品編譯、使用者認證、公會、競爭交易鎖、真實資料持久化、完整跨期週期與 CGI HTTP。仍保持僅三種經審查的無公會玩家交易商品，未擴大買賣白名單。
