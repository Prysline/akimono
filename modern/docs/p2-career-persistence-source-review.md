# P2 #78 轉職持久化來源審閱

基準 e2e7e2ad0ec753a98829d679abb1c9e58a26ea8b（隔離整合分支、P1 PR #9）。僅 modern/；凍結 Perl/DSL、main、R4 不改。

## 原版證據

custom/inc-item-data.cgi ITEM #78 port-exp 轉職指南：標準價 10000、limit 1、plus 1h。十四項 USE 都消耗一本指南，nocount、6h × ItemUseTimeRate 0.5 = 10800 秒、USE 費用 0。原版市場實際 PLUS→購買→USE，而非初始化指南。

USE 0–12 的 target ITEM / job 依次為 15/drug、16/tool、17/tool、66/tool、20/weapon、21/armor、22/armor、23/weapon、9/material、12/material、10/book、25/cow、14/peddle；13 為解除職業，保留 EXP。前三者 tool 等 alias 依原版，並不改職業名稱以便區分。

原版 _local_ 回呼遍歷 9:10:12:14:15:16:17:66:20:21:22:23:25；若 EXP=0 或 donor ITEM 編號等於目標原 EXP 值便跳過（原版行為，不將值比較改成 ITEM 編號比較）。其餘刪除、合計乘 0.5 取整，加上舊目標值，上限 1000；因此舊目標值也可能被計入 donor。非 donor 熟練度不動。USE 13 只清除 job。保留日誌與回傳文字。既有 original-r2-career-use-probe.pl 真執行凍結來源，r2-career-change-source.test.mjs 比對全 14 項及邊界。

## B-43 缺口與方案

P1/既有 B-43 依當前 EXP 反推採集、製作及擠奶次數。轉職刪除或移轉 EXP 後，原先合法產物不會消失，亦不能以移入 EXP 當作產量證據；直接放寬 EXP/job 白名單會引入偽造。因此 P2 新增明示有界的本機命令歷史：從全新原版初始化（或經原有驗證的無職業舊存檔錨點）重播合法單店 GameCore 命令，逐步遵循 CAS、來源規則與同一 B-54 RNG；比較完整 canonical WorldState。無證據的職業存檔拒絕。舊格式仍可讀；新證據與世界一起雜湊、雙槽原子寫入。

此為可重現來源歷史，不是簽章或登入授權；本機能修改所有檔案者仍可能偽造另一條完全合法的命令歷史，舊存檔錨點也保留原 B-43 可行包絡的局限。不得聲稱具抗惡意本機改檔的密碼學保證。

本輪重播白名單僅涵蓋已審閱市場供貨與指定物品購買、禮券地圖/牛、採集、P1 製藥、既有木工/皮革、劍地圖、擠奶及 #78；其餘製作、販售快轉、EVENT、跨期、多店、其他 P3–P5 仍不擴張。歷史容量有限，超過上限或混入未審閱命令拒絕持久化；不跳過 R4。以最終 PR HEAD Actions 驗證為準。
