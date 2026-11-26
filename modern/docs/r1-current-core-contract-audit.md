# R1 現行共用契約稽核（第一批，未結案）
以 08fdd3b31ff130e66d0337360430fda3d73fdc8d 為基準，補充而不取代 [GameCore v1 契約](game-core-contract-v1.md)；歷史記憶體 schema 與正式玩家 v2 磁碟格式不能混稱。
| 契約 | 現行入口、輸入與守門 | 證據／待補 |
|---|---|---|
| GameCore/CAS | game-core-contract.mjs applyGameCommand/executeMemoryCommand；kind/expectedRevision，streetModule.capabilities；拒絕 unknown/revision，CAS 一次提交 | game-core-contract.test.mjs；逐命令 payload、拒絕碼與原子性待覆核 |
| Registry/編譯 | standard-street-module.mjs、parse-dsl.mjs、reviewed-* compiler；宣告不等於可執行 | source-audit.test.mjs；逐項註冊／來源 drift 待補 |
| 市場 | /api/buy → market-buy；itemId/requestedCount/marketShelf/expectedPrice/expectedRevision；server shopId=1，正價與合法 #13 零價區分 | market-buy-core.test.mjs、P5 oracle 與真 HTTP；#63 再取得與正價 FUNCINIT 待審 |
| USE | /api/use → use-item；itemId/useId/requestedCount/expectedRevision；server 決定材料、EXP、回呼與 RNG | P1～P5；116 USE 逐層證據未齊 |
| 展示／丟棄 | edit-showcase、discard-item；展示旗標、庫存、revision；丟棄 itemId/count/expectedRevision | P3 普通多架保存；不等同多架自然販售 |
| reviewed time | /api/advance-reviewed-time → advance-reviewed-world-time；只接受 minutes/expectedRevision；舊 /api/advance-time 409，/api/supply 拒絕 | 單店單架受控時間、跨期 opt-in；全商品多架及 EVENT 依 #22 |
| 原版順序 | market-buy-core、shared-natural-sale-core、original-b41-playable-sale、original-r4-reviewed-world-time；FUNCINIT/PLUS/FUNCTURN/FUNCSALE/FUNCBUY、SortDT、EVENT、期末、外部 IO | P5 0 價運輸、R3/R4 受控來源；完整價格稅人氣維持費、順序與外部 IO 依 #18/#22/#16 |
| RNG／重播 | local-source-command-draws、r4-time-command-draws、reviewed-world-time-history；伺服器亂數，不能由 client 指定 | P3/P4/P5 v2；全部命令／EVENT 歷史支援待審 |
| 持久化 | dev-local.mjs → createLocalWorldSaveStore；/api/save 僅 expectedGeneration/expectedRevision；akimono.local-world-save.v2、雙世代、HMAC checkpoint、retained prefix、fingerprint | P3～P5；legacy-* 僅測試隔離，拒絕 v1；非多人／外部 IO 全量證明 |
| HTTP/UI | modern/scripts/dev-local.mjs、modern/local-ui/app.js；npm run dev:local | 全部路由負例及欄位待逐檔稽核 |
#62/1、#62/2、#65/0–2、#63、正價 FUNCINIT 均需最新 runtime 核對，不以舊文件當現行完成證據。#22 正常經營，#18 外部來源適配，#16 公會龍族研究，#1 歷史來源。此批未建立新的 runtime 缺陷重現，未宣稱無缺陷。完整契約欄位、合法數值、順序及負例是後續退出門檻。
