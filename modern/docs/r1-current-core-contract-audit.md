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

## 已確認 checkpoint 內層隔離 CI
[45794612974](https://github.com/Prysline/akimono/actions/runs/45794612974) job 139821957733，HEAD `f7a2c520d9a17fe66a6b08ec02073f61bdf3a1f8`、實際 checkout `0493bf2b80b4bd0677bccb92a00af91eb84a6c72` tree `1e66142f265ff0af160c3176b5107f09b6399f77` 相同。JS 1343/1343、0 fail/skip/cancelled，Perl 85 檔 2456/2456，所有 DSL/pin steps 成功。subtest 737 通過，八條 R1_INNER_GUARD 診斷逐一核對：inner MAC、fingerprint、interpreter、hash policy、draw policy、generation、anchor revision、origin；外層驗證先通過，再獨立指定原因及 HTTP 回退。P4 256 opportunities 觀察1 death、4 cows、rev216→221。僅固定前候選結果，新 HEAD 需重驗。R1-HTTP-01 獨立 strict repro 尚未執行；本機重新測 Git DNS 仍無法解析。

## HTTP transport 負向補強（待新 HEAD CI）
重新閱讀正式 dev-local `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`：228–270 行 commit preview、history/preflight、jsonBody 4096 字元界線、JSON object 及安全整數；328–335 行 method/Origin；470–480 行 discard exact keys。新增既有 `r1-http-persistence-contract.test.mjs` 第三個 subtest：合法初始化/開店並保存後，以 /api/discard 對 12 組 transport/schema 拒絕驗證 exact 405/403/400、ok=false、完整 world/history/checkpoint/generation/磁碟 SHA256 不變，重啟 load 相同。包括 GET、foreign Origin、破損 JSON、null/array/string/number、超過4096字元、缺 count、boolean/unsafe count、null revision。測試 helper 新增 raw request；不改 production、既有 assertions 或新增測試檔計數。這不是瀏覽器 auth 或跨程序競爭證明，不宣稱量測 RNG。R1-HTTP-01 strict repro 仍獨立，未執行（本輪 git ls-remote DNS 失敗）。

## R4 B50 隔離 period／guild 磁碟契約覆核
[第十八批證據](r0-r4-b50-disk-ledger-evidence.md) 對應四份固定基線測試：原版實際 temp disk／受控兩期、guild income reset、stage/live 邊界、備份/關店/log/session 與 DataRead，原版第三 rename 與 Node 第四 rename 注入失敗後 recovery，Node receipt 拒絕 stage/已搬檔變更。此為 noncommittable 隔離 adapter；前置 IO 副作用不受正式 WorldState CAS 保證，不宣稱 v2/跨程序/斷電安全。#18/#16/#22 外部依賴不變。

第二十批：[R4 guildbattle END／rebel NOW](r0-r4-guildbattle-rebel-callback-evidence.md)，四檔有效；累計有效131、歷史32、待補70（163/233，70.0%），收斂後逐檔審閱100、既有待覆核56。兩 EVENT 追加單 key callback Oracle/Node 差分，人工外部狀態與 IO stub；83 詳細 rows、正式下界不變。新候選 CI 待驗；R1-HTTP-01 尚未實跑。

第二十一批：[R4 RebelRobin period→NOW](r0-r4-rebel-period-now-evidence.md)，四檔有效；累計有效135、歷史32、待補66（167/233，71.7%），收斂後逐檔審閱104、既有待覆核56。rebel 七 trigger/extension、八 period→NOW 人工同片來源差分，非完整 period/軍隊結算/17 EVENT/正式時間。83 詳細 rows、正式下界不變。第二十批 CI 45814598758 queued，新候選待驗。

第二十二批：[R4 公會檔案／邊界／會費](r0-r4-guild-files-fee-evidence.md)，五檔有效；累計有效140、歷史32、待補61（172/233，73.8%），收斂後逐檔審閱109、既有待覆核56。實際隔離 stage/live、原版注入第2 rename 與 Node 目標目錄阻擋第2 rename 的 recovery、舊 keys/mtime/malformed 來源觀測；單店 dues 只 EditGuildMoney call stub。非正式 v2/全域原子或玩家能力；83 詳細 rows、正式下界不變。新候選 CI 待驗。

### 第 23 批：混合 support／instant EVENT

- 新審 4 檔：有效 144、歷史 32、待補 57；固定分母 233，分類收斂 176/233（75.5%）；累計另逐檔審閱 113 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-mixed-support-instant-evidence.md)：四 support／六 theft 同程序 hash＋受控 RNG 差分；共用 Perl .t 另有 loto/happy/iron/sword/guildbattle/rebel 原版斷言，對應 Node 檔另審。83 詳細功能列及正式取得/HTTP/v2 下界不變。未執行本批本地測試，CI 待核。

