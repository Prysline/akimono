# R4-B｜凍結原版 36 小時時間片與 Perl 差分（2026-11-23）

## 2026-11-24｜DataWrite 真檔案契約與 36 小時分段的界線

同一 inc-turn.cgi 在所有時間片跑完後才依次執行有條件 MakeGuildFile、WriteGuildData、DataWrite、RenewLog、DataCommitOrAbort、UnLock。期末 inc-period.cgi 最尾的 MakeGuildFile、備份與 Session 清理不等於主狀態已提交。真檔案層級詳見 [外部副作用契約](r4-external-file-effects-contract.md)。新增單活躍店原版 Perl 兩期 play.cgi DataWrite/commit/reload 與 Node 實際 IO/位元組差分，嚴格禁止其結果解除 36 小時跨期或 eventState:null 的拒絕。未審閱公會、軍隊、錯誤封存、城鎮多鍵與多檔原子性仍阻塞。


**受控進展，不是 R4 完成宣告。**

- 新增 `src/original-r4-time-slices.mjs`：核對原版 `_config.cgi` 的 36h 週期與 JST／期末偏移，以及 `inc-turn.cgi` 的 `@timespan` 原始順序；只計算前後時間及期末旗標，不執行或假造 `SortDT`、結算、PLUS、EVENT。
- 新 Perl Oracle `original-r4-time-slices-probe.pl` 從**凍結 inc-turn.cgi 原文直接擷取並執行**時間切割區塊，對 9 組時間輸出原版 raw `[dateupdate,timespan]`，包含零尾段、恰好跨界、跨兩個以上週期。對應 `.t` 與 Node `r4-original-time-slices.test.mjs` 比較真正執行輸出；非人工 expected-values 假充差分。
- 來源的實際時間片順序：自然販售 → ITEM FUNCTURN → ITEM FUNCSALE → `SortDT()` → `RequireFile('inc-period.cgi') if $dateupdate && scalar(@DT)` → 59 PLUS／`CheckWholeStore` → EVENT 結束 → EVENT 開始 → NOWFUNC。每個時間片都需完整執行，**不允許合併後直接當普通快轉**。
- 本元件不是正式 WorldState 命令；原 R3 與 B-56 的未知期末／EVENT 仍 fail-closed。不把 Perl `keys(%EVENT)` 或 `keys(%DTevent)` 假設成 DSL 順序。B-44～B-50 期末子鏈為受控不提交 fixture，尚缺完整原版外部依賴與期末 CAS 整合。

**R4 剩餘退出阻塞：** 完整 17 EVENT 的原版鍵序與回呼／RNG，同期 `SortDT`＋`inc-period.cgi` 所需外部依賴、真跨期可提交多時間片、同世界自然販售／PLUS／EVENT／期末，以及真 HTTP 買入→USE→展示→多次營業→決算→雙世代保存→關服重啟的來源差分和雙 Actions 最終同 SHA 驗收。

不修改凍結原版 Perl、DSL、Core、其他分支或 Notion 正式任務；PR #1 仍須 Open／Draft。

**既有核心整合：** `original-b41-playable-sale.mjs::reviewB41Sale` 以凍結來源審閱時間切割順序，`projectSourcePreEventSaleSlice` 的跨期檢查改呼叫同一 `projectOriginalR4TimeSlices`。僅接受一個非跨期有效時間片；恰好到期、跨多期或來源漂移會在 WorldState 投影前拒絕。此更動不代表執行 `SortDT` 或期末，也不讓舊 B-41 後繼未知 EVENT 變成 `{}`。

## 2026-11-23｜R4-A 原版 EVENT Perl hash 遍歷 Oracle（受限）

新增 `original-r4-event-hash-order-probe.pl`：重用 B-53 直接執行凍結編譯器 `GetTime/GetNumber` 的 25 EVENT DSL 探針，取得編譯後 17 鍵；再從**凍結** `inc-makeitem.cgi::OutEventData` 擷取真正的 EVENT hash 初始化 Perl 原文，在 Perl 行程中執行。直接觀察 `keys(%EVENT)` 重複遍歷，以及明示人工已有 EVENT 三鍵資料的 `keys(%DTevent)`；新增原版 Perl `.t` 和 Node 多行程差分測試。

此工作包僅證明原版 EVENT 的編譯鍵集合、Perl hash 建立方式及真實鍵遍歷結果。不假設 Perl 不同行程 hash seed／順序固定，也不把測試取得的排列或 B-56 fixture 排列當成可泛用的原版順序。人工 `%DTevent` 三鍵**不是**真實遊戲的事件存續紀錄。尚未執行完整 EVENT 起迄／NOWFUNC、17 回呼與 RNG 效果，仍需來源整合後才能提交 WorldState；**R4-A 與整體 R4 尚未退出**。

## 2026-11-23｜R4-B SortDT 接入來源共用引擎（非完整回合）

已新增 `original-r4-sorted-pre-event.mjs`；核對凍結 `inc-turn.cgi` 中 `_sale_count_` 清理 → `SortDT()` → 期末 → 59 PLUS → EVENT 的相對順序。R3 唯一自然販售／ITEM 回呼在 R4 純投影路徑增加既有 B-47 `projectOriginalSoloSort`，其位置**確實在 PLUS 前**；既有 R3 與 B-56 預設執行仍維持原受限行為。直接凍結 `inc-func.cgi::GetDTPoint`、`core-detail.cgi::SortDT` Perl 原文 Oracle，並以合法市場進貨→上架→販售的同一世界比較 Node R4 排序、原版 shop 全欄、PLUS、RNG、未知事件拒絕及零變動。**本純投影不寫 `period`、不能提交正式完整回合，未支援期末或 EVENT。**

