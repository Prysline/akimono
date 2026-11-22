# R3 受影響 R0 測試映射（2026-11-22）

**2026-11-23｜R3 六商品販售原版定價／稅額擴充：** 共用 `projectSharedNaturalSale` 從「固定原價」擴充到來源 `sc-s.cgi` 的 1～200% 定價；同一個來源支援的 #10、#40～#44 共用販售需求、價格懲罰、供需、售量、人氣與 `item.cgi::GetSaleTax` 超價附加稅，賣出總額與扣稅後入帳分開，`taxtoday` 更新。`shared-showcase-price.mjs`、來源審閱、`POST /api/showcase`、繁中 UI 與 B-43 兩代存檔接受合法來源百分比，拒絕任意造價和 201%／多餘欄位；原價 `priceOverride` 只保留測試相容。新增原版 Perl 6 商品 × 4 比例 24 組差分、原版直接「自然販售 → ITEM FUNCTURN/FUNCSALE → 59 PLUS」6×2×2 整合探針、標記稅額與需求原始碼 drift，以及真 HTTP 150% 稅額→保存→重啟。**完整 R3 退出仍須以最後同 SHA CI、EVENT 前置語義與合法連續經營驗收確認；EVENT 全生命週期與 36h 期末屬 R4，不可把未知事件當作無事件。**

**2026-11-23｜R3 ITEM 回呼分派與一分鐘抽樣（受控新增，整體未結案）：** 已在來源自然販售與 59 PLUS 之間加入依原版 `inc-turn.cgi` 審閱的 ITEM FUNCTURN／FUNCSALE 階段：標準街唯一 #70 回呼即使沒有持有者，60 秒仍會消耗一筆 rand(1)；並於 FUNCSALE 後清除 `_sale_count_` 暫存。原版 Perl 直接分派探針 `original-r3-item-callback-stage-probe.pl` 與 Node 差分已新增，真 HTTP 一分鐘／存檔重啟測試亦已補上；其他來源回呼或 #70 真持有仍拒絕。EVENT 17-key hash 順序、SortDT／36 小時結算、全部 USE／多商店尚未完成，R3 不宣告結案。

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


## 2026-11-23｜新增與修改的 R3 回呼測試清冊

| 測試 | 原版依據／回歸風險 | 處置與替代證據 |
|---|---|---|
| `modern/tests/original-perl/original-r3-item-callback-stage-probe.pl` | 真 `inc-turn.cgi` ITEM FUNCTURN→FUNCSALE 分派與 #70 source inline 回呼，即使空持有者也抽樣，最後刪 `_sale_count_` | **新增**；直接執行原版兩段 Perl 分派及 callback，7 種來源情境 |
| `modern/tests/r3-shared-natural-sale.test.mjs` | 1 分鐘回呼亂數位移與未知來源 callback | **擴充**；比較真正 Perl 分派輸出、零持有安全邊界與來源漂移拒絕 |
| `modern/tests/b41-real-playable-sale.test.mjs`、`b42-continuous-shop.test.mjs` | B-38 原自然片段保留暫存 `_sale_count_`，但真正完整 `inc-turn.cgi` 回呼分派會刪除 | **改寫**正式時間結果為已清除暫存；來源販售數值及其他回歸保留 |
| `modern/tests/r3-real-sword-http-restart.test.mjs` | 玩家真 HTTP 1 分鐘回呼抽樣、PLUS、市場實貨及磁碟重啟 | **擴充**一分鐘 E2E，原有五劍／CAS／雙代重啟場景保留 |


## 2026-11-23｜新增 R3 價格／附加稅／整段時間來源驗證

| 變更或測試 | 真正來源與風險 | 本輪處置與回歸替代 |
|---|---|---|
| `src/shared-natural-sale-core.mjs` | `inc-turn.cgi` 的 `buypeoplebase`、售價供需懲罰、`item.cgi::GetSaleTax` | 既有單商品共用核心擴充來源 1–200% 價格，正確扣附加稅；不複製六個專用販售引擎 |
| `src/shared-showcase-price.mjs`、`src/original-b41-playable-sale.mjs`、`src/local-world-save-store.mjs` | `sc-s.cgi` 來源百分比與保存不可信任舊任意價格 | 新增共用百分比檢查，合法單架商品價格保留到 CAS／存檔，超界拒絕 |
| `scripts/dev-local.mjs`、`local-ui/app.js`、`local-ui/index.html` | 玩家原版百分比操作；交易／瀏覽器不應計算原版自然銷售 | HTTP 嚴格送 `per` 1–200，後端 StreetModule 投影價格，前端只送輸入比例 |
| `tests/original-perl/original-r3-price-sale-probe.pl`、`tests/r3-shared-natural-sale.test.mjs` | 六種 ITEM、50/100/150/200% 漲跌價、原版稅收及整數邊界 | 新增 24 組真凍結 Perl 自然販售＋PLUS 逐欄差分，保留舊原價 24 組 |
| `tests/original-perl/original-r3-integrated-priced-turn-probe.pl` | 真 `inc-turn.cgi` 自然 → ITEM #70 空持有者 callback → FUNCSALE 清理 → 59 PLUS | 24 組（六 ITEM × 兩種定價 × 60/1800 秒）直接原版執行探針與 Node 共用三段整合核對，無法替代 EVENT/SortDT/期末驗證 |
| `tests/r3-real-sword-http-restart.test.mjs` | 玩家真來源 BUY → 150% 上架 → 原版附加稅 → CAS → 磁碟重啟 | 新增真 HTTP 150% 與 `taxtoday` 收支及 durable reload 測試，舊 #14 五劍／多次重啟仍保留 |
| `src/original-natural-sale-plus.mjs` | 凍結 `item.cgi` 稅率公式及 `inc-turn.cgi` 的原版定價需求公式 | 增加來源 marker drift fail-closed，新增惡意改動公式反例測試 |

**仍未覆蓋：** EVENT 17-key Perl hash 原序及全生命週期、真世界跨期 SortDT/36h、其他街道／多商店、非零基礎使用者稅、公會、所有未審閱 ITEM 使用回呼。以上不能因本段差分通過而推論已完成。

R3 目前缺少的 R0／R1 完整映射：FUNCTURN／FUNCSALE 尚未支援的持有者／其他街道語義、17 EVENT 真 Perl hash 遍歷及其他未知回呼、原版亂數狀態、未審閱來源售價／多架／多商店／街道差異、非零基本使用者稅、跨 36 小時期末。沒有等價來源證據前**不得移除舊測試**、不得把部分 R0／R1 當全量完成。
