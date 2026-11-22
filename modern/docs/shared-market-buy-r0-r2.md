# R0／R1 範圍紀錄與 R2-A～E 現況｜共用市場、交易、商品使用

**2026-11-23｜R3 受控來源退出驗收已完成（最新正式判定）。** 單店單架、原版六商品 #10／#40～#44 的來源定價／需求／GetSaleTax、自然販售、ITEM FUNCTURN／FUNCSALE、59 PLUS 與時間片已收斂共用核心；真 Perl 原版直接差分 24+24+24 案與 HTTP/CAS/雙世代存檔／重啟通過。正式 `projectR3PreEventTurn` 不覆寫 `period`、對未知 incoming EVENT fail-closed，供 R4 串接。**不能由 R3 完成推出玩家已能無限制連續販售**：正式 B-41 時間若未跑 EVENT，後繼事件仍是 `null`；EVENT 17-key Perl hash、SortDT、36h 期末屬 R4，R5 完整閉環及其他 USE 未完成。舊 R3「部分完成」記錄均為歷史；驗收與界線以 [R3 退出清冊](r3-exit-audit.md) 為準。

**2026-11-23｜R3 六商品販售原版定價／稅額擴充：** 共用 `projectSharedNaturalSale` 從「固定原價」擴充到來源 `sc-s.cgi` 的 1～200% 定價；同一個來源支援的 #10、#40～#44 共用販售需求、價格懲罰、供需、售量、人氣與 `item.cgi::GetSaleTax` 超價附加稅，賣出總額與扣稅後入帳分開，`taxtoday` 更新。`shared-showcase-price.mjs`、來源審閱、`POST /api/showcase`、繁中 UI 與 B-43 兩代存檔接受合法來源百分比，拒絕任意造價和 201%／多餘欄位；原價 `priceOverride` 只保留測試相容。新增原版 Perl 6 商品 × 4 比例 24 組差分、原版直接「自然販售 → ITEM FUNCTURN/FUNCSALE → 59 PLUS」6×2×2 整合探針、標記稅額與需求原始碼 drift，以及真 HTTP 150% 稅額→保存→重啟。**完整 R3 退出仍須以最後同 SHA CI、EVENT 前置語義與合法連續經營驗收確認；EVENT 全生命週期與 36h 期末屬 R4，不可把未知事件當作無事件。**

**2026-11-23｜R3 ITEM 回呼分派與一分鐘抽樣（受控新增，整體未結案）：** 已在來源自然販售與 59 PLUS 之間加入依原版 `inc-turn.cgi` 審閱的 ITEM FUNCTURN／FUNCSALE 階段：標準街唯一 #70 回呼即使沒有持有者，60 秒仍會消耗一筆 rand(1)；並於 FUNCSALE 後清除 `_sale_count_` 暫存。原版 Perl 直接分派探針 `original-r3-item-callback-stage-probe.pl` 與 Node 差分已新增，真 HTTP 一分鐘／存檔重啟測試亦已補上；其他來源回呼或 #70 真持有仍拒絕。EVENT 17-key hash 順序、SortDT／36 小時結算、全部 USE／多商店尚未完成，R3 不宣告結案。


**2026-11-23 市場貨架修正／R3 續驗：** 已依凍結原版 `whole.cgi::GetWholeStore` 將一般市場清單改為只顯示 `wholesale>0` 商品，原版 79 ITEM Registry 另供倉庫名稱查詢；缺貨品不再佔據市場貨架，原本的 `market-buy` 報價、上限、CAS、PLUS 不變。R2-C 新增直接執行原版 `GetWholeStore()` 的 HTTP 貨架與排序差分，R3 真時間＋PLUS、重啟後在售貨架與庫存同步回歸；本修正不代表 EVENT／FUNCTURN／FUNCSALE 或 36h 結算完成。

## 2026-11-22｜最新權威：R3 共用自然販售／時間「受控部分完成，未達退出條件」

**現況與下一步（優先於下方 R2-E 歷史快照）：** R2 A～E 仍為原本受控完成；R3 新增來源審閱六商品（#10、#40～#44）共用自然販售算式與 24 組真 Perl 原版差分、真實 #14 地圖 BUY→共用 USE 五劍→同一販售入口、現有繁中 HTTP 上架／CAS／雙世代存檔／實際重啟續營測試。新程式：src/shared-natural-sale-core.mjs；更新 src/original-b41-playable-sale.mjs、src/standard-street-module.mjs、scripts/dev-local.mjs、local-ui 與 local-world-save-store。測試：tests/original-perl/original-r3-shared-sale-probe.pl、tests/r3-shared-natural-sale.test.mjs、tests/r3-shared-sword-acquisition-sales.test.mjs、tests/r3-real-sword-http-restart.test.mjs。原有市場買入、USE 與原版來源 SHA 未更動。

**界線／不宣告結案：** 真原版完整時間執行的 FUNCTURN／FUNCSALE、EVENT 與 17 個 Perl hash 順序、跨期決算、多商店／街道差異、非原價與其他回呼尚未驗證。現存 B-41 時間仍只計算來源自然販售＋PLUS 子區，執行後 eventState:null 表示未知事件，不能當成沒有事件；B-56 僅為明示 EVENT 順序 fixture。B-54 可重播亂數是本機政策，不是原版 Perl rand。R0／R1 **只補了本輪必要範圍**，全量未完成；R4 EVENT／36 小時期末、R5 閉環不可假稱完成。本輪僅在 test/task02-baseline-on-s1 的 modern/ 修改，PR #1 保持 Open／Draft、基底 migration/standard-street-s1，未修改 Notion 狀態。

**R3 新來源與 R0 清冊：** docs/r3-shared-natural-sale-source-contract.md；docs/r3-r0-affected-tests-mapping.md。下一工作窗優先：核對並實作完整 R3 回呼／EVENT 前置語義及可執行 Perl Oracle；對未知語義嚴格拒絕並保留 R4 跨期責任，不重做 R2。下方所有標示「最新權威：R2-E」段落僅為歷史記錄，非當前 R3 下一步。


## 2026-11-22｜最新權威：R2-E 真 HTTP／USE／存檔整合驗收（R2 A～E 受控範圍完成）