## 2026-11-23｜R4 SortDT 同世界事件 fixture 與動態人口 PLUS（來源局部）

1. **正確的 SortDT 位置：** `src/original-r4-sorted-pre-event.mjs` 使用真凍結 Core `GetDTPoint`／`SortDT`，R3 共享自然販售與 ITEM 回呼後、59 PLUS 前執行。Perl `original-r4-sorted-pre-event-probe.pl` 逐欄核對；Perl 的 `costtoday` JSON 輸出位數與 Node 不同，維持費以 1e-12 浮點序列化容差核對，其他欄位嚴格比較。
2. **EVENT 順序受控組合：** 既有 B-56 事件 fixture 可選擇 R4 真 SortDT 前段，對同一世界連接已審閱事件（仍需呼叫端提供合法 17 鍵排列）；它不是原版 Perl process hash 真實序列認證，不提供正式玩家 EVENT 通道。
3. **期末人口來源依賴：** 凍結 `inc-turn.cgi` 的 59 PLUS 使用 `$DTpeople`，不是永久固定初始 500,000。新增共用 PLUS `r4PeriodPopulation` 受控純投影、來源公式漂移檢查與明確拒絕未審閱人口；原版 Perl harness 只補可注入的 `dtPeople` 測試參數，未改凍結 `inc-turn.cgi`／`whole.cgi`。
4. **真差分：** `original-r4-dynamic-population-plus-probe.pl` 在人口 250,000／500,000／750,000、120 秒（#10 尚未上限飽和）直接執行 59 PLUS＋完整 `CheckWholeStore`，Perl `.t` 與 Node 比對 79 個市場欄位、原始 CSV、稀疏定義位與逐筆 RNG。這是純人口公式差分，**沒有捏造成功的期末 WorldState 或存檔**。

### R4 正式退出未通過的來源語義

- 17 EVENT：B-55～61 已審閱的 8 類效果／2 個 zero-start 受限來源測試仍依賴 fixture；尚缺 7 類來源事件 `boom-posyon`、`tate-sale`、`yoroi-sale`、`tue-sale`、`plusdown-yakusou`、`plusup-misuriru`、`plusup-oriharukon` 的完整生命週期／ITEM overlay；既存 `rebel`／`guildbattle` 作用與所有 START／END／NOWFUNC 的真 Perl hash 原序、RNG 仍需全程核對。
- 36h：B-50 是同狀態原版期末子鏈而非正式 WorldState，尚未把 SortDT、期末、城市人口與稅、PLUS、EVENT 逐片原序合成至可提交的跨期核心；雙世代存檔目前不授權已結算 period。
- 真 HTTP：目前缺少「買入→USE／製作→展示→多次營業→跨期決算→存檔→重啟繼續」的源碼等價驗收。**R4 不宣告結案，不移除跨期與未知事件的 fail-closed。**


## 2026-11-23｜R4-A：九種 EVENT ITEM PARAM 真原版編譯差分（受控純投影）

已新增 `src/original-r4-event-item-param.mjs`：從 B-53 已經直接與凍結 Perl `GetNumber/GetTime` 核對的 17 個編譯後 EVENT 中，建立**9 個有 ITEM PARAM 宣告的事件**之來源運算式清單。來源 ITEM 名稱經標準街 79 ITEM model 解析；不建立每個商品的專用回呼或硬寫固定市場結果。只支援原版 `inc-makeitem.cgi::OutEventData` 生成的 `price`、`pricebase`、`pricehalf`、`popular`、`point`、`plus` 數值變動；除法依凍結 Perl `int` 截斷。

**直接原版 Oracle：** `tests/original-perl/original-r4-event-item-param-probe.pl` 執行凍結原版 `GetItemNumber`、`GetString`、`GetNumber` 與 `OutEventData` 中真正的 ITEM PARAM 程式生成區段，在 Perl 記憶體中執行生成的 `$ITEM[n]` 運算；`.t` 與 `tests/r4-event-item-param.test.mjs` 逐項比對九種 EVENT、79 項商品和六種數值欄位，驗證未審閱事件／不安全來源與輸入拒絕、世界不變。這個 Oracle 使用**人工原始數值的隔離商品 fixture**測運算式，並非已連接 DataRead 與動態 EVENT 的真玩家世界。

**尚未完成：** EVENT 原版 17-key hash 與已存在 EVENT 的實際起訖和同組互斥、所有回呼／RNG、依 DataRead 時點對當期的 ITEM overlay、生效持續及過期、R3 自然販售與 36h 期末合成後的可提交同世界差分。因此 `projectR4EventItemParams` 保留 `committable:false`，不授權外部正式時間命令、不把來源未證實的 EVENT 當空事件。R4-A 和 R4 整體都**不宣告退出**。

## 2026-11-23｜R4 七種宣告式 EVENT 的單事件連續來源差分（受控，不可提交）

新增 src/original-r4-declarative-event-cycle.mjs，直接由凍結 Standard Street DSL、B-53 真編譯後的 17 EVENT、前述九種 ITEM PARAM 來源運算子，審閱七種沒有自訂回呼的事件：boom-posyon、tate-sale、yoroi-sale、tue-sale、plusdown-yakusou、plusup-misuriru、plusup-oriharukon。一致實作：每個時間片開頭 DataRead 只讀取先前已存在的 EVENT；END 階段以嚴格小於判定到期，然後才評估下一次 START gate 與兩筆 duration RNG；當片新開始的事件不會倒灌影響當片的 ITEM 欄位。到期發生於時間片內時，該片開頭的 ITEM overlay 仍照原版適用。

