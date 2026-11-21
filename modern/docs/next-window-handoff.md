# 《商人物語》標準街 Node.js 移植｜新對話接力交接（B-54 真本機重啟後來源亂數重播，跨期仍未完成）

> **用途**：使用者換聊天視窗後，新的助手只需先讀這份精簡可核對的 GitHub 文件，再依目前遠端 HEAD 核對後續工作。**不要**從舊聊天記憶推論最新狀態，也不要把文件內的 CI 數字視為未來 HEAD 的保證。


> **2026-11-21 使用者最新驗收節奏：** 不再每完成一個 B 階段就請使用者確認。直接以「在同一個繁體中文瀏覽器介面從零開店 → 真進貨 → 合法上架 → 自然販售／可連續經營 → 真跨36小時結算 → 真磁碟存檔 → 關閉服務重開載入 → 繼續營業」作為**一次完整的集中人工驗收**；開發中仍須每次提交維持來源 Perl／Node／HTTP E2E、固定 Core／DSL 稽核及最終同 SHA Push／PR CI，不能因延後人工確認而省略自動測試，也不能假稱目前已完整運作。

## 2026-11-21｜B-54 本機真進貨／自然販售快轉：同世界版本重啟後**無法重抽亂數**

**本輪是實際本機玩家 HTTP 快轉執行層修正，不是新的孤立算式測試**：先前 `dev-local.mjs` 的真來源 B-37（全59 PLUS）與 B-41（市場#10實際買貨、上架、自然販售）每次都用 `crypto.randomInt()` 即時產生新樣本。若玩家在來源世界 `revision=5` 存盤，執行30分鐘自然販售後尚未保存便結束 Node，再從 B-43 存盤重啟並重新執行同版同命令，之前可能拿到**不同**市場、商品或現金結果。B-54 新增 `local-source-command-draws.mjs`，將 `worldId + revision + nowSeconds + command kind + params` 經 SHA-256 domain separated、48-bit rejection sampling 穩定映射為原本 B-37／B-41 接受的百萬分位亂數前綴；仍用真來源已審核的公式，且成功 CAS 會讓下一個 command revision 改變。來源探查同一亂數串流的消耗前綴不會改變輸出；無效 expectedRevision 或未提交命令不能藉重試重新抽獎。**這是明確的本機遷移持久化政策，不是原版 Perl process-rand 的精確種子或事件引擎，也沒有防預測的私有種子**。

[B-43 原有真 HTTP Node／磁碟重啟 E2E](../tests/b43-durable-world-save.test.mjs) 新增 B-54 場景：不用既有固定0亂數測資，真的「新建來源 v2 世界→單店→60分鐘59 PLUS供貨→市場#10真買→來源上架→保存revision5→快轉30分鐘並取得整份世界結果→**SIGTERM殺 Node**→再開 Node／載入快轉前的世代→過期 revision 命令拒絕→同一 revision 再快轉30分鐘→**完整商店／市場／城市／時鐘／EVENT未知標記逐欄一致**→儲存結果→再關 Node／第三次重啟載入依然一致」。同時驗證即使客戶端送出 `randomDraws` 雜訊也不會改變伺服器來源抽樣；舊 CI 固定亂數 fixture 仍保留。獨立 Node 測試檢查穩定性、來源指令隔離與無效要求拒絕。詳見 [B-54 真 HTTP 重啟來源亂數一致性、政策差異與限制](b54-restart-stable-source-draws.md)。

**這不等於完整跨期**：B-53 只確認原版17個會編入的 EVENT 定義，原版 hash 遍歷及真事件回呼、商品 FUNCTURN/FUNCSALE、B-50 同店同城整段期末與檔案副作用、WorldState/磁碟一次性36h結算均尚未接到玩家時間片。B-52 的時間片後 `period.eventState=null` 應繼續表示未知，不能因 B-54 重播一致就說原版事件已正確執行。**跨期仍拒絕**；下一步首要開發仍為真正來源 EVENT/商品回呼與 full period CAS，直到使用者能真跨期→存盤重啟→次期繼續賣才要求一次集中人工驗收。main、migration、固定原始 Core/DSL 不改，PR保持 Draft。

## 2026-11-21｜B-53 原版事件定義編譯清單（25 宣告／17 編入／8 排除；事件引擎尚未完成）

B-53 在已確認 B-52「新世界活動 EVENT 真正空表、時間片後未知」的基礎上，直接依**固定原版 Perl `inc-makeitem.cgi` 的 `GetNumber/GetTime` 原式執行**與 `@@EVENT` 來源編排，將 Standard Street ITEM DSL 的23個 EVENT、rebel DSL 的2個 EVENT 全數投射成 source-reviewed 的 `reviewedEventCatalog`：25宣告中8個 `start -1` 在原版編譯時被排除、15個正機率 EVENT 編入、`rebel`／`guildbattle` 兩個 `start 0` **也會編入並在原版 EVENT 起始處通過零機率分支**。原版 `10%` 對應 `startproba=100`，後續 `start -1` 覆蓋前面的 `start 50%`。Node 逐筆與原版 Perl GetNumber/GetTime 真執行的原始事件資料（code、group、start／重複值、持續秒數、回呼宣告）對照，來源漂移拒絕。每個 EVENT 的動態 startfunc/endfunc/func 仍不透明，不執行回呼；`runtimeSupported=false`，瀏覽器只讀顯示25／17與未接通，不建立假事件、也不承認完整跨期。原版 `keys(%EVENT)` 的 Perl hash 遍歷**不是 DSL 宣告順序**，未來不能把清單依宣告順序跑一次當作忠實事件迴圈。詳見 [B-53 原版可編譯 EVENT 清單與限制](b53-compiled-event-manifest.md)。

**下一步不是再補零散活動清單，而是讓真 EVENT 與真商品回呼進入玩家時間片：** 原版 start/expiry/nowfunc 的亂數、群組、價格／人氣、抽獎、盜賊、叛亂／商會戰副作用必須可 source-verified 與可持久化，再與 B-50 的同城同店真原版期末及 B-43 磁碟重啟串成同一筆安全 CAS 跨36小時，禁止以未知事件為空或反覆重試重新抽獎。**跨期仍必須拒絕**，主分支／migration／原始 Core／DSL 不動，PR #1 Draft 不合併，使用者只有完整可玩閉環後一次人工驗收。