**R2-E 退出條件結案總表：** 真 Perl/Node/HTTP 商品 #10/#11/#14/#39 與 #79/#14 USE、WorldState/CAS／雙世代存檔／重啟／來源拒絕、R0 受影響映射、唯一 GameCore 算法及同 HEAD CI。R2 全項 A～E 只對此受控範圍結案。

**階段結論：R2-A、R2-B、R2-C、R2-D、R2-E 已各自完成退出驗收，因此 R2 共用市場／交易／商品使用及製作受控範圍結案。R0／R1 全量、R3 共用自然販售／時間、R4 EVENT／36h 期末、R5 綜合經營閉環、其他街道／多人及整款遊戲均未完成。** 本段是最新權威，優先於下方所有「R2-E 未完成／下一輪做 E」歷史快照。僅修改 `test/task02-baseline-on-s1` 的 `modern/`，PR #1 始終 Open／Draft／未合併、基底 `migration/standard-street-s1`；凍結原版 Perl／DSL／Core SHA、其他分支及 Notion 正式任務沒有改動。

**R2-E 的真實程式：** `scripts/dev-local.mjs` 讀入經固定來源審閱的 `use.cgi`、`core-inc-item.cgi`，完整啟用 B-63 首次 #14 地圖五劍及 `lostbook` 回呼；新增 `POST /api/use` 僅接受 `expectedRevision,itemId,useId,requestedCount` 四欄，內部固定單店 `shopId:1`，由 GameCore **唯一** `kind:'use-item'` 流程執行 UseItem、MakeAmount、時間、金錢、材料、EXP、callback、原版市場修正與 CAS。HTTP 不收 `randomDraws`、`kind`、商品專用命令、額外 callback；`local-source-command-draws.mjs` 以 worldId／revision／時鐘／命令及參數域隔離產生原版所需的 0～999999 整數百萬分之一樣本，按原版前回呼嚴格消耗 52（正常）或 12（加倍）筆；這是本機穩定樣本政策，**不是**偽稱 JS 與 Perl 亂數 seed 相同。僅測試環境以環境變數選真 Perl probe 已知的固定樣本，玩家不能透過 HTTP 控制。

**繁中可操作 UI：** `local-ui/index.html`／`app.js` 的「自店→倉庫」新增來源審閱的 #79 禮物卷交換與 #14 劍市地圖首次使用表格，依 `GET /api/state.useOffers` 渲染材料、金錢、時間、能力限制及拒絕原因，使用按鈕送四欄到 `/api/use`。`standard-street-module.mjs::listUseOffers` 僅從真正 `useItem.getRule` 產生唯讀狀態，不在瀏覽器複製 UseItem／MakeAmount。R2-A/B/C 的 `market-buy`、79 ITEM 真來源市場報價與動態 BASE 價格、HTTP 與單一 GameCore 買入路徑原封不動保留。

**B-43 真世界持久化：** `createLocalWorldSaveStore({directory,marketBuyRegistry,useItem})` 在明示注入已審閱 #79 規則、確證來源材料 2 卷和三張地圖的前提下，准許原初 5 卷依合法使用變 3／1 卷；對 #9、#12 地圖仍有來源下限校驗，拒絕其他數量與未知效果。未傳 `useItem` 的舊存檔 API **維持原版 5 卷嚴格預設**；#14 EXP／五劍上限、雙世代 SHA256、fsync、rename、generation CAS 與備援全部保留。來源非法的 4 卷存檔即使重算正確 SHA256 也會拒絕，落回有效的前一世代。

**真正原版 Perl／Node／HTTP 證據：** 新 `tests/r2e-source-buy-use-http-save.test.mjs` 在真實本機 HTTP 世界先執行原版合法 PLUS 供貨、由同一 `market-buy` 購買 #39／#10／#11／#14（#14 真 BASE 動態價），再使用原版開店贈送的 #79 交換三種地圖並首次使用 #14 產製五劍；直接執行真原版 `original-gift-map-use-probe.pl` 和 `original-b63-sword-map-all-outcomes-probe.pl` 逐欄比對有效數量、物品消耗與產出、金錢、行動時間、EXP、回呼、損毀與亂數消耗。另以真 HTTP 的 doubled-loss 加倍與地圖損毀情境比 Perl；測非法 USE／額外欄位／過期 revision／二次使用均世界和存檔零變動。兩代存檔、關服、重啟、載入、再次 USE／買入、generation 衝突、帶合法雜湊但來源非法的存檔回復均有實測。先前 R2-A 36 原版組、R2-B 商品／動態價格、R2-C HTTP 買入、R2-D #79／#14 六＋六直接 Perl 差分全部保留。

**R0 受影響測試處置：** 新 [`r2e-r0-affected-tests-mapping.md`](r2e-r0-affected-tests-mapping.md) 完成 R2 受影響的「真實路徑／原版來源／回歸風險／保留、改寫或新增／替代測試／理由」逐檔映射，65 個 Node 測試檔與無關領域皆有分類、52 個原版 Perl `.t` 的 1,867 斷言全數保留。這只是 R2 受影響範圍的 R0 清冊，**不等於 R0 全量結案**；R1 只完成 `market-buy`／`use-item` 可執行子契約，完整 R1 尚未結案。

**安全邊界及下一窗：** #14 第二次使用的 EXP 縮時、其餘尚未審閱的 USE、未知 GET 亂數／回呼、EVENT overlay／公會、多店、溢出修正、完整市場回補與 36h 決算仍明確拒絕；不可稱全部 116 USE、79 商品或整款遊戲已移植。下一正式工作包是 R3 共用自然販售／時間（以 #10、#40、#41～#44 等真來源驗證），後續 R4 EVENT／期末與 R5 整合；先重新查 GitHub 當下 HEAD／PR Draft／同 SHA Push 與 PR CI，讀本文件及其餘五份權威文件頂部與 R0 清冊，避免依舊歷史狀態誤判。