### 第 24 批：R4 混合 EVENT 其餘五份 Node 差分

- 新審 5 檔：有效 149、歷史 32、待補 52；固定分母 233，分類收斂 181/233（77.7%）；累計另逐檔審閱 118 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-mixed-loto-happy-iron-sword-guild-rebel-evidence.md)：loto/happy/iron-sword/guildbattle/rebel 共 21 受控 cases；第23批共享 Perl probe/.t 已審不重複；人工 stock/active state、clock jump、single shop、stub IO，非完整 period/正式玩家/真 RNG/CAS/HTTP/v2。83 詳細功能列與正式下界不變。未本地重跑，CI 待核。

### 第 25 批：R4 時鐘分割／動態人口 PLUS

- 新審 4 檔：有效 153、歷史 32、待補 48；固定分母 233，分類收斂 185/233（79.4%）；累計另逐檔審閱 122 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-clock-population-plus-evidence.md)：九時鐘 partition cases；三人口、120秒、59 PLUS/79 slots sparse wire 受控差分；非正式跨期人口生成、合法取得或正式時間/CAS/HTTP/v2。不升格 79 商品個別功能，83 詳細 rows 與正式下界不變。未本地重跑，最新 CI 待核。

### 第 26 批：R4 SortDT pre-EVENT 單店排序

- 新審 2 檔：有效 155、歷史 32、待補 46；固定分母 233，分類收斂 187/233（80.3%）；累計另逐檔審閱 124 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-sorted-pre-event-evidence.md)：memory #10 買入/上架→受控 R3/R4 純 stage，Node R3 shop→原版 GetDTPoint/SortDT；單店點數差分、costtoday <1e-12、反轉 EVENT order fixture。null EVENT 負例傳錯 review 欄位，不獨立證明該 guard；未改原斷言。非原版整鏈、多店排序、正式跨期/玩家/CAS/HTTP/v2。83 詳細功能列及正式下界不變。未本地重跑，Git DNS 仍失敗，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第 27 批：R4 P3 pre-EVENT overlay／跨期與記憶體 CAS

- 新審 1 檔：有效 156、歷史 32、待補 45；固定分母 233，分類收斂 188/233（80.7%）；累計另逐檔審閱 125 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-p3-pre-event-overlay-evidence.md)：11 subtests，九 PARAM overlay、normal/crossing source 差分、20+40 秒同 Perl process、受控記憶體 CAS 兩次36h、隔離四檔 stage/recovery；人工 stock/clock/tape，非正式 HTTP/真時鐘/v2 reload。九 EVENT 已補既有差分層；83 詳細功能列及正式下界不變。未本地重跑，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第 28 批：R4 兩期財務 prefix（龍賽／爵位／會費）

- 新審 2 檔：有效 158、歷史 32、待補 43；固定分母 233，分類收斂 190/233（81.5%）；累計另逐檔審閱 127 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-period-all-finance-evidence.md)：同一 Perl process 兩期，實際隔離 drapay read/unlink、525/0 會費呼叫、攻防、爵位與完整 shop/town 差分；Node 每期讀取 Oracle input，非獨立連續提交。人工 stock/clock/draw、guild IO stub；不證真公會金庫/正式時間/HTTP/CAS/v2。83 詳細功能列及正式下界不變。未本地重跑；R1-HTTP-01 未實跑。

### 第 29 批：R4 龍賽檔案／兩期龍賽與爵位

- 新審 6 檔：有效 164、歷史 32、待補 37；固定分母 233，分類收斂 196/233（84.1%）；累計另逐檔審閱 133 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-dragon-period-evidence.md)：九龍賽檔案 cases、兩期龍賽及爵位 prefix；Perl 真隔離 drapay read/unlink，Node 純文字投影、每期重讀 Oracle input，非獨立連續提交。人工 stock/clock/rand、log stub；CAS 標題無 CAS 呼叫、legacy dignity 負例未隔離 guard；不證正式玩家／HTTP／v2。83 詳細功能列與正式下界不變。未本地重跑，Git DNS 失敗，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第 30 批：R4 店主缺席／兩期高 EXP 技術遺失

