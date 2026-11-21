# B-40｜標準街「本機繁中介面＋真市場 #10 進貨」驗收

## 已加入的可操作程式（非 JSON demo）

- `modern/scripts/dev-local.mjs`：僅在 `127.0.0.1` 啟動的本機 HTTP 服務，提供 `GET /api/state`、`POST /api/initialize`、`POST /api/open-shop`、`POST /api/supply`、`POST /api/buy`。
- `modern/local-ui/index.html`、`app.js`、`style.css`：店內／市場／倉庫三頁籤、世界 ID／版本／時間／資金／人氣／持有量、供貨按鈕、進貨表單、成功及拒絕收據；只顯示 Node 權威狀態。上架、自然販售、週期、結算、存檔全部明確停用。
- `modern/src/original-market-buy10.mjs`：唯讀原版市場報價、商品 #10 原版市場成交計算／檢查，交由現有 `standard-street-module.mjs` 的 `buy-market-item-10` 命令，透過 `executeMemoryCommand` 和 CAS 修改同一世界。
- 初始化不是 79 格人工 0：呼叫現有 B-34 真首次管理員空批發來源，保持來源稀疏 CSV。開店呼叫已經 B-31 驗證的真來源商品／店鋪初始化；供貨使用 B-37 已驗證的完整 59 項 `PLUS`＋`CheckWholeStore` **單一子步驟**，抽樣來自 Node `crypto.randomInt(1000000)`，沒有將商品注入市場。不宣稱此動作推進遊戲時間／自然販售或代替 `inc-turn.cgi` 全週期。

## 本機啟動與關閉

前置：GitHub 工作分支 `test/task02-baseline-on-s1`；Node.js **22 或更新**（不需新增 npm 相依套件），原始 DSL 與必要固定 Core 快照須保持不變。

```bash
git clone https://github.com/Prysline/akimono.git
cd akimono
git checkout test/task02-baseline-on-s1
cd modern
npm run dev:local
```

瀏覽器打開 **http://127.0.0.1:4173**。關閉服務按 `Ctrl+C`。若本機埠被占用，可先設 `AKIMONO_PORT=4174` 再啟動（Windows PowerShell：`$env:AKIMONO_PORT=4174; npm run dev:local`），網址改為 `http://127.0.0.1:4174`。

**重要：** 世界只保存在該 Node 程序的記憶體裡。重啟服務後所有本機操作資料消失；不是世界檔案儲存器。沒有公開登入、舊 CGI Cookie 或多人權限。網站僅在本機 `127.0.0.1` 服務，請勿反向代理到公網。

## 玩家手動驗收：成功與拒絕

1. 開頁後點「**① 初始化原版來源世界**」：世界從無到有，revision 為 **1**、市場 #10 為 **0**；此時按「② 開店」，輸入店主與店名。revision 變 **2**，資金 **100,000**、人氣 **5010**、#63 展示架工具 **1**、#79 禮物卷 **5**、#10 **0**。
2. 點「市場／進貨」。**先不要供貨**，直接設定數量1、按「購買 #10」：應顯示「市場無貨」或原版拒絕理由，revision 仍 **2**，資金100000、商品 #10 0、市場 #10 0。這是**真正的 Core 拒絕**，不是前端假裝無貨。
3. 按「執行供貨子步驟」，選 60 秒：呼叫**來源已核對的 B-37 PLUS**，遊戲時間不跳動，revision 變 **3**；#10 批發應大於0（實際數字依來源抽樣和批發上限而變動）。不是人工插入的商品，也不是完整週期。
4. 在市場看到 #10「書本寫作工具」、來源單價 **5000**、可買量及持有量。填數量1、點「購買 #10」：revision 變 **4**，資金 **100000→95000**，商品 #10 **0→1**，批發市場 #10 **N→N−1**，今日進貨支出 **0→5000**，可用行動時間減少 **600 秒**。操作回報列出這些前後差異。切回「店內」確認資金，進入「倉庫」確認真商品庫存。
5. 重新供貨前連續買到來源市場缺貨時，若市場為0再按進貨會被拒絕；或者保持舊版本呼叫 API 會被 `REVISION_CONFLICT` 拒絕，不得改動金錢／庫存。市場報價變更、負數、零數量也必須被後端拒絕，失敗 revision 不變。
6. **金錢不足**：新開店初資金100000，#10 個別庫存上限20，現階段尚無合法其它消費步驟，不能在同一手動 UI 自然形成不足5000的現金狀態。此案例只由**明示財務不足的隔離 Perl／Node fixture**驗證原版拒絕，不把可偽造狀態當作玩家功能。未實作購買其他原版商品前不能宣稱玩家可手動按到該不足狀態。

