# B-60｜原版「感謝祭 happy」真 NOWFUNC：真實店舖人氣、持續活動、到期與磁碟續玩

> 2026-11-22。延續 B-59 第一個真正持續改變批發供貨的鐵礦脈事件，這輪新增**直接改變玩家真實店鋪人氣 `rank` 的原版持續事件** `happy`，接回 B-56 已審查的完整 17 鍵受控事件時間片。此處刻意只接受**單一已審查持續事件**（B-59 `plusup-tetu` 或 B-60 `happy`），若兩種同時存在則整筆 CAS 拒絕，不代表已還原多事件並行、Perl hash 迭代及完整原始 PRNG。

## 原版實際功能

`custom/inc-item-data.cgi` 的 `@@EVENT code happy`（感謝祭）：`start 10%`，原版編譯後 `startProba=100`；`basetime 5h`、`plustime 5h`；開始公告「街上開始舉辦感謝祭了。」、結束公告「感謝祭已經結束了。」；`func _local_` 是**期間 NOWFUNC** 而不是啟動 STARTFUNC。原始原封不動的回呼如下：

```perl
my $time=$main::TIMESPAN;
$time=10*3600 if $time>10*3600;
$time=int($time/36);

foreach(@DT)
{
    $_->{rank}+=int(rand($time));
    $_->{rank}=10000 if $_->{rank}>10000;
}
return 0;
```

本輪支援的真實商店時段為 1～60 分鐘，`rand` 的範圍是 `int(min(timespan,36000)/36)`；例如 **30分鐘 rand(50)**、**60分鐘 rand(100)**。每個活動時間片只對當前真商店調整一次 `rank`，且最高 10,000。原版 `return 0` 為假訊息，不產生新的 NOWFUNC 日誌；啟動及到期公告則從原版 EVENT 流程另行輸出。

固定原版 `inc-turn.cgi` **先執行自然銷售／59項市場補貨／CheckWholeStore，再檢查舊 EVENT 到期、嘗試新 EVENT 啟動，最後巡覽 `%DTevent` 執行 `event-n`**。因此：

- 感謝祭在**成功啟動的同一片**就執行一次 `NOWFUNC`，不是從下一片才開始增加人氣；之前已完成的商品販售與補貨不會被回溯變更。
- 活動期間舊 `happy` 群組佔用，啟動 gate 不耗隨機抽樣，但結尾 NOWFUNC 仍會耗用一筆。原版期限採嚴格 `expiresAt < segmentEnd`；**等於本片終點仍有效，仍執行 NOWFUNC**。
- 本片結束前已到期，先發結束公告，再重新檢查本片 17 個 EVENT gate；若重新啟動 `happy`，同片又有啟動公告和一次 NOWFUNC。否則不耗 NOWFUNC 抽樣、人氣不因感謝祭增加。期限為 `segmentStart + int(rand(segmentSpan)) + 18000 + int(rand(18000))`。
- 原始 `@@EVENT func _local_` 經固定 `inc-makeitem.cgi` 編成 `event::_local_now`，真 Core 根據 `%DTevent` 執行產出的 `event-n/happy`。**本輪 Perl 探針從原版 DSL 完整抽出 NOWFUNC 原始本文，再暫時生成回呼檔，交由原版的整個 EVENT 到期／啟動／期間迴圈的 `require` 真正執行**；未聲稱執行完整原版編譯器主流程、整個 CGI、或還原 Perl 當次 hash 順序。

## 本輪程式與防護

- [來源鎖定 happy 真回呼、啟動／到期與單一活動狀態](../src/original-b60-happy-event-nowfunc.mjs)：檢查 DSL 完整 `_local_` 回呼本文、固定原版編譯器與 NOWFUNC 動態載入、EVENT 宣告，以及原始 END→START→NOW 順序；Node `projectOriginalHappyNow` 精確模擬一個合法商店的 `rank+=int(rand(int(span/36)))` 和上限10,000。
- [B-56 受控 EVENT 時間片](../src/original-b56-event-time-slice.mjs)：先跑 B-41 來源自然販售和全部 PLUS，再結束已到期的活動、執行全部17鍵 gate；新增 `happy` 的 2 筆啟動期限抽樣，最後依原版順序才消耗 NOWFUNC 抽樣並更新同筆 GameCore CAS 的商店人氣。存活活動在下一片省略 `happy` gate，但追加最後一筆 NOWFUNC 抽樣。**同時持有 happy 和 plusup-tetu 會拒絕整筆提交**。
- [B-41 真販售](../src/original-b41-playable-sale.mjs)、[B-37 原版59項 PLUS](../src/original-sparse-all-plus.mjs)：一般孤立販售／補貨不可略過已知存活 `happy` 的 NOWFUNC；仍保留既有 B-41 未審查 EVENT 用 `null` 表示「未知」，不可偽稱空集合。
- [B-43 本地雙世代存檔](../src/local-world-save-store.mjs)：只新增單一、安全正整數期限的 `happy` 活動表合法性，與原 B-59 `plusup-tetu` 二擇一；未審查／多個／錯時間活動皆拒絕。真實商店及街道世界欄位仍受既有驗證限制。
- [原版 Perl 真執行探針](../tests/original-perl/original-b60-happy-event-probe.pl) 與 [Perl 斷言](../tests/original-perl/original-b60-happy-event.t)：直接執行原本固定 `inc-turn.cgi` 的 END→START→NOW 區段及從固定 DSL 真回呼本文生成的臨時 `event-n` Perl 檔，涵蓋首次啟動當片提升人氣、活動中群組抑制、期限等號、到期失敗、到期後重啟、1分鐘 rand(1)、1小時 rand(100)、人氣上限及各種公告／抽樣數。
- [Node／Perl 真玩家商店 CAS 整合](../tests/b60-source-happy-nowfunc-live-cas.test.mjs)：原版市場初始化 → 合法真開店 → 59項真補貨 → 真市場進貨#10／上架 → 原版自然販售 → 感謝祭同片增加人氣並原子提交事件狀態 → 真磁碟存檔 → 新 adapter 重讀續玩 → 下一片繼續增加人氣 → 期限相等仍增加 → 到期片不再增加 → 重新啟動再次增加 → 保存並重新驗證。非法亂數、未支援事件、兩個持續活動、壞期限、舊 revision 均拒絕且世界不變。

## 邊界與下一步

本功能仍只供來源受審查的**內部** `advance-source-time-reviewed-events` 使用，未新增玩家可觸發事件的 HTTP 路由或 UI；感謝祭日誌仍只以 `eventLogEmissions` 回執表示，**不等於原版持久化日誌**。受控的 `eventHashOrderFixture` 是明示全部17鍵排列，不是 Perl `keys(%EVENT)` 實際迭代；亂數由測試顯式提供，不代表已還原完整 PRNG。除已審查的 `happy`、`plusup-tetu` 外，其他持續活動的 `price`、`pop`、`point`、`plus` 參數、可能的 callback 與多事件並行仍未完成。核心 **36小時跨期結算**仍然嚴格封鎖、不能靜默跳過；不等於已完成可玩閉環。

保持 `test/task02-baseline-on-s1` 工作分支、Draft PR #1 未合併，固定 Perl Core／DSL、main 與遷移底分支不改。**最終測試計數與提交 SHA 須依本文件提交後的同 SHA Push＋PR CI 確認**；不得將尚未驗證的結果聲稱成功。
