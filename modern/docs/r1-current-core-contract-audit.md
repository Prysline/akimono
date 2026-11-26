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
#62/1、#62/2、#65/0–2、#63、正價 FUNCINIT 均需最新 runtime 核對，不以舊文件當現行完成證據。#22 正常經營，#18 外部來源適配，#16 公會龍族研究，#1 歷史來源。以下另列本輪來源缺陷與獨立重現，未修改 runtime。完整契約欄位、合法數值、順序及負例是後續退出門檻。

## 第二批：正式入口補強
- 新測試使用現行 `dev-local` 及既有 `genuinePlayer({now:null,crossPeriod:true})`，拒絕額外欄位、非法/stale revision、舊時間與供貨、禁止展示 #63；逐次比對 WorldState、歷史數、checkpoint revision、存檔世代，最後合法清架與 v2 重啟。尚待 exact HEAD CI。
- Registry 稽核直接沿用現行 source wiring 與 compiler；`r1-formal-registry-audit.mjs` 固定 dev-local blob，輸出逐項註冊與編譯結果；不等同玩家可達。
- #62/1 在 `standard-street-module.mjs` 的 declarativeUseIndex 有規則，但 `dev-local.mjs` /api/use 拒絕 targetShopId、多店預檢 403、/api/save 拒絕多店；#62/2、#65/0–2 尚無規則。#63 正式市場零價再取得 getRule=null，初始工具及 USE 擴建另計。
- **R1-HTTP-01 來源缺口**：固定 dev-local 的 /api/initialize 不驗證 request key set；/api/open-shop 只取 ownerName/shopName/revision，伺服器強制 shopId=1，額外欄位被忽略而不是拒絕。/api/load 也沒有 key-set 檢查。這是嚴格 HTTP 契約不一致，並非已證明能注入資產或越權。獨立 `node --test scripts/r1-http-extra-fields-repro.mjs` 按應有拒絕行為斷言，現行來源預期暴露失敗；尚未實際執行。故不納入預期綠燈的 npm test，不改預期、不 skip、不修共享 runtime。R1 後續經授權修復；與 #18/#22 的外部／時間業務功能分離。load 額外欄位的重啟重現仍待補。

## 已回收的來源 CI
#23 run 45746112640：1336/1336、Perl 2456/2456；Registry 診斷七 capability 與全部 220 rows 已回填。#24 run 45754245430：1332/1332、Perl 2456/2456；三項正式啟動拒絕通過。兩者 checkout tree 分別等於各自 HEAD tree，整合候選仍須重驗。R1-HTTP-01 尚無本輪執行結果。

## R1-HTTP-01 補全與 v2 負向回歸（本輪，待執行）
固定正式 dev-local blob 的 367–437 行：initialize 不檢查 key set；open-shop 只取 ownerName/shopName/revision 且 server shopId=1；load 僅檢查 live world 是否存在並讀合法 saveStore.load()。buy/use/discard/save/reset 有 exact key set；showcase 有允許欄位與必填/二選一；advance-reviewed-time exactKeys。舊時間、supply、多人預檢直接拒絕。此為來源確認，尚非本輪 HTTP 實際觀察或資產注入證明。
獨立 `node --test scripts/r1-http-extra-fields-repro.mjs` 增加空 body 合法 control、open-shop 合法 control、相同合法 v2 保存兩次重啟 load control/probe。逐次記錄實際 status/response、world/revision/history/generation 與保存檔 SHA256；保留預期 4xx、狀態不變的嚴格斷言，不加入預期綠燈的 npm test。
新 `r1-http-persistence-contract.test.mjs`：18 組非法/衝突 HTTP 請求逐次比對完整 world、history、checkpoint、generation、磁碟 hash；同 revision 丟棄與同 generation 保存競爭只一次提交，重啟一致。只合法初始化/開店，無注入；尚未取得本候選 CI。RNG 不另宣稱已驗：world 不變不等於獨立觀測 RNG 呼叫次數。
