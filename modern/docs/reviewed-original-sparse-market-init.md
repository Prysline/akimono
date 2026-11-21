# 第三十四階段｜原版空白批發市場初始化與稀疏序列化

## 固定來源與本階段的關鍵更正

固定 Core：`katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`。新增**未經修改**的第19份 Core 來源快照 [`core-inc-admin-func.cgi`](../tests/original-perl/core-inc-admin-func.cgi)，Git Blob SHA `2164b7e5abfea7a466235a8deba1543c2cc41515`；此快照的 `sub init`（管理員初次初始化）有**非覆寫現有世界檔案**的條件：

```perl
if(!-e "$DATA_DIR/$DATA_FILE$FILE_EXT")
{
    if(open(DATA,">:encoding(UTF-8)","$DATA_DIR/$DATA_FILE$FILE_EXT"))
    {
        print DATA time()."\n500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0\n\n\n//\n"; #初期状態
        close(DATA);
        # ...
    }
}
```

**原始第三行（批發數量）是空字串 `''`，不是79個明文 `0`。** 上述只是原版部分原文展示；本階段只擷取且實際執行單一 `print DATA time()...` 子句，**沒有啟動會建目錄、建立鎖檔、刪備份、寫實際世界的 `sub init` 本體或整份管理 CGI**。

固定來源原本已審核：

- `inc-func.cgi::DataRead`：`@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM);`。空白來源行進入 Perl `split` 後，`@DTwholestore` **長度為0**。
- `plug/write.cgi::DataWrite`：`print OUT join(",",@DTwholestore)."\n";`。原版 `join` 不會替尚未定義的 Perl 陣列位置自動補上字面 `0`。
- `plug/use.cgi::UseItem`：材料扣除與物品生成後，先 `CheckWholeStore()` 一次，再進入回呼與熟練度階段；本階段僅接 B-33 已審閱的真實 `gift ITEM #79／USE #0`，無自訂回呼。
- `plug/whole.cgi::CheckWholeStore`：只在原式上限／負庫存修正條件成立時**對指定批發陣列位置賦值**。因此不能根據「數值讀取時為0」推論「原版已寫入那一格明文0」。

### 原版執行證據：數值相等，但來源存檔文字不同

[`OriginalAdminBootstrapHarness.pm`](../tests/original-perl/OriginalAdminBootstrapHarness.pm) 由固定 `inc-admin-func.cgi` 擷取**原文 `print DATA time()...` 陳述式**，只寫入 Perl 記憶體純量的檔案把手，不進行任何實際世界檔案 I/O。接著由 B-33 [`OriginalGiftMapUseHarness.pm`](../tests/original-perl/OriginalGiftMapUseHarness.pm) 用**真正長度0**的 `@DTwholestore`、真正原版 `UseItem`、`CheckWholeStore` 執行已編譯審閱的禮物卷交換。

以**真正標準街新店商品**作受控測試：`#63` 展示架工具1個、`#79` 禮物卷5張；以 `nowSeconds=1,000,000` 建立人工記憶體時間視圖。每次交換需2張禮物卷，獲得 `#12/#9/#14` 地圖各1張，編譯後費時1800秒：

| 步驟 | 禮物卷 | 三種地圖各持有 | 原版批發陣列明文賦值位置（0-based） | 原始批發 CSV |
| --- | ---: | ---: | --- | --- |
| 原版管理員初始世界 | 尚未開店 | 尚未開店 | 無，陣列長度0 | 空字串 `''` |
| 來源初始化後開店 | 5 | 0 | 無 | 空字串 `''` |
| 第一次交換 | 3 | 1 | 僅 `78`（商品79批發上限0） | **78個逗號後接 `0`** |
| 第二次交換 | 1 | 2 | 僅 `78` | 同上 |
| 第三次材料不足 | 1 | 2 | 沒有新增賦值 | 原始文字不變 |

**為什麼第79格會實際寫入 `0`？** 禮物卷真實 `limit=10/0`，而新店仍持有3張；原版 `CheckWholeStore` 在批發上限0與店家存量3的情形，會將 `DTwholestore[78]` 寫成0，造成 Perl 稀疏陣列長度延伸到79；前78格若未經其他原版運算賦值，仍是 `undef`，不是0。`join(",",...)` 的結果因此有78個逗號後接一個0，與 `Array(79).fill(0).join(",")` 完全不同。

