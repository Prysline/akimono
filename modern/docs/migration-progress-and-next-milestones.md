**2026-11-23｜R4 最新驗收（仍未完成）：** guildbattle END 與 rebel NOW 已接入同一凍結 Perl 17-key EVENT END／START／NOW，與十種 durable、五種 STARTFUNC、happy 共用真 hash／RNG；另記錄 NOW 回呼自刪前的真 Perl key order。來源提交 37fc981113c1df3ce1195279589dec9d47cf8098 雙 Actions 通過：Node 1076／1076、Perl 2114／2114（65 .t）。真正 36h 全期末、外部 IO、WorldState／CAS、HTTP 存檔／重啟未完成，見 [R4 退出清冊](r4-exit-audit.md)。

**2026-11-23｜R4 續作最新來源驗收（仍未完成）：** 已把 B-59 鐵礦脈與 B-61 劍需求加入 17-key 真 Perl EVENT 混合，共十種持續 EVENT＋getmoney/getpop、manbiki/goutou、loto/happy 的共享亂數；額外完成 `guildbattle` 真 END 來源、`rebel` 82 行 NOWFUNC、期末 `RebelRobin` 及「期末觸發→同片 NOW」八案真 Perl 連續差分。最新來源提交 `38d5730dfd96d0995136174e8cb48f013818143e` Push/PR 雙 CI completed/success，Node 1070/1070、Perl 2098/2098（65 檔）。**這些仍是受控 `committable:false` 局部測試，完整 17-key 特殊事件混合、真跨 36h 期末、WorldState／HTTP／CAS／重啟均未結案；詳見 [R4 退出清冊](r4-exit-audit.md)。**

# 《商人物語》移植進度與里程碑｜2026-11-22 共用引擎架構修正

**2026-11-23｜R4 九種 EVENT ITEM PARAM：真凍結編譯器 Oracle 已通過（來源局部，不是 R4 結案）。** 新增共用 `original-r4-event-item-param.mjs`，以 B-53 17 EVENT 已審閱編譯結果解析其中九種 ITEM PARAM；真 Perl 探針直接從凍結 `inc-makeitem.cgi::OutEventData` 生成並執行原版 `$ITEM[n]` 算式，Node/Perl 九 EVENT × 79 ITEM 逐欄對照通過。它只處理來源欄位純算式，不執行 EVENT 的開始／結束／NOWFUNC、原版 hash/群組/RNG 或正式 WorldState；R4 及 36h 期末／HTTP 閉環仍不結案。詳見 [R4 來源契約](r4-source-time-slices-contract.md)／[R0 測試映射](r4-r0-affected-tests-mapping.md)。


**2026-11-23｜R4 新增排序／EVENT fixture 與跨期人口 PLUS 證據（受控部分，未結案）：** R3 共用回呼後、PLUS 前的 B-47 真 `SortDT` 已接入 R4 純投影；B-56 可選擇用此排序完成同一個事件 fixture 時間片（非原版 hash 證明）。59 PLUS 新增原版動態 `$DTpeople` 支援，250000／500000／750000 的 Perl 真原文差分驗證，遇未授權的期末人口仍拒絕。**尚未**完成 17 EVENT 全生命週期、跨36h完整期末的可提交 WorldState、HTTP/CAS/重啟整合；R4 不得退出。來源與測試詳見 [R4 契約](r4-source-time-slices-contract.md)、[R0 測試映射](r4-r0-affected-tests-mapping.md)。


**2026-11-23｜R4 SortDT 已在受控純投影中接入：** 原版 `GetDTPoint/SortDT` 的 B-47 審閱器放在 ITEM 回呼之後、59 PLUS 之前，真 Perl Oracle 與合法買入→販售同世界 Node 差分新增；保留既有 R3／B-56 舊路徑。此階段**尚未**結合 36h 期末或完整 EVENT，也不提供正式可提交 R4 回合，仍拒絕未知 EVENT／跨期。詳見 [R4 來源契約](r4-source-time-slices-contract.md)、[測試映射](r4-r0-affected-tests-mapping.md)。

**2026-11-23｜R4-A 受限原版 hash 探針：** 已新增直接執行凍結編譯器輸出的 17 EVENT Perl hash 初始化、實際 `keys(%EVENT)` 與明示人工三鍵 `keys(%DTevent)` Oracle，並加 Perl／Node 差分。**這不等於 EVENT 真生命週期或 RNG 來源完全等價**，不硬編任何排列，也不將 B-56 的明示 fixture 假稱原版 runtime。R4 仍未退出；跨期正式世界繼續 fail-closed。詳見 [R4 來源契約](r4-source-time-slices-contract.md)、[R0 受影響測試](r4-r0-affected-tests-mapping.md)。


**2026-11-23｜R4 部分進展（未結案）：** 已新增真原版 Perl `inc-turn.cgi` 36h `@timespan` 切割 Oracle、Node 逐案差分，並在 R3 前 EVENT 共用入口的跨期判定使用同一已審閱切割器；來源未知的 SortDT／完整 36h 期末與 17 EVENT／RNG 尚未完成，跨期仍 fail-closed，不把本工作包稱為 R4 出口。詳見 [R4 時間片來源契約](r4-source-time-slices-contract.md) 與 [R4 R0 測試映射](r4-r0-affected-tests-mapping.md)。


**2026-11-23｜最新正式判定：R3 共用自然販售／時間已完成自身受控來源退出驗收。** 標準街單店單架、六商品 #10／#40～#44，經原版直接 Perl 24+24+24 案（含 1–200% 定價、GetSaleTax、ITEM FUNCTURN／FUNCSALE、59 PLUS 與來源時間片）、真 HTTP、GameCore CAS、雙世代存檔與重啟驗證。正式 `projectR3PreEventTurn` 只產生前 EVENT 的來源狀態，拒絕未知 incoming EVENT，**不寫入 period**，供 R4 接續；舊公開 `advance-source-time` 仍標記未跑 EVENT 為 `null`（未知）。**R3 的完成不表示完整原版時間或玩家可不限次數經營**：EVENT 17-key Perl hash 原序、SortDT／36h、合法連續販售由 R4/R5 負責，R0／R1 全量與其餘 USE 仍未完成。下方標示 R3「部分完成／未結案」者是先前歷史狀態；以此判定和 [R3 退出清冊](r3-exit-audit.md) 為準。

**R3 退出驗收判定（2026-11-23）：** 來源六商品共用原價／百分比價格、需求、GetSaleTax、自然販售、ITEM 回呼及 59 PLUS 的 24+24+24 組真 Perl 差分與真 HTTP/CAS/重啟已成立，但完整 R3 尚未結案：正式時間仍有 EVENT 未知狀態，無法宣稱六種劍可無限制連續經營。**完整客觀通過／阻塞矩陣見 [R3 退出驗收清冊](r3-exit-audit.md)**。R4 的 EVENT／SortDT／36h 不以固定 fixture 代替，R0／R1 全量與所有 USE 均未完成。

**2026-11-23｜R3 六商品販售原版定價／稅額擴充：** 共用 `projectSharedNaturalSale` 從「固定原價」擴充到來源 `sc-s.cgi` 的 1～200% 定價；同一個來源支援的 #10、#40～#44 共用販售需求、價格懲罰、供需、售量、人氣與 `item.cgi::GetSaleTax` 超價附加稅，賣出總額與扣稅後入帳分開，`taxtoday` 更新。`shared-showcase-price.mjs`、來源審閱、`POST /api/showcase`、繁中 UI 與 B-43 兩代存檔接受合法來源百分比，拒絕任意造價和 201%／多餘欄位；原價 `priceOverride` 只保留測試相容。新增原版 Perl 6 商品 × 4 比例 24 組差分、原版直接「自然販售 → ITEM FUNCTURN/FUNCSALE → 59 PLUS」6×2×2 整合探針、標記稅額與需求原始碼 drift，以及真 HTTP 150% 稅額→保存→重啟。**完整 R3 退出仍須以最後同 SHA CI、EVENT 前置語義與合法連續經營驗收確認；EVENT 全生命週期與 36h 期末屬 R4，不可把未知事件當作無事件。**