新增 tests/original-perl/original-r4-declarative-event-cycle-probe.pl 和 .t，直接在 Perl 記憶體中執行凍結 inc-makeitem.cgi::OutEventData 的 ITEM PARAM 生成片段與凍結 inc-turn.cgi 的完整 EVENT END/START 原文（單一 EVENT 鍵，故沒有假造 17-key hash 遍歷順序）。Node tests/r4-declarative-event-cycle.test.mjs 比較七類事件各四種到期情境、全部 79 ITEM 數值欄位、隨機數消耗、日誌，以及從開始跨多個連續 3600 秒時間片直到實際到期後的 DataRead 與再觸發 gate。

仍保留嚴格界線：committable:false，一次只允許單一來源事件；不是同一個玩家 WorldState 的自然販售、PLUS、EVENT 17-key hash 與全局 RNG、36h 結算、HTTP/CAS、存檔或重啟。rebel、guildbattle 的 callback、已存在的其他 durable EVENT 同時作用及所有同組互斥均未授權。本驗證提升七種 EVENT 的局部可信度，不能宣告 R4 完成。同輪同步修復 tests/local-original-ui-layout.test.mjs 一個原先未跳脫左括號的無效 regex，使獨立 UI 佈局測試可被 Node 解析。

## 2026-11-23｜R4 17-key Perl hash × 七種同時存續 EVENT 的來源差分（仍不可提交）

新增 `src/original-r4-multi-event-order-fixture.mjs`、`tests/original-perl/original-r4-multi-event-order-probe.pl`、`tests/original-perl/original-r4-multi-event-order.t` 和 `tests/r4-multi-event-order.test.mjs`。原版 Oracle 直接執行凍結 `inc-makeitem.cgi::OutEventData` 生成的 ITEM PARAM 與 EVENT hash 初始化 Perl 原文，然後在同一 Perl 行程內以真正的 `keys(%EVENT)`、`keys(%DTevent)` 順序執行凍結 `inc-turn.cgi` END/START 區段；沒有把宣告順序偽裝成 Perl 遍歷順序。

完整 17 個編譯後 EVENT 鍵都存在於來源 hash。七種無自訂回呼的 EVENT 可以同時啟動及存續；其餘正機率 EVENT 只在明示外供 RNG 令 gate 失敗的受控 fixture 下執行，原版零機率特殊事件的當片無持續時間 group 也會保留。任何尚未支援的其他事件實際啟動仍嚴格拒絕。針對每片，直接比較所有 79 ITEM 的 DataRead 前次 EVENT overlay、既存 EVENT 過期、實際開始與結束日誌、下一次事件存續時間、原版 rand(range) 呼叫次序和精確樣本數。不同 Perl 行程各自取得鍵序，不假設 hash seed 固定；包括同時開始、下一片七事件生效、人工來源時間跳躍後部分到期／重觸發、下一片重新載入 overlay 四個情境。時鐘跳躍僅為來源隔離探針，**不是**跨 36 小時可提交遊戲時間轉換。

原版對照於提交 `d98e17ff34adea0114e237d9e139c598db2fdb76` 同 SHA 兩條 Actions 皆成功（Node 1043/1043；Perl 1995/1995、59 個檔案）。本路徑仍明示 `committable:false`，必須由測試呼叫端提供在同一個 Perl 行程實際觀察到的 17 鍵及當片既存事件鍵序；**不是** JS 自行再現原版 hash 遍歷或完整 RNG 產生器。尚缺其他十個 EVENT 的真正回呼／共同全域隨機序列、未知多事件共存的正式 WorldState 存檔、自然販售／PLUS／SortDT 與 36h 結算共用可提交時間核心、HTTP／CAS／重啟原版差分。**R4 仍不可宣告完成。**

## 2026-11-23｜R4 七宣告事件＋兩真實支援 STARTFUNC 共用 17-key 閘門來源差分

在既有 modern/src/original-r4-multi-event-order-fixture.mjs 上加入可選 B-57 reviewedSupportCallbacks，讓已驗證的 getmoney、getpop 和七種宣告型持續 ITEM PARAM EVENT 共用一份真正 Perl keys(%EVENT) 17 鍵遍歷及交錯 RNG 樣本。未提供 B-57 review 時，既有多事件 fixture 預設保持不變。兩支 STARTFUNC 回傳 0，因此抽中 gate 時不佔用 group、不寫入 DTevent，只會依各自 rand(1000) 的命中結果改變受控單店的資金／人氣及實際回呼 log。

新增 modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl，直接 source-eval 凍結 inc-makeitem.cgi 的原版 EVENT hash 初始化、inc-turn.cgi 的 END／START 完整區段；依原版 GetLocalFunction 命名，在暫存測試資料夾將凍結 Standard Street getmoney／getpop STARTFUNC 原文編成 event-s 內的 Perl 檔，讓原版 inc-turn 真的 require、呼叫 event::_local_start、undef callback、清理 INC。僅格式化相依的 event::GetMoneyString 沿用 B-57 既有的數值顯示 stub，並非原版 GUI 格式化引擎。

同一條受控 RNG 串流交錯包含原版 rand(100000) gate、兩個來源 rand(1000) 回呼、原版 rand(timespan) 與 rand(plustime) 活動時間；每個 Oracle Perl 行程直接取得當行程真實 EVENT 和既存 DTevent 的 hash 遍歷順序，不將 DSL 順序假裝成原版 hash。新 modern/tests/r4-mixed-support-gate.test.mjs 和 original-r4-mixed-support-gate.t 比對七個同時存續 EVENT、兩回呼成功與各自未命中、時間片到期及重新觸發、資金上限 999999999、人氣上限 10000、全部 79 ITEM DataRead 欄位、全部商店欄位、日誌次序及每次 RNG 呼叫範圍和數量；缺失來源順序、shop、事件狀態與 RNG 都 fail-closed。

