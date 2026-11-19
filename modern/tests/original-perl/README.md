# 任務 02｜原版 Core 隔離行為測試

此目錄從既有 `migration/standard-street-s1` 建立，使用原版 Core 真實 Perl 程式，搭配固定世界狀態與 I/O 替身執行，**不取代** `modern/src/parse-dsl.mjs` 的標準街 DSL 靜態來源稽核，亦不修改原版 CGI。

## 固定來源與完整性

Core commit：[738d71a2985fd088f2ca90f25145706392ee2365](https://github.com/katelynn620/akimono-core/tree/738d71a2985fd088f2ca90f25145706392ee2365)。

| 本目錄的固定快照 | 原始 Core 路徑 | Git Blob SHA |
| --- | --- | --- |
| `calc.cgi` | `plug/calc.cgi` | `586354a9a300e26d0e12a4efa512fa25760e3197` |
| `item.cgi` | `plug/item.cgi` | `b39400d7dc0ab80062c392ae2bbc923e24ecacf8` |
| `new.cgi` | `new.cgi` | `9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7` |
| `sc-s.cgi` | `sc-s.cgi` | `0bada620cff769bed782707d61b87e48cce0a58c` |
| `market.cgi` | `plug/market.cgi` | `1aca77e9b373c25e53e445d64c101a7cc2246825` |
| `whole.cgi` | `plug/whole.cgi` | `778badaf157326bcfd1f8fa1e310d94f94995eb3` |

CI 會以 `git hash-object` 核對以上六個固定快照。快照檔案未改寫；所有測試替身只出現在 `*.t` 內。

## 執行方式

環境：Perl 5.40 / Test::More、Node.js 22 以上。從本目錄執行：

```sh
prove -v *.t
```

目前已由 GitHub Actions 成功執行 **4 個 Perl 測試檔，88/88 個斷言**：

| 檔案 | 原版函式／流程 | 斷言 |
| --- | --- | ---: |
| `baseline.t` | 計算插件：時間／資金／交易／商品編號 | 31 |
| `new-store.t` | 真正執行 `new.cgi` 的 Core 預設開店初始化 | 18 |
| `showcase-market.t` | `sc-s.cgi` 陳列操作、`GetMarketStatus` 市場統計 | 26 |
| `whole-store.t` | `GetWholeStore`／`CheckWholeStore`／`SetWholeStore` | 13 |
| **合計** | | **88** |

CI：[Actions run 44585838281](https://github.com/Prysline/akimono/actions/runs/44585838281)，`Result: PASS`。

原既有 Node 測試與來源稽核繼續由下列指令驗證：

```sh
cd ../../
npm test
npm run audit
```

新建 `modern/tests/standard-init.test.mjs` 用讀取原版 DSL 的方式核對 `NewShopMoney=100000`、`NewShopTime=12*60*60`、`NewShopItem=展示架擴建拆卸工具:1:禮物卷:5` 與原版商品 ID `63`、`79`，**不代表已執行編譯後的 `@@FUNCNEW`**。

## 隔離測試的範圍

- `new.cgi` 和 `sc-s.cgi` 的原版主要流程有實際執行，但 `Lock`、`DataRead`、`DataWrite`、`DataCommitOrAbort`、`OutSkin`、使用者授權等外部依賴以替身代替，不會讀寫正式世界資料。
- `sc-s.cgi` 用固定商品庫存、價格、貨架和模擬時間；失敗操作檢查無呼叫資料 commit，不能宣稱完成真實資料庫交易。
- `market.cgi`、`whole.cgi` 的原版市場函式使用固定多店資料，驗證數字與邊界，尚未跑完整每日週期。
- **仍待**商品 DSL 由原版編譯器產出資料並執行商品使用、真實銷售、隨機事件、決算與實際檔案 round-trip（B-01 商品注入、B-02、B-06～B-14）。
- 獨立 S1 v0.2.0 TypeScript 舊 ZIP 未出現在此儲存庫中，未宣稱已整合；Core 的 `feat/req` 是獨立且已分叉的委託所功能，未合併。
- 請在 [Notion 任務 02](https://app.notion.com/p/41db4185273f818f97d4fce172db36f8) 追蹤已跑與待跑案例。

## 2026-11-20｜目前無 CGI 環境的開發限制

使用者已確認目前沒有可用的 CGI 執行環境。**不要要求啟動原版 CGI 伺服器，也不要把這一需求設成 Node.js 現代化開發的前置依賴。**

- 本目錄的 `*.t` 是 **GitHub Actions 上使用 Perl + Test::More，搭配檔案讀寫、畫面輸出與登入等替身** 執行的局部／主要流程測試；**未使用 CGI HTTP 伺服器**。既有 88/88 PASS 在此限定範圍下仍有效。
- 接下來的主開發路徑為 `modern/` 的 Node.js DSL 來源稽核、固定測資、可重現規則模型（含開店初始商品、陳列、市場、跨期與決算）；保留原始程式碼 SHA、商品 ID、來源行號與原版覆寫規則。Node 模型通過測試不等於原版 CGI 實機相容。
- `@@FUNCNEW`、`_local_` 與任意 Perl 回呼在既有 Node DSL parser 中目前僅保留原始片段；除非有可執行、已驗證的精確規則，不將它們當成可直接執行的 JS 或推定已編譯。
- 完整 CGI HTTP、原版 `inc-makeitem.cgi` 在 CGI 管理入口的執行結果、真實世界存讀檔及完整跨期遊戲端到端測試均標記 **受環境限制、未驗證**。不因此停止目前不依賴 CGI 的開發。
- [任務 02 Notion](https://app.notion.com/p/41db4185273f818f97d4fce172db36f8) 維持「進行中」。
