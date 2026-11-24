# 第三十階段｜完整原版商品使用主函式 × lostbook × 熟練度尾段的記憶體整合

## 起點與來源

本階段承接 B-23（原版商品使用金額、時間、材料、取得與一次市場修正）、B-24（使用後熟練度）、B-26（標準街共享 `lostbook`）、B-29（固定 Core 真正的商品扣除助手），**第一次讓同一個隔離 Perl 執行環境真正跑過原版完整 `plug/use.cgi::UseItem` 主函式**，包含動態回呼到熟練度尾段。

固定來源：

- [固定 Core `plug/use.cgi`](https://github.com/katelynn620/akimono-core/blob/738d71a2985fd088f2ca90f25145706392ee2365/plug/use.cgi)；本 repo 的未修改快照 `modern/tests/original-perl/use.cgi`，Git Blob SHA `1bf4537cc41e344c144d840d43175c4c232765bb`。
- 同一固定 Core 的 `plug/calc.cgi`（時間）、`plug/whole.cgi`（批發市場）以及 `inc-item.cgi`（商品使用扣除助手）；後者沿用 B-28 未修改快照 `core-inc-item.cgi`，SHA `bb0244748088be0c5f1d24de7f9f7f05225278cb`。
- [原版繁體中文標準街 `custom/inc-item-data.cgi`](https://github.com/Prysline/akimono/blob/7301b0c2b1e27226d1770e153fa3c68cfeae6d48/custom/inc-item-data.cgi)，從 `@@FUNCITEM` **原樣擷取 `sub lostbook`**，不修改來源 DSL。

B-30 的 [`OriginalFullUseLostbookHarness.pm`](../tests/original-perl/OriginalFullUseLostbookHarness.pm) 是**審閱過的受控程式片段執行器**，只擷取並執行五個固定 Core `plug/use.cgi::UseItem`／`MakeAmount`、`calc.cgi::UseTime`／`GetItemUseTime`、`whole.cgi::CheckWholeStore` 的**原始完整函式本文**；再透過 B-29 harness 取得固定 `inc-item.cgi` 的 `item::UseItem`／`UseItemSub` 和原版 `lostbook`。原版 `UseItem` 會呼叫 `RequireFile('inc-item.cgi')`，但本測試**只在這個點使用記錄型、嚴格只允許該檔名的替身**，不可實際動態載入 CGI、生成任何原版商品使用檔、接觸玩家／商店檔案或寫入日誌。試驗中的 `l()` 只是輸出字串的合成替身，不用其結果宣稱完整遊戲本地化正確。

## 首次在同一筆記憶體交易驗證的原版順序

| 序號 | 固定原版 `UseItem` 的節點 | 本次實測 |
| --- | --- | --- |
| 1 | `GetItemUseTime`，依熟練度、`result.expold` 決定本次時間 | 原版 `calc.cgi` 本文 |
| 2 | 職業、人氣、熟練度、事件、金錢、時間、材料門檻決定有效 `count` | 原版完整 `UseItem` |
| 3 | `count=0` 直接返回；否則清空 `useitem/additem`，消費時間與金錢 | 原版完整 `UseItem`／`UseTime` |
| 4 | 逐材料 `MakeAmount` 及扣除、逐產物 `MakeAmount` 及數量上限、追加結果陣列 | 原版完整 `UseItem`／`MakeAmount` |
| 5 | **唯一一次** `CheckWholeStore()` | 原版 `whole.cgi` 本文 |
| 6 | `RequireFile('inc-item.cgi')` → 依 `item::` 名稱定位已審閱回呼 → `item::lostbook()` | 原始 RequireFile **替身只記錄**；`item::lostbook` 真正執行 |
| 7 | `lostbook` 在其 `rand(1000)<param1` 條件成立時 `item::UseItem(itemno,1,msg)` → 原版 `UseItemSub`；將調整後數量／訊息追加到**同一個 `USE.result`** | 原版 `inc-item.cgi` 函式本文 |
| 8 | 最後才處理原始 `USE.exp` 熟練度尾段 | 原版完整 `UseItem` |

基準合成測試 `requestedCount=4`、`money=70`、`time=950`、`NOW_TIME=1000`、熟練度200、每次成本20、來源使用時間20→10、原始材料 A×2／無抽樣 B、重複產出且有商品上限，得到：

- 有效操作次數 **2**，金錢 `70→30`，當日支出 `5→45`，時間 `950→986`。
- 主交易材料與產物、批發庫存修正之後：店鋪庫存 `[10,6,5]`，批發 `[3,0,-3]`。
- 原版 `lostbook` 在使用後回呼被觸發，獨立請求 `item::UseItem(1,1,「A已經破爛到看不懂，就扔掉了。」)`；店鋪庫存因此 **`[10,6,5]→[9,6,5]`**，`useitem` 從 `[[1,4]]` 追加成 **`[[1,4],[1,1]]`**，`usemsg` 也跟著追加。
- **批發修正沒有因此重新執行**，批發仍為 `[3,0,-3]`；來源順序為原版設計的一部分，**不能**在移植時因巢狀扣除而擅自再跑一次 `CheckWholeStore`。此邊界新增至獨立 [CORE-20](original-behavior-issues.md)。
- 回呼時看到熟練度仍是 **200**；原版熟練度尾段最後才增加 `30×2`，變成 **260**；回呼空字串存在 `USE.result.function_return`，外層操作成功次數仍是2。

## 限制、非一般遊戲情況與明確禁止的推論

這是**原版完整 `plug/use.cgi::UseItem` 函式本身的隔離執行**，比 B-29 更進一步，但**不是完整原版 CGI、也不是可以上線的遊戲交易**。

- 原版 `RequireFile` 只記錄、**沒有**執行原版 `_config.cgi`、`inc-item.cgi` 全檔、動態生成商品 `use/<code>.cgi`，也不進行正式玩家授權、`GetUseItem` 預檢或真實日誌／世界資料提交。
- 僅允許**已審閱**的 `lostbook` 回呼或**確定無函式名稱**的合成狀態；並非完整執行 79 個商品、116 種 USE、所有其他本地回呼和事件。
- Node 對照 [`projectOriginalIntegratedUseLostbook`](../src/original-integrated-use-lostbook-model.mjs) 嚴格使用已驗證的 B-23 數值／市場模型、B-29 原版巢狀扣除模型，與**本次測資只有一個熟練度欄位、總熟練度不溢出的限定原版尾段**。原版多技能溢位重新分配曾在 B-24 隔離驗證，但**本次不宣稱已經整合到有回呼的交易**。
- 所有材料與產出機率只使用 **0 或 1000 千分比**，確保 `MakeAmount` 原始函式在 callback 前**不消耗亂數**。`lostbook` 的第一次 `rand(1000)` 由真正 Perl 在13組情境中提供觀察值，交給 Node 模型作條件比較；不聲稱 JS 的 `srand`／亂數與 Perl 位元級一致。
- 為測試來源異常，另刻意提供了重複材料導致庫存 `-4`，再由 `lostbook` 真正原版商品助手計算成實際消耗 `-4`、庫存歸零的合成案例。這不表示正常權限與商品使用的所有路徑都允許此資料，也不據此自動加入修復。
- 金錢、商品、熟練度的 Node 安全整數／場景鍵白名單只是**測試資料的表示範圍**，不是原版新增的商店遊戲規則。
- **沒有真正的檔案系統寫入、交易提交、持久化、UI、HTTP 或多人共用世界**。

## 交付物與驗證

| 產出 | 作用 |
| --- | --- |
| [`tests/original-perl/OriginalFullUseLostbookHarness.pm`](../tests/original-perl/OriginalFullUseLostbookHarness.pm) | 原樣抽出 Core `UseItem` 等固定函式、連到 B-29 原版商品助手／`lostbook`，用記錄型 `RequireFile` 替身隔離 |
| [`tests/original-perl/original-full-use-lostbook.t`](../tests/original-perl/original-full-use-lostbook.t) | **75項**原版 Perl 來源順序與完整記憶體連鎖斷言 |
| [`tests/original-perl/original-full-use-lostbook-probe.pl`](../tests/original-perl/original-full-use-lostbook-probe.pl) | **13組**原版 Perl JSON 實測：觸發／跳過回呼、無回呼、資金／熟練度零操作、熟練度零／上限／`expold`、空庫存、非有效店家、半機率、重複材料 |
| [`src/original-integrated-use-lostbook-model.mjs`](../src/original-integrated-use-lostbook-model.mjs) | 嚴格範圍 Node 來源處理順序與 B-23、B-29 原版模型連接 |
| [`tests/original-integrated-use-lostbook-model.test.mjs`](../tests/original-integrated-use-lostbook-model.test.mjs) | **25項** Node 來源／順序／數值驗證，包括13組真 Perl 結果完整逐欄核對 |
| [`scripts/demo-original-integrated-use-lostbook.mjs`](../scripts/demo-original-integrated-use-lostbook.mjs) | `npm run demo:integrated-use`，包含正常、未觸發、空庫存、重複材料、零次數合成情境，已接 CI |

```sh
cd modern
npm test
npm run demo:integrated-use
cd tests/original-perl
prove -v original-full-use-lostbook.t
```

**後續規劃：** 不要因本段回呼串接過關，就宣稱全原版規則／遊戲已可玩。建議在保持來源回歸測試的前提下，將 `Game Core／Street Module／World State` 契約先行分離，建立最小可用的建店、進貨、使用、陳列、週期推進與**合成／安全儲存**介面，再完成真正的單機 Web UI。這部分對應 Notion 正式任務04～07，不能把本階段的測試增加誤算成這些任務已完成。