CI 功能驗證提交 26063432e10f289b255274bfbc0aa2188e36c557：Push run 45067706804 與 PR run 45067712054 都成功。Node 1046／1046；Perl 2007／2007、60 個 .t。此路徑仍為 committable:false 的內部受控原版差分。manbiki、goutou、loto、happy、rebel、guildbattle 等混合回呼仍未完整接通；其他正機率事件在此受控樣本下明確 gate miss。人工跳躍時鐘不等於連續可提交遊戲時間，亦不包含完整 36 小時結算、真實世界存檔和重啟。R4 仍未完成。

## 2026-11-23｜R4 七宣告 EVENT＋四個原版 STARTFUNC（含偷竊／搶劫）的同序差分

延伸 modern/src/original-r4-multi-event-order-fixture.mjs 的選配來源審閱參數 reviewedInstantCallbacks，將 B-55 真實 manbiki／goutou 回呼與既有七種持續 ITEM PARAM EVENT、B-57 getmoney／getpop 回呼放入同一個來源 17-key EVENT 啟動閘門。抽中事件 gate 後，偷竊／搶劫各消耗一次 rand(1000) 決定商店是否被選中；若 manbiki 命中且看門機器人仍在，原版額外消耗一次 rand(1000) 決定防護或機器人毀損。兩個 STARTFUNC 都回傳 0，不佔用 EVENT group，也不建立 DTevent。每次回呼後剩餘 shop item、rank、資金、下一段 RNG 及回呼日誌均保持同來源一致；缺少來源審閱、精確序列或超出單店限制的情況持續 fail-closed。

延伸 modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl：使用凍結 inc-makeitem.cgi 的完整 17-event Perl hash 初始化與凍結 inc-turn.cgi 的原文 END／START，同一個暫存測試 EVENT 資料夾加入凍結 Standard Street DSL 的 manbiki／goutou STARTFUNC 原始正文（只依原編譯器 GetFuncItemNo 規則展開看門機器人 ITEMNO 64），讓真正 Perl require、event::_local_start、undef、INC 清理執行回呼。Oracle 額外載入原版 ITEM#64 名稱「看門機器人」以完整驗證來源訊息；僅 GetMoneyString 的數字顯示部分沿用前一工作包已明示的 formatter stub。保留真 keys(%EVENT) 和 keys(%DTevent) 的逐行程觀察，未硬編執行順序。所有正機率未支援 EVENT 仍由明確受控 RNG 令 gate miss。

新增 modern/tests/r4-mixed-instant-gate.test.mjs 和 modern/tests/original-perl/original-r4-mixed-instant-gate.t。六個來源場景包括七種持續事件與四個真回呼同時啟動、無機器人時商品遭偷／搶、機器人防護與破壞、下一時間片的 ITEM overlay、以及獨立強制 manbiki 防護與毀損兩條分支（各驗證正好兩次 rand(1000)）。Node 逐項比對 Perl 實際商店庫存、金錢、人氣、79 ITEM 效果、活動狀態、事件日誌及每次 rand(range) 呼叫範圍／次數；另外在多個 Perl 行程中重新測不同原版 hash 順序。

來源驗收提交 55dd45990ee4b4f15073c222e043a628055e4415：Push Actions 45070082991、Pull Request Actions 45070092650 均 completed/success，Node 1049／1049，Perl 2022／2022（61 個 .t）。邊界：仍是 committable:false 的原版純差分，不是正式 WorldState／CAS 存檔／HTTP 引擎；尚未接通 loto、happy、rebel、guildbattle 等其他回呼的完整混合行為，亦未涵蓋自然販售、PLUS、SortDT、36h 期末結算、真正跨期和重啟。受控 RNG 樣本／從同一 Perl 行程觀察到的 hash 順序不等於 JS 已能自行重現原版 RNG／hash。R4 仍未結案。

## 2026-11-23｜R4 原版 17-key EVENT × loto 混合 RNG（受控，不可提交）

- 將 B-58 已審閱 `loto` STARTFUNC 與原 R4 七種持續事件、`getmoney`／`getpop`、`manbiki`／`goutou` 接入同一 17-key Perl 同行程排列 fixture。閘門先用 `rand(100000)`，命中後依來源張數逐張消耗 `rand(6096454)`，插入原本單一 RNG 序列；回呼回傳 0，不保留持續事件或群組鎖，`WriteLog` 與其他事件日誌依真正執行順序合併。
- 真凍結 DSL 的 `loto` 本體由 `original-r4-mixed-support-gate-probe.pl` 生成並在凍結 `inc-turn.cgi` EVENT END／START 原文中執行，Node `r4-mixed-loto-gate.test.mjs` 對同一 Perl 行程的 17-key hash、商店庫存／金錢／機器人／七種 EVENT、日誌及 RNG 範圍序列逐項差分。另測五票混合獎項、零票公告且不抽獎、普通獎金、50 張最大上限及未審閱狀態原子拒絕。單筆 rand 的百萬分位樣本不取代 B-58 整數各獎等邊界 Oracle。
- 僅修改 `modern/`；仍為 `committable:false` 純投影，原版 Perl/DSL/Core、正式 WorldState、HTTP/CAS、存檔和 36h 期末均未改。尚缺其餘未整合事件回呼與完整 R4 時序，不宣告 R4 完成。

## 2026-11-23｜R4 真 Perl 17-key EVENT × happy START／END／NOWFUNC（受控不可提交）

