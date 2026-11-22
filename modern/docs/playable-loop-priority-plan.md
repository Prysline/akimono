# 《商人物語》現行開發計畫｜共用規則引擎優先、標準街完整經營閉環

## 2026-11-22｜最新權威：R3 共用自然販售／時間「受控部分完成，未達退出條件」

**現況與下一步（優先於下方 R2-E 歷史快照）：** R2 A～E 仍為原本受控完成；R3 新增來源審閱六商品（#10、#40～#44）共用自然販售算式與 24 組真 Perl 原版差分、真實 #14 地圖 BUY→共用 USE 五劍→同一販售入口、現有繁中 HTTP 上架／CAS／雙世代存檔／實際重啟續營測試。新程式：src/shared-natural-sale-core.mjs；更新 src/original-b41-playable-sale.mjs、src/standard-street-module.mjs、scripts/dev-local.mjs、local-ui 與 local-world-save-store。測試：tests/original-perl/original-r3-shared-sale-probe.pl、tests/r3-shared-natural-sale.test.mjs、tests/r3-shared-sword-acquisition-sales.test.mjs、tests/r3-real-sword-http-restart.test.mjs。原有市場買入、USE 與原版來源 SHA 未更動。

**界線／不宣告結案：** 真原版完整時間執行的 FUNCTURN／FUNCSALE、EVENT 與 17 個 Perl hash 順序、跨期決算、多商店／街道差異、非原價與其他回呼尚未驗證。現存 B-41 時間仍只計算來源自然販售＋PLUS 子區，執行後 eventState:null 表示未知事件，不能當成沒有事件；B-56 僅為明示 EVENT 順序 fixture。B-54 可重播亂數是本機政策，不是原版 Perl rand。R0／R1 **只補了本輪必要範圍**，全量未完成；R4 EVENT／36 小時期末、R5 閉環不可假稱完成。本輪僅在 test/task02-baseline-on-s1 的 modern/ 修改，PR #1 保持 Open／Draft、基底 migration/standard-street-s1，未修改 Notion 狀態。

**R3 新來源與 R0 清冊：** docs/r3-shared-natural-sale-source-contract.md；docs/r3-r0-affected-tests-mapping.md。下一工作窗優先：核對並實作完整 R3 回呼／EVENT 前置語義及可執行 Perl Oracle；對未知語義嚴格拒絕並保留 R4 跨期責任，不重做 R2。下方所有標示「最新權威：R2-E」段落僅為歷史記錄，非當前 R3 下一步。


## 2026-11-22｜最新權威：R2-E 真 HTTP／USE／存檔整合驗收（R2 A～E 受控範圍完成）

**正式 R0–R7 計畫：** R2 已完成可操作商品／USE 的受控單店 HTTP＋CAS＋持久化證據；R3 是共用自然販售／時間，R4 期末／EVENT，R5 真完整經營閉環。

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

**路線調整：** R2-D 以單一共用 USE 驗證來源製作，不再做 B-64 逐商品專用模型；R2-E 才是同世界真 HTTP／持久化整合。

