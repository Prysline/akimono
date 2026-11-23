# B-50｜同一間商店／同一座城市，原版期末前半段連續兩期對照

> 工作分支：\`test/task02-baseline-on-s1\`。**僅為固定原版期末程式的整合來源證據，尚不可提交玩家 WorldState、尚未開放36小時跨期。** 不得以這份測試代替真實的原版 \`inc-turn.cgi\` 全部事件、商品回呼、備份及持續營業。

## 本次真正前進的部分

B-44～B-49 的主要侷限是把原版各功能獨立跑過。B-50 首次讓**同一筆原始商店資料及同一筆城市資料連續經過兩次真實期末前半段**，並且讓 Node 使用同一批輸入逐欄核對，不是拼接各份不同樣本的測試結果。

- [實際原版 Perl 同狀態兩期探針](../tests/original-perl/original-b50-period-chain-probe.pl) 在每次開始先真執行固定 Core \`GetDTPoint/SortDT\`，隨後動態擷取、原樣執行原版 \`period.cgi\` 從清算公會日帳至 \`UpdateResetAfter\` 結束的**整個原始程式前綴**；使用真正的 Standard Street \`UpdateResetBefore\`／\`UpdateTodayPrize\`／\`UpdateResetAfter\` 及原始 Core \`AddItem\` 和 \`RebelRobin\` 守衛。
- 原版獎品、商品持有限量、期末收支、熟練度、排行榜兩次排序、城市人口治安及守軍軍費都使用**同一個 $DT[0]、$STATE 及 $DTpeople**，第二期接續第一期的庫存、維持費及城市數值。
- 探針使用原版79商品 DSL 上限；原始 \`@@ITEM\` 與 \`no\` 行可能有行尾註解，解析必須保留第10號「書本寫作工具」，不得因註解漏掉來源商品。獎品第一輪選禮物卷5枚、第二輪選看門機器人1架，原版 \`AddItem\` 容量與商品量連續累計，商品、維持費與城市人口都不能在兩期之間重置。
- [Node 同狀態純投射](../src/original-period-solo-chain.mjs) 依照來源經過：期前 \`SortDT\` → 冠軍次數／獎品 → 單店帳務與成本 → 期後 \`SortDT\` → 無領主城市人口／治安／軍費。其來源審閱門檻另外核對固定 \`period.cgi\` 的 **\`UpdateResetAfter\` 原版後置熟練度技術檢查**。目前只容許熟練度總和不超過4000的情境（該回呼不進入刪除技術道具分支），不假裝技術遺忘規則已處理。
- [Node 測試](../tests/b50-period-same-state-chain.test.mjs) 將每期**整張商店與整張城市**逐欄和 Perl 實際輸出比較（不是少量挑選欄位），第二期從上一期原始輸出接續；同時證明「不提交玩家世界」及碰到公會、龍賽、來源期限／異常欄位、過高熟練度等未審核分支會拒絕。[Perl 斷言](../tests/original-perl/original-b50-period-chain.t) 確認兩期來源效果及資料連續性。

## 來源準確性與限制

測試固定商店是在真來源當期銷售／支出及書本商品 #10 的經營狀態下驗證；未使用 B-43 玩家存檔來直接跨期，也未調用 \`/api/advance-time\` 超出原版36小時邊界。原版程式原樣執行的部分結束於備份／session 的外部檔案副作用之前；**DragonBalance 只允許沒有待支付龍賽、領主叛亂早退、空公會、沒有活躍事件、沒有關閉店鋪、技術遺忘回呼不觸發**。這些是測試**明確未處理**的來源分支，不能解讀成原版不存在。若原始來源改變任何被審核的程式順序，Node 應拒絕投射而非隱藏差異。

本次仍**不**支援：完整 \`inc-turn.cgi\` 自然販售到期界切段、全部來源商品 \`FUNCTURN/FUNCSALE\`、所有 \`%EVENT\` 的實際回呼及亂數次序、多店競賽、公會／龍賽收益、原版完整期末後的磁碟備份與 session、真實跨期的 GameCore CAS 及 B-43 儲存重啟後在新一期繼續經營。因此**繁中瀏覽器仍必須拒絕跨36小時**，直到所有必要依賴在同一個合法世界狀態按原版順序成功執行、入盤後可重啟續營。

## 下一個可操作的里程碑

首要的開發順序不是新增更多單獨的原版公式測試，而是把 B-50 的原版單世界結算連續性移到**真 WorldState／Street Module／GameCore 期末轉場**，補上原版城市與活動需要保存的欄位、動態商品及事件回呼與亂數順序、完整期末檔案效果的合法替代方案。原版 Perl／Node／HTTP 對照必須涵蓋跨期前來源真買貨／真自然售出，跨界結算到下一期及落盤重啟後持續經營，且失敗、重試或斷電不能重複發獎或扣費。**只有此玩家路徑通過後，才進行使用者要求的一次集中人工驗收。**

## 2026-11-23｜R4 已選擇性接入原版 DragonBalance（舊 B-50 預設仍嚴格拒絕）

新來源 reviewer 與投影 original-r4-dragon-balance.mjs 直接使用凍結 `period.cgi::DragonBalance` 的真檔案／每店龍賽帳務；新原版 Perl `original-r4-period-dragon-chain-probe.pl` 執行 B-50 相同兩期期末備份前綴，但將 DragonBalance 原樣執行，使用暫存 drapay 收支檔第一期 +500、第二期 -1000；Node `r4-period-dragon-same-world-chain.test.mjs` 透過 includeReviewedDragon=true opt-in 按真正期末階段原序逐欄比較兩期全部店鋪、城市與獎勵。兩期合併後 drmoney 回到零，第二期 payyesterday=517（500 淨龍賽支出與 17 維持費）。既有 B-50 不選擇 opt-in 的所有 Dragon 拒絕與舊回歸完全保留。

這不等於原版完整跨36小時可提交遊戲：公會會費、爵位、老店關閉、真正 file/session 備份及 WorldState／CAS 等仍未審閱，所有新投影標記 nonCommittable:true。

## 2026-11-23｜R4 新增同世界 Guild／爵位／UpdateResetAfter 技術遺忘 opt-in

本節**取代前述歷史階段中「公會會費／爵位／高 EXP 技術遺忘仍未審閱」的描述**，但不改動舊 B-50 預設的嚴格拒絕。新 `original-r4-period-all-finance-source-probe.pl` 和 `original-r4-period-high-exp-tech-probe.pl` 用未改動的 `period.cgi` 備份前完整前綴連續結算同一間店鋪與城市；真 DragonBalance 暫存檔每期讀取／刪除，外部 `EditGuildMoney` 僅記錄呼叫，爵位 `rand(100)` 在來源位置抽樣，四技術在原版 `UpdateResetAfter` **於第二次 SortDT 和城市之後**按序擲 `rand(14000)`。第一期遺失 #18 和 #24，第二期承接庫存遺失 #19、保留 #38；獎品／城市／公會／龍賽不因這些操作變更來源階段順序。Node 每期整張商店／城市與原始 Perl 差分一致，保留非提交標記與未知來源拒絕。

最後程式驗收 SHA `09a11a2ac73de26a8c76d777d768a4b79028211d`：Push #45122232062、PR #45122236936 雙成功，Node 1094／1094、Perl 2210／2210（71 .t）。這仍**不代表**完成原始跨 36 小時可存檔經營：多店、真公會檔案、老店關閉、原版完整 EVENT／時間切片、備份與 session、WorldState／CAS／HTTP 重啟尚未整合，見 [R4 退出清冊](r4-exit-audit.md)。