- 既有 B-60 `happy`（感謝祭）原版回呼審閱器整合到 R4 共用 17-key 閘門的選用審閱路徑：開始命中先消耗兩次原版持續時間 `rand(timespan)`／`rand(18000)`，經原版 `keys(%DTevent)` NOWFUNC 階段對同片新開始及延續的感謝祭執行 `rank+=int(rand(int(TIMESPAN/36)))`，最高 10000。到期後在 END 階段刪除，除非同片重新開始，否則不再消耗 NOWFUNC RNG。
- Perl `original-r4-mixed-support-gate-probe.pl` 在既有凍結 `inc-turn.cgi` END／START 原文後接回真正 NOWFUNC 原文，暫存 `event-n/happy.pl` 來自原版 DSL 的真 `_local_` body。以同 Perl 行程新舊 `keys(%DTevent)` 實際排列作明示 fixture，四組情境覆蓋當片開始、下一片持續、到期不執行、到期重新開始，且與七種持續 EVENT、資助／人氣、偷搶機器人、彩券同 RNG／商店／日誌逐項差分。既有 B-60 單事件九案及此前 R4 測試保留。
- `rebel`、`guildbattle` 等尚未整合的 NOWFUNC／ENDFUNC 外部狀態依賴繼續拒絕；`committable:false`，不假裝已復原原版 Perl seed/hash，未授權 WorldState/CAS、永久日誌、36h 決算、多片真經營。R4 尚未退出。

## 2026-11-23｜R4 真 Perl 17-key EVENT × 鐵礦脈／劍需求＋感謝祭全混合（仍不可提交）

- 把已審閱 B-59 `plusup-tetu`（鐵塊 #5 `plus=720`）與 B-61 `ken-sale`（#40～44 `popular/2`）接入原版 17-key Perl `keys(%EVENT)` 同行程差分，在 7 個宣告型 durable＋happy 同時存在時達成 10 個 durable EVENT；仍混合 getmoney/getpop、manbiki/goutou、loto 即時回呼。兩者僅當 DataRead 已有事件時才覆寫 ITEM，不把 START 當片的新事件倒灌當片商品。END 嚴格到期、START 兩筆持續時間 rand、日誌與原版 hash／RNG 順序逐欄比較。
- Perl 仍使用凍結原文 `inc-turn.cgi` END／START／NOWFUNC，擷取真編譯器產生的 ITEM PARAM，新增四個多事件時間片（十種同時存在、下片 DataRead、生存期後結束、結束後重啟）；Node `r4-mixed-iron-sword-gate.test.mjs` 對 79 ITEM、商店、事件與 RNG 差分及來源 drift fail-closed。它**不是**實際可提交世界：來源外的 rebel／guildbattle、完整自然販售／PLUS／SortDT 跨期、Perl hash seed／持久化尚需整合，R4 不退出。

## 2026-11-23｜R4 rebel DSL 的 guildbattle 真 ENDFUNC（來源局部；不可提交）

- 新增純來源 `original-r4-guildbattle-end.mjs`，審閱凍結 `custom/inc-rebel-data.cgi` 的 `guildbattle`：START=0 且不保存事件；若已有活動在片段 END 嚴格到期，真正呼叫 `ReadGuild`／`ReadGuildData`、依各公會 money 降序取唯一最高者，`SetTownData('dominion',guildId)` 並將勝利訊息依原版順序寫入事件日誌。這是「外部已設置活動」受控模擬；不把原版不確定的同額公會排序硬猜為確定順序，該情形拒絕。
- Perl `original-r4-guildbattle-end-probe.pl` 直接使用凍結 `inc-turn.cgi` END／START 區段與從原 DSL 無改動擷取的 `_local_` callback 正文，僅對會讀寫外部公會檔案的三個 IO 函式做明確 stub；五個來源情境由 Node 逐欄驗證到期／未到期、輸出領地、log、讀寫次數及 zero-start `rand(100000)`。它**不**等於已執行真公會檔案、真 `rebel` NOWFUNC、17-key 全局外部活動、期末或 WorldState/CAS，`committable:false`；R4 未結案。

## 2026-11-23｜R4 原版 rebel NOWFUNC 82 行來源差分（單事件／不可提交）

- 純投影 `src/original-r4-rebel-now.mjs` 針對凍結 `custom/inc-rebel-data.cgi` 82 行 NOWFUNC 正文做嚴格指紋漂移核對，受控輸入含明示城鎮／RIOT／ARMY／店鋪及同一個已種入的 rebel EVENT。真 Perl `tests/original-perl/original-r4-rebel-now-probe.pl` 自 DSL 擷取原版 callback，由 `inc-turn.cgi` 原文 END→START→NOWFUNC 執行；ReadArmy、WriteArmy、GetMoneyString 為明確隔離的外部 IO 替身。
- 直接比較鎮壓、武裝扣減、叛軍增援、護衛軍敗亡、店鋪或盜匪成為領主、資金分配與 `rand(100)>75` 嚴格邊界 75.0000／75.0001（必須比較 Perl `rand` 浮點，不能先整數化）及每次亂數範圍。Perl 原版未加花括號的 `$main::BAL_NAME...` 插值會將部分中文字併入變數名，測試以來源實際日誌為準而非預期應有語句。Perl 探針複製個別案例的 `@DT` 輸出，避免多案例共用 Perl 全域陣列造成假差分。
- 這是外部已有 rebel 事件的**來源局部**範圍；完整 `period.cgi::RebelRobin` 生成事件、真軍隊檔案／Guild 狀態、17 鍵混合回呼、36h 期末、可提交 WorldState 和 HTTP 存檔重啟尚未完成，堅守 `committable:false` 與未審閱拒絕；R4 不結案。

## 2026-11-23｜R4 rebel 期末 RebelRobin → 同片 EVENT NOW 的真 Perl 來源序列