## 2026-11-21｜B-52 原版初始 EVENT 空白欄位的真讀寫 + 時間推進後未知狀態

B-52 直接擷取並執行固定原版 `core-inc-admin-func.cgi` 初次建立的 `play.cgi` 記錄、`inc-func.cgi::DataRead` 的 `%DTevent=split(/,/,$DATA[$idx++]);` 與 `write.cgi::DataWrite` 的 `join(",",%DTevent)` 實際陳述式，證實**新世界 EVENT 執行實例初始空白**，並用單一測試事件 `rebel,123456` 來回寫入／讀回證明 wire 格式（**不是**真玩家觸發叛亂）。B-51 v2 世界改為 `period.eventState={}` 明確表示「新世界尚未開始時間片、來源確認零個活動事件」；保留歷史 B-51 v2 `eventState=null` 的存檔相容，拒絕沒有原版事件執行證據的活動事件 key。B-41 的任何真來源自然販售／59 PLUS 時間快轉**尚未運行 EVENT 迴圈**，因此時間一動 `period.eventState` 會改為 `null`「未知」，不能保留 `{}` 偽稱沒有事件；B-43 真磁碟存檔／關閉 Node 重啟及繁中狀態欄會保留／區分這兩個狀態。來源與限制：[B-52 原版 EVENT 初始化、過期回呼未實作警戒](b52-original-event-state-source.md)。

**下一步真正要打通：** B-48/49 真事件起訖只覆蓋一個合成事件，B-52 只證實新世界初始零活動 EVENT，**都不是25個原版事件與動態回呼已移植**。需先將原版事件與商品回呼按 `inc-turn.cgi` 中的先後次序真正處理並持久化（包含來源 hash 事件迭代、機率／群組、效果與亂數消耗）；不能以事件機率低就直接無視，也不能在某次來源事件抽中未支援的回呼時允許玩家不停重試洗掉事件。再將 B-50 的真來源期末階段接成同一個 v2 WorldState CAS，補原版期末後副作用與可恢復存檔，做真正跨36小時 HTTP → B-43 落盤重開 → 次期續買續售。**目前維持跨期拒絕**，Draft PR #1 不合併。使用者只在完整可玩閉環後一次集中驗收。

## 2026-11-21｜B-51：原版城市／期別初始資料進入真正玩家 WorldState + 磁碟保存（不假決算）

**本輪新增真正瀏覽器可觀察、可存檔的世界資料**，不是再新增一份孤立算式：GameCore `akimono.memory-world.v2` 明確新增受 StreetModule 及本機存檔來源檢查的 `period` JSON 信封；以固定原版 `inc-admin-func.cgi`／`@STATEnamelist`、原版 `period.cgi` 領地欄位、來源36h +3h 時鐘，建立唯一可接受的初始 `town={leader:0,money:0,in:0,out:0,develop:5001,devem:0,safety:5001,safem:0,army:0,robina:2000,robinb:0}`、`dtPeople=500000`、`settledCount=0`、`eventState=null`；目前仍**未來源驗證真 EVENT、也沒有發生過任何結算**。新建世界的真商品進貨、上架、自然販售 CAS 會保留此同一個 `period`，B-43 本機雙世代磁碟保存／結束 Node／重啟載入也一併還原城市。繁中頁面會看到初始城市人口、發展、治安與已結算0期；原版 `v1` 舊存檔仍能讀、存、營業，不默默猜城市將舊存檔升級。讀存對偽造下一期、偽造 EVENT 或修改初始城市值 fail-closed。完整內容：[B-51 城市／期別初始契約與玩家操作](b51-original-period-world-v2.md)。

**B-51 尚未解除跨36小時拒絕。** B-50 只有原版同一商店／城市連續兩個期末**純來源驗證**，未提交真玩家世界。來源商品 FUNCTURN/FUNCSALE、多 EVENT callback、原版 SortDT 與真全部期末、PLUS、檔案效果仍需在合法 v2 WorldState 的 source-authorized CAS 轉場按順序執行；之後再做 HTTP 真跨期→存盤→重啟→繼續真買賣的驗收。嚴禁把來源 `period.eventState=null` 偷改成 `{}` 以假設事件不存在。不要因 B-51 顯示城市資料便宣布完整可玩、完成 Notion 任務或合併 Draft PR；只在使用者要求的完整閉環後一次集中人工驗收。

## 2026-11-21｜B-50：同一份原版商店與城市連續兩期來源結算（尚不可提交）

**本輪比以前獨立的 B-44～B-49 更接近真期末：** 直接從 SHA 固定 `period.cgi` 擷取並執行**整段原版期末前綴**（包含冠軍發獎、商店帳務、期後排序、城市人口／治安、標準街 `UpdateResetBefore/UpdateResetAfter`，止於備份／session I/O 之前），每一期之前仍真跑 Core `GetDTPoint/SortDT`。來源 `@@ITEM` 第10號宣告帶行尾註解，所以原版 DSL 分析器必須包含它。兩期使用**同一個** `$DT[0]`、`$STATE`、`$DTpeople` 及來源79商品上限：第一期禮物卷獎勵5、維持費 `int(17.875)=17` 計入新期支出、熟練度衰減、城市人口更新；第二期保留該獎品與支出、再發放看門機器人1件並依上一期城市狀態重新計算。Node `original-period-solo-chain.mjs` 以**完整商店／城市資料**逐欄對照真正原版 Perl 輸出。詳見 [B-50 來源整合實際程式與邊界](b50-source-same-state-period-chain.md)。

**嚴格邊界：此函式是無副作用的、nonCommittable 來源投射。** 還沒把期末整段放進玩家瀏覽器的真 `WorldState` CAS，也沒有通過期界／落盤後接續販售的 HTTP E2E。原版跨期仍先拒絕。原版正在營業的完整 `inc-turn.cgi` 前段 FUNCTURN/FUNCSALE、多 EVENT 真回呼與順序、龍賽／公會／關店等分支、原版備份與 session I/O 都尚未打通。下一步應以單店完整 WorldState、期別城市／EVENT 可持久化狀態，將 B-50 全段與 B-48～B-49 的**真回呼**安全合併，再證明同一次原子更新不會重複結算，且 B-43 磁碟重啟後可繼續下一期營業。使用者只在整段遊戲真正可玩後一次確認；Draft PR #1 不合併，main、migration 和原版固定 Core／兩份 DSL 不改。

