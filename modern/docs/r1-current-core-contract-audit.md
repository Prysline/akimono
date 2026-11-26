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
- **R1-HTTP-01 來源缺口**：固定 dev-local 的 /api/initialize 不驗證 request key set；/api/open-shop 只取 ownerName/shopName/revision，伺服器強制 shopId=1，額外欄位被忽略而不是拒絕。/api/load 也沒有 key-set 檢查。這是嚴格 HTTP 契約不一致，並非已證明能注入資產或越權。獨立 `node --test scripts/r1-http-extra-fields-repro.mjs` 按應有拒絕行為斷言，現行來源預期暴露失敗；尚未實際執行。故不納入預期綠燈的 npm test，不改預期、不 skip、不修共享 runtime。R1 後續經授權修復；與 #18/#22 的外部／時間業務功能分離。load 額外欄位重啟腳本已於後續批次補入，仍待執行。

## 已回收的來源 CI
#23 run 45746112640：1336/1336、Perl 2456/2456；Registry 診斷七 capability 與全部 220 rows 已回填。#24 run 45754245430：1332/1332、Perl 2456/2456；三項正式啟動拒絕通過。兩者 checkout tree 分別等於各自 HEAD tree，整合候選仍須重驗。R1-HTTP-01 尚無本輪執行結果。

## R1-HTTP-01 補全與 v2 負向回歸（本輪，待執行）
固定正式 dev-local blob 的 367–437 行：initialize 不檢查 key set；open-shop 只取 ownerName/shopName/revision 且 server shopId=1；load 僅檢查 live world 是否存在並讀合法 saveStore.load()。buy/use/discard/save/reset 有 exact key set；showcase 有允許欄位與必填/二選一；advance-reviewed-time exactKeys。舊時間、supply、多人預檢直接拒絕。此為來源確認，尚非本輪 HTTP 實際觀察或資產注入證明。
獨立 `node --test scripts/r1-http-extra-fields-repro.mjs` 增加空 body 合法 control、open-shop 合法 control、相同合法 v2 保存兩次重啟 load control/probe。逐次記錄實際 status/response、world/revision/history/generation 與保存檔 SHA256；保留預期 4xx、狀態不變的嚴格斷言，不加入預期綠燈的 npm test。
新 `r1-http-persistence-contract.test.mjs`：18 組非法/衝突 HTTP 請求逐次比對完整 world、history、checkpoint、generation、磁碟 hash；同 revision 丟棄與同 generation 保存競爭只一次提交，重啟一致。只合法初始化/開店，無注入；尚未取得本候選 CI。RNG 不另宣稱已驗：world 不變不等於獨立觀測 RNG 呼叫次數。

## 七種能力逐命令來源核對（正式 base，非新測試通過宣告）
共通 kind/expectedRevision：非空 kind 最長 100，revision 非負安全整數；StreetModule id、capability 與 revision 不合分別拒絕。來源：game-core-contract.mjs:131–219（b5ff31b7caa086e811ab7e4204aca8a5b23a8975）。所有數值下限以下均指安全整數。

