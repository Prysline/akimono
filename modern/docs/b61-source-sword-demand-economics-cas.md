# B-61｜原版「劍需求增加 ken-sale」持續 EVENT：真 Perl 需求／市場計算、真世界時鐘與持久存檔

> 2026-11-22。接續 B-59「鐵礦脈」真供貨及 B-60「感謝祭」真人氣後，新增 `ken-sale` 這條**會改變五種劍的原版需求參數**的持續 EVENT。本輪只支援原版單一來源 EVENT 狀態、固定受控完整17鍵 EVENT gate、原版需求計算的**可稽核回執**，**不偽造劍商品的真實買賣**；玩家目前可真實進貨、上架、自然賣出的仍是 ITEM #10，另有內部 ITEM #11 真抽獎卷。

## 為什麼選這條，不選自然「物價暴漲」

固定 `custom/inc-item-data.cgi` 原版 `@@EVENT ken-sale`：

- `start 10%`；固定原版 `GetNumber` 編為 `startProba=100`。每日 10% 是事件參數，這裡並未重現 Perl 的完整雜湊鍵序及 PRNG。
- `basetime 6h`、`plustime 24h`；真事件期限採 `now + int(rand(timespan)) + 21600 + int(rand(86400))`。
- 啟動公告「對劍的需求似乎在增加」；結束公告「劍的需求已恢復正常水平」。
- 無 STARTFUNC／ENDFUNC／NOWFUNC，原版唯一的五條 `PARAM` 是「木刀」「鐵劍」「鋼鐵劍」「秘銀劍」「奧利哈鋼劍」各自 `pop/2`。由真正的原版 `inc-makeitem.cgi::OutEventData` 參數產生迴圈編出的程式形式是 `$ITEM[40]->{popular}=int($ITEM[40]->{popular}/2);` 到 `$ITEM[44]`，不是價格乘二。原始 `pop` 分別 3h、3h、5h、10h、16h；EVENT 活動中是 5400、5400、9000、18000、28800 秒。
- 原版 `priceup-yakusou`、`priceup-tetu` 等雖有 `price*2`，但 DSL 後面的第二次 `start -1` 令它們不被編入可自然觸發的 EVENT 清單。B-61 **不把它們編入**，也不將劍需求事件誤稱為改變售價。

固定原版 `inc-turn.cgi` 在 `DataRead()` 後就用 `$ITEM->{buypeople}=$DTpeople*$SALE_SPEED/$ITEM->{popular}*$timespan/86400;` 計算需求，然後調用真 `GetMarketStatus()`，接著才執行自然販售及59種批發供貨，最後才 END／START EVENT。原版 `DataRead` 透過 `%DTevent` 的活動事件檔修改 `ITEM`，因此**活動啟動片仍使用舊需求；從下一片 DataRead 才開始五種劍的 `popular/2`；到期片在市場計算階段仍受舊事件影響，再下一片才恢復原本需求**。期限與本片結束秒數相等時仍有效、群組不重抽；已到期則先結束、再允許同片重新抽事件。

## 真原版 Perl 程式片段執行驗證

[原版 B-61 Perl 探針](../tests/original-perl/original-b61-sword-demand-probe.pl) 使用固定原版編譯器實際的 `GetItemNumber`、`GetTime`、`GetNumber`，從真 DSL 分離出五條 EVENT `PARAM`，**擷取並執行未改寫的 `inc-makeitem.cgi::OutEventData` 原始編譯迴圈**，將五行真正產生的 Perl 檔內容先寫到記憶體而不是改寫固定原版檔，再以這五行程式調整 `ITEM`。

接著**原樣擷取並實際執行**固定 `inc-turn.cgi` 的商品購買人數計算與 `GetMarketStatus()` 原版來源段，後者直接 `require` 固定 `market.cgi`。為了展示原版經濟差異，這個獨立來源探針建立**非玩家世界的受控測試陳列情境**：#40 木刀陳列200把、定價1200、居民500,000、SALE_SPEED12、時間片60秒；原版 `GetMarketStatus` 得到 `uppoint` **54 → 27**，`marketprice` **1200 → 1200（不變）**，實際原版 `buypeople` 在五種劍各自提升約2倍。此測試的200把木刀**不是從真正玩家世界取得的貨**，不能據此宣稱真玩家已有劍的買賣功能。