## 2026-11-21｜B-48～B-49 真原版事件啟動／期限先後次序（仍未整合 WorldState）

B-48 新增固定原版 `inc-turn.cgi` 事件啟動區段的真 Perl 執行與 Node 原文審核投射，確認 `startproba=0` 仍先消耗一次 `rand(100000)` 並進入來源觸發條件、同群組阻擋則不消耗、事件具有 basetime/plustime 時再消耗兩次決定到期時刻。固定 `inc-makeitem.cgi` 只排除 `startproba=-1`；標準街 `rebel`／`guildbattle` 宣告 `start 0`，**但尚未執行真正的動態回呼**。B-49 再以真原版 Perl 相鄰的「事件結束→事件開始」兩段對照 Node：到期條件是嚴格 `DTevent到期 < 片尾`，恰好相等仍占群組不重抽；舊事件到期才能刪除及依正常概率重試。六組來源輸出／亂數前綴測資已建立。來源與完整範圍：[B-48～B-49 EVENT 控制流](b48-b49-original-event-gates.md)。

**交接警戒**：B-44～B-47 期末四子階段與 B-48～B-49 事件純來源階段現在**都沒有整合為真 WorldState 跨期 CAS 命令**。目前真 EVENT / FUNCTURN / FUNCSALE、完整領地、商品、活動、事件效果與儲存需要實作並以固定 Perl／Node／HTTP 核對；不可以略過回呼或把單事件合成測試冒充原版全事件。現有36小時跨期阻擋正確、B-43 真本機存讀檔仍可用，未實作部分不得假稱完成。使用者要完整單機可玩閉環後再做一次人工驗收，毋需逐段詢問。Draft PR #1 維持未合併，main／migration／原版 Core／DSL 不動，最新 HEAD Push/PR 要同 SHA 成功。

## 2026-11-21｜B-47 單店原版 SortDT／GetDTPoint + 事件迴圈重要來源邊界

B-47 新增真正執行固定 Core `inc-func.cgi::GetDTPoint` 與 `plug/detail.cgi::SortDT` 的 Perl 探針及 Node 純投射，核對一間有效商店的排行榜分數由原版 `rank`、`profitstock`、當期銷售／稅／進貨及優勝次數等計算，並核對單店的 ID／名稱索引0。這接在 B-44 商店期末帳簿、B-45 冠軍來源獎品、B-46 領地人口三個子階段之外，**仍不代表整個跨期已可提交到 WorldState**。

新確認的下一個必須嚴格審閱的原版依賴：原版事件不是單純可以刪除的隨機裝飾。固定編譯器 `inc-makeitem.cgi` 只排除 `startproba=-1` 的事件；原版 `inc-turn.cgi` 開始事件的條件明文包含 `|| $E->{startproba}==0`，標準街叛亂／公會戰事件 `start 0` 不等於不會處理。因此若沒有真正建模來源的事件載入、回呼、到期與跨期保存，就繼續拒絕不正確的期別提交，不能以事件永遠無事偷渡。完整來源證據見 [B-44～B-47 期末階段](b44-b46-source-period-stages.md)。

## 2026-11-21｜B-44～B-46 真正期末來源驗證（仍未開放跨期）

B-43 已經有單店真 #10 買／賣、磁碟儲存與重啟續營。B-44～B-46 從固定原版來源依正確期末主要階段補上**尚待整合**的純結算區段：
1. B-44 真正執行 SHA 固定 `period.cgi`「前期的資訊保存 → 商品上限 → 維持費結轉 → 熟練度自然減少」Perl 原文，用同組輸入逐欄核對 Node；現金可依原版扣成負數，維持費`int(costtoday)`，新期 `paytoday` 需計入維持費，並非簡單歸零。
2. B-45 真執行 Standard Street `@@FUNCUPDATE::UpdateTodayPrize` 和固定 Core `AddItem`：單店期末第1名9種原版獎勵、`rankingcount++`、商品限量裁切、獎品分類／實際商品名稱不同，和 Node 全類比對。
3. B-46 真執行原版 `period.cgi` 領地調整及無領主 `RebelRobin` 早退分支，核對原版管理員初始城市、人口、發展／治安、守軍懲罰、軍費、破產及下一期兵力，連續兩期的 Node／Perl 比對。

**上述三項都是來源核對的階段，不是已打通的真 WorldState 跨期命令；目前仍在原版 +3h 相位的36小時邊界先拒絕，不篡改商店或城市。** 關鍵下一步：依真 `inc-turn.cgi` 排序，將原版必要 ITEM 回呼、`SortDT`、三個期末階段、其他公會／事件／檔案效果與 PLUS 嵌入一個合法世界 CAS 轉場；保存後重啟也必須能跨期續玩，方可交給使用者一次完整人工驗收。參考 [B-44～B-46 原版來源、公式及未完成項](b44-b46-source-period-stages.md)。工作分支不變，Draft PR #1 不合併、正式任務狀態不提前改動，最終驗收仍需 HEAD Push／PR 同 SHA 綠燈。

## 2026-11-21｜B-43：本機真磁碟存檔、重啟載入後繼續營業

**繼續同一分支與 Draft PR #1；完整可玩目標仍是原版真跨期決算 + 可持續營業。** B-43 加入 `modern/src/local-world-save-store.mjs`、原版繁中 UI 的「儲存世界／載入存檔」按鈕與後端 `/api/save`、`/api/load`。保存原版合法市場入庫與自然販售後的完整 WorldState，使用兩個有來源驗證、世代編號、SHA-256 偵錯、同目錄原子替換的磁碟存檔槽，支援停止 Node、重啟、載入、再次真購買與自然售出；損毀最新世代可回復上一個可驗證世代。詳見 [B-43 存檔、操作與限制](b43-durable-local-save.md)。尚未按儲存的進度會在服務關閉後遺失，沒有默默自動存檔；不是原版 Perl 存檔格式，也不是安全多人資料庫。

