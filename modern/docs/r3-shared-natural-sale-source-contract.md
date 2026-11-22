# R3 共用自然販售／時間來源契約（R0／R1 證據）

**2026-11-23｜R3 ITEM 回呼分派與一分鐘抽樣（受控新增，整體未結案）：** 已在來源自然販售與 59 PLUS 之間加入依原版 `inc-turn.cgi` 審閱的 ITEM FUNCTURN／FUNCSALE 階段：標準街唯一 #70 回呼即使沒有持有者，60 秒仍會消耗一筆 rand(1)；並於 FUNCSALE 後清除 `_sale_count_` 暫存。原版 Perl 直接分派探針 `original-r3-item-callback-stage-probe.pl` 與 Node 差分已新增，真 HTTP 一分鐘／存檔重啟測試亦已補上；其他來源回呼或 #70 真持有仍拒絕。EVENT 17-key hash 順序、SortDT／36 小時結算、全部 USE／多商店尚未完成，R3 不宣告結案。


**2026-11-23 市場貨架修正／R3 續驗：** 已依凍結原版 `whole.cgi::GetWholeStore` 將一般市場清單改為只顯示 `wholesale>0` 商品，原版 79 ITEM Registry 另供倉庫名稱查詢；缺貨品不再佔據市場貨架，原本的 `market-buy` 報價、上限、CAS、PLUS 不變。R2-C 新增直接執行原版 `GetWholeStore()` 的 HTTP 貨架與排序差分，R3 真時間＋PLUS、重啟後在售貨架與庫存同步回歸；本修正不代表 EVENT／FUNCTURN／FUNCSALE 或 36h 結算完成。

> 2026-11-22 現況：R3 **受控部分完成，尚未達完整退出條件**。本文件記錄已執行的原版 Oracle、資料驅動共用核心及仍需拒絕的來源語義。R0、R1 全量未結案。原版 Perl／Core／DSL 不修改。

## 2026-11-23｜R3 ITEM 回呼分派正式安全子區

新增 `src/r3-reviewed-item-callback-stage.mjs`：從原版 `inc-turn.cgi`、標準街及 rebel DSL 審閱「自然販售 → ITEM FUNCTURN → ITEM FUNCSALE → 排序／期末 → PLUS」的順序與宣告。只有 #70「那由多的項鍊」具有 `funct _local_`，沒有商品 `funcs` 或全域 `FUNCTURN/FUNCSALE`。合法來源取得的 #10 與 #40～#44 玩家庫存不含 #70，因此原版會呼叫 #70 FUNCTURN，但沒有受影響店舖；目前正式時間命令會先執行此審閱階段，遇到未知回呼或 #70 真持有時 fail-closed。

**關鍵 RNG 修正：** #70 的程式先計算 `$TIMESPAN/86.4`，當單次快轉 60 秒即使無持有者，仍需消耗一次 `rand(1)` 才對空店舖集合返回；這筆樣本現在置於自然販售與市場 59 PLUS 之間，避免市場進貨 RNG 位移。時間片 120 秒以上不需此抽樣。本輪已補原版 `FUNCSALE` 階段對 `_sale_count_` 的暫存清除，並新增直接執行原版 Perl 分派片段的 Oracle。完整時間回呼的其他街道／持有 #70 情境、排序／期末、EVENT 及 17 hash 順序尚未整合，不能宣告 R3 全面完成。

## 來源與責任分工

原版凍結來源：modern/tests/original-perl/inc-turn.cgi（需求、店舖販售、FUNCTURN、FUNCSALE、排序／期末、PLUS、EVENT）；modern/tests/original-perl/market.cgi（GetMarketStatus）；modern/tests/original-perl/item.cgi（GetSaleTax）；modern/tests/original-perl/core-detail.cgi（GetUserTaxRate）；modern/tests/original-perl/whole.cgi（CheckWholeStore）；modern/tests/original-perl/inc-makeitem.cgi（ITEM 與 POP／POINT／COST 編譯）；custom/inc-item-data.cgi（ITEM／EVENT／PLUS）；原版源 SHA 仍由既有 CI 稽核。

