# 第二十八階段｜原版商品使用檔載入鏈、%INC 快取與同名函式隔離測試

本階段以不可變的 Core 版本 `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365` 和本儲存庫既有 `_config.cgi`、標準街 `custom/inc-item-data.cgi` 為來源。**原先14份 Core 固定測試快照不改動**；另外新增四份從同一 Core commit **逐字複製**的 CGI 純文字測試快照，並以 Git Blob SHA 接入 CI。只讀檔，不執行原版 CGI、正式動態 require、管理員 DSL 編譯器、遊戲存檔或日誌。

## 1. 固定原版的兩層載入，不可混成同一件事

| 來源 | 原版操作 | 來源結論 |
| --- | --- | --- |
| [`_config.cgi::RequireFile`](https://github.com/Prysline/akimono/blob/test/task02-baseline-on-s1/_config.cgi) | 先 `require "$CUSTOM_DIR/<檔名>"`（若存在即返回），否則 `require "$INCLUDE_DIR/<檔名>"` | 共享 CGI 函式可由 custom 同名檔案優先覆蓋；此次受測 checkout 的 `custom/` 下沒有 `inc-item.cgi` |
| 固定 [`Core item.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/item.cgi) | `GetPath($ITEM_DIR,"use",$ITEM[$itemno]->{code})` → `RequireFile('inc-item.cgi')` → `require $itemcode` → `GetUseItemList` | 商品詳細列表選擇單一商品代碼的編譯產出 |
| 固定 [`Core item-m.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/item-m.cgi) | 同一商品路徑與兩步載入 → `GetUseItem($no)` | 商品使用表單在預檢前先載入選定商品 |
| 固定 [`Core item-s.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/item-s.cgi) | 同一商品路徑與兩步載入 → `GetUseItem($no)` → 驗證／真正 `UseItem` → 寫檔 | 本階段**只檢查文字順序，不執行入口腳本或世界寫檔** |
| 固定 [`Core inc-item.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-item.cgi) | `package item`；定義 `item::WriteLog`、`item::UseItem`／`UseItemSub`、`AddItem`／`AddItemSub`；設定時載入 `"$main::ITEM_DIR/funcitem.cgi"` | `inc-item.cgi` 是共用商品函式；**不是**依代碼直接選取 `use/<商品>.cgi` 的地方 |
| 固定 `Core inc-makeitem.cgi` | 輸出 `$ITEM_DIR/use/$item->{code}$FILE_EXT`，其中包含 `package item;`、按 `$USE[$use->{no}]` 索引逐筆指定資料、`sub _local_1 {eval(<<'_eval_code_');...}` | **每個商品的檔案路徑獨立，但載入後同名函式位於共用 `item::` 命名空間** |

**不能將兩個來源動作混淆**：`RequireFile('inc-item.cgi')` 先查 `custom`、再查內建檔案；商品專屬檔是入口腳本**另外**直接 `require $itemcode`，採 Perl 對檔案路徑的快取機制，不會自動依商品名稱產生新的 Perl namespace。

## 2. 四份新增的原版來源快照：檔案純文字，原樣不可修改

| 新快照路徑（相對 `modern/tests/original-perl/`） | 原版 Core 檔案 | 固定 Git Blob SHA |
| --- | --- | --- |
| `core-inc-item.cgi` | `inc-item.cgi` | `bb0244748088be0c5f1d24de7f9f7f05225278cb` |
| `core-item-detail.cgi` | `item.cgi` | `9b4db56d6702d6b3475af0331fdcf1a27ed8d3c8` |
| `core-item-form.cgi` | `item-m.cgi` | `7ec2c01829c20e78feec53a1ed410ad7254b21c7` |
| `core-item-submit.cgi` | `item-s.cgi` | `bf895cb9c4672fe984cc9be352d52a856d3ac4e3` |

GitHub Actions **額外**以 `git hash-object` 核對上述四份，與原先14份核心 SHA 檢查分開列步驟，避免誤報原先14份來源已更動。這四份雖然包含 Perl CGI 程式碼，但測試**只當作文字來源讀取，絕不直接 require 或執行**。

## 3. 在不寫檔的 Perl 測試中，真的執行 require 運算子

`tests/original-perl/OriginalVirtualItemLoader.pm` 建立**只允許** `book-work`（商品13）和 `edit-showcase`（商品63）的**記憶體虛擬模組**：

1. 使用上一階段經原文核對的兩份 `func _local_` 函式本文，以及符合 `inc-makeitem.cgi` 輸出形狀的 `package item`、`sub _local_1 {eval(<<'_eval_code_')}`。`@item::USE` 中的編譯後物件欄位是**清楚標明的合成簡化測試資料**，不是宣稱實際執行過完整編譯器或產出原樣物件。
2. 以人工的 `b28/use/book-work.cgi` 與 `b28/use/edit-showcase.cgi` 作虛擬路徑；將原版文字轉成 UTF-8 位元組後，透過 Perl `@INC` hook **從記憶體 scalar** 返回檔案內容。這樣可真正執行來源入口同形的 `require $itemcode`，但不產生、覆寫或開啟任何真實商品／世界檔案。
3. 測試時 `item::WriteLog` 是**僅記錄參數**的替身；金額輸出沿用固定 Core `GetMoneyString` 原始函式；其餘本地回呼完全禁止載入。每步呼叫當下的 `item::_local_1`，直接觀察誰的原版本文生效，以及合成金額／展示架／日誌回傳。
4. 每個測試場景用獨立的 Perl 程序／受控重設環境；同一場景內可故意要求**同一 Perl 解譯器連續載入多個商品**。這是為了驗證 namespace 與 `%INC` 的純 Perl 行為，**不是聲稱原版正常 CGI 路由一次就會載入兩個商品**。

### 實際隔離觀察

| 單一 Perl 模擬場景 | `item::_local_1` 生效來源 | `%INC`／`@item::USE` 觀察 |
| --- | --- | --- |
| 只載入 `book-work` | 商品13工作 | 金錢100→104、回傳 `¥4稼ぎました`，`@item::USE` 兩筆工作動作 |
| 只載入 `edit-showcase` | 商品63展示架 | 展示數量1→2、展示 `[9,0]`、價格 `[90,0]`，`@item::USE` 八筆展示架動作 |
| `book-work` → `book-work` | 工作維持 | 第二次同路徑 `require` **快取命中**，虛擬來源只真正載入一次 |
| `book-work` → `edit-showcase` → `book-work` | 工作→展示架→**仍是展示架** | 不同路徑後載入時覆寫同一 `item::_local_1`；最後再次 `require` 先前工作路徑時，因 `%INC` 快取**不會恢復工作函式** |
| `edit-showcase` → `book-work` → `edit-showcase` | 展示架→工作→**仍是工作** | 先前展示架檔案雖然已載入，但其後工作檔覆寫相同符號；再次要求快取路徑不重載；合成 `@item::USE` 的前兩筆改為工作，第三至第八筆仍是展示架，因為編譯器模板不主動清空整個陣列 |

**這是源碼忠實的單一程序人工碰撞觀察，而非實際世界交易 bug 已重現。** 固定原版 `item.cgi`、`item-m.cgi`、`item-s.cgi` 各入口直接選取一個商品檔案；正常 CGI 的程序生命週期及其他呼叫鏈是否同時載入多個商品，此階段**沒有**端到端執行證據。因此：不把本測試推導成必然正常遊戲錯誤，也不能在 Node.js 長駐程序中自動把全域函式表當成完全獨立、永不互相影響的程式模型。原版載入語意與遷移風險獨立記錄在 [CORE-17](original-behavior-issues.md)。

## 4. 程式與測試

| 新增產出 | 作用 |
| --- | --- |
| `src/original-item-dynamic-loading-model.mjs` | Node 合成單 Perl 程序模型；只保留源碼可觀察的路徑快取、同名符號、`@USE` 指派索引；回呼數值委託已對照的 B-27 模型 |
| `tests/original-perl/OriginalVirtualItemLoader.pm` | 從兩份真正原版 Perl 本地本文產生**僅在記憶體**的虛擬模組，透過 `@INC` hook 執行真正 Perl `require`；無磁碟輸出 |
| `tests/original-perl/original-virtual-item-require.t` | **50項**原版入口／編譯器契約與實際 Perl require／%INC／符號覆寫／合成 USE 陣列斷言 |
| `tests/original-perl/original-virtual-item-require-probe.pl` | **9組**每次新 Perl 程序的 JSON 觀察場景 |
| `tests/original-item-dynamic-loading-model.test.mjs` | **28項**Node 來源／模型測試，其中直接呼叫9組真實 Perl 觀察以逐步比較 |
| `scripts/demo-original-item-loading.mjs` | `npm run demo:item-loading`，展示隔離與故意混載差異，納入 CI |

```sh
cd modern
npm test
npm run demo:item-loading
cd tests/original-perl
prove -v original-virtual-item-require.t
```

**持續未涵蓋：** 執行原版 `_config.cgi`／`inc-item.cgi` 的真正 RequireFile 全流程、完整 `inc-makeitem.cgi` 管理員編譯器、商品生成檔與真實程序的檔案讀取權限、已儲存物件全部欄位、原版所有商品／事件函式、本地回呼外部真實 `UseItem`／`WriteLog`、正式玩家驗證、商店世界鎖／存檔／備份、整個 CGI HTTP。**沒有因本測試而變更原版數值規則或自行增加相容性修復。**