**下一主線仍是原版跨36小時決算。** B-42 先前更正的 JST9h - 日期修正6h＝**+3h** 邊界必須保留。源碼 `inc-period.cgi` 包含商店／市場／領地／人口／排名／事件／公會等期末效果，目前 WorldState 沒有可合法執行全部效果的真實欄位，仍必須禁止跨期，不能因為磁碟存檔完成就稱作完整遊戲。先補原版真正期末來源合約與 Perl／Node／HTTP 閉環，然後才擴商品與其他街道；維持 main／migration／原版 Core／DSL 不修改、不合併 PR。最終 CI 請以此文件所指的最新遠端 HEAD 的 **Push／PR 同 SHA** 驗收，不能套用較舊成功報表。

## 2026-11-21｜B-42 前段最新交接：兩輪真買入／真販售，保留原版時間邊界

已在 `test/task02-baseline-on-s1` 擴充 B-41 來源世界：第1次真市場買入 #10→合法原價展示架→自然販售，透過第一次自然時間片的59項來源 PLUS 更新後的真批發，再買 #10→第2次自然販售；可繼續對無庫存展示架快轉而不造出假銷售。固定原版 Perl／Node／HTTP E2E 對照資金100000→95000→100000→95000→100000 G、庫存0→1→0→1→0、`saletoday/paytoday=10000`、`itemtoday[10]=2`、人氣、持有費小數與原版79欄市場／CSV。修正原版架上有商品但庫存0仍令 `temprank=rank+1000`。

**必須沿用的原版邊界修正：** `inc-turn.cgi` 期別時間是 JST9小時 **減** `DATE_REVISE_TIME` 6小時，亦即 36小時期別偏移 **+3小時（10800秒）**；B-41 原來的9小時判定錯誤，B-42 已按固定 `_config.cgi` 來源鎖定與修正。現有原版繁中 UI 在上方顯示距下次決算；**跨期仍拒絕**，不是完成決算。B-42 Perl/Node/HTTP 與操作步驟：[B-42 經營兩輪驗收](b42-continuous-playable-loop.md)。

**下一步優先：原版真跨期結算**。需處理 `SortDT`、期末帳簿、完整 `inc-period.cgi` 涉及的領地／人口／公會／事件與必要回呼、世界狀態表示及可用 UI。不可把現有 B-19/B-20 孤立結算抽取當作完整期末；之後再做真磁碟存讀檔。維持原版 Perl／Node 對照、HTTP E2E、同 SHA 雙 CI，main／migration／原版 Core／DSL 不改，Draft PR #1 不合併，正式任務狀態不提前完成。

## 2026-11-21｜B-41 最新交接：真 #10 上架、來源自然販售與本機快轉

**已寫入工作分支，仍須以最終 HEAD 的 Push／PR 同 SHA CI 確認。** B-40 的真市場進貨已在同一記憶體 WorldState 上延伸至：初始化來源世界 → 開店 → 原版 59 項 PLUS 供貨子步驟 → 實際購得商品 #10（價格 5,000 G） → 倉庫使用現有 `edit-showcase` 合法第 1 架上架（單價 5,000 G、原版行動時間 600 秒） → 在店內快轉 1～60 分鐘，執行已審閱的原版自然販售區段，接著原版 59 項 PLUS／CheckWholeStore，並在同一個 CAS 世界提交資金、商品、人氣、今日銷售、供貨與 `nowSeconds`。**沒有人工灌入 #10**；原版 Perl 測試直接用 `buy-s.cgi` 與 `sc-s.cgi` 原始程式再接真 `inc-turn.cgi` 來源銷售片段。見 [B-41 完整對照、驗收與保留限制](b41-real-market-showcase-natural-sale.md)。

**使用者要求的快轉已加在現有原版風格介面**（`自店 > 店內`），有 **1／10／30 分鐘與 1 小時**快捷、**自填 1～60 分鐘**。不更動 B-40「交易」主選單／表格緊湊樣式；原版來源是依「秒數 `$timespan`」而非固定列舉選項執行，所以 1／10／30／60 是 UI 操作便利值，**不是冒稱為原版限定選單**。每次最多60分鐘，跨未實作的36小時結算邊界拒絕，不暗中跳過結算。此前 B-40 單獨「供貨子步驟」仍獨立，不推進時鐘。

**現況邊界：** 新 B-41 動作僅單店、商品 #10、合法原價架位、記憶體世界；銷售是否發生依原版抽樣，不保證每片都有成交。來源檢驗的正向測資為 30 分與 60 分；現有 GameCore 可保留原版 `costtoday` 小數，但正式期末結算尚未驗收。固定原版商品 DSL／Perl／Core 20 份、main、migration 均不可修改。沒有執行 FUNCSALE／FUNCTURN 通用回呼、跨店排序、跨期 `inc-period.cgi`、存讀檔、認證或多人；**此限定來源片段並非完整原版 `inc-turn.cgi` 真營業週期，也不代表已通用化的可玩閉環**。

**下一個 B-42 優先工作：** 以 B-41 已能在原版風格 UI 完成的真 #10 進貨／上架／販售為基礎，先解除「賣出一件後仍可繼續經營」的來源審查限制，依必要原版回呼及轉場順序補足可連續兩輪營業與期末結算；再完成可靠單機落盤、關閉服務重啟／載入後繼續經營。不可倒退成只做孤立 Perl 測試。按此文件、[優先序計畫](playable-loop-priority-plan.md)與最新版 HEAD 的真 CI 繼續，所有正式任務狀態維持現狀。

## B-40 使用者 UI 回饋與已提交的視覺修正（2026-11-21）

使用者在 Windows 實測時指出 B-40 灰綠 dashboard 卡片配色與實際原版《商人物語》印象差異過大，並要求直接 commit 以便預覽。已直接在 `test/task02-baseline-on-s1` 重排 `modern/local-ui/index.html`／`style.css`／`app.js`：以固定 `sindex.html`、`smain.html`、`custom/inc-menu.cgi` 為依據，恢復「自店／取引／情報／施設／交流」主選單及次選單、白底淡紫白表格、淺綠標題、淺黃選取提示、緊湊店舖資訊；世界 ID/revision/收據改成可展開的測試區。僅店內、倉庫、真市場進貨 #10 開放操作，其他分類與功能停用且如實顯示；未複製任何原始圖片或音樂。原版 Perl/DSL／GameCore／市場來源與交易 API 均未修改。HTTP E2E 已調整檢查選單、CSS 與真交易，詳細參考 [原版介面與 B-40 視覺修正](original-ui-reference-for-local-test.md)。

