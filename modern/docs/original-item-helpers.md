# 第二十九階段｜固定 Core 商品消耗／取得助手與 lostbook 真正原版記憶體連鎖

## 來源與執行邊界

本階段使用固定原版 **`katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`** 的 [`inc-item.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/inc-item.cgi)（Git Blob SHA `bb0244748088be0c5f1d24de7f9f7f05225278cb`），從先前 B-28 已鎖定且**未修改**的 `modern/tests/original-perl/core-inc-item.cgi` **直接擷取五段明確審閱的 Perl 子函式**：`item::UseItem`、`UseItemSub`、`AddItem`、`AddItemSub`；第五段是標準街未修改 `custom/inc-item-data.cgi` 的 `@@FUNCITEM::lostbook`，其定義與 B-26 相同。

**只有這五段 Perl 原始函式本文在受控記憶體中編譯並執行。** `inc-item.cgi` 全檔**沒有**真正 `require`，原始商品資料 DSL 也未編譯；沒有原版 CGI HTTP、角色身份、商店／世界檔案、真實 `WriteLog`、檔案鎖或資料提交。原先14份與 B-28 新增4份固定 Core Git Blob SHA 都不修改。

## 四個函式：保留原版的運算順序與紀錄欄位

| 固定 Core 函式 | 原版實際運算 | 本次測試 |
| --- | --- | --- |
| `UseItemSub(itemno,count,DT)` | 若 `DT.item[itemno-1] < count`，先把 `count` 改成**當前庫存**；再 `DT.item[itemno-1] -= count`；回傳**實際調整後**的 `count` | 正常扣除、庫存不足、庫存零、負請求數、原有負庫存 |
| `UseItem(itemno,count,msg)` | **先呼叫 `UseItemSub`**，接著向 `USE.result.useitem` 追加 `[itemno,實際count]`，向 `USE.result.usemsg` 追加**原訊息**，最後**固定回傳數值0** | 追加而非覆寫原 result 陣列；實際 count 為零／負仍照樣記錄 |
| `AddItemSub(itemno,count,DT)` | 若 `ITEM[itemno].limit < DT.item[itemno-1]+count`，先把 `count` 改為 `limit-currentStock`；再 `DT.item[itemno-1] += count`；回傳實際 `count` | 一般取得、到達上限、已滿、現有庫存超上限、零／負請求數 |
| `AddItem(itemno,count,msg)` | **先呼叫 `AddItemSub`**，再向 `USE.result.additem` 追加 `[itemno,實際count]`、向 `addmsg` 追加**原訊息**，最後**固定回傳數值0** | 已滿也記 `[itemno,0]`、原有超限記負數、保留既有其他 result 欄位 |

上述 `DT.item` 使用 **`itemno-1`** 下標，但上限表使用**`main::ITEM[itemno]`**。此索引差異在測試與模型中刻意保留，不能擅自改成兩者皆零基底或皆一基底。

### 原版資料不一致時的實際行為

- [CORE-18](original-behavior-issues.md)：在人工合成的 **`stock=2,count=-3`** 中，`UseItemSub` **不會**拒絕負請求，直接執行 `2-(-3)=5`，並回傳 `-3`；在 **`stock=-5,count=1`** 時，調整後 count 為 `-5`，最後庫存 `0`。`UseItem` 還會記錄負的實際使用數量。**本測試不代表正式 CGI 前置資格允許負數，沒有自動加 clamp。**
- [CORE-19](original-behavior-issues.md)：在人工合成的 **`stock=15,limit=10,count=1`** 中，`AddItemSub` 將實際取得量改成 `-5`，最後庫存降到 `10`；**即使 count=0**，原式在庫存超限時也得到 `-5`。`AddItem` 同樣把 `[itemno,-5]` 和原始取得訊息追加至 `additem`、`addmsg`。正常已滿時 `count=1` 的調整後量是0，也仍記錄 `[itemno,0]` 與訊息。不把它改成「一律拒絕超限」或「零請求必不變」。

## `lostbook` 串接原版 Core `UseItem`，而非記錄型假呼叫

先前 B-26 只驗證 `lostbook` 決定是否**請求** `UseItem(itemno,1,msg)`，將呼叫交由記錄型替身。本階段改為**真的使用原版 `item::UseItem` + `UseItemSub` 本文**，在同一個合成記憶體 `$item::DT`／`$item::USE`／`@item::ITEM` 上完成扣庫存和結果陣列更新。

固定標準街 `lostbook` 先取 `USE.itemno`，再比較原版 `rand(1000)<USE.param1`；觸發後請求 **count 固定為1** 的原版 `item::UseItem`，最後不論是否觸發都回傳空字串。

| 人工測試情境 | 原版記憶體結果 |
| --- | --- |
| `param1=1000`、初始庫存5 | 一定觸發扣除，庫存變4；`useitem=[[itemno,1]]`；`usemsg` 新增「商品名稱＋已經破爛到看不懂，就扔掉了。」 |
| `param1=0`、庫存5 | 不觸發，庫存仍5；原本沒有 `useitem/usemsg` 就不新建它們 |
| `param1=1000`、庫存0 | 會觸發**原版 helper**，扣除後庫存仍0，卻照樣新增 `useitem=[[itemno,0]]` 與訊息 |
| `param1=1000`、人工原有庫存 -3 | 會觸發 helper，庫存變0，`useitem=[[itemno,-3]]`；非正式世界必有情形 |
| `param1=500` 並給固定 Perl `srand` | 用**實際由原版 Perl `rand(1000)` 觀察到的數值**決定分支並與 Node 對照，不宣稱 JS／Perl 隨機種子位元等價 |

原版 Core helper 不會在這個函式本文中直接扣時間、扣金錢、調整熟練度或寫日誌。`lostbook` 的 `USE.result.count` 仍保留外層交易先前計算的數字，**不會把它改成1或本次實際消耗數量**；本次 `UseItem` 只是使用後 callback 邊界的局部效果。真正外層 `plug/use.cgi::UseItem` 的前置資格／素材扣除／市場檢查／後置經驗增加仍不在本次連鎖執行範圍內。

## 產出、可重現測試與限制

| 檔案 | 內容 |
| --- | --- |
| [`src/original-item-helper-model.mjs`](../src/original-item-helper-model.mjs) | 精確公式的純 Node `projectOriginalItemHelper` 與 `projectOriginalLostbookWithCoreItemHelper`，只處理明確合成且可表示的安全整數；完整回傳調整量與 result 陣列 |
| [`tests/original-perl/OriginalItemHelperHarness.pm`](../tests/original-perl/OriginalItemHelperHarness.pm) | 直接擷取**未修改**的4段原版 Core 函式＋標準街 `lostbook`；只建合成記憶體店家與商品表 |
| [`tests/original-perl/original-item-helpers.t`](../tests/original-perl/original-item-helpers.t) | **82項**由原版 Perl 本文直接執行的隔離斷言 |
| [`tests/original-perl/original-item-helper-probe.pl`](../tests/original-perl/original-item-helper-probe.pl) | **27組**從原版 Perl 直接輸出的 JSON 對照，含完整 result 陣列、庫存及隨機抽樣 |
| [`tests/original-item-helper-model.test.mjs`](../tests/original-item-helper-model.test.mjs) | **34項** Node 測試，含上列27組真正 Perl 的逐案核對 |
| [`scripts/demo-original-item-helper.mjs`](../scripts/demo-original-item-helper.mjs) | `npm run demo:item-helpers` 人工庫存與回呼範例，已納入 CI |

```sh
cd modern
npm test
npm run demo:item-helpers
cd tests/original-perl
prove -v original-item-helpers.t
```

**本階段仍未做**：正式 `RequireFile('inc-item.cgi')`、真實生成的各商品 `use/<code>.cgi`、完整 `UseItem` 交易串接、真正的商品清單上限或正式資格預檢、其他未知回呼、真實 `PushLog`／`WriteLog`、玩家認證、世界檔案修改、鎖／原子提交、實際 CGI HTTP。為防止合成資料溢位，Node 的 `safe integer` 與商品編號範圍是**模型輸入表示限制**，不是原版新增規則。原版使用結果、數值與邊界現象未擅自修正。
