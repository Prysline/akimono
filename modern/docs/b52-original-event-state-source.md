# B-52｜原版 EVENT 初始欄位的真讀寫、時間推進後的「未知」狀態

> 2026-11-21：**B-52 不是原版事件引擎已完成，也不是期末結算已開放。** 它是把 B-51 新玩家世界的 EVENT 初始值依真正原版 CGI 校正，避免將未移植的 EVENT 回呼誤認成「目前沒有事件」。

## 固定原版來源

[管理員建立世界的 `inc-admin-func.cgi`](../tests/original-perl/core-inc-admin-func.cgi)：

```perl
print DATA time()."\n500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0\n\n\n//\n";
```

該紀錄的第3行是空的原始批發庫存 CSV，第4行是**空的 EVENT 執行實例 CSV**。固定 `inc-func.cgi::DataRead` 的原式：

```perl
%DTevent=split(/,/,$DATA[$idx++]);
```

與 `write.cgi::DataWrite` 的原式：

```perl
print OUT join(",",%DTevent)."\n";
```

因此**首次建立的新世界，真實的「正在執行的事件」是空的**；它不是所有 EVENT 定義都不存在。原版仍有 Standard Street 商品 DSL 23個 EVENT 宣告與 rebel DSL 2個 EVENT 宣告，包含具有機率、群組、時間及 startfunc/nowfunc/endfunc 的實際事件。不可把初始化空表當作「永久沒事件」或關閉回呼的理由。

[B-52 真 Perl 讀寫測試](../tests/original-perl/original-b52-event-wire-probe.pl) 直接擷取並執行固定來源的 `split` / `join` 陳述式：新世界 EVENT 欄位無實例、空欄位原樣落盤；再以獨立的一筆測試事件 `rebel,123456` 寫出並由同一來源讀回。這筆 `rebel` 值**是讀寫測資**，不是說玩家世界觸發了叛亂。[原始 Perl 斷言](../tests/original-perl/original-b52-event-wire.t)。

## 已接上真正玩家 WorldState 的行為

[原版 EVENT 初始狀態契約](../src/original-event-world-bootstrap.mjs) 必須先審查上述三份固定原版來源才允許新世界 `period.eventState={}`，語義是「**來源確認尚未開始時間片的空事件實例表**」。`world.events` 舊欄位仍保持 `null`，不能冒充已編譯 EVENT 執行表。

[原版新世界城市／期別](../src/original-period-world-seed.mjs) 允許 B-51 歷史 v2 存檔的 `period.eventState=null` 繼續載入、儲存；但禁止 `{rebel:timestamp}` 等未經來源事件執行程式批准的實例偽造。v1 存檔完全不修改。

**最重要的防錯：** [B-41 真進銷＋原版 PLUS 時間推進](../src/original-b41-playable-sale.mjs) 尚未執行原版 EVENT 到期、啟動、nowfunc、startfunc 或 endfunc。新 v2 世界在首次快轉時，會保留原本合法商店、商品、市場、原版城市人口與期別欄位，但把 `period.eventState` 由 `{}` 設為 **`null`（未知）**。不可在未跑 EVENT 的情況下繼續聲稱事件實例仍為空。

B-43 真雙世代存檔與重啟載入保留這個語義：剛開店未推進的空事件表依來源可存成 `{}`；快轉過後存成 `null`；損毀存檔的校驗與世代回復既有機制不變。繁體中文瀏覽器的「事件資料」直接顯示「新建世界初始空白」或「已推進、原版 EVENT 回呼尚未實作，狀態未知」，避免誤以為背景事件已完整結算。

[Node/Perl 跨語言測試](../tests/b52-event-bootstrap-source.test.mjs) 確認原版讀寫真實輸出、來源漂移拒絕、初始 `{}`、舊 v2 `null` 相容、假活動事件拒絕；強化的 [B-51](../tests/b51-source-city-period-world.test.mjs) 與 [B-43 HTTP 本機進銷／存檔重啟](../tests/b43-durable-world-save.test.mjs) 同時驗證兩種事件狀態的轉變及保存。

## 不可越過的界線與下一步

- 尚**未執行**原版 `inc-turn.cgi` 中完整的 25 EVENT 定義、原版 `keys(%EVENT)` 迭代與亂數、事件時間到期和群組衝突，亦未執行原版 `startfunc` / `endfunc` / `nowfunc`、物品價格／人氣／批發供貨修正、叛亂或商會戰。
- 目前真營業 B-41 仍是**只完成無事件投射的來源自然銷售＋59 PLUS 子步驟**；B-50 期末兩期是**原版來源前綴的未提交純投射**。二者尚未在單一玩家 WorldState 上以原版正確順序合併。
- 下一步應優先讓原版多 EVENT 與商品回呼、原始期末、真商品獎品、原版城市及 `period` 有完整可保存的生命週期，正確做到單次 CAS 跨36小時；**不能隨機抽到未知事件時讓玩家反覆重試直到避開事件**，也不得把 `null` 當作 `{}`。
- 最後驗證原版 Perl／Node／HTTP「真開店→真市場進貨→合法上架→自然販售→真跨期→磁碟存檔→關閉 Node 重啟→下一期再進貨販售」，才是使用者要求的**一次集中人工驗收**門檻。

原版 Core CGI、Standard Street DSL、main／migration 均不改；Draft PR #1 保留未合併。