**下一步：** 先讓使用者在本機 `cd modern && npm run dev:local` 實際預覽，確認色彩與資訊配置；若有他的歷史伺服器截圖以截圖優先作局部修正，再依原計畫 B-41 在相同原版風格 UI 開發真正上架／自然販售。仍保留 Draft PR #1，不合併、不可修改 main/migration；只採用最新 HEAD 雙 CI 作回歸證據。Windows CRLF 讀取修正亦保留。

## B-40 後續修正｜Windows 原版來源 CRLF 啟動相容

Windows Git 的 `core.autocrlf` 可能使固定原版 CGI/DSL 在工作目錄成為 CRLF，B-34 仍以 `sub init\\n` 原版 LF 字串逐字核對，導致 `npm run dev:local` 啟動時在 `reviewOriginalSparseWorldBootstrap` 報 `fixed admin init source drift`。已在 `modern/src/local-source-text.mjs` 建立僅針對本機讀取結果的 CRLF→LF 正規化，`modern/scripts/dev-local.mjs` 對12份 CGI／DSL 來源輸入套用；禁止孤立 CR，原始檔、SHA、規則、審閱守門及分支沒有更改。新增 `modern/tests/local-source-text.test.mjs` 模擬 Windows 12份來源，實際核對可初始化真 StreetModule／GameCore 與開店；竄改原版內容仍然拒絕。

Windows 工作樹請先確認 `git status --short`，在 `test/task02-baseline-on-s1` 執行 `git pull --ff-only origin test/task02-baseline-on-s1`，再 `cd modern && npm run dev:local`。**不要重設工作樹、不要修改固定 CGI 來排除這個錯誤。** 手動／CI 詳情見 [B-40 本機操作文件](b40-local-browser-market-buy.md)。下一 B-41 上架→自然販售優先序不變；每次驗證以最新 HEAD Push/PR 同 SHA CI 為準。

## 2026-11-21｜B-40 最新開發交接（以下取代本檔 B-39 的「下一個 B-40」舊描述）

**新增加的真正玩家動作：** 在 Node 本機伺服器開啟 [可操作繁中介面](../local-ui/index.html)，經「初始化原版空白來源世界 → 開店 → 原版59項 PLUS 供貨子步驟 → 市場購買商品 #10 書本寫作工具 → 查看同一世界現金、倉庫與批發更新」。店內、市場、倉庫三頁籤由 [dev-local.mjs](../scripts/dev-local.mjs) HTTP API 接至 [GameCore／StreetModule／WorldState](../src/standard-street-module.mjs)，不是獨立 JSON demo，未實作功能停用。詳細 [B-40 執行／成功與拒絕操作、來源 Perl／Node 檢驗](b40-local-browser-market-buy.md)。

- 本機：`cd modern && npm run dev:local`，`http://127.0.0.1:4173`（僅 127.0.0.1）。Node 22+，關閉 Node 服務即失去世界；目前沒有正式存讀檔。
- 新來源審閱交易模組 [original-market-buy10.mjs](../src/original-market-buy10.mjs) 唯一開放 `buy-market-item-10`：商品 #10 原版 DSL 價格5000、持有上限20／每店批發上限10、單次市場交易時間600秒、原版可成交量縮減，以及商品／金錢／支出／行動時間／批發 sparse CSV 的單次 CAS 變更。別店、其他物品和 callback 尚未開放。
- 原版供貨不是人工插入：保留 B-34 初始市場空 CSV，經 B-37 真 `PLUS` + `CheckWholeStore` 抽樣運算，提供 60、600、3600 秒的**獨立來源子步驟**。**不**推進 WorldState 時鐘、不做自然販售／完整決算。隨機抽樣不是聲稱可重現 Perl 的 RNG 序列。
- [原版 Perl 的 buy-s.cgi 執行探針](../tests/original-perl/original-market-buy10-probe.pl)、[Node 回歸及實際本機 HTTP E2E](../tests/original-market-buy10.test.mjs) 核對無貨拒絕、有貨成交、扣款、庫存、批發、CAS 及可從 HTML 操作的 API。每次仍**必須依最新 HEAD 的 push/PR 同 SHA CI 結果**判斷是否完成驗收；不要用較早 B-39 CI 或中間紅燈／綠燈代表最終狀態。
- 正式任務 02／04／05 仍在進行中；此階段未完成商品完整 USE／自然販售／真正原版週期、CGI、認證、磁碟持久化、多人。原版20份 Core source SHA 和 DSL、main、migration 底分支保持不修改；Draft PR #1 保持開啟且不得合併。

**下一個玩家操作優先 B-41：** 使用本機介面內真購得的 #10，依來源現有 `edit-showcase` 及 B-38 reviewed natural-sale 投射路徑，在相同 WorldState 連接「庫存真上架 → 自然販售 → 現金與庫存變更」；只補阻擋這條鏈的原版必要回呼與時鐘處理。接著依順序接「完整週期結算 → 可重啟讀取的單機存檔」。不要回去做 B-40 以外零散原版細節。

## 最新工作界線

