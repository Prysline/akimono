# 《商人物語》標準街 — 現代化移植工作區

## 2026-11-22｜R2 共用市場進貨執行第一階段

新的 `market-buy` 命令已由 **GameCore** 執行真正共用的買入數量、金錢／庫存、600 秒搬運時間、原版 72 小時時間上限與 WorldState/CAS 提交流程；**Standard Street** 只提供已來源審閱的 #10、#11、#14 商品規格、來源商品排序、批發市場 `SetWholeStore` 格式和回呼邊界。完整契約、原版依據與測試替代對照見 [R0–R2 共用市場進貨](docs/shared-market-buy-r0-r2.md)。

新命令欄位為 `{kind:'market-buy',expectedRevision,shopId,itemId,requestedCount,marketShelf,expectedPrice}`。成功會更新真實世界狀態與現有持久化相容結構；失敗或版本衝突不改動原世界。**現有本機 UI 與 #10／#11／#14 舊命令暫不修改**，作為相容與原版差分測試。未審閱的商品、動態定價、全域／商品買入回呼、公會及多店市場不得默默略過或自行推測；本階段不是全商品、全街道或真正 CGI 等價的宣告。

此目錄位於移植分支 migration/standard-street-s1，從固定原版 Commit 7301b0c2b1e27226d1770e153fa3c68cfeae6d48 建立。原版 CGI 與 custom/ 保持不變。

## B-40｜先實際開啟繁體中文「店內／市場／倉庫」本機測試版