- 新審 6 檔：有效 170、歷史 32、待補 31；固定分母 233，分類收斂 202/233（86.7%）；累計另逐檔審閱 139 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-expiry-high-exp-tech-evidence.md)：九 expiry cases、嚴格12h/7d +1s 邊界；兩期原版真隔離 drapay、CloseShop call recorder（店鋪仍在）、高 EXP 18/24→19 遺失、38 保留、EXP4695→4409、8/6 draws。Node 每期重讀 Oracle input；人工 stock/EXP/clock/rand、guild/log IO stub，非真關店或正式玩家／HTTP／v2。新增四 ITEM 限定 Oracle/Node 詳細證據，87 詳細列、ITEM14/USE39/EVENT25；#38 僅保留分支，正式取得/HTTP/v2 下界不變。未本地重跑，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第三十一批：真 CloseShop／兩期結算

有效174、歷史32、待補27（206/233，88.4%）；收斂後逐檔補審143、原有分類重新覆核7（剩56）；候選新增5獨立計算。四份測試與兩份 probe 已逐檔實讀，見 [限定證據](r0-r4-real-close-evidence.md)。原版真隔離 session unlink、archive pre-zero 文字、status/money/rank 歸零、SortDT singleton prune；第二期 closed reference 仍結算 dragon1500、fee75、money1425、atk921，移除後不跑技術 rand。Node 每期 Oracle input，純投影；SetUserData/WriteErrorLog/EditGuildMoney 等外部呼叫記錄、DataWrite 未執行、備份尾段未跑。R1 詳細87，限定 ITEM14/USE39/EVENT25、正式取得/HTTP/v2 ITEM7/USE12/EVENT0 不變。CI29、30 本批查詢仍 in_progress，不繼承舊綠燈。

### 第三十二批：R4 關店封存磁碟／B50 串接

- 新審 3 檔：有效 177、歷史 32、待補 24；固定分母 233，分類收斂 209/233（89.7%）；收斂後另逐檔補審 146，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-close-shop-archive-evidence.md)：原版真隔離 CloseShop/WriteErrorLog 四例，新建、追加、30001 bytes 輪替、missing log 仍清零與 session unlink；SetUserData 原版 no-op。Node 真隔離 append/rename 與解碼文字差分，missing ENOENT；未測 30000 bytes 等值或跨檔原子性，輪替先於 context 驗證。B50 兩期 Perl 封存仍為 recorder，Node 每期 Oracle input、獨立 probe context，非兩期原版真磁碟差分或正式 WorldState commit。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，未本地重跑、R1-HTTP-01 未實跑；CI29–31 本批查詢仍 in_progress，新候選待驗。

### 第三十三批：R4 period 備份尾段／兩期真關店

- 新審 4 檔：有效 181、歷史 32、待補 20；固定分母 233，分類收斂 213/233（91.4%）；收斂後另逐檔補審 150，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-period-backup-full-tail-evidence.md)：兩期真隔離三代五檔 rename/copy、session strict mtime、MakeGuildFile recorder；joint probe 真 CloseShop/SortDT/drapay 及備份尾段，第二期 closed shop prune、draws4。人工 activeFiles 非 DataWrite 產物，Node 每期 Oracle input 純投影不寫檔；外部 archive/guild/log 呼叫記錄，缺世代、失敗/原子性未驗，不升格正式玩家。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑；新候選 CI 待驗。

### 第三十四批：R4 備份磁碟／DataWrite 及 DataRead

- 新審 4 檔：有效 185、歷史 32、待補 16；固定分母 233，分類收斂 217/233（93.1%）；收斂後另逐檔補審 154，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-backup-data-write-disk-evidence.md)：原版 backup prelude 3600s 嚴格 mtime、缺來源截斷／目的目錄錯誤後續仍 copy、lasttime 仍更新；blocked work stale generations。Node 真隔離兩期 rotation、preflight 拒絕，非中途 OS failure 原子性。DataWrite 原版兩次真單檔 stage/rename、同程序 DataRead reload 後人工修改；Node 窄序列化與真單檔 rename failure/recover/discard，不重算 point、非完整 period/鎖/CAS/v2。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑；CI29–33 查詢仍 in_progress，新候選待驗。

### 第三十五批：town／guildbattle END／play 磁碟