**2026-11-23｜R3 ITEM 回呼分派與一分鐘抽樣（受控新增，整體未結案）：** 已在來源自然販售與 59 PLUS 之間加入依原版 `inc-turn.cgi` 審閱的 ITEM FUNCTURN／FUNCSALE 階段：標準街唯一 #70 回呼即使沒有持有者，60 秒仍會消耗一筆 rand(1)；並於 FUNCSALE 後清除 `_sale_count_` 暫存。原版 Perl 直接分派探針 `original-r3-item-callback-stage-probe.pl` 與 Node 差分已新增，真 HTTP 一分鐘／存檔重啟測試亦已補上；其他來源回呼或 #70 真持有仍拒絕。EVENT 17-key hash 順序、SortDT／36 小時結算、全部 USE／多商店尚未完成，R3 不宣告結案。


**2026-11-23 市場貨架修正／R3 續驗：** 已依凍結原版 `whole.cgi::GetWholeStore` 將一般市場清單改為只顯示 `wholesale>0` 商品，原版 79 ITEM Registry 另供倉庫名稱查詢；缺貨品不再佔據市場貨架，原本的 `market-buy` 報價、上限、CAS、PLUS 不變。R2-C 新增直接執行原版 `GetWholeStore()` 的 HTTP 貨架與排序差分，R3 真時間＋PLUS、重啟後在售貨架與庫存同步回歸；本修正不代表 EVENT／FUNCTURN／FUNCSALE 或 36h 結算完成。

## 2026-11-22｜最新權威：R3 共用自然販售／時間「受控部分完成，未達退出條件」

**現況與下一步（優先於下方 R2-E 歷史快照）：** R2 A～E 仍為原本受控完成；R3 新增來源審閱六商品（#10、#40～#44）共用自然販售算式與 24 組真 Perl 原版差分、真實 #14 地圖 BUY→共用 USE 五劍→同一販售入口、現有繁中 HTTP 上架／CAS／雙世代存檔／實際重啟續營測試。新程式：src/shared-natural-sale-core.mjs；更新 src/original-b41-playable-sale.mjs、src/standard-street-module.mjs、scripts/dev-local.mjs、local-ui 與 local-world-save-store。測試：tests/original-perl/original-r3-shared-sale-probe.pl、tests/r3-shared-natural-sale.test.mjs、tests/r3-shared-sword-acquisition-sales.test.mjs、tests/r3-real-sword-http-restart.test.mjs。原有市場買入、USE 與原版來源 SHA 未更動。

**界線／不宣告結案：** 真原版完整時間執行的 FUNCTURN／FUNCSALE、EVENT 與 17 個 Perl hash 順序、跨期決算、多商店／街道差異、非原價與其他回呼尚未驗證。現存 B-41 時間仍只計算來源自然販售＋PLUS 子區，執行後 eventState:null 表示未知事件，不能當成沒有事件；B-56 僅為明示 EVENT 順序 fixture。B-54 可重播亂數是本機政策，不是原版 Perl rand。R0／R1 **只補了本輪必要範圍**，全量未完成；R4 EVENT／36 小時期末、R5 閉環不可假稱完成。本輪僅在 test/task02-baseline-on-s1 的 modern/ 修改，PR #1 保持 Open／Draft、基底 migration/standard-street-s1，未修改 Notion 狀態。

**R3 新來源與 R0 清冊：** docs/r3-shared-natural-sale-source-contract.md；docs/r3-r0-affected-tests-mapping.md。下一工作窗優先：核對並實作完整 R3 回呼／EVENT 前置語義及可執行 Perl Oracle；對未知語義嚴格拒絕並保留 R4 跨期責任，不重做 R2。下方所有標示「最新權威：R2-E」段落僅為歷史記錄，非當前 R3 下一步。


## 2026-11-22｜最新權威：R2-E 真 HTTP／USE／存檔整合驗收（R2 A～E 受控範圍完成）

**正式移植里程碑：** R2 只在商品／USE 的特定來源審閱範圍結案，完整跨期、多店、EVENT 與所有 116 USE 不因這項驗收而完成。Notion 任務狀態本輪未動。

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

**里程碑判定：** R2-D 已完成自身驗收範圍；尚未完成包含 R2-E 多商品同世界 HTTP→SAVE/LOAD 與 R0/R1 全量後續任務，Notion 不自動改狀態。