補充：原版 `buy-s.cgi` 的 `CheckCount` 可能把大於現貨、剩餘空間或現金可負擔數量的請求縮成可成交數；這和「超限一律整單拒絕」不相同。畫面會回報實際成交件數。已驗證的市場商品種類僅 #10。

## 原版程式與 Node 對照

| 規則／欄位 | 固定原版 Perl | B-40 Node |
| --- | --- | --- |
| 商品 / 上限 / 原價 | `custom/inc-item-data.cgi` 第10號商品 `book-make`：`price 5000`, `limit 20/10`, `plus 20m` | 來源受控 `reviewOriginalMarketBuy10` 確認 DSL 漂移即拒絕 |
| 貨源 | `inc-admin-func.cgi::init` 空白批發，`inc-turn.cgi` PLUS 59項、`whole.cgi::CheckWholeStore` | B-34 `initialize-source-market` + B-37 `reviewed-sparse-all-plus`（不造庫存） |
| 市場交易入口 | `buy-s.cgi` 的 `CheckCount`, `GetWholeStore`, 價格／商品／現金驗證 | `projectOriginalMarketBuy10`，市場無貨／價格不符／過量／無錢拒絕或原版縮量 |
| 行動時間 | `TIME_SEND_ITEM 20m`，市場買入減半後 `GetTimeDeal`、`UseTime` | #10 標價成交 600 秒，守護原版時間上限與不足情況 |
| 金錢／庫存／帳務 | `buy-s.cgi` 更新 `money`, `paytoday`, `item`，`SetWholeStore` 更新整份市場批發 | 同筆單一 Core/WorldState CAS 提交；失敗不變更 |
| Perl 原文驗證 | `original-market-buy10-probe.pl` 透過固定原文 `buy-s.cgi` 和來源 B-37 供貨 | `original-market-buy10.test.mjs` 逐欄對照 Perl，並進行真 HTTP E2E 測試 |

**執行驗證：**

```bash
cd modern
npm test
cd tests/original-perl
prove -I . *.t
```

CI 包含 Push 與 Draft PR 的同 SHA 兩次 GitHub Actions。不得以測試數量當完工比例，應確認最終 HEAD 的兩個執行記錄為 completed/success，且固定原版 Core/DSL SHA audit 成功。

## B-40 範圍與下一個切片

目前**已打通的玩家行為**是：空白來源世界初始化→新店→來源真正供貨子步驟→真市場進貨 #10→同一世界扣款、倉庫持有數增加、revision 更新，顯示失敗理由。**未完成**上架→自然販售、完整回呼與真時間、週期結算、存檔與載入、其他商品與多人；不能將 B-37 的供貨時間片當成真正世界時間推進，也不能用 B-38 的人工 #10 上架測資冒充玩家進貨。

**下一階段 B-41**：在同一店內／市場／倉庫頁面新增真 WorldState 上架動作與來源自然販售，先用本階段買到的 #10 驗證「進貨→上架→售出」；原版必要的中間回呼／時間只為該合法路徑補齊，再接週期結算、持久化，不改保護分支或原版來源。
