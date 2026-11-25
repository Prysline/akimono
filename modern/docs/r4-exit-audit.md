# R4 退出驗收清冊｜2026-11-23

> **2026-11-25｜現行基線同步：** R4 原工作線的獨立單店受控跨期已驗收，必要依賴已由 P3 合入正式 migration；下方一律拒絕正向跨期、沒有提交 WorldState 的敘述僅是 11-23 歷史狀態。整體 R4 外部功能未結案；#16 帳本修正版獨立 CI 已通過，#18 已由正式 migration 出發選擇性引入來源證據，仍須獨立驗收與正式功能實作。 [最新基線、驗收與接續指引](current-baseline-status.md)。
>
> **下方為歷史內容，保留原始來源及當時紀錄。**


本清冊只記錄已可證明的原版來源行為與**尚未通過的真正 R4 退出條件**。任一驗收工作包 Push／PR 雙 CI 綠燈不等於整體 R4 完成。R4 必須能在共同 GameCore／StreetModule／WorldState 下執行真跨期經營、可靠保存和 HTTP 路徑，並對原版 Perl 具可重現、跨階段、跨狀態的來源差分；不可用局部純投影或測試替身冒充。

## 現行結果與不可動邊界

- 共用分支：`test/task02-baseline-on-s1`；PR #1 對 `migration/standard-street-s1` 保持 **Open／Draft／未合併**。僅修改 `modern/`，原版 Core、Perl、DSL、其他分支與 Notion 不動。
- 已驗收的混合 17-key 原始 Perl fixture：七種來源宣告型持續事件 + `happy` + `plusup-tetu` + `ken-sale` 共 **十種 durable**；`getmoney/getpop`、`manbiki/goutou`、`loto` 為非持續 STARTFUNC，確實與當次 Perl `keys(%EVENT)`、`keys(%DTevent)` 亂數交錯。必要場景直接擷取真 `inc-makeitem.cgi` ITEM PARAM 原文，保留 DataRead 生效時間。
- guildbattle END 和 rebel NOW 的原始 DSL 函式已從獨立測試接入**同一 17-key 原文 Perl EVENT 流程**，能與十種持續事件、happy 同時執行，並驗證 rebel NOW 自刪事件時的原始 Perl 遍歷、城鎮軍隊／公會領地及共同 RNG。外部檔案讀寫仍是明示 stub，財富同額／軍力同額等 Perl 不定序結果維持 fail-closed。RebelRobin 期末仍為局部子鏈。
- `09a11a2ac73de26a8c76d777d768a4b79028211d`：同一 HEAD Push Actions #45122232062、PR Actions #45122236936 皆 completed/success；Node **1094/1094**、原版 Perl **2210/2210**（71 個 .t）。凍結 `period.cgi` 的同店同城兩期期末前綴已在受控差分中共同執行 DragonBalance 真檔案 IO、guild dues／atk／def、dignity 自然衰減及 `UpdateResetAfter` 四技術遺忘，整張店鋪／城市逐欄比較。
- `78a590676f921c1c83f0ef3372caa90ae41e818b`：同一 HEAD Push #45200662255 與 PR #45200680932 成功；Node **1110/1110**、Perl **2225/2225**（72 個 `.t`）。本輪將來源 v2 時鐘／期別審閱**接進本機 HTTP 實際使用的記憶體 CAS 適配器**（初始化、磁碟載入都先審閱），真 HTTP 已測跨 36h 拒絕、雙世代儲存、Node 重啟與再次拒絕；另從凍結 `period.cgi` 執行九種原始未登入過期店 `CloseShop` 呼叫判斷，未假造實際刪店副作用。
- R4 的新多事件 projector、特殊事件 projector、期末片段組合 **全部 `committable:false`**，未取得完整原版世界狀態來源／存檔與同步驗證前，不得放寬。

## R4 退出條件與缺口