- GitHub repo：**`Prysline/akimono`**。
- 正式工作分支：**`test/task02-baseline-on-s1`**；Draft PR [#1](https://github.com/Prysline/akimono/pull/1)，base **`migration/standard-street-s1`**，**不得自行合併、不得改成 Ready for review**。此分支是唯一要接續的實作位置。
- 固定原始主分支 `main` 的已核對 SHA 為 `7301b0c2b1e27226d1770e153fa3c68cfeae6d48`；固定底分支 `migration/standard-street-s1` 已核對 SHA `585c77ba247510bcf3f22cf24c0c277b68d7d5a4`。**不得修改**原始 `main`、遷移底分支、原版 Core/CGI、`custom/inc-item-data.cgi`、`custom/inc-rebel-data.cgi`。
- 固定上游 Core：`katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`；兩份街道 DSL 固定 Git Blob SHA：商品 `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`、叛亂 `923634e58a05beca9ab004515fc7669d53a1ba3a`。
- `modern/tests/original-perl/` 已鎖定**20份來源原樣 Core 快照**（原18份＋B-34 原始管理員 `core-inc-admin-func.cgi` Blob `2164b7e5abfea7a466235a8deba1543c2cc41515`＋B-38 固定 `core-detail.cgi` 原版 `plug/detail.cgi` Blob `9a83d26fb29edee4032958f1e6de837a250f3384`）；GitHub Actions 逐份以 `git hash-object` 核對。
- 正式 Notion 12 任務：**01已完成；02、04、05進行中；其餘8項待辦**，非遊戲完工比例。任務02： https://app.notion.com/p/41db4185273f818f97d4fce172db36f8 ；任務04： https://app.notion.com/p/41db4185273f81288606d7d5a4375794 ；任務05： https://app.notion.com/p/41db4185273f812ea949dfcaf7c2def9 。

## 已真正實作與驗證的核心路線

1. B-01～B-30：原版商品上限、原版世界欄位與鎖／備份／寫入、原版市場／批發／時間／商品交易核心數值、部分原版回呼／實際 Perl 隔離；原版異常只記錄 [`original-behavior-issues.md`](original-behavior-issues.md)，**不可偷偷修復**。
2. B-31：純記憶體 `GameCore/StreetModule/WorldState`，嚴格 `revision`、`compareAndSwap` 與 JSON 快照，`standard-street` 最早只支援 `open-shop` 和 `edit-showcase`；不是真正磁碟／資料庫／多人遊戲。
3. B-32：人工A/B/C商品的來源 Perl `UseItem → lostbook` 連續兩次交叉驗證，**不代表**真實標準街 ITEM #1/#2/#3。
4. B-33：第一筆**真正**標準街 `ITEM #79 gift 禮物卷 / USE.no=0 交換地圖集`：消耗2張禮物卷，產出 ITEM #12 山區地圖、#9 礦山地圖、#14 劍市地圖各一張；固定原版編譯器 `ItemUseTimeRate=0.5` 令原始 `time 1h` 編成 `time/exptime=1800秒`，無自訂回呼、無熟練度、無金錢成本。原版商品上限79項已跨語言核對。當時因市場未驗證，僅限**明示人工批發全0**測資。
5. **B-34：** 追查到固定 Core `inc-admin-func.cgi::init` 第一次建立世界資料時，**批發庫存第三行是空字串**，而不是79個明文0；`inc-func.cgi::DataRead` 的 Perl `split` 得到**長度0稀疏陣列**。新 `original-admin-world-bootstrap.mjs` 只有在明確提供**原版管理員、讀取、寫入三份原文**且來源結構一致時，才允許對**空世界 `revision=0`** 執行選用 `initialize-source-market` 命令。它保存 `originalWholesaleCsv=''` 和 `sparseWrittenSlots=[]`，另外保留79格供數值運算的0視圖。B-34 使用真正原版 Perl `print DATA time()...` 子句（只在 scalar 記憶體把手執行，不跑整個 admin init）及完整原版 `UseItem` 核對後，將來源市場真正接到 B-33 的 `gift-exchange-maps`：在空世界初始化、真實標準街開店、連續兩筆交換後，庫存禮物卷 `5→3→1`、三種地圖各 `0→1→2`、世界版號 `0→1→2→3→4`。原版批發陣列只賦值位置78時，`DataWrite join` 文字是**78個逗號＋末尾一個0**，不是79個字面0；超限地圖會另寫位置8、11、13。詳見 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)。
6. **B-35：** 對已來源核對的 B-34 初始稀疏市場，實作**限定商品 #10 `book-make` 的 PLUS 20m**；Perl 真正抽取固定 `inc-turn.cgi` PLUS 原文迴圈、只把其他商品 PLUS 設為明示測試0，並直接呼叫完整固定 `whole.cgi::CheckWholeStore`。來源人口500000、MAX_USER=50、單一真新店、亂數抽樣由外部提供；三個受限後銷售時間片 `60/60/600秒` 的商品 #10 批發 `0→1→2→10`，記憶體版本 `2→3→4→5`。商品 #79 原版限額修正額外明確寫下索引78的0，證實稀疏CSV只定義索引9和78。**完整其他商品 PLUS、自然銷售／回呼／時間流逝／決算皆未執行**。詳見 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)。
7. **B-36：** 保留固定原版 `inc-turn.cgi` 的**完整 PLUS 迴圈原文片段**及 `plug/whole.cgi::CheckWholeStore`，在 B-34 空白稀疏市場與一間真實標準街新店上，只啟用三個固定來源商品：#1 藥草 `-20m`、#10 `book-make +20m`、#40 木刀 `-1h`。**其餘76項原版 PLUS 明示人工設0**，不是完整原版週期。原始 `DTpeople=500000`、`MAX_USER=50`，亂數百萬分位外部注入；三段來源時間片 `60/60/600` 秒讓商品 #10 批發 `0→1→3→10`，#1/#40 扣到負數後依原版 `CheckWholeStore` 歸0。批發 CSV 稀疏寫入索引 `[0,9,39,78]`，其餘空槽不補成0。另有**明示人工正庫存**的獨立扣貨 fixture 證實 #1 `20→19`、#40 `10→9`，不可誤稱是真實開服市場。Node `reviewed-sparse-multi-plus` 支援三筆 CAS 版本 `2→3→4→5`；沒有更新真世界時鐘、銷售、回呼、事件或持久化。詳見 [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)。
8. **B-37：** 固定標準街 DSL 共79 ITEM，依專案 `parseDsl` 與原版 `inc-makeitem.cgi::GetTime` 核對 **59項有 PLUS、20項無 PLUS 而由編譯器預設0**；初次快速掃描漏掉 #16「皮革加工入門」、#17「木工加工入門」的 `PLUS 20h`，現已訂正並納入79格固定來源清單。真原版 Perl 直接編譯59項，執行固定 `inc-turn.cgi` 原文 **PLUS 迴圈**及完整 `whole.cgi::CheckWholeStore`；Node 選用命令 `reviewed-sparse-all-plus` 必須另外提供並核對固定原版編譯器才開啟。真原版管理員批發初始空白 CSV、單間標準街新店、人口500000／MAX_USER50；三段受控後銷售時間片60／600／3600秒及明示 `rand` 消耗，全部79數值欄、**60個有定義的稀疏欄位**與 Perl 原文 CSV 逐項一致。#10 首60秒0→1，後續受上限10約束；`revision 2→3→4→5`，世界時鐘、商店與事件不更新。另有商品 #79「交換地圖集」先交易、後接全商品 PLUS 的受控整合測試。**未執行前段自然販售、回呼、完整時間／結算／CGI／檔案／多人**。[B-37來源與限制](reviewed-original-sparse-all-plus.md)。
9. **B-38：** 固定原版 `inc-turn.cgi` 的「店舗・商品別来客数計算處理」至「@@item 処理準備」前**自然販售原文區段**，直接執行固定原版 `plug/market.cgi::GetMarketStatus`、`plug/item.cgi::GetSaleTax` 與新增20th不改原文 Core 快照 `plug/detail.cgi::GetUserTaxRate`（Blob `9a83d26fb29edee4032958f1e6de837a250f3384`），然後**跳過**原版商品 FUNCTURN/FUNCSALE 回呼、`SortDT`、期末決算，再執行真正原版59項 PLUS 迴圈及完整79項 `CheckWholeStore`。**這是隔離的兩個來源區段串接，不是真完整週期。** 在真原版管理員初始空白批發、人口500000／MAX_USER50、只有一間新店、1728秒人工時間片下，真新店空展示架：售0、金錢100000、人氣5009、共消耗72筆 rand。另**人工**新增 #10 書本寫作工具1個且以5000上架（**沒有真的執行購買或入庫**）：原文販售確實售1、金錢105000、人氣4915、當期售額5000、稅0、`trush=5001`，自然銷售3筆 rand 再接 PLUS 72筆 rand，合計75筆；兩個案例最後稀疏市場60格定義，Perl／Node 的79格 CSV 和世界狀態一致。重要測試器根因：B-33 `OriginalGiftMapUseHarness` 只留 `code/name/scale/limit/wslimit`，不含 `price`；B-38 已由原版 `GetBuffer` 編譯 `ITEM#10 price=5000`、`pop=20d`、`point=200000` 與維持費，**不是修原版公式**。詳見 [B-38 來源與限制](reviewed-original-natural-sale-plus.md)。
10. **B-39（最新）：** 在原版固定標準街79 ITEM 中，**僅 #70 那由多的項鍊**宣告 `funct _local_`：標準價50000、`pop 2d`、`point 20000`、持有成本200、`PLUS=0`、批發限額0。隔離 Perl 直接使用**真正原版行內 callback 主體**，再由固定 `inc-turn.cgi` **原版 FUNCTURN 逐項派送迴圈**選擇持有商品的店家；只有第一展示架 #70 且售價不高於50000才加人氣，依 `TIMESPAN/86.4` 取整或以原版 rand 進位，上限10000。獨立來源測試：60秒 rand0→+1、999999→0，標價50001不加，初始人氣9980→10000。新來源固定8640秒人工時間片（B-37 對外原有最長3600秒**不變**）在單店依原版自然銷售→真 FUNCTURN→原版59項 PLUS／全79項上限：真新店空展示架售0、人氣5007、成本5、rand60次、稀疏市場60格有定義；**人工增加1件 #70 並以50000上架**、以明示rand保留庫存後，原版自然人氣5007再由回呼+100至**5107**、成本7、總 rand61次、稀疏市場61格有定義。Perl/Node 79欄批發、CSV、財務與亂數對照一致。**跳過其它商品回呼、FUNCSALE、SortDT、結算、真進貨、真時間、磁碟與CGI**。見 [B-39 原文測試與界線](reviewed-original-nayuta-functurn.md)。
11. **程式驗證 HEAD** `0265bd0a632b6567ebbfbfd33e9ff6c27f15fcd3`：[push CI](https://github.com/Prysline/akimono/actions/runs/44878580737)、[PR CI](https://github.com/Prysline/akimono/actions/runs/44878586451) **同 SHA success**，**807／807 Node、1138／1138 原版 Perl（32個 `*.t`）**，20份 Core Blob SHA、2份 DSL audit 均成功。**文件後續 HEAD 必須重新核對同 SHA 的兩份 CI。**

## 讀檔順序（新對話必做）

在新的對話中使用**已連接的 GitHub App／工具**，依序查看：
1. [Draft PR #1](https://github.com/Prysline/akimono/pull/1)（**讀回最新 head_sha、draft、merged、base**）與 [本交接文件](next-window-handoff.md)。
2. [`reviewed-original-nayuta-functurn.md`](reviewed-original-nayuta-functurn.md)（B-39）、[`reviewed-original-natural-sale-plus.md`](reviewed-original-natural-sale-plus.md)（B-38）與 [`reviewed-original-sparse-all-plus.md`](reviewed-original-sparse-all-plus.md)（B-37）與 [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)（B-36）與 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)（B-35）與 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)（B-34 來源初始化）；[`reviewed-real-gift-use.md`](reviewed-real-gift-use.md)（B-33 真商品）；[`migration-progress-and-next-milestones.md`](migration-progress-and-next-milestones.md)（正式里程碑）。
3. [`original-nayuta-functurn.mjs`](../src/original-nayuta-functurn.mjs)、[`original-natural-sale-plus.mjs`](../src/original-natural-sale-plus.mjs)、[`original-sparse-all-plus.mjs`](../src/original-sparse-all-plus.mjs)、[`original-sparse-multi-plus.mjs`](../src/original-sparse-multi-plus.mjs)、[`original-admin-world-bootstrap.mjs`](../src/original-admin-world-bootstrap.mjs)、[`reviewed-gift-map-use.mjs`](../src/reviewed-gift-map-use.mjs)、[`standard-street-module.mjs`](../src/standard-street-module.mjs)、[`game-core-contract.mjs`](../src/game-core-contract.mjs)。
4. [`OriginalNayutaFuncturnHarness.pm`](../tests/original-perl/OriginalNayutaFuncturnHarness.pm)、[`original-nayuta-functurn.t`](../tests/original-perl/original-nayuta-functurn.t)、[`original-nayuta-functurn.test.mjs`](../tests/original-nayuta-functurn.test.mjs)，以及 [`OriginalNaturalSalePlusHarness.pm`](../tests/original-perl/OriginalNaturalSalePlusHarness.pm)、[`original-natural-sale-plus.t`](../tests/original-perl/original-natural-sale-plus.t)、[`original-natural-sale-plus.test.mjs`](../tests/original-natural-sale-plus.test.mjs)，以及 [`OriginalSparseAllPlusHarness.pm`](../tests/original-perl/OriginalSparseAllPlusHarness.pm)、[`original-sparse-all-plus.t`](../tests/original-perl/original-sparse-all-plus.t)、[`original-sparse-all-plus.test.mjs`](../tests/original-sparse-all-plus.test.mjs)，以及 [`OriginalSparseMultiPlusHarness.pm`](../tests/original-perl/OriginalSparseMultiPlusHarness.pm)、[`original-sparse-multi-plus.t`](../tests/original-perl/original-sparse-multi-plus.t)、[`original-sparse-multi-plus.test.mjs`](../tests/original-sparse-multi-plus.test.mjs)；原有 [`OriginalSparseWholesalePlusHarness.pm`](../tests/original-perl/OriginalSparseWholesalePlusHarness.pm)、[`original-sparse-wholesale-plus.t`](../tests/original-perl/original-sparse-wholesale-plus.t)、[`original-sparse-wholesale-plus.test.mjs`](../tests/original-sparse-wholesale-plus.test.mjs)，以及 [`OriginalAdminBootstrapHarness.pm`](../tests/original-perl/OriginalAdminBootstrapHarness.pm)、[`original-admin-sparse-market-probe.pl`](../tests/original-perl/original-admin-sparse-market-probe.pl)、[`original-admin-sparse-market.t`](../tests/original-perl/original-admin-sparse-market.t)、[`original-admin-sparse-market.test.mjs`](../tests/original-admin-sparse-market.test.mjs)。
5. GitHub Actions **同 SHA 的 push / PR 兩份 CI**、`modern/package.json`、`verify-modernization.yml`，確認既有測試與所有20個 Core source SHA、兩份 DSL audit 完全成功，再開始新的修改。