探針另直接執行固定 `inc-turn.cgi` 原版 END＋START EVENT 區段，核對啟動三次抽樣、持續群組阻擋、期限嚴格小於、到期後未重啟、到期同片重啟與開始／結束公告順序。Perl 斷言在 [`original-b61-sword-demand.t`](../tests/original-perl/original-b61-sword-demand.t)；Node 真世界與跨語言對照在 [`b61-source-sword-demand-live-cas.test.mjs`](../tests/b61-source-sword-demand-live-cas.test.mjs)。

## 真世界 GameCore／Street／B-43 持久存檔

- [`original-b61-sword-demand-event.mjs`](../src/original-b61-sword-demand-event.mjs) 來源鎖定五條原版 `pop/2`、ITEM名/編號/POP秒數、原始編譯器、DataRead→買家計算→市場供貨→EVENT END/START 順序；提供固定來源的活動期限與需求資料（含合法單一 active EVENT 驗證）。
- [`original-b41-playable-sale.mjs`](../src/original-b41-playable-sale.mjs) 在既有真玩家 #10 的 **B-41 自然販售前**，只根據本片起始 `period.eventState` 是否存在 `ken-sale` 計算五種劍的 `sourceSwordDemandPreview`。它是來源公式的**潛在買家預測**，不是成交、金錢、庫存或售價異動。GameCore B-31 嚴格禁止交易回執任意浮點數：每種劍預測改以**安全整數的 numerator／denominator**保存精確比例，另將原版浮點計算近似值存成**文字**，不修改既有 GameCore 安全契約。
- [`original-b56-event-time-slice.mjs`](../src/original-b56-event-time-slice.mjs) 維持完整17鍵**呼叫端明示順序**及抽樣，加入 `ken-sale` 活動起訖；同 CAS 提交原始店鋪售貨結果、59項批發市場、世界時鐘與 `period.eventState['ken-sale']`。活動佔用群組會抑制重抽，事件啟動／結束公告暫放在 `eventLogEmissions` 回執而不是原版持久日志。
- [`local-world-save-store.mjs`](../src/local-world-save-store.mjs) 真 B-43 雙世代本地存檔額外只允許 `ken-sale` 單獨一個合法事件期限；與 `plusup-tetu`、`happy` 是**三選一**，仍拒絕原版其他 EVENT、多種活動同時活著、非法期限或不合來源的城鎮數值。
- [`original-sparse-all-plus.mjs`](../src/original-sparse-all-plus.mjs) 的孤立補貨與既有 B-41 舊時間指令不能繞過已知的持續劍需求事件，也不將未知 EVENT `null` 冒充為空表。
- 真玩家場景從原版市場初始化、開店、真補貨、真購買及上架 ITEM #10、自然販售、觸發劍需求、磁碟存檔後由**新的記憶體世界 adapter 重載**、下一片可見需求指標加倍、6小時的嚴格到期等號及結束片仍沿用舊需求、再下一片回復正常，驗證交易不發生憑空劍商品，並保留 revision CAS、非法事件／抽樣拒絕而不污染世界。

## 必須保留的邊界

本輪**確實執行原始 Perl 編譯器的部分迴圈、原始買家需求片段、原始市場狀態與原版 EVENT END/START**，但**不是完整原版 CGI／所有商品可操作世界**。仍只有 #10 可在現行玩家展示架真實自然販售；劍類沒有玩家實際購買、上架或自然賣出，所以需求提升現在是受控真世界的**可驗證市場需求指標**，不是銷量證明。原版 EVENT 多活動同時進行、`keys(%EVENT)` 當次實際 Perl hash 序及完整 PRNG、持久化 EVENT LOG、原版其它事件／商品、玩家 HTTP 自然 EVENT 操作、**36小時跨期結算**仍未完成且按來源邊界拒絕。

請維持 `test/task02-baseline-on-s1`、Draft PR #1 未合併、main／遷移底分支／固定 Perl Core 與 DSL 不改。下一輪建議先讓受需求事件影響的劍商品走真實市場取得→上架→自然販售來源路徑，或另挑實際可自然觸發的商品經濟事件擴展。**CI 計數和最後 SHA 必須以文件與交接最後提交後的 Push＋PR 同 SHA 結果為準**，不能引用中間版本結果。