**正式判定：R2-A、R2-B、R2-C、R2-D 已各自完成，R2-E 未完成；R2 整體、R0／R1 全量仍未結案。** 本節取代本檔下方「R2-D 未完成／下一步做 R2-D」歷史快照。唯一工作分支 `test/task02-baseline-on-s1`；只改 `modern/`；[PR #1](https://github.com/Prysline/akimono/pull/1) 必須保持 Open、Draft、未合併，目標 `migration/standard-street-s1`；凍結原版 Perl／DSL／Core SHA、其他分支、Notion 正式任務未修改。

**R2-D 正式入口與分工：** `GameCore.applyGameCommand` 僅以 `kind:'use-item'` → `src/shared-use-item-core.mjs::projectSharedUseItem` 執行 USE，欄位為 `expectedRevision,shopId,itemId,useId,requestedCount`，需要亂數時另給 `randomDraws`（原版順序、每筆 0～999999 的百萬分之一單位）。StreetModule `useItem.getRule/describe/validateWorld/writeMarket` 提供來源編譯 USE 規則及明示回呼／不支援原因，GameCore 不依商品 ID 複製 USE 公式。共用路徑處理 GetUseItem／CheckUseItem 檢查及原版數量裁切、money／paytoday、UseTime、依序消耗材料與 MakeAmount 產物、CheckWholeStore／市場、來源前後回呼、EXP；WorldState／CAS 原子提交，失敗不修改世界。原有 `market-buy` 唯一買入路徑保持不變。

**真原版覆蓋：** #79 禮物卷 USE #0「交換地圖集」每次用 2 卷，產出 #12、#9、#14 各一，1800 秒、金錢與 EXP 為 0；要求量 3 時會被手上 5 卷裁成 2 次。#14「到劍市的地圖」僅審閱首次 USE #0：12000 G、7200 秒、EXP[14]+20；五種劍 #40～#44 按原版 GET 各 10 次、機率 400/350/150/60/30‰。前回呼 `rand(1000)<=100` 可將產物基數加倍，正常逐件 MakeAmount 對應 50 個產物亂數，加倍改為每組兩個亂數的原版平方根運算；末端 `lostbook` 是 `rand(1000)<100` 消耗一張地圖。兩個回呼合計一般 52、加倍 12 次 rand，100/1000 邊界**加倍、不損毀**。缺 B-63 已審閱 helper 時只容許 B-62 不加倍／不損毀／僅木刀的保守分支。

**真正去重與安全邊界：** `gift-exchange-maps`、`use-original-sword-map-14`、`use-original-sword-map-14-all-outcomes` 三種舊正式命令與 StreetModule dispatch 已移除，`projectReviewedGiftMapUse`、`projectOriginalSwordMapUse`、`projectOriginalSwordMapAllOutcomes` 商品專用執行器已刪除，沒有留下執行不同公式的 alias；保留來源審閱器與原始 Perl 探針。非法 ITEM／USE、缺券、金錢／時間不足、過期 revision、未知 callback／EVENT／公會、未審閱機率／抽樣數、二次地圖熟練縮時、庫存／批發溢出與未知效果均 fail-closed，既不默默忽略也不部分寫入；**不是全部 116 USE 均已通用**。

**驗收證據：** `tests/r2d-unified-use-item.test.mjs` 與原 B-33／B-34／B-37／B-62／B-63 測試已使用同一 `use-item`；真凍結原版 Perl `original-gift-map-use-probe.pl` 六案例與 `original-b63-sword-map-all-outcomes-probe.pl` 六情境對照產物、材料、金錢、時間、EXP、回呼、損毀與亂數消耗，所有原版 Perl 差分檔與 R2-A/B/C 買入、CAS／存檔、DSL／Core SHA 測試保留。**程式版本 `f9f578000af135928e3f16283cc7b76eefd2aa53`** 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/45025885748) 和 [PR CI](https://github.com/Prysline/akimono/actions/runs/45025890130) 都 `completed/success`，**Node 921/921、原版 Perl 1867/1867（52個.t）、全部來源 SHA 成功**。此處是文件更新前的可追溯成功基準；文件更新後**仍必須對新 HEAD 重新驗收同一 SHA 的 Push／PR CI**，不能把舊綠燈冒充最終驗收。

**R2-E 無記憶下一窗：** 先重新查 PR #1 最新 HEAD、Draft／Open／未合併狀態、同 HEAD Actions 與上述六份文件頂部；只在工作分支的 `modern/` 開發。以現有 `market-buy`、`use-item` 為單一路徑，補真實繁中 UI／HTTP 共用 USE，將合法來源市場供貨→買入→#79 交換／#14 首次製作→同一 WorldState CAS→B-43 雙代落盤→關服重啟再載入再操作打通，補真原版 Perl／Node、R0 逐項測試映射與 R1 缺口；不因已有 R2-D 數值差分就宣告 R2-E、整體 R2 或 R0／R1 全量完成。未知 EVENT／回呼／二次 USE 維持拒絕。

---


## 2026-11-22｜里程碑更新：R2-C 唯一市場買入路徑已完成

**R2-A、R2-B、R2-C 已完成；R2-D／R2-E 與 R2 整體未完成，R0／R1 全量未結案。** 在唯一允許的 Draft PR #1／`test/task02-baseline-on-s1` 分支之 `modern/`，已把商品市場買入統一為來源 `marketBuyRegistry` 報價及 GameCore `market-buy` → WorldState/CAS。B-40 #10、B-58 #11、B-62 #14（真正原版 BASE 動態價）和新來源商品 #39 及其他已審閱普通商品不再要求個別交易命令。StreetModule 刪除所有 `buy-market-item-10/11/14` capability／dispatch；三套 `projectOriginalMarketBuy*` 和專用 `quoteOriginalMarket*` 已真正刪除，原版固定來源審閱、USE／LOTO、Perl Oracle 原檔保留。

**實際可操作的 UI／HTTP／持久化：** 繁中市場頁依伺服器 `marketOffers` 呈現全部79 ITEM 的真實排序、即時價格與不支援原因；`POST /api/buy` 嚴格驗證五欄、只提交 `kind:'market-buy'`；實際 Node 服務的 B-43 雙代存檔已注入同一來源 Registry。新 `tests/r2c-unified-market-http.test.mjs` 真實驗證繁中頁／JS、#10/#11/#14/#39 同世界真原版 PLUS 供貨→買入帳務與稀疏79欄 CSV→CAS版本／舊格式拒絕→磁碟兩世代保存→伺服器重啟／載入後再次買入。原 36 組 R2-A Perl Oracle、R2-B 16 組動態 #12/#14 及 #39 原版交易、全部 B-40～B-63 來源測試與原版 SHA／DSL 審核繼續保留。因 B-41 以前只接受固定價 `paytoday` 模數而無法容納真 #14 BASE 市價，已在經 B-62 來源審閱時修正該過度拒絕；未知 EVENT 之後繼續買入仍**明確拒絕**，不以舊引擎繞過。

**下一階段為 R2-D（未完成）：** 共用 USE／製作（#79 交換、#14 地圖首次使用及受審閱成果）；R2-E（未完成）再串真世界買入→USE、HTTP/CAS/雙代存檔與重啟。R0／R1 全量仍待後續里程碑，沒有修改 Notion 正式任務、其他分支、凍結原版 Core／DSL。PR #1 必須 Open／Draft／未合併；每次完成後核對**同一 HEAD** 的 GitHub Push／PR Actions `completed/success` 及 Node／Perl／DSL／SHA 稽核，不能拿前一提交的綠燈替代。完整證據與無記憶交接見 [R2 正式現況](shared-market-buy-r0-r2.md)、[next-window-handoff](next-window-handoff.md)。下方原記錄 R2-C 尚未完成為歷史快照。


---


> **最新計畫以 [R0–R7 共用規則引擎計畫](playable-loop-priority-plan.md) 與 [R2-A～E 現況及退出門檻](shared-market-buy-r0-r2.md) 為準。** 早先的「這次只改規劃、程式尚無變動」已過期：`market-buy` 共用買入核心已提交，**R2-A 已通過直接 Perl 差分及回呼邊界驗收；R2-B～E 尚未完成，R2 整體未結案**。本文件下方 B-35～B-39 與「第三十九階段」表格均為當時的歷史快照，不能用來判斷目前完成度；最新工作交接見 [next-window-handoff.md](next-window-handoff.md)。沒有更動 Notion 正式任務或解除 36h 期末限制。

## 2026-11-22｜R2 真實進度更正（優先於下方歷史決策敘述）

**不應把「R2 第一階段完成」當成整體 R2 完成。R2-A 核心已完成自己的退出驗收，R2-B～E 仍未完成。** 當前 `GameCore` 已有 `market-buy`，新 `market-buy-core.mjs` 提供共用買入數量裁切、帳務／庫存、原版 72h 時間上限等；#10／#11／#14 的共用命令及 CAS／存檔代表案例已有測試。但 `standard-street-module.mjs` 仍固定列舉三商品規則；原本 `buy-market-item-10/11/14` 還在各自獨立執行 `projectOriginalMarketBuy*`；本機 UI 尚未全面改送共用命令，通用 USE 尚未成立。**這是一項有效的初版子成果，不是通用市場與商品系統結案。**

| 工作包 | 目前判定 | 未完成重點 |
| --- | --- | --- |
| R0 基準與測試遷移 | **局部完成** | 市場買入重點測試已有對照，但尚無受影響舊測試全部逐檔處置清冊 |
| R1 共用契約 | **局部完成** | `market-buy` 子契約已有實作，ITEM／USE／EVENT／回呼及特殊規則完整契約未完 |
| **R2-A** 共用市場買入核心 | **已完成自身驗收** | 36 組直接原版 Perl／Node 差分、全域／商品買入回呼順序及 fail-closed；不含新商品接入或舊交易路徑去重 |
| **R2-B** 商品資料接入 | **未完成** | 需取代 #10/#11/#14 白名單，讓有已支援語義的合法普通商品經 DSL/Registry 接入 |
| **R2-C** 唯一正式買入流程 | **未完成** | UI／HTTP 走 `market-buy` 並移除三套獨立舊交易演算法，測試等價移轉 |
| **R2-D** 商品使用／製作 | **未完成** | 統一 `use-item` 執行 #79 地圖交換與 #14 地圖使用已驗證情境 |
| **R2-E** R2 真世界結案 | **未完成** | 原版 Perl／Node／HTTP、CAS／磁碟／重啟及測試治理均有可追溯證據 |

**工作次序：** R2-A 已完成，接著優先 R2-B／C 再進入 R2-D／E，避免跳到 R3 逐劍販售或 R4 事件結算。全數退出條件與程式實際路徑見 [R2 現況文件](shared-market-buy-r0-r2.md)；只有全數合格才能寫「R2 完成」。來源合法商品不在三筆白名單不是「原版無法交易」的證據，只有未支援的具體來源語義才能作合理拒絕原因。舊命令目前不是相容 alias，而是另一套會執行的商業演算法。

**R2-A 新完成證據：** 來源固定的 [`original-r2a-market-buy-oracle.pl`](../tests/original-perl/original-r2a-market-buy-oracle.pl) 跨 #10/#11/#14 各12情境比較真正 Perl `buy-s.cgi` 與新 Core、完整批發 CSV、時間／原版來源全域 `@@FUNCBUY` 及人工商品回呼順序。程式 SHA `bd7a504bdc473a0bd34c1beb5efab8ae621d2381` [CI #45011886766](https://github.com/Prysline/akimono/actions/runs/45011886766) 完成成功（903 Node／1,867 Perl）；**僅證明 R2-A 子階段，R2-B～E 未結案，之後文件 HEAD 需另看 CI。**

**CI 判讀：** 共用買入初版基準 `b2bfffc7a41a4d275043f448ad27541fdb704f98` 的 [run #45008806146](https://github.com/Prysline/akimono/actions/runs/45008806146) 曾成功（900 Node、1,867 Perl）；此結果屬歷史 HEAD，證明受測回歸成功，**不能推論 R2 已完成或未來 HEAD 的 CI 已成功**。每個新工作窗須重新讀取 [Draft PR #1](https://github.com/Prysline/akimono/pull/1) 與當下 head_sha，核對同 SHA CI。

## 2026-11-22｜架構方向修正：停止逐商品／逐事件複製執行流程

**2026-11-22 初版修改前的架構診斷（歷史，最新現況見上表）：** B-31 的 GameCore 當時主要執行命令驗證、StreetModule 分派、WorldState 版本／記憶體 CAS，尚未承接原版完整買賣、生產、販售、事件及期末規則；standard-street-module.mjs 逐步積累了 buy-market-item-10/11/14、use-original-sword-map-14 等來源審閱專用命令和專用 project/review 模型。B-63 已能真取得並保存五種劍，但只支援 #14 地圖**首次**使用，且正常自然販售只有受審閱的 #10／#40 等特定情境。B-43 已有本機可復原存檔與本機 UI；**正式 36 小時期末與一般化商品系統仍未整合**。

**結構性成本成因（證據支持的推論，不是精確工時統計）：** 原版共通演算長期沒有被提升成單一可重用的 Rule Engine；新功能經常需要重做商品白名單、原始 Perl 探針／來源 SHA、Node 投影、特殊事件閘、CAS／存檔語義、HTTP 整合與 CI 證據。原版驗證本身必要，但若以每個 itemId/useId/eventCode 為獨立能力，就會導致小改動背負近乎整條新功能的驗證成本。「十倍時間」沒有成對工時記錄，不能表述成實測倍率。

**修正決策：** 原版 Core 為共享遊戲規則依據；標準街／URon／WAtlas 為設定、商品、配方、事件及專屬擴充來源。GameCore 應擔任真正的共通時間／商品使用／交易／市場／自然銷售／事件／決算執行層，不應只有抽象命令分派。StreetModule 提供資料與特殊效果；WorldState／Repository 負責版本、一致性、跨街道專屬狀態及保存。具體責任、工作序列與完成門檻全部見上述現行計畫。此段記錄最初的**待實作架構決策**；其後已實作部分 `market-buy` 共用 Core，但仍未達上方 R2-A～E 的驗收門檻。

## 正式任務與里程碑影響（不擅自變更 Notion）

| 正式任務 | 本次調整的實際驗收方向 | 現況判定 |
| --- | --- | --- |
| 01｜原版來源盤點 | 由「有 Core／各街內容」深入到共用函式、回呼時序、覆寫及三街系統矩陣 | 新的系統級來源盤點已補充，不能取代每個 CGI／USE 的全量動態驗證 |
| 02｜原版行為測試基準 | 保留所有舊 Oracle；依共用演算法建立可重用差分測試，而非每個商品獨立完整探針 | 仍有未覆蓋原版路徑 |
| 04｜GameCore／StreetModule／WorldState | **共同規則真的由 Core 執行**，標準街只提供內容和來源支持的擴充 | **進行中，不因已有 B-31 命令契約即結案** |
| 05｜商品／庫存／操作／時間 | ITEM／USE 通用規則執行，新增來源合法商品不新增指令型別 | **進行中** |
| 06／07｜市場交易／銷售／結算／可玩閉環 | 同一套 Core 可跑進貨→生產→上架→自然售出→36h決算；真 UI／存檔不中斷 | **未通過完整閉環** |
| 08／12｜跨街道擴充 | URon 賣麵產髒碗、WAtlas 期末海域更新，證明通用 Core 可承接差異 | **未經正式跨街道驗收** |
| 09／10／11｜標準街玩法、UI、多人 | 既有 UI／存檔成果保留；其餘玩法與正式多人依共同 Core 拓展 | **不得因部分 UI／存檔成果宣告全部完成** |

### 正式主線規劃：停止追加 B-64 逐劍專用販售（執行優先度以最新 R2 表為準）

開發順序調整為 **R0 鎖定舊測試和資料 → R1 共用契約／規則模型 → R2 共用市場、交易與 USE → R3 共用自然販售／時間（以 #10、#40、#41～#44 作資料驅動對照）→ R4 EVENT／36h決算 → R5 同一繁中 UI 完整閉環 → R6 URon／WAtlas 擴充 → R7 標準街其他功能與多人**。每段需有可再利用的公開規則能力、來源比對及真 WorldState／持久化整合；**不以新增 B 編號、單品白名單及斷言數量為完成判定**。

安全規則不變：不執行任意未審閱的 Perl callback；不能跳過 EVENT、稅、商品特殊效果；現有 Perl／Node／HTTP、原版 SHA、DSL 稽核與同一 HEAD Push／Draft PR 雙 CI 全部保留。不得把過往舊測試誤認為無價值，也不得把新抽象介面當成完成了原版經濟。

---

## 歷史進度備查（2026-11-21 B-39 附近的紀錄；本節「目前／下一步」僅指當時）


**正式目標（Notion）：** 以原版經營規則為準，使用共用 `Game Core`、可分離 `Street Module`、`World State / Persistence`，先完成繁體中文**標準街單機版**，再以麵店「臨時工轉職／麵食售出變髒碗」驗證不同街道的擴充，最後加入**主帳號與多人共享世界**。

**變更限制：** 原始 `main`、`migration/standard-street-s1` 與原版 CGI／DSL 不更動；目前驗證在 `test/task02-baseline-on-s1`、Draft PR #1。固定 Core `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`，原先18份再加 B-34 原始管理員初始化快照，現有**20份**原版 Core Git Blob SHA 受 CI 核對（B-38 再新增一份不修改原文的 `plug/detail.cgi`）。**Perl、Node 測試通過率不是整體遊戲完成率**；不自行給一個假的百分比或把尚未驗收的功能標成完成。

## 2026-11-21｜工作順序調整：以最小可玩標準街為主線

**目前執行優先序已固定在 [現行工作優先序與最小可玩閉環](playable-loop-priority-plan.md)，後續任務交接依此順序推進，不再以擴充孤立原版函式、增加 Perl／Node 斷言數量作為主軸。** 保留既有 B-01～B-39 驗證成果，但只有在影響當前可玩流程、原版資產結果或資料安全時才追查額外細節。**下一個 B-40 的主工作是原版真市場進貨 #10（扣款與庫存）**；接著同世界「上架→正常時間／自然販售→結算」，再做真正單機存讀檔與繁體中文網頁；麵店跨街道驗證及多人後置。任何測試用人工商品、固定單店／秒數與明示亂數不可混稱已可玩。每輪須交付可驗收的功能片段、最小必要來源測試、同 SHA 雙 CI 與未完成事項；本次只調整開發計畫，不更新正式任務狀態。

## 2026-11-21｜原版標準街介面作為 B-40 實際測試 UI 的直接參考

使用者補充「你可以考慮參考原始介面」。已審閱本 repo 原版 `sindex.html`、`smain.html` 與 `custom/inc-menu.cgi`，以及固定上游 Core `inc-main.cgi`／`stock.cgi`／`shop-m.cgi`／`sc-s.cgi`；這些資料證實原版按「自店／交易／倉庫」進出、店內集中顯示資金／人氣／時間，市場與倉庫以商品表格顯示單價、數量、持有與架位等。新版 B-40 **第一版可操作 UI 應保留其操作邏輯與關鍵欄位**，以繁體中文和響應式排版重建，不能只有 JSON／CLI，不能拷貝尚未授權的原版圖片／音樂或危險的 CGI 密碼流程。詳細來源與畫面規劃：[原版 UI 參考與功能映射](original-ui-reference-for-local-test.md)。**本次僅修訂規劃，介面和真進貨仍待實作。**

## 2026-11-21｜補充實際執行與手動測試介面（重要優先要求）

使用者確認：**沒有可供實際操作的介面，就無法從玩家角度測試。** 因此正式改採「**從 B-40 真進貨開始，後端功能與本機瀏覽器繁中測試介面同步交付**」，而非等最後存檔完成才首次開發 UI。介面可先簡陋，但必須真能啟動、點擊並透過現有 Game Core／Street Module／WorldState 執行指令，顯示市場、金錢、庫存、陳列、操作結果和拒絕原因；失敗不可更動資產。每輪新增的後端操作，也必須附可直接照做的**瀏覽器手動驗收步驟**，不只 CLI JSON 與 CI。

**B-40 的必要交付**：本機伺服器／繁中 Web UI 的可運行啟動方式（規劃 `npm run dev:local`，目前尚未建立）、真來源市場進貨 #10、原版有貨前置條件、正反案例操作、交易前後狀態比對；真初始市場無貨應明確拒絕，不能在 UI 隱藏人工測資。後續將陳列、時間／銷售、結算及存讀檔逐步加到**同一介面**；直到存檔真正落盤之前應標示「目前僅記憶體，重啟可能遺失」，不宣稱已有存檔。

參考[現行工作順序與測試 UI 的具體驗收規格](playable-loop-priority-plan.md)。**本筆只改計畫，未完成 UI／HTTP／真進貨，也未變更任務狀態。**

## 2026-11-21（B-39）正式 12 任務狀態快照（歷史，非本次最新完成度）

| 任務 | 正式狀態 | 與目前 repo 的關係 |
| --- | --- | --- |
| 01｜盤點原版 Core、標準街與麵店規則 | 已完成 | 已盤點原版來源與覆寫關係 |
| 02｜建立原版行為與計算測試基準 | **進行中** | B-33 已直接以原版 Perl 編譯 ITEM #79 USE；B-34 又核對**原版管理員初始化的空白批發列、Perl 稀疏陣列及交易後 DataWrite 的明文位置**，其他115 USE／週期／實際世界存檔仍未覆蓋 |
| 03｜確認來源授權與圖像音樂邊界 | 待辦 | 發布前須完成，未確認的原版圖音不可直接散布 |
| 04｜Core、街道模組、狀態儲存契約 | **進行中** | B-31 記憶體世界版本/CAS，B-33 真禮物卷 USE，B-34 新增**可選、只限空白世界 revision0 的原版初始化命令**及原始稀疏批發文字追蹤；真實資料儲存與事件仍未驗收 |
| 05｜商品／庫存／操作／時間最小 Core | **進行中** | B-33 真標準街商品 #79 地圖交換；B-34 **首次從固定原版 admin-init 空白市場來源接到記憶體 WorldState**，再連續兩筆真 USE 並保留 Perl 稀疏批發 CSV；完整市場週期／其他115 USE／持久化仍未完成 |
| 06｜市場／玩家交易／自動銷售／結算 | 待辦 | 有市場、交易、週期等原版子模型；不是已通過完整經營閉環 |
| 07｜接入標準街、跑通最小經營循環 | 待辦 | 尚未建立正式完整循環 |
| 08｜以麵店轉職／髒碗驗證街道擴充 | 待辦 | 沒有完成正式跨街道驗證 |
| 09｜補齊標準街玩法／繁體中文內容 | 待辦 | DSL 79 ITEM／116 USE／25 EVENT／7 FUNC 已審查結構；**非全部已能執行** |
| 10｜繁體中文網頁與單機存讀檔 | 待辦 | 無完整可操作 UI 或正式安全持久化 |
| 11｜共用主帳號、多人世界 | 待辦 | 尚未建置身份、授權、共享世界及同步 |
| 12｜整理街道擴充流程 | 待辦 | 待共用 Core 和麵店擴充驗收 |

合計 **1 已完成／3 進行中／8 待辦**。任務02、04、05都有實際程式與受測子成果，但**三者均未完成全部驗收**；狀態分布不是整款遊戲的完成百分比。

## 已有可重現程式，不是只有規劃

| 子系統 | 已完成的可測基礎 | 尚不能稱為可玩的原因 |
| --- | --- | --- |
| 來源與標準街資料 | 原始 DSL 結構稽核（79 ITEM／116 USE／25 EVENT／7 FUNC）、商品欄位映射、新店主要狀態 | 未完整執行 DSL 的巨集、事件、所有自訂回呼 |
| 商品與經濟 | 商品限額、陳列、批發、交易數值；B-33 真實 #79 地圖交換；B-34 **來源驗證的首次世界批發空白列（Perl長度0）**可接入79格**記憶體**世界，並依原版追蹤稀疏 CSV 的明文賦值位置 | **尚無**完整市場週期／交易／自動販售、其他115 USE、正式世界檔案 I/O 與權限；B-34 不是正式商店伺服器 |
| 世界狀態安全 | 讀取／提交／鎖／備份的來源子模型；B-31 記憶體 `WorldState/CAS`；B-34 僅**首次空世界**的 admin-init 來源驗證純命令和批發 CSV/definedness 證據，開店與真交易連續提交記憶體 | **仍無**原版完整 `init` 的 I/O、真正單機持久化、多人資料庫、跨程序鎖與斷電恢復 |
| 回呼與原版相容 | 原版79 ITEM／116 USE／25 EVENT 靜態稽核，數個原樣 Perl 共用／本地回呼；B-30 `lostbook` 整合；B-33 原樣**執行原版編譯器的受控子函式**與真正標準街 `gift` 第一筆 USE，並記錄缺席訊息空槽 CORE-21 | **仍未**執行完整原版 DSL 編譯器頂層／載入器／CGI、其餘115筆 USE、所有回呼與真正世界 I/O |
| 可玩遊戲 | 已有多個 Node JSON 記憶體示範和自動回歸測試 | **尚無可從頭到尾操作的網頁、新建／讀取世界、帳號、商店 UI** |

## 第30階段的明確新增基準

[`original-integrated-use-lostbook.md`](original-integrated-use-lostbook.md) 詳列從原版 `UseItem` 資格、材料、取得、**一次市場修正**、`lostbook` 原版巢狀扣除到熟練度尾段的完整記憶體案例。已建立**13 組原版 Perl 實際執行**供 Node 模型逐欄對照；來源行為 CORE-20 另行記錄。此驗證**不是** CGI 端到端，也沒有觸碰真實遊戲檔案。

## 第31階段：可執行的 Game Core／Street Module／World State 契約

[`game-core-contract-v1.md`](game-core-contract-v1.md) 是本階段完整來源與界線。已新增 `GameCore` 純命令處理、`StreetModule` 可插拔標準街實作、`WorldState` 不可變合成 JSON、記憶體 `compareAndSwap`，以及 `npm run demo:game-core`。標準街目前**只支持原版來源已驗證**的 `open-shop`（建立商店）和 `edit-showcase`（展示架編輯）；其餘 `USE`、市場、事件、特殊回呼仍**明確拒絕執行**。資料目錄仍可保留 79 項商品／116 筆 USE／25 筆 EVENT 的來源原文欄位，但**不表示已編譯或能執行**。

現在可以把「無世界商店 → 原版初始資產的新店 → 原版展示架修改 → JSON 純快照」放入**同一個世界 revision 命令流程**，並驗證失敗／過期版本時沒有偷改資料。這只是正式 Core 的**最小介面原型**，**尚非**所有交易、存讀檔或完整可玩循環。任務04已因真正開始實作更新為「進行中」，但其商品動作／事件效果與單機／多人邊界還需要完成詳細驗收。

## 第32階段：連續使用的商品記憶體狀態驗證（**人工獨立街道**）

[`reviewed-world-use-sequence.md`](reviewed-world-use-sequence.md) 記錄本次真正完成的可執行內容及嚴格邊界：`reviewed-use-fixture-street.mjs` 只在**專用人工 `streetId=source-use-fixture-b32`** 中支援 `source-fixture-use`，將 B-30 的**原樣 Core 商品使用＋原版 `lostbook`** 接上 B-31 的 `applyGameCommand/executeMemoryCommand` 世界交易介面。兩次命令連續保留人工店的三格庫存、金錢、`paytoday`、`time`、單一熟練度及三格市場；世界 `revision=0→1→2`，原版來源 `UseItem` 順序和每筆一次市場修正未改。

**必須清楚區分：** A/B/C 是原版 Core 函式的**人工測試商品**，**並非標準街真實 ITEM 1/2/3**；真正 `standard-street` 模組仍只可開店與編輯展示架，不可直接以此命令讓玩家使用商品。六筆來源 Perl 交易對照、23項新增 Node、40項新增 Perl 隔離斷言已加入 CI。`npm run demo:world-use` 是**無持久化的純記憶體示範**，不能當作可玩版本、磁碟存讀檔或授權網路交易。

## 第33階段：原版標準街禮物卷地圖交換的**第一筆真實 ITEM+USE**

[`reviewed-real-gift-use.md`](reviewed-real-gift-use.md) 記載來源、規則、直接 Perl 編譯器原文與 Core 執行、實際限制。固定標準街 **ITEM #79 禮物卷**第一筆 `USE.no=0`「交換地圖集」，原始 DSL **2張禮物卷→ITEM #12、#9、#14 三張地圖各1份**；固定原版 `ItemUseTimeRate=0.5` 將 `time 1h` 編成**1800秒**。新增 `gift-exchange-maps`，使用 B-31 的不可變 `Game Core/WorldState` 命令，讓真實標準街新店的79格庫存連續交換兩次：禮物卷 **5→3→1**、三種地圖各 **0→1→2**，世界 `revision 1→2→3`；原版全新店 ITEM #63 展示架工具保留1個，錢100000不變。

**嚴格限制：** 官方世界市場尚未實作，因此這個真實 USE 命令**只在測試者明示給出** `market:{source:'explicit-b33-test-fixture',wholesale:Array(79).fill(0)}` 的非生產測資時執行；正常新店 `market=null` 必須拒絕，不自行推導原版市場為全0。原版編譯器**只擷取並執行**受審閱 `GetBuffer` 等子函式，不執行帶檔案刪除／鎖／寫入的頂層；與真正固定 `plug/use.cgi::UseItem` 隔離執行，在6種場景8次原版 Perl 測試中驗證全部79商品 limit、輸入輸出、時間、批發及資料順序。

另外從真正原版 Perl 實際執行觀察到缺少商品訊息文字時仍會產生 `usemsg=[undef]` 和 `addmsg=[undef,undef,undef]`，已記錄 [CORE-21](original-behavior-issues.md)，Node JSON 保留對應 `null` 槽位，不暗中刪掉或補文字。

新增**27項 Node、53項 Perl 原版隔離斷言**；`npm run demo:real-gift-use` 已納入 CI。正式任務05仍**進行中**，所有其他115 USE、完整市場、週期、存讀檔、UI／多人均未驗收；正式12項任務分布不變（1已完成／3進行中／8待辦）。

## 第34階段：**真正原版管理員的空白批發初始列**與記憶體來源世界

[`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md) 記載第19份固定 Core `inc-admin-func.cgi` 的**原始 `sub init`**：首次產生新世界檔時第三行批發庫存實際是**空字串**，`DataRead split` 的 Perl `@DTwholestore` **長度0**，不是79個明文0。B-34 只擷取原始 `print DATA time()...` 陳述式在**Perl scalar 記憶體把手**執行；其後真正來源 `UseItem/CheckWholeStore` 觀察到，第一次真禮物卷交換（禮物卷5→3、地圖0→1）只對批發索引 `78` 寫入0，前78格仍未定義；原版 `DataWrite join` 的第三行文字是**78個逗號＋0**，不可與79個字面0混淆。地圖持有量已滿時，來源還會寫入索引8、11、13的0，並保留這些位置的稀疏定義性。新增獨立 [CORE-22](original-behavior-issues.md)，**只記錄、不修復**。

`standard-street` 模組目前可**選用、明示注入固定管理員初始化／DataRead／DataWrite 三份原文**後，對沒有任何商店且 `revision=0,market=null` 的**空白記憶體世界**呼叫 `initialize-source-market`；資料明確分為 `originalWholesaleCsv=''`、`sparseWrittenSlots=[]` 和供 Perl 算術對照的79格數值0投影。之後使用 B-33 已真實編譯核對的 `gift-exchange-maps`，序列化時追蹤**實際在 Perl 陣列賦值的欄位**。來源不一致、先有商店／非空市場、重複初始化、假造來源 CSV、無商品或版本過期都拒絕，不改世界。

新近確認的測試：**27項 Node、44項真正原版 Perl 直接斷言**，全部舊回歸加總 **771 Node／1013 Perl**，27個 `*.t`；`npm run demo:original-market-init` 已納入 GitHub CI，19份固定原版 Core SHA、兩份 DSL audit 持續核對。**不能**因此宣稱實際運行原版 admin init 或持久化，也不能將源 `time()` 視為人工記憶體 `nowSeconds` 完全等價。

[`next-window-handoff.md`](next-window-handoff.md) 已整理原版 SHA、PR、Notion、來源界線、下一階段 B-35 目標和新對話直接複製的提示；建議 B-34 完成後另開**同專案新聊天**，避免長對話遺漏來源或同一分支雙窗推送衝突。

## 第35階段：原版稀疏市場上的單商品 PLUS 與完整 CheckWholeStore

[來源／測資／界線](reviewed-original-sparse-plus-turn.md) 記錄已提交且通過直接來源驗證的 B-35。原版固定 `inc-turn.cgi` 的 **PLUS 迴圈原文**與完整 `plug/whole.cgi::CheckWholeStore` 在 Perl 記憶體 fixture 中實際執行；Node `reviewed-sparse-plus` 經來源嚴格審核後，以既有 `standard-street` 可插拔模組及 CAS `WorldState` 提交。只有真 ITEM #10 `book-make` 的 `PLUS 20m` 被啟用，其他商品 PLUS 明示人工設為 0，**不是完整原版市場週期**。

固定的原版世界初始人口 `DTpeople=500000`、`MAX_USER=50`、一間新店持有 ITEM #63 1個與禮物卷 #79 5張。明示亂數百萬分之一整數輸入 0 後，`60秒 → 60秒 → 600秒` 三個**人工後銷售時間片**使 ITEM #10 批發量 `0→1→2→10`（最後受原版供貨上限約束），記憶體世界版號 `2→3→4→5`。因店內5張禮物卷而原版其批發上限為0，`CheckWholeStore` 另將稀疏商品索引78明文寫0；原版 Perl `join` 實際只有索引9和78定義，Node CSV 完全比對，未將空欄補成79個字面0。

**新增6項 Node、17項原版 Perl 斷言**；前一版驗證 HEAD `e8147175658d601832d09c64a0e8c272c6c18d6b` 的 [push CI](https://github.com/Prysline/akimono/actions/runs/44858120015) 與 [PR CI](https://github.com/Prysline/akimono/actions/runs/44858125833) 均成功，合計 **777項 Node／1030項 Perl**、28份 Perl `*.t`，固定19份 Core Blob、兩份 DSL 稽核均通過。最終文件修訂後的 SHA／CI 仍須再次核對；驗證數字不代表遊戲完成率。

**尚未驗收**：其他所有原版商品 PLUS 同時更新、原版自然銷售與後置回呼、人口變化、完整日週期／事件／決算、真正 CGI／存取／鎖／備份、HTTP/UI、麵店、多人。任務02／04／05仍**進行中**，正式12項任務為1完成／3進行中／8待辦。

## 第36階段：在同一原版 PLUS 迴圈按順序處理三商品

[已審閱來源、真 Perl 對照、稀疏文字與限制](reviewed-original-sparse-multi-plus.md)。B-36 在 B-34 原版空批發列與 B-35 單商品基礎上，保留固定原版 `inc-turn.cgi` 的**原文 PLUS 迴圈（升序掃描1..79）**及原版完整 `whole.cgi::CheckWholeStore`，選取三項已核對 DSL：ITEM #1 藥草 `PLUS -20m`、#10 `book-make` `PLUS 20m`、#40 木刀 `PLUS -1h`。**其餘76項原版 PLUS 在隔離來源 fixture 中人工設為0**，不可將這段稱作全部商品的完整市場補貨。

使用真正原版初始人口 `DTpeople=500000`、`MAX_USER=50`、單一真新店（商品 #63 1個、#79 禮物卷5張），在受控時間片60、60、600秒及明示亂數樣本下，批發 #10 **0→1→3→10**；#1與#40從空市場負向扣貨後由來源 `CheckWholeStore` 裁成0。**原文定義的稀疏位置為0、9、39、78**，其他 CSV 位置仍空白，不可寫成79個0。另有標成**人工正庫存 fixture** 的 Perl 測試：#1 20→19、#40 10→9，僅核對負方向算術，不冒稱來源空市場自然演變。

新 `reviewed-sparse-multi-plus` 只在所有固定來源可核對時由 `standard-street` 模組選用，以既有不可變 WorldState/CAS 接入；三次成功命令 `revision 2→3→4→5`，時間、商店與事件仍不變；錯誤命令或過期版號拒絕。**新增7項 Node、21項真正原版 Perl 斷言**，前一實作 HEAD `637de9662eef9eed898729f3d754e021786b0062` 的 [push CI](https://github.com/Prysline/akimono/actions/runs/44859521110) 與 [PR CI](https://github.com/Prysline/akimono/actions/runs/44859526380) 同 SHA 成功，合計 **784 Node／1051 Perl，29個 .t**，19份固定 Core SHA 與原版 DSL audit 成功；後續文件提交仍需重新核對同 SHA CI。

**尚未完成**：其餘原版商品真 PLUS、真實自然銷售／事件回呼／決算／時間切段、真實檔案 I/O、HTTP、可玩前端、麵店、多人。正式任務02／04／05仍進行中，12任務狀態是1完成／3進行中／8待辦。

## 第37階段：原版所有59項 PLUS 的真實編譯與稀疏供貨子步驟

[完整59項來源驗證、Perl／Node 直接對照與限制](reviewed-original-sparse-all-plus.md)。B-37 由原版商品 DSL 及固定 `inc-makeitem.cgi::GetTime` 驗證**79項商品中59項具有明文 PLUS、20項缺省0**；前一輪快速掃描曾漏列 ITEM #16、#17 各 `PLUS 20h`，本階段已經用真正 `parseDsl` 與原版 Perl 編譯器核對修正。來源原文固定；既有19份 Core Blob、兩份 DSL 仍由 CI 鎖定且未改動。

原版 `inc-turn.cgi` **完整商品 PLUS 迴圈片段**依 ITEM ID 升序、正負號、精確外部亂數消耗計算59項增減，最後**僅一次**呼叫原版完整 `whole.cgi::CheckWholeStore`；原版初始化批發 CSV 原先是**空白稀疏列**，不是79個字面0。Node 的新 `reviewed-sparse-all-plus` 必須額外提供並核對固定 `inc-makeitem.cgi` 原文，否則命令不啟用；來源不符、亂數錯誤、過期版號均拒絕。

測試條件為 `DTpeople=500000`、`MAX_USER=50`、一間真正標準街新店，**人工後銷售**的時間片60／600／3600秒及外部記錄的 Perl `rand` 單位百萬分位樣本。原始商品 #10 批發初始0、第一次60秒後1、最終受上限限制10；三片段更新後原始 CSV 只有**60格明確定義**（59項 PLUS + 原版禮物卷限額修正），其餘欄仍空白，世界 `revision 0→1→2→3→4→5`；世界時鐘與店鋪資料不因供貨子步驟而變更。另驗證真實禮物卷交換一次後可接原始 PLUS 子步驟。

B-37 **新增8項 Node 測試、27項原版 Perl 來源斷言**；程式驗證 HEAD `c010b4892c9193bc7fdc7b45c241cfd5d1caeaaa` 的 [push CI](https://github.com/Prysline/akimono/actions/runs/44869662429) 與 [PR CI](https://github.com/Prysline/akimono/actions/runs/44869666045) 同 SHA success，總計 **792／792 Node、1078／1078 Perl（30個 .t）**，19份 Core SHA 與 DSL audit 都通過。文件後續提交後仍須重新核對該 HEAD 的兩條 CI，不以舊 SHA 結果替代新版本。

**沒有完成**：完整原版自然銷售、人氣／陳列／回呼與同週期亂數、時間片切分與人口變更、事件與期末結算、磁碟／權限／HTTP/UI、麵店／多人。正式12任務仍為01已完成、02／04／05進行中、其餘8項待辦。

## 第38階段：原版自然販售區段與59項 PLUS 子步驟的共用亂數對照

[完整原版來源、B-38 受控交易與限制](reviewed-original-natural-sale-plus.md)。在 B-37 已核對所有59項商品原版 PLUS 的基礎上，B-38 首次真正**抽取並執行**固定 `inc-turn.cgi` 的自然銷售原文數值區段（來客、`GetMarketStatus`、上架售出、`GetSaleTax/GetUserTaxRate`、人氣與維持費），然後**跳過**原始週期中介的 FUNCTURN／FUNCSALE 商品回呼、排序與期末決算，再接上原版全部59項 PLUS 迴圈及完整 `CheckWholeStore`。這是**兩段來源原文的隔離串接**，沒有執行完整原版週期；不得宣稱自然販售與所有回呼已接通。

- **原始來源：** `inc-turn.cgi`、`plug/market.cgi`、`plug/item.cgi`、`inc-makeitem.cgi` 固定快照不變。新加 `modern/tests/original-perl/core-detail.cgi`，完整複製並固定上游 Core `plug/detail.cgi` 原始 Git Blob `9a83d26fb29edee4032958f1e6de837a250f3384`，直接呼叫 `GetUserTaxRate`。原版19份快照不動，**合計20份原版 Core Blob** 都由 CI `git hash-object` 核對；兩份 DSL 不改。
- **重要測試資料修正：** B-33 既有 Perl harness 為單一商品 USE，只保存 `@ITEM` 的代碼、名稱與上限，未保存 `price`。B-38 初次要自然銷售時發現未編譯價格使 `ITEM #10` 被當成標準價0；已在**新增 B-38 測試器**使用固定原版 `GetBuffer` 直接編譯回 `price=5000`，確認 `pop=20d`、`point=200000`、商品維持費，**不修改原版 Perl 銷售公式**。
- **案例一（真正來源新店）：** 原版管理員空白批發、單間標準街新店、空展示架，人工後續時間片1728秒、來源人口500000／MAX_USER50、`SALE_SPEED=12` 與 `POP_DOWN_RATE=5`：售量0、現金100000、人氣5010→5009，先處理自然販售，再處理原始 PLUS 共消耗72筆固定亂數。
- **案例二（明示人工起始商品）：** 在同一來源新店上，**人工給 #10 書本寫作工具1個並放上展示架，售價5000**，並沒有執行真正市場進貨。原版自然販售真正售出1個，現金100000→105000、人氣5010→4915、`saletoday=5000`、稅0、`trush=5001`、本期維持費1；自然販售先消耗3筆亂數，接著全59項 PLUS 消耗72筆，**總75筆**。原版 Perl 與 Node 的79格批發、稀疏 CSV、世界資產及亂數逐欄一致；兩案例最後都僅60個批發槽位有定義。
- 新選用 `reviewed-natural-sale-plus` 命令必須有完整原版初始化／市場／編譯／自然販售／稅源字串；只接受一間來源真新店、空展示架或明示人工 #10 一件上架且1728秒的測試場景。CAS 記憶體版本 `2→3`，失敗不更新、時鐘不走動、未執行回呼與排序。新增**7項 Node、28項原版 Perl** 測試，前一實作 SHA `b89f644b53e892066d431d17fbbf11309d4d3621` 的 [push CI](https://github.com/Prysline/akimono/actions/runs/44874943493) 與 [PR CI](https://github.com/Prysline/akimono/actions/runs/44874947974) 同 SHA success：**799／799 Node、1106／1106 Perl（31份 `*.t`）**，原版20份 Core Blob SHA 與 DSL audit 成功。後續文檔更新仍須重新驗證同 SHA CI。

**未驗收：** 真實購買／進貨 #10、FUNCSALE/FUNCTURN 回呼、`SortDT`、`inc-period.cgi`、人口／事件與真實時間切段、磁碟讀寫／鎖／備份、HTTP/UI、麵店／多人。正式 Notion 02／04／05 仍「進行中」，不可用測試通過率推論完成度。

## 第39階段：真正標準街 ITEM #70「那由多的項鍊」FUNCTURN 回呼接入原版自然販售及全部 PLUS

[完整固定原版來源、回呼觸發、Perl／Node 對照及限制](reviewed-original-nayuta-functurn.md)。從原版79項商品確認**只有 ITEM #70 真正宣告 `funct _local_`**。原版 `inc-makeitem.cgi` 的 `GetLocalFunction` 生成形式由隔離 Perl 重建，直接從固定 DSL 抽取 **#70 原始行內 Perl 主體**，再由原版 `inc-turn.cgi` 真正的 `FUNCTURN` 逐項派送迴圈呼叫。此前 B-38 來源自然銷售區段與 B-37 全部59項來源 PLUS 迴圈亦在同一受控序列先後執行；**原版間隔內其它回呼／FUNCSALE、SortDT、期末決算仍然跳過**。沒有修改任何原始 CGI、Core 或 DSL。

#70 原版價格50000、`pop 2d`、`point 20000`、`cost 200`，批發 `PLUS` 缺省0、`wslimit=0`。來源回呼以 `TIMESPAN/86.4` 計算額外人氣；只有有庫存的來源店家被原版 `@item::TURN_DT` 收集，且第一展示架展示 #70 並標價不高於50000時才真正加人氣，上限10000。獨立原版 Perl 實際測試涵蓋：**60秒小於1的隨機進位（抽樣0→+1、999999→0）、標價50001不加、原人氣9980加至10000**，且 Node 逐項對照。

B-39 使用 **8640秒**人工時間片，是為了避免 #70 展示維持費在舊1728秒窗口內出現小數1.4而違反既有安全整數記憶體契約。B-37 對外市場 PLUS 命令仍僅允許最多3600秒，只有受控 B-39 來源證據能在內部使用固定8640秒。初始來自原版管理員空白批發 CSV、人口500000、MAX_USER50、一間真正新店；原真新店空展示架：自然販售0、人氣5010→5007、無 #70 回呼效果、維持費5、原版 PLUS 合計抽樣60次，最後60個有定義批發索引。**人工另加 #70 一件並以50000上架**（並非真正進貨）且抽樣令其不售出：自然人氣先至5007，再由真正原版 FUNCTURN +100 至**5107**、維持費7、原版自然販售1次 + PLUS60次總抽樣61次、最後61個批發有定義索引（#70額外供貨上限修正）。兩情境原版 Perl／Node 的79格批發數值、稀疏 CSV、現金、人氣、成本及亂數消耗一致；失敗、來源漂移和 CAS 過期拒絕不更改記憶體世界。

B-39 在程式 SHA `0265bd0a632b6567ebbfbfd33e9ff6c27f15fcd3` 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/44878580737)／[PR CI](https://github.com/Prysline/akimono/actions/runs/44878586451) **同 SHA success**，由 B-38 的799／1106增加為**807／807 Node、1138／1138 真原版 Perl（32份 .t）**；既有20份 Core Git Blob 固定 SHA 和兩份 DSL audit 無差異。文件提交後仍須再次核對最終 HEAD 的兩份 CI，不能以前次 SHA 視為新文件已驗證。正式 Notion 02／04／05仍進行中；無真進貨、排序、結算、資料庫、HTTP／前端、多人或全部原版週期。

## 下一個優先目標：轉向最小可玩閉環

以 B-30 級別的來源回歸測試守住不變規則，不再單純用測試數量當作主要交付。

### 31｜已完成最小可執行契約原型；繼續補齊任務04驗收

目前已建立可插拔 `Game Core`、`Street Module` 與不可變 `World State` 的 **初版記憶體介面**，並完成源碼可核對的開店與展示架兩種操作。接下來需要決定街道特殊銷售效果與未編譯事件如何在 Core pipeline 掛接，補足實際交易、存讀檔與本機／多人 API 的前置契約，但**不能拿純 CAS 模型當作真實伺服器資料庫**。

**已驗證**：受控世界快照 → 兩種來源已審閱命令 → 版本遞增及確定性記憶體結果；不合法、未知、版本衝突命令拒絕且世界不變，既有 B01～B30 回歸仍成功。**尚待驗證**：完整商品／事件等 Core 擴充接口與本機／多人真正持久化權限。

### 32｜已驗證「人工 Core fixture 商品使用連續兩次」，標準街閉環仍未完成

本階段在**獨立 `source-use-fixture-b32` 人工街道**中，將原版 `UseItem`／`lostbook` 的受控 A/B/C 商品數值，透過 B-31 `WorldState` 命令連續執行兩次；第二次真正使用第一筆留下的商品庫存、批發、金錢、時間與經驗，並以六次原版 Perl 來源執行直接核對。**這不是** 真正標準街 ITEM #1～3 的藥草／野獸皮革／樹枝，也還沒有將實際標準街商品使用接上。下一步須以真正標準街 DSL 的 ITEM+USE 做來源合規轉換，再串「建店→商品操作→陳列→市場→結算」完整閉環。

**本階段已驗證**：人工 Core 交易連續記憶體快照，失敗／過期命令不改狀態；六筆實際 Perl 源碼結果跨語言比對一致。**未驗收**：真正標準街 USE、完整供需銷售與週期結算、真正可儲存的世界資料與玩家操作介面。

### B-40 起｜正式採用功能閉環優先序

**工作主線：** B-40 **可操作本機繁中測試 UI＋真正市場進貨 #10 同步完成** → 在同一 UI 操作真貨上架與自然販售 → UI 操作必要回呼／時間及期末結算 → UI 存檔並重啟載入 → 整理完整繁中遊戲介面 → 標準街內容補齊／麵店擴充 → 多人。每階段以「玩家現在多能完成哪個操作」驗收，不因個別函式尚有小數值分支而改優先序；來源核對只處理目前功能真正需要的行為及安全問題。

完整逐步驗收條件、工作原則及「繼續」的固定起手工作都在 [現行工作優先序與最小可玩閉環](playable-loop-priority-plan.md)。B-39以前的細節保留上文作為來源歷史，**不得再以舊的「先研究 SORTDT/FUNCSALE」建議推翻真正進貨優先序**。目前尚無完整可玩週期，任務狀態不變。

**安全與版權界線**：原本素材授權尚須單獨確認，發佈前不能將未知授權的圖片／音樂一起公開；原版程式的歷史異常只列錄，不擅自改其計算順序。

> 專案狀態：B-39 已在受控單店原版來源測資中執行 **自然販售 → 真 ITEM #70 FUNCTURN 回呼 → 原版59項 PLUS／CheckWholeStore**，並逐筆對照Perl與Node數值、人氣、亂數及稀疏批發；**其它商品／FUNCSALE 回呼、SortDT、完整決算、真購買／進貨、持久化／HTTP/UI／多人未完成**。請以下一份[交接文件](next-window-handoff.md)及最新同 SHA CI 為準，不得誤稱原版完整營業週期已完成。

## B-40｜真正繁中本機玩家介面＋商品 #10 原版市場進貨（2026-11-21）

**第一個從玩家手動點擊出發、連接真正標準街來源世界的經營操作已加入程式碼。** [B-40 直接開啟／操作／失敗步驟及來源驗收](b40-local-browser-market-buy.md)，本機 `cd modern && npm run dev:local`、`http://127.0.0.1:4173`，自店／市場／倉庫三頁籤可以依同一個 `WorldState` 重新渲染，沒有把 JSON/人工店內商品模擬當成成交。初始空批發是 B-34 原版；使用 B-37 的真 59 項原始 PLUS 計算供貨，並且清楚標示只是**供貨子步驟而非完整世界時間推進**。

[來源審閱市場購買命令](../src/original-market-buy10.mjs) 經 [標準街模組](../src/standard-street-module.mjs) 與 GameCore CAS 單次更動真店現金／#10庫存／paytoday／行動時間／批發；原價 5000、持有上限20、來源市場買入時間600秒，沒有改原版商品貨源、規則或價格。來源真批發供貨後可在瀏覽器買到 #10；無貨仍可按購買以觀察真正 Core 拒絕，失敗 revision 與店鋪資產不變；展示上架、自然販售、週期決算、存讀檔仍停用。

新增 [原版 Perl buy-s.cgi／GetWholeStore／SetWholeStore 交易探針](../tests/original-perl/original-market-buy10-probe.pl)、[Perl 驗證](../tests/original-perl/original-market-buy10.t)、[Node 來源數字／稀疏批發與本機 HTTP 操作 E2E](../tests/original-market-buy10.test.mjs)。原版買入的 `SetWholeStore` 會寫滿79個格位，包含尾部 `undef`，序列化尾端保留逗號；因此以 `sourceWriteShape=whole-store-79` 標記原版不同來源路徑，前一次 B-34 初始／B-37 精簡稀疏 CSV 行為均保留，B-37 在買入之後也延續完整 CSV 長度。

**程式級驗證**於 `85ad1a869be2c60b813e7e2516b6160dc8bb89a2` 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/44891582798) 與 [PR CI](https://github.com/Prysline/akimono/actions/runs/44891585929) 同 SHA success。後續文件提交的最新 HEAD 仍需另行確認兩個 CI，不能引用較早 SHA 宣稱新文檔也通過。**正式 Notion 12 項任務狀態未因這個功能子切片直接變成「已完成」**。

**下一玩家優先 B-41**：同一網頁使用真正購得的 #10，接真展示架上架→自然販售（現金／庫存／人氣變化），而不是 B-38 的人工上架資料；然後接真週期結算與存檔／重啟載入。不能退回只追加不相干的原版函式測試；按 [正式優先計畫](playable-loop-priority-plan.md) 前進。
