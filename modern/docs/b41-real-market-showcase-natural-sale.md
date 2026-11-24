# B-41｜真買入商品 #10 → 原版合法上架 → 來源自然販售 → 同一世界帳務

> 狀態：實作／測試已提交於 `test/task02-baseline-on-s1`；**是否完成驗收僅以最後 HEAD 的 Push／PR 同 SHA CI 為準**。本檔不把受控原版片段誤稱為完整遊戲週期、全年營業或完整可存讀的單機遊戲。Draft PR #1 保持未合併。

## 真正可操作的流程

在 repository 根目錄先確認工作分支，Windows 使用者保留既有 CRLF 安全正規化：

```bash
git switch test/task02-baseline-on-s1
git pull --ff-only origin test/task02-baseline-on-s1
cd modern
npm run dev:local
```

瀏覽器開 `http://127.0.0.1:4173`（本機 `127.0.0.1` 綁定，沒有登入與公開服務）：

1. 自店 > 店內初始化來源世界、建立新店。來源初始現金100,000 G，真 #10 庫存0，展示架空；市場初始是原版空批發第三行。
2. 交易 > 市場先嘗試買 #10；初始缺貨會獲真實拒絕，版本／資金／庫存不變。展開「開發測試：原版市場供貨子步驟」，選60秒供貨；這是原版59項 PLUS 的局部子步驟，**此按鈕沒有推進世界時鐘**。
3. 市場以原版標準價5,000 G 買入1件 #10。初始現金100,000→95,000，當日進貨支出0→5,000，倉庫 #10 數量0→1，真批發 #10 減1，原版買入行動時間耗600秒；不改寫任何人工庫存。
4. 自店 > 倉庫檢查商品 #10 數量1。在頁尾「展示架設定」選 #10、售價5,000 G，提交真 `edit-showcase`，第1架變為 #10／5000 G，原版上架動作另耗600秒。若不先買入即上架，應由原版來源審查拒絕。
5. 自店 > 店內：確認架位、資金、今天售額；選「30分鐘」或「1小時」，亦可用自填1～60分鐘，按來源自然販售與原版 PLUS 計算。買家出現和成交量受原版供需／人氣／隨機抽樣限制，**不保證每次都售出**；成交時 `item[9]` 減少、現金／`saletoday` 增加、`itemtoday[10]` 與人氣更新、`nowSeconds` 前進，批發與來源 CSV 在同一 WorldState revision 提交。
6. 查看「操作訊息 → 檢視原版收據及操作前後數值」和「原版來源與世界測試資訊」。重複提交舊 `expectedRevision` 應拒絕，沒有第二筆提交。關閉 Node 程式會遺失遊戲世界；不能稱為已完成存檔。

## 原版 Perl／Node 對照證據

| 階段 | 原版依據 | Node／世界行為 |
| --- | --- | --- |
| 初始化市場與供貨 | 原 `inc-admin-func.cgi`／`inc-turn.cgi` 59個 PLUS ＋ `whole.cgi::CheckWholeStore` | `initialize-source-market`／`reviewed-sparse-all-plus`，保留來源 sparse CSV 與 defined slots |
| 市場購買真貨 | `buy-s.cgi`、`GetWholeStore`、`GetTimeDeal`、`UseTime`、`SetWholeStore` | B-40 `buy-market-item-10`：扣款5000、增庫存1、批發扣1、購買時間600秒 |
| 展示架合法上架 | 原 `sc-s.cgi`：檢查庫存、架位、定價／`TIME_EDIT_SHOWCASE`、`UseTime` | 既有 `edit-showcase`：只限第1架、#10／5000 G 或清空，成功另耗600秒 |
| 原版自然販售 | `inc-turn.cgi`「店舗・商品別来客数計算処理」至「@@item 処理準備」之前，`GetMarketStatus`、`GetSaleTax`、`GetUserTaxRate` | B-41 `advance-source-time`：更新 #10、金錢、人氣、今日售額、`costtoday` 小數與世界時鐘 |
| 接續供貨 | 同 `inc-turn.cgi` 原版59項 PLUS、`whole.cgi::CheckWholeStore` | 使用同一份亂數序列，原版79格批發數值／CSV／definedness 來源比對 |

- [原版 Perl 單世界真買入→真上架→自然販售探針](../tests/original-perl/original-b41-real-sale-probe.pl) 真正調用原樣 `buy-s.cgi`、`sc-s.cgi`，再由既有測試器編譯／執行凍結的 `inc-turn.cgi` 自然販售片段與 PLUS。只 mock CGI 輸出、身份／磁碟 I/O；不宣稱實際伺服器 CGI 驗收。
- [Perl 原版斷言](../tests/original-perl/original-b41-real-sale.t) 和 [Node／HTTP E2E](../tests/b41-real-playable-sale.test.mjs) 核對 30 分／60 分兩個來源抽樣測資的資金、庫存、售額、人氣、持有費、零售紀錄、79格批發、CSV、亂數消耗序列。HTTP E2E 從沒有世界開始經空白市場拒絕、真供貨、真買貨、真上架、真快轉，沒有手動 `item[9]=1`。
- 不聲稱 Node 與 Perl 使用相同原生 PRNG。跨語言對照明示提供相同整數百萬分位抽樣；一般本機服務使用 `crypto.randomInt`，E2E 才用明確標記的固定抽樣環境變數，HTTP 並未提供可讓一般玩家注入亂數或商品的入口。
- Windows CRLF 依 B-40 `local-source-text.mjs` 僅對讀到的固定原文做 CRLF→LF，無更改原版 CGI／DSL；原版20個固定 Core SHA 仍由 CI 驗證。

## 快轉來源與限制（不可把測試當完整遊戲）

- 原始自然銷售程式使用 `$timespan`（秒數）驅動，並非原版只有固定30分或1小時。B-41 UI 快捷1／10／30／60分、可手填1～60分鐘是為測試方便，UI 可連續操作，但第二次真實成交所需的來源狀態變化仍須逐條核對。
- **單次最多60分鐘**，不得跨越原版36小時期末界線；目前會拒絕，不會繞過原版 `inc-period.cgi`。B-41 的 `nowSeconds` 是本機受控世界遊戲時間，不是對使用者宣稱有自動時間同步。原版 `costtoday` 用小數連續累加；GameCore 只針對這個來源欄位允許有限小數，其它資料仍按原本安全整數核驗。
- 此次只正面審閱單店、真購 #10 原價5000 G 第一架：沒有額外販售 callback 的商品 #10 受控例子；不執行 `FUNCSALE／FUNCTURN` 通用機制、`SortDT`、完整跨期結算、存讀檔、認證、跨店市場、事件與第二街。來源審核拒絕的路徑不隱式補規則，也不容許把 B38 的人工庫存模型當真貨。
- B-40 單獨 PLUS 供貨只算獨立來源子步驟（不前進時鐘），B-41 的「快轉」才作來源自然販售和後續 PLUS 的受控銜接。這不是完整 `inc-turn.cgi`，不代表第一個正式最小可玩閉環已全部驗收。

## 接續 B-42

先實作可連續營業兩輪的來源狀態條件及必要回呼，再實際銜接 `SortDT`、原版完整時間／期末決算與後續單機世界存讀，確保重啟後再經營；持續保留相同繁中 UI、來源原文比較、拒絕路徑、原版 SHA audit、Push／PR 同一最終 commit CI。正式 Notion 任務02／04／05仍為「進行中」，Draft PR不合併，不修改 main/migration/原版 Core／DSL。
