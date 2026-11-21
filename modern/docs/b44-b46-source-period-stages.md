# B-44～B-46｜原版36小時期末三個必要階段：帳務、冠軍獎品、領地人口

> **性質：真來源片段驗證／準備工作，不是已可執行的完整期末決算。** 原版跨36小時邊界仍會拒絕，不可從三個獨立投射推論所有回呼／事件／市場與世界檔案已完成。2026-11-21 工作分支 `test/task02-baseline-on-s1`。

## B-44｜原版單店期末帳務

[Node 可執行子模型](../src/original-period-shop-ledger.mjs)；[原版 Perl 實際抽取執行](../tests/original-perl/original-b44-period-ledger-probe.pl)；[Perl 斷言](../tests/original-perl/original-b44-period-ledger.t)；[Node 對照](../tests/b44-period-ledger.test.mjs)。

原版 SHA 固定 `period.cgi` 直接擷取「前期的資訊保存」至「爵位點數自然減少」之前的實際 Perl 區段；Node 投射在同一組輸入下核對以下原始順序：

- `rankingyesterday=1`（此處限真正單店排行榜位置1）。
- `profitstock = int((profitstock*3 + saletoday - paytoday)/4)`。負數依 Perl `int` 向零截斷。
- `saleyesterday ← saletoday`，`payyesterday ← paytoday`，`itemyesterday ← itemtoday`，`taxyesterday ← taxtoday`；當期相關欄位清零。
- 用79個原版 ITEM 的 limit 做商品上限修正與 Perl `int` 截斷；不擅自把負值「修正」成0。
- `cost=int(costtoday) + CostShowcase1`。原版標準街第一展示架維持費 `CostShowcase1=0`，扣自當期現金，**另記入新一期 `paytoday`**，`costyesterday=cost`，`costtoday=0`。本機現有來源販售會累積小數維持費。
- 熟練度依原版 `EXP_DOWN_RATE=60`、`EXP_DOWN_POINT=5`，先減 `int(exp*60/1000)` 再減5，刪掉不大於零的項目。

拒絕未建模的 guild／dragon／dignity、非法資料與超出受審查的熟練度；**此函式只產生不修改輸入的投射，不寫入玩家 WorldState**。帳務階段還未包含之前的排名獎品或之後的領地人口。

## B-45｜原版 Standard Street 冠軍獎品與原版 AddItem 上限

[Node 冠軍獎品](../src/original-period-top-prize.mjs)；[原版 Perl 真實執行 Standard Street `@@FUNCUPDATE`](../tests/original-perl/original-b45-top-prize-probe.pl)；[原版斷言](../tests/original-perl/original-b45-top-prize.t)；[Node 對照](../tests/b45-period-top-prize.test.mjs)。

真實原版 `inc-period.cgi` 在期末先增加原版榜首商店 `rankingcount`，再執行 Standard Street `UpdateResetBefore → UpdateTodayPrize → TopGetItem`。冠軍選擇原版9選1，使用真來源商品編號與上限；其中五格是「禮物卷」（各5／4／3／2／1枚），第六格是「看門機器人」1架，第七～九格是整隻烤火雞、挑剔的朗姆酒、時髦的靴子各1件。原版顯示類別「機器人」「慶祝用品」不同於實際所贈的 ITEM 名稱，來源檢查保留區別。執行固定 Core `use.cgi::AddItem` 原版函式，來源持有上限不足時只獲得剩餘可存數量、餘額丟棄。無法把獎品冒充市場進貨，也不能不經原版獎品就永久增加店內庫存。

B-45 目前只允許真正單店榜首的獎品區段；尚不代表完整多店排序、其他名次獎勵、所有商品 callback 或完整世界結算。

## B-46｜原版無領主單店的城市領地與人口

[Node 原版領地投射](../src/original-period-territory.mjs)；[原版 Perl 領地與 `RebelRobin` 早退執行](../tests/original-perl/original-b46-territory-probe.pl)；[Perl 斷言](../tests/original-perl/original-b46-territory.t)；[Node 對照](../tests/b46-period-territory.test.mjs)。

來源為固定管理員 `inc-admin-func.cgi::init` 初始世界資料與 `inc-func.cgi::@STATEnamelist` 欄位排序，以及固定 `period.cgi` 的整個「領地資料調整」區段。原版初始人口500,000；原始 `STATE` 欄位包含 leader、money、in、out、develop、devem、safety、safem、army、robina、robinb，初值依真正初始化資料，不捏造。單店的下一期人口按 `24000*1+100000+develop*30+safety*20`；發展與治安依真來源各抽一個 `rand(200)`、守軍不足懲罰、最低1000、軍費、破產後兵力除三，以及原版無有效領主時的義勇軍／正規軍交接。持續兩期的原版 Perl／Node 對照與破產測資保留。

此區段嚴格限定無已啟動事件、無領主、無公會稅的**原版單店來源分支**；不是多玩家領主／叛亂／事件通用實作。

## 仍不得開放跨期的依賴

實際原版 `inc-turn.cgi` 遵循自然販售 → ITEM FUNCTURN／FUNCSALE → `SortDT` → `inc-period.cgi` 冠軍獎品／店內帳務／領地等 → 原版59項 PLUS／CheckWholeStore → 事件開始與結束等控制流。現有 B-44／B-45／B-46 是可執行且由固定 Perl 原文逐段對照的三個**相依階段**，尚未於同一 WorldState 及 HTTP 時鐘原子轉場連接。缺少的尤其包括事件啟動／結束與變更、完整城市及公會狀態、所有必要商品回呼、原版帳冊與檔案備份、期別合併和持續存讀檔後跨期。只有將必要功能全部按正確順序打通並通過原版 Perl／Node／HTTP E2E，才可解除現在跨期拒絕，否則不能聲稱遊戲完整可玩。
