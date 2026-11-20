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

**該階段的剩餘限制：** 當時尚未實作自然補貨來源（第十一階段已增加限定的單商品 `PLUS` 時間推進子集）、批發買入回呼、完整商品編譯、使用者認證、公會、競爭交易鎖、真實資料持久化、完整跨期週期與 CGI HTTP。仍保持僅三種經審查的無公會玩家交易商品，未擴大買賣白名單。

## 第九批：批發市場世界庫存的來源與自然增減（第十一階段）

**來源生命週期已確認：** 原版 Core `inc-func.cgi::DataRead` 會從 `$DATA_FILE` 世界資料的第3列讀入 `@DTwholestore`；`inc-turn.cgi` 在每個**正長度**時間片段的自然銷售、商品逐期回呼、排行與可能的 `inc-period.cgi` 結算等處理**之後**，進入 `#市場商品数のUP/DOWN処理`（約第258–280行），先依 `PLUS` 推進世界批發庫存，再呼叫 `CheckWholeStore()` 裁切總上限／零下限；`plug/write.cgi::DataWrite` 將 `@DTwholestore` 序列化到暫存世界資料檔，最後由 `DataCommitOrAbort` 走提交程序。

**另一條路徑是批發購買：** Core `buy-s.cgi` 對 `id=0` 使用 `GetWholeStore()` 取得批發商店、執行交易及商品買入回呼，再以 `SetWholeStore($DTS)` 把庫存放回 `@DTwholestore`，之後才 `DataWrite`／`DataCommitOrAbort`。尚未支援這條完整交易與它的 `@@FUNCBUY` 贈券副作用，亦不假設世界檔首次建立時原始庫存必為0。

以上所據為固定 [Core `inc-turn.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-turn.cgi)、[`inc-func.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-func.cgi)、[`plug/write.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/write.cgi)、[`buy-s.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/buy-s.cgi)。已新增未修改的 `modern/tests/original-perl/inc-turn.cgi` 固定快照，Git Blob `b8a4980275f475a952846a8d6072fad45f8dff50`；第十一階段起共**九份原版 Core 快照**在 GitHub Actions 進行 SHA 驗證。

### 受限的 PLUS 單商品模型

新增 `src/wholesale-turn-model.mjs`：`listReviewedWholesalePlusItems(model)` 與 `projectReviewedWholesaleTurnItem(model, worldStock, shops, options)`。只處理來源已審核的三個商品，而不是暗中計算全部79件的 `PLUS`：

| 商品 ID | 來源 code | PLUS 原文 | 編譯間隔（秒） | 行為 |
| ---: | --- | --- | ---: | --- |
| 1 | `yakusou`（藥草） | `-20m` | -1200 | 依時間隨機減少世界批發庫存 |
| 10 | `book-make`（書本寫作工具） | `20m` | 1200 | 依時間隨機增加世界批發庫存 |
| 40 | `ken-ki`（木刀） | `-1h` | -3600 | 依時間隨機減少世界批發庫存 |

`loadStandardStreetModel` 現保留每件商品來源 `plusRaw` 作為不可執行的唯讀資料。上述三件在使用前會重新核對原始商品 ID、代碼、價格原文、`LIMIT` 原文、`PLUS` 原文、檔名與來源行號；任何差異都要求重新審查。特別注意現有 `parseDsl` 對位於 `@@USE` 後的重複屬性有歸屬限制，**來源白名單核對的是已明確查證的 `PLUS` 首筆宣告，不會執行商品使用功能或推定其他回呼**。