現行正式共用數值入口：modern/src/shared-natural-sale-core.mjs 的 projectSharedNaturalSale。modern/src/original-b41-playable-sale.mjs 的 source review 從原版 DSL 建立每 ITEM 參數、驗證單店單架及期界、呼叫共用計算器，然後依原版順序執行已審閱 59 ITEM PLUS 與 CheckWholeStore。modern/src/standard-street-module.mjs 提供商品與街道來源規則；modern/src/game-core-contract.mjs 控制 WorldState CAS。前端只讀伺服器的 showcaseOffers、送商品及 expectedRevision，不計算需求或售出。

已核對的商品原版編譯數值如下：

| ITEM | 商品 | PRICE | POP（秒） | POINT | COST（每件） | 已審閱取得 |
|---|---|---:|---:|---:|---:|---|
| #10 | 書本寫作工具 | 5000 | 1728000 | 200000 | 100 | source market-buy |
| #40 | 木刀 | 1200 | 10800 | 1250 | 120 | #14 首次 use-item |
| #41 | 鐵劍 | 1500 | 10800 | 1250 | 150 | #14 首次 use-item |
| #42 | 鋼鐵劍 | 3200 | 18000 | 800 | 320 | #14 首次 use-item |
| #43 | 秘銀劍 | 8000 | 36000 | 700 | 800 | #14 首次 use-item |
| #44 | 奧利哈鋼劍 | 12000 | 57600 | 600 | 1200 | #14 首次 use-item |

原版 GetNumber 將 80%、70%、60% 編譯為 800、700、600，不是 POP 產生 POINT 的 0.8、0.7、0.6 倍。六商品共用同一算式；沒有建立商品專屬販售命令。合法取得來源由既有 #14 劍市地圖 market-buy／use-item 與 B-62／B-63 Perl/Node Oracle 保證；單純可解析 ITEM 絕不等於特殊回呼已支援。

## 有限共用命令契約

既有 GameCore advance-source-time 命令輸入 kind、expectedRevision、shopId=1、minutes（1～60）與伺服器提供的整數百萬分位抽樣。公開 POST /api/advance-time 只接受 expectedRevision 和 minutes；客戶端不允許注入 randomDraws、回呼、售出量。正常出售要求來源初始化市場、合法單商店、單展示架、商品真持有量、編譯原價、可安全運算整數與未跨越 36h 結算邊界。上架經 edit-showcase；不能用 fake stock 跳過原版 market-buy／use-item。

GetMarketStatus 的來源基數為 DTpeople*SALE_SPEED/3/50；販售按原版 buypeoplebase、售價、排名、需求、庫存及 ran​​d 呼叫次序，先抽需求、必要時進行小於 1 的補抽，售出後才抽人氣、完成 rank 衰減；金額、庫存、saletoday、itemtoday、trush、rank、temprank、costtoday、暫時 _sale_count_ 依 source 收支更新。保留 Perl 整數截斷和浮點維持費；原版初始禮物卷 COST=10×5 不是額外固定店舖成本 50。現行受審閱稅率是 0，未知非零稅率不得默許。59 項 PLUS 接續自然販售、與同一抽樣串流對齊，市場上限使用原版 CheckWholeStore。

成功 receipt 內含 naturalSaleCount、soldItemId、stockBefore/stockAfter、moneyBefore/moneyAfter、naturalDraws、plusDraws 與 totalDraws。WorldState 在純投影成功後以單次 revision CAS 提交；過期 revision、錯價、來源未知、抽樣不足、負資產／溢出、跨期等拒絕時記憶世界不變。雙世代磁碟是**獨立** /api/save，經 generation CAS、原子 rename 與 fsync，不可聲稱世界指令自動持久化。損毀存檔／不合法持有及展示欄位依 B-43 拒絕，不假造恢復狀態。

