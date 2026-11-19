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

未完成：商品數值／配方語意全面核對、事件及回呼移植、資料儲存、GameCore、前端、多人同步。原版 Perl 實機測試依先前決議省略，尚未具備原版執行結果的相容性保證。

原版程式授權與素材使用限制仍須遵守；未確認授權的圖片、音樂不納入新版。
