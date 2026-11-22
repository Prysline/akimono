# GameCore／StreetModule／WorldState｜現行責任契約修正（2026-11-22）

## 2026-11-22｜最新權威：R2-E 真 HTTP／USE／存檔整合驗收（R2 A～E 受控範圍完成）

**責任契約：** GameCore 唯一 `market-buy`／`use-item`，StreetModule 只供已審閱 Registry／回呼、HTTP 只送規定欄位及來源受控亂數、WorldState／Repository 保管 CAS 與磁碟一致性，UI 不擁有重複商業算法。

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

**GameCore 可執行契約：** `use-item` 的未知規則由 `getRule` 拒絕，前／後 callback 均為明示策略；StreetModule 不得在 `apply` 再開獨立 USE 交易，失敗的 `WorldState` revision、CAS 與磁碟不可改變。

**正式判定：R2-A、R2-B、R2-C、R2-D 已各自完成，R2-E 未完成；R2 整體、R0／R1 全量仍未結案。** 本節取代本檔下方「R2-D 未完成／下一步做 R2-D」歷史快照。唯一工作分支 `test/task02-baseline-on-s1`；只改 `modern/`；[PR #1](https://github.com/Prysline/akimono/pull/1) 必須保持 Open、Draft、未合併，目標 `migration/standard-street-s1`；凍結原版 Perl／DSL／Core SHA、其他分支、Notion 正式任務未修改。

**R2-D 正式入口與分工：** `GameCore.applyGameCommand` 僅以 `kind:'use-item'` → `src/shared-use-item-core.mjs::projectSharedUseItem` 執行 USE，欄位為 `expectedRevision,shopId,itemId,useId,requestedCount`，需要亂數時另給 `randomDraws`（原版順序、每筆 0～999999 的百萬分之一單位）。StreetModule `useItem.getRule/describe/validateWorld/writeMarket` 提供來源編譯 USE 規則及明示回呼／不支援原因，GameCore 不依商品 ID 複製 USE 公式。共用路徑處理 GetUseItem／CheckUseItem 檢查及原版數量裁切、money／paytoday、UseTime、依序消耗材料與 MakeAmount 產物、CheckWholeStore／市場、來源前後回呼、EXP；WorldState／CAS 原子提交，失敗不修改世界。原有 `market-buy` 唯一買入路徑保持不變。

**真原版覆蓋：** #79 禮物卷 USE #0「交換地圖集」每次用 2 卷，產出 #12、#9、#14 各一，1800 秒、金錢與 EXP 為 0；要求量 3 時會被手上 5 卷裁成 2 次。#14「到劍市的地圖」僅審閱首次 USE #0：12000 G、7200 秒、EXP[14]+20；五種劍 #40～#44 按原版 GET 各 10 次、機率 400/350/150/60/30‰。前回呼 `rand(1000)<=100` 可將產物基數加倍，正常逐件 MakeAmount 對應 50 個產物亂數，加倍改為每組兩個亂數的原版平方根運算；末端 `lostbook` 是 `rand(1000)<100` 消耗一張地圖。兩個回呼合計一般 52、加倍 12 次 rand，100/1000 邊界**加倍、不損毀**。缺 B-63 已審閱 helper 時只容許 B-62 不加倍／不損毀／僅木刀的保守分支。

**真正去重與安全邊界：** `gift-exchange-maps`、`use-original-sword-map-14`、`use-original-sword-map-14-all-outcomes` 三種舊正式命令與 StreetModule dispatch 已移除，`projectReviewedGiftMapUse`、`projectOriginalSwordMapUse`、`projectOriginalSwordMapAllOutcomes` 商品專用執行器已刪除，沒有留下執行不同公式的 alias；保留來源審閱器與原始 Perl 探針。非法 ITEM／USE、缺券、金錢／時間不足、過期 revision、未知 callback／EVENT／公會、未審閱機率／抽樣數、二次地圖熟練縮時、庫存／批發溢出與未知效果均 fail-closed，既不默默忽略也不部分寫入；**不是全部 116 USE 均已通用**。

**驗收證據：** `tests/r2d-unified-use-item.test.mjs` 與原 B-33／B-34／B-37／B-62／B-63 測試已使用同一 `use-item`；真凍結原版 Perl `original-gift-map-use-probe.pl` 六案例與 `original-b63-sword-map-all-outcomes-probe.pl` 六情境對照產物、材料、金錢、時間、EXP、回呼、損毀與亂數消耗，所有原版 Perl 差分檔與 R2-A/B/C 買入、CAS／存檔、DSL／Core SHA 測試保留。**程式版本 `f9f578000af135928e3f16283cc7b76eefd2aa53`** 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/45025885748) 和 [PR CI](https://github.com/Prysline/akimono/actions/runs/45025890130) 都 `completed/success`，**Node 921/921、原版 Perl 1867/1867（52個.t）、全部來源 SHA 成功**。此處是文件更新前的可追溯成功基準；文件更新後**仍必須對新 HEAD 重新驗收同一 SHA 的 Push／PR CI**，不能把舊綠燈冒充最終驗收。

**R2-E 無記憶下一窗：** 先重新查 PR #1 最新 HEAD、Draft／Open／未合併狀態、同 HEAD Actions 與上述六份文件頂部；只在工作分支的 `modern/` 開發。以現有 `market-buy`、`use-item` 為單一路徑，補真實繁中 UI／HTTP 共用 USE，將合法來源市場供貨→買入→#79 交換／#14 首次製作→同一 WorldState CAS→B-43 雙代落盤→關服重啟再載入再操作打通，補真原版 Perl／Node、R0 逐項測試映射與 R1 缺口；不因已有 R2-D 數值差分就宣告 R2-E、整體 R2 或 R0／R1 全量完成。未知 EVENT／回呼／二次 USE 維持拒絕。

---


## 2026-11-22｜最新權威契約：R2-C 買入只有一套正式執行路徑

**R2-A/B/C 已完成自身退出驗收，R2-D/E 與 R2 整體未完成；R0/R1 全量未結案。** `GameCore.applyGameCommand` 對全部正式市場買入只能接受 `kind:'market-buy'`，共用 `projectSharedMarketBuy` 不持有 Standard Street ITEM ID、DSL 解析器或商品型價格規則；StreetModule 負責來源 Registry 的 `getRule/quote/order/describe/validateWorld/writeMarket`，另提供只讀市場報價 `quoteMarketOffer(world,itemId)` 與 `listMarketOffers(world)`。後者依 79 件原版宣告順序提供報價、貨架、數量、上限、`BASE` 動態時間價格和明確不支援理由，**與共用交易使用完全相同的來源規則**。

**不再有平行商業路徑：** `buy-market-item-10/11/14` 從 capabilities、`StreetModule.apply` 及全部正式內部／HTTP／UI 呼叫移除，GameCore 對它們直接回 `UNSUPPORTED_ACTION`；三套 `projectOriginalMarketBuy*` 與 `quoteOriginalMarket*` 函式已從 source 移除。原版 `reviewOriginalMarketBuy10/11`、`reviewOriginalB62SwordMap` 僅留來源審閱依賴，#14 USE 與樂透支援不因去重消失。 `scripts/dev-local.mjs` 真實 `POST /api/buy` 只接收五欄 `expectedRevision,itemId,requestedCount,marketShelf,expectedPrice`，唯一提交 `market-buy`；`local-ui` 直接渲染 server `marketOffers`，不是模擬買入規則。

**WorldState/B-43：** 同一 CAS 提交 revision；實際本機 HTTP 服務已將 `marketBuyRegistry` 顯式傳入 `createLocalWorldSaveStore`，驗證新增普通商品與兩代 fsync/rename/sha256 存檔及重啟回載；不傳 Registry 的資料安全預設不變。安全仍按來源 `FUNCBUY` → ITEM `FUNCB` → SetWholeStore 時序與非零副作用拒絕；EVENT 未知（`eventState:null`）後新的市場買入不會略過未知效果而被允許。B-41 以前假定固定售價的 `paytoday` 模數不能誤拒經原版 `BASE` 策略驗證的 #14 地圖買入後真 USE／木刀販售。

**驗收：** `tests/r2c-unified-market-http.test.mjs` 完成繁中 UI/API → #10/#11/#14/#39 同一 GameCore CAS → B-43 雙代存檔、真正關服／重啟／載入／再次買入；`market-buy-core.test.mjs` 驗證三種舊命令不能執行與原始碼已無重複引擎，舊 Perl Oracle #10/#11/#14、R2-B #12/#14 動態／#39 真買入測試均保留。只以最終同一 HEAD 的 Node/Perl/source SHA/Push 與 PR Actions 全綠判定。**R2-D 的共用 USE／製作、R2-E 世界綜合仍未完成。** 下方原 B-31/R2-A/B 中舊交易分派描述是歷史。


---


> **最新狀態（2026-11-22，優先於下方 B-31 歷史實作記錄）：已提交共用 `market-buy` 到 GameCore，且 R2-A 已通過直接來源差分與回呼時序退出驗收；R2-B～E 未完成，R2 整體未完成。** 不能再說「所有 Core 商業規則仍完全靠 StreetModule.apply」，也不能說「共用市場已完成」：新命令已進 Core，三件商品仍手動白名單，三套專用舊買入流程仍可各自執行。完成狀態及驗收清單見 [R2-A～E 現況文件](shared-market-buy-r0-r2.md)、正式主線見 [R0–R7 計畫](playable-loop-priority-plan.md)。B-31 舊資料只供來源追溯，**不能作現行 API 能力或分工表**。

## 已實作的 R2 買入介面與仍未達成的責任界線

| 層次 | 已實作 | 尚未完成、不可推定 |
| --- | --- | --- |
| `GameCore` | `applyGameCommand` 在 `kind:'market-buy'` 時呼叫 `market-buy-core.mjs`，集中成交量裁切、金錢／庫存／時間、回執及一次世界版本提交；R2-A 已通過 #10/#11/#14 ×12 的真正 Perl `buy-s.cgi` 直接差分 | 尚未成為市場所有買入操作的唯一規則引擎，亦無共用 USE、全銷售或期末 |
| `StreetModule` | 提供三筆已審閱的 #10/#11/#14 買入規格、來源排序／單店市場驗證／79 欄原版批發寫回 | `sharedBuyRules` 手動列舉，`getRule` 對其餘 ID 回傳空；不代表其餘原版商品不合法，也未具資料驅動 Registry |
| 買入相容路徑 | `buy-market-item-10/11/14` 專用命令仍可運作，保護舊 UI 與原版差分測試 | 它們仍分別執行 `projectOriginalMarketBuy10/11/14`，不是無副作用 alias；R2-C 要統一入口後刪除重複正式演算法 |
| 回呼／DSL | R2-A 已辨識標準街原版 `@@FUNCBUY`：市場進貨每滿500,000 G 贈 #79 禮物卷，三件已審閱商品單次買入不觸發；共用 Core 在來源帳務更新後按「全域 `FUNCBUY` → 商品 `FUNCBUY` → 市場寫回」執行已審閱回呼，未知效果明確拒絕，原版 Perl 探針已驗證順序 | 三個現行 `buyCallback:null` 只表示沒有個別商品回呼；**實際超門檻贈禮副作用尚未接入**（R2-B），動態價格／其他特例仍要依來源驗證 |
| WorldState／UI | 既有 CAS、B-43 雙世代存檔可承載新共用命令的受測世界形狀 | 本機 UI 尚未全面切到 `market-buy`，未完成買入＋USE 真世界 HTTP／重啟整合 |

**責任判定：** 共同商業運算只能由 GameCore 或其共用規則模組實作一次；StreetModule 應給來源已審閱、帶來源位置的商品／USE／回呼資料。新增能用現有語義表達的合法商品，不應新增 `buy-market-item-N` 或獨立 project/review 交易演算法。未知回呼、特殊價格及未支援 DSL 語義需精確指出來源並 fail closed，不能只靠三商品白名單認定不支援。R2-A～E 的退出門檻及與 R3～R5 的分界以 [實作狀態](shared-market-buy-r0-r2.md) 為準。

## 為何 B-31 最初責任切分不能直接延用

B-31 文件第「三個模組及責任界線」表明 GameCore 不涉及商品 ID、原版 DSL、商品價格、回呼、交易收費和商業邏輯。這在最初僅做記憶體 CAS 的階段是合理的**受限實作宣告**，但不能把它升格為正式架構原則：原始 Core 的 inc-turn.cgi、plug/use.cgi、plug/whole.cgi、buy-s.cgi、inc-period.cgi 本來就是三條街道共享的運作規則；現在的 standard-street-module.mjs 則隨 B-40～B-63 擴充出多個依 ITEM #10／#11／#14、指定地圖及指定事件分流的 reviewed/project 命令。

代價不是「原版驗證太多」，而是**同一套來源已證明的算法沒有成為一次驗證、各街共用的正式執行能力**。每個微小功能因而重複遭遇來源 pinning、特殊抽樣、Perl fixture、Node 模型、CAS、存檔和 HTTP 整合的前置成本。沒有工時計時證據，不應量化為實測「10 倍」；這是由現有程式與階段紀錄可支持的結構性成本解釋。

## 正式責任（目標契約；部分已有初版、尚待完整實作）

| 層次 | 規則責任 | 邊界與證據 |
| --- | --- | --- |
| **GameCore：共同規則引擎** | 共用命令校驗及調度，並真正執行原版共用的 UseTime、UseItem/MakeAmount、庫存、批發供需、玩家買賣、自然售出／人氣／稅、世界時間分段、商品及事件回呼序列、SortDT、36h 週期決算 | 據 Core inc-func.cgi、inc-turn.cgi、plug/use.cgi、buy-s.cgi、inc-period.cgi、inc-makeitem.cgi；共用公式只實作一次，必須可被多個 StreetModule 呼叫 |
| **StreetModule：街道差異與掛鉤** | 版本化設定、ITEM／USE／EVENT 編譯成果、職業／初始化參數、回呼行為、必需的特殊命令及特殊世界狀態；按原版時序提供 sale/use/turn/period 等擴充點 | 不重新實作一份市場、自然銷售或決算；URon 髒碗販售副作用、WAtlas 期末海域更新為跨街驗證 |
| **RulesCompiler／Registry** | 把已核對 DSL 語義、公式／預設、宏、USE／NEED／GET 與函式參考，編譯為安全、可檢查的資料及有限回呼；保留 source file／line／blob 與 unsupported 語義 | **不在正式玩家命令中任意 eval 原版 Perl**；未知語義明確拒絕並給出來源位置，但不可只因未知 itemId 就重寫 command |
| **WorldState／Persistence** | 街道及共用世界狀態、原版數值語義、版本、原子交易、失敗無副作用、可恢復落盤；未來可替換資料儲存 | GameCore 是規則權威，Repository 是持久化／CAS 權威，兩者不可互相猜測資金或庫存 |
| **UI／API** | 送一般命令、呈現權威資料與錯誤 | 不依 ITEM ID 自行算錢或直接做世界變更 |

**操作介面狀態：** `market-buy({shopId,itemId,requestedCount,...})` **已實作受限初版**，但商品仍固定三筆、UI／舊執行路徑未統一；`use-item(shopId,itemId,useId,count)`、通用的自然販售／時間等仍是未完成的目標契約；既有 `edit-showcase` 有來源受限實作。商品差異應透過已編譯資料和回呼，而不是新增 `buy-market-item-41/42` 或逐 USE 的命令。

### 原版順序不得因抽象化被改掉

- 入口先由 GetUseItem／CheckUseItem 處理職業修飾、來源定義的使用前回呼及材料持有檢查；UseItem 再依熟練、職業、人氣、事件、資金、可用時間及材料**縮減實際次數**，接著扣資金／時間、逐材料與 GET 執行 MakeAmount、於原版位置 CheckWholeStore、使用後回呼，最後處理 EXP；這是兩個函式的相鄰責任，不可把 CheckUseItem 的回呼簡化成「扣費之前一律驗證」。
- 世界時間片：自然販售 → 商品 FUNCTURN → FUNCSALE → SortDT → 達期界時 inc-period.cgi → 市場 PLUS／上限 → EVENT 結束／開始／持續效果。
- 週期回呼：街道 UpdateResetBefore／UpdateResetAfter 對應原版固定相對位置。URon 原版覆寫整份 inc-turn.cgi，須先比對所有差異再選適當擴充點，不能只保留髒碗一行而假定其他完全相同。
- 所有原版 Perl 亂數、hash 順序、整數截斷、稀疏陣列與副作用風險維持可測；尚無等價方案者不能假稱已精確重現。

## 驗收門檻應依正式任務分層，不能要求全遊戲完成才驗收介面契約

**任務04｜GameCore／StreetModule／WorldState 架構契約的完成條件：**

1. Core 實際具有**至少一種可運行的共同商業規則流程**（例如同一個通用市場進貨及商品使用命令可處理兩種來源合法商品），不只是呼叫街道模組；新商品不需要新 command 型別。
2. 有可執行的街道設定／規則掛鉤合約，已核對的共用演算、街道參數、特殊回呼、時序及狀態變更的責任界線清楚，並以**兩種來源支持的街道差異案例或等效契約測試**證明不把 Standard ID 寫死在共同公式。實際完整 URon/WAtlas 玩法可以在任務08／12 才驗收。
3. WorldState／Repository 的 schema、CAS、失敗無副作用和本機儲存邊界有可重用測試；原版來源 SHA 與已驗證行為覆蓋仍保留，**舊測試檔可在新增替代測試且證明覆蓋等價後改寫、合併或移除**，不要求維持全部歷史斷言。若尚不支援某個合法分支，應依具體未支援語義拒絕並明示，而非把所有未列白名單商品視為不合法。
4. 同一 HEAD Push／Draft PR CI completed/success，沒有以新增抽象介面冒充已移植完整 Core。

**任務05～07｜完整規則及標準街閉環的後續驗收：** 通用 USE、市場、販售、時間與事件／36h期末能在真玩家世界執行並保存、重啟後續營；這不是任務04單一階段必須一次完成的前置條件。

**任務08／12｜跨街道擴充的後續驗收：** URon 售出麵食生成髒碗與 WAtlas 期末海域更新使用**同一**共同 Core，不重新複製自然販售或決算；不把人工測試街道誤認為正式的原版差異驗證。

**測試治理：** 每個新增的共同執行能力須新增原版差分、共用命令、街道差異及 CAS／持久化風險測試；每個被取代的 B-xx 專用命令／模型須檢查其舊測試，屬重複或綁定過時內部實作且已有同等覆蓋者應移除，留下清楚的新舊測試／來源行為對照。不得用刪測試換取 CI 綠燈，也不得把測試斷言總數當作完成度。詳細準則見 [現行計畫的重構測試治理](playable-loop-priority-plan.md)。

**狀態：R2-A 共用 `market-buy` 核心已完成自身退出驗收**（原版直接 Perl 差分36組及回呼時序；程式 SHA `bd7a504bdc473a0bd34c1beb5efab8ae621d2381` 的 [CI #45011886766](https://github.com/Prysline/akimono/actions/runs/45011886766) 成功），**但本契約的完整共同規則引擎與 R2-B～E 均未完成，R2 整體未完成。** 特別是三商品白名單、獨立舊買入路徑、共用 USE、實際 UI 遷移尚未結案；B-31 命令契約、B-43 本機存檔及 B-01～B-63 的必要原版對照成果保留。

---

## B-31 第一版介面與來源驗證（歷史紀錄）

# 第三十一階段｜Game Core／Street Module／World State 的第一個可執行介面

## 定位：開始正式任務04，但尚未完成所有正式驗收

沿用 [Notion 任務04](https://app.notion.com/p/41db4185273f81288606d7d5a4375794) 的三項驗收：核心輸入／輸出及商店、世界、商品／行動／事件資料結構；街道專屬效果的擴充界線；本機與伺服器重用規則的設計與取捨。

本階段交付**可真正執行且通過測試的第一版契約**，而不是可玩的完整 Core：新增純函式 `GameCore`、可插拔 `StreetModule`、不可變 `WorldState` 和只在記憶體內運作的 `WorldRepository`。只支援兩個**來源已經過舊階段驗證**的標準街操作：`open-shop`（固定 Core `new.cgi` 與標準街 `@@FUNCNEW` 的受審閱宣告子集）及 `edit-showcase`（固定 Core `sc-s.cgi` 與標準街受審閱商品資訊）。

**明確未完成：** 標準街真實商品使用流程、供需、銷售、事件執行、週期結算、真實存讀檔、帳號、權限／授權、網頁、多人的世界同步。因此 Notion 任務04**可以進行中，但不能標記為已完成**。正式任務02仍持續進行中，作為來源忠實性驗證依賴。

## 三個模組及責任界線

| 模組 | 交付檔案 | 真正執行 | 不涉及 |
| --- | --- | --- | --- |
| **Game Core** | [`src/game-core-contract.mjs`](../src/game-core-contract.mjs) | `applyGameCommand({world,command,streetModule})`：驗證版本、街道 ID、可支援命令、呼叫街道模組、產生下一版純世界狀態與 receipt；回傳拒絕時保留原始快照 | 商品 ID、原版 DSL、商品價格、回呼、交易收費、完整商業邏輯 |
| **Street Module** | [`src/standard-street-module.mjs`](../src/standard-street-module.mjs) | 讀取現有標準街兩份原始 DSL；使用 B-01 已建立的來源驗證 `createStandardStreetShop`、`editShowcase`；只允許 `open-shop`／`edit-showcase` | 源碼中其他 `USE`、`EVENT`、`@@FUNCITEM`／未知回呼的執行或默許成功 |
| **World State / Repository** | `src/game-core-contract.mjs` | `createMemoryWorld`、`validateMemoryWorld`、`encodeMemorySnapshot`、`decodeMemorySnapshot`；`createMemoryWorldAdapter` 的記憶體讀取與 `compareAndSwap`，以及 `executeMemoryCommand` | 真實世界檔案／資料庫、檔案鎖、併發程序、斷電恢復、主帳號與伺服器身分驗證 |

## 明確的 JSON 介面（皆為**本階段合成記憶體世界**）

```js
const world = createMemoryWorld({
  worldId: 'synthetic-world',
  streetId: 'standard-street',
  nowSeconds: 1000000,
});

// schema = 'akimono.memory-world.v1'
// world = {
//   schema, worldId, streetId, revision: 0, nowSeconds,
//   shops: [], market: null, events: null
// }
//
// market 和 events MUST remain null before their real source-backed
// meanings, update rules and required data are reviewed.
//
// command = {
//   kind: 'open-shop', expectedRevision: 0,
//   shopId: 1, ownerName: '店主', shopName: '標準街測試店'
// }
// result = {
//   ok: true, code: 'APPLIED', world: {revision: 1, ...},
//   details: {action: 'open-shop', shopId: 1, ...}
// }
```

- `revision` 是**此新版記憶體 API 的並行版本欄位**，不是 Perl 原版新增的店鋪數值規則。命令必須帶 `expectedRevision`；過期就回 `REVISION_CONFLICT`，不修改世界。
- `StreetModule` 介面為 `{id,capabilities,metadata,catalog,apply({world,command})}`。核心**不含任何標準街特定商品或價格公式**，同一核心可使用不同街道模組；將來可讓本機或多人伺服器呼叫**同一套純函式核心**。這不表示多人權限／授權已完成。
- `StreetModule.catalog.items`（79筆：`id/name/code/priceRaw/limitRaw/flagRaw` 和來源）／`uses`（116筆）／`events`（25筆）均來自原版 DSL 的只讀結構解析。USE／EVENT 紀錄保留 `sourceFile`、`sourceLine`、`ownerItemLine`、`sourceFields[欄位名][] = {raw,line}`，而且全部都明確標 `runtimeSupported:false`。**來源原文≠已完成商品使用或事件編譯器。**
- `open-shop` 只呼叫原本來源忠實的新店初始化模型，初始化原版初始資金（範例10萬）、剩餘時間（範例43200秒）、初始商品與單一展示架；新增相同 `shopId` 會被拒絕，既有店資料保持不變。它不是完整帳號註冊或世界創建流程。
- `edit-showcase` 在指定已存在店鋪中編輯一格，保留來源對商品庫存、禁止展示旗標、定價和操作時間的既有驗證。沒有任何未審閱的預設價格被憑空補入。
- `market:null`、`events:null` 是**未實作的明確空值**，不是「市場庫存為零」、「所有事件不觸發」或正式原版世界狀態。`period-settlement`、`market-sale`、`use-item`、`buy`、`event` 等均返回 `UNSUPPORTED_ACTION`，**不應由前端當成成功執行**。
- `SOURCE_BOUNDARY_REJECTED`（已知命令卻未通過來源模型資料檢查）、`STREET_MISMATCH`、`REVISION_CONFLICT`、`UNSUPPORTED_ACTION` 都返回 `ok:false` 且不改變世界。這些錯誤碼是**新版 API 介面**，不是原版使用者文案。
- `WorldState` 必須是有限、安全整數、非循環的純 JSON 資料。解碼不接受未知 `schema`、額外頂層欄位、重複店鋪 ID、非 JSON 值或壞格式。這些都是**合成測試資料與序列化限制**，不是替原版 Perl 增加新的數值規則。
- `encodeMemorySnapshot` 只回傳字串；`decodeMemorySnapshot` 只解析並驗證純資料。**完全沒有 IO**，不可以因為 API 有 snapshot 一詞就宣稱支援實際遊戲存讀檔。
- 記憶體 `compareAndSwap` 比對 `revision`，另外防止世界 ID、街道 ID、世界時間和一次跳多版被接受。這不包含磁碟原子性／跨程序交易；多使用者伺服器還需要權威的帳號授權及持久化實作。

## 最小來源支持流程與拒絕案例

```text
固定原版 DSL（讀取，不執行 Perl）
    │
    ▼
Standard Street Module — catalog 非執行原文、2 種明確可執行命令
    │
    ▼
Game Core — 純命令處理，版本、街道 ID 與支援能力驗證
    │
    ▼
World State（新版合成記憶體）— 不可變 shops、revision
    │
    ▼
Memory CAS adapter — 本次提交或 REVISION_CONFLICT
```

```sh
cd modern
npm test
npm run demo:game-core
```

[`tests/game-core-contract.test.mjs`](../tests/game-core-contract.test.mjs) 直接使用兩份原版 DSL 和固定 `new.cgi`、`sc-s.cgi` 快照，對照原本 `createStandardStreetShop`／`editShowcase` 的結果，並測試：

- 新店初始化、原版限定來源操作及「新增店→修改展示架」不可變狀態連續轉移；
- 模組沒有接入市場／事件或任何未知回呼時，命令**嚴格拒絕**；
- 同一版本兩個提案只有第一個可 `compareAndSwap`，過期提案不得覆蓋；
- 失敗命令不修改資金、庫存、世界、事件／市場空值，沒有自動「修正」原版；
- 非 JSON 世界、非安全整數、未知 schema／額外欄位拒絕，以及 JSON snapshot 的確定性 round-trip；
- 另外用**明確標示非真實遊戲**的人工測試街道證明通用 Core 可被另一個 StreetModule 驅動，而非為標準街寫死。

## 取捨與下一步

本階段**選擇維持 Node.js 22＋ESM＋純函式**，因為目前先驗證原版資料模型與模組界線；**尚未**決定正式前端框架、多人 DB、伺服器部署或資料安全策略。現有 memory CAS adapter 可先讓本機測試與將來伺服器共用同一套核心程式，**不能**保證正式的併發安全、權限或持久化。

**正式任務04尚需完成**：真正 Core 命令的完整資料結構與事件／街道特殊效果掛鉤、世界市場狀態及後續結算；補齊來源依據及單機／多人 adapter 規格，才能將任務04改為已完成。其後優先依任務05～07串「進貨→使用→陳列→市場銷售→週期結算→可信狀態快照」；不可用 mock 自創原版數值或暗中跳過未審閱 callback。

原始 `main`／`migration/standard-street-s1`、兩份原版 DSL、已固定18份 Core Blob SHA 及 Stage30 的 CORE-01～CORE-20 注意事項均不修改。變更只放測試／移植分支與 Draft PR，原版資料不寫入。