兩份待補轉有效：原版直接 END body 真隔離 guild/config/ledger read、兩次 DataWrite/DataRead，Node 真隔離讀檔及 town-only stage/rename/recovery；town map 比對不等於 hash order bytes，非完整 EVENT lifecycle、正式玩家、CAS 或 v2。Set/GetTownData key 不對稱保留原版行為。guildbattle 既有 Oracle/Node 層追加引用，詳細仍 87 項、其餘 133 項；正式下界不變。證據：[r0-r4-town-play-evidence.md](r0-r4-town-play-evidence.md)。R0 有效187、歷史32、待補14（219/233，94.0%）；收斂後逐檔補審156，既有重新覆核7，剩56；候選新增5獨立。

### 第三十六批：UI 靜態回歸／原版 world 讀寫及提交

- 新審 5 檔有效：有效192、歷史32、待補9；固定233，分類收斂224/233（96.1%）；收斂後逐檔補審161，既有重新覆核7，剩56；候選新增5獨立。
- [逐檔證據](r0-ui-world-read-commit-evidence.md)：UI 為靜態字串/CSS/handler wiring，非瀏覽器或 HTTP/CAS；原版 DataRead 真隔離檔，非數字保留、缺 // / CRLF sentinel 需 alarm、duplicate ID 覆蓋及缺 payload 接受。DataWrite 無店 stage，人工 stock 變更，未 commit；DataCommitOrAbort 真隔離 rename、第二次注入失敗後 recovery、原版 selector wildcard，非多檔 atomic。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑。

### 第三十七批：人工 world USE 序列／市場與批發來源

- 新審3檔有效：有效195、歷史32、待補6；固定233，分類收斂227/233（97.4%）；收斂後逐檔補審164，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-world-use-market-fixtures-evidence.md)：兩次人工 A/B/C USE 同 interpreter 但重建 state、各次 seed，真原版 lostbook、wholesale/callback/EXP 順序；人工 #10 市場統計與 sc-s CGI，時間先於拒絕，commit/IO stub；人工批發定價/limit、#20/#25 手填 DSL 數值非 compiler 或合法取得。非正式玩家、HTTP/CAS/v2/Node 差分；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。

### 第三十八批：peer trade 純投影／B-32 人工 USE 差分

- 新審2檔有效：有效197、歷史32、待補4；固定233，分類收斂229/233（98.3%）；收斂後逐檔補審166，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-peer-use-fixture-evidence.md)：peer #1/#40/#79 純記憶體投影，無 CAS；人工 stock/tax/time/RNG，非售完非法 rank -1 仍保留。B-32 三組兩步 Perl/Node、synthetic A/B/C、同 adapter 連續 CAS；shortage/time-gate 標題實際 COMMITTED、spoof 只改 worldId、no IO 只查 metadata、JSON 非 v2。無正式玩家、HTTP/v2；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。

### 第三十九批：R2 declarative／unified USE

- 新審2檔有效：有效199、歷史32、待補2；固定233，分類收斂231/233（99.1%）；收斂後逐檔補審168，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-r2-declarative-unified-use-evidence.md)：69 distinct recipe IDs 受控 Perl/Node、人工材料/EXP/job/time/draw，並非合法取得；#26/0 僅 metadata/drift。Unified #79 六例只驗 probe 長度，#14 六分支逐值差分、受控初始券換地圖、memory CAS 拒絕；非完整 compiler/CGI/HTTP/v2。R1 逐項尚待另行連結，詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 暫不變。

### 第四十批：R3 natural sale／五劍取得販售，分類收斂完成

- 新審2檔（1有效、1歷史）：有效200、歷史33、待補0；固定233，分類收斂233/233（100%）；收斂後逐檔補審170，既有重審7、剩56；新增5獨立。不是全量重審或 R0 結案。
- [逐檔證據](r0-r3-natural-sword-sales-evidence.md)：原版 24 stock/display＋24 price＋24 pre-EVENT＋16 multi-shelf，人工 stock／固定 draw；單架 draw 只 <= 原版總量，多架精確 natural，整合才比全79 wholesale及總 draw；#70 有 owner 只 Perl。五劍 Node 合法來源路徑受控 memory CAS，但使用舊時間命令與真隔離 legacy v1（重載非新 process），非正式 HTTP/v2 或逐劍完整原版差分。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 暫不變。
- 下一步：重新逐檔覆核剩餘56份原有分類；完成後逐項補 R1 14層，R5 仍只規劃。

### 第四十一批：B44–B47 既有分類重新覆核