## 原版 UI 參考與後續實際操作驗收

**使用者補充：可參考原始介面。** 先讀 [原始標準街介面來源與 B-40 測試 UI 對照](original-ui-reference-for-local-test.md)：已核對標準街 `sindex.html`／`smain.html`／`custom/inc-menu.cgi` 與固定原版 Core `inc-main.cgi`／`stock.cgi`／`shop-m.cgi`／`sc-s.cgi`。B-40 本機繁中測試 UI 優先保留原版自店／市場／倉庫選單、店內金錢／人氣／時間資訊、商品價格／可購量／庫存與架位操作；改善表格可讀性，不直接復用無授權圖片或舊 CGI 密碼/憑證。後端資料與功能仍以原版來源驗證及真 Game Core 命令為準。

## 現行工作順序：先完成可玩的經營閉環

**以 [現行工作優先序與最小可玩閉環](playable-loop-priority-plan.md) 為後續開發優先依據。** 使用者已明確要求「紀錄應有的順序和工作規劃，不要老是追究小細節」。**下一輪 B-40 必須同步建立實際可啟動的繁體中文本機瀏覽器測試介面與真正進貨，讓使用者可以點選操作、觀察扣款／庫存／市場、查看失敗原因**；後續在同一 UI 逐步加上上架／販售、必要回呼與結算、真存檔，最後整理正式繁中網頁，再做麵店和多人。原版 Perl／Node 比對照舊，但僅擴張足以驗證當前功能的規則；不再只為了另一項函式或斷言數而開新階段。

