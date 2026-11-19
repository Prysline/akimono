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

**驗證結果：** [GitHub Actions 自動測試](https://github.com/Prysline/akimono/actions) 已於本分支執行 Node 原有來源稽核與新模型測試，以及 88 項隔離 Perl 測試。完整驗證以該次 CI run 紀錄為準。

**邊界與限制：** 這是「依已審查原始碼建立的可執行規則子集」，不是 CGI 編譯器的 Perl 回呼執行，也沒有實作商品使用、事件、隨機售出、真實市場週期、持久化、權限、安全或完整多人 Core；未提供的規則須逐項核對來源後才會增補。**禁止將這一階段的 Node 綠燈當成整體遊戲相容證明。**

目前 CGI 環境不可用，這些模型與測試均不要求 CGI 伺服器。本節新增程式不會合入 `main`，除非審查通過。