原版 [`inc-turn.cgi` 第260–280行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-turn.cgi#L260-L280) 公式：

```perl
$add=$timespan/abs($ITEM->{plus})*$DTpeople/(100000/(($MAX_USER+$#DT-1)*0.2+1));
if($add>0){$add=$add/2+rand($add/2);}else{$add=0;}
if($add<1 && $add>0){if(rand(1/$add)<1){$add=1;}}
$add=int($add);
$DTwholestore[$cnt-1]+=$ITEM->{plus}>0 ? $add : -$add;
CheckWholeStore();
```

Node 模型要求**明確傳入** `timespanSeconds`、`population`、`maxUsers`、`shops`（必須是前面的回呼／自然銷售／決算已處理過的快照）、`worldStock` 與 `random()`。`random()` 應回傳有限的 `[0,1)` 值；第1次對應 `rand($add/2)`，若調整後 `0 < add < 1`，則第2次對應 `rand(1/$add)` 的隨機進位。固定同一亂數值可重播相同結果，但**不等於重現 Perl 全域 RNG 的消耗順序**。計算會依原版順序先增減，再套用 `wslimit` 總上限（含店內持有量）及最低0庫存。

**模型的安全限定：** 本階段只在一個選定商品上執行一次正長度時間片段。為避免原版 `CheckWholeStore()` 對其他商品還有未審查的上限副作用，輸入中**其他78項市場與商店庫存必須全為0**，否則拒絕；不自動展開所有商品。這代表它是驗證 PLUS 計算順序的**單商品局部投影**，不能直接當作整個世界的跨期更新函式。時間長度為0時，原版會略過整段迴圈與市場裁切，因此模型要求正時間長度，避免誤改庫存。未提供或輸出非法亂數、非安全人口／庫存等情況會拒絕，輸入原件不變。這不是實際檔案鎖、正式交易、存讀檔或 CGI。

新增 `tests/wholesale-turn-model.test.mjs` **15項 Node 測試**，靜態核對原版 `inc-turn.cgi` 公式與 `inc-makeitem.cgi::GetTime`，驗證正向入庫、負向耗損、第二次低機率亂數、批發總上限、店家庫存抵扣、缺少／非法亂數、來源 metadata 篡改、無其他商品側效，以及未修改輸入的重播結果。合計本階段 **136／136 Node 測試**；原有 **96／96 原版 Perl 隔離斷言**不變。此批**沒有**宣稱執行完整原版 `inc-turn.cgi`（因仍有自然銷售、排行、決算、商品與事件回呼未建模）。

新增 `npm run demo:turn-wholesale` 並納入 CI：以現行 `_config.cgi` 經審查的 `MAX_USER=50`、明確合成的人口100000、兩間商店、600秒片段、固定抽樣0，分別輸出 #10 入庫、#1 耗損、#40 耗損，及商店已持有17件 #10 時的市場剩餘額度。所有初始世界庫存都是標示清楚的**合成測資**，不是讀取或猜測真實遊戲存檔。

在 `modern/`：

```sh
npm test
npm run demo:turn-wholesale
```

**該階段仍未完成：** 全部79件商品的 `PLUS` 編譯與同一時間片段跨商品 RNG 消耗順序、商品回呼與自然銷售／人氣、公會與跨期結算、事件、批發買入贈券、檔案鎖與實際 `DataWrite` 往返、真實原版 CGI HTTP 端到端。第十二階段已補上**第三行庫存的純文字往返與原版 `DataWrite()` 暫存檔隔離測試**，但仍不代表完整正式存檔提交。任務02維持進行中；PR Draft，不合併 `main`。

## 第十批：世界資料第三行的批發庫存讀寫契約（第十二階段）

本批專門處理批發世界庫存的**序列化格式與記憶體 round-trip**，不啟動原版 CGI、不使用正式世界檔，也不把未審查的事件／城鎮／商店資料轉成 JavaScript 結構。

固定 Core 原始碼證據：

- `inc-func.cgi::DataRead` 依序讀取世界資料第1行 `$DTlasttime`、第2行世界／人口／稅率／狀態資訊，接著用 `@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM)` 讀取**第3行批發庫存**；第4行則為事件資料。
- `plug/write.cgi::DataWrite` 寫出相同次序：時間行、世界資訊行、`join(",",@DTwholestore)."\n"`、事件行、城鎮資料、`//` 店家清單分隔符及後續各店資料。
- `DataWrite` 本身是寫入暫存世界檔，真正的 `DataCommitOrAbort`、備份、鎖及正式資料目錄操作是**另一套有副作用的程序**，這次沒有模擬成已完成。

相關固定來源在 `modern/tests/original-perl/` 新增兩份**未改動**檔案：`inc-func.cgi`（Git Blob `e7a8add7b0291901e71fe797783b664dff1568a0`）、`write.cgi`（原路徑 `plug/write.cgi`，Git Blob `203f33b37511e838800a45b84183af98fcf46e4c`）。連同前十一階段共有 **11 份原版 Core 快照**在 CI 使用 `git hash-object` 驗證。

### 實作範圍

新增 `src/world-wholesale-codec.mjs`：

- `parseWorldWholesaleLine(csv, maxItem=79)`：將一行世界庫存 CSV 安全解析成0起始索引、79格、非負安全整數庫存陣列。原版 Perl 允許資料中存在未定義的欄位，故此受控子集將**空白或省略的欄位解讀為0**，保留來源的原始欄位數以便稽核。不接受負數、小數、指令片段、超出安全整數及超過79格等未驗證輸入。
- `serializeWorldWholesaleLine(stock, maxItem=79)`：輸出完整79格十進位整數、逗號分隔。此為**正規化寫法**，不是原版所有奇異輸入格式的無損重現。
- `readWorldWholesaleSnapshot(text)`：只抽取**第三行**批發庫存，不嘗試解析其餘世界狀態。要求有完整的前兩行和第三行，保留其他資料原文。
- `writeWorldWholesaleSnapshot(text, nextStock)`：若數值未變，返回原始世界文字（即使第三行使用稀疏／空白欄位）；若有變化，只換第三行為正規化79格數字，前兩行和第4行起**逐字保留**，支援 LF／CRLF 與原始行尾狀態。所有輸入狀態不變，沒有檔案 IO。
- 本模型只保證**已核對的安全整數子集**。原版 Perl 可能在其他情況下接受不同格式或有隱式數值轉換；不把沒有測過的語意當成完整相容。

新增 `tests/world-wholesale-codec.test.mjs` **19項 Node.js 測試**：包括原版讀寫欄位來源原文、正規化與稀疏欄位、商品 #1／#10／#79 索引、CRLF、無最終換行、事件／城鎮／商店區塊完全保留、未定義或惡意數值拒絕，以及「讀取第3行 → 執行第十一階段 #10 `PLUS` 投影 → 寫回第3行 → 再讀取」的合成世界資料 round-trip。

**跨語言來源驗證：** 新增 `modern/tests/original-perl/world-data.t`，使用 `File::Temp`、替身及原版**未修改**的 `plug/write.cgi::DataWrite()`，真的寫一份**隔離、測試用暫存世界檔**，核對前六行及79格庫存位置，並再次覆寫測試庫存；**沒有執行整個 `DataRead` 或正式 `DataCommitOrAbort`**。新增11項 Perl 隔離斷言，使總數從96增至 **107／107**；Node 從136增至 **155／155**。

新增 `npm run demo:world`，使用**明確合成的世界文字**，執行讀取、#10 入庫、第三行重寫及還原，證明除庫存行之外的世界資料維持一致；CI 也會執行此示範。

在 `modern/` 執行：

```sh
npm test
npm run demo:world
```

**尚未完成：** 真正完整的原版 `DataRead` 執行及店舖／城鎮／事件資訊解析、資料目錄與提交標記的原子性保證、跨進程鎖、備份復原、CGI HTTP、多商品週期及真正世界存檔的提交回滾。此批只構成批發庫存的隔離序列化契約，不可作為正式存檔服務。

## 第十一批：原版提交標記、取消與復原的隔離驗證（第十三階段）

本階段直接核對固定 [Core `plug/write.cgi::DataCommitOrAbort`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/write.cgi#L4-L35) 及標準街 `_config.cgi`：`$FILE_EXT='.cgi'`、`$COMMIT_FILE='commit'`、暫存目錄 `$TEMP_DIR` 與資料目錄 `$DATA_DIR`。這些資料是來源事實，**不是**在現在的 Node.js 模型中完成真實檔案交易。

### 原版實際分支

| 暫存目錄符合篩選的檔案 | `abort` | 原先有提交標記 | 原版行為 |
| --- | --- | --- | --- |
| 有 | 0 | 任意 | 建立／覆寫標記，逐檔 `RenameAndCheck` 到資料目錄，成功後清除標記 |
| 有 | 1 | 無 | 逐檔 `unlink` 暫存檔，**不**更動正式資料，沒有新標記 |
| 有 | 1 | 有 | **復原未完成提交**：仍逐檔 `RenameAndCheck`，成功後清除標記 |
| 無 | 任意 | 有 | 只清除殘留標記 |
| 無 | 任意 | 無 | 不進行文件更名／刪除 |

原版 `DataCommitOrAbort` 的提交不是單一資料庫的原子操作。它對每個選出的檔案各自更名，若第二次更名中途失敗，**第一個檔案可能已覆蓋正式資料、另一個仍留在暫存目錄**，而提交標記仍存在；下次 `abort=1` 且標記存在時會嘗試把剩餘檔案完成提交。此復原機制不是回復到交易前狀態，也沒有證明跨程序互斥、崩潰後檔案確實落盤或磁碟交易的 all-or-nothing 保證。

**原版檔名篩選的危險差異：** `grep(/.$FILE_EXT$/,readdir(DIR))` 的規則並未跳脫 `$FILE_EXT='.cgi'` 內的句點，原版 Perl 的實際匹配近似 `/..cgi$/`，因此可能把 `strangexcgi` 等非真正 `.cgi` 後綴檔案錯誤當成待提交。隔離原版 Perl 測試確認它真的會匹配。這是必須記錄的來源風險，**新版決策模型刻意拒絕此類檔名**，不宣稱與原版的錯誤匹配完全相同。

### 新增程式與安全界線

- `src/world-commit-plan.mjs` 的 `planWorldCommit({abort, markerExists, stagedFilenames})` 是**純決策規劃**：只輸出 `commit / discard / recover / no-staged-files`、選中的檔名集合、應更名或應刪除的檔名、標記動作及是否可能存在多檔部分提交。原版 `readdir()` 排序未保證，因此列表僅以排序呈現集合，不能當作真實 OS 更名順序。
- 只接受已檢查的單層安全檔名及明確的布林值狀態，對惡意路徑、重複名稱、原版 regex 的異常匹配採取**拒絕**。沒有任何檔案讀寫、交易鎖、檔案更名、備份、正式提交、失敗復原執行或 CGI HTTP 行為。
- `tests/world-commit-plan.test.mjs` 新增 **15項 Node.js 測試**，核對固定 Core 原文／設定、四類分支、標記處理、未知檔名拒絕、排序不確定性及只讀回傳。
- `modern/tests/original-perl/world-commit.t` 新增 **27項真正執行原版 Perl `DataCommitOrAbort()` 的隔離斷言**：使用 `File::Temp` 的 stage／live／marker 路徑與受限 `GetPath`／`OpenAndCheck`／`RenameAndCheck` 替身，涵蓋正常提交、取消、帶標記復原、無檔清標記、第2次更名失敗的部分提交／後續恢復，以及原版檔名 regex 過寬問題。所有 I/O 都只觸碰測試暫存目錄，無正式世界檔。
- 新增 `scripts/demo-world-commit.mjs` 與 `npm run demo:commit`，在 JSON 明確展示上述四類*純決策*案例與原版匹配風險；已加入 GitHub Actions，原有11份 Core SHA 固定快照及 DSL audit 不變。

本階段驗收目標：**170／170 Node.js 測試**（原155項+15項）、**134／134 原版 Perl 隔離斷言**（原107項+27項），最終以與最新分支 commit 相同 SHA 的 CI 成功紀錄為準。

在 `modern/` 目錄執行：

```sh
npm test
npm run demo:commit
```

**後續仍須完成：** 真正的跨程序鎖、備份及標記持久性、失敗中的原子性設計、其他檔案和世界資料完整解析、批發與玩家交易的真正持久化、商品回呼、公會與 CGI HTTP 端到端。原版 Perl 的復原機制已經**驗證行為**，但不應直接當作新版安全儲存引擎部署。

## 第十二批：原版鎖檔與開檔／更名重試的安全契約（第十四階段）

本批直接比對固定 [Core `plug/lock.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/lock.cgi)（Git Blob `84382170f1b7f70348c4e2a91bf30b1d1043b964`）與現行標準街 `_config.cgi`。**正式來源配置是 `LOCK_FILE='lockfile'`、`AUTO_UNLOCK_TIME=60` 秒**；本階段所有新模型與 Perl 隔離測資均依此一致。新增未修改的 `modern/tests/original-perl/lock.cgi` 為**第12份** Core 原版來源快照，CI 新增 `git hash-object` 檢查。

### 原版鎖與 I/O 的具體行為

| 核對函式 | 原版來源行為 | 安全提醒 |
| --- | --- | --- |
| `Lock()` | 已持有時只增加 `LOCKED_LEVEL`；首次使用 `LockSub()`，成功後呼叫 `DataCommitOrAbort(1)` | 取得檔案鎖還須完成**待提交復原**才能視為可開始新寫入 |
| `LockSub()` | 嘗試將 `DATA_DIR/lockfile` 重新命名為帶時間、PID、REMOTE_ADDR 的擁有者檔名，最多五次，每次失敗等待0.2秒；之後掃描可能超過 `AUTO_UNLOCK_TIME` 的舊鎖並嘗試搶回 | 重命名及時間戳判定並非完整跨程序公平性或無競態保證 |
| `UnLock()` | 巢狀鎖先減少層數；到最外層時將擁有者檔名更名回 `lockfile` | **更名失敗只記錄錯誤，`LOCKED` 可能仍非空而層數已為0**，不能當作成功解鎖 |
| `RenameAndCheck()` | 最多5次 `rename`，失敗等0.2秒；成功後還要看到來源消失且目的地存在，否則繼續重試 | 最終失敗記錄日誌並 `OutError`，沒有證明跨多檔原子性 |
| `OpenAndCheck()` | `open(OUT, '>:encoding(UTF-8)', path)` 失敗時以 `count=5` 後置遞減重試；**連續第6次失敗才 `OutError`** | 成功以 `>` 模式開檔會截斷原檔；不代表 fsync、權限安全或交易提交 |

`LockSub` 的來源舊鎖篩選式 `/^$LOCK_FILE(\d+)/` 也可能匹配不完整的後綴；是否超時透過 `NOW_TIME - timestamp < AUTO_UNLOCK_TIME` 決定。新版受限模型僅允許來源形狀吻合的 `lockfile<timestamp>_<pid>_<remote-addr>`，拒絕含路徑、過大數值、不完整或模糊命名的候選鎖；**這是刻意採取更嚴格的安全界線，並非原版所有檔名語法的完整相容移植**。

### 新增可重現驗證

- [`modern/tests/original-perl/lock-safety.t`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/original-perl/lock-safety.t) 新增 **36項原版 Perl 隔離斷言**：真正 `require` 未修改 `lock.cgi`，以 `File::Temp` 測試用資料目錄取得／釋放 `lockfile`；驗證巢狀深度、取得鎖後回呼 `DataCommitOrAbort(1)`、60秒舊鎖與近期鎖、原版更名成功／失敗、開檔覆寫／失敗、以及 `UnLock` 更名失敗後的狀態。只有錯誤日誌、CGI 錯誤與待提交復原由替身攔截；**不碰正式世界資料或真正多進程操作**。
- 新增 [`src/world-lock-contract.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/src/world-lock-contract.mjs)：`CORE_LOCK_RETRY`、`reviewStaleWorldLocks`、`projectWorldLockTransition`、`projectCheckedRenameAttempts`、`projectCheckedOpenAttempts`。這些函式只根據**明確提供的觀察結果**輸出不可變決策／測試紀錄，沒有真正開檔、等待、rename、刪除、取得 OS 鎖或呼叫 Perl。對失敗的 `UnLock` 回報 `release-failed`、保留擁有者路徑的危險狀態，避免誤認鎖已正常釋放。
- [`tests/world-lock-contract.test.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/world-lock-contract.test.mjs) 新增 **28項 Node.js 測試**，核對原始程式及 `_config.cgi` 配置、首層／巢狀鎖、解鎖失敗、舊鎖門檻、檔名限制、五次 `rename` 與最多六次 `open` 的探測和拒絕不安全資料。
- 新增 [`scripts/demo-world-lock.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/scripts/demo-world-lock.mjs) 與 `npm run demo:lock`，將正確的 `lockfile` 與超時門檻、嵌套鎖、解鎖失敗及重試數列輸出成**完全無 I/O 的可重播示範**；納入 GitHub Actions。

本階段相較第十三階段增加**28項 Node + 36項原版 Perl 斷言**，合計 **198／198 Node 與 170／170 Perl** 通過（以當次完整 CI 為準）。CI 會核對12份固定 Core 原始快照、DSL audit 和原有示範。

在 `modern/`：

```sh
npm test
npm run demo:lock
```

**不可將此視為可部署的持久化引擎。** 尚未驗證實際跨進程鎖互斥性、檔案系統的斷電／fsync 行為、正式目錄的備份／崩潰復原、原版真實世界的所有檔案與 CGI HTTP 端到端。原版 `LockSub` 掃描舊鎖與寫入提交的競態風險仍存在；正式實作應另外設計可檢查擁有權、異常中止與復原的鎖保護機制，而非直接複製錯誤處理。

## 第十三批：寫入前鎖持有權與備份成功證據（第十五階段）

**來源限定：** 固定 Core [`plug/write.cgi::CheckLockStatus/DataWrite/DataFilesBackup`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/write.cgi)、[`inc-func.cgi::GetPath`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-func.cgi) 及目前標準街 `_config.cgi`。Core `GetPath` 在來源基底檔名後追加 `.cgi`；正式 `@BACKUP_FILES` 是 `log0`、`log1`、`log2`、`guildbal`、`play` 五種，`BACKUP_TIME=3600` 秒。此階段沒有新增或修改 Core 快照，仍維持 **12份 SHA 鎖定來源**。

### 已確認的原版行為與不能照搬的風險

1. 原版 `CheckLockStatus()` 直接 `return if $LOCKED eq '' || -e $LOCKED;`，所以空字串**不用持有任何鎖也通過**；非空但對應路徑已消失才記錄錯誤並 `OutError`。這只能稱為原版路徑檢查，**不是保證寫入者具有有效鎖持有權**。
2. `DataWrite()` 先呼叫 `CheckLockStatus()`，再依備份 `play.cgi` 的 `stat(...)[9]` 與 `NOW_TIME-BACKUP_TIME` 判定是否需要呼叫 `DataFilesBackup()`。原版條件為**嚴格小於**：備份時間恰在門檻時不重備份，較舊才重備份；備份不存在時 `stat` 未定義，在原版數值上下文通常相當於0，當目前時間大於門檻時會觸發備份。它不會驗證備份內容是否仍正確。
3. `DataFilesBackup()` 原版對五種檔案逐一 `open(IN, '<:encoding(UTF-8)', source)`、`open(OUT, '>:encoding(UTF-8)', backup)`、循環複製及 `close`，但**沒有檢查每一步的成功或失敗**。來源不存在時，`open(OUT, '>')` 甚至可能將先前有效備份截斷為空，函式卻照常返回；目的地不能開啟時也可能沒有備份產物、函式仍返回。這是原版缺陷／安全風險，不應移植為新版的有效備份判斷。
4. 由於上述兩點，**原版 `DataWrite()` 可能在 `LOCKED=''` 的情形產生暫存世界檔**；執行備份步驟也**不代表五種備份真的存在且正確**。本次沒有做 fsync、真實資料庫交易、備份耐久性或任何正式目錄操作。

### 新增的受限模型與測試

- [`src/world-backup-preflight.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/src/world-backup-preflight.mjs)：`reviewWorldBackupAge` 與 `reviewWorldWritePreconditions`，透過**呼叫端顯式提供**的鎖擁有權證據、持有者鎖檔是否存在、巢狀層數、前次提交復原是否完成、時間與備份 mtime、五份備份的來源可讀／目的地可寫／內容已核對布林值，回傳不可變的預檢結果。未知或無鎖持有權、持有層數0、尚未復原、需要備份但五份任一未確認時均**拒絕下一步寫入**。未提供檔名、重複／缺漏來源、錯誤資料型別與未審查的未來 mtime 也會拒絕。
- **刻意區分來源與新規則：** 在原版只看備份 mtime 是否過期的基礎上，本模型會對缺失 mtime 要求核對完整備份，對未來 mtime 採拒絕而非原版略過；對寫入權限要求**明確的擁有權證據**而非只靠 `LOCKED` 字串。回傳 `allowNextIsolatedStep=true` 也**只表示允許進入下一個隔離處理步驟**，不是宣告已有真實 OS 鎖、檔案系統安全／備份耐久性或允許正式寫入。
- [`tests/world-backup-preflight.test.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/world-backup-preflight.test.mjs)：新增 **20項 Node.js 測試**，來源字句核對、備份時間嚴格門檻、五份備份精確清單與各種缺失／錯誤值，以及鎖檔消失、未持鎖／深度0、待恢復提交未完成的拒絕規則，確認輸入與回傳紀錄不可篡改。
- [`tests/original-perl/backup-safety.t`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/original-perl/backup-safety.t)：新增 **24項直接執行原版 Perl 的隔離斷言**，真的透過原版 `CheckLockStatus()`、`DataFilesBackup()`、`DataWrite()` 在自動清理的 `File::Temp` 根目錄讀寫測試資料。確認無鎖繞過、遺失鎖報錯、五檔備份、缺失來源**截斷備份但不報錯**、目的地無法開啟**未生成備份但不報錯**、缺失備份 mtime 會觸發備份，及備份 mtime 新近時略過。這些原版危險行為**只在測試資料中觀察**，不觸及正式遊戲存檔。
- [`scripts/demo-world-backup.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/scripts/demo-world-backup.mjs) 與 `npm run demo:backup`，展示各種假定的鎖與備份核對情境，完全**無 OS 檔案 I/O、無備份拷貝、無正式提交**；已加入 GitHub Actions 與 README。

本階段相較前一階段增加 **20項 Node.js 測試**（總計 **218／218**）與 **24項原版 Perl 隔離斷言**（總計 **194／194**），仍由現有 DSL audit、全部示範與12份固定 Core Blob SHA 的 CI 驗證。完成前，不能將純預檢模型當成真正可部署的持久化引擎。

在 `modern/` 目錄執行：

```sh
npm test
npm run demo:backup
```

**待實作：** 使用實際 OS 鎖與持有者驗證、檔案 I/O 可靠錯誤處理與內容核對、fsync／原子替換、備份保留及斷電復原、全世界多檔資料與 CGI HTTP 端到端。任務 02 維持「進行中」；PR #1 維持 Draft，不合併、不修改 `main`。
