# B-58｜原版抽獎卷真買入、真 Perl 開獎、全券消耗與獎金同筆 CAS

> 2026-11-22。本階段繼續 B-57 原版資金援助／人氣提升，將原版 `ITEM #11 loto 抽獎卷` 合法市場買入與 `EVENT loto 抽獎卷抽選` 的真實 `STARTFUNC` 效果整合進 B-56 的單店內部事件時間片。**不代表玩家網頁已能操作抽獎或所有原版事件，也不是完整 EVENT／期末引擎。**

## 原始來源與經過 Perl 執行驗證的語義

- **商品取得**：固定 `custom/inc-item-data.cgi` 中 `@@ITEM no 11`，`code loto`，名稱「抽獎卷」，市場牌價 2,000，`limit 50/20`，維護費 `cost 10`，批發補貨 `plus 10m`，`noshowcase|norequest`。B-58 新增單品 `buy-market-item-11` 審查，沿用 B-40 已鎖定的真原版 `buy-s.cgi`／`whole.cgi`／`item.cgi`／`calc.cgi` 採購語義、10分鐘耗時、真實市場貨架依 DSL 順序計算、已持有數與市場供應共同限制買量、單一 CAS 原子更新店內存貨、現金、`paytoday`、虛擬市場及商店行動時間（不推進世界時鐘）。透過原版 Perl `buy-s.cgi` 交易探針確認。**原始 #11 並非 DSL 第二個商品**；不可把商品編號當貨架順位。
- **自然時間**：B-41 限制仍只販售已上架的 #10 書本寫作工具；B-58 允許同店另外持有真正購入的 #11 抽獎卷（不上架／不自然販售），並將每張在回合經過時的原版 `cost 10` 納入 `costtoday` 與對應垃圾累積。原版 `inc-turn.cgi` 是遍歷所有持有物的成本，而非只看展示架。
- **事件開獎**：原始事件 `start 50%` 經編譯器變為 `startProba=500`，`basetime=0h`、`plustime=0h`；進入已審查完整 17 鍵 EVENT gate 後，`STARTFUNC _local_` 先呼叫 `WriteLog(2,0,"抽獎卷的開獎開始了")`，**清空所有自有的 #11 數量**，對原本每一張各抽一次 `rand(6096454)`。沒票也有一則開獎公告、不消耗開獎亂數。
- **獎等（依原版連續覆寫 if 判定）**：`rnd<1` 一等 1,000,000,000；`rnd<6` 二等 150,000,000；`rnd<216` 三等 5,000,000；`rnd<10000` 四等 100,000；`rnd<152411` 五等 10,000；其餘無獎。每筆中獎即加現金，累計最高 `MaxMoney=999999999`。回傳0，不形成持續活動 EVENT，且獎金不算作店鋪商品銷售。
- **原版公告細節，不能自行修正**：直接從固定 DSL 擷取並執行的真 Perl `STARTFUNC` 探針證明，原始 `"抽中了$hit等獎，"` 在 Perl 中把 `$hit等獎` 當作**整個變數名**，因此輸出實際為 `「抽中了，10000！」` 而非 `「抽中了5等獎，10000！」`。Node 會保留這個可觀察的來源行為，`WriteLog` 的 `level`（1～3等為1，4～5等為2）也逐則保留。呈現金額的 `GetMoneyString` 在 Perl 檢驗中**明示使用純整數字串替身**，無法宣稱原本 UI 格式完全等價。

## 新程式與檢驗

- [ITEM #11 真市場買入](../src/original-market-buy11.mjs)：`reviewOriginalMarketBuy11`、`quoteOriginalMarket11`、`projectOriginalMarketBuy11`；[固定來源買入真 Perl 探針](../tests/original-perl/original-market-buy11-probe.pl)。
- [EVENT loto 真回呼](../src/original-b58-loto-startfunc.mjs)：`reviewOriginalLotoStartfunc` 對完整來源 `STARTFUNC` 本體逐行比對；`projectOriginalLotoStartfunc` 僅允許合法單店、最多50張及**每張一筆明示的原版 `rand(6096454)` 結果**，不允許其他事件/票數外的自動抽獎。
- [真 Perl 開獎探針](../tests/original-perl/original-b58-loto-event-probe.pl)、[Perl 斷言](../tests/original-perl/original-b58-loto-event.t)：執行原本固定 `loto STARTFUNC`，涵蓋五等獎、各門檻等號、未中獎、沒票、複數票、金額上限、原始公告內容及隨機呼叫次數。
- [B-58 Node/真世界 CAS 整合](../tests/b58-source-loto-real-ticket-cas.test.mjs)：逐筆比對真 Perl 的現金、79欄庫存、日志輸出和 return 值；合法初始化 → 真開店 → 59項 PLUS 供貨 → 真購入 #10 → **市場買入 #11** → #10 上架 → B-41 自然販售／PLUS → 真 #11 開獎扣券與金額核算，全部同一 CAS，B-43 磁碟存檔重讀。觸發未移植事件、抽樣缺漏、錯種類、超量與舊 revision 必須保留整個世界原狀。
- [B-56 完整門檻時間片](../src/original-b56-event-time-slice.mjs) 使用一條事件抽樣序列：入口 `rand(100000)` 仍用百萬分位整數，**每張**開獎值採 `{range:6096454,result:整數}` 型別辨別，順序必須與 callback 真執行對應；不得誤將這些票券亂數當成同一範圍。來源回呼的 `WriteLog` 只以 `eventLogEmissions` 明細置於 CAS receipt；**原版持久化日誌寫入尚未實作**。

## 現況邊界

本次 #11 買入在 StreetModule 的內部受控命令中，**未新增玩家 HTTP 路由、購票 UI 或公用任意商品購買機制**。只有一間經固定來源認證的真商店、#10 自然販售、#11 非展示架持有、零持續 EVENT 的已驗證世界可進入。同 B-56，完整17鍵 `eventHashOrderFixture` 由測試呼叫端顯式提供，**不是原版 Perl 當次 hash 順序或完整 PRNG 狀態**；其餘未完成之持續型事件仍拒絕整個 CAS，不會跳過。原版活動回呼、日誌持久層、真跨期36小時結算與公開遊玩閉環仍待實作。

保持工作分支 `test/task02-baseline-on-s1`、Draft PR #1 未合併；原版 Core、兩份 DSL、main 與遷移底分支不修改。完整 CI 與最終 SHA 需依 GitHub Actions 最新同 SHA Push＋PR 核定。