- `original-r4-rebel-period-trigger.mjs` 以完整凍結 `period.cgi::RebelRobin` 正文與原本「已有 rebel 即延長三日，否則呼叫 RebelRobin」片段來源審閱，Node ↔ `original-r4-rebel-period-trigger-probe.pl` 差分 7 組來源時序：無領主、已有叛亂、城市平穩、城市不安、30% 侵入抽樣 29.9999／30.0000 邊界，以及原版不檢查到期日而延長已存在叛亂的特殊行為。嚴格保留原版 `rand(2500)`、`rand(5000000)`、`rand(100)` 原浮點門檻，非 JS 預先整數化的概率。
- `original-r4-rebel-period-to-now.mjs` 接合這段期末狀態與已驗證的 `rebel` NOWFUNC，並使用來源 `inc-turn.cgi` 的前置 SortDT／period require／END／START／NOW 的階段順序；`original-r4-rebel-period-now-probe.pl` 同一 Perl 行程真正執行凍結 period 片段和 EVENT NOW 回呼，再與 Node 逐欄比較城市、店鋪、RIOT／ARMY、持續狀態、日誌、rand(range) 序列。8 個來源情境含新叛亂當片軍力扣減、增援、既有事件延長後被 NOWFUNC 立刻鎮壓、零機率 START 仍消耗一次 rand(100000)。
- 最終純投影一律 `committable:false`；只完成**一個原始 PERIOD 片段、單一 rebel EVENT**的可控重播，不包含真正 36h `inc-period.cgi` 所有階段、完整 17-key 混合、系統 RNG／Perl hash seed、外部軍隊／公會檔案、WorldState／CAS／HTTP 或保存重啟。提交 `38d5730dfd96d0995136174e8cb48f013818143e` 雙 CI 成功，Node 1070/1070、Perl 2098/2098（65 檔），但 **R4 仍不得退出**；退出項目見 `r4-exit-audit.md`。

## 2026-11-23｜R4 真 17-key 混合 guildbattle END／rebel NOW（來源受控、不可提交）

已由原版 frozen inc-turn.cgi 的同一 END／START／NOW 區段，直接 require 凍結 rebel DSL 中 guildbattle 的 END callback 和 rebel 的 NOW callback；可與七種宣告式＋happy＋鐵礦脈＋劍需求十種持續 EVENT、五種即時 STARTFUNC 共享真 Perl keys(%EVENT) 和 keys(%DTevent) 的 rand(range)。四個公會情境及五個叛軍情境，比對 79 ITEM、店鋪、RIOT／ARMY、城市／領地、公會資金、日誌與每一筆 RNG。

rebel NOWFUNC 可能在回呼內 delete 自己的 DTevent；驗證器因此在原版 GetPath(event-n) 派送時記錄**實際執行中的 NOW 鍵順序**，不使用回呼後的剩餘鍵偽裝遍歷。已審閱公會事件沒有活動時不必強制注入公會快照；有活動卻缺快照則嚴格拒絕。仍僅為控制型 fixture，外部軍隊／公會 IO stub、任意 Perl RNG seed、36h 全期末及 WorldState／CAS 都未完成；committable:false 不變。

最後來源驗收 SHA 37fc981113c1df3ce1195279589dec9d47cf8098，Push #45099952281、PR #45099957238 success，Node 1076／1076、Perl 2114／2114（65 .t）。

## 2026-11-23｜R4 真 DragonBalance 檔案副作用與兩個相連期末前綴（已差分，不可提交）

- 新增 src/original-r4-dragon-balance.mjs：嚴格核對 frozen period.cgi 的 DragonBalance 原程式與原版每店龍賽收入／支出片段，保留 drapay 檔案讀取、逐列 chop、店鋪 id2idx、累計 dragon、unlink。9 組 source-only 原版 Perl 探針 original-r4-dragon-balance-probe.pl 使用真正 File::Temp 暫存檔案執行未改動的 DragonBalance，檢查多店正負收支、重複 ID、無檔、空檔、CRLF、未知店、最後一行缺換行的 chop 等價結果；Node test 對收支與日誌逐欄核對，外部顯示 formatter 僅明示 stub。沒有把未審閱任意記錄當作有效資料。
- 新增 B-50 同店同城市來源 opt-in：original-period-solo-chain.mjs 只在明確 includeReviewedDragon=true 的來源審閱下，依原版 SortDT → DragonBalance 真讀取檔案 → UpdateResetBefore 頒獎 → 每店 dragon 轉現金與 saletoday／paytoday → 歷史帳務／維持費 → 後排序／城市結算原序，保留舊 B-50 零 Dragon 的拒絕與 ABI。original-r4-period-dragon-chain-probe.pl 直接執行 frozen period.cgi 的整段備份前期末前綴兩次，帶入真暫存檔第一期 +500、第二期 -1000，期間 dragon／drmoney 不重置，第二期扣款紀錄為負龍賽 500 加維持費 17 即 517。Node test r4-period-dragon-same-world-chain.test.mjs 同兩期逐欄比較整張店鋪、城市、人口、排序點數與獎品；禁止非法擴權、未知出入、意外來源欄位。純投影仍 nonCommittable:true。
- Push #45101339762 與 PR #45101346093 同 SHA 352ba4878d6ad77691a41a86b3ea801da8077b1b 已完成 success，Node 1082/1082、Perl 2145/2145（67 .t）。上述驗收**僅是兩期完整原版備份前綴的受控單商店／單城市子範圍**，正式 36h、Guild、老店、爵位、真 file/session/WorldState/CAS/HTTP 仍未退出。

## 2026-11-23｜R4 同店同城市期末 DragonBalance／Guild／爵位／技術遺忘四段共同來源差分

