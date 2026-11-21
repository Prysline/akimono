# 《商人物語》移植進度與最短可玩路線（第三十八階段）

**正式目標（Notion）：** 以原版經營規則為準，使用共用 `Game Core`、可分離 `Street Module`、`World State / Persistence`，先完成繁體中文**標準街單機版**，再以麵店「臨時工轉職／麵食售出變髒碗」驗證不同街道的擴充，最後加入**主帳號與多人共享世界**。

**變更限制：** 原始 `main`、`migration/standard-street-s1` 與原版 CGI／DSL 不更動；目前驗證在 `test/task02-baseline-on-s1`、Draft PR #1。固定 Core `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`，原先18份再加 B-34 原始管理員初始化快照，現有**20份**原版 Core Git Blob SHA 受 CI 核對（B-38 再新增一份不修改原文的 `plug/detail.cgi`）。**Perl、Node 測試通過率不是整體遊戲完成率**；不自行給一個假的百分比或把尚未驗收的功能標成完成。

## 正式 12 任務狀態（任務04與05皆已開始實作，尚未完成）

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

## 下一個優先目標：轉向最小可玩閉環

以 B-30 級別的來源回歸測試守住不變規則，不再單純用測試數量當作主要交付。

### 31｜已完成最小可執行契約原型；繼續補齊任務04驗收

目前已建立可插拔 `Game Core`、`Street Module` 與不可變 `World State` 的 **初版記憶體介面**，並完成源碼可核對的開店與展示架兩種操作。接下來需要決定街道特殊銷售效果與未編譯事件如何在 Core pipeline 掛接，補足實際交易、存讀檔與本機／多人 API 的前置契約，但**不能拿純 CAS 模型當作真實伺服器資料庫**。

**已驗證**：受控世界快照 → 兩種來源已審閱命令 → 版本遞增及確定性記憶體結果；不合法、未知、版本衝突命令拒絕且世界不變，既有 B01～B30 回歸仍成功。**尚待驗證**：完整商品／事件等 Core 擴充接口與本機／多人真正持久化權限。

### 32｜已驗證「人工 Core fixture 商品使用連續兩次」，標準街閉環仍未完成

本階段在**獨立 `source-use-fixture-b32` 人工街道**中，將原版 `UseItem`／`lostbook` 的受控 A/B/C 商品數值，透過 B-31 `WorldState` 命令連續執行兩次；第二次真正使用第一筆留下的商品庫存、批發、金錢、時間與經驗，並以六次原版 Perl 來源執行直接核對。**這不是** 真正標準街 ITEM #1～3 的藥草／野獸皮革／樹枝，也還沒有將實際標準街商品使用接上。下一步須以真正標準街 DSL 的 ITEM+USE 做來源合規轉換，再串「建店→商品操作→陳列→市場→結算」完整閉環。

**本階段已驗證**：人工 Core 交易連續記憶體快照，失敗／過期命令不改狀態；六筆實際 Perl 源碼結果跨語言比對一致。**未驗收**：真正標準街 USE、完整供需銷售與週期結算、真正可儲存的世界資料與玩家操作介面。

### 39 起｜從 B-38 自然銷售原文區段驗證回呼、排序與完整經營閉環

B-34 已從固定原版 `inc-admin-func.cgi` 找到首個世界檔**空白批發列**；雖可在記憶體中連續使用真正禮物卷，這仍只是首次初始化**數值與稀疏 CSV 局部狀態**，不是完整原版管理員 CGI 或可儲存的世界。B-35 已實作 ITEM #10 單項來源 PLUS、原版完整 CheckWholeStore 及其稀疏位置對照；B-36 已將商品 #1/#10/#40 的 PLUS 以固定原版同一迴圈順序執行並核對亂數消耗與全79項上限；B-37 已逐項以原版編譯器核對59項非零 PLUS 與20項缺省，並直接跑 Perl 原文供貨迴圈、亂數消耗和批發上限；B-38 已直接執行原版自然販售數值區段＋全59項 PLUS，對照價格、人氣、現金、稅、成本與跨兩段的亂數；仍明確跳過中間的 FUNCTURN／FUNCSALE 回呼、排序與期末決算。B-39 應挑選來源可核對的實際商品回呼，從自然販售的 `_sale_count_` 走到真正回呼，再接原版 PLUS；另一條前置工作為真正批發／購買商品 #10，以免長期依賴人工起始庫存。最後再處理人口／時間切段與 GetUseItem/CheckUseItem 真實入口。確認核心閉環後才接單機儲存 adapter（含鎖／備份／失敗測試）、繁體中文 UI，最後麵店和多人權限。

**安全與版權界線**：原本素材授權尚須單獨確認，發佈前不能將未知授權的圖片／音樂一起公開；原版程式的歷史異常只列錄，不擅自改其計算順序。

> 專案狀態：B-38 已在**受控單店來源測資**中執行固定原版自然銷售數值區段並接上原版全59項 PLUS，兩段共用 rand 來源序列與79格稀疏批發逐欄跨語言對照；**FUNCTURN／FUNCSALE 回呼、排序、決算、真進貨、真存檔／網頁／多人仍未執行**。下次請讀[交接文件](next-window-handoff.md)，不要把這兩段隔離串接當作真實完整週期。
