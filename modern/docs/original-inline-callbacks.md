# 第二十七階段｜商品13工作與商品63展示架本地回呼：原版隔離對照

本階段固定來源：本倉庫**未修改**的 `custom/inc-item-data.cgi` Git Blob `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`，以及 Core `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365` 的 `inc-makeitem.cgi`、`inc-func.cgi` 原始片段。**只**建立合成記憶體狀態；不啟動原版整體編譯器、任意商品函式、CGI、真實日誌或存檔。

## 固定來源對照

| 商品 | 來源位置 | 來源回呼名稱 | 真正函式本文／沿用 |
| --- | --- | --- | --- |
| **13｜資金賺取方法**（`book-work`） | [原版標準街 1860–1900 行](https://github.com/Prysline/akimono/blob/7301b0c2b1e27226d1770e153fa3c68cfeae6d48/custom/inc-item-data.cgi#L1860-L1900) | 第一個 `@@USE func _local_`，第二個 `func _local_1` | **1 份實作，2 項使用動作沿用** |
| **63｜展示架擴建拆卸工具**（`edit-showcase`） | [原版標準街 1902–2013 行](https://github.com/Prysline/akimono/blob/7301b0c2b1e27226d1770e153fa3c68cfeae6d48/custom/inc-item-data.cgi#L1902-L2013) | 第一個 `@@USE func _local_`，後續七個 `func _local_1` | **1 份實作，8 項使用動作沿用** |

兩個商品的編譯後名稱都是 `_local_1`，但屬於**不同商品來源**。隔離測試按商品選擇要載入的**單一**原始函式本文，不把兩組當成同時存在的兩個獨立函式。此選擇只服務受控測試，**沒有證明正式 `RequireFile` 或編譯後命名碰撞的實際載入相容性**。

`tests/original-perl/OriginalInlineCallbackHarness.pm` 從上述原始 DSL 精確擷取 `func _local_` 到原始結束 `_local_` 的**未改動程式本文**，檢查前置 `inc-makeitem.cgi::GetLocalFunction` 和 `sub $use->{func} {eval(<<'_eval_code_'); ... }` 的原始包裝契約，再**只在記憶體中模擬該固定包裝**，執行這兩組明確審查的 Perl 本文。它不執行原版 `inc-makeitem.cgi` 的頂層管理員驗證、維護鎖、編譯後檔案輸出或任意 DSL。

`item::WriteLog` 只有**記錄原始參數**的測試替身，不向任何真實日誌檔案寫入；工作金額顯示則取自固定 Core `inc-func.cgi::GetMoneyString` 的**原始 Perl 函式本文**、以合成 `@term=('¥','')` 執行，並不把這個貨幣設定宣稱為所有玩家的真實值。

## 工作回呼：原版數值與日誌順序

兩個動作只有 `USE.param1` 原始宣告不同（3000、10000），都會執行同一份 `_local_1`。原式**先** `DT.money += USE.param1 * count`，**再**以 `GetMoneyString(USE.param1*count) + '稼ぎました'` 組成文字，依序發起：

1. `WriteLog(0, DT.id, 'バイトし、' + ret)`
2. `WriteLog(3, 0, DT.shopname + 'がバイトしたようです')`

然後返回 `ret`。正常合成例：原金錢700、`param1=3000`、`count=2`，變成6700，返回 `¥6,000稼ぎました`；第二動作 `param1=10000,count=1`，金錢900→10900、返回 `¥10,000稼ぎました`。

為確認**函式原文的實際數學運算**，隔離測試也以 count=0、count=-1 和 param1<0 跑受控人工資料；這些仍依來源算式計算0或負數，**不代表正式 `UseItem` 會接受這些次數，也不代表原版職業／材料前置條件已放行**。函式本文沒有直接操作庫存、時間或熟練度，但完整交易前段可能另行變更這些值。

## 展示架回呼：保留原始陣列處理

`param1` 在原 DSL 的8個動作分別是1–8；這是**本階段合成資料限制**，不代表 Core 外部通用校驗規則。函式按下列順序：

1. 讀 `oldcnt=DT.showcasecount`、`newcnt=USE.param1`，**先寫入** `DT.showcasecount=newcnt`。
2. 若 `oldcnt<newcnt`，對範圍 `oldcnt..newcnt-1` 每一格的 `DT.showcase` 與 `DT.price` 寫入0。
3. 若 `oldcnt>newcnt`，對兩個陣列各執行一次 `splice(array,newcnt)`。若相等則**完全沒有陣列修改步驟**。
4. 產生「展示架已經改成N個了」文字，依序要求商店私有與公開日誌兩筆，最後回傳文字。

合成正常擴張：舊數量2、展示商品 `[10,20]`、價格 `[100,200]`，改為4後變成展示 `[10,20,0,0]`、價格 `[100,200,0,0]`。舊數量6改為2則兩個陣列截成前2格。

**來源異常（另記 [CORE-16](original-behavior-issues.md)）：** 如果合成資料原本欄位長度與宣告數量不一致，原版**不會自動正規化**。舊數量1、陣列 `[2,4,6,8,10]` 改為3，原版結果保留尾端為 `[2,0,0,8,10]`；舊數量2、陣列僅有 `[7]` 改為4，則為 `[7,undef,0,0]`（在 JSON 中以 null 表示 undef）。舊新相等時，即使陣列長度不符也不變更。不修正原版、不宣稱這些不一致測資一定存在於正常商店存檔。

本地展示架回呼**本身**沒有直接扣商品、扣價格成本、調整時間或熟練度；完整 `UseItem` 的先前運算及原版陳列限制不在此次局部測試之內。

## 測試與輸出

| 檔案 | 內容 |
| --- | --- |
| `src/original-inline-work-showcase-model.mjs` | 兩個來源原式對應的純 Node 數值模型，記錄日誌意圖但不執行 |
| `tests/original-perl/OriginalInlineCallbackHarness.pm` | 僅載入已審閱的兩份原版本地 Perl 本文，原樣 Core `GetMoneyString`、`WriteLog` 記錄器 |
| `tests/original-perl/original-inline-work-showcase.t` | **52 項** Perl 隔離斷言，包含原式、格式、陣列、異常資料和日誌 |
| `tests/original-perl/original-inline-work-showcase-probe.pl` | **13 組**直接原版 Perl JSON 實測案例 |
| `tests/original-inline-work-showcase-model.test.mjs` | **31 項** Node 測試，含直接執行 Perl probe 的跨語言案例 |
| `scripts/demo-original-inline-work-showcase.mjs` | `npm run demo:inline-callbacks` 合成示範（已納入 CI） |

```sh
cd modern
npm test
npm run demo:inline-callbacks
cd tests/original-perl
prove -v original-inline-work-showcase.t
```

既有 CI 另會驗證其餘測試、DSL audit、全部合成示範與14份固定 Core Git Blob SHA。

**尚未證明：** 這些函式與完整 `UseItem` 的端到端整合、職業時間修改、正式金錢上限／交易前置、原版編譯器的整體文件生成與動態載入、多商品函式名稱碰撞、真正 `WriteLog` 的格式與檔案操作、世界檔案鎖／備份／原子提交、使用者驗證及 CGI。現有測試僅是**忠實局部隔離結果**。