另有**三張地圖已在店內上限各3份**的受控案例：來源物品產出先將超限數量寫入批發位置 `8,11,13`，再由 `CheckWholeStore` 收斂這些批發位置為0；最終**四個已定義位置 `[8,11,13,78]`**。儘管其79格數字視圖仍全0，原始 `join` 的 CSV **不是**只有第78格為0的那種字串。此結果由固定原版 Perl 真正執行核對，不能因為兩種案例的庫存數值相同而刪除「哪些位置被原版寫過」的資料。

## 本階段的 Node 範圍與明確限制

- [`original-admin-world-bootstrap.mjs`](../src/original-admin-world-bootstrap.mjs) 只在收到三份**原版固定來源全文**，確認 `init` 的空白世界字串、非覆寫判斷、`DataRead` 分割與 `DataWrite` 串接的來源符號均未變動後，才可提供單次純函式初始化。`market.originalWholesaleCsv=''` 與 `market.sparseWrittenSlots=[]` **獨立保存來源文字／定義位置**；`market.wholesale` 的79個0僅是 Perl 未定義欄位的**數值計算視圖**，絕不宣稱它們是來源原始 CSV。
- [`standard-street-module.mjs`](../src/standard-street-module.mjs) 在呼叫者**明確注入原版管理員、讀取、寫入三份固定來源**的選用模式才增加 `initialize-source-market`，且僅允許**空商店、`market/events=null`、`revision=0` 的新記憶體世界**。未提供三份原文時，原有 B-33 命令清單保持不變，不能被普通遊戲命令自動初始化。
- 原有真實商品 `gift-exchange-maps` 新增接受**來源驗證過的 `core-admin-init-sparse-b34` 批發資料**，以 `traceOriginalSparseGiftWholesale` 跟蹤原版溢量與 `CheckWholeStore` 的賦值位置，維持 source CSV 與數值視圖分離；原有明示人工 `explicit-b33-test-fixture` 模式仍然支援、舊測試未改。
- 失敗／過期世界版號／重複初始／輸入來源缺漏或已改動／偽造 CSV 和已定義位置互相不一致，均拒絕、不提交任何世界變更。
- [`original-admin-sparse-market-probe.pl`](../tests/original-perl/original-admin-sparse-market-probe.pl) 和 [`original-admin-sparse-market.t`](../tests/original-perl/original-admin-sparse-market.t) 由**真正原版 Perl 初始化陳述式、真正原版商品 Core 完整 `UseItem`** 提供跨語言觀察；[`original-admin-sparse-market.test.mjs`](../tests/original-admin-sparse-market.test.mjs) 逐欄比對來源 CSV、定義位置、79格數值視圖、庫存、金錢和時間及失敗交易狀態。
- [`demo-original-sparse-market.mjs`](../scripts/demo-original-sparse-market.mjs) 展示 `revision 0→1（僅來源記憶體初始化）→2（真正標準街開店）→3→4（兩筆來源真商品交換）`，第三次因材料不足而拒絕；沒有動任何原始磁碟存檔。

**嚴格不可外推：** 管理員初始化不是正常玩家在任何時刻可以呼叫的商品交易；來源原版新世界的世界檔首行使用**真實執行時的 `time()`**，本測試採明確合成 `nowSeconds`，沒有聲稱時鐘完全等價。這個 Node 模型只保存原始空批發行和單一 gift USE 的批發更新位置，**還沒有**完整原版 `inc-turn.cgi` 補貨／扣貨、事件、真實世界檔案讀／寫／鎖／復原、玩家身分驗證、權威伺服器及介面。

## 建議下一個階段（B-35）

將固定原版 `inc-turn.cgi` 的 `PLUS` 補貨／批發消耗與 `CheckWholeStore` 的更廣泛狀態變化，在**原版真正初始稀疏世界**中獨立核對，先不要連結正式磁碟存檔或完整玩家事件；另一條必要工作是將原版 `GetUseItem/CheckUseItem` 資格與選單規則接入真實 `standard-street`，而不擅自選擇其他含回呼的商品動作。跨街道、多玩家、持久化與 UI 保留後續里程碑。

所有原版 CGI／DSL及19份固定 Core 快照均未修改。正式12任務仍以 Notion 驗收狀態為準，綠燈只代表已覆蓋受控來源案例。