**回呼來源核對（不等於已實作）：** `custom/inc-item-data.cgi` 的 ITEM 宣告中，`funct` 僅 #70「那由多的項鍊」一筆（既有 B-39 隔離 Perl/Node 測試），主街與 rebel ITEM 都沒有 `funcs` 宣告。R3 本輪六種受控商品本身沒有商品 `FUNCTURN`／`FUNCSALE`，但 `inc-turn.cgi` 確實會遍歷所有 ITEM 的 FUNCTURN／FUNCSALE；#70 並無本輪可合法進貨取得的來源，因此不可把 B-39 人工持有量 fixture 視為正常玩法，也不可因這項審閱就直接宣布完整時間階段完成。

## 來源順序及未結案限制

凍結 inc-turn.cgi：來源需求／市場狀態 → 各店自然販售及維持費 → ITEM FUNCTURN → FUNCSALE／_sale_count_ 清理 → SortDT／必要期末 → 59 ITEM PLUS／CheckWholeStore → EVENT 結束、開始、NOWFUNC。這個排序是來源契約，不能把跳過的回呼視為已實作。

新增 R3 安全防線：當 period.eventState 為 null 且展示 #40～#44 時，後續 B-41 劍類自然販售必須原子拒絕。讀檔後仍可進行來源合法上架與雙代存檔，但不能跳過未知 EVENT 再次賣劍。舊 #10 保留 B-41 歷史數值續營行為供 R2 回歸；這不等於完整原版時間引擎。

現行 advance-source-time **僅**正式支援 B-41 自然販售／PLUS 數值子區，未完成整個時間引擎的 FUNCTURN／FUNCSALE／EVENT。成功後的 period.eventState=null 代表事件狀態**未知**，絕不等於空事件；歷史 B-41 允許繼續有限數值時間片不構成完整原版事件等價。B-56 advance-source-time-reviewed-events 對已知鐵礦／祭典／劍需求 EVENT 及部分瞬間事件有明示 fixture，但需要外部完整 17 個 EVENT hash key 順序、eventDraws；測試用明確排列**不是**真實 Perl hash traversal。

B-54 本機 RNG 使用同一 world/revision/command 固定重播的 source-shaped 抽樣，不重建原版 Perl 隨程序漂移的 rand 內部狀態。未審閱或未知 FUNCTURN／FUNCSALE、其他商品特殊回呼、任意售價／架數／多商店、街道差異、非零稅率、任意 EVENT 持續效果或跨期，仍需來源 Oracle 和拒絕設計。不能為通過時間測試而清空事件、重抽事件或將 R4 的 36 小時期末偽裝為完成。

## 實際驗證

- modern/tests/original-perl/original-r3-shared-sale-probe.pl 執行凍結 ITEM compiler、原版 inc-turn 自然區、market.cgi 與 59 PLUS，對六商品×四種邊界輸出 24 組獨立 Perl expected values。這是**隔離算式 fixture 的商品庫存**，不冒充玩家取得證據。
- modern/tests/r3-shared-natural-sale.test.mjs 以 Perl expected values 審核共用 JS 售量、庫存、收支、排名、維持費、抽樣前綴與拒絕。
- modern/tests/r3-shared-sword-acquisition-sales.test.mjs 實際 #14 market-buy → 首次 use-item 五種來源劍 → 同一販售入口 → CAS／雙代存檔 → 載入後續營。此測試以明示 B-56 hash fixture 檢查已審閱事件子集。
- modern/tests/r3-real-sword-http-restart.test.mjs 啟動真正繁中 HTTP 服務，驗證 #14 來源製作、#41／#42 原價上架、共用 B-41 販售、過期 CAS 拒絕、兩代磁碟、真正關服重啟兩次及載入後再次操作。EVENT 未知狀態仍明示 null。
- B-41～B-43、B-54、B-56、B-61～B-63、R2-E 全舊 Node／Perl／SHA 既有回歸保留。

**階段判定：R3 受控部分完成；完整回呼、EVENT 與時間來源等價尚不成立，R0／R1 僅補本輪必要映射與契約。下一工作窗應優先追查原版 FUNCTURN／FUNCSALE 及事件 hash／RNG 契約，嚴格界定 R4 跨期。**