- `modern/src/original-r4-period-dignity-decay.mjs` 審閱原版 `period.cgi` 在自然 EXP 衰減之後、期後 `SortDT` 之前的 `dignity && rand(100)<25`，保留 `int(dignity/12)+1` 扣減量及零爵位不抽樣。新凍結 Perl 同兩期期末檢查第一期 26→23，第二期因樣本未中維持 23；消耗 RNG 仍和獎品、城市及龍賽原順序一致。
- `modern/src/original-r4-guild-period-fee.mjs` 在原版 `saleyesterday` 建立後計算 `int(saleyesterday*feerate/1000)`，同步審閱攻擊 `int(atk*24/25)` 與防禦 `min(1000,int(def*9/10)+int(fee/800))`；新 `original-r4-guild-period-fee-probe.pl` 真執行原文並記錄 `EditGuildMoney` 外部呼叫，而**不假裝寫入 guild money 檔**。同世界兩期測到來源會費 525→0，atk 1000→960→921、def 500→450→405。
- `modern/src/original-r4-post-period-tech-loss.mjs` 審閱原版 Standard Street DSL `UpdateResetAfter`：**結算前綴的第二次 SortDT 和城市更新之後**，依期末衰減後 EXP 合計是否大於 4000，對仍持有的 #18 鐵匠的技術、#19 魔法的知識、#38 解體屋之魂、#24 行家的精隨 **依原版定序逐項**擲 `rand(14000)`，命中則減庫存並記錄兩筆 `WriteLog`。真 Perl `original-r4-period-high-exp-tech-probe.pl` 於同一個 shop/city/dragon/guild/dignity 世界連續兩期執行未改動期末前綴：第一期技術 #18／#24 消失，第二期 #19 消失、#38 保留；因上一期庫存改變，第二期技術 RNG 從 4 次降為 2 次。原版探針只以訊息欄位明確辨識技術遺忘日誌，不把早於此階段的頒獎日誌錯納入。
- `modern/tests/r4-period-high-exp-tech-same-world-chain.test.mjs` 和 `modern/tests/original-perl/original-r4-period-high-exp-tech.t` 完整比對兩期整張商店、城市／人口、guild 狀態與明示外部財務呼叫、true drapay 檔案消耗、技術庫存與 WriteLog、來源抽樣範圍、輸入不可變和來源 drift 拒絕。原本 B-50 未選 opt-in 的高 EXP／Dragon／Guild／dignity 仍嚴格拒絕。新增投影結果皆 `nonCommittable:true`，**尚非 36 小時可提交 WorldState**。
- 程式驗收 SHA `09a11a2ac73de26a8c76d777d768a4b79028211d` 已通過同 SHA Push #45122232062 與 PR #45122236936，Node 1094／1094、Perl 2210／2210（71 檔）。原始 Core／Perl／DSL 未改；完整 R4 仍未達退出條件，詳見 [R4 清冊](r4-exit-audit.md)。

## 2026-11-23｜R4 正式 GameCore／StreetModule v2 期別轉場前置來源閘門（尚未授權結算）

原本 B-51 的 `akimono.memory-world.v2` `period` 只是一個由街道驗證來源語義的 JSON 封套；B-43 磁碟保存器會拒絕偽造已結算城市，但 GameCore 在正式指令導向的記憶體 CAS 前，並沒有專門要求街道解釋來源時鐘與 `period` 的轉場。這與可提交完整 R4 期末仍有實際差距。

現在新增 `src/original-r4-world-transition-gate.mjs`，只接受由凍結 `inc-turn.cgi` + `_config.cgi` 核對的 **36h、+3h** 期界時鐘，以及來源初始化 `B-51` 或現有單一受審核 `B-59/B-60/B-61` 活動封套。它對未經審閱的多事件、任意改人口／城市、`settledCount>0`、時鐘倒退、跨越期末，全部在指令記憶體 CAS 前拒絕。**這個 source gate 沒有任何可授權真期末的分支，`committable:false`。**

`src/game-core-contract.mjs` 在 v2 正式 `applyGameCommand` 得到 StreetModule 結果後、交予記憶體 CAS 之前，若時鐘或期別改動，要求 `StreetModule.reviewPeriodTransition({before,after,command})===true`。缺審閱器、審閱拒絕、或傳回 `nonCommittable:true`／`committable:false` 投影時，回傳 `SOURCE_BOUNDARY_REJECTED` 並保留原版 revision／世界狀態。`src/standard-street-module.mjs` 實際接上已核對的 R4 來源 gate。這是**街道特定邏輯經通用 GameCore 延後驗證**，而非在 GameCore 假造 Standard Street 期末公式；舊 v1 世界的泛用合約不因此變更。

`tests/r4-source-world-transition-cas-guard.test.mjs` 包含同一期內的許可推進、第一個 36h 邊界拒絕、偽造 settledCount／城市／EVENT／錯誤來源、缺審閱器與明示非提交的投影、經 `executeMemoryCommand` CAS 拒絕，以及**兩份已存在的 B-43 磁碟存檔世代**在錯誤期末及偽造儲存時均未被替換。這不取代實際存檔器驗證：直接呼叫測試型 `createMemoryWorldAdapter.compareAndSwap` 或繞過正式指令的自訂程式，不在此來源閘門的保護承諾內；正向可提交完整結算仍須來源與 durable 狀態整合。最初程式 SHA `eeaede783ebfe20745273181280d7f955debe33a` 的同 HEAD Push #45128104169、PR #45128111810 已 success，Node 1101/1101、Perl 2210/2210；後續兩份既有存檔世代的強化測試依最終 HEAD CI 另行驗證。

## 2026-11-23｜來源審閱版 CAS 真本機 runtime＋過期店關店觸發差分（未開放期末）