**正式判定：R2-A、R2-B、R2-C、R2-D 已各自完成，R2-E 未完成；R2 整體、R0／R1 全量仍未結案。** 本節取代本檔下方「R2-D 未完成／下一步做 R2-D」歷史快照。唯一工作分支 `test/task02-baseline-on-s1`；只改 `modern/`；[PR #1](https://github.com/Prysline/akimono/pull/1) 必須保持 Open、Draft、未合併，目標 `migration/standard-street-s1`；凍結原版 Perl／DSL／Core SHA、其他分支、Notion 正式任務未修改。

**R2-D 正式入口與分工：** `GameCore.applyGameCommand` 僅以 `kind:'use-item'` → `src/shared-use-item-core.mjs::projectSharedUseItem` 執行 USE，欄位為 `expectedRevision,shopId,itemId,useId,requestedCount`，需要亂數時另給 `randomDraws`（原版順序、每筆 0～999999 的百萬分之一單位）。StreetModule `useItem.getRule/describe/validateWorld/writeMarket` 提供來源編譯 USE 規則及明示回呼／不支援原因，GameCore 不依商品 ID 複製 USE 公式。共用路徑處理 GetUseItem／CheckUseItem 檢查及原版數量裁切、money／paytoday、UseTime、依序消耗材料與 MakeAmount 產物、CheckWholeStore／市場、來源前後回呼、EXP；WorldState／CAS 原子提交，失敗不修改世界。原有 `market-buy` 唯一買入路徑保持不變。

**真原版覆蓋：** #79 禮物卷 USE #0「交換地圖集」每次用 2 卷，產出 #12、#9、#14 各一，1800 秒、金錢與 EXP 為 0；要求量 3 時會被手上 5 卷裁成 2 次。#14「到劍市的地圖」僅審閱首次 USE #0：12000 G、7200 秒、EXP[14]+20；五種劍 #40～#44 按原版 GET 各 10 次、機率 400/350/150/60/30‰。前回呼 `rand(1000)<=100` 可將產物基數加倍，正常逐件 MakeAmount 對應 50 個產物亂數，加倍改為每組兩個亂數的原版平方根運算；末端 `lostbook` 是 `rand(1000)<100` 消耗一張地圖。兩個回呼合計一般 52、加倍 12 次 rand，100/1000 邊界**加倍、不損毀**。缺 B-63 已審閱 helper 時只容許 B-62 不加倍／不損毀／僅木刀的保守分支。

**真正去重與安全邊界：** `gift-exchange-maps`、`use-original-sword-map-14`、`use-original-sword-map-14-all-outcomes` 三種舊正式命令與 StreetModule dispatch 已移除，`projectReviewedGiftMapUse`、`projectOriginalSwordMapUse`、`projectOriginalSwordMapAllOutcomes` 商品專用執行器已刪除，沒有留下執行不同公式的 alias；保留來源審閱器與原始 Perl 探針。非法 ITEM／USE、缺券、金錢／時間不足、過期 revision、未知 callback／EVENT／公會、未審閱機率／抽樣數、二次地圖熟練縮時、庫存／批發溢出與未知效果均 fail-closed，既不默默忽略也不部分寫入；**不是全部 116 USE 均已通用**。

**驗收證據：** `tests/r2d-unified-use-item.test.mjs` 與原 B-33／B-34／B-37／B-62／B-63 測試已使用同一 `use-item`；真凍結原版 Perl `original-gift-map-use-probe.pl` 六案例與 `original-b63-sword-map-all-outcomes-probe.pl` 六情境對照產物、材料、金錢、時間、EXP、回呼、損毀與亂數消耗，所有原版 Perl 差分檔與 R2-A/B/C 買入、CAS／存檔、DSL／Core SHA 測試保留。**程式版本 `f9f578000af135928e3f16283cc7b76eefd2aa53`** 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/45025885748) 和 [PR CI](https://github.com/Prysline/akimono/actions/runs/45025890130) 都 `completed/success`，**Node 921/921、原版 Perl 1867/1867（52個.t）、全部來源 SHA 成功**。此處是文件更新前的可追溯成功基準；文件更新後**仍必須對新 HEAD 重新驗收同一 SHA 的 Push／PR CI**，不能把舊綠燈冒充最終驗收。

**R2-E 無記憶下一窗：** 先重新查 PR #1 最新 HEAD、Draft／Open／未合併狀態、同 HEAD Actions 與上述六份文件頂部；只在工作分支的 `modern/` 開發。以現有 `market-buy`、`use-item` 為單一路徑，補真實繁中 UI／HTTP 共用 USE，將合法來源市場供貨→買入→#79 交換／#14 首次製作→同一 WorldState CAS→B-43 雙代落盤→關服重啟再載入再操作打通，補真原版 Perl／Node、R0 逐項測試映射與 R1 缺口；不因已有 R2-D 數值差分就宣告 R2-E、整體 R2 或 R0／R1 全量完成。未知 EVENT／回呼／二次 USE 維持拒絕。

---


## 2026-11-22｜權威階段：R2-A／B／C 已完成，R2-D 為下一工作包

**R2-A 共用市場買入核心、R2-B 商品 DSL 資料驅動、R2-C 正式買入路徑與測試遷移，已分別通過自身退出條件；R2-D／E 未完成，R2 整體未完成；R0／R1 全量仍未結案。** 最新可執行架構僅有 `kind:'market-buy'` → `projectSharedMarketBuy`；StreetModule 的 `buy-market-item-10/11/14`、各自 `projectOriginalMarketBuy10/11/14` 和 `quoteOriginalMarket10/11/14` 已完全移除，而非留下三個別名或偷偷雙引擎。繁中市場頁依 Registry 顯示 79 件真實原版商品、動態價格、來源不支援原因，`POST /api/buy` 嚴格只接受共用五欄並執行 GameCore/CAS；實際 B-43 服務也已注入 Registry，讓新 #39 等原版普通商品可落盤、重啟、載入再買。

**退出證據：** 新真實 HTTP `r2c-unified-market-http.test.mjs` 核對 #10/#11/#14/#39 同一路徑，含 #14 `BASE 50/150` 動態價格、交易帳務、存貨、稀疏79欄 CSV、過期價格／revision/舊請求拒絕、兩代存檔與重啟；B-40～B-43、B-55～B-63、R2-A 36組與 R2-B 16組原版 Perl 比較與原始來源 SHA 保留並遷移到單一正式買入入口。B-41 原固定價 `paytoday` 推斷不能阻止經來源驗證的 #14 地圖進貨→USE→銷售；原版事件狀態 `eventState:null` 仍會阻止未知效果下的進貨，不能宣稱事件／完整自由營業已完成。詳見 [正式 R2 證據與安全範圍](shared-market-buy-r0-r2.md)。

**下一步 R2-D：** 針對 #79 禮物卷地圖交換及 #14 地圖首次使用，設計來源審閱支持的通用 `use-item`／製作流程，維持原 Perl callback 順序與 fail-closed；之後 R2-E 才能整合 UI → CAS → USE → 雙代磁碟完整世界。PR #1 保持 Draft／Open／未合併；只改 `modern/`，不改原版 Perl/DSL、Core SHA、其他分支或 Notion 狀態；**最新 HEAD 的 Push/PR Actions 必須各自 completed/success**。下面任何仍稱「R2-C 未完成」均為歷史，不是現況。


---


> **2026-11-22 現行權威計畫（優先於下方所有 B-40～B-55 歷史規劃與 B-63 的 B-64 建議）。** 原先「只修訂規劃、沒有程式」的說法已過期：其後已提交 `market-buy` 共用市場買入核心初版，且 **R2-A 已通過原版直接差分與回呼時序驗收；R2-B～E 未完成、R2 整體仍未完成**。完整現況、實作證據、工作包與驗收門檻見 [R0/R1 範圍與 R2-A～E 狀態](shared-market-buy-r0-r2.md)。保留 B-01～B-63 原版行為證據、固定 SHA、WorldState/CAS、既有 UI 與雙世代存檔；重構可改寫／合併／移除已有等價替代的測試，不可以斷言總數充當品質目標。

## 最新實作判定與 R2 子階段（2026-11-22，無對話記憶也應先讀）

**R2 整體未結案；先前僅以三商品共用初版稱為「R2 第一階段完成」的判定不成立。R2-A 現已補齊直接原版 Perl Oracle、全域／商品回呼順序及拒絕邊界，可獨立標為完成。** 共用引擎初版已在 [`market-buy-core.mjs`](../src/market-buy-core.mjs) 執行 #10／#11／#14 交易，GameCore 透過 `market-buy` 分派並沿用 CAS／B-43 存檔。但是 [`standard-street-module.mjs`](../src/standard-street-module.mjs) 的 `sharedBuyRules` 仍硬列這三項，`buy-market-item-10/11/14` 仍各自執行舊 `projectOriginalMarketBuy*`，UI／HTTP 還未全面切換；共用 `use-item` 及可資料驅動接入其他合法普通商品均未完成。**CI 通過只證明已測行為，不是架構完成。**

| 工作包 | 現況 | 必須完成才可結案 |
| --- | --- | --- |
| **R2-A 買入 Core** | **已完成自身驗收** | #10/#11/#14 各12種情境直跑固定 Perl `buy-s.cgi` 對照共同 Core，原版回呼時序、缺席／觸發拒絕、CSV／時間及 CAS 驗證通過；舊路徑去重仍在 R2-C |
| **R2-B 商品資料驅動接入** | **未完成** | 規則由經核對的 ITEM/DSL 編譯或 Registry 提供，新增來源合法普通商品不須新增白名單、專用交易演算法或 command，未支援語義逐項明示 |
| **R2-C 舊買入路徑遷移** | **未完成** | UI／API／內部呼叫統一 `market-buy`，移除三套舊正式交易演算法／重複 dispatch，保留或改寫必要 Perl／Node／HTTP 回歸 |
| **R2-D 共用 USE／製作** | **未完成** | 同一 `use-item`/共用執行器依已審閱規則處理 #79 地圖交換與 #14 地圖使用及必要特殊回呼，未知語義拒絕 |
| **R2-E 整合驗收** | **未完成** | 原版合法商品買入→USE／製作於同一真 WorldState、HTTP、CAS、磁碟存檔／重啟續營可重現；受影響測試映射與最新 HEAD CI 完整 |

**R0／R1 不能因為市場買入局部清冊、局部 `market-buy` 契約存在就宣告全量完成；R2-A 的完成也不會自動完成 R0/R1 或 R2-B～E。** R0 尚缺所有受影響舊測試完整映射與去重處置，R1 尚缺跨 ITEM／USE／EVENT 的完整資料與回呼契約；可將已完成子成果保留，對剩餘能力分別驗收。

**R2-A 原版差分與安全回呼驗收證據：** [`original-r2a-market-buy-oracle.pl`](../tests/original-perl/original-r2a-market-buy-oracle.pl) 對 #10/#11/#14 各12情境逐欄比對 Perl／Node；原版標準街 `@@FUNCBUY` 贈禮門檻500,000 G 不再被當作不存在，超門檻效果未審閱時拒絕；[CI #45011886766](https://github.com/Prysline/akimono/actions/runs/45011886766) 的程式 SHA `bd7a504bdc473a0bd34c1beb5efab8ae621d2381` 為903 Node／1,867 Perl 成功基準（**不是**最新文件 HEAD）。詳見 [R2-A 完成證據](shared-market-buy-r0-r2.md)。

**R2 的核心目的**是讓來源合法、已能由共同語義表達的商品／USE 只需要商品資料和必要特殊效果，而不是每件商品、每條用途再做新模型、新命令和整套 CAS/存檔/HTTP。**不能用「不是 #10/#11/#14」當正式拒絕理由；**只有真正未知或不支援的原版語義才安全拒絕，並給具體原因。舊命令可在遷移期間暫存，但不得作為另一套永久交易引擎。

**界線：** R2 處理市場、交易、商品使用／製作；**R3** 才集中原版自然販售／時間／PLUS；**R4** 才整合 EVENT、SortDT、36h 期末；**R5** 才驗收完整單機跨期續營。詳細工作清單、測試要求、讀檔順序與歷史 CI 基準一律以 [R2-A～E 文件](shared-market-buy-r0-r2.md) 為準，不由此表推定完成。

## 正式目標與不變限制

- 先完成**同一繁體中文瀏覽器中的標準街單機經營閉環**：初始化／開店 → 原版合法商品取得與進貨 → 使用／上架 → 自然銷售／時間補算 → 36 小時真決算 → 磁碟儲存 → 服務重啟載入 → 下一期繼續經營。使用者於完整閉環成立後**一次集中人工驗收**；開發中的 UI 必須持續連接真實 WorldState，不等到最後才製作。
- 共用 **GameCore 規則引擎**、可分離 **StreetModule**、**WorldState／Persistence** 是必須經實際玩法驗證的分層，不是只建立三個同名介面。之後以 URon「售出麵食產生髒碗／轉職」及 WAtlas「海域期末更新」驗證跨街道擴充，最後再建正式帳號及多人共享世界。
- 原版基準：共用 Core 為 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365；標準街 DSL 為本 repo 凍結檔；Classic/program 與 Core 歷史 be70508e5978b3686a054ae061426dffb3680569 的 171 個 Blob 全部對應。Core 最新與 Classic/program 尚有 11 檔差異，須按規則來源分辨。
- 僅在 test/task02-baseline-on-s1／Draft PR #1 修改 modern/。不改 main、migration/standard-street-s1、原始 Perl CGI、兩份 DSL、不合併 PR；不擅自更改 Notion 正式任務狀態。
- **對未確認語義要拒絕，不得用猜測補規則**；但也不得把一件商品專用的測試白名單升格為正式商店系統的永久功能界線。

## 為何曾陷入「新增小功能就須重複大批驗證」？

以下為由程式及版本歷史可支持的**架構原因推論**，不是工時實測。「十倍」是開發成本感受，目前沒有逐工項計時資料可精確證實倍率。

| 症狀 | 可追溯的程式或開發方式 | 造成的重工 |
| --- | --- | --- |
| GameCore 缺少原版共同商業演算 | B-31 game-core-contract.mjs 的 applyGameCommand 主要處理驗證／分派／版本／快照；其設計文件明確把價格、回呼及交易排除於當階段核心 | 商業規則逐漸散入標準街模組和不同 review/project 模型；同一共通規則無單一正式執行入口 |
| 以「一件商品／一種結果」當可執行命令 | standard-street-module.mjs 有 buy-market-item-10/11/14、use-original-sword-map-14-all-outcomes 等命令 | 新商品常須新增模型、命令、來源核對、狀態驗證與整合測試，而非讓通用操作讀取不同定義 |
| 以測試 fixture 限制取代規則支援範圍 | B-41 主要處理指定展示商品；B-62／B-63 以固定地圖、首次使用及明示亂數進行真 Perl 對照 | 已驗證的共通公式未成為一般化行為，下一合法商品或第二次使用仍從狹窄邊界重新串接 |
| 每輪重建相鄰的整合前置 | 原版來源 SHA、特定 Perl probe、Node 子模型、CAS、持久化、HTTP、事件未知狀態與相同 CI 均交織在功能切片內 | 本應按共用合約驗證一次的基礎，被每個商品／事件切片反覆處理 |
| 以 B 編號和斷言數取代可重用能力的驗收 | B-35 單商品 PLUS → B-36 三商品 → B-37 59 商品，以及 B-55～B-63 逐事件與逐 USE 交接 | 來源真實性逐步提高，但正式使用面的擴大與測試增加不成比例 |

**根因不是「來源驗證不該做」**；而是**未把驗證結果沉澱為可以承接不同商品、事件、街道的共同執行規則與測試合約**。B-01～B-63 的 Perl oracle／異常紀錄應改作回歸資產，不能再讓新商品必須複製整條 B-xx 專用開發路徑。

## 必須改正的責任歸屬

| 層次 | 正式應承擔的責任 | 不應承擔 |
| --- | --- | --- |
| **GameCore／共用規則執行層** | 原版共同的時間／UseTime、商品使用 UseItem／MakeAmount、庫存／市場、玩家與系統交易、自然販售／人氣／稅、事件生命週期、SortDT、36h 決算及所有共通操作時序 | 硬寫 Standard #10、#14、#40；為每個合法 ITEM／USE／EVENT 新增一個命令種類 |
| **StreetModule** | 提供街道設定、已編譯 ITEM／USE／EVENT、職業與特殊規則；提供來源時序對應的 useBefore/useAfter、buy/sale/turn、periodBefore/periodAfter 等擴充點；必要時提供完整覆寫介面 | 另寫一套原版 Core 市場、稅、自然販售、時間及決算演算 |
| **DSL 編譯／規則載入** | 支援經來源核對的共同語法、預設、巨集、條件、配方材料及回呼連結；表達未支援語義；保留來源路徑、行號與版本 | 在玩家執行時 eval 任意 Perl／將 raw DSL 或静態計數當已可執行 |
| **WorldState／Repository** | 持久化共同及街道專有狀態；原子交易、版本衝突、保存／回復、時間與亂數所需狀態 | 自行決定銷售量、發獎、扣資源或對原版零值／未知狀態自動補猜 |
| **Web UI／本機或未來多人 API** | 顯示權威狀態，送通用遊戲命令，說明拒絕原因 | 自行計算錢、物品、經驗、期末或專用商品結果 |

**正式命令應是語義型**（例如 `market-buy(itemId,count)`、`use-item(itemId,useId,count)`、`set-showcase`、`advance-world-time`），不是商品編號型（`buy-market-item-10`）或逐 USE 創造新 command。**目前 `market-buy` 初版已存在但商品接入仍為三商品白名單；`use-item` 仍是目標契約，尚未形成共用執行入口。** 不得以指令改名或三商品共用初測冒充已通用化。

共用演算要保留來源順序：使用前回呼→材料／產出／市場修正→使用後回呼→EXP；時間片自然販售→FUNCTURN→FUNCSALE→SortDT→必要期末→市場 PLUS→EVENT 起訖與持續；期末 Before/After 擴充點須保留原版相對位置。街道差異只注入原版有依據的行為，特別核對 URon 覆寫 inc-turn.cgi 的全部差異，而非只假定它增加髒碗。

## 新工作序列與完成條件

| 順序 | 主題 | 必須完成的可驗收成果 |
| --- | --- | --- |
| **R0｜鎖定現況** | 固定 B-63 可用功能、來源、回歸與資料格式基準 | 先取得既有回歸基準；逐筆建立舊測試→受驗證行為→新測試映射，辨認可移轉、可合併、可淘汰的舊實作測試；重構後允許刪除已替代測試 |
| **R1｜共用契約與模型** | 按 Core 的真運作系統建立共同命令、狀態、商品／事件編譯及回呼生命週期契約 | 明確輸入、輸出、副作用、數值取整、隨機抽樣、錯誤處理、街道擴充點及 WorldState 原子邊界；不要求一次寫完所有原版功能 |
| **R2｜共用市場／交易／商品使用** | 用同一商品／交易／USE 執行器承接 #10／#11／#14 與 #79／#14 USE，分為 R2-A～E（狀態見上表） | 已支援的來源合法 `itemId/useId` 以資料及必要回呼接入，不新增專用命令／交易演算法，完成舊路徑遷移與等價測試治理；原版 Perl／CAS／磁碟／HTTP 證據仍成立。**目前未完成** |
| **R3｜共用自然販售／時間** | 將已審閱的售價、需求、自然販售、PLUS、時間、回呼順序收斂至共同流程 | 以 #10、#40 和來源合法取得的 #41～#44 做資料驅動差異測試；不得為四種新劍再各建販售引擎 |
| **R4｜共用事件與決算** | 同一世界正確執行事件開始／到期／持續、必要商品回呼、SortDT、36h 跨期與期末擴充 | 真世界同一 revision 原子提交一次；Perl／Node／HTTP 跨期、磁碟重啟及續營可比對；未知效果不跳過 |
| **R5｜完成單機遊玩閉環** | 將 R1～R4 串接既有繁中 UI、本機存檔 | 玩家從零可完整玩過一個期末再續營，才進行使用者集中人工驗收 |
| **R6｜跨街道擴充性驗證** | 以 URon 出售麵食增加髒碗，WAtlas 期末海域更新檢驗共同 Core | 同一個共同引擎不複製基礎販售或決算邏輯；街道可保存獨有狀態 |
| **R7｜完整玩法／多人** | 補全標準街附屬玩法、跨街互動、主帳號與多人 | 分系統驗收權限／原子性／跨玩家一致性，單機共同規則不分叉 |

**B-64 的舊建議已被取代：** 不以「新增 #41～#44 專用自然販售」作為下一輪主工作。原版劍類合法來源與四種不同販售參數可以作為 R3 的**通用自然販售驗證資料**，不能成為四個新的 hardcoded command。除非發現某種劍有來源支持的特殊回呼，否則新增商品只應改資料及必要測試，不應改共用執行流程。

## 降低重複驗證成本，不能降低原版忠實性

1. **共用一次、按能力驗收：** 對 MakeAmount、GetSaleTax、UseTime、CheckWholeStore、NaturalSale、EventLifecycle、Period 等共用演算法建立來源定位、實作及可重用差分／性質測試；新商品只驗證其編譯欄位、特殊回呼與相關整合案例。
2. **分層測試：** 快速共同公式測試 → 原版 Perl oracle 代表性與邊界值 → StreetModule 差異／回呼順序 → 真 WorldState CAS／存檔／HTTP E2E。避免每加一個普通商品都重新建立完整獨立服務及複製 52 個 Perl 測試的前置。
3. **穩定測試工具：** 原版來源 hash、探針輸入格式、亂數注入、時鐘、世界 fixture、存檔復原共享工具；不為每個 B 編號重做同樣工具。已核對原版 Perl 行為不得以 JS RNG 看似相同替代。
4. **合法輸入與未支援語義分開：** 對已編譯並有共同執行能力的商品，以相同命令處理；只有未知回呼、未支援 DSL 語義、來源變更或確實無法表達的狀態才拒絕。不可只因 itemId 不在某輪測試白名單就永久不支援。
5. **不得放寬最終品質門檻：** 每次正式推送仍要同一 HEAD 的 Push 與 Draft PR CI completed/success、固定 Core／DSL 稽核。原版異常、資產安全、存檔復原及端對端行為的**必要驗證不可失去**；允許改寫或移除過時的測試檔，前提是對應行為已由新的來源差分、通用契約、整合或安全測試取代且通過。斷言總數可以下降，覆蓋能力不能無故下降。
6. **每輪以玩家／引擎能力交付**，回報可重用的命令種類、合法商品覆蓋範圍、特殊回呼、可連續經營流程及未支援原因；不以階段編號、斷言總數或新增幾個白名單商品當主要進度。

## 重構測試治理：新增必要測試，也要清除已不需要的測試

**現況快照（本次檢視 Git 樹，不是逐檔內容審核）：** modern/tests/ 有約 180 個追蹤檔案，其中約 119 個位於 original-perl/（含 Perl 探針、測試、輔助程式及來源鏡像），B-41～B-63 各有命名的 Node 階段測試，還有不按階段命名的共同模型測試。**檔案數不是測試數；尚未據此認定哪一檔必須刪除。**

| 既有測試的實際角色 | 動作 | 合法條件 |
| --- | --- | --- |
| 固定 Core／DSL SHA、原版 Perl 可觀察輸出、已發現異常 | **保留證據，允許集中管理或改寫探針** | 新測試能覆蓋同等原版行為、邊界與反例；來源本體仍未修改 |
| 專用 #10／#11／#14 買入、特定 USE 的 Node 測試 | **移轉／合併到共用市場、USE 契約測試** | 改用同一正式命令及執行路徑測多種商品；原版金錢／庫存／時間／副作用一致 |
| B-35→36→37 等相鄰階段重複 PLUS fixture | **重疊測試可合併；歷史上重要的稀疏與順序案例保留** | 有共同市場 PLUS 來源驗證，仍測負供貨、上限、稀疏 CSV 與順序 |
| 只驗證已淘汰的 hardcoded dispatch／特殊命令存在 | **新契約穩定後移除或改寫** | 舊介面停用或已兼容遷移；不再因已刪專用命令而誤報失敗 |
| CASE 回呼／EVENT／期末及存檔／CAS／HTTP 安全測試 | **必要測試保留或換成較有代表性的共用整合測試** | 隨機順序、原版邊界、原子性、回復、拒絕不變更資產等不得遺漏 |
| 人工 fixture／demo 專用測試 | **評估是否仍有測試價值；可刪除或移出主驗收** | 不能把人工資料結果繼續當作正式玩法覆蓋，亦不能無替代就失去有用的異常證據 |

**新測試必加：** 通用指令跨 itemId／useId，資料驅動商品定義，原版 Perl 對照的運算和回呼時序，非法來源／超限／資金不足／庫存不足的拒絕與 rollback，CAS 競爭與版本過期，磁碟重啟後的同一世界結果；到時間／EVENT／決算階段，再補跨期重入、亂數重播與街道效果測試。新增案例以實際新規則和風險為準，不能硬性要求每一件商品都跑一套完整 HTTP E2E。

**刪除測試的先決流程：** 先在 R0 編製「測試路徑／來源行為／所驗證風險／替代測試／處置／理由」清冊；再新增或改寫替代測試，使新舊路徑在切換期並行比對；確認 Perl oracle 與必要安全／E2E 覆蓋後，於同一開發工作分支刪除過時測試及不再使用的探針／fixture／CI 指令；最後跑更新後的完整 CI。不得先刪掉失敗測試讓 CI 變綠，也不必保留對已移除程式內部細節的無效斷言。

**計數原則：** 重構前後測試數量不可直接比較成「品質變好／變差」。回報應使用能力矩陣（核心共用功能、支援商品範圍、已覆蓋來源特例、資產安全、可玩流程），並列出新增、合併、移除的測試與其理由。歷史階段中的舊斷言總數僅作當時快照，CI 配置必須反映目前有效測試集合。

## 原 2026-11-22 計畫修訂時的歷史快照（非目前 HEAD 或 R2 狀態）

- **歷史計畫當時的**移植 HEAD 基準：test/task02-baseline-on-s1@45b37e69eef3de2f8c733fd72695c80d24045599（**不是現在 HEAD，不可用於驗收最新 R2**），Draft PR #1 未合併；B-63 支援地圖 #14 **首次**使用的五種劍 GET 結果、加倍與損毀，但 #41～#44 未有正常自然販售能力。
- B-43 本機雙世代存檔及可操作的繁中本機 HTTP 介面已存在，尚非正式多人伺服器；原版 36 小時期末仍未整合成真正的玩家世界命令。
- 此段是原計畫修訂時的歷史情境；其後已提交 R2-A 市場買入核心初版，**最新判定請一律回到本檔最上方 R2-A～E 表及獨立狀態文件**。不回寫或假造已完成的 Notion 任務、玩家驗收。

---

## B-40～B-55 歷史實作紀錄（僅供溯源；上方現行路線優先）

以下保留舊階段記載的當時結果與限制。其中以「下一步 B-xx」或「目前尚未」描述的句子均以當時提交為時間基準，不再代表本計畫最新狀態；B-56～B-63 的實際歷史見各階段文件及 [next-window-handoff.md](next-window-handoff.md)。

## B-40 新增玩家可驗證的第一段閉環（2026-11-21）

- **已有可操作**：由 `cd modern && npm run dev:local` 開啟 `http://127.0.0.1:4173`，店內／市場／倉庫同步顯示來源世界、金錢、行動時間、展示架／真正庫存，按供貨、按買入 #10；無貨按鈕也能實際叫後端拒絕。Node 的 HTTP 實測操作串接真 `Game Core -> StandardStreetModule -> WorldState` 及版本 CAS，不是 JSON demo。原版 B-34 首次市場空白，B-37 59 項 PLUS 與上限檢查提供真正市場貨源，B-40 以原版 `buy-s.cgi` 市場邏輯提交付款與庫存更新。
- **原版來源特別注意**：`SetWholeStore` 會對全部79格賦值，包含尾端未定義格，Perl `join(',',@DTwholestore)` 仍保留尾端逗號；與首次 B-34 精簡稀疏批發 CSV 不同。Node 以 `sourceWriteShape: whole-store-79` 區分兩種由不同原版流程產生的真實 wire 形狀，後續 PLUS 仍保留該來源長度，避免破壞存檔相容性。
- **尚未實作**：可在 UI 上架／自然販售、週期時鐘、完整決算、真磁碟存讀、多人。來源供貨時間片不等於經過真實遊戲時間。下一 B-41 優先完成真正買到商品後的上架／售出，留在同一前端驗收。**此段不更動正式 12 項 Notion 任務的完成狀態。**

## B-41｜真正進貨所得商品的原版上架、來源自然販售與可操作時間快轉（2026-11-21）

- B-41 直接擴充 B-40 原版繁中本機 UI：真市場購買 #10 入庫後，在「自店 > 倉庫」用固定原版 `sc-s.cgi` 對應的 `edit-showcase` 合法上架；「自店 > 店內」快轉 1／10／30／60 分鐘或自填 1～60 分鐘。全部送入原本 `GameCore → StandardStreetModule → WorldState CAS`，介面不自行改動金錢、庫存或人氣。
- 真正時間片使用原版 `inc-turn.cgi` 的自然銷售原文為依據，包含 `GetMarketStatus`、`GetSaleTax`、持有量與人氣／維持費演算，接59項原版 PLUS 與 `CheckWholeStore`，同時計入新的世界時間。Perl 探針直接執行真 `buy-s.cgi → sc-s.cgi → 原版自然販售片段 → 原版 PLUS`，Node/HTTP E2E 需對照現金、日帳、庫存、人氣、79格市場和小數維持費。
- **仍不表示表格第2/3/4項的通用驗收完成：** 目前只開放單店原價 #10 和單次最多60分鐘；尚不能跨結算線或執行任意商品回呼，沒有支援「連續兩輪＋原版期末結算」與磁碟存讀檔。把時間快轉視為受控來源測試，不將單獨的 B-37 市場供貨子步驟混成完整週期。
- [可直接手動測試的 B-41 逐步驗收文件](b41-real-market-showcase-natural-sale.md)。此文件只記進度，正式 Notion 02／04／05 不提前標示完成。



## B-42｜已驗證連續兩輪經營；跨期結算仍未實作（2026-11-21）

玩家可沿用 B-40/B-41 原版繁中本機 UI：真買 #10／合法上架／自然販售 → 同一來源世界補貨後真買 #10 → 第二次自然販售 → 空架庫存0仍能快轉。固定原版 Perl、Node、HTTP E2E 已驗證同一店金額、庫存、`saletoday=10000`、`paytoday=10000`、`itemtoday[10]=2`、人氣及批發原始 CSV，不加入人工 #10。修正 B-41 時鐘偏移：真正期別偏移為 JST9h−日期修正6h=+3h；UI 可看結算倒數但跨期仍拒絕。

後續近期最高優先是**原版完整期末結算**，其前提包括必要的 `SortDT`／`FUNCSALE` 與 `FUNCTURN` 審核、領地／人口／事件狀態、原版 `inc-period.cgi` 期末費用與帳務轉期、回呼／備份安全範圍；完成原版 Perl/Node/HTTP 一次真跨期驗收後才在原 UI 放行，再做可靠存讀檔。正式任務狀態維持原狀。[B-42 詳細流程與限制](b42-continuous-playable-loop.md)。


## B-43｜真磁碟世代存檔、服務重啟與二次經營（2026-11-21）

在原版風格繁中 UI 加入「儲存世界／載入存檔」，直接保存真商品#10市場進貨／合法上架／自然銷售後的來源 GameCore／StreetModule／WorldState，並能在**關閉 Node 後重新啟動**、載入同一世界版本、繼續第二次真進貨／自然販售。採兩個獨立有校驗的本機 JSON 世代檔，失敗與損毀後只能回復可驗證的舊版本，禁止默默重建商品；有版本拒絕、不能覆寫不同世界及來源市場驗證。詳見 [B-43 本機持久化驗收](b43-durable-local-save.md)。這是本機玩家存讀檔，**不是原版 CGI 檔案存讀，不提供多進程並行、伺服器帳號或保證斷電後每個平台皆一致**。

B-42 已能連續兩輪真買與真售、B-43 可重啟載入；**完整可玩閉環仍差真實跨36小時結算**：依固定 `inc-turn.cgi` 的必要 FUNCTURN／FUNCSALE／SortDT／`inc-period.cgi`，建模真實商店／領地／人口／事件及期末帳冊，並以 Perl／Node／HTTP 跨期 E2E 證明防重複入帳。不要將舊表格順序誤認成 B-43 功能已等同完成所有週期；正式任務狀態不變。


## 2026-11-21｜B-44～B-46 原版期末三階段來源驗證，不等於真跨期完成

已用固定原版 Perl 原始程式片段加上 Node 對照，建立原版單店期末帳務（含加權損益、當期收入支出轉期、維持費、熟練度）、單店第1名 `@@FUNCUPDATE` 九種獎品與持有上限（Core AddItem）、原版城市初始 `STATE`／人口發展治安／軍費及無領主兵力分配。詳見 [期末來源三階段](b44-b46-source-period-stages.md)。

仍須保持真跨期拒絕：這些是**孤立來源子階段**，目前世界轉場沒有真 `SortDT`、完整 ITEM FUNCTURN/FUNCSALE、世界事件啟動／終止、公會與原版完整 `inc-period.cgi` 原子狀態及檔案效果；不得將測試幾個公式視為完成遊戲。**下一個可玩閉環關鍵優先：依原版真順序建構全世界必備欄位與事件安全合約 → 真跨界 HTTP E2E → B-43 磁碟重啟後跨期繼續營業 → 一次集中人工驗收**。保存現有原版 +3h 時鐘、單店真買入及出售、真存檔，不假補庫存，不變更正式 Notion 任務狀態。

## 2026-11-21｜B-47 原版單店排序／期末前事件來源警示

以真原版 `SortDT`／`GetDTPoint` 的 Perl 隔離執行及 Node 對照，補上單店排行榜分數計算和順位索引，與前面 B-44～B-46 商店帳務、獎品、領地三階段互相對接的必要條件。固定 `inc-turn.cgi` 事件迴圈含 `startproba==0` 的無條件路徑，固定 `inc-makeitem.cgi` 僅排除 -1 事件；標準街 `rebel`／`guildbattle` 使用 `start 0`。下一步不可把事件當成不存在，必須處理來源 EVENT/END/FUNC 變更後才可與原版完整期末操作原子串接。[B-44～B-47 真來源階段與剩餘缺口](b44-b46-source-period-stages.md)。跨期仍保持拒絕，不混淆已經有的 B-43 真磁碟存讀檔，使用者仍僅在完整遊戲閉環後集中驗收。

## 2026-11-21｜B-48／B-49 EVENT 期末控制流來源比對（未解鎖跨期）

新增固定原版 Perl EVENT 啟動、期限結束後才重新啟動的相鄰來源區段真執行，Node 在單一**無自訂回呼的合成事件**比對 `startproba==0` 仍抽樣、原版 `startproba=-1` 編譯排除、嚴格 `到期 < 片尾`、同群組阻擋及必要的時間抽樣；不以事件是0機率為由跳過叛亂／商會戰等動態行為。[B-48～B-49 來源證據及限制](b48-b49-original-event-gates.md)。

玩家的最終可玩閉環門檻維持不變：必須在同一繁中 UI 的真來源 WorldState 順序整合 EVENT／FUNCTURN／FUNCSALE／SortDT／B-44～B-47 完整期末／59 PLUS，原版 Perl／Node／HTTP 真跨36小時＋B-43 磁碟落盤重啟後可接續經營才開放集中驗收。現在仍拒絕跨期，**不拿純模型測試替代真世界行為**。最終提交同 SHA Push／PR CI 並回寫 GitHub／Notion，Draft PR 不合併。

## 2026-11-21｜B-50 同一商店／城市連續兩期原版結算前綴，仍須接真 WorldState

B-44～B-47 先前單獨驗證帳務、冠軍獎品、城市領地與 SortDT；本次直接從固定原版 `period.cgi` 擷取、執行**整個原版前綴（直到原版備份／session I/O）**，含真正 Standard Street `@@FUNCUPDATE` 前後兩個回呼與原版 `AddItem`；在同一 `$DT[0]`、`$STATE`、`$DTpeople` 真連續跑兩期，原版 Perl／Node 比對**全商店／城市欄位**，證明第一期獎品、維持費、人口、EXP 到第二期持續有效。這不是 B-43 玩家 WorldState 的跨期命令，仍**無法**在瀏覽器跨36小時。原版龍賽、公會、失蹤店鋪、完整 EVENT／ITEM 動態回呼、備份、session 尚未被完整實作；純投射明確設 `nonCommittable` 並拒絕未知分支。詳見 [B-50 真來源同世界兩期](b50-source-same-state-period-chain.md)。

**接下來要直接接上玩家路徑，別再把擴充孤立測試當主要目標：** 以來源合法的 City/Period/Event 欄位擴充可持久化世界狀態，在真正的自然販售／EVENT 連續迴圈中確保每個期末全段恰好原子提交一次，再做真跨期 HTTP／磁碟重啟／再次營業的 E2E。使用者僅在完成該整個閉環後進行集中人工驗收。中間保留雙 CI 同 SHA／Core SHA／DSL 稽核，PR 不合併。

## 2026-11-21｜B-51 來源城市與期別 v2：實際進玩家世界、瀏覽器顯示、可保存重啟

在 B-50 真來源同一間商店／城市連續兩期整合驗證後，新增有來源語義閘的 `akimono.memory-world.v2` 第九欄 `period`：只有透過原版 Admin + Core STATE 真初始資料確認的城市／人口、原版36h期界 +3h、`settledCount:0`、`eventState:null` 才能由本機來源商店服務建立並雙世代落盤。新增世界真商品 #10 買入、展示架、自然販售及存檔／載入之後城市資料保留，畫面顯示初始人口500000、發展5001、治安5001、已結算0期；已存在的 v1 世界保持原 schema 不默默升級，舊存檔仍可讀寫。B-43 新的 HTTP 殺 Node → 重開載入 E2E 驗證 v2 的城市仍在；偽造 `settledCount`、修改城市、捏造 EVENT 會被 B-43 磁碟校驗拒絕。[B-51 城市／期別玩家流程和限制](b51-original-period-world-v2.md)。

**核心距離完成還有一段：v2 存的是「初始化城市」，不是已結算的真城市！** `B-50` 同世界兩期仍 `nonCommittable`；EVENT 及 FUNCTURN/FUNCSALE、全期真轉場與原版檔案效果尚需完成，跨期拒絕維持。接下來優先把 B-50 的完整原版期末前綴與必要 EVENT、營業自然販售、59 PLUS 串為單一來源正確 WorldState CAS，再驗證36h跨界、磁碟落盤、重啟續買續售才准使用者一次集中手動確認。仍不更動 main／migration／固定 Core／DSL 或 Draft PR 狀態。

## 2026-11-21｜B-52 真原版事件初始 CSV／未知狀態保持，仍需完整 EVENT 生命週期

固定 Admin 初始 `play.cgi` 的第四行是 EVENT 空白 CSV；固定 `DataRead` 真的以 `%DTevent=split(/,/,$DATA[$idx++]);` 解析，固定 `DataWrite` 以 `join(",",%DTevent)` 落盤，B-52 Perl 真執行了來源空表及測試單事件的讀寫往返（非虛構事件）。新 B-51 v2 世界 `period.eventState={}` 只代表**剛建立、沒有發生過任何時間片**的零活動事件；B-41 原版自然販售＋PLUS 雖可讓玩家在同一世界繼續經營，但因原版完整 EVENT 回呼尚未執行，時間推進後立即記 `eventState:null` 為「未知」，B-43 真存檔重啟載入與繁中 UI 同樣保持這個狀態。舊版 v2 `null` 存檔保留相容，偽造如 `{rebel:123456}` 等未經來源事件引擎批准的 state 仍拒絕。[原版 B-52 讀寫證據及下一步](b52-original-event-state-source.md)。

玩家驗收門檻不變：**尚不能跨36小時期末**。必須完成真正 Standard Street 原版 EVENT 定義／機率／群組／到期／startfunc/endfunc/nowfunc、商品 FUNCTURN/FUNCSALE、原版完整期末＋B-50 同城兩期，將 v2 period/shop/market/events 在一筆合法 CAS 原子轉場並可 B-43 磁碟重啟續營；不能以空 EVENT 取代未知或利用重抽避開觸發。維持來源 Perl／Node／HTTP 同步測試、同 SHA Push/PR 雙 CI、Draft PR 不合併、main／migration／原始 Core CGI／DSL 不變，使用者完整閉環後一次集中人工驗收。

## 2026-11-21｜B-53：真原版 EVENT 編譯清單可讀，後續優先實作真正多事件回呼

從 Standard Street 真實 25個 EVENT 來源（ITEM 23、rebel 2），依固定 `inc-makeitem.cgi` 真 Perl `GetNumber/GetTime` 轉換逐項比對 Node：原版 `start 10%` 編入100、重複 `start 50%` 後再 `start -1` 會被排除，8個來源負一停用、15個正機率及 `rebel`／`guildbattle` 2個0機率總共17個會被編入。這份 `reviewedEventCatalog` 是**只讀原始編譯事件清單，`runtimeSupported=false`**，繁中 UI 能顯示25個宣告／17個入編譯，但事件動態回呼、Perl hash 順序、時間片 EVENT 修改仍未執行。不能用已整理清單假冒完整事件引擎，或把 B-52 當前 `eventState=null`（來源未知）假稱空事件。[B-53 原始編譯器及25個 EVENT 來源證據](b53-compiled-event-manifest.md)。

真正跨36小時仍拒絕，下一步以**實際玩家時間片中的事件啟動／過期／商品回呼和來源市場、城鎮副作用**為主，保持事件亂數不可藉反覆失敗重抽逃避；完成再與 B-50 同店同城期末、B-43 可恢復存檔一體整合，通過真 HTTP跨期→重開→續營才給使用者集中驗收。Draft PR #1、main、migration、固定 Core/DSL 與正式 Notion 任務狀態均先不改。

## 2026-11-21｜B-54 真本機來源抽樣不再因 Node 重啟重抽

B-54 修正真正玩家使用的 B-37供貨與B-41自然販售抽樣：先前真 HTTP 使用 `crypto.randomInt()`，在同一個已存入 B-43 的 WorldState revision 重試會得到不同結果。現改用 `worldId/revision/nowSeconds/來源指令及參數` 派生 SHA256 48-bit 無偏抽樣的百萬分位串流，因此同一世界同一操作**重啟可重播同一結果**，不同revision/指令/參數分離。這是**遷移本機重播策略，不宣稱原版 Perl RAND 種子相同或多人工具防作弊**。真 HTTP E2E 不使用 fixture 隨機，確實做到市場真供貨→真買 #10→上架→存盤→真快轉→關 Node→讀原存檔→同版再快轉完全一致→再存盤重啟仍相同，包含城市和EVENT未知標記。失敗 stale CAS 不提交、前端亂數雜訊不能注入。[B-54 文件與來源差異](b54-restart-stable-source-draws.md)。

**仍然不得開放真正36h跨期**。必須補上17個 EVENT 定義的真開始/過期/回呼/群組/原版亂數遍歷與商品 FUNCTURN/FUNCSALE，然後與 B-50 的真原版單商店／城市期末、來源檔案副作用及 B-43 原子持久化整合，真HTTP跨期後 Node 重啟續營。此版本只是消除同版本重抽問題，不能假裝已完成事件或結算。維持雙 CI 同 SHA、main/原版 Core/DSL 凍結、Draft PR #1未合併；使用者只在完整可玩閉環後一次集中人工驗收。

## 2026-11-22｜B-55 真原版即時 EVENT 回呼已經過 GameCore CAS、磁碟存檔與續營

本輪直接真執行固定原版 Standard Street DSL 中 `manbiki`（偷竊）與 `goutou`（強盜）的完整 Perl STARTFUNC，Node 逐項同源比較原版機器人#64防禦／損毀、展示架原版 `int(stock/10)`／`int(stock/4)` 商品損失、強盜人氣 `rank-int(rank/5)`、訊息、返回0和精確亂數。新增受限定的 **內部回呼開發指令** `reviewed-instant-event-callback-fixture`，由真 Standard Street Module 透過 GameCore expectedRevision CAS 修改真正原版開店／批發#10真購買／合法展示架／自然販售後的玩家商店；B-43 雙世代磁碟儲存讀回與繼續真自然售出均已驗證。錯誤來源或多餘亂數拒絕，不動世界。**不開本機玩家 HTTP 事件按鈕**，因為這是兩種 callback 效果，不是完整原版 EVENT自然觸發與多EVENT hash亂數／到期／群組引擎；不能宣稱已修復全時間片。原版 `startfunc` 返回0不應寫出假的活動事件。詳見 [B-55 真來源偷竊強盜效果／CAS測試](b55-source-event-instant-callbacks.md)。

**玩家完整閉環尚未完成，原版36h跨期仍需拒絕**：優先把 B-53 的17個編譯 EVENT 真實起訖及所有 start/now/end 回呼、其他商品 FUNCTURN/FUNCSALE 正確組成單一來源時間片與 WorldState CAS，再把 B-50同源期末、原版各類副作用及 B-43耐久落盤合併，通過真HTTP「開店→進貨→上架→自然售出→36h真跨期→保存重啟→下一期續賣」才請使用者一次集中驗收。main、migration、原始Core／DSL凍結且 Draft PR 未合併。
