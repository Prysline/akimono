# B-48～B-49｜原版 EVENT 啟動、到期與群組控制流

> 2026-11-21：**已由固定 Perl 原始區段執行並與 Node 逐欄對照，但這不是完整事件引擎或已可跨期的遊戲功能。** 原版 Core／標準街 DSL 均維持固定 SHA，不修改來源。

## 原版來源與證據

[B-48 Node 無回呼單事件啟動閘](../src/original-event-start-gate.mjs)／[原版 Perl 啟動探針](../tests/original-perl/original-b48-event-start-probe.pl)／[Node 測試](../tests/b48-original-event-start.test.mjs)／[Perl .t](../tests/original-perl/original-b48-event-start.t)。

[B-49 Node 事件到期→重啟控制](../src/original-event-lifecycle.mjs)／[原版 Perl 兩段相鄰控制流程實際執行](../tests/original-perl/original-b49-event-lifecycle-probe.pl)／[Node 測試](../tests/b49-original-event-lifecycle.test.mjs)／[Perl .t](../tests/original-perl/original-b49-event-lifecycle.t)。

固定 Core [\`inc-turn.cgi\`](../tests/original-perl/inc-turn.cgi) 於每個時間片的自然販售、FUNCTURN/FUNCSALE、排序、期末、59項 PLUS 之後處理 EVENT。啟動判斷包含：

\`\`\`perl
if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)
\`\`\`

因此 **startproba=0 仍會先消耗 rand(100000) 並進入事件分支**；只有受到群組佔用阻擋，才略過這次抽樣。若事件有 \`basetime+plustime\`，原版還會取 \`rand($timespan)\` 與 \`rand($E->{plustime})\` 決定截止時間（即使 plustime=0 仍存在抽樣呼叫），並在來源 \`DTevent\` 留下時間。

固定編譯器 [\`inc-makeitem.cgi\`](../tests/original-perl/inc-makeitem.cgi) 只有在 \`startproba!=-1\` 時編入 EVENT，因此不能把0當作禁用。標準街 \`rebel\` 與 \`guildbattle\` 都是 \`start 0\`，但此事**不代表已真執行其動態回呼**。

B-49 更完整地執行原版兩個相鄰的「事件終了處理→事件開始處理」區段。原版到期條件：

\`\`\`perl
if($DTevent{$key}<$temptimenow+$timespan)
\`\`\`

**嚴格小於**：期限剛好等於片尾，該事件仍占用群組且不重新抽樣；期限在片尾之前，才先刪除後允許同事件重新抽樣觸發。直接執行 Perl、與 Node 對照了首次0機率進入、正常機率未命中／命中、群組阻擋、到期重啟或未重啟、到期後重新產生時限。

## 未整合、不能宣稱完成的範圍

兩個 Node 模組都僅供**一個沒有 startfunc／endfunc／nowfunc 的合成來源事件**使用，不執行多 EVENT 的 Perl hash 迭代順序、真實事件文件載入、商品與市場價格／人氣效果、叛亂、商會戰、文件更新，也不寫入 live WorldState。真正標準街 EVENT 含有自訂 Perl 回呼，不能用「假設沒有觸發」繞過。

**遊戲仍禁止跨越原版36小時結算邊界**；B-44～B-47 帳務／冠軍獎品／城市人口／單店 SortDT 也仍是原始來源審閱的獨立純區段，尚未串接到同一個期末命令。下一步需要在來源的正確順序下整合真 EVENT、商品回呼、全世界 STATE/事件狀態及存檔，再完成真跨期的 Perl／Node／HTTP E2E 與 B-43 磁碟重啟續玩；使用者只在整個閉環可操作時進行一次人工驗收。

## 已通過的程式提交

B-49 程式提交 \`00c9f036d642f89cdc7887027554c5be68a9f47b\`：[Push CI](https://github.com/Prysline/akimono/actions/runs/44914753040)／[Draft PR CI](https://github.com/Prysline/akimono/actions/runs/44914758892)，同 SHA completed/success，Node **842／842**、原版 Perl **1353／1353**（41個 \`.t\`），固定 Core／DSL 稽核通過。後續文件提交後，仍應核對最新 HEAD 的同 SHA CI。