## 歷史紀錄：B-40 開始前的精確目標（已進入程式階段，最新狀態見本檔開頭）

B-39 已有真正 ITEM #70 FUNCTURN 回呼的原文隔離驗證，不是玩家可以自行購買的完整遊戲。**B-40 第一優先是可啟動的本機測試 UI＋原版真市場進貨 ITEM #10**：以固定 `buy-s.cgi`／市場與批發來源實際完成付款、購買、庫存更新，接現有 `WorldState`，並驗證至少一筆成功與拒絕路徑。完成後直接把真庫存接展示架與自然販售。**本輪必須有實際可執行的啟動指令（規劃 `npm run dev:local`）、瀏覽器網址與手動成功／拒絕測試步驟，並把畫面資料接真 Game Core／WorldState；不能只有 JSON demo 或測試輸出。** 原版市場初始若沒有 #10 貨源，必須先經合法供貨來源才能購買，不得灌入人工貨源。**只在目前真閉環必要時**才補 FUNCSALE、SortDT 或期末結算；其餘未相關回呼、事件／115 USE 暫不擴大。不更改原版來源／分支、維持双 CI；不能因測試固定秒數、人工庫存就聲稱可玩。

**未完成且不得聲稱已完成：** 所有商品使用、完整週期／市價／自動販售、真正磁碟讀寫／鎖／備份／回滾、密碼認證、HTTP、繁體中文可玩前端、其他街道、多人世界。所有 B-39 `WorldState` 操作仍只在**記憶體**中，初始化命令並非真實玩家行為或安全的原版遊戲管理操作。

## 新視窗起手提示（B-41 起直接複製）

```text
繼續《商人物語》標準街 Node.js 現代化。先連接 GitHub 的 Prysline/akimono，讀取 test/task02-baseline-on-s1 最新 HEAD、Draft PR #1 的 Push／PR 同 SHA CI，優先閱讀 modern/docs/playable-loop-priority-plan.md、modern/docs/original-ui-reference-for-local-test.md、modern/docs/next-window-handoff.md 及 modern/docs/b40-local-browser-market-buy.md。B-40 已在同一 GameCore／StreetModule／WorldState 加入真正商品 #10 市場進貨和可執行繁中本機 UI：cd modern && npm run dev:local，瀏覽器 http://127.0.0.1:4173；若 CI 紅燈先修正，不把失敗當成功。B-41 起直接擴充同一個 UI 的真上架→自然販售，使用上一步真正買到的商品庫存。再完成週期結算與可重啟的單機存讀檔。不要以獨立 JSON demo、人工貨源或拆散的測試取代操作閉環；尚未完成的功能必須明確停用。B-37 真 PLUS 目前只是抽樣供貨子步驟，不得假稱有真時鐘或完整週期。只在目前玩家路徑需要時補原版回呼、SortDT 等細節，原版 Perl／Node 比對與 Push／PR 雙 CI 繼續跑。main、migration/standard-street-s1、固定 Core/CGI/DSL 不修改，Draft PR 不合併；更新 GitHub 文件與 Notion，提供可實際操作的繁中成功／拒絕步驟。
```

**本檔先前 B-39 數值、CI、B-40 開發要求為保留的歷史紀錄；以最新遠端 HEAD 和本檔開頭的 B-40 交接為準。**
