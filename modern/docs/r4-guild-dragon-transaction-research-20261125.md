# R4 B — 公會玩家交易、龍族付款的來源接合研究（2026-11-25）

狀態：來源研究與隔離 Perl 測試候選，不是正式 WorldState/CAS 或 D2 退出。自 R4 已驗收 d2dccdacb83925b6f0121bd7311f92be2e18d2da 另開研究分支，不修改 R4/P3 共用核心、不動已固定跨期交接。所有新測試使用獨立資料，正式公會、龍族與多店仍 fail-closed。

## 固定原版證據
上游 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365：
- plug/guild.cgi blob 6593aa8a3ae4a1695c2418f12a3776f0053454ac（本庫既有 pinned-guild.cgi 原文相同）。
- buy.cgi blob 79ec6f92d873883dddc5e6442dcb4694638515d2，第 34–37 行報價。
- buy-s.cgi blob 6ba8df9a733ed16c490389414cd94934fe1185ca，第 11–15、34–68、70–80、89–105、126–132 行。
- inc-period.cgi blob 6183e88e9dd69a16606a1064c8084e9a1411dbd5（本庫既有 period.cgi 原文相同），第 4–10、31–35、93–104、225–240 行。

## 公會交易：不同於期末會費
CheckGuild 回傳 type, rate, margin；無公會一方或雙方時 0,1000,0。雙方有公會時，使用**賣方公會** dealrate；同公會 type=1、rate=1000-dealrate；異公會 type=2、rate=1000+dealrate；margin=int(baseprice*dealrate/1000)。
若 %GUILD_DATA 為空，原函式直接 ReadGuildData，即使 margin=0。只有非零 margin 且同公會 treasury<10000 才改 type=-1,margin=0，**rate 不會還原**。10000 是固定門檻，不是本筆交易補助足額檢查。單價四捨五入不可替代 int。買方實付 baseprice +/- margin，非 baseprice*rate 再整數化。
buy-s.cgi 正式再次 CheckGuild 並核對售價、商品、庫存；依庫存/現金裁量，時間和稅以 baseprice*最終數量計，賣方入帳 baseprice*數量-tax，買方扣實付。type=1 從買方公會支出 margin*數量，type=2 給賣方公會收入 margin*數量；type=-1 不補助也不做售罄人氣扣減，type=1 同樣略過。type=1/2 即使 margin=0 仍呼叫 EditGuildMoney 及 WriteGuildData；同筆可能把補助金扣成負數，不能把原版擅自改為按數量重新檢查足額。期末負公會金庫刪 .pl 及暫態定義生命週期沿用既有來源研究，不在此自動解鎖。
交易尾順序 WriteGuildData (type>0) → RenewLog → DataWrite → DataCommitOrAbort → UnLock，與 inc-turn 尾 WriteGuildData → DataWrite → RenewLog 的順序不同。不可把所有命令套同一原版寫入順序。完整買入仍需 FUNCBUY 原版分派、交易雙店 CAS、真金庫和稅/時間差分，非本次測試的範圍。

## 龍族付款：原版有未受共同 commit 保護的外部消耗
DragonBalance 在期末 UpdateResetBefore 前執行：GetPath(COMMON_DIR, "drapay-"+MYDIR)；open 失敗直接 return；讀取所有行並 chop，每行依 id2idx 查找累加 dragon，未知 ID 跳過；末尾直接 unlink，沒有檢查 unlink 結果。既有 original-r4-dragon-balance 真檔案 Oracle 已覆蓋重複 ID、缺檔、空檔、CRLF、缺 LF、負值等；不重做。原版此處早於最終 DataWrite/commit，付款檔可能已消失而主檔尚未發布；反之 unlink 失敗時可能保留付款檔。不能把 projectR4DragonBalance 的 payoutFileConsumed 布林當成正式檔案交易證據。上游外部付款生產者與跨街道併發來源尚未確定。
目前 independent-world-disk 明確要求 live guildbal.cgi 空字串及固定空 guild.cgi；不製造帳戶、Session、龍族、公會。既有 sandbox guild codec 受限單公會/非負起始，與原版同時多會員、負庫房來源邊界不同。

## 新隔離證據及共同基線待接點
新增 original-r4-guild-trade-edge.t，直接 require 現有 frozen pinned-guild.cgi，真執行 CheckGuild/ReadGuildData/EditGuildMoney；以 File::Temp 隔離真帳本，測 9999/10000、零 margin、賣方 rate、type=-1 rate 保留、批量支出負金庫及異公會收入。不是完整 buy-s.cgi 交易 Oracle，未執行正式 player/CAS。
下一可執行點：在獨立 harness 直接擷取 buy-s.cgi 交易數值區段、以同源兩店合法資料與 tax/time 函式差分，先保留非提交候選；後續共同基線才接唯一 CAS/HTTP。龍族付款需先驗證 unlink failure、讀檔後發布前失敗及重啟的 source oracle，再設計受驗證的付款 identity/消耗 receipt，B43 slot 發布前不得刪除唯一來源；實際發布後才以可重入復原完成外部處置。新安全協定不是原版 CGI 失敗行為等價。尚無真付款生產者、跨程序鎖、正式共同外部交易或長期清理驗收。
