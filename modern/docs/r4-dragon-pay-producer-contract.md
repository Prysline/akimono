# R4 B — 龍族付款 producer / common commit 來源補正（2026-11-25）

本輪找到先前未知的付款生產者，不再將 drapay 當作未定位外部來源。
固定上游 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。

|來源|Git blob|觀察|
|---|---|---|
|plug/drlog.cgi|e60cda027c87de25585ee59bf64a4cb24b9d1476|WritePayLog 直接 append COMMON_DIR/drapay-街道；UTF-8 id TAB money LF；open 失敗 return，沒有付款 identity|
|plug/colock.cgi|99ff12db08135879e1a570cef1424f6dd5bec151|CoLock 的鎖位於 COMMON_DIR；CoDataCA 只處理 COTEMP_DIR 的檔案、common commit marker|
|plug/lock.cgi|84382170f1b7f70348c4e2a91bf30b1d1043b964|街道 Lock 使用 DATA_DIR；不是 common lock|
|inc-dr-edit1.cgi|e1b7319efb20ff56b5a2a04783906ca3b649bf2e|34–35 訓練/寄養費成對支出與收入；80 維護費；83–89 龍族檔案及共同提交|
|inc-dr-edit2.cgi|4085a0743b1a8e59d2d1eb0da62ca5af222f9f75|318/388/407 前三名獎金；20–25 race log/state/lasttime/common commit|
|inc-dras-dredit.cgi|3d995cc43a0c55c35903595ed2eb57805ece1578|76 龍族購買費|
|inc-dras-jkedit.cgi|15bdb1c3c6d039cb6de6dbbfdc04bd02b1fe91da|60 騎手設立費|
|inc-dras-rcedit.cgi|f6a3c3097bcd32cce74d0405c285c521c399668b|47 牧場設立費|
|inc-dras-stedit.cgi|be75e7b69096f1819cf15137b15bd62837e2f484|53/75 厩舍設立費|

新增 exact source copies pinned-drlog.cgi、pinned-colock.cgi（不修改上游原文），專項 .t 以 Git blob hash 驗證。真原版 WritePayLog、CoDataCA、DragonBalance 在同一隔離 File::Temp 路徑/rename adapter 內執行：common abort 後付款仍在；同額付款 append 兩次；common commit 不去重；不同街道同 ID 相互隔離；marker 恢復不消費付款；producer open 失敗沒有付款 receipt。此批為待 CI 驗證候選，不是正式玩家、完整龍族賽事、真跨程序鎖或完整 DataRead/WorldState。

安全接合待共同基線：producer 的 operation identity 必須綁定來源龍族操作、街道、店鋪、批次及 lineage；單純 amount/hash 不能辨識兩筆相同合法付款。付款 append 和 common state publication 不可再當成兩個無關動作；consumer 的 B43 slot 公布前不能刪除唯一付款證據。已公布但未清理時需可重入對帳，不能直接重算。仍需原版 producer/consumer 跨程序交錯與失敗差分，不以本隔離順序測試宣稱 race condition 已重現。未開放正式公會、龍族、領主或多店。
