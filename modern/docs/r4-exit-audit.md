# R4 退出驗收清冊｜2026-11-23

本清冊只記錄已可證明的原版來源行為與**尚未通過的真正 R4 退出條件**。任一驗收工作包 Push／PR 雙 CI 綠燈不等於整體 R4 完成。R4 必須能在共同 GameCore／StreetModule／WorldState 下執行真跨期經營、可靠保存和 HTTP 路徑，並對原版 Perl 具可重現、跨階段、跨狀態的來源差分；不可用局部純投影或測試替身冒充。

## 現行結果與不可動邊界

- 共用分支：`test/task02-baseline-on-s1`；PR #1 對 `migration/standard-street-s1` 保持 **Open／Draft／未合併**。僅修改 `modern/`，原版 Core、Perl、DSL、其他分支與 Notion 不動。
- 已驗收的混合 17-key 原始 Perl fixture：七種來源宣告型持續事件 + `happy` + `plusup-tetu` + `ken-sale` 共 **十種 durable**；`getmoney/getpop`、`manbiki/goutou`、`loto` 為非持續 STARTFUNC，確實與當次 Perl `keys(%EVENT)`、`keys(%DTevent)` 亂數交錯。必要場景直接擷取真 `inc-makeitem.cgi` ITEM PARAM 原文，保留 DataRead 生效時間。
- guildbattle END 和 rebel NOW 的原始 DSL 函式已從獨立測試接入**同一 17-key 原文 Perl EVENT 流程**，能與十種持續事件、happy 同時執行，並驗證 rebel NOW 自刪事件時的原始 Perl 遍歷、城鎮軍隊／公會領地及共同 RNG。外部檔案讀寫仍是明示 stub，財富同額／軍力同額等 Perl 不定序結果維持 fail-closed。RebelRobin 期末仍為局部子鏈。
- `37fc981113c1df3ce1195279589dec9d47cf8098`：同一 HEAD Push Actions #45099952281、PR Actions #45099957238 皆 completed/success；Node **1076/1076**，原版 Perl **2114/2114**（65 個 .t）。
- R4 的新多事件 projector、特殊事件 projector、期末片段組合 **全部 `committable:false`**，未取得完整原版世界狀態來源／存檔與同步驗證前，不得放寬。

## R4 退出條件與缺口

| 必須具備的來源／運作契約 | 已有可用證據 | 真正未完成的驗收條件 |
|---|---|---|
| 17-key EVENT 原版開始／結束、群組、回呼及亂數 | **受控 17-key 來源差分已涵蓋**十種 durable、五種即時 STARTFUNC，且在同一凍結 Perl inc-turn END／START／NOW 中執行 rebel 與 guildbattle 真 DSL 回呼；透過 GetPath(event-n) 觀察 rebel 自刪前的 NOW key 遍歷。Node 比對 79 ITEM、商店、軍隊／城市／公會、日誌與共享 rand(range)。 | **仍欠正式 runtime**：ReadArmy／WriteArmy／ReadGuild／ReadGuildData／SetTownData 仍為受控 IO stub；樣本及 key 次序來自同一 Perl 行程，而非 JS 原生 seed 重現；全跨期與 WorldState 提交尚未驗證。 |
| SortDT、販售、59 PLUS、EVENT 相互影響 | B-47 SortDT、R3 自然販售、B-56／B-59 時間片及九種 EVENT ITEM PARAM source probes | **尚缺**同一實際世界中連續販售→排行→PLUS→活動覆寫→結算對商品、商店、城市、稅額的整段來源差分 |
| 36 小時時鐘切割與**完整**原版期末 | `src/original-r4-time-slices.mjs` 已核對 `inc-turn.cgi` 切割；B-50 單商店、單城市兩次純期末前綴；R4 RebelRobin 片段 | **尚缺**凍結 `period.cgi` 全部階段（含 DragonBalance、Guild、老店關閉、原始排名、重設、資產、軍隊與租稅）、跨多期與所有正負邊界的共同世界結果 |
| 正式可提交事件與期末 WorldState | GameCore v2 的 `period` envelope、來源起始期狀態與事件 bootstrap、B-43 本機兩代存檔 | **尚缺**已結算期的來源驗證結構、事件與城市／公會／軍隊的 durable persistence、所有失敗原子回滾、期末 CAS commit 與兩代磁碟復原 |
| HTTP 共同經營閉環與重啟 | 已有 R2/R3 HTTP、市場、USE、自然販售及儲存的受控回歸 | **尚缺**同一玩家／店鋪市場購買→USE→狀態顯示→多次營業→跨 36h 期末→持久事件日誌→save/restart 的真正端到端來源差分 |
| 原版 hash 與外部讀寫依賴 | 真 Perl 行程返回實際 EVENT/DTevent order；測試明示 stub ReadArmy／WriteArmy、ReadGuild／ReadGuildData／SetTownData | **尚缺**真實外部介面與實際資料檔狀態、領主及公會決策的跨回合讀寫；測試 sandbox 的 IO 替身不能升格為產品行為 |
| R0/R1/R5 交互影響 | 既有受影響測試清冊與 R3 退出回歸 | **不因此宣告** R0/R1 或 R5 完成，R4 只判定其自身已 source-reviewed 的能力 |

## 不得採用的捷徑

1. 不把 Perl 單一行程中觀察到的 hash 排列硬編成 JS 固定順序，不將受控 `rand` 樣本稱為原版 seed 重現。
2. 不把未支援 END／NOWFUNC 直接設為成功、不忽略原版日誌、不自行補城市／軍隊／公會資料、不把測試 stdout 快照錯誤當成來源遊戲行為。
3. 不把純 `project*` 的 `committable:false` 結果當成 WorldState 預期修訂提交；不因某個 isolated `.t` 或 Node 測試為綠色而解除期末／跨界失敗拒絕。
4. 不為了給 R4 打勾而修改原始 Core／DSL／Perl、降低必要斷言、合併 Draft PR、修改其他分支或 Notion。

## 目前 R4 判定

**未完成，不允許退出。** 下一個工程性阻塞不是更多 isolated 綠燈，而是完整來源期間的多事件／多時間片共同狀態、可提交的期末與城市保存模型、來源驗證及 HTTP／CAS／重啟整合。完成前所有未審閱邊界維持 fail-closed。
