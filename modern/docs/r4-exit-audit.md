# R4 退出驗收清冊｜更新至 2026-11-24

## 2026-11-24｜R4 公會真檔案子工作包

新增 [公會持久化契約](./r4-guild-file-persistence-contract.md)：真原版公會定義、帳本、正負額、兩期 B-50、隔離多檔部分寫入及 marker 恢復。MakeGuildFile 不 reload %GUILD，WriteGuildData 仍用舊 keys；不把新公會缺帳本猜成零。僅已審閱檔案欄位、非正式 WorldState 提交；原版 hash 順序不宣稱等價。正式 36h fail-closed、eventState:null、R2/R3 原受控結論維持，R4/R5/R0/R1 全量未結案。以最後同一 HEAD 的 Push/PR Actions 為驗收依據；下一工作包軍隊/城鎮與主檔共同接合。

## 2026-11-24｜R4 第一階段外部資料真實寫入增量（不等於退出）

原版外部 I/O 呼叫、資料線路、失敗及恢復對映新增於 [r4-external-file-effects-contract.md](r4-external-file-effects-contract.md)。確認固定版本 SetUserData 是 no-op、EditGuildMoney 與 SetTownData 是記憶體操作；實際 guildbal 在 WriteGuildData、town 在 DataWrite 才會分期落盤。ReadGuild、ReadGuildData、ReadArmy/WriteArmy、MakeGuildFile 的真磁碟整合仍未完成；WriteErrorLog 已補原版真檔案 append／rotate／失敗差分與受限 B-50 封存 sink，但正式跨檔交易仍未完成，不能將原有 recorder 當成真 IO。

新增 source-pinned、單活躍店、79 ITEM、32/11 欄與最多單鍵 hash 的 DataWrite 編碼及隔離真檔 writer；新 Perl probe 真執行 frozen DataWrite → DataCommitOrAbort → DataRead 同檔兩期，Node 比較原始位元組、測試失敗保留 marker 與重新恢復。這是受限共享寫入介面證據；另有原版 WriteErrorLog 真 append／rotate／缺目錄後半關店差分及 B-50 第二期 CloseShop effect → 真 Node log sink 接合。**尚未接入 B-50 的完整主存檔或 WorldState/CAS**。所有新輸出維持 committable:false，正式 R4/R5/R0/R1 仍未退出。專項測試與整套回歸須以最終同 SHA Actions 驗收。


本清冊只記錄已可證明的原版來源行為與**尚未通過的真正 R4 退出條件**。任一驗收工作包 Push／PR 雙 CI 綠燈不等於整體 R4 完成。R4 必須能在共同 GameCore／StreetModule／WorldState 下執行真跨期經營、可靠保存和 HTTP 路徑，並對原版 Perl 具可重現、跨階段、跨狀態的來源差分；不可用局部純投影或測試替身冒充。

## 現行結果與不可動邊界

