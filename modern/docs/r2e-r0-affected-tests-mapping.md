# R2-E｜R0 受影響測試逐檔處置與來源風險映射

> 2026-11-22，適用 GitHub `Prysline/akimono` → `test/task02-baseline-on-s1` → Draft PR #1。此清冊**只完成 R2 市場買入／商品 USE／製作受影響測試的 R0 映射**，不是宣稱 R0 所有舊測試、其他街道、36 小時決算、多人或全部 R1 契約均已結案。以 HEAD 的 GitHub Actions 及六份權威文件頂部為準。

## 來源與處置原則

範圍是 R2-A/B/C/D/E 實際觸及的 GameCore、Standard Street Registry、`market-buy`、`use-item`、原版 Oracle、WorldState/CAS、B-43 磁碟、繁中 HTTP/UI、隨機抽樣和其既有呼叫者。以下逐檔標明來源行為／風險、處置、取代或補強證據和理由。**本次未刪除任何原版 Perl `.t`、探針、Node 必要測試或 SHA 校驗。** 不再執行的三條買入命令與三條 USE 專用執行程式已從正式程式移除，不靠測試刪除來掩蓋差異；原 Perl 可執行 oracle／fixture 仍獨立保存。

| Node 測試檔（均在 `modern/tests/`） | 原版來源行為／失效風險 | 處置與具體替代或補強證據／理由 |
|---|---|---|
| `market-buy-core.test.mjs` | `buy-s.cgi`、`whole.cgi`、`GetTimeDeal`；原版數量、售價、CAS、回呼、稀疏 CSV 與未知效果 | **保留** R2-A 36 組 Perl 和 R2-B 價格／一般商品差分；R2-C 驗證舊 `buy-market-item-10/11/14` 命令不可執行，僅 `market-buy` 成交；不可用只測 HTTP 的替代品取代 |
| `r2c-unified-market-http.test.mjs` | 原始 ITEM/PLUS、動態 `BASE`、四品 `buy-s.cgi`、實際 UI／HTTP、B-43 磁碟／重啟 | **保留** #10／#11／#14／#39 及缺欄、舊命令、過期價格／revision 原子拒絕；R2-E 在同一 HTTP 上**增加** USE，不刪 R2-C 買入閉環 |
| `r2d-unified-use-item.test.mjs` | `GetUseItem/CheckUseItem/UseItem`、`MakeAmount`、`lostbook`／EXP；原版 #79 六例、#14 六個獨立 Perl 探針情境 | **保留** 真 Perl→Node 差分與 CAS；新增 R2-E 真 HTTP 呼叫、跨購買、磁碟往返；不把 Oracle 換成 JavaScript 自我比對 |
| `r2e-source-buy-use-http-save.test.mjs` | 原版 `buy-s.cgi`＋`use.cgi`＋`item::lostbook`、真 HTTP、失敗 rollback、兩世代磁碟、關服重啟、損毀回復 | **新增** 作 R2-E 端對端證據；保留 R2-C/D 原有直接差分，並驗證隨機由本機服務產生、客戶無法注入 |
| `game-core-contract.test.mjs` | B-31 GameCore WorldState／CAS、`new.cgi`／`sc-s.cgi` 基礎契約；無效命令與版本競爭 | **改寫並保留** `use-item` 成為合法命令但無規則／缺欄仍拒絕；沿用全世界副本與 CAS 測試，不繞過 `applyGameCommand` |
| `original-market-buy10.test.mjs` | 真 Perl PLUS→批發→`buy-s.cgi`、缺貨、價格、時間、現金 | **保留改用 `market-buy`**，確保早期 B-40來源供貨驗證仍可獨立抓交易數值回歸 |
| `original-admin-sparse-market.test.mjs` | 原始 `inc-admin-func.cgi` 稀疏 79 欄市場、`DataRead/Write`，#79 原版交換 | **已改用 `use-item` 並保留**；可檢查來源市場未憑空起貨、CheckWholeStore 後線路稀疏資訊不毀 |
| `original-sparse-all-plus.test.mjs` | 真 `inc-turn.cgi` 59 筆 PLUS、抽樣次序、`CheckWholeStore`、#79 USE | **已改用 `use-item` 並保留** 原 PLUS Perl 數值差分；共用 USE 前的來源供貨不可假造 |
| `reviewed-gift-map-use.test.mjs` | 真 #79 禮物卷、`GetBuffer` USE、材料 2 張／三張地圖、原 Perl 六案例 | **已改用 `use-item` 並保留** 多次裁切、0 次失敗、庫存上限及非零副作用拒絕；R2-E 補真 HTTP 購買後連續使用 |
| `b62-real-sword-market-map-sale-cas.test.mjs` | 真 #14 市場供貨→地圖第一次 USE→木刀→自然販售，原版無加倍狹窄回呼分支 | **已改用 `market-buy`＋`use-item` 並保留** 原版自然販售與 CAS；未審閱窄分支仍原子拒絕 |
| `b63-source-all-sword-map-outcomes-cas.test.mjs` | 真 `inc-makeitem.cgi`、`use.cgi`、`item::lostbook`，五劍產物與加倍、損毀、Perl rand 順序 | **已改用 `use-item` 並保留** 六組真 Perl 產物／callback/EXP 與 B-43；R2-E HTTP 另驗證 normal、doubled-loss 與重啟 |
| `b41-real-playable-sale.test.mjs` | `buy-s.cgi`、木刀原版 `market.cgi`、販售時間；金錢／展示架風險 | **已遷移保留** 買入 `market-buy`，販售仍走經審閱來源切片；不擴張 R3 |
| `b42-continuous-shop.test.mjs` | 同一世界連續買入、自然販售、距 36h 決算邊界 | **已遷移保留** 共用買入與事件未知拒絕；R2-E 增加 USE 跨存檔，不用這檔宣告 R4 跨期完成 |
| `b43-durable-world-save.test.mjs` | B-43 fsync／rename／SHA256 雙世代、CAS、損毀備援、舊存檔的來源欄位限制 | **保留** 原本嚴格預設；R2-E 僅在明示提供已審閱 USE Registry 時允許 #79 5→3→1 並限制 #9／#12 產物，新增真正使用後存檔／回復測試 |
| `b54-repeatable-source-command-draws.test.mjs` | 本機來源命令亂數按世界／revision 域隔離、缺樣本／越界拒絕 | **保留**；R2-E 新增 `use-item` 抽樣域隔離與 useId=0；不把 Node PRNG 冒稱成 Perl 相同 seed |
| `b55-source-event-callbacks-live-cas.test.mjs` | 已審閱偷竊／強盜原版 Perl callback、CAS、持久化 | **保留** 真原版 EVENT 對照；R2-E 的 USE 僅允許空白合法 EVENT，不能誤用 B-55 覆蓋全部 EVENT |
| `b56-source-event-time-slice.test.mjs` | 真 Perl 事件序、原版銷售＋PLUS、兩次時間片、CAS＋存檔 | **保留** 事件受審閱子集；R2-E 來源 EVENT 未知仍拒絕 USE，不虛稱完整 EVENT |
| `b57-source-support-events-live-cas.test.mjs` | 原版補助／人氣支援回呼的 Perl 差分、隨機次序與 CAS | **保留**，不因引入共用 USE 推測所有來源支援 EVENT |
| `b58-source-loto-real-ticket-cas.test.mjs` | #11 原版樂透市場進貨＋STARTFUNC 回呼、真 Perl 多級獎勵 | **已遷移買入並保留** 原版回呼差分；R2-E 檢查 #11 與 #79/#14 在同一世界存活，不提前移植全部 LOTO |
| `b59-source-iron-event-live-lifecycle.test.mjs` | 原版鐵礦 EVENT 生效與供貨、真 Perl 差分及存檔 | **保留** EVENT來源限制與缺回呼拒絕；不混入 USE Core |
| `b60-source-happy-nowfunc-live-cas.test.mjs` | 原版人氣 EVENT/NOWFUNC 生效與結束、亂數限額 | **保留**，R2-E 沒有擴大 EVENT |
| `b61-source-sword-demand-live-cas.test.mjs` | 原版劍需求事件對 #40～44 影響、Perl 原樣抽樣 | **保留**，#14 首次製作不等於五劍全部自然販售支援 |
| `local-source-text.test.mjs` | Git CRLF 原始碼正規化不能掩蓋固定 SHA／DSL 漂移 | **保留**，新增 `use.cgi`／`core-inc-item.cgi` 仍以既有受審閱原版源讀入 |
| `source-audit.test.mjs` | 原版 DSL 79 ITEM／116 USE、內嵌 Perl 原文，不 eval 執行 | **保留**，未知原版 USE 僅供 metadata、不得執行 |
| `standard-street-model.test.mjs`、`item-limit-model.test.mjs` | 原版 ITEM/CODE／LIMIT/WSLIMIT、開店起始禮物卷與庫存上限 | **保留** 原版初始 5 張與地圖上限來源，不修改凍結原文；USE 後存檔仍依審閱規則核驗 |
| `original-use-outcomes-model.test.mjs`、`original-multi-item-use-model.test.mjs`、`original-use-transaction-model.test.mjs` | 凍結 `MakeAmount`、材料先於產出、市場檢查、使用量／金錢／時間裁切 | **保留** R2-D 共用 USE 數值模組的底層不變式；真 Perl 由 R2-D/E 組合驗證 |
| `original-use-eligibility-model.test.mjs`、`original-use-experience-transaction-model.test.mjs` | `GetUseItem/CheckUseItem`、熟練度與 EXP 上限、來源 gate 順序 | **保留**；#14 第二次使用仍未審閱，不以數值片段假冒完整可操作 |
| `original-shared-use-callback-model.test.mjs`、`original-integrated-use-lostbook-model.test.mjs`、`original-item-helper-model.test.mjs` | 原版來源 callback→`UseItemSub`、使用／損毀記錄與 EXP 次序 | **保留** 原版來源比較；R2-D/E 專注已審閱 #14 首次 USE，避免未知回呼漏做 |
| `original-standard-callback-inventory.test.mjs`、`original-item-dynamic-loading-model.test.mjs` | 原版全體特殊 callback 分布、DSL/Perl 載入優先序 | **保留**，明證多數 USE 尚未審閱；R2-E 不因此擴張 |
| `period-stock-use-model.test.mjs`、`reviewed-use-fixture-street.test.mjs` | 合成數值原版片段／非正式測試配方與期別上限 | **保留並標示非正式來源商品**；不能作為 #79／#14 真原版通用完成證據 |
| `original-sparse-multi-plus.test.mjs`、`original-sparse-wholesale-plus.test.mjs` | 原版局部市場供貨、真 Perl、原版 batch 順序 | **保留** 原始供貨細粒度證據；R2-E 真世界由 `reviewed-sparse-all-plus` 啟動 |
| `original-natural-sale-plus.test.mjs`、`original-nayuta-functurn.test.mjs` | 真原版自然銷售、商品 `FUNCTURN` 與市場回補 | **保留**；R3 範圍不因 R2-E 交易整合被偷換 |
| `original-inline-work-showcase-model.test.mjs` | 原版工作、展示架效果與回呼，可能非共用 USE | **保留** 非正式世界切片；不刪原始 Perl／來源行為 |
 