| 必須具備的來源／運作契約 | 已有可用證據 | 真正未完成的驗收條件 |
|---|---|---|
| 17-key EVENT 原版開始／結束、群組、回呼及亂數 | **受控 17-key 來源差分已涵蓋**十種 durable、五種即時 STARTFUNC，且在同一凍結 Perl inc-turn END／START／NOW 中執行 rebel 與 guildbattle 真 DSL 回呼；透過 GetPath(event-n) 觀察 rebel 自刪前的 NOW key 遍歷。Node 比對 79 ITEM、商店、軍隊／城市／公會、日誌與共享 rand(range)。 | **仍欠正式 runtime**：ReadArmy／WriteArmy／ReadGuild／ReadGuildData／SetTownData 仍為受控 IO stub；樣本及 key 次序來自同一 Perl 行程，而非 JS 原生 seed 重現；全跨期與 WorldState 提交尚未驗證。 |
| SortDT、販售、59 PLUS、EVENT 相互影響 | B-47 SortDT、R3 自然販售、B-56／B-59 時間片及九種 EVENT ITEM PARAM source probes | **尚缺**同一實際世界中連續販售→排行→PLUS→活動覆寫→結算對商品、商店、城市、稅額的整段來源差分 |
| 36 小時時鐘切割與**完整**原版期末 | `src/original-r4-time-slices.mjs` 核對來源切割。B-50 單店同城連續兩期原版 `period.cgi` 備份前綴，已透過明示來源 opt-in 組合 **真 DragonBalance 暫存檔讀取／刪除、guild dues 與 atk／def 變動（EditGuildMoney 僅記錄外部呼叫）、dignity `rand(100)`、四技術高 EXP `rand(14000)` 遺忘**，保留跨期 dragon／drmoney／exp／商品與城市。 | **尚缺**完整多店排行及真正 `CloseShop` 跨檔案刪店效果：新增九組真 Perl 原文只驗證原版期末 12 小時建店門檻、7 天登入逾期的嚴格不等號、`blocklogin='stop'` 及 `PushLog`／`CloseShop` 呼叫，不等於已關店；仍欠、真 guild treasury 檔案更新、領主／軍隊外部狀態、剩餘未審閱 EVENT／商品回呼、備份／session 副作用與 **可提交 36 小時 WorldState／CAS**；兩期 pre-backup 純來源鏈不等於完整實際遊戲。 |
| 正式可提交事件與期末 WorldState | GameCore v2 的 `period` 初始來源契約、B-43 雙世代存檔與正式指令前審閱；**本機 HTTP 已改用 `createSourceReviewedMemoryWorldAdapter`**，在初始化及載入時檢查合法來源狀態，並於每次 `compareAndSwap` 再跑真 36h／+3h source review，跨期、偽造已結算期數／城市／不認識的 EVENT 在記憶體 CAS 前拒絕。即使是已知單一 iron／happy／sword EVENT，零時間內憑空增改仍拒絕；偽造審閱器不能繞過已綁定的來源審閱。 | **仍缺正向原版結算／可提交期別版本**、Guild／Army／backup／session 真資料與期末原子交易。現行時間推進中的已知 EVENT 封套驗證不等於完整 17-key provenance 或原版 hash seed。泛用 `createMemoryWorldAdapter` 仍為供 v1／測試用的通用介面；受審核 adapter 僅用於指定 Standard Street 本機 runtime，不能稱為跨程序持久化交易管理器。 |
| HTTP 共同經營閉環與重啟 | R2/R3 真 HTTP 進貨、USE、展示、自然販售與存檔回歸皆保持；R4 新 `r4-source-cas-http-save-restart.test.mjs` 已在 36h 期界前完成真初始化→開店→59 PLUS 供貨→購買 #10→跨期拒絕→連存兩世代→停止 Node→重啟載入→再次拒絕，確保時間、period、revision 與存檔未受污染。 | **尚缺正向完整跨 36h 期末後的真營業→EVENT／城市持久化→CAS commit→save/restart**，拒絕過界的負向閉環不可當作完成完整 R4。 |
| 原版 hash 與外部讀寫依賴 | 真 Perl 行程返回實際 EVENT/DTevent order；測試明示 stub ReadArmy／WriteArmy、ReadGuild／ReadGuildData／SetTownData | **尚缺**真實外部介面與實際資料檔狀態、領主及公會決策的跨回合讀寫；測試 sandbox 的 IO 替身不能升格為產品行為 |
| R0/R1/R5 交互影響 | 既有受影響測試清冊與 R3 退出回歸 | **不因此宣告** R0/R1 或 R5 完成，R4 只判定其自身已 source-reviewed 的能力 |

## 不得採用的捷徑

1. 不把 Perl 單一行程中觀察到的 hash 排列硬編成 JS 固定順序，不將受控 `rand` 樣本稱為原版 seed 重現。
2. 不把未支援 END／NOWFUNC 直接設為成功、不忽略原版日誌、不自行補城市／軍隊／公會資料、不把測試 stdout 快照錯誤當成來源遊戲行為。
3. 不把純 `project*` 的 `committable:false` 結果當成 WorldState 預期修訂提交；不因某個 isolated `.t` 或 Node 測試為綠色而解除期末／跨界失敗拒絕。
4. 不為了給 R4 打勾而修改原始 Core／DSL／Perl、降低必要斷言、合併 Draft PR、修改其他分支或 Notion。

## 目前 R4 判定

**未完成，不允許退出。** 下一個工程性阻塞不是更多 isolated 綠燈，而是完整來源期間的多事件／多時間片共同狀態、可提交的期末與城市保存模型、來源驗證及 HTTP／CAS／重啟整合。完成前所有未審閱邊界維持 fail-closed。