**目前真正可操作：** [來源世界初始化 → 開店 → 原版 PLUS 供貨子步驟 → 商品 #10 書本寫作工具市場進貨 → 現金與倉庫同步更新](docs/b40-local-browser-market-buy.md)，附成功與拒絕步驟、固定原版 Perl 買入對照、Node 真 HTTP E2E 驗證。此程式在 `test/task02-baseline-on-s1` 工作分支，Node 22+，原版 CGI 與 DSL 不修改。

```sh
cd modern
npm run dev:local
```

開啟 **http://127.0.0.1:4173**。不使用原版素材或密碼，僅綁 127.0.0.1，停止程序就失去此世界。真存讀檔、完整自然販售與週期結算**尚未實作**。原版市場供貨按鈕只運行 B-37 已驗證 59 項 PLUS 子步驟，不能冒稱真實時鐘推進。下一步 B-41 在此介面把真正買到的商品上架並自然販售。務必依最新 HEAD 的 Push／PR 同 SHA CI 判斷驗收狀態。

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

## 第十四批：原版 DataRead 資料缺失與世界完整性安全預檢（第十六階段）

**固定來源：** Core [`inc-func.cgi::DataRead`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-func.cgi#L233-L299)（Git Blob `e7a8add7b0291901e71fe797783b664dff1568a0`）是第十六階段核對依據；CI 仍維持**12份原始 Core 快照完整性驗證**，沒有改動原版檔案。並引用第十二階段既有 `world-wholesale-codec.mjs` 的批發庫存 `LIMIT` 79 格受限解碼規則。

### 原版 DataRead 的行為與發現的高風險邊界

`DataRead()` 首先透過 `GetPath($DATA_FILE)` 找到世界資料路徑，使用 `open(IN, '<:encoding(UTF-8)')` 與 `read(IN,my $buf,-s $datafile)`，**不檢查 open/read 的成功回傳值**；將資料以 `split(/\n/,$buf)` 分割。若讀不到任何有效行，原版會 `OutError('no data')`。

其後依第1行最後時間、第2行人口／ID／稅率／狀態、第3行批發庫存、第4行事件讀取，再依事件鍵執行 `require(GetPath($ITEM_DIR,'event',...))`、可能進入 `AutoVar` 的城鎮資料 `tie`，最後以：

```perl
while($DATA[$idx++] ne '//'){}
```

繼續尋找精確的 `//` 分隔行。**此迴圈沒有在資料陣列耗盡時停止的條件**；遇到缺少分隔行的截斷檔，或只有 `//\r` 而非 `//` 的特定換行情境，可能持續迴圈。完整 CRLF 輸入也可能先在事件 `require` 等其他段落出錯，所以此處不宣稱所有 CRLF 的故障完全相同。

`DataRead` 對庫存使用 `@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM)`，對人口等 metadata 直接以字串切割、**沒有安全整數欄位驗證**；因此內容 `4,garbage,3` 的無效商品庫存、非數值人口皆可能成功進入記憶體。後續程序若無額外驗證就寫回，可能讓錯誤世界狀態持續擴散。這是原版程式的行為，不應當作新版可接受的存檔格式。

### 已交付程式與隔離驗證

- 新增 [`modern/tests/original-perl/world-read-safety.t`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/original-perl/world-read-safety.t)：**24項直接執行原版 `DataRead()` 函式本體的隔離 Perl 斷言**。原版 `inc-func.cgi` 頂層會立即載入正式設定／商品／CGI 相依檔，故**不能直接 require 整份文件**；本測試從已經 SHA 固定的快照中擷取 `sub DataRead` 的**完整未修改函式內容**再在純 Perl 測試環境執行。只有 `GetPath`、`OutError`、`GetDTPoint`、空 `AutoVar` tie 等外部函式由隔離替身提供，並用 `alarm(1)` 限制缺少分隔符時的執行時間。所有實際 I/O 只限 `File::Temp` 測試檔，**沒有真實世界資料、無 CGI 或任意事件／商店回呼**。測試確認無檔／空檔的 `no data`、可讀的正常簡化資料、原版接受非數字庫存與人口、缺少精確 `//` 時需強制中止、稀疏／空白庫存的原版語意。
- 新增 [`modern/src/world-read-preflight.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/src/world-read-preflight.mjs)：`parseIsolatedWorldReadEnvelope(text)` 與 `reviewIsolatedWorldRead({readSucceeded,sourceSizeBytes,observedBytesRead,worldText})`。**只檢查極小且已審查的5行世界檔子集**：正整數時間戳、恰五欄的安全 metadata、最多79格可安全解碼的非負整數庫存、空事件行、精確 `//` 分隔行，且**沒有動態城鎮或任何商店資料**；可選最後 LF。缺少分隔符／其他動態資料、異常數字或控制字元、CRLF、超過1MiB 限制、檔案位元組數與回報讀取量不符時**直接拒絕**。這是刻意比原版狹窄的安全子集，**無法直接解析一般含城鎮、事件或商店的真實世界存檔**。
- 新增 [`modern/tests/world-read-preflight.test.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/world-read-preflight.test.mjs)：**22項 Node.js 測試**，核對原版固定來源與 `//` 搜尋原文、5行資料與檔案大小觀察值、非法人口／庫存、跨行截斷、CRLF 分隔符、事件／城鎮／商店拒絕、位元組不符、資料大小上限及回傳不可變性。
- 新增 [`modern/scripts/demo-world-read.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/scripts/demo-world-read.mjs) 與 `npm run demo:read-preflight`；所有案例均為**合成文字**，輸出完整簡化世界、缺少 `//`、庫存數字錯誤、人口錯誤、CRLF、動態事件／商店及部分讀取等狀況的允許／拒絕決策；純 JS 無 OS 檔案讀寫，已加入 GitHub Actions。

本階段比前一階段增加 **22項 Node、24項 Perl**，總計 **240／240 Node 測試、218／218 原版 Perl 隔離斷言**。Core 固定來源12份的 SHA 校驗、既有 DSL audit 與全部示範仍由 CI 驗證。

在 `modern/` 執行：

```sh
npm test
npm run demo:read-preflight
```

**剩餘限制：** 這只是原版讀取函式的局部危險行為證明與狹窄預檢，尚無涵蓋真實多商店／事件的安全完整世界 parser、實際文件大小與 race-free file descriptor 驗證、備份復原、跨進程鎖／fsync／原子多檔交易、原版正式 CGI HTTP 端到端，也不能直接部署為正式讀檔服務。第十五階段的保守寫入前備份檢查與本階段的讀取前檢查仍是**彼此獨立的純模型**，未整合成已驗證可部署的存檔引擎。任務02仍為進行中；PR Draft，不合併 `main`。

## 第十五批：原版世界事件／城鎮／商店位置與嚴格單店讀取（第十七階段）

本階段依據固定 Core [`inc-func.cgi::DataRead`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-func.cgi#L233-L299) 與 [`plug/write.cgi::DataWrite`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/write.cgi#L45-L89)，核對世界文字中商店資料的行結構，但**不啟動事件 require、城鎮 AutoVar、真正商店回呼或正式世界資料存讀檔**。原版12份固定 Core Git Blob SHA 仍不修改、繼續由 CI 稽核。

### 核對後的原版行序

| 區段 | 原版 DataRead 所見 | 限定範圍 |
| --- | --- | --- |
| 第1～4行 | `DTlasttime`、人口／世界 metadata、`@DTwholestore`、`%DTevent` | 既有 B-16 安全前置核對 |
| 可能的第5行 | 若尚未到達 `//`，以 `AutoVar` `tie` 儲存城鎮原文 | **非空城鎮內容仍不執行解析**；合成空字串可接受 |
| 精確 `//` | 事件／城鎮後的商店開始標記 | 原版缺失會無界限搜尋，維持拒絕 |
| 商店表頭（每店第1行） | 依 `@DTindexnamelist=qw(...)` 的來源順序切出**32個 CSV 欄位** | 新版只允許8個經審查欄位可非空 |
| 商店狀態（每店第2行） | `split(/:/,$DATA[$idx],7)`，前兩段為 `showcase`、`price`、第3段為 `item` 的 AutoVar，後四段涉及昨日／今日／經驗與使用者資料 | 新版只允許**前三段**的安全整數清單，其餘四段必須空白 |

原版實際可接受多間商店、非空城鎮與其他動態資料，**但沒有替這些內容完成一致性與安全驗證**。本批新增 `tests/original-perl/world-one-shop.t`，從固定 Core `inc-func.cgi` 只擷取未修改的 `DataRead` 函式本體，亦擷取未修改的32欄來源列表，使用隔離 `File::Temp`、最小 `AutoVar::TIESCALAR`／`GetDTPoint` 替身直接執行。新增 **34項原版 Perl 斷言**，實際確認原版一店、兩店、沒有城鎮行、空白／非空城鎮交給 AutoVar、前3個商品狀態區段、`id2idx` 映射。此外直接確認**重複商店 ID 會覆寫原版索引，缺少商店狀態第二行仍可能被原版計為商店**。這是舊版危險容錯行為，而不是現代化應接受的輸入。

### 新增嚴格唯讀單店子集

- 新增 [`src/world-one-shop-parser.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/src/world-one-shop-parser.mjs) 的 `parseReviewedOneShopWorld(text)`，與原本第十六階段 `parseIsolatedWorldReadEnvelope` **分開**，沒有放寬五行世界前置檢查。單店模型使用相同 B-16 純函式核對前四行世界內容，接著只支援**一間**合成商店、可選**空白**城鎮行、精確 `//` 分隔符、32欄表頭與7段的商店狀態。只允許來源位置 id、lastlogin、name、shopname、pass、money、time、rank 填入受限合成值；其他24欄必須空白。只允許 `showcase`／`price`／`item` 為相同長度、最多79格的非負安全整數列表，剩餘四段必須空白。
- 任何事件鍵、非空城鎮、第二間商店、不完整的商店兩行、其他未審查表頭欄位、使用者資料、自訂 status／商品回呼、錯誤分隔符、逗號／冒號槽數、格式或數字均**直接拒絕**。模型只回傳 id、顯示名稱、已核對的庫存欄位等**非認證資訊**，不回傳合成測資的 `pass` 原文，也不嘗試授權使用者。
- 新增 [`tests/world-one-shop-parser.test.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/world-one-shop-parser.test.mjs) **25項 Node 測試**：來源32欄精確對照、B-16 舊五行解析器仍拒絕商店、單店成功與空城鎮、無最終 LF、錯誤／缺少第二行、第二間商店、非空城鎮／事件、密碼欄不外露、所有不安全欄位與數值、不可修改回傳及沒有實際 I/O 權限。
- 新增 [`scripts/demo-world-one-shop.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/scripts/demo-world-one-shop.mjs) 與 `npm run demo:one-shop`；以**完全合成的世界和商店文字**展示 B-16 仍拒絕商店、B-17 單店安全預檢，以及事件、非空城鎮、第二間店、截斷狀態與未審查使用者資料被拒絕；已納入 GitHub Actions，**沒有正式世界資料**。

本階段測試增加 **25項 Node、34項 Perl 斷言**，合計 **265／265 Node、252／252 原版 Perl 隔離斷言**。現階段的單店內容是**極小的來源驗證子集**，而非已支援一般《商人物語》世界與商店檔案；來源實際含有動態事件、AutoVar、玩家驗證、所有32欄商店資料及跨期經濟／交易狀態。實際 CGI HTTP、正式存讀檔、跨程序鎖與安全提交皆仍未完成。

在 `modern/`：

```sh
npm test
npm run demo:one-shop
```

任務02繼續「進行中」；PR #1 保持 Draft，不合併或修改 `main`。

## 第十六批：原版 AutoVar 商店歷史與使用者延遲資料（第十八階段）

依固定 Core [`inc-func.cgi::DataRead` 第289～294行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-func.cgi#L287-L294)、[同檔 `package AutoVar` 第440～470行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-func.cgi#L440-L470) 以及 [`plug/write.cgi::DataWrite`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/write.cgi#L77-L86) 核對。這些已包含於原版12份固定來源快照（`inc-func.cgi` Blob `e7a8add7b0291901e71fe797783b664dff1568a0`、`write.cgi` Blob `203f33b37511e838800a45b84183af98fcf46e4c`），CI 的 SHA 不變。

### 原版來源與隔離實測

**原版商店第二行固定分成七段，不能將全部欄位視為普通 CSV：**

| 段落（1起始） | DataRead 原式 | 實際取得值 |
| --- | --- | --- |
| 1～3 | `@list[0,1,2]` | 展示、價格、商品庫存（第3段為 AutoVar `ARRAY`） |
| **4** | `map{{split(/,/,$_)}}@list[3]` | `itemyesterday`，即刻成為 Perl HASH |
| **5** | `map{{split(/,/,$_)}}@list[4]` | `itemtoday`，即刻成為 Perl HASH |
| **6** | `map{{split(/,/,$_)}}@list[5]` | `exp`，即刻成為 Perl HASH（熟練度） |
| **7** | `$list[6] ? tie(...,'AutoVar',...,'HASH','[\t,]') : {...}` | 非空 user **先保留為綁定原文**，第一次 FETCH 才拆解；空白 user 直接為空 HASH |

這次同時核對固定 [Core `stock.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/stock.cgi) 的 `itemtoday->{$cnt}`／`itemyesterday->{$cnt}`／`exp->{$cnt}`，以及 [`plug/use.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi) 的 `exp->{$USE->{itemno}}`：在此已核對商品編號範圍 1～79 的合成測試中，三種雜湊的鍵代表商品編號。這兩個檔案本批只作**固定 commit 的原版閱讀證據**，未新增 Core 快照，也不宣稱已移植熟練度衰退或使用商品的實際邏輯。

**危險而必須保留在測試中的原版容忍度：** 對不成對的歷史／user 鍵值，原版 HASH 可能留下值為 `undef` 的鍵；重複的鍵會覆蓋較早的值；`DataRead` 成功時，`user` 的 AutoVar 可能**尚未 FETCH、尚未驗證任何原文**。原版 `AutoVar::Get` 對未解開的綁定資料回傳原文；一旦轉為 Perl HASH，雜湊順序不保證，不能宣稱逐字輸出有固定排序。逗號與 Tab 都可能用於原版 user 的鍵值拆解。以上是實測的**來源行為**，不是新版允許不完整帳號／認證資料的理由。

### 實作與安全界線

- [`modern/tests/original-perl/world-shop-history.t`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/original-perl/world-shop-history.t) **新增43項原版 Perl 隔離斷言**。從原樣保存、SHA 固定的 `inc-func.cgi` 精確擷取 `DataRead` 函式本體與**原版未修改** `package AutoVar` 直接執行；使用 `File::Temp` 合成一間商店的世界文字、限制執行時間及必要外部最小替身。實際驗證昨日／今日／經驗 HASH、使用者資料在 FETCH 前的綁定原文與 FETCH 後 HASH、空白使用者、奇數鍵值、重複鍵及 Tab／逗號語法。**沒有 require 原版頂層 CGI 或真正世界資料**，也不認證、讀取或更動真實帳戶。
- 新增 [`modern/src/world-shop-history-model.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/src/world-shop-history-model.mjs) 的 `parseReviewedShopHistoryWorld(text)`：為**獨立的單店唯讀合成資料**新增歷史雜湊受限解析。先驗證第4～7段，再以**不改原始字串的副本**將四段置空，交給**第十七階段** `parseReviewedOneShopWorld` 完成世界、原本展示／價格／庫存、32欄頭與 `//` 等來源檢查；**沒有修改或放寬第十六、十七階段既有 parser 的條件**。
- Node 歷史三雜湊只接受最少零組、最多79組的**成對非負安全整數**，鍵必須為商品編號1～79，重複／缺失鍵值會被拒絕，輸出以商品編號排序供測試決定性使用；這不代表原版 HASH 寫檔有相同排序。user 只接受至多8組**ASCII 合成測試名稱＋安全非負整數**，與原版一樣辨認逗號及 Tab，但結果**只回傳 `syntheticUserEntryCount`，不輸出 user 原文、使用者名稱／數值或商店 `pass`**。這絕非完整 AutoVar 用戶資料、登入、認證或可供正式存檔的 user 解析。
- 新增 [`modern/tests/world-shop-history-model.test.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/world-shop-history-model.test.mjs) **28項 Node.js 測試**，覆蓋精確來源字句、歷史／user 受限正反案例、奇數鍵值與重複鍵拒絕、認證資料不外露、舊 B-17 入口維持拒絕新欄位、不可變輸出及不提供任何實際 IO 權限。
- 新增 [`modern/scripts/demo-shop-history.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/scripts/demo-shop-history.mjs) 和 `npm run demo:shop-history`，用合成世界文字對比正確配對／不同順序、重複／不成對鍵值與 user 安全拒絕，CI 也會執行。**示範無任何真實磁碟／遊戲存檔／事件或 AutoVar 執行**。

此次累計從 **265增加28至293／293 Node**，從 **252增加43至295／295 原版 Perl 隔離斷言**；固定 Core 快照仍12份，DSL audit 與所有示範照常由 CI 核對。

在 `modern/` 執行：

```sh
npm test
npm run demo:shop-history
```

**尚未完成：** 原版真實 AutoVar 多數據／特殊使用者資料格式、安全登入與權限、複數商店、事件與城鎮、熟練度跨期衰退、使用商品完整回呼、正式世界資料 I/O／持久化／原子提交，以及 CGI HTTP 端到端。此次的 parser 僅是**狹窄、無 I/O、無權限的合成資料研究模型**，不可直接部署為帳號資料或世界存檔載入器。任務02維持「進行中」、PR #1 保持 Draft，不合併 `main`。

## 第十七批：原版每日歷史與熟練度增減的隔離契約（第十九階段）

本階段直接核對固定 Core [`inc-period.cgi` 第65～75、109～115行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-period.cgi#L65-L115)、[`plug/use.cgi::UseItem` 第171～205行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L171-L205)，及標準街 `_config.cgi` 中的**熟練度設定**：`EXP_DOWN_RATE=60`、`EXP_DOWN_POINT=5`、`LIMIT_EXP=3600`。兩份新增未修改原版快照位於 `modern/tests/original-perl/period.cgi`（Git Blob `6183e88e9dd69a16606a1064c8084e9a1411dbd5`）與 `use.cgi`（Git Blob `1bf4537cc41e344c144d840d43175c4c232765bb`），CI 追加原樣 `git hash-object` 核對；總計已固定**14份 Core Git Blob 快照**。原始 Core commit 仍是 `738d71a2985fd088f2ca90f25145706392ee2365`。

### 原版來源規則（已實測隔離片段）

| 機制 | 固定 Core 原式／效果 | 此批支援邊界 |
| --- | --- | --- |
| 每日歷史切換 | `itemyesterday=itemtoday; itemtoday={}`，昨日舊內容被昨日的**新當期紀錄**取代 | 僅商店商品歷史雜湊交接，不執行完整週期 |
| 熟練度自然衰退 | 每項先減 `int(exp*60/1000)`，再減 **5**；結果小於或等於0即刪除 | 原版比例／固定值以實際 `_config.cgi` 為準 |
| 使用商品增加熟練度 | 成功使用次數 `count` × `USE.exp`，選定商品單項上限為 **1000** | 未重演材料、機率、金錢、時間、事件／商品回呼 |
| 熟練度總和超過3600 | 原版 `sort` 以熟練度由低至高排列鍵，略過選定商品；其餘項目依**當下剩餘超額與剩餘數量逐次重新計算**減少量，必要時刪除降至0的記錄 | 若多個**非選定商品**的 exp 相同、需進入超額分攤分支，安全模型拒絕，避免假定 Perl HASH 的相等排序可預測 |

原版有一個很容易誤抄的細節：假設五件商品一開始的熟練度依序為 `{1:900,2:700,3:800,4:850,5:900}`，對 #1 增加100後，原版總和為4250、超過3600的額度為650。其他四件不是都扣 `650/4`；而是**依序使用 `int(650/4)=162`、`int(488/3)=162`、`int(326/2)=163`、`int(163/1)=163`**，最終為 `{1:1000,2:538,3:638,4:687,5:737}`，總和恰為3600。此結果由**原版 Perl 固定來源的實際片段執行**與 Node 狀態模型測試交叉核對；並非自行假設平均分攤。若多個其他商品熟練度相同，原版排序的同值順序沒有明確業務規則，受限 Node 模型拒絕該情況，而不是憑空決定 tie-break。

### 這一階段新增的程式與測試

- [`modern/tests/original-perl/period-experience.t`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/original-perl/period-experience.t)：**33項原版 Perl 隔離斷言**。由於原版 `inc-period.cgi` 是一整段**會立即執行**公會結算、備份、session 清理、隨機、商店關閉等操作的程式，而 `plug/use.cgi::UseItem` 前半段會操作商品、金錢、時間與動態回呼，因此不能安全地在隔離情境執行**整份原始入口**。測試只從已固定 SHA 的**未修改原版文字中精確擷取**「歷史兩句」、「熟練度衰退迴圈」與「UseItem 熟練度尾段」，插入明確的最小合成 `$DT`、`$USE` 狀態和標準街參數後直接編譯執行這些**原樣原式**。沒有任意使用者 Perl 程式碼、真實世界檔案、事件與正式 CGI 操作。
- 新增 [`modern/src/period-experience-model.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/src/period-experience-model.mjs)：`REVIEWED_EXP_CONFIG`、`projectReviewedPeriodHistory`、`projectReviewedUseExperience`。接受既有 B-18 格式的商品編號／安全整數配對，回傳不可變且排序後的合成狀態。每日歷史欄位只做交接與經驗衰退；使用商品只計算已知 `USE.exp × count`、1000單項上限和必要的3600總量扣減。輸入超界、重複商品鍵、經驗異常或需對其他商品同值排序時**明確拒絕**。
- 新增 [`modern/tests/period-experience-model.test.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/period-experience-model.test.mjs)：**30項 Node.js 測試**，來源原文字句／設定核對、歷史移交、`exp100→89`／`6→1`／`5→刪除` 等衰退案例、`exp80×3`、上限1000、超過3600時逐次扣減、同值排序拒絕、錯誤資料、不變性與從 B-18 單店解析器取得合成資料後的模型整合。
- 新增 [`modern/scripts/demo-period-experience.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/scripts/demo-period-experience.mjs) 與 `npm run demo:period-experience`，以固定合成資料呈現歷史交接、熟練度衰退、單項1000上限、3600總和逐次扣減與同值排序拒絕；已加入 GitHub Actions。

本階段使全部 Node 測試由 **293增至323項**；原版 Perl 隔離斷言由 **295增至328項**。CI 維持 DSL audit、歷次合成示範以及現有**14份**固定 Core Git Blob 的完整性核對。

在 `modern/` 執行：

```sh
npm test
npm run demo:period-experience
```

**仍未完成：** 完整 `inc-period.cgi` 真實每日結算（商店關閉、經濟與公會、事件、備份、隨機）、完整 `UseItem`（資格、材料／機率、時間金錢、動態商品回呼）、真實多商店世界存檔讀寫、跨程序安全鎖、原子提交／fsync、CGI HTTP 端到端。本次純模型結果只能供隔離推算／來源審查，絕不代表已有部署權限、資料持久化或真實商品使用。任務02維持「進行中」，Draft PR #1 未合併，不改 `main`。

## 第十八批：每日庫存修正及 UseItem 材料／機率的隔離模型（第二十階段）

依照固定 Core [`inc-period.cgi` 第77～82行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-period.cgi#L77-L82)、[ `plug/use.cgi::CheckUseItem` 第21～47行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L21-L47)、[`UseItem` 第64～104行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L64-L104) 與 [`MakeAmount` 第208～224行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L208-L224)，將可觀察的庫存上限、使用前置數量計算和**小額機率**拆成彼此無 I/O 的受限模型。上述固定 Core 來源原樣封存於既有 `modern/tests/original-perl/period.cgi` 與 `use.cgi`（Git Blob SHA 分別為 `6183e88e9dd69a16606a1064c8084e9a1411dbd5`、`1bf4537cc41e344c144d840d43175c4c232765bb`）。沒有新增原版來源快照；CI 保持 **14份 Core SHA** 核對。

### 核對的來源行為

| 領域 | 原版實際規則 | 新版受限子集的安全界線 |
| --- | --- | --- |
| 每日商品庫存 | 若 `DT.item[cnt-1] > ITEM[cnt].limit`，先設為商品上限；接著每格 `int()` 截去小數 | 需呼叫端提供長度恰79、非負且安全的合成庫存／整數上限；原版可能保留負值（如 `-1.9→-1`），本子集**拒絕負值** |
| `UseItem` 使用次數 | 依熟練度／職業／分數／人氣／事件條件設為0，再依資金、時間、材料短缺依原始順序重新推算 `count`；真正動作前寫入 `USE.result.count` | 只推算次數，**不呼叫** `CheckUseItem` 的動態職業函式／`functionbefore`，亦不執行後續商品消耗、產出、事件回呼或任何實際金錢／時間扣減 |
| 材料 `proba==0` | 前置短缺檢查使用一次材料需求，正機率則以需求量 × 當前 `count` 檢查；`MakeAmount` 自身在機率0時會回傳0 | 按固定 Core 原式保留這兩個不同決策；**前置材料檢查不是實際材料消耗** |
| `MakeAmount` 機率 | `p<=0`→0，`p>=1000`→完整要求量；中間機率在 `cnt<20` 時每單位一次 `rand(1000)<p`，`cnt>=20` 時改用含 `sin`、`sqrt` 與兩個隨機數的不同公式 | Node 僅接受 `units=0..19`、`p=0..1000`；中間機率要呼叫端明確提供可重播的 `random()`，每單位取值落在 `[0,1)`；**20以上的機率公式刻意拒絕，不假稱已完成移植** |

### 新增程式與驗證

- [`modern/tests/original-perl/period-stock-use.t`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/original-perl/period-stock-use.t)：**36項原版 Perl 隔離斷言**。直接從兩份已固定 SHA 的未修改 Core 原文擷取並編譯**每日庫存修正迴圈**、`UseItem` 從熟練度條件到 `result.count` 的前置程式、`CheckUseItem` **材料檢查迴圈**以及整份 `MakeAmount` 函式。只使用合成 Perl 商品、庫存、時間與資金資料；確認限額小數修正、原版負庫存仍可能為負、經驗／職業／分數／人氣／事件／資金／時間／材料短缺造成使用次數調整，以及 `MakeAmount` 的0／1000機率與小額、大額原版分支。對隨機分支使用固定 `srand` 比對可重播性，**未宣稱完全驗證大額機率分布**。沒有 require 有大量副作用的原始完整入口，也沒有真正商品交易、任意動態回呼或正式世界存檔。
- [`modern/src/period-stock-use-model.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/src/period-stock-use-model.mjs)：新增 `REVIEWED_USE_LIMITS`、`projectReviewedPeriodStock`、`projectReviewedUsePreflight`、`sampleReviewedSmallMakeAmount`。三者均為純函式，輸出凍結的合成狀態／使用前置決策／隨機抽樣結果，不觸及正式存檔或 CGI。對負庫存、重複材料、安全整數乘積溢位、零使用時間、未確認排除動態回呼、非法亂數或未審查大額抽樣均採拒絕。**傳入 `callbacksConfirmedAbsent=true` 僅是呼叫端聲明，模型本身不會檢查實際 CGI／商品插件是否有回呼，也不會授權完整使用商品流程**。
- [`modern/tests/period-stock-use-model.test.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/tests/period-stock-use-model.test.mjs)：**38項 Node.js 測試**，核對固定來源字句、庫存上限與 `int`、資金／時間／材料短缺計算、必要事件／職業等前提、同來源不同材料機率判定、輸入型別、亂數 [0,1) 邊界、純結果不可變與前置檢查不授權真實交易。
- [`modern/scripts/demo-period-stock-use.mjs`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/modern/scripts/demo-period-stock-use.mjs) 新增 `npm run demo:period-stock-use`，以固定合成資料展示每日庫存修正、各種使用資格／材料減量情況、0～19單位的小額機率抽樣與刻意拒絕的大額／負庫存來源風險；已納入 GitHub Actions。

**階段累計：** Node 測試由323增至 **361／361**、原版 Perl 斷言由328增至 **364／364**，固定原版 Core Blob SHA 仍為14份，原始 DSL 稽核與所有示範繼續由 CI 驗證。

在 `modern/` 執行：

```sh
npm test
npm run demo:period-stock-use
```

**尚未完成：** 真正 `CheckUseItem` 的動態職業／`functionbefore`、所有 `UseItem` 的交易副作用、`MakeAmount(cnt>=20)` 隨機公式跨語言統計／邊界驗證、商品回呼、完整每日期末庫存上限與真實商品編譯結果之整合、正式世界檔／安全備份與鎖／原子提交、CGI HTTP。此次的模型和成功測試都只限於**安全可重播的合成片段**；不能當作可部署的商品使用引擎。任務02「進行中」，PR #1 保持 Draft，不修改或合併 `main`。

## 第十九批：原版行為優先、問題另列（第二十一階段）

**本階段確立的開發原則：** 移植《商人物語》標準街以**實際固定 Core 原版輸出**為準；即使公式不尋常、資料出現負值或結果超乎一般遊戲直覺，也**先按原版實作及驗證**，不擅自改成更合理的公式或修復缺陷。缺陷、可疑處及安全風險**獨立保存在 [`modern/docs/original-behavior-issues.md`](docs/original-behavior-issues.md)**，與相容性移植程式分開，不代表要主動修復。未驗證的 CGI、事件、AutoVar、帳號和正式存檔 I/O 仍不得任意啟動；這是部署／隔離邊界，**不是修改原版遊戲規則**。

這一批直接取材自 SHA 固定、**未修改**的 [Core `plug/use.cgi::MakeAmount`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L208-L224)、[`UseItem` 生產／超量／批發市場處理](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L128-L150)、[`plug/whole.cgi::CheckWholeStore`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/whole.cgi#L50-L74) 及 [`inc-period.cgi` 庫存修正](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-period.cgi#L77-L82)。這些原始來源已包含在CI核對的**14份固定 Core Git Blob**內，沒有改寫快照。

### 忠實算式與來源處理順序

| 項目 | 照原版輸出的新模型（不擅自修正） | 額外記載的風險 |
| --- | --- | --- |
| `MakeAmount(cnt<20)` | 每個單位用 `rand(1000)<p` 判定，恰抽 `cnt` 次 | 與大額分支分布不同，照原版保留 |
| `MakeAmount(cnt>=20)` | `p=p/1000`，`ave=cnt*p`，`sigma=ave*(1-p)`，`t=(-2*sigma*rand())*sin(2*3.1415926535*rand())`，回傳 `int(sqrt(abs(t))+ave+0.5)`；**恰取兩個亂數，不加額外下限／上限修正** | `sqrt(abs(t))` 只會把結果往平均值以上推；與常見機率統計不同，詳見 CORE-01 |
| 每日商品庫存 | 超過上限則先截到上限，再 `int()`；例如 `-1.9→-1` | 原版可能保留負庫存，見 CORE-02 |
| `UseItem` 產出溢量 | 先把**超出的數量**加入 `DTwholestore`，再將商店新增量設為 `limit-oldStock`；即使此值為**負數**也照來源記錄 | 原本就超庫存時可能出現負新增量，見 CORE-03 |
| `CheckWholeStore` | **在商品生產／退回後**以全部商店總量與 `wslimit` 修正批發庫存；固定負上限取絕對、正值使用 `int(wslimit*shopCount+0.99)`；沒有 `code` 的商品直接跳過 | 市場收到的超量**可能再被裁掉**，或無 `code` 時不檢查，見 CORE-04 |

**來源例子：** 商店原有8、生產5、上限10，商店最後10、超出的3先回市場；如果批發原本4，市場先變7，總量上限15時最後市場只剩5。更特殊的是：商店原本12、上限10、生產2，原版計算會產生 `discarded=4`、`additem=-2`，商店回到10。**兩種都直接保留原版計算結果，不先「合理化」。**

### 實際提交

- [`modern/src/original-use-outcomes-model.mjs`](src/original-use-outcomes-model.mjs)：新增 `projectOriginalMakeAmount` 與 `projectOriginalCreateThenWholesale`。第一個保留原版大額兩次抽樣、`sin`、`sqrt(abs(t))`、零／滿機率的分支先後。第二個保留**單一合成商品**的生產 → 超量回市場 → 原版市場上限順序，包含原本庫存超限時的負新增量、`wslimit` 負值固定上限／正值 `int` 與商品無 `code` 時跳過檢查。兩者純函式且不寫檔。此處只模擬商品數字片段，並非完整市場所有商品、真實 `UseItem` 或帳號交易。
- [`modern/src/period-stock-use-model.mjs`](src/period-stock-use-model.mjs)：將上一階段 `projectReviewedPeriodStock` 原本對負庫存的拒絕改為保留原版帶符號值、照來源執行 `limit` 修正與 `int`；不合法的 JavaScript 數字型別與無法安全表達的數字仍拒絕，屬模型輸入表示限制而非宣稱原版拒絕。原 B-20 `sampleReviewedSmallMakeAmount` 依舊是一個**只涵蓋小額的舊入口**；新增 B-21 `projectOriginalMakeAmount` 才包含兩個機率分支，沒有暗中替換舊 API 的定義。
- [`modern/tests/original-perl/original-use-outcomes.t`](tests/original-perl/original-use-outcomes.t)：新增**27項原版 Perl 隔離斷言**，從 SHA 固定 `use.cgi` 擷取未修改的 `MakeAmount` 與商品產出／溢出程式片段，直接 `require` 固定 `whole.cgi` 的原版 `CheckWholeStore`。固定 `srand` 對照原版大額公式的兩次抽樣以及19次小額抽樣，驗證一／兩店、超額／市場再截斷、`wslimit`、無 `code`、負新增量和負原有庫存的來源輸出。只使用記憶體合成資料，不執行真正商品回呼、CGI 或正式世界存檔。
- [`modern/tests/original-use-outcomes-model.test.mjs`](tests/original-use-outcomes-model.test.mjs)：新增**19項 Node.js 測試**，核對固定 Core 原文、來源大小額分支、正負 `t` 與精確亂數消耗數量、負庫存、負新增量、超量退回再受市場限額以及不可變的合成結果。
- [`modern/scripts/demo-original-outcomes.mjs`](scripts/demo-original-outcomes.mjs)：新增 `npm run demo:original-outcomes`，展示原版小額／大額抽樣、負值與市場修正；同步更新舊 `demo:period-stock-use` 對負值的歷史錯誤預期，兩個示範均已列入 CI。
- [`modern/docs/original-behavior-issues.md`](docs/original-behavior-issues.md) 單獨列出已知原版異常與尚未覆蓋的技術限制；不混入原版 Core 檔案或自動修改遊戲規則。

**測試數量：** Node `361+19=380` 項，原版 Perl `364+27=391` 項；原始 DSL audit、所有合成示範與**14份固定原版 Core Git Blob** 一併由 GitHub Actions 檢查。詳見當次 PR／CI 的最終 HEAD 結果。

在 `modern/` 執行：

```sh
npm test
npm run demo:original-outcomes
```

**仍未完成：** 真正 `UseItem` 的動態回呼、資格／材料實際修改、所有商店／所有商品完整交易和市場同步、Perl RNG 與 JS RNG 的位元級一致性、正式世界存檔、鎖／備份／fsync／原子提交、CGI HTTP。**原版相容優先，不等於在未隔離的正式資料上冒險執行有副作用的原版程式。** 任務02維持「進行中」，PR 保持 Draft，不合併。

## 第二十批：多商品與多商店的原版 UseItem 執行順序（第二十二階段）

本階段保持使用者已確認的「**照原版實作、問題另外記錄**」原則。依照固定 Core [`plug/use.cgi` 第115～150行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi#L115-L150) 與 [`plug/whole.cgi::CheckWholeStore` 第50～74行](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/whole.cgi#L50-L74) 真正隔離執行**多個材料、依序多個產出、全部店家的批發市場檢查**。原版固定 Core 快照的 Git Blob SHA 沒有改動，仍為14份。

### 固定原版的順序與數值

`UseItem` 不是每產出一筆就呼叫 `CheckWholeStore`：

1. 先按照 `USE.use` 陣列的**原始順序**，逐項以 `MakeAmount(item.count * count, item.proba)` 計算並減少材料庫存；結果為0則不記錄消耗訊息。
2. 再按 `USE.result.create` 陣列的**原始順序**，逐項使用**同一連續亂數序列**計算產出、在商店中立即更新該項庫存，將超出商店上限的部分加入 `DTwholestore`；若已超過庫存上限，保留原版可能出現的**負新增量**。
3. 最後，**只呼叫一次** `CheckWholeStore`，遍歷所有有 `code` 的商品，逐個合計**全部商店**該項庫存，再按其 `wslimit` 上限修正批發市場數量；沒有 `code` 的商品直接跳過。

**直接執行的原版 Perl 例子：** 兩家商店原有庫存 `[[8,4,3],[3,4,2]]`、批發市場 `[4,0,-5]`，第一家消耗商品1的4件，之後依序產出商品1、商品2、商品1、商品3（最後商品無 `code`）。兩店修正後庫存為 `[[10,6,5],[3,4,2]]`，市場從退回溢量後暫值 `[12,6,-3]` 變成 `[3,0,-3]`。最特別的是：原版完整的 `additem` 紀錄為 `[[1,6],[2,2],[1,0],[3,2]]`，表示**第二次產出商品1時，即使實際新增0件也仍會留下來源紀錄**。這是原版的實際行為，不在移植時修掉；詳見獨立問題文件的 **CORE-08**。

### 新增程式與測試

- [`modern/tests/original-perl/original-multi-item-use.t`](tests/original-perl/original-multi-item-use.t)：**25項新增 Perl 斷言**。從 SHA 固定的原始 `use.cgi` 精確擷取含**材料消耗、產出、一次市場檢查**的來源片段及完整 `MakeAmount`，並直接 `require` 固定 `whole.cgi` 的原版 `CheckWholeStore`；用完全合成的雙商店／三商品狀態直接運算。測試重複商品、機率0材料、產出紀錄0件、無商品產出仍修正市場、無 `code` 不修正市場、負值及**材料先抽樣、產出後抽樣**的原版亂數消耗順序。未啟動任何使用商品回呼或正式 CGI。
- [`modern/src/original-multi-item-use-model.mjs`](src/original-multi-item-use-model.mjs)：新增 `projectOriginalMultiItemUse`。**按原版順序**對明確輸入的數值陣列進行多種商品／多商店的純函式運算；使用第二十一階段完整 `projectOriginalMakeAmount` 算式及**共用的 `random()`**，保留負庫存、重複產出、`additem=0`、商品無 `code` 與各商品分別按所有店家 `wslimit` 重新計算的效果。輸出結果為凍結的合成資料及抽樣／交易片段的數值紀錄，**不是真正商品使用／授權／寫檔**。
- [`modern/tests/original-multi-item-use-model.test.mjs`](tests/original-multi-item-use-model.test.mjs)：**22項新增 Node.js 測試**，檢查原版固定來源文字與區段順序、跨商品消耗與產出、重複商品與零新增紀錄、兩店總量、無 `code`、`wslimit` 負值與小數、負庫存、跨材料與產出的連續隨機數、未產出也執行市場檢查、不合法輸入、唯讀與無實際權限。
- [`modern/scripts/demo-original-multi-item.mjs`](scripts/demo-original-multi-item.mjs)：新增 `npm run demo:multi-item`，用合成雙商店資料演示正確順序、重複產出紀錄、材料與大額產出連續 RNG、市場依全部店家最終庫存修正、無產出仍修正市場；**所有示範都不碰正式遊戲存檔**，已加入 CI。
- [`modern/docs/original-behavior-issues.md`](docs/original-behavior-issues.md) 獨立新增 **CORE-08**，記錄重複產出、零件數紀錄與只在最後執行市場檢查的移植陷阱。問題文件與原版來源分離；任何遊戲規則都沒有擅自修改。

本階段新增 **22項 Node 測試、25項 Perl 隔離斷言**，合計 **402／402 Node、416／416 Perl**，並持續以14份固定 Core 快照 Git Blob SHA、原始 DSL audit 和歷次示範核對。執行方式：

```sh
cd modern
npm test
npm run demo:multi-item
```

**範圍未擴大的部分：** 仍未完成真實 `UseItem` 的使用資格、費用／時間、商品與事件動態回呼、玩家認證、持久化世界檔與 OS 鎖／備份／原子提交，以及原版 Perl PRNG 種子與 JS PRNG 的跨平台逐位元組一致性。此階段只驗證**原版數值／來源順序**，沒有啟動任何正式存檔或完整 CGI，PR #1 繼續 Draft，任務02仍「進行中」。

## 第二十一批：原版 UseItem 資格／帳務／多商品數值串接（第二十三階段）

本批只串接先前已驗證的原版**數值計算片段**，仍遵守「**原版怎麼算就怎麼移植，異常獨立記錄，不在移植時擅自修正**」。來源固定為 Core `738d71a2985fd088f2ca90f25145706392ee2365` 的未修改 `plug/use.cgi::UseItem`（資格到市場檢查）、`plug/calc.cgi::GetItemUseTime / UseTime`、`plug/whole.cgi::CheckWholeStore`，14份快照 SHA 檢查不變。

原版順序：**按熟練度→職業→點數→人氣→必要事件→金錢→時間→逐筆材料**修正有效次數，立即記入 `USE.result.count`；為0時直接返回，**不扣款、不動庫存、也不呼叫市場檢查**。若非0則先 `UseTime(usetime*count)`、扣現金並增加 `paytoday`，才按來源次序消耗全部材料、逐筆產出、最後一次 `CheckWholeStore`。時間先以原有 `DT.time` 決定有效次數，**真正 `UseTime` 才處理 `MAX_STOCK_TIME` 上限**，不能提前把儲存時間修正後再算次數。

新增 `src/original-use-transaction-model.mjs` 的 `projectOriginalUseTransaction`：保留來源的逐筆材料前置檢查（**重複材料不先合併**）、`proba==0` 的一份需求、熟練度對 `GetItemUseTime` 的 `expold` 覆蓋、`status=0` 不修改使用時間的來源分支，以及 B-22 的多商品、重複新增0與市場順序。合成例子：要求4次，費用20／次，現金70，現在時間1000、商店記錄950、有效單次時間18 → **執行2次**；現金70→30、`paytoday` 5→45、時間950→986，原兩店三商品庫存最後 `[[10,6,5],[3,4,2]]`、批發 `[3,0,-3]`，`additem` 保留 `[[1,6],[2,2],[1,0],[3,2]]`。尚未驗證的數值型別和超出 JavaScript 安全表示範圍會拒絕，這是合成測試限制**不是原版遊戲拒絕規則**。

- `tests/original-perl/original-use-transaction.t`：直接執行 SHA 固定原版 `UseItem` 中從資格至 `CheckWholeStore` 的原始片段、原樣 `MakeAmount` 與 `calc.cgi`／`whole.cgi` 函式；隔離合成店家、時間及亂數，不觸發完整 CGI 或動態回呼。
- `tests/original-use-transaction-model.test.mjs`：對等 Node.js 原版順序、原版帳務數值、重複材料、零次返回、時間上限、共用 RNG、不可變結果等測試。
- `scripts/demo-original-use-transaction.mjs`：用 `npm run demo:transaction` 展示合成計算；已加入既有 GitHub Actions。
- `docs/original-behavior-issues.md`：CORE-09／CORE-10 的原版重複材料及時間延後修正注意事項，**只記錄、不修復**。

```sh
cd modern
npm test
npm run demo:transaction
cd tests/original-perl && prove -v original-use-transaction.t
```

**未涵蓋：** `CheckUseItem` 動態職業／`functionbefore` 及真正的選單授權、`RequireFile('inc-item.cgi')` 和商品 `function` 回呼、完整使用後熟練度重新分配、正式世界檔案寫入、CGI HTTP、跨程式鎖與持久化回滾、Perl／JS RNG 種子位元級等價。未授權正式遊戲商品使用與部署。PR #1 仍 Draft，不合併 `main`，Notion 任務02仍「進行中」。

## 第二十二批：UseItem 原版熟練度尾段與合成交易串接（第二十四階段）

本階段將 B-23「資格→扣時間／費用→所有材料→依序產出→一次 `CheckWholeStore`」與 B-19 曾隔離驗證過的 **`UseItem` 熟練度尾段**接為一條純合成數值流程。依據固定 Core `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365` 未修改 `plug/use.cgi`；原版順序在市場修正之後，**先檢查／執行商品回呼，才進行熟練度增加與超額扣減**。本模型僅允許明確聲明商品回呼不存在的合成 fixture；沒有宣稱已編譯 DSL、驗證真實回呼不存在，或可對玩家執行 `UseItem`。

新增 `src/original-use-experience-transaction-model.mjs` 的 `projectOriginalUseWithExperience`，不改寫 B-23 已驗證模型；只在完成該模型的有效交易後接續原版熟練度尾段。實際受控的案例為：熟練度200、每次增加30、有效使用2次 → `exp=260`、`result.expold=200`；同時保留原有帳務 `money=30`、`paytoday=45`、時間986、雙店／批發市場庫存 `[[10,6,5],[3,4,2]]`／`[3,0,-3]`、重複產出零件的原版紀錄。另一個熟練度超額案例：初始 `{1:900,2:700,3:800,4:850,5:900}`，商品1增加100後依原版將其他技能扣成 `{1:1000,2:538,3:638,4:687,5:737}`，不平均分配。

**原版不會設定同值時的商品 ID 排序**：`sort { exp[a] <=> exp[b] } keys(%exp)`；若超額時存在同值，本模型要求提供該次 Perl 執行**實際觀察到的 sorted keys**，並驗證其符合原始比較式，不擅自加 ID tie-break。隔離 Perl 測試與動態 Probe 會記錄觀察順序。新增相容性問題紀錄 [CORE-11 舊熟練度大於1000導致負增加量、CORE-12 只有本次使用技能時總超額可能殘留](docs/original-behavior-issues.md)，並補充 CORE-05 同值排序的實例。以上是原版行為，不自動修正。

- `tests/original-perl/original-use-experience-transaction.t`：**48項**原版 Perl 斷言，精確擷取並執行 `UseItem` 回呼前／後的**原文字句**、固定 `GetItemUseTime`／`UseTime` 與 `CheckWholeStore`，覆蓋獎勵、尾段順序、單項1000、總量3600、同值分配、負熟練度增加量、超額未消除、鍵刪除、已有 `result.expold`、0次／0獎勵等。刻意**不執行兩個片段中間的動態回呼**。
- `tests/original-perl/original-use-experience-probe.pl`：固定9組合成案例，直接在隔離 Perl 執行環境輸出 JSON，保留該次原版 HASH sorted keys 供 Node 對照。
- `tests/original-use-experience-transaction-model.test.mjs`：**32項 Node 測試**，其中一項會即時執行上述 Perl probe，逐案例比對有效次數、時間、金錢、各項商品庫存、批發市場、熟練度與逐筆產出／消耗紀錄。環境沒有 Perl 時可跳過動態子測試（原版 Perl 專用 CI 仍必須通過）。
- `scripts/demo-original-use-experience.mjs`：新增 `npm run demo:use-experience`，納入 GitHub Actions。
- 固定 Core 14份原始快照、DSL audit、既有全部測試與示範不變。來源比較只限可安全表示的合成數值；JavaScript 整數範圍限制不是原版交易規則。

命令：

```sh
cd modern
npm test
npm run demo:use-experience
cd tests/original-perl
prove -v original-use-experience-transaction.t
```

**本階段經確認：460／460 Node、505／505 Perl 隔離斷言通過**。未完成真正商品／職業／functionbefore 回呼、完成版熟練度與其他動態 side effects 的交互驗證、正式世界存檔／鎖／備份／原子提交、CGI HTTP 或 Perl／JS RNG 種子位元級等價。原版優先、異常獨立記錄、不修改遊戲規則；Draft PR 保持不合併、任務02仍進行中。

## 第二十三批：原版 CheckUseItem／職業函式／functionbefore 隔離驗證（第二十五階段）

本階段依固定 Core `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365` 未修改 `plug/use.cgi` 的 `CheckUseItem`、`GetUseItem`、`GetUseItemListSub` 實際來源及固定 `inc-makeitem.cgi` 的欄位生成片段，繼續保持**原版優先、問題獨立記錄、不擅自修正原版遊戲規則**。原版14份 Core Git Blob SHA 快照不變。

**原版動態順序（已直接執行 Perl 隔離測試）：** 先尋找 `item::_job_use_<use.no>_<shop.job>_` 專屬職業函式，有定義就呼叫；**只有專屬不存在時**才尋找 `item::_job_use_0_<shop.job>_` 共用函式。職業函式可能更改 `USE` 等資料，之後才讀取當前的 `USE.functionbefore` 並呼叫 `item::<functionbefore>(USE)`。其回傳值為2時立即給予「僅顯示」的狀態，回傳1時立即拒絕，其他受測數值才會繼續按照 `USE.use` 原順序逐項做材料檢查。這些函式返回值及材料狀態是 **`CheckUseItem` 的選單／前置檢查結果，不代表已執行真正 `UseItem`**。

**原版旗標陷阱：** `GetUseItem` 與 `GetUseItemListSub` 僅在返回2時設 `dispok=1`，或在返回1時設 `useok=1`。**不會因後來返回0／2而把舊的 `useok`／`dispok` 清除**。此現象獨立記於 [CORE-13](docs/original-behavior-issues.md)；若 `functionbefore` 指向不存在的函式，固定 Perl 片段會發生 `Undefined subroutine` 錯誤，見 CORE-14。兩者均不在移植時自動「合理化」修復。

**新增實作：**
- [`projectOriginalUseEligibility` 合成純函式模型](src/original-use-eligibility-model.mjs)：以具名、限量的合成資料描述回呼效果（例如更改材料需求、庫存、函式名稱／旗標），並保留原版的專屬／共用尋找順序、前置函式回傳狀態、短路檢查及舊旗標。**不能直接執行未知 JavaScript 函式、Perl DSL 或外部回呼**；未解析的 `functionbefore` 明確拒絕測試資料，不擅自當成允許。
- [原版 `CheckUseItem`／`GetUseItem` 原樣 Perl 隔離測試](tests/original-perl/original-use-eligibility.t)：由固定 SHA 的原始來源精確擷取四個原版函式，搭配**僅在測試內定義的 `package item` 函式**，驗證專屬職業優先、fallback、前置回傳2／1／其他、回呼改變材料／店家、旗標不清除、找不到函式與 material 短路。
- [商品回呼靜態契約檢查](tests/original-perl/original-item-callback-contract.t)：只核對 `CheckWholeStore` → `RequireFile('inc-item.cgi')` → `result.function` 符號是否存在 → 向商品回呼暴露 `@item::DT`／`item::DTS`／`item::count`／`item::USE`／`item::DT`／`@item::ITEM` → `function_return` → 熟練度尾段的原版程式文字，**沒有執行真正商品回呼、動態 require 或 DSL 編譯**。
- [Node.js 對照測試](tests/original-use-eligibility-model.test.mjs) 與 [13 組原版 Perl JSON Probe](tests/original-perl/original-use-eligibility-probe.pl)：`npm test` 會直接執行未修改來源片段，在人工宣告的安全回呼下核對結構化回傳、呼叫順序、材料／庫存副作用和 flag；不是以靜態推論替代 Perl 驗證。
- [合成示範](scripts/demo-original-use-eligibility.mjs)：`npm run demo:eligibility`，已加入既有 CI；只顯示選單資格，不授權真實交易。

```sh
cd modern
npm test
npm run demo:eligibility
cd tests/original-perl
prove -v original-use-eligibility.t original-item-callback-contract.t
```

**未完成／不可誤稱：** 真正 `inc-item.cgi` 的安全載入與實際商品／事件回呼、任何未知職業函式的完整效果、正式 DSL 編譯與所有 116 USE 規則整合、回呼修改狀態後的真正 `UseItem`／熟練度尾段、存檔／鎖／CGI HTTP。固定 `inc-makeitem.cgi` 檔案在此只做欄位來源核對，沒有啟動其頂層編譯程式。CI 通過僅支持來源明確的純記憶體片段，任務02保持進行中、PR #1 維持 Draft 並不合併。

## 第二十六階段：原版標準街回呼盤點與兩個共用函式的隔離比對

本階段**只對原版 DSL 做不執行的全量回呼宣告盤點**，再以 Perl 原版函式本文+記錄型替身驗證兩個確定的共用函式，不執行原版編譯器、真正 `inc-item.cgi`、商品庫存扣減、日誌寫入、帳號或 CGI。來源仍是原本標準街 `custom/inc-item-data.cgi`／`custom/inc-rebel-data.cgi` 與固定 SHA Core `inc-makeitem.cgi`；原版14份檔案完全不動。

- [詳細盤點與分類](docs/original-callback-inventory.md)：116個 `@@USE` 中有56筆使用後 `func`，另60筆沒有。**22個 `lostbook`、1個 `popup`、11筆本地 `_local_` 定義、22筆 `_local_1` 沿用**。另有1筆真正的 `@@USE funcb`、1筆 `@@ITEM funct` 與42筆職業 `job` 欄位；它們不混成使用後回呼。
- [靜態回呼來源索引](src/original-standard-callback-inventory.mjs) 與 [固定來源測試](tests/original-standard-callback-inventory.test.mjs)：依原版 `GetLocalFunction($name,$g_use->{no}+1)` 還原同商品 `_local_1` 別名指向的實際第一段函式。輸出逐筆來源行號及對庫存、金錢、時間、熟練度、人氣、陳列架、亂數／日誌的**字面引用**，不推定一定發生副作用，也不執行 Perl。
- [兩個原版共用函式的受控 Node 數值模型](src/original-shared-use-callback-model.mjs)：`lostbook` 使用來源 `rand(1000)<param1` 決定是否**請求**外部 `UseItem(itemno,1,訊息)`；只記錄意圖、不執行扣庫存。`popup` 依原版 `int(param1*(2-rank/5000))` 修改**合成人氣**、只從上方限制為10000，並記錄兩筆 `WriteLog` 參數，完全不真正寫日誌。
- [原始 Perl 函式本文的隔離斷言](tests/original-perl/original-shared-callbacks.t)／[12組原版 Perl JSON Probe](tests/original-perl/original-shared-callback-probe.pl)／[Node 直接對照](tests/original-shared-use-callback-model.test.mjs)：真的擷取 `@@FUNCITEM` 中的兩個 `sub` **原樣**函式執行，但用測試自建的 `package item` 外部函式記錄器攔截 `UseItem`／`WriteLog`。不執行來源整份檔案、真正遊戲交易或持久化。
- [獨立原版問題紀錄](docs/original-behavior-issues.md) 新增 **CORE-15**：`popup` 接近邊界的實際 Perl `int` 浮點結果可能是59或-399，而非60／-400；即使人氣上限已截斷，原版訊息仍用原始 `up` 計算，可顯示「人氣提升了-3%」。**原版怎麼算就怎麼移植，不主動修正。**
- [合成回呼示範](scripts/demo-original-callback-inventory.mjs) 可由 `npm run demo:callbacks` 執行，已加入 CI。它列出來源盤點與記錄型效果，不表示真正商品回呼或日誌完成。

```sh
cd modern
npm test
npm run audit
npm run demo:callbacks
cd tests/original-perl
prove -v original-shared-callbacks.t
```

**未涵蓋：** 其餘33個本地使用後函式、真正前置與商品層級回呼、事件回呼、原版商品完整 DSL 編譯和動態載入、外部 `UseItem`／`WriteLog` 的真正副作用、帳號、真正存檔／鎖／原子提交或 CGI。每個宣告的靜態引用不等於已實作對應規則。Task 02 持續進行，Draft PR #1 不合併。

## 第二十七階段：原版商品13工作回呼／商品63展示架回呼的原文隔離

接續 B-26 已盤點的 11 份本地 `func _local_`，本階段選定**商品13（`book-work`）、商品63（`edit-showcase`）**的兩份來源 Perl 本文，連同**原始 Core `GetMoneyString` 本文**，在**記憶體與測試專用 `WriteLog` 攔截器**下執行，再和 Node 原式純函式逐案對照。**沒有編譯整份 DSL、動態 require 原版商品包、真的修改商店或寫任何玩家／世界／日誌檔案。**

- [逐來源與異常的完整 B-27 說明](docs/original-inline-callbacks.md)：原版商品13在 `custom/inc-item-data.cgi` 1860–1900行的2個 `@@USE` 共用 `_local_1`，商品63在1902–2013行的8個 `@@USE` 共用另一份 `_local_1`。兩組**名稱相同但來源不同**；測試按商品切換原版本文，**不宣稱已確認正式動態載入的同名函式相容性**。
- [合成 Node 模型](src/original-inline-work-showcase-model.mjs)：工作按 `money+=param1*count`，以固定 Core `GetMoneyString` 的可表示整數格式生成返回文字，保存依原版順序的2組日誌參數；展示架先改 `showcasecount`，擴張逐格清0、縮減 `splice`，陣列多餘尾端、`undef` 洞與新舊數量相等時不整理的原版效果照樣保留。貨幣前後綴是**明確合成資料**而非宣稱原版所有世界的預設。
- [原始 Perl 回呼安全隔離器](tests/original-perl/OriginalInlineCallbackHarness.pm)：只從原始 DSL 擷取上述兩組 `func _local_` 到結束標記的**原文字句**，按固定 `inc-makeitem.cgi` 的 `eval(<<'_eval_code_')` 包裝模板在記憶體中執行；金額格式用固定 `inc-func.cgi::GetMoneyString` **真正原版函式本文**。`WriteLog` 不寫檔，只記錄呼叫參數。
- [52項原版 Perl 斷言](tests/original-perl/original-inline-work-showcase.t)／[13組原版 Perl JSON 探針](tests/original-perl/original-inline-work-showcase-probe.pl)／[31項 Node 測試](tests/original-inline-work-showcase-model.test.mjs) 真正跨語言比較金額、展示陣列、文字與日誌順序。
- [獨立原版問題 CORE-16](docs/original-behavior-issues.md)：展示架欄位長度與 `showcasecount` 原本不一致時，原版不主動補齊或截短；如舊數量1、陣列 `[2,4,6,8,10]` 改成3，原版保留為 `[2,0,0,8,10]`。**這是人工不一致 fixture 的來源運算，不表示正常存檔一定出現。只記錄不修正。**
- [合成示範](scripts/demo-original-inline-work-showcase.mjs)：`npm run demo:inline-callbacks` 已加入 CI。

```sh
cd modern
npm test
npm run demo:inline-callbacks
cd tests/original-perl
prove -v original-inline-work-showcase.t
```

**明確界線**：未執行完整 `UseItem`、所有動態商品／職業／事件回呼、原版編譯器全程、實際 `WriteLog`／`GetMoneyString` 的正式跨套件依賴、真實使用者與世界檔案。工作 callback 自身加錢與展示架 callback 自身改陣列，不等於完整交易的權限、成本或時間均已相容。Task 02 仍進行中，Draft PR 不合併，遊戲規則不擅自修正。

## 第二十八階段：真正原版商品載入鏈、Perl require 路徑快取與同名函式隔離

依 [原版載入路徑完整說明](docs/original-item-loading.md) 重新讀取未改動固定 Core `item.cgi`、`item-m.cgi`、`item-s.cgi`、`inc-item.cgi`、既有 `inc-makeitem.cgi`、`plug/use.cgi` 及本倉庫現有 `_config.cgi::RequireFile`。**釐清兩種不同的載入**：原版 `RequireFile('inc-item.cgi')` 會先找 `custom` 覆蓋檔、再找內建來源；但原版商品入口另外用 `GetPath($ITEM_DIR,"use",$ITEM[$itemno]->{code})` 決定商品使用檔，並直接 `require $itemcode`。此 repo 的 `custom/` 目前**沒有** `inc-item.cgi` 覆蓋檔，Node 新測試也直接檢查此事實。`inc-item.cgi` 是 `package item` 的共用 `UseItem`／`WriteLog` 等函式，依 `DEFINE_FUNCITEM` 可引入 `funcitem.cgi`；它**不是**逐商品選擇 `use/<商品>.cgi` 的地方。

- **新增四份固定 Core 純文字快照**：`modern/tests/original-perl/core-inc-item.cgi`、`core-item-detail.cgi`、`core-item-form.cgi`、`core-item-submit.cgi`。它們逐字拷貝不可變 Core commit `738d71a...` 的對應原檔，與既有**14份原版快照分開**以 Git Blob SHA 固定於 CI。四份原始 CGI **完全不執行**。
- [原版 Perl 記憶體虛擬商品載入器](tests/original-perl/OriginalVirtualItemLoader.pm)：只取 B-27 已審閱的商品13工作與商品63展示架兩份**原始本地 Perl 函式本文**，配合原版編譯器 `package item; sub _local_1 {eval(<<'_eval_code_')}` 同形包裝，產生**純記憶體合成**模組。實際執行 Perl `require $itemcode` 和 `%INC` 快取，但透過 `@INC` scalar hook 提供檔案內容，沒有建立／讀寫任何真正編譯輸出或世界資料。`@item::USE` 記錄是依原版索引賦值結構製作的**簡化合成物件**，不是宣稱真正執行完整 `inc-makeitem.cgi`。
- [50項原版 Perl 來源與動態符號隔離斷言](tests/original-perl/original-virtual-item-require.t)、[9組每次獨立啟動 Perl 程序的 JSON probe](tests/original-perl/original-virtual-item-require-probe.pl)、[Node 同語意模型](src/original-item-dynamic-loading-model.mjs) 和 [29項 Node 測試](tests/original-item-dynamic-loading-model.test.mjs)（含9組真 Perl 直接對照）已建立。
- **觀察（僅在刻意單一 Perl 程序跨商品混載的測試中）**：各產品使用檔路徑雖不同，但都編入**同一 `item::` 命名空間**；不同檔案若生成 `item::_local_1`，後載入的同名定義生效；`%INC` 使曾 require 的舊檔再次 require 不重載，**不會恢復先前函式**。若先載入8個展示架動作、再載入2個工作動作，合成 `@item::USE` 前兩格被工作覆寫，3–8格仍是展示架；原版生成器在其檔案模板裡並沒有清空整個 `@USE`。
- [CORE-17 獨立來源／相容性注意事項](docs/original-behavior-issues.md)：**不可將上述刻意混載的單程序實測誤寫成正常 CGI 必然有此 bug**。固定入口來源通常一次選單一商品路徑，實際 CGI 程序生命週期、正式磁碟 require 及所有動態回呼仍未完成端到端驗證。此項只記錄 Node 長駐程序移植時需區分 Perl namespace 與檔案快取的證據，不修改原版。
- [合成示範](scripts/demo-original-item-loading.mjs)：`npm run demo:item-loading` 加入既有 CI，分開展示單商品入口與刻意混載結果；不執行正式商品編譯器或 CGI。

```sh
cd modern
npm test
npm run demo:item-loading
cd tests/original-perl
prove -v original-virtual-item-require.t
```

本階段**不是**真的執行 `_config.cgi`、`inc-item.cgi`、`item-s.cgi`，也沒有進入正式 `UseItem`、玩家認證、真實 `WriteLog`、世界資料讀寫、鎖或提交。原先14份固定 Core Blob 未改動，新的四份亦有獨立 SHA；任務02仍進行中、Draft PR 保留未合併。

## 第二十九階段：原版 Core 商品消耗／取得助手與 `lostbook` 真正記憶體連鎖

接續 B-28 的商品載入來源核對，本階段直接從**已用 Git Blob SHA 固定、未修改**的 `modern/tests/original-perl/core-inc-item.cgi` 擷取 **`item::UseItem`／`UseItemSub`／`AddItem`／`AddItemSub` 四段完整原始 Perl 函式本文**，再與原樣標準街 `custom/inc-item-data.cgi` 的 `sub lostbook` 接合。**真正執行的只有這五段經審閱的原版函式本文與記憶體測試資料**；不 require 整個 CGI、不編譯整個 DSL、不寫真實商品或日誌、沒有世界鎖或儲存。

- [完整 B-29 原版來源、邊界與案例](docs/original-item-helpers.md)：`UseItemSub` 依 `stock<count` 調整實際使用量並減庫存；`AddItemSub` 依 `limit<stock+count` 把實際新增量改為 `limit-stock` 再加庫存。注意庫存陣列採 `DT.item[itemno-1]`，上限表卻採 `main::ITEM[itemno]`，不可擅自統一索引。兩個最外層 `UseItem`／`AddItem` 都是**先呼叫 Sub、再向 `USE.result.useitem/usemsg` 或 `additem/addmsg` 追加實際數量與原訊息、最後回傳0**，不會自動清除原先 result 記錄。
- [Node 原版純數值模型](src/original-item-helper-model.mjs)：`projectOriginalItemHelper` 以具名四種原始 helper 算式和明確合成安全整數輸入計算；`projectOriginalLostbookWithCoreItemHelper` **將 B-26 的 `lostbook` 隨機分支接到真正 Core `UseItem→UseItemSub` 的數量計算與結果陣列**，不再只記錄「可能呼叫 UseItem」的意圖。它只對合成庫存操作，不表示真正外層使用交易全程完成。
- [Perl 來源安全隔離器](tests/original-perl/OriginalItemHelperHarness.pm) **從固定 Core／標準街原始文字擷取五段函式並原文執行**，以合成 `$item::DT`、`$item::USE`、`@item::ITEM`、`@main::ITEM` 保持數據隔離，不讀寫真正世界資料。
- [82項真正 Perl 隔離斷言](tests/original-perl/original-item-helpers.t)、[27組原版 Perl JSON 測資](tests/original-perl/original-item-helper-probe.pl) 與 [34項 Node.js 來源／跨語言比較測試](tests/original-item-helper-model.test.mjs) 已加入既有完整 `prove -v *.t`／`npm test` CI。
- [獨立原版異常 CORE-18／CORE-19](docs/original-behavior-issues.md)：在**特定人工不一致或負數測資**下，原版 `UseItemSub` 可把負請求當成扣除負數而增加庫存；`AddItemSub` 在既有超上限時可把 `count=0` 改成負的實際取得量，並減少庫存。**只記錄原本算式，不額外補負數 clamp，也不宣稱正常 CGI 前置資格一定會允許此類測資。**
- [合成示範](scripts/demo-original-item-helper.mjs)：`npm run demo:item-helpers` 已加入 CI，包括 `lostbook` 觸發後庫存零仍記 `[itemno,0]` 和原訊息。

```sh
cd modern
npm test
npm run demo:item-helpers
cd tests/original-perl
prove -v original-item-helpers.t
```

**未涵蓋：** 完整 `plug/use.cgi::UseItem` 的材料消耗／時間金錢／市場檢查／熟練度前後串接、正式 `RequireFile`、原版商品整體 DSL 編譯或未知回呼、實際角色／世界資料、權限驗證、持久化與 CGI HTTP。所有 Node 整數限制只是明確合成測資範圍，不是增加的原版遊戲規則。Task 02 仍進行中，Draft PR #1 不合併、`main` 不改。

## 第三十階段：原版完整商品使用主函式＋`lostbook`＋熟練度的記憶體整合

此前已分別驗證 B-23 `plug/use.cgi::UseItem` 前半交易、B-24 熟練度尾段、B-26／B-29 標準街 `lostbook` 真正商品助手。B-30 **第一次在同一隔離 Perl 執行環境中真正執行原版完整 `UseItem` 主函式**，並以原版 `calc.cgi` 的 `UseTime/GetItemUseTime`、原版 `whole.cgi::CheckWholeStore`、原版 `inc-item.cgi::UseItem/UseItemSub`、原樣 `lostbook` 本文串接，而不是只把幾個數值模型組合後宣稱完成來源驗證。**唯獨 `RequireFile('inc-item.cgi')` 必須使用只記錄呼叫的替身**；禁止真正 CGI、動態商品編譯／檔案、玩家存檔或對外日誌。

- [詳細來源、13組原始 Perl 情境、完整順序與尚未驗證邊界](docs/original-integrated-use-lostbook.md)：`UseItem` 先做資格／金錢／時間／材料、主交易、**一次 `CheckWholeStore`**，然後使用後回呼 `lostbook` 若觸發則以原版 `item::UseItem` 追加第二段商品消耗，最後才處理熟練度。
- [`OriginalFullUseLostbookHarness.pm`](tests/original-perl/OriginalFullUseLostbookHarness.pm) 僅抽取固定 Core `UseItem/MakeAmount/UseTime/GetItemUseTime/CheckWholeStore` 與已審閱的 `lostbook`／商品助手，全部操作**合成店家記憶體資料**；[`original-full-use-lostbook.t`](tests/original-perl/original-full-use-lostbook.t) 包含**75項**原版 Perl 隔離斷言；[`original-full-use-lostbook-probe.pl`](tests/original-perl/original-full-use-lostbook-probe.pl) 提供**13組**實際原版 Perl JSON 對照。
- [Node 同順序模型](src/original-integrated-use-lostbook-model.mjs) 及 [25項來源／跨語言測試](tests/original-integrated-use-lostbook-model.test.mjs)，繼承 B-23／B-29 已核對行為，**只支援明確列出的 `lostbook` 或無回呼、機率0／1000材料、單一熟練度且無總熟練度溢位的限定測資**。對未審閱的回呼／隨機／世界效果明確拒絕，不宣稱完整 Perl CGI／DSL 等價。
- [CORE-20](docs/original-behavior-issues.md)：在原版記憶體測資中，市場修正看到 `[10,6,5]`，之後 `lostbook` 將庫存變成 `[9,6,5]`，**原版不再執行第二次 `CheckWholeStore`**；熟練度只在回呼後 `200→260`。這是**原版順序**，不擅自補修正。
- `npm run demo:integrated-use` 已納入 CI，展示成功、未觸發、零庫存、重複材料及數量0等**純合成**測資。

**整體進度與下一步不再只看測試量：** [12項 Notion 任務狀態、可玩閉環驗收路線](docs/migration-progress-and-next-milestones.md)。當前正式狀態為 **01 已完成、02 進行中、03～12 待辦**，但最小 Core 相關子模型已有提前建立；不能把這些單獨模型／綠燈誤算成瀏覽器可玩、完整存檔或多人世界完成。**建議下階段優先將 `GameCore／StreetModule／WorldState` 的介面先訂出，再串起第一條可重現的標準街單機經營流程。**

```sh
cd modern
npm test
npm run demo:integrated-use
cd tests/original-perl
prove -v original-full-use-lostbook.t
```

原版兩份 DSL、18份固定 Core Blob、`main`、`migration/standard-street-s1` 均未改動；只更新獨立測試分支及 Draft PR #1，不合併。

## 第三十一階段：Game Core／Street Module／World State 的第一個可執行契約

已從原版規則基準跨到**正式 Notion 任務04的初版實作**，但**任務04尚未完成驗收**：新增 [`game-core-contract.mjs`](src/game-core-contract.mjs) 的純 Game Core 命令 `applyGameCommand`、不可變 `WorldState`、JSON 純文字快照及只在記憶體中 `compareAndSwap` 的 `createMemoryWorldAdapter`／`executeMemoryCommand`；加入 [`standard-street-module.mjs`](src/standard-street-module.mjs) 作來源已審核的標準街獨立模組。

**目前真正可執行的兩項標準街命令**：`open-shop` 使用固定 Core `new.cgi` 與兩份原始 DSL 已審核的初始商店模型；`edit-showcase` 使用固定 Core `sc-s.cgi` 的展示架模型。都能在同一個記憶體世界按 `revision` 依序執行、產生不修改舊快照的結果。來源已知的 DSL 商品79筆、USE動作116筆、事件25筆只作**原文欄位的非執行型目錄**（含來源檔案、行號、原始值）；`item-use`、市場銷售、期間決算、事件、未知回呼與其他街道，**一律不被暗中視為已支援**。

[**第一版契約、技術取捨與驗收邊界**](docs/game-core-contract-v1.md) 明確說明本機／伺服器可共用純規則但仍需要不同的實際儲存、權限與資料同步層；目前 `market` 和 `events` 都是 **null（未建模）**，並非原版數值0；`encodeMemorySnapshot`／`decodeMemorySnapshot` 是純資料序列化，**不是真正存讀檔**。這次 [**41項 Node 測試**](tests/game-core-contract.test.mjs) 涵蓋真原版來源建店、展示架、不可變世界、過期版本、未知命令、相同版本競爭提案、決定性重播、79／116／25來源原文目錄；既有原版 Perl 隔離測試不變。

```sh
cd modern
npm test
npm run demo:game-core
```

此階段示範和全部原版來源稽核都納入既有 GitHub Actions。**正式 Notion 狀態為 01已完成／02及04進行中／03與05～12待辦**；不可將純記憶體第一版 API 算成可玩的標準街、具備權限的多人伺服器或實際磁碟存檔。

接續優先：完成任務04剩下的商品命令／事件效果掛鉤與世界模型，再逐步讓已核對的商品使用、市場銷售與週期結算加入同一條可重現經營流程，不能用未經原版審閱的自創數值填空。正式 `main`／`migration/standard-street-s1`、兩份原始 DSL、所有18份固定 Core 原文及 CORE-01～CORE-20 紀錄都不改動。

## 第三十二階段：商品使用記憶體世界連續交易（**人工來源測試街道**）

這一階段接續 B-30 **原版完整 `plug/use.cgi::UseItem` → `lostbook` → 商品助手 → 熟練度** 的直接 Perl 來源驗證，以及 B-31 `Game Core／Street Module／World State` 版本命令介面。新增 [`reviewed-use-fixture-street.mjs`](src/reviewed-use-fixture-street.mjs)，讓**同一個合成記憶體世界**連續執行兩次**已由原版 Core 函式驗證的商品交易**，而非每次建立新測試快照。兩次操作會保存上一筆的商品庫存、別店商品、金錢、`paytoday`、時間、熟練度與批發存量，並由記憶體 `compareAndSwap` 分別提交 `revision 0→1→2`。

**嚴格的來源歸屬：** B-30 的商品 A／B／C 是**人工3格 Core 測資**，不是標準街原始 ITEM #1／#2／#3（實際為藥草、野獸皮革、樹枝）。因此本次故意建立**獨立 `streetId='source-use-fixture-b32'`**，只支援明確的 `source-fixture-use` 命令。**真正 `standard-street` 模組仍只有 `open-shop`、`edit-showcase`，沒有偷偷加入通用商品使用或虛構的配方、限額、價格、金錢／經驗。** 未支援回呼、額外欄位、錯誤商品編號、過期版本或交易有效次數0會拒絕，且世界不修改；`perlRandBucket` 為**原版 Perl `rand(1000)` 的整數部分或受控合成抽樣**，不是 JS 宣稱等價的亂數種子。

- [來源、兩次交易狀態、真實與人工商品分界](docs/reviewed-world-use-sequence.md) 完整說明原版來源和受測範圍。
- [Perl 六筆連續交易 JSON 探針](tests/original-perl/original-world-use-sequence-probe.pl) 包含**三組兩步來源原文執行**；[40項獨立 Perl 斷言](tests/original-perl/original-world-use-sequence.t) 驗證真正原版函式跨次數量、資金、時間、技能與市場。
- [23項 Node 測試](tests/reviewed-use-fixture-street.test.mjs) 逐次核對六筆真 Perl 輸出與 `WorldState` 狀態，另檢查世界版本、原版回呼與一次市場修正、序列化、未知行動不修改世界。
- [`npm run demo:world-use`](scripts/demo-world-use-sequence.mjs) 展示同一個記憶體世界兩次來源已驗證交易、過期版本拒絕及未支援市場銷售拒絕；已加入 CI。

```sh
cd modern
npm test
npm run demo:world-use
cd tests/original-perl
prove -v original-world-use-sequence.t
```

**Notion 正式任務05已因可執行代碼開始實作改為「進行中」**，而非已完成。任務02／04也仍進行中，合計**1已完成／3進行中／8待辦**；不能因為「人工3格來源測資」通過，便聲稱真實標準街79商品、完整市場銷售、週期結算、UI、磁碟存讀檔或多人世界已可使用。下一階段優先把**真正 DSL ITEM+USE 的單一已審閱商品動作**接入 `standard-street` 的79格 WorldState，再逐步組裝完整經營閉環。

## 第三十三階段：第一筆**真正標準街**商品使用與原版編譯器直接 Perl 對照

B-32 的人工 A／B／C 商品不能冒充真實標準街 ITEM；本階段改選原版 [`custom/inc-item-data.cgi`](../custom/inc-item-data.cgi) 的 **ITEM #79「禮物卷」／第一筆 USE「交換地圖集」**：原版材料為2張禮物卷，產出 ITEM #12（山區地圖）、#9（礦山地圖）、#14（劍市地圖）各1份。沒有自訂 callback，也沒有隨機產出機率。

- [**`reviewed-gift-map-use.mjs`**](src/reviewed-gift-map-use.mjs)：嚴格審核這**單一真實 USE**，由兩份原版 DSL 名稱解析79格 ITEM，讀取完整79項原版 `PRICE/LIMIT`（包括零價格 ITEM #13／#63），套用已驗證的原始編譯器規則。原版 `ItemUseTimeRate=0.5` 將宣告 `time 1h` 轉成**實際使用時間1800秒、`exptime` 也為1800秒**。未提供自訂回呼或經驗／金錢欄位不私自補值；其他115筆 USE 不支援。
- [**`standard-street-module.mjs`**](src/standard-street-module.mjs)：在既有 `open-shop`、`edit-showcase` 之外，**只新增** `gift-exchange-maps`。它透過同一 `GameCore/WorldState` 可完成「開店→交換地圖集→再交換」，持續更新真實79格商品庫存、時間與世界 `revision`。
- **市場尚未完成：** 開店後的 `WorldState.market=null` **不會**被默默當作0。由於原版完整 `UseItem` 必須呼叫 `CheckWholeStore`，這筆商品使用只允許測試明確提供 `market:{source:'explicit-b33-test-fixture',wholesale:Array(79).fill(0)}` 時執行。**此批發全零資料是人工來源測試輸入，不是已確認的真實世界市場初始化**；沒有它便拒絕，不能當成完整可玩商品系統或真實玩家交易入口。
- [**`OriginalGiftMapUseHarness.pm`**](tests/original-perl/OriginalGiftMapUseHarness.pm)：**確實擷取並執行**固定原版 `inc-makeitem.cgi` 的 `GetBuffer/ClearBuffer/GetNumber/GetItemNumber/GetTime/GetString` 子函式，加上固定原版 `plug/use.cgi::UseItem`、`MakeAmount`、`calc.cgi`、`whole.cgi`。**不執行原版整份編譯器頂層或 CGI**（它們會操作實際目錄及世界檔案）；原版 `RequireFile` 仍只記錄，無任何寫檔。
- [**六種場景／八次受控原版 Perl 執行**](tests/original-perl/original-gift-map-use-probe.pl)、[**53項 Perl 斷言**](tests/original-perl/original-gift-map-use.t) 和 [**27項 Node 對照測試**](tests/reviewed-gift-map-use.test.mjs) 將79商品上限、真實來源 USE 記錄、兩筆連續交換／第三筆材料不足、時間、金錢與人工批發逐欄核對。代表性結果：真新店禮物卷 `5→3→1`，三種地圖各 `0→1→2`，時間戳 `956800→958600→960400`，資金仍100000。
- **原版訊息異常 [CORE-21](docs/original-behavior-issues.md)：** `use/get` 無個別 `message` 時，原版 `UseItem` 仍 push `undef` 進 `usemsg/addmsg`，例如 `usemsg=[undef]`、`addmsg=[undef,undef,undef]`；Node JSON 需保留對應 `null` 空槽，不能刪除陣列或自創文字。
- [**完整固定來源、技術界線與下一步**](docs/reviewed-real-gift-use.md)；`npm run demo:real-gift-use` 顯示受控市場已明示注入後，兩次真實禮物卷交換和過期／缺材料拒絕，並納入 GitHub Actions。

```sh
cd modern
npm test
npm run demo:real-gift-use
cd tests/original-perl
prove -v original-gift-map-use.t
```

**不宣稱完成**：其餘115筆 USE、完整 `GetUseItem/CheckUseItem` 與商品選單、原版其他 callback、事件、市場初始化與銷售、週期結算、真實存讀檔、Web UI、主帳號及多人世界。正式任務02／04／05均維持「進行中」，12任務總數仍**1已完成／3進行中／8待辦**；各自原定的正式驗收仍未完成。原版 DSL、18份固定 Core SHA、`main`、`migration/standard-street-s1` 均未修改，PR #1 繼續 Draft 不合併。

## 第三十四階段：真正原版世界初始化的**空白批發列**與稀疏陣列記錄

B-33 真實標準街 `ITEM #79 禮物卷`「交換地圖集」已能在明示人工79格全0批發資料上運行。本階段深入核對固定原版 Core 的 `inc-admin-func.cgi::init`：**第一次**建立世界檔案時，`print DATA time()."...\n\n\n//\n"` 的**第三行批發庫存是空字串**，而不是明示的79格0。固定 `DataRead` 用 `split(/,/,$DATA[$idx++],$MAX_ITEM)` 讀取後，Perl 的 `@DTwholestore` 是**長度為0的稀疏陣列**。數值模型可在用到未定義位置時以0參與算術，但來源序列化**不能**將空白位置全部改寫成字面0。

- [**B-34 完整原始來源與受控實測**](docs/reviewed-original-sparse-market-init.md)：新增**原樣第19份 Core 快照** [`core-inc-admin-func.cgi`](tests/original-perl/core-inc-admin-func.cgi)（原版 Git Blob SHA `2164b7e5abfea7a466235a8deba1543c2cc41515`）；[來源 Perl 記憶體初始化器](tests/original-perl/OriginalAdminBootstrapHarness.pm) **真的執行固定原版 `print DATA time()...` 陳述式**，但僅用記憶體 `scalar` 檔案把手，**沒有**啟動整份 admin init、真實 CGI、目錄、世界寫入、備份或鎖。
- [**原版稀疏市場模型**](src/original-admin-world-bootstrap.mjs)：只有明示提供原版 `admin-init`／`DataRead`／`DataWrite` 三份完整來源文字並核對相應原文後，才會開放單一 `initialize-source-market` 命令；**只適用**空商店、`market=null`、`revision=0` 的純記憶體世界。市場記錄分別存放**原始 `originalWholesaleCsv=''`、原版實際賦值索引 `sparseWrittenSlots=[]`** 和79格純數值 `wholesale` 視圖。
- [**真實標準街模組**](src/standard-street-module.mjs)：完成 `initialize-source-market（revision 0→1）→ open-shop（1→2）→ gift-exchange-maps（2→3→4）`。真實禮物卷原有5張，兩次操作後5→3→1；三種來源地圖各0→1→2。第一次真來源市場 `CheckWholeStore` 寫入**只有索引78** 的批發0，因此原版 `DataWrite join` 是**78個逗號＋0**，不是79個 `0`；地圖已達倉庫上限時另寫入索引8、11、13，Node 結果保持來源稀疏 CSV 形狀。
- [**27項 Node 測試**](tests/original-admin-sparse-market.test.mjs) 與 [**44項原版 Perl 直接斷言**](tests/original-perl/original-admin-sparse-market.t)；[原版 Perl 連續探針](tests/original-perl/original-admin-sparse-market-probe.pl) 直接核對來源 `print DATA`、`UseItem`、`CheckWholeStore`、`join` 的真正原文行為。所有來源異常紀錄獨立存於 [CORE-22](docs/original-behavior-issues.md)。
- `npm run demo:original-market-init` 展示來源新世界初始化、真商品連續使用、原始 CSV 的寫入位置及第三次材料不足拒絕；已納入 GitHub Actions。B-33 原有人工 `explicit-b33-test-fixture` 模式仍不變，**未**偷改舊測試的含意。

```sh
cd modern
npm test
npm run demo:original-market-init
cd tests/original-perl
prove -v original-admin-sparse-market.t
```

**這不是正式可玩或真正存讀檔。** 原始 `init` 的檔案操作、真正 `DataRead/DataWrite` 世界提交、批發 `inc-turn.cgi` 週期補貨、其他115筆 USE、UI／玩家授權／多人同步**均未完成**。截至此階段 CI 基準**771 Node／1013 原版 Perl，27個 Perl `*.t`；19份固定 Core Blob SHA**。正式 Notion 12項仍**1已完成／3進行中／8待辦**，任務02／04／05均未完全驗收。

**建議分窗：** 已建立 [`new-window handoff：``next-window-handoff.md`](docs/next-window-handoff.md)，包含固定 SHA、Repo／Draft PR、現況、下一步 B-35 與新聊天起手提示。**在同一 ChatGPT 專案開新聊天即可繼續**；舊窗可作歷史備查，不要兩個窗同時推送到同一工作分支。
