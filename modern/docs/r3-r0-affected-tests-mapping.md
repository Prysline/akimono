# R3 受影響 R0 測試映射（2026-11-22）

> 只覆蓋 R3 共用販售／時間直接相關的既有測試，R0 和 R1 全量仍未結案。原版凍結來源不變。沒有可安全刪除的原有測試，所有過往證據均保留。

| 測試路徑 | 原版來源 | 回歸風險 | 處置 | 替代／補強證據與理由 |
|---|---|---|---|---|
| modern/tests/b41-real-playable-sale.test.mjs | inc-turn.cgi、market.cgi、original-b41-real-sale-probe.pl | #10 售量／rank／收支／亂數退化 | 保留 | R3 24 案 Perl 差分新增 #10；舊真買入及 HTTP 流不可刪 |
| modern/tests/b42-continuous-shop.test.mjs | inc-turn.cgi＋原版 PLUS | 連續時間片、再進貨及市場漂移 | 保留 | R3 多商品續營另外證明；不代替舊雙輪證據 |
| modern/tests/b43-durable-world-save.test.mjs | Core 讀寫來源及 B-43 雙世代安全契約 | sword itemtoday 或展示架被錯存／錯載 | 保留 | R3 真磁碟重啟補強；既有損毀還原仍需保留 |
| modern/tests/b54-repeatable-source-command-draws.test.mjs | inc-turn.cgi rand 原序、B-54 local RNG policy | 重啟不同亂數、錯誤宣稱 Perl 原 RNG | 保留 | R3 Perl 前綴差分；本機 policy 不是 Perl process stream |
| modern/tests/b56-source-event-time-slice.test.mjs | inc-turn.cgi EVENT、ITEM EVENT DSL | 漏事件及 hash 遍歷假設 | 保留 | R3 五劍以明示 event fixture，未將其冒充原版 hash 順序 |
| modern/tests/b61-source-sword-demand-live-cas.test.mjs | ITEM ken-sale、inc-turn.cgi 需求、inc-makeitem.cgi | POP/2 與 POINT 編譯錯置 | 保留 | R3 六商品編譯值與 Perl 算式差分 |
| modern/tests/b62-real-sword-market-map-sale-cas.test.mjs | buy-s.cgi、#14 ITEM USE、Core | 假造木刀／源價格不符 | 保留 | R3 #14 買入→USE→五劍→販售 |
| modern/tests/b63-source-all-sword-map-outcomes-cas.test.mjs | #14 USE 五種機率、lostbook | 其餘四種劍無合法取得 | 保留 | R3 五種商品真來源取得，仍需原 Perl USE Oracle |
| modern/tests/r2e-source-buy-use-http-save.test.mjs | 原版 BUY／USE、B-43 source讀寫 | 新 API 破壞 R2 CAS／磁碟拒絕 | 保留 | R3 真 HTTP 販售／重啟擴展回歸 |
| modern/tests/original-perl/original-b41-real-sale.t | 原版 inc-turn.cgi／market.cgi | 原始售出基準退化 | 保留 | 新 original-r3-shared-sale-probe.pl 為加深多商品差分 |
| modern/tests/original-perl/original-b42-two-rounds.t | 原版 inc-turn.cgi／PLUS | source two-round 次序退化 | 保留 | 新多劍共用流程不同驗證維度 |
| modern/tests/original-perl/original-b61-sword-demand.t | ITEM ken-sale／原版 compiler | 劍 EVENT 需求改動 | 保留 | 新 R3 source ITEM 值查核與 Perl 24 案 |
| modern/tests/original-perl/original-b62-sword-map-use.t | 原版 USE #14／Core | 地圖 USE 非法製作 | 保留 | 新 R3 全部五劍真來源流程 |
| modern/tests/original-perl/original-b63-sword-map-all-outcomes.t | ITEM #14 首次 USE／lostbook | 機率分支錯誤 | 保留 | 新 R3 HTTP 流仍使用其既有來源 |
| modern/tests/original-perl/original-r3-shared-sale-probe.pl | inc-makeitem.cgi、inc-turn.cgi、market.cgi、PLUS | JS 自己生成 expected 冒充來源 | 新建 | 真 Perl executable Oracle ×24，人工庫存僅隔離算式 fixture |
| modern/tests/r3-shared-natural-sale.test.mjs | 同上 | 稅、成本、POINT、rand、整數錯 | 新建 | 對同一共用核心逐欄比 24 組實際原版結果 |
| modern/tests/r3-shared-sword-acquisition-sales.test.mjs | #14 原版 USE、B-41／B-56、Core | 多商品未共用 CAS／存檔 | 新建 | 真地圖五劍合法取得／共同入口／雙世代載入續營 |
| modern/tests/r3-real-sword-http-restart.test.mjs | 同上及 Core 讀寫 | UI 造價／拒絕部分提交／重啟資料遺失 | 新建 | 真 HTTP／CAS／兩代磁碟／兩次程序重啟；EVENT 變未知後劍類再販售必須原子拒絕，仍可合法上架／存檔 |

R3 目前缺少的 R0／R1 完整映射：FUNCTURN／FUNCSALE 的所有來源／抽樣與清理順序、17 EVENT 真 Perl hash 遍歷及其他未知回呼、原版亂數狀態、非原價／多架／多商店／街道差異、非零稅率、跨 36 小時期末。沒有等價來源證據前**不得移除舊測試**、不得把部分 R0／R1 當全量完成。
