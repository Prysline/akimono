# 任務 02｜原版 Core 隔離計算測試（31 項）

此目錄在既有 `migration/standard-street-s1` 的基礎上新增測試；不取代 `modern/src/parse-dsl.mjs` 的標準街靜態 DSL 來源稽核，也沒有改寫原版 CGI 遊戲。

## 固定來源

- 儲存庫：katelynn620/akimono-core
- 原始 commit：738d71a2985fd088f2ca90f25145706392ee2365
- `calc.cgi` 對應原版 `plug/calc.cgi`，Git Blob SHA：586354a9a300e26d0e12a4efa512fa25760e3197
- `item.cgi` 對應原版 `plug/item.cgi`，Git Blob SHA：b39400d7dc0ab80062c392ae2bbc923e24ecacf8

兩個 CGI 快照是唯讀測試依據，未修改函式；本目錄的 `baseline.t` 是額外撰寫的 Test::More 案例。

## 執行

環境：Perl + Test::More（Perl 標準測試模組）。

~~~sh
cd modern/tests/original-perl
prove -v baseline.t
~~~

預期 `Tests=31`。此測試使用固定的 `NOW_TIME`、金額與商品價格及最小 `l()`、`OutError()` 測試替身，涵蓋時間、熟練度折減、交易時間、稅、金額界限與商品數量邊界。

另在 `modern/` 執行：

~~~sh
npm test
npm run audit
~~~

上述 Node 命令沿用舊分支原有的靜態 DSL 原始碼驗證，不代表已移植 Game Core。GitHub Actions 工作流程同時驗證兩組測試，但新增 CI 的實際結果應以 Actions run 為準。

## 注意

- 31 項是**原版函式局部測試**，不是原版完整 CGI 端對端／瀏覽器遊戲驗收。
- 尚未測試標準街／麵店完整商品 DSL 編譯、開店、進貨、陳列、市場隨機銷售、髒碗、決算、事件或存讀檔。
- 舊分支 README 曾提及外部 S1 v0.2.0 ZIP（TypeScript 語意模型）；該套件不在目前的 GitHub 分支中，**沒有聲稱已整合**。
- Core 的 `feat/req` 屬另一個儲存庫的舊分支，與本次純函式測試無關；未被合併或重寫。
- Notion [任務 01](https://app.notion.com/p/41db4185273f8175a24fcd08f48b4851)、[任務 02](https://app.notion.com/p/41db4185273f818f97d4fce172db36f8) 紀錄完整盤點及待測項目。