## 完整 Node 目錄的未觸及範圍

本次查得 `modern/tests/` 共 **65 個 `.test.mjs`**（含新增 R2-E 檔）。上述列出 R2 真正受影響或支援其原版數值／CAS 邊界的測試；**沒有**改寫其餘獨立領域測試，也沒有將它們列為 R2 已完成能力。未納入 R2 行為替代的檔案包含：
- `b44-period-ledger.test.mjs`、`b45-period-top-prize.test.mjs`、`b46-period-territory.test.mjs`、`b47-period-solo-sort.test.mjs`、`b48-original-event-start.test.mjs`、`b49-original-event-lifecycle.test.mjs`、`b50-period-same-state-chain.test.mjs`、`b51-source-city-period-world.test.mjs`、`b52-event-bootstrap-source.test.mjs`、`b53-event-catalog-source.test.mjs`：期末／EVENT 獨立領域，後續 R4/R5
- `economy-model.test.mjs`、`peer-trade-model.test.mjs`、`period-experience-model.test.mjs`、`wholesale-turn-model.test.mjs`：舊合成世界數值，非本輪真來源 USE
- `world-backup-preflight.test.mjs`、`world-commit-plan.test.mjs`、`world-lock-contract.test.mjs`、`world-one-shop-parser.test.mjs`、`world-read-preflight.test.mjs`、`world-shop-history-model.test.mjs`、`world-wholesale-codec.test.mjs`、`standard-init.test.mjs`：舊原版文字／世界 IO 邊界，仍有獨立回歸價值，不因 B-43 JSON 存檔完成而刪除
- 其餘 R2 類相關檔案在上表中逐檔映射；任何未列的回歸不被自動定義為可刪

## Perl 證據、未完成邊界及最終退出門檻

`modern/tests/original-perl/` 現有 **52 個 `.t`、1,867 個 Perl 斷言**仍由 `prove -v *.t` 直接執行。原版固定 `buy-s.cgi`、`use.cgi`、`inc-makeitem.cgi`、`core-inc-item.cgi`、`whole.cgi`、`calc.cgi` 及 DSL/SHA 稽核不修改。直接用 `original-r2a-market-buy-oracle.pl`、`original-gift-map-use-probe.pl` 與 `original-b63-sword-map-all-outcomes-probe.pl` 的結果比 Node，並新增 R2-E 真 HTTP→持久化對照；既有 R2-B 動態市場／#39 Perl 探針保持。

**R0 受 R2 影響的逐檔處置表完成，不等於 R0 全量結案；R1 `market-buy`／`use-item` 子契約可執行，不等於完整 R1 EVENT／所有街道／全部 USE 契約。** R2-E 完成仍需最終 HEAD 的 Node／Perl 全綠、原版 SHA／DSL 稽核、同 SHA 的 Push 與 Draft PR Actions `completed/success`、PR Open／Draft／未合併。若任一失敗不可宣告 R2-E 或整體 R2 結案。