- `modern/src/game-core-contract.mjs` 新增 `createSourceReviewedMemoryWorldAdapter({initialWorld,streetModule})`，要求 v2 Standard Street 與現有來源 `StreetModule.reviewPeriodTransition` 一致，初始化／存檔載入時先作來源 period 預審；一般 `createMemoryWorldAdapter` 增加**明示選用**的 period reviewer，讓直接 `compareAndSwap`（不只 `applyGameCommand`）在改寫記憶體世界之前重新審查。通用 v1 adapter 與純測試介面不改舊行為。
- `modern/scripts/dev-local.mjs` 真本機 HTTP 在 `/api/initialize` 與 `/api/load` 改建來源審閱版 adapter，保留 B-43 磁碟來源 city／EVENT 與雙世代一致性。真 HTTP `modern/tests/r4-source-cas-http-save-restart.test.mjs` 在接近來源期界 `1025980` 秒建立世界、開店、來源 PLUS、真 #10 BUY，嘗試 60 秒跨過來源 `1026000` 邊界被拒；兩代 save 後殺 Node、重啟 load，快轉仍拒絕，原世界／revision／存檔代數不變。這仍**不是可成功跨期的 HTTP E2E**。
- 新 Node `modern/tests/r4-source-world-transition-cas-guard.test.mjs` 擴增直接 CAS：同一期 source-v2 經 reviewer 可進、跨界／偽造 settledCount／城市／未知事件／錯誤審閱器均原子拒絕，已載入兩個實際 B-43 存檔世代仍可重啟。新增 `modern/src/original-r4-world-transition-gate.mjs` 的**零時間 EVENT**驗證：即使是原版認得的 `plusup-tetu`、`happy`、`ken-sale`，沒有經過非零時間片也不能憑空添加或修改到期時間。這**不等於**已重現原版 17-key hash seed 和全事件持久化。
- 新 `modern/src/original-r4-period-shop-expiry.mjs`、原版 `modern/tests/original-perl/original-r4-period-shop-expiry-probe.pl`／`.t` 與 Node `modern/tests/r4-source-period-shop-expiry.test.mjs`：從 frozen `period.cgi` **擷取原文後用 Perl 原樣執行**，包含 `NOW_TIME-foundation>43200`、`blocklogin ne 'stop'`、`lastlogin+EXPIRE_TIME<NOW_TIME` 與 `_config.cgi::EXPIRE_TIME=604800`。九案核對 12h／7d 恰好與逾期 1 秒、保護標記、原始 `CloseShop(id,l('経営者不在'))` 及原版 `PushLog` 文字。只記錄副作用呼叫，**沒有假裝 `CloseShop` 會修改哪些城市／公會／店鋪檔案，也沒有將關店功能開放給玩家**；所有結果 `committable:false`。
- 本輪程式來源驗收 SHA `78a590676f921c1c83f0ef3372caa90ae41e818b`，同 SHA Push #45200662255 與 PR #45200680932 completed/success，Node **1110/1110**、Perl **2225/2225**（72 檔），僅改 `modern/`。真 WorldState settled-period 正向期末、軍隊／公會檔案 IO、CloseShop 交易、備份／Session 仍不允許 commit。

## 2026-11-24｜凍結期末備份尾段實際磁碟差分＋同世界兩期接入（仍不可提交）

- 先確認現存 HEAD `616c888ec4bfa1c45fdd242748e659298207455d` 的 Push #45210259672 與 PR #45210272718 均成功，Node **1121/1121**，Perl **2282/2282**（75 .t）。此版已將真 `write.cgi::CloseShop` 的 status／money／rank 修改、32 欄封存字串、暫存登入 Session 真 unlink 及後續 `SortDT` 停業商店移除接入 B-50 兩期期末；原版 `SetUserData`／`WriteErrorLog` 外部 IO 仍只記錄呼叫。
- 新 `src/original-r4-period-backup-tail.mjs` 對 `period.cgi` 的 `#データバックアップ` 至 `MakeGuildFile` 整段原版來源依序審閱，嚴格核對 `_config.cgi` 三代備份、`log0/log1/log2/guildbal/play` 五檔與 `EXPIRE_TIME=604800`。 `tests/original-perl/original-r4-period-backup-tail-probe.pl` 在 File::Temp 中**真正執行原版 Perl 尾段**：兩期輪替 backup1／2／3、讀寫真 UTF-8 檔案、用 `stat($_)[9] < NOW_TIME-EXPIRE_TIME` 刪除過期 .cgi；檢查臨界時間與非 `.cgi` 名稱保留，`MakeGuildFile` 只記錄外部呼叫。JS 投影仍 `committable:false`、不修改檔案。
- `src/original-period-solo-chain.mjs` 新增明示 `includeReviewedPeriodBackup` opt-in，僅在通過原版 reviewer 時將來源備份／Session 尾段放在 `UpdateResetAfter` 之後，對 `nowSeconds` 與來源期末要求一致。新 `original-r4-period-full-tail-close-probe.pl` 直接將兩期期末真原版前綴 + 原版備份尾段接在**同一 Perl 行程**執行：第二期原版過期店關閉且 `SortDT` 排除後，仍依原版備份五檔、輪替兩期歷史、清理 Session 並呼叫 `MakeGuildFile`。Node `r4-period-full-tail-close-chain.test.mjs` 比對整張店鋪／城市、公會外部呼叫、真關店及每個備份檔內容與 Session 結果。
- 這些 source probes 的真 I/O **只存在 CI 隔離目錄**。現有正式 GameCore v2 仍阻止完整 36 小時跨期；原版帳本生成、真 Session／DataWrite／CAS 原子性、異常中斷恢復、多店與 17-key EVENT 正式世界仍未實作，不得認定已完成 R4。