- 八檔既有有效分類維持：有效200、歷史33、待補0；固定233、分類100%；新逐檔170，既有63重審15、剩48；實際逐檔累計185/233（79.4%）。
- [逐檔證據](r0-b44-b47-rereview-evidence.md)：B44 原版 ledger 79槽但77槽人工9999，#10/#79 手填 cap；B45 原版 prize callback＋AddItem/排名計數，ITEMNO regex 代換，WriteLog stub，JS no-op DSL mutation 不算 drift；B46 同 Perl interpreter 兩次無領袖 territory，Node 每次 Oracle input、非兩期完整結算；B47 單店 SortDT/GetDTPoint 四例，two-sales 人工帳。均非正式 HTTP/v2/CAS、完整 period。R1 詳細87與限定/正式下界不變。

### 第四十二批：B41–B43 既有分類重新覆核

- 五檔既有分類維持（3歷史、2有效）：有效200、歷史33、待補0；固定233、分類100%；新逐檔170，既有63重審20、剩43；實際逐檔190/233（81.5%）；候選新增5獨立。
- [逐檔證據](r0-b41-b43-rereview-evidence.md)：B41 30/60m source #10 買/展示/售、原版 commit/auth/IO stub、自然區段接 PLUS 非全 period；清架測試只驗 stale。B42 同 memory/原版兩次買售，legacy HTTP 實際先買2再售2次、partial EVENT 後拒再買；near clone 跨期拒絕未驗 clone 不變。B43 真隔離 legacy v1 雙槽與子程序重啟，memory schema v2 不等於正式磁碟v2；B54 仍固定 clock；stock/負 itemtoday 合併拒絕，未重算 checksum；reset/symlink 負例僅歷史路徑。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變，R5 未啟動。
- 第36–41及前 HEAD CI failure 已於 `6d3a293` 記錄並修復11個 evidence heading；修正 commit CI 45844518410 查詢時 queued；新候選待驗。R1-HTTP-01 strict repro 未實跑。

### 第四十三批：B48–B49 既有分類重新覆核

- 四檔有效分類維持：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審24、剩39；實際逐檔194/233（83.3%）。
- [逐檔證據](r0-b48-b49-rereview-evidence.md)：五／六個單 synthetic EVENT、固定 time/draw，原版 START 與 END/START region；strict expiry equality、group、duration、draw count；無真 callback/NOW/period/world IO/HTTP/CAS/v2；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 第42批 CI 45844865477/job139995779986 success，實際 checkout `27f4fd45e9d915167057664e50cc89e3d4d006e0`，與 `50528dd` compare files=[]；JS1350/1350、0 fail/skip/cancelled，Perl2456/2456（85檔），DSL/source pins 通過；tree SHA 來自前 PR metadata，未獨立取 tree。新 HEAD 待驗；本機 Git DNS 仍失敗，strict repro 未實跑。

### 第四十四批：B50–B52 既有分類重新覆核

- 五檔維持4有效1歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審29、剩34；實際逐檔199/233（85.4%）。
- [逐檔證據](r0-b50-b52-rereview-evidence.md)：B50 Perl 同程序兩期前綴，Node 每次 Oracle input；repo 未傳 projector，不是真 CAS 拒絕。B51 真 memory CAS/legacy disk bootstrap，不是正式 v2 或期末；clockShift 負例同時缺 writeSource。B52 原版 seed/單句與 scalar handle，非真磁碟或實際 EVENT。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- #24 三個補件檔與 #26 blob SHA 全相同，#23 registry audit script 相同，audit/repro/test/R5 plan 有差異仍須語義比對。第43批 CI 45849759031 查詢時 in_progress；本環境 git ls-remote 仍 DNS failure，strict repro 未實跑；新 HEAD 待驗。

### 第四十五批：B54–B56 既有分類重新覆核

- 四檔維持1有效3歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審33、剩30；實際逐檔203/233（87.1%）。B56 重疊唯一列。
- [逐檔證據](r0-b54-b56-rereview-evidence.md)：B54 local deterministic replay 非 Perl RNG；B55 十例直接 callback、人工 stock/draw、memory CAS 與 legacy disk；B56 反轉17-key fixture，非 Perl hash order，實際受控 CAS/拒絕、舊存檔、prefix retry；null state 負例未隔離其他 review 參數。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 第43/44批 CI 45849759031/45851995042 查詢時仍 in_progress；未本機重跑、strict repro 未實跑；新 HEAD 待驗。

### 第四十六批：B57–B58 既有分類重新覆核