| command | Core payload（不含共通欄位） | 正式 HTTP／條件 |
|---|---|---|
| initialize-source-market | 無額外欄位 | /api/initialize，僅 fresh revision=0、無 shops/market/events；HTTP 未嚴格拒絕額外欄位 |
| open-shop | shopId>=1、ownerName/shopName 非空且最多200字元；選填 icon>=0 | /api/open-shop 僅取姓名店名 revision，server shopId=1；不允許第二間店；HTTP 未嚴格拒絕額外欄位 |
| market-buy | shopId/itemId/requestedCount>=1、marketShelf/expectedPrice>=0，exact keys | /api/buy exact keys，server shopId=1；現有市場、單店、持有上限、庫存、價格架號核對；count 依資金與容量裁切；#13 合法零價仍有運輸時間 |
| use-item | shopId/itemId/requestedCount>=1、useId>=0；Core 選填 randomDraws、targetShopId | /api/use exact keys，拒 client draw 和 targetShopId；正式單店；前置材料/持有/EXP/時間/資產/事件等由 reviewed rule 核對；內部 draw 必須 0..999999 且數量精確 |
| edit-showcase | shopId>=1、shelf/itemId>=0；選填 per、priceOverride | /api/showcase revision/itemId 必填、per 或 priceOverride 至少一個、shelf 選填；per 1..200、priceOverride 1..sourceMaxShowcasePrice、架號須存在；itemId=0 清架 |
| discard-item | shopId/itemId/count>=1，exact keys | /api/discard exact keys；活動店舖、已知商品、非 notrash、足夠庫存；不消耗時間 |
| advance-reviewed-world-time | minutes 1..60，exact keys | /api/advance-reviewed-time exact keys；單店、reviewed inventory；跨期 opt-in，舊路由拒絕 |

定位：standard-street-module.mjs:109–125、開店/初始化/展示/丟棄分派；market-buy-core.mjs:18–191；shared-use-item-core.mjs:39–415；original-r4-reviewed-world-time.mjs:24–27、52–100；scripts/dev-local.mjs:329–535。market-buy 先計價、金錢、時間、庫存，再 global FUNCBUY、item FUNCBUY、market codec；USE 依 receipt callbackOrder 核對 before-use、check-use/account/materials/make-amount/check-whole-store、after-use/inline/experience；未知回呼與多餘 draw 拒絕，尚未逐支驗收。GameCore snapshot 隔離、nonCommittable guard、finalizer、period reviewer、CAS identity/schema/revision/time 守門；HTTP commit 先 preview/history/preflight，再 CAS，成功後才更新 proof。正式 ordinary draw 是 command-scoped SHA256（worldId/revision/time/args），非可變全域 RNG stream，非 Perl rand 等價；不把拒絕時 state 不變宣稱為量測 RNG 呼叫次數。

## v2 來源核對與證據界線
- local-world-save-store.mjs:39–125、172–219：有界 regular file、拒 v1、exact envelope、generation slot parity、digest、canonical proof/world、重播及 periodDiskStore verify；兩世代須 lineage compatible；無有效世代時拒覆寫損毀存檔；expectedGeneration、worldId、revision 及 prefix 守門，暫存檔 fsync/rename/readback。不同程序的同時寫入或斷電耐久不由此單程序測試證明。
- reviewed-world-time-history.mjs:56–165：exact time trace（draw/hash policy、seed、interpreter、EVENT order/samples、effect/after digest），fresh anchor 或 verified checkpoint，source replayer 比對完整 canonical WorldState；prefix lineage 比對，不允許任意新 anchor。
- reviewed-history-checkpoint-store.mjs:51–184：來源/runtime fingerprint、32-byte server key、HMAC metadata 與 checkpoint save envelope、timingSafeEqual、prefix digest、origin/revision/generation lineage 全鏈驗證；fresh proof 依重播而非宣稱每個 fresh envelope 均有 HMAC。保留 prefix 是獨立物件，未在本輪證明所有失敗路徑均無任何暫存／retained 殘留。
- 新競爭測試僅驗單 dev-local 同 revision/世代的兩個請求，不宣稱跨程序 CAS。成功丟棄可能合法更新 period.disk 的交易投影；僅對 time、eventState、settledCount、金錢、庫存、revision、history、實體存檔 bytes 斷言，拒絕路徑仍比較完整 snapshot。HMAC/未知命令/非法 EVENT/損毀的既有測試仍須逐檔對照，不能以來源核對替代執行。

