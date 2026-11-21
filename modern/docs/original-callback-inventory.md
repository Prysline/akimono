# 第二十六階段｜原版標準街商品回呼盤點與受控測試

依據固定 Core `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365` 及本倉庫**未修改**的 `custom/inc-item-data.cgi`／`custom/inc-rebel-data.cgi`。前者 Git Blob 為 `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`，後者為 `923634e58a05beca9ab004515fc7669d53a1ba3a`。靜態模型核對固定 `inc-makeitem.cgi` 的函式命名契約，**沒有執行原版編譯器、任意 DSL、真正商品回呼、真實日誌或世界存檔**。

## 固定來源盤點

| 類別 | 數量 | 隔離驗證範圍 |
| --- | ---: | --- |
| `@@ITEM`、`@@USE`、`@@EVENT`、`@@FUNC*` | 79、116、25、7 | 既有 DSL 稽核 |
| `@@USE func` 使用後回呼宣告 | **56** | 全部依來源檔／行號建立靜態索引 |
| 沒有 `func` 的 `@@USE` | 60 | 不捏造回呼 |
| 共用 `func lostbook` | **22** | **實際擷取原版函式本文**，`UseItem` 用記錄型替身 |
| 共用 `func popup` | **1** | **實際擷取原版函式本文**，`WriteLog` 用記錄型替身 |
| 當場帶 Perl 本文的 `func _local_` | **11** | 靜態檢查；未執行 |
| 指向同商品既有函式的 `func _local_1` | **22** | 靜態別名檢查；未執行 |
| `@@USE funcb _local_` 前置回呼 | **1** | 靜態檢查；非使用後函式 |
| `@@ITEM funct _local_` 商品層級回呼 | **1** | 靜態檢查；非 `UseItem` 回呼 |
| `@@USE job` 職業修飾宣告 | **42** | 原版編譯器會另生成職業函式，並非上方56個使用後回呼 |

`src/original-standard-callback-inventory.mjs` 以既有 `parseDsl` 為入口，逐筆輸出所屬商品 ID／代碼／名稱、宣告種類、來源行號、來源函式名稱、原版編譯器解析後的符號、**真正定義的起訖行號**，以及「庫存、金錢、時間、熟練度、人氣、陳列架、商會、事件、亂數、日誌」的**靜態字詞引用**。這些標籤**不是**對所有可達副作用的完整保證，也不能取代原版執行。

### 按商品分類的56個使用後函式宣告

| 商品 ID | 類別 | 宣告數 | 原版本文可觀察的風險或依賴 |
| --- | --- | ---: | --- |
| 15、66、20、21、22、23、12、9、14 | 共用 `lostbook` | 22 | 隨機值，向外呼叫 `UseItem`，可能間接影響庫存，未執行外部函式 |
| 77 | 共用 `popup` | 1 | 直接修改人氣，請求寫入兩筆日誌 |
| 62 | 廣告本地函式 | 3 | 人氣、其他商店、商會、亂數／日誌；未執行 |
| 13 | 工作本地函式 | 2 | 1份定義＋1份別名；金錢與日誌；未執行 |
| 63 | 展示架本地函式 | 8 | 1份定義＋7份別名；陳列架、價格陣列與日誌；未執行 |
| 65 | 禁斷之書本地函式 | 3 | 其他店家、亂數與狀態；未執行 |
| 25 | 米諾陶洛斯本地函式 | 2 | 1份定義＋1份別名；未執行 |
| 26 | 米諾牛乳本地函式 | 1 | 飲用與店家狀態；未執行 |
| 78 | 轉職指南本地函式 | 14 | 1份定義＋13份別名；熟練度、職業；未執行 |
| **合計** | | **56** | |

`inc-makeitem.cgi` 的 `GetLocalFunction($name,$g_use->{no}+1)` 會將同一商品第一次 `func _local_` 轉為例如 `_local_1` 的函式，後續 `func _local_1` 則是**沿用同一個名稱**，不再附新本文；前置 `funcb _local_` 使用獨立的 `b` 前綴。模型也核對這些產生規則的原版文字，**沒有執行具有檔案寫入及 eval 的整份編譯器**。

## 受控執行兩個原版共用函式

`tests/original-perl/original-shared-callbacks.t` 從 `@@FUNCITEM` 取得**未改動的** `sub lostbook`、`sub popup` 原樣函式本文，只在隔離 Perl 裡編譯這兩個函式；`package item` 中的 `UseItem`、`WriteLog` 是測試專用的**呼叫參數記錄器**，不會呼叫遊戲或寫真實紀錄。`tests/original-perl/original-shared-callback-probe.pl` 直接執行原版函式建立**12組合成 JSON 案例**，`tests/original-shared-use-callback-model.test.mjs` 會和純 Node 模型逐項對照。

### `lostbook`：外部商品呼叫只記錄、不執行

原版先用 `rand(1000)<USE.param1` 決定是否呼叫 `UseItem(USE.itemno,1,ITEM[itemno].name + 原版訊息)`，不論是否呼叫都回傳空字串。測試確定 0、1000、負閾值與固定 Perl `srand` 抽樣的分支及原始參數。**被呼叫的 UseItem 真正會修改哪些遊戲欄位，不在本階段已證明的範圍內**：僅記錄請求，不假定庫存確實減少1件，不宣稱有扣時間／金錢／熟練度。Node 僅使用 Perl 所觀測到的亂數值，未宣稱 JS/Perl RNG 種子等價。

### `popup`：原版人氣運算與日誌參數

原版先執行 `int(USE.param1*(2-DT.rank/5000))`，將結果加至人氣，僅對**大於10000**的值設上限。回傳訊息仍依原本的 `up` 產生 `int(up/100)%`，而非依實際截斷後的人氣差異。依序將兩個 `WriteLog` 的參數送到測試記錄器。

**直接由未修改 Perl 函式本文驗證：** `rank=5000,param1=1000` → `up=1000`、新人氣6000；`rank=9999,param1=300000` → 浮點截斷 `up=59`（**不是60**）、最終人氣10000、文字仍是0%；`rank=12000,param1=1000` → `up=-399`（**不是-400**）、最終人氣10000，文字卻是「人氣提升了-3%」。這些原版現象記錄在 [CORE-15](original-behavior-issues.md)，**不改算式、不補自訂下限、不修改顯示內容**。

這個 `popup` 函式本文沒有直接更動庫存、金錢、時間或熟練度，但它**不能代表整筆交易前後流程**；交易前已扣成本、商品回呼以外的副作用和真實日誌仍未在此執行。

## 可重現驗證

```sh
cd modern
npm test
npm run demo:callbacks
cd tests/original-perl
prove -v original-shared-callbacks.t
```

完整 GitHub Actions 仍執行全部 Perl `prove -v *.t`、Node 測試、14份固定 Core Git Blob SHA、DSL 稽核與合成示範。

**明確未完成：** 其餘33個使用後本地函式、1個實際前置函式、1個商品層級 `funct`、所有事件／其他全域回呼、原版 DSL 完整編譯、真正 `UseItem`／`WriteLog` 外部副作用、真實 CGI 與世界資料寫入。這些不能因本階段的靜態掃描或兩個隔離函式通過測試就宣稱完整相容。