- 四檔維持2有效2歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審37、剩26；實際逐檔207/233（88.8%）。
- [逐檔證據](r0-b57-b58-rereview-evidence.md)：B57 十一例、兩 callback、受控CAS；B58 十五例獎級/邊界、合法 memory market 買券、人工 draw/legacy reload，整合 expected 為 Node projector，不是同 world Perl 全差分。非正式 HTTP/v2/自然RNG；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 第43批 CI 45849759031/job140012737260 success，checkout `f0b67b86d33cabb85c23cd60658909efca6a449c` 與 `59d07e9` compare files=[]；JS1350/1350、0 fail/skip/cancelled、Perl2456/2456（85檔），DSL/source pins 通過。candidate tree 已知，checkout tree未單獨取得。第44/45批仍 in_progress；strict repro 未實跑；新 HEAD 待驗。

### 第四十七批：B59–B60 既有分類重新覆核

- 四檔維持2有效2歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審41、剩22；實際逐檔211/233（90.6%）。
- [逐檔證據](r0-b59-b60-rereview-evidence.md)：B59 5案 END/START、全79 numeric PLUS、手組 modifier；B60 9案真 temp event-n file 與 NOWFUNC、手工組裝非全 compiler；連續 memory CAS 有效受控證據，負例 pure apply 不是真 CAS；固定 clock/draw/order、legacy reload 非正式 v2。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 本輪 git ls-remote 實際 DNS failure，未本機重跑；第44/45/46批最後查詢尚未完成，新 HEAD 待驗；strict repro 未實跑。

### 第四十八批：B61–B63 既有分類重新覆核

- 六檔維持3有效3歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審47、剩16；實際逐檔217/233（93.1%）。
- [逐檔證據](r0-b61-b63-rereview-evidence.md)：B61 真 PARAM compiler fragment/人工200木刀 buyer prep，Node #10 店只 preview；B62 #14 market/use得10#40，Node active/normal sale 5vs2，非原版獨立售出差分；B63 六種 first-use 受控 Perl/Node 差分，真 memory acquisition，legacy save、未上架五劍持有，非全部正式取得/銷售。B62/B63 負例多位於 already-used/EXP20 state，未隔離各 guard。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- B41–63 的 #24 42列既有證據完成本輪重新覆核；仍需其他16檔與 #23 全語義收斂，未結案。新 HEAD 待驗，strict repro 未實跑。

### 第四十九批：Core／市場／歷史 HTTP／來源稽核

- 六檔維持3有效3歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審53、剩10；實際逐檔223/233（95.7%）。
- [逐檔證據](r0-core-market-legacy-http-rereview-evidence.md)：B31 舊 memory contract；共用 market 36歷史/3普通/16動態/P5 16案、BASE quote、synthetic hook、人工 carryover/資產、legacy disk；P1/P2 真 HTTP 子程序/重啟但固定 clock/RNG/legacy checksum；P5 Perl 零價書籍16案、IO stub；DSL structure 不代表 runtime。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 剩餘 P3 9檔及 R4 reviewed-time HTTP history 1檔；新 HEAD 待驗，strict repro 未實跑。

### 第五十批：P3／R4 HTTP 與 v2 證據

- 10 檔逐檔重新覆核（均有效），固定基線 233/233 完成逐檔審閱；有效 200、歷史 33。170 份新審閱、原 63 份全數重新覆核。分類不等於全功能驗收。
- 詳見 `modern/docs/r0-p3-r4-http-v2-rereview-evidence.md`；正式 HTTP/CAS/v2、固定起始時鐘及伺服器 RNG，不升格真玩家；#66/3 實售/lostbook 與條件 FUNCTURN、多架時間拒絕、歷史 checkpoint 與跨期負向回復各自限縮。R1 詳細 87/220 暫不變，#23/#24 語義收斂及 R1-HTTP-01 strict repro 未結案。新 HEAD 待 CI。

### 第五十一批：#23/#24 證據去重核對

- `modern/docs/r0-r1-pr23-pr24-reconciliation.md`：#23 11路徑、#24 3路徑逐項收錄核對；233 pins/220 declarations、舊 known flags/evidence 保留，補回6檔9筆舊文件引用，B56 僅計一次。#24 42列 status/realPlayer/blob 一致，三補件 blob 相同。兩 PR 不關閉，待新 CI 與使用者/D 決定。
- #44/45 CI 45851995042、45852340690 success，job 140020465192/140021659118；checkout compare files=[]；JS1350/1350、Perl2456/2456，無 fail/skip/cancel；tree 未獨立取得。R1-HTTP-01 未實跑，87/220 詳細列暫不變，新 HEAD 待驗。