**同 SHA 驗收原則：** 程式版 `8ea9b6c8c8b0ecdaff2b0556871e2af46eecc4de` 的 [Push #45030184667](https://github.com/Prysline/akimono/actions/runs/45030184667) 及 [PR #45030188274](https://github.com/Prysline/akimono/actions/runs/45030188274) 已 `completed/success`，Node 924／924、真 Perl 1,867／1,867（52 檔）、DSL／Core SHA 稽核成功。**此為文件提交前的程式基準**；完成六文件和 PR 更新後，必須再次以文件後最終同一 HEAD 的 Push／PR Actions `completed/success` 才能作正式最終驗收，不能沿用程式版的舊綠燈。

---


## 2026-11-22｜R2-D 共用 USE／製作驗收交接（最新權威狀態）

**定位：** R2-A/B/C 買入部分結案證據不變；本節補 R2-D 真正共用 USE／製作退出證據，R2-E 為下一獨立工作包。

**正式判定：R2-A、R2-B、R2-C、R2-D 已各自完成，R2-E 未完成；R2 整體、R0／R1 全量仍未結案。** 本節取代本檔下方「R2-D 未完成／下一步做 R2-D」歷史快照。唯一工作分支 `test/task02-baseline-on-s1`；只改 `modern/`；[PR #1](https://github.com/Prysline/akimono/pull/1) 必須保持 Open、Draft、未合併，目標 `migration/standard-street-s1`；凍結原版 Perl／DSL／Core SHA、其他分支、Notion 正式任務未修改。

**R2-D 正式入口與分工：** `GameCore.applyGameCommand` 僅以 `kind:'use-item'` → `src/shared-use-item-core.mjs::projectSharedUseItem` 執行 USE，欄位為 `expectedRevision,shopId,itemId,useId,requestedCount`，需要亂數時另給 `randomDraws`（原版順序、每筆 0～999999 的百萬分之一單位）。StreetModule `useItem.getRule/describe/validateWorld/writeMarket` 提供來源編譯 USE 規則及明示回呼／不支援原因，GameCore 不依商品 ID 複製 USE 公式。共用路徑處理 GetUseItem／CheckUseItem 檢查及原版數量裁切、money／paytoday、UseTime、依序消耗材料與 MakeAmount 產物、CheckWholeStore／市場、來源前後回呼、EXP；WorldState／CAS 原子提交，失敗不修改世界。原有 `market-buy` 唯一買入路徑保持不變。

**真原版覆蓋：** #79 禮物卷 USE #0「交換地圖集」每次用 2 卷，產出 #12、#9、#14 各一，1800 秒、金錢與 EXP 為 0；要求量 3 時會被手上 5 卷裁成 2 次。#14「到劍市的地圖」僅審閱首次 USE #0：12000 G、7200 秒、EXP[14]+20；五種劍 #40～#44 按原版 GET 各 10 次、機率 400/350/150/60/30‰。前回呼 `rand(1000)<=100` 可將產物基數加倍，正常逐件 MakeAmount 對應 50 個產物亂數，加倍改為每組兩個亂數的原版平方根運算；末端 `lostbook` 是 `rand(1000)<100` 消耗一張地圖。兩個回呼合計一般 52、加倍 12 次 rand，100/1000 邊界**加倍、不損毀**。缺 B-63 已審閱 helper 時只容許 B-62 不加倍／不損毀／僅木刀的保守分支。

**真正去重與安全邊界：** `gift-exchange-maps`、`use-original-sword-map-14`、`use-original-sword-map-14-all-outcomes` 三種舊正式命令與 StreetModule dispatch 已移除，`projectReviewedGiftMapUse`、`projectOriginalSwordMapUse`、`projectOriginalSwordMapAllOutcomes` 商品專用執行器已刪除，沒有留下執行不同公式的 alias；保留來源審閱器與原始 Perl 探針。非法 ITEM／USE、缺券、金錢／時間不足、過期 revision、未知 callback／EVENT／公會、未審閱機率／抽樣數、二次地圖熟練縮時、庫存／批發溢出與未知效果均 fail-closed，既不默默忽略也不部分寫入；**不是全部 116 USE 均已通用**。

**驗收證據：** `tests/r2d-unified-use-item.test.mjs` 與原 B-33／B-34／B-37／B-62／B-63 測試已使用同一 `use-item`；真凍結原版 Perl `original-gift-map-use-probe.pl` 六案例與 `original-b63-sword-map-all-outcomes-probe.pl` 六情境對照產物、材料、金錢、時間、EXP、回呼、損毀與亂數消耗，所有原版 Perl 差分檔與 R2-A/B/C 買入、CAS／存檔、DSL／Core SHA 測試保留。**程式版本 `f9f578000af135928e3f16283cc7b76eefd2aa53`** 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/45025885748) 和 [PR CI](https://github.com/Prysline/akimono/actions/runs/45025890130) 都 `completed/success`，**Node 921/921、原版 Perl 1867/1867（52個.t）、全部來源 SHA 成功**。此處是文件更新前的可追溯成功基準；文件更新後**仍必須對新 HEAD 重新驗收同一 SHA 的 Push／PR CI**，不能把舊綠燈冒充最終驗收。

**R2-E 無記憶下一窗：** 先重新查 PR #1 最新 HEAD、Draft／Open／未合併狀態、同 HEAD Actions 與上述六份文件頂部；只在工作分支的 `modern/` 開發。以現有 `market-buy`、`use-item` 為單一路徑，補真實繁中 UI／HTTP 共用 USE，將合法來源市場供貨→買入→#79 交換／#14 首次製作→同一 WorldState CAS→B-43 雙代落盤→關服重啟再載入再操作打通，補真原版 Perl／Node、R0 逐項測試映射與 R1 缺口；不因已有 R2-D 數值差分就宣告 R2-E、整體 R2 或 R0／R1 全量完成。未知 EVENT／回呼／二次 USE 維持拒絕。

---


## 2026-11-22｜R2-C「買入執行路徑與測試遷移」正式結案（最新權威狀態）

**R2-A、R2-B、R2-C 已各自完成退出驗收；R2-D 共用 USE／製作、R2-E 真世界整合尚未完成，R2 整體未結案；R0／R1 全量未結案。** 本節是最新程式與測試的權威現況，覆蓋下方保留的「R2-C 未完成、舊專用交易仍在使用」歷史段落。僅修改 `test/task02-baseline-on-s1` 分支下的 `modern/`；Draft PR #1 維持 Open／未合併，基底 `migration/standard-street-s1`；原版固定 Perl／DSL、原 Core 測試快照及 SHA 稽核、其他分支、Notion 正式任務未改。

### 已完成：市場買入只有一條可執行路徑

- **GameCore：** 正式商品市場購買全部為 `applyGameCommand({command:{kind:'market-buy',expectedRevision,shopId,itemId,requestedCount,marketShelf,expectedPrice}})` → `projectSharedMarketBuy` → WorldState/CAS。Core 不含 Standard Street 商品 ID，也不依賴原版 Perl 執行器；凍結來源規則保留於 StreetModule 的 Registry。所有 `buy-market-item-10/11/14` capability 與 StreetModule.apply 分派**已刪除**，送出舊命令會是 `UNSUPPORTED_ACTION`，不可能作為第二套正式成交。
- **去重：** `src/original-market-buy10.mjs`、`src/original-market-buy11.mjs`、`src/original-b62-sword-map-acquisition.mjs` 的 `projectOriginalMarketBuy10/11/14` 與 `quoteOriginalMarket10/11/14` 已移除；**保留**凍結原版來源審閱、樂透事件依賴、#14 地圖 USE 與原版差分探針。沒有新建隱藏別名或複製同款交易演算法到 HTTP 或 UI。
- **同源報價：** `streetModule.quoteMarketOffer(world,itemId)` 和 `listMarketOffers(world)` 從 R2-B 的同一 `marketBuyRegistry` 導出 79 筆宣告順序、名稱與 ID、原版貨架、持有／批發存量、LIMIT、真實市場價格和 `GetTimeDeal` 時間，以及不支援的具體分類／來源原因。#14 的 `BASE 50/150` 動態價格不再由特殊固定價報價函式覆蓋。來源無效／缺貨／商品回呼／非零全域回呼等按既有安全邊界處理。
- **繁體中文瀏覽器 UI：** `local-ui/index.html` 與 `local-ui/app.js` 真正依 `marketOffers` 動態渲染原版 **79 件商品**（不代表全部可交易），每件實際報價、買入量、可操作狀態與來源拒絕原因。實際按鈕提交選中商品 `itemId`、市場 `shelf`、實際 `expectedPrice`、`requestedCount` 與 `revision`，不再只有 #10 寫死一列，也不在瀏覽器另算售價／成交量。
- **HTTP API：** `scripts/dev-local.mjs` 的 `POST /api/buy` 僅接受上述五個交易欄位，嚴格拒絕舊固定商品／多餘欄位，並**只**呼叫共用 `market-buy`。 `GET /api/state` 回傳 79 件 `marketOffers` 而非原單一 `item10`。買入帳務、貨架過期、現金／持有裁切、原版完整 79 欄稀疏 CSV、全域回呼時序皆由既有單一 GameCore 驗證，HTTP 不產生第二套決策公式。
- **真實存檔：** 本機服務 `createLocalWorldSaveStore({directory,marketBuyRegistry:streetModule.marketBuyRegistry})` 使用相同來源驗證，故 #39 等新增普通商品可透過 HTTP 磁碟雙世代落盤、停服、重啟、載入後繼續買入，保留 WorldState/CAS revision 和原版 CSV；未注入 Registry 的舊 B-43 API 仍維持嚴格預設拒絕，存檔雜湊與備援機制未放鬆。

### 驗收證據與安全邊界

- `tests/r2c-unified-market-http.test.mjs` 為**新增真實本機 Node HTTP E2E**：讀繁體中文頁與 JS、驗證 79 筆來源報價、#10／#11／#14／#39 原版合法供貨後通過**同一條** `POST /api/buy` → `market-buy` → CAS；核對真實動態價格、資金／paytoday、數量、庫存、批發 CSV、revision，拒絕過期價、舊格式、缺少商品 ID、CAS 過期；再以 B-43 存檔、停止服務、重啟、載入、二次買入和第二代存檔證實真實持久化。
- `tests/market-buy-core.test.mjs` 明確驗證三件舊商品命令已不受支援、沒有第二套投影函式、三商品正式報價皆來自 Registry、拒絕不改世界。舊 Perl 來源探針與 R2-A **36 組** Oracle 保持原樣（#14 漏編 BASE 的歷史測試例外只在測試隔離 adapter）；R2-B #12/#14 **16 組** 真原版動態 `buy-s.cgi`，#39 三組來源成交／拒絕，#1/#14 多庫存 `BASE` 真 Perl 時價差分均保留；B-40／B-41～B-43／B-55～B-63 原有營業、事件、LOTO、#14 USE、Perl／Node／HTTP 證據遷至單一買入入口而非刪除。
- **已發現並守住的界線：** 原 B-41 僅依「#10 固定5000、#11 固定2000」推算 `paytoday` 模數；現在只在沒有已審閱 B-62 來源地圖的情境保留該舊門檻，避免誤拒**真實 #14 BASE 動態進貨→USE→木刀販售**。但原版 `advance-source-time` 的 EVENT 內容未經完整回呼審閱時，`period.eventState` 將設為 `null`（未知）；本機 GUI 的後續市場買入**會原子拒絕**，不准用舊獨立 #10 買入函式繞過。可在同一個已審閱事件空白的來源時段內先進貨，再合法銷售；完整 EVENT 時序恢復與綜合自由經營不屬 R2-C，不應假裝已支援。
- **未擴大來源支援：** 未審閱的超過 500000G 全域禮物卷、商品 `FUNCB`、EVENT overlay、公會／多世界、零批發上限皆依 Registry 分類及 GameCore fail-closed，不以移除舊引擎作由無到有的支援承諾。R2-D 的 `use-item` 共用 USE 與 R2-E 的跨買入／USE 完整世界整合尚未完成。R0／R1 全量亦未完成。
- **完成驗收門檻：** `modern/` 的全部 Node／Perl／DSL、凍結 Core SHA 與新的真實 E2E；本文件完成之後必須再確認**同一個最新 HEAD** 的 GitHub Push 及 Draft PR 兩組 Actions 均為 `completed / success`，**不能引用更新文件前的舊 HEAD** 充當新 HEAD 通過。若最後 HEAD 不是全綠，R2-C 不得標記完成。

### 下一步：只進 R2-D，不重開已結案的 R2-C

R2-D 才把既有 #79 交換、#14 劍市地圖使用／製作整理成**共用 USE 命令與單一執行流程**，保留所有已核對原版 Perl callback／機率／材料／時間證據；R2-E 再串聯真實世界、UI／HTTP／存檔與跨商品 USE。舊 B-xx、R2-A、R2-B 以及本次以前的 R2-C 規劃段落仍保留作歷史，但不是當前實作狀態；本次不要更動 Notion 正式任務或合併 Draft PR。


---


> **2026-11-22 最新 R2-A 驗收判定（優先於本檔歷史初版紀錄）：R2-A「共用市場買入核心」已完成自身退出條件；R2-B／C／D／E 均未完成，R2 整體仍未完成。** 完成的是共用買入演算法與原版直接差分、全域／商品回呼時序及 fail-closed 邊界，**不是**全商品接入、正式 UI 遷移、刪除三條舊交易演算法或共用 USE。本檔可在沒有對話記憶時獨立閱讀；不可用舊標題或 CI 綠燈推論 R2 整體完成。只在 `test/task02-baseline-on-s1`／Draft PR #1 修改 `modern/`，不動凍結 Perl／DSL、其他分支與 Notion 正式狀態。

## 先讀：目前真正做了什麼、缺什麼

| 範圍 | 現況 | 可核對證據或尚缺條件 |
| --- | --- | --- |
| R0 基準盤點 | 市場進貨重點清冊已做；R0 全量尚未結案 | 下表只列與買入直接相關的代表性測試；**不是**原有全部測試逐檔「來源行為／風險／替代／處置」映射 |
| R1 共用契約 | `market-buy` 子契約已可執行；完整 R1 尚未結案 | `market-buy-core.mjs` 與本文契約存在；通用 ITEM／USE／EVENT 編譯及全回呼生命週期契約尚不完整 |
| **R2-A 買入核心** | **已完成 R2-A 退出條件** | Core 共用買入演算、#10／#11／#14 ×12 類原版 Perl 直接差分、原版全域／商品回呼順序及未支援效果明確拒絕，見下方 R2-A 完成證據；**不包含** B/C 的新商品接入與舊演算法去重 |
| **R2-B 資料驅動接入** | **未完成** | `standard-street-module.mjs` 的 `sharedBuyRules` 仍逐項硬列 #10／#11／#14；`marketBuy.getRule` 只能取得這三項 |
| **R2-C 唯一買入路徑** | **未完成** | 仍有 `buy-market-item-10/11/14` 分派到三套 `projectOriginalMarketBuy*`；本機 UI 尚未全面改送 `market-buy` |
| **R2-D 共用 USE／生產** | **未完成** | `use-item(itemId,useId,...)` 尚非正式共用執行命令；#79、#14 仍是來源特定操作 |
| **R2-E 真世界整合驗收** | **未完成** | 既有 CAS／磁碟保存及部分 Perl／Node 比對已通過，但未以統一路徑完成可重用買入＋USE＋HTTP／持久化端對端驗收 |

**唯一正確的結論：已有一個可測試的共用市場買入函式，不等於市場進貨架構已通用化；R2 沒有完成。** `market-buy` 不是只有改名字：目前三套舊演算法仍與它並存。#10／#11／#14 是已接入的測試樣本，**不是**原版合法商品的完整功能邊界。商品不在白名單時，目前會拒絕，但不能據此宣稱原版商品本身不合法或具有未知回呼。

### 已有實作的確切邊界

- [`market-buy-core.mjs`](../src/market-buy-core.mjs)：共同計算買入裁切、付款、`paytoday`、庫存、600 秒（由已審閱規則提供）、原版 72 小時 `UseTime` 上限與交易回執，透過 [`game-core-contract.mjs`](../src/game-core-contract.mjs) 的不可變快照／CAS 提交。
- [`standard-street-module.mjs`](../src/standard-street-module.mjs)：由已存在的三筆來源審閱模型手動組出 `sharedBuyRules`，提供商品順序、單店市場驗證、原版 79 欄 `SetWholeStore` 寫回；**尚無能自動讓來源合法一般商品接入的完整規則編譯／Registry**。
- 商品 #10／#11／#14 的 `buyCallback:null` 表示這三商品本輪沒有商品專屬買入回呼，**絕非全域 `@@FUNCBUY` 不存在**。標準街原版 DSL 的 `@@FUNCBUY`（`custom/inc-item-data.cgi:3369`）明確在市場買入每滿 500,000 G 時透過 `AddItemSub` 贈送 #79 禮物卷；三商品個別買入上限使成交總額均低於門檻，因此是**來源已證實的零效果**，不是跳過未知效果。Core 依來源審閱的門檻檢查；若未來商品可能觸發，缺少已審閱執行回呼即拒絕交易，不會默默省略。
- `buy-market-item-10/11/14` 舊命令目前仍各自呼叫三個舊 `projectOriginalMarketBuy*`，它們是**重複的正式可執行路徑**，不能稱為單純改名 alias；保留目的是遷移期間維持 UI 與既有回歸，不是架構上的永久需要。
- 本輪驗證的是既有單店、來源驗證市場、指定商品的受控範圍；沒有宣稱所有動態價格、全域回呼、公會、多店、所有合法商品或跨街道進貨已支援。


## R0｜市場買入相關舊測試之局部對照（不是 R0 全量結案）

原本 `game-core-contract.mjs` 對各動作只執行版本檢查、來源模組 `apply`、WorldState 複製與 CAS；商品 #10／#11／#14 的原始商品確認和整套買入運算分別在三個來源模型。B-43 的雙世代存檔和本機 UI 都已存在，不需重寫；本階段暫留舊命令與原始 Perl 快照以便新舊路徑交叉比對；**R2-C 的完成條件是完成遷移並移除重複正式交易邏輯**，不得把「考慮移除」當成可無期限維持雙引擎。

| 測試檔案（真實路徑） | 對象 | 原版依據／函式 | 具體驗證價值 | 本輪決定 | 新替代證據 |
|---|---|---|---|---|---|
| `modern/tests/original-market-buy10.test.mjs` | #10 進貨、Perl 探針、HTTP UI | 固定 Core `buy-s.cgi`、`GetWholeStore`、`UseTime` | 真批發供貨後買入、來源 Perl 差分、繁中 UI/API | **保留**，不刪原版差分與 E2E | `market-buy-core.test.mjs` 新命令 #10 與舊命令同世界比對 |
| `modern/tests/b58-source-loto-real-ticket-cas.test.mjs` | #11 抽獎卷取得及事件 | 原版 `buy-s.cgi`、`original-market-buy11-probe.pl`、LOTO 回呼 | 抽獎卷真取得、數值與後續事件觸發 | **保留**事件驗證；交易運算待下一輪去重 | 新命令 #11 共用運算與完整舊世界轉移比對 |
| `modern/tests/b62-real-sword-market-map-sale-cas.test.mjs` | #14 劍市地圖買入、使用、販售 | 原版 `buy-s.cgi`、`plug/use.cgi`、地圖 DSL | 來源供貨取得及地圖 USE→木刀→銷售閉環 | **保留** USE 與自然販售證據 | 新命令 #14 共用運算與完整舊世界轉移比對 |
| `modern/tests/b63-source-all-sword-map-outcomes-cas.test.mjs` | #14 全五類劍產物 | 原版 `plug/use.cgi`、`inc-makeitem.cgi` | 抽樣、配方、能力限額與回呼風險 | **保留**，非買入演算法重複 | 無替代必要 |
| `modern/tests/game-core-contract.test.mjs` | WorldState、版本、CAS、不可變性 | B-31 Core 來源界線 | 避免命令副作用與世界跨版汙染 | **保留**，舊基本契約仍要成立 | 新命令另驗證相同 Core CAS／rollback |
| `modern/tests/b43-durable-world-save.test.mjs` | 兩代磁碟存檔／故障回復 | 凍結 `DataWrite` 為參考；B-43 Node 存檔規約 | 防止存檔覆寫、損毀及跨世界污染 | **保留** | 新命令之後執行 B-43 `save/load` 實測 |
| `modern/tests/b41-real-playable-sale.test.mjs` | 本機市場進貨後上架及自然販售 | `buy-s.cgi`、`inc-turn.cgi`、`market.cgi` | 可操作流程不可被純模型測試替代 | **保留** | 本機 UI 仍以舊相容命令使用同一來源世界 |
| `modern/tests/original-sparse-all-plus.test.mjs` | 原版批發供貨模型 | `inc-turn.cgi`、`plug/whole.cgi` | 市場有貨來源及固定亂數／讀寫形狀 | **保留** | 共用買入從相同實際 PLUS 世界啟動 |
| `modern/tests/original-admin-sparse-market.test.mjs` | 空白初始批發市場與稀疏欄位 | `inc-admin-func.cgi`、`DataRead/Write` | 不偽造庫存、保持 CSV 格式 | **保留** | 共用買入來源編碼及售罄拒絕 |
| `modern/tests/market-buy-core.test.mjs`（新增） | 共用 `market-buy` | 上述凍結 Perl、三筆審閱商品及三種舊買入投影 | 同一演算法跨商品、超限／缺貨／缺錢、版本衝突、原世界不可變、真正磁碟往返 | **新增** | 本檔本身 |

**R0 尚缺：** 這是買入重構的 10 筆重點映射，不是所有歷史測試逐筆處置清單；在 R2-E 結案前須補完受影響測試的「路徑／來源行為／風險／替代測試／處置／理由」，有替代證據才可合併或刪除。

`modern/tests/original-perl/*.t` 和固定 Perl 探針及 SHA 校驗不改：原版可執行函式與被隔離的 CGI 子流程仍是行為錨點。其餘原版商品使用、事件、結算、世界 IO 測試不屬市場進貨重寫範圍，維持現況、尚未宣稱已完成逐檔去重。**本輪無刪除測試、無孤兒 fixture 刪除。**

## R1｜目前已實作的 `market-buy` 子契約（不代表 R1 全量完成）

`market-buy` 請求欄位：

```js
{
  kind:'market-buy',
  expectedRevision: world.revision,
  shopId:1,
  itemId:10,
  requestedCount:2,
  marketShelf:0,
  expectedPrice:5000,
}
```

欄位必須完全符合、整數安全且 `requestedCount >= 1`；`marketShelf` 和 `expectedPrice` 是原版報價重檢，避免玩家操作時貨架或價格已變。成功回傳 `receipt`（商品、原申請量、實際量、單價、總價、時間、店舖及市場庫存前後、資金與 `paytoday` 前後）及新版世界；拒絕時世界不變。版本衝突回傳 `REVISION_CONFLICT`；無來源支持、資料非法或未審閱回呼回傳 `SOURCE_BOUNDARY_REJECTED`。

共用 GameCore 在 `market-buy-core.mjs` 執行：

1. 驗證街道已審閱的商品和市場；貨架位置按來源商品排列順序及當前正庫存重新計算。
2. 依原版 `CheckCount`、批發庫存和現金計算 `min(要求量, 持有上限-已持有, 市場庫存, trunc(現金/單價))`；零量拒絕，其餘合法超量**裁切**而非全部拒絕。
3. `UseTime` 不允許負的剩餘時間；超過 259200 秒的儲存時間先按來源上限縮至 259200 秒，再加買入時間。#10／#11／#14 原版市場運送時間均為 600 秒。
4. 扣除店鋪現金、增加 `paytoday` 與店鋪庫存、減少批發庫存；市場購買沒有販售稅。數值溢位拒絕。
5. **原版回呼順序**：先完成帳務及商品變更，經過來源的商品初始化，再依序進入**全域 `FUNCBUY` → 商品 `FUNCBUY`**，最後交由街道批發市場 codec 寫回。原版標準街全域 `@@FUNCBUY` 並非空白，只有現行三商品單筆交易金額低於500,000 G門檻而不觸發禮物卷效果；真回呼實測與拒絕邊界請見下方 R2-A 完成證據。未審閱的效果拒絕，正式命令絕不 eval Perl。
6. GameCore 接著建構不可變 WorldState、修訂版 +1；`executeMemoryCommand` 經原有 CAS 一次提交，B-43 存檔工具沿用原結構。

此段是已實作買入命令的**狹義契約**，尚未覆蓋共用 `use-item`、全商品 DSL 語義／回呼、事件及全交易模型。StreetModule 在此子契約中**應只**提供來源審閱結果（商品、單價、持有上限、搬運時間、排序、回呼能力）、市場格式驗證與 `SetWholeStore` 序列化；目前三筆仍為手動白名單，未達資料驅動目標。Core 不內建標準街 ID 與 79 件商品；這裡 79 欄是 Standard Street 的凍結來源格式，不是所有街道的引擎假設。

## 已通過 R2-A 出口驗收的商品範圍與原版錨點（不代表 R2 全商品支援）

| 商品 | 原版商品資料（審閱值） | 共用命令範圍 |
|---|---|---|
| #10 書本寫作工具 | 價格 5000、店鋪上限 20、搬運 600 秒 | 固定來源的單店無公會批發買入 |
| #11 抽獎卷 | 價格 2000、店鋪上限 50、搬運 600 秒 | 同上；不自動執行 LOTO 活動 |
| #14 到劍市的地圖 | 價格 10000、店鋪上限 3、搬運 600 秒 | 同上；**買入不等於使用地圖或產生劍** |

原版固定 Core：`738d71a2985fd088f2ca90f25145706392ee2365`。關鍵凍結快照：`modern/tests/original-perl/buy-s.cgi`（Git Blob `6ba8df9a733ed16c490389414cd94934fe1185ca`）、`whole.cgi`（`778badaf157326bcfd1f8fa1e310d94f94995eb3`）、`calc.cgi`（`586354a9a300e26d0e12a4efa512fa25760e3197`）、`inc-makeitem.cgi`（`1da8cce1e76ad6159325a37faec68efaa82c7f69`）；兩份 DSL 不修改。

**目前實作會以固定 #10／#11／#14 的 `sharedBuyRules` 拒絕其他商品；這是暫時的程式接入白名單，並非已證明其他原版合法商品無法共用。** 尚需調查／編譯各商品實際價格條件、`FUNCBUY`、職業、公會等來源差異，支援已核對的共同語義並只對確實未知或不能表達的分支拒絕。單店、目前 UI 及存檔原有界線不變；**三條專用命令仍各自執行舊演算法，R2-C 不可在此狀態結案。**

## R2-A～E 明確工作包、驗收與退出條件（下一個無記憶工作窗照此執行）

以下 A～E 是對既定 **R2｜共用市場／交易／商品使用** 的細分執行工作包，**不是額外的新里程碑**；階段可能為完成驗證而交錯實作，但不得省略驗收。狀態見本檔開頭，**沒有任何階段可因僅有綠燈而自動轉成「完成」**。

### R2-A｜共用市場買入核心穩定化｜**已完成自身退出條件**（2026-11-22）

**驗收結論：** 真正執行同一個 `market-buy-core.mjs` 共用買入公式，Core 不硬寫 Standard 商品 ID；不同商品由 StreetModule 提供已審閱規格。直接執行固定原版 Perl `buy-s.cgi`／`GetWholeStore`／`SetWholeStore`／`CheckCount`／`GetTimeDeal`／`UseTime` 的 `modern/tests/original-perl/original-r2a-market-buy-oracle.pl`，與新 `market-buy` 指令**逐項比較三種原版合法商品各 12 類、合計 36 組**。並非只與先前 Node 專用交易模型交叉比對。

**12 類來源情境（每種商品均跑）：** 一般成交、要求量超額裁切、可支付額裁切、持有上限餘量裁切、持有上限拒絕、零資金拒絕、過期價格拒絕、錯誤貨架拒絕、零申請量拒絕、72 小時儲存時間上限裁切、未來店鋪時間拒絕、批發缺貨拒絕。對每個成功案例比較：`purchasedCount`、現金、`paytoday`、商品庫存、店鋪時間、批發數值、**完整 79 欄原版 `SetWholeStore` CSV 與稀疏定義索引**；失敗案例比較原版**未提交**與 Node 原世界／版本不變。已有連續三商品 CAS、回執、雙世代磁碟保存／重載後續操作測試。這些是 R2-A 驗證範圍，不代表有實機 CGI HTTP 或多人行為。

**被舊測試漏掉的原版 `@@FUNCBUY`：** 標準街 `custom/inc-item-data.cgi:3369` 的**全域**買入回呼，在來源 `if($BUY->{whole})` 下按 `int(成交額/500000)` 贈送 #79 禮物卷並寫入日誌。三個已審閱商品的單店持有上限 × 標價都低於 500,000 G，因此本階段的成功買入不觸發贈禮，**不可寫成「原版沒有全域 FUNCBUY」**。`standard-street-module.mjs` 檢查固定 DSL 的原文門檻／效果與原版 buy-s 回呼入口；`market-buy-core.mjs` 區分全域和商品回呼，交易額達門檻卻無已審閱處理器時 **fail closed**；本階段**未實作超門檻贈禮副作用**，待 R2-B 特殊規則接入及 R2-C 正式遷移驗收。原版 Perl 探針會執行由原始 `@@FUNCBUY` 本體隔離建立的全域回呼（僅將原版 `@@ITEMNO"禮物卷"` 巨集核對替換為 #79），並以**明示人工商品回呼測資**驗證真 `buy-s.cgi` 順序是「買方帳務／庫存完成 → `RequireFile("inc-item.cgi")` → 全域 `FUNCBUY` → 商品 `FUNCBUY` → `SetWholeStore`」；相同順序的 Node hook 測試與缺失回呼拒絕均通過。人工回呼僅用來測生命週期，**不代表原版三商品有該商品回呼**。

**來源及可查測試：** `modern/tests/original-perl/original-r2a-market-buy-oracle.pl`（新）、`modern/tests/market-buy-core.test.mjs`（加入三個新測試）、`modern/src/market-buy-core.mjs`（全域→商品回呼順序與拒絕）、`modern/src/standard-street-module.mjs`（原版全域回呼門檻來源審核）。原版 `modern/tests/original-perl/{buy-s.cgi,whole.cgi,item.cgi,calc.cgi}`、兩份 DSL 均未修改。

**驗收 CI 的程式版本：** `bd7a504bdc473a0bd34c1beb5efab8ae621d2381`，[GitHub Actions #45011886766](https://github.com/Prysline/akimono/actions/runs/45011886766) `completed/success`：Node **903/903**、Perl **1,867/1,867**（52 檔），固定 Core SHA、DSL 稽核與其他 workflow 步驟皆通過。文件提交後的**最新 HEAD 須重新核對**同 SHA CI；不得拿此歷史驗證當未來功能成功證據。

**R2-A 完成≠R2 完成：** 三件商品仍靠 `sharedBuyRules` 手動接入（R2-B 未完成）；`buy-market-item-10/11/14` 仍分流舊 `projectOriginalMarketBuy*`，本機 UI 未全面遷移（R2-C 未完成）；通用 `use-item` 與真世界買入→USE 結案驗收尚未完成（R2-D/E 未完成）。本階段不刪原本 Perl 探針、舊專用程式或測試，待 R2-C/E 按測試遷移清單去重。

### R2-B｜商品 DSL 資料驅動接入｜未完成

**工作：** 建立從固定來源 ITEM/原版編譯或可追溯來源審閱結果到 MarketBuyRule 的可重用 Registry/Compiler；輸出商品 ID、排序／庫存索引、來源檔與行號／版本、價格或計價策略、上限、原版買入時間、條件、已審閱買入回呼與具體 unsupported 原因。規則不用手動寫 #10/#11/#14 的 `sharedBuyRules`；對已支援的共同語義，新的原版合法商品應由**資料**接入。

**退出條件：** 已驗證的 #10/#11/#14 由新資料流程取得相同行為；另外用來源支持的不同合法普通商品驗證無需新增專用命令／演算法即可買入；至少涵蓋動態定價與回呼的來源分類（若尚未支援，按特定來源語義明確拒絕並留缺口，不能假稱全部商品都支援）。未支援情境需列出 itemId、來源位置、具體原因，**單純不在三件商品清單不算合理理由**；原版來源 SHA／DSL 不改。

### R2-C｜買入執行路徑與測試遷移｜未完成

**工作：** 本機 UI／HTTP API／內部買入呼叫全面改用 `market-buy`。若有外部相容需求，可在經驗證的轉接層把舊命令**轉換成**相同共用命令，但不得仍呼叫獨立交易演算法。移除沒有正式用途的 `projectOriginalMarketBuy10/11/14` 交易實作及硬編碼分派；來源比對探針可留作測試證據，不等於保留雙引擎。

**退出條件：** 從可操作繁中 UI 到 GameCore 只有**一套正式市場買入運算**；原三商品及其他已支援普通商品交易均走同一命令；沒有殘留商品編號型買入入口作為第二套交易；實測 HTTP／WorldState/CAS／存檔、原版 Perl 差分仍對齊；舊測試依 R0 清冊改寫、合併或保留必要差異，不因舊內部函式被刪而使保護消失。

### R2-D｜共用商品使用與製作｜未完成

**工作：** 正式建立 `use-item(shopId,itemId,useId,count,...)`（實際欄位須按來源定稿），集中 `GetUseItem/CheckUseItem/UseItem`、原版次數裁切、金錢／時間／材料、`MakeAmount`／市場修正、使用前後回呼與 EXP，以及必要的來源亂數順序。StreetModule 只交付已編譯的 USE／NEED／GET 與原版特殊效果；不為每個 USE 增加一個 `command.kind`。

**退出條件：** 用同一正式 USE 命令與流程重現已審閱的 #79 禮物卷地圖交換以及 #14 劍市地圖首次使用受審閱結果；保留真原版 Perl 的次數、消耗、產物、損毀／亂數、回呼及拒絕時序；第二次使用等未驗證語義應記具體缺口，不可無聲放行或憑空填入，也不可因已測首次使用就宣稱全部 USE 已通用。

### R2-E｜共同操作真世界整合與結案｜未完成

**工作：** 同一真實 WorldState 中由原版合法市場取得→買入→USE／製作→庫存與市場更新；使用現行本機 UI／HTTP／CAS、B-43 雙世代磁碟存檔及重新載入，測成功／拒絕／版本競爭／已存與損毀復原。

**退出條件：** 對 #10/#11/#14 與已審閱 #79/#14 USE 的必要原版 Perl／Node／HTTP 證據、帳務／時間／商品／批發稀疏資料與回呼生命週期一致；跨商品與跨 USE 不需改命令種類或複製完整流程；同 HEAD 的 Push 與 Draft PR CI `completed/success`，原版 Core／DSL SHA 稽核通過。R0 受影響測試映射更新完成、過時專用執行器與重複測試已按證據移除／改寫。**完成 E 且 A～D 各自合格，才能宣告整體 R2 完成。**

## R2 與後續里程碑界線

- **R2**：市場買入／交易／USE／製作，與原版特殊回呼的安全擴充；單店真世界可測並具備 UI、CAS、持久化接入。不要求先完成全遊戲事件、所有街道、多人世界。
- **R3**：共同自然販售、世界時間／PLUS／商品 FUNCTURN/FUNCSALE（以 #10、#40、#41～#44 等來源合法商品驗證）。不得在 R2 之名逐劍新增販售命令。
- **R4**：完整 EVENT、SortDT、36 小時期末轉場與必要期末擴充；無來源支持時不得偷跨期。
- **R5**：R1～R4 串成一個繁中瀏覽器可從開店玩到下一期、磁碟重啟續營的單機閉環，再做使用者一次集中人工驗收。

## 下一個工作窗必須先做的事

1. 讀 [正式 R0–R7 計畫](playable-loop-priority-plan.md)、本文件、[最新交接](next-window-handoff.md)、[GameCore 責任契約](game-core-contract-v1.md) 及真實程式與相關測試；以 PR #1 **當下** head_sha 確認分支、Draft 與未合併，不可以歷史 SHA 當現況。
2. **R2-A 已完成自身退出驗收；接著優先 R2-B 商品資料驅動規則與 R2-C 唯一買入路徑／舊程式去重**，再以 R2-D／E 完成共用 USE 與真世界結案；不要直接跳 R3／R4 或為新商品複製專用引擎。
3. 每輪回報實際支援商品及 USE 範圍、來源例外與具體拒絕原因、共用命令／特殊回呼、移除或改寫之舊命令及測試、原版對照、可玩操作與最新 HEAD 的 CI；**不要只報測試數或「第一階段完成」**。
4. 保留主線 `main`、基底 `migration/standard-street-s1`、固定 Perl/DSL、Notion 不變；PR #1 保持 Draft、不合併。

## 已有 CI 的歷史證據（不是任何未來 HEAD 的自動通行證）

2026-11-22 的共用買入初版程式基準為 `b2bfffc7a41a4d275043f448ad27541fdb704f98`，當時 [Actions run #45008806146](https://github.com/Prysline/akimono/actions/runs/45008806146) 顯示 Node 900/900、Perl 1,867/1,867（52 檔）通過；**這只證明當時受測程式與現有案例通過，不表示 R2-A～E 已完成，也不能拿來取代之後新 HEAD 的 CI。**