- 共用分支：`test/task02-baseline-on-s1`；PR #1 對 `migration/standard-street-s1` 保持 **Open／Draft／未合併**。僅修改 `modern/`，原版 Core、Perl、DSL、其他分支與 Notion 不動。
- 已驗收的混合 17-key 原始 Perl fixture：七種來源宣告型持續事件 + `happy` + `plusup-tetu` + `ken-sale` 共 **十種 durable**；`getmoney/getpop`、`manbiki/goutou`、`loto` 為非持續 STARTFUNC，確實與當次 Perl `keys(%EVENT)`、`keys(%DTevent)` 亂數交錯。必要場景直接擷取真 `inc-makeitem.cgi` ITEM PARAM 原文，保留 DataRead 生效時間。
- guildbattle END 和 rebel NOW 的原始 DSL 函式已從獨立測試接入**同一 17-key 原文 Perl EVENT 流程**，能與十種持續事件、happy 同時執行，並驗證 rebel NOW 自刪事件時的原始 Perl 遍歷、城鎮軍隊／公會領地及共同 RNG。外部檔案讀寫仍是明示 stub，財富同額／軍力同額等 Perl 不定序結果維持 fail-closed。RebelRobin 期末仍為局部子鏈。
- `09a11a2ac73de26a8c76d777d768a4b79028211d`：同一 HEAD Push Actions #45122232062、PR Actions #45122236936 皆 completed/success；Node **1094/1094**、原版 Perl **2210/2210**（71 個 .t）。凍結 `period.cgi` 的同店同城兩期期末前綴已在受控差分中共同執行 DragonBalance 真檔案 IO、guild dues／atk／def、dignity 自然衰減及 `UpdateResetAfter` 四技術遺忘，整張店鋪／城市逐欄比較。
- `78a590676f921c1c83f0ef3372caa90ae41e818b`：同一 HEAD Push #45200662255 與 PR #45200680932 成功；Node **1110/1110**、Perl **2225/2225**（72 個 `.t`）。本輪將來源 v2 時鐘／期別審閱**接進本機 HTTP 實際使用的記憶體 CAS 適配器**（初始化、磁碟載入都先審閱），真 HTTP 已測跨 36h 拒絕、雙世代儲存、Node 重啟與再次拒絕；另從凍結 `period.cgi` 執行九種原始未登入過期店 `CloseShop` 呼叫判斷，未假造實際刪店副作用。
- **2026-11-24 新增來源驗收：** `modern/src/original-r4-close-shop-effects.mjs` 的完整凍結 `write.cgi::CloseShop` 操作及後續 `SortDT`／DataWrite 排除規則，已在單店原版兩期帳務鏈中驗證；新 `original-r4-period-backup-tail.mjs` 與真 Perl 隔離磁碟探針驗證兩次備份生成旋轉／七天 Session 清理，並加上同一 Perl 行程執行實際整段期末前綴與尾段的差分工作包。兩者仍禁止提交。
- R4 的新多事件 projector、特殊事件 projector、期末片段組合 **全部 `committable:false`**，未取得完整原版世界狀態來源／存檔與同步驗證前，不得放寬。

## R4 退出條件與缺口

| 必須具備的來源／運作契約 | 已有可用證據 | 真正未完成的驗收條件 |
|---|---|---|
| 17-key EVENT 原版開始／結束、群組、回呼及亂數 | **受控 17-key 來源差分已涵蓋**十種 durable、五種即時 STARTFUNC，且在同一凍結 Perl inc-turn END／START／NOW 中執行 rebel 與 guildbattle 真 DSL 回呼；透過 GetPath(event-n) 觀察 rebel 自刪前的 NOW key 遍歷。Node 比對 79 ITEM、商店、軍隊／城市／公會、日誌與共享 rand(range)。 | **仍欠正式 runtime**：ReadArmy／WriteArmy／ReadGuild／ReadGuildData／SetTownData 仍為受控 IO stub；樣本及 key 次序來自同一 Perl 行程，而非 JS 原生 seed 重現；全跨期與 WorldState 提交尚未驗證。 |
| SortDT、販售、59 PLUS、EVENT 相互影響 | B-47 SortDT、R3 自然販售、B-56／B-59 時間片及九種 EVENT ITEM PARAM source probes | **尚缺**同一實際世界中連續販售→排行→PLUS→活動覆寫→結算對商品、商店、城市、稅額的整段來源差分 |
| 36 小時時鐘切割與**完整**原版期末 | 已直接執行原版 `period.cgi` 兩期期末同世界來源鏈，涵蓋 `DragonBalance` 真暫存收支檔、Guild dues／atk／def（外部 `EditGuildMoney` 僅記錄呼叫）、dignity、四技術遺忘。`write.cgi::CloseShop` 原始子程式現已**真執行**，核對 32 欄關店封存 payload、status／money／rank 修改、受控 Session 檔案刪除，以及後續 `SortDT` 將停業店鋪移出活躍清單。新增期末尾段 Perl 真檔案差分：**三代 `backup1/2/3` 旋轉、五個來源檔 log0／log1／log2／guildbal／play 複製、七天 Session 嚴格 mtime 清理，連續兩次**；另有一個原版 Perl 行程把真關店與此備份尾段接在兩期期末同段執行。 | **尚非完整可提交期末**：原版外部 `SetUserData`、`WriteErrorLog`、`EditGuildMoney`、`MakeGuildFile` 的真帳本／封存 IO 並未接成原子交易，真 DataWrite／鎖定／複製失敗的恢復、全部 EVENT／多店／軍隊領地與完整 36h WorldState／CAS／HTTP 正向結算仍缺。真檔案測試全部隔離在 Perl 暫存目錄，B-50 的 Node 結果仍 `nonCommittable:true`。 |
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