## 第五批：既有安全證據對照與 fresh 負向補件
[R1 v2 安全證據覆核](r1-v2-security-evidence.md)：逐檔回收 P3 兩個 rotation/crossing 與 P4/P5 三份正式測試、兩 helper 的具體斷言，分離 fixed clock、fresh replay 與 checkpoint HMAC；已有外層 HMAC/內層 metadata 破壞、fingerprint、prefix 損毀與復原證據，但 metadata 破壞同時失效 outer HMAC，不能宣稱單獨內層判斷已測。新增 `r1-v2-fresh-negative-replay.test.mjs`：正常 HTTP 建立兩代存檔，9 個 checksum-correct 最新 slot 負例、兩 slot 全壞拒絕覆寫、還原 genuine bytes exact restart。待候選 CI；仍未執行 R1-HTTP-01，無 runtime 修改。

## 2026-11-26 exact candidate CI failure / test correction
[run 45760668915](https://github.com/Prysline/akimono/actions/runs/45760668915), job 139709632418，HEAD `ee961fd68e93c5063b584b903eb108488a1a1278`，實際 checkout `85a5fdf242b05a7c6a3b35bca2e1dac9c0eb5075` tree `d7c682305829cbc2a8d0765f3ba8f4f0067a2812` 與候選相同。JS 1342：1340 pass、1 fail、1 skip（P4 bounded cow mortality 無死亡觀察，不是死亡驗收）、0 cancelled。Perl 與後續 pins steps 因 JS failure 未執行。清冊、18 組正式拒絕、fresh v2 九類負例皆通過。唯一失敗 subtest 735 是本線競爭測試成功 discard 後錯誤要求完整 disk map 不變；日誌顯示新增一組 reviewed-period-files-v1/<digest>/ 12 個檔案。固定來源 `r4-independent-period-disk-store.mjs` (81f79e8cccc5e395ff9b295d7d55f1118fb50db9) 宣告 immutable staged files 與 B43 slot 唯一 publication pointer；dev-local commit 先 preflight(stage)，再 CAS，故成功操作允許精確 successor materialization，而非任意 disk change。修正後先發布 gen1，競爭丟棄檢查唯一成功、完整舊檔不變、僅由 successor period.disk 逐檔計算的 SHA256 集合可新增，另用 store.verify 檢查 bytes/mtime/layout；不得提前新增 gen2 slot。競爭保存只允許 gen2 slot 新增，檢查 format/generation/world/digest；再分開測失敗 revision/generation 完整 snapshot 不變，並 exact restart。原 18 負例未放寬，runtime 未改。新候選待 CI；不宣稱跨程序或所有 preflight 失敗無 staging 副作用。

## 已確認整合候選 CI 綠燈（固定版本）
[45765900966](https://github.com/Prysline/akimono/actions/runs/45765900966) job 139726608654：HEAD `b40dec8bfd28f6e655e48f5068c5ba280d5513b8`，checkout `41808264862039019cacbed13d552ee63b1d8e91` tree `de0452748ce90c5367beeb327b35cba0397e8f65` 相同。JS 1342/1342、0 fail/skip/cancelled，Perl 85 檔 2456/2456、Result PASS，所有 DSL 與原版 pins 步驟成功。R1 CAS race 與 fresh replay 均通過；P4 實測 96 opportunities、1 death、4 cows、rev81→86 保存／合法復原。此綠燈屬固定前一候選，不替代新 HEAD。

## R1 checkpoint 內層隔離負例（待 CI）
新增 `r1-v2-inner-checkpoint.test.mjs`：真時鐘 genuinePlayer 合法礦石、130 次丟棄形成 checkpoint、兩代保存；僅在負向 case 讀取隔離測試目錄 key 重簽外層，必要時重簽 metadata，使 outer HMAC 通過，對 inner MAC、sourceFingerprint、interpreter、hashPolicy、drawPolicy、generation、anchor revision、origin 八個變體逐一 `verifyChain` 指定拒絕原因，再實際 HTTP load 由舊代復原、確認不覆寫 forged bytes，恢復原始檔後重啟 exact。白箱僅驗防禦分層，不表示玩家能存取 key，也不宣稱 key compromise 下安全；既有 P4/P5 無 key 攻擊證據仍保留。此測試尚未執行。
