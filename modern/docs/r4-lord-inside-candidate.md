# R4 領主內政指令：獨立原版差分候選（未接正式 runtime）

基線 6e35b17b109f939a8d4f04f455c5d5cb60872592。已取得領主的長程路線不改；原完整回歸仍以實際 CI 為準。本批僅新增測試支援及獨立差分，不改 src、HTTP、UI、存檔、原版或現有工作流。

- pinned-lord-s.cgi Git blob 8754dabf130a521aa243fc0568910d5f52523362。Perl probe 執行完整原版 CGI inside 入口，外層身分、讀檔、寫檔、提交與顯示均為 adapter；比較完整 fixture、日誌與尾段順序。
- 明示半形非空數字輸入：稅率 0..40，開拓與治安預算各 0..10000000；修改政策不立即扣城市現金、不改店現金或時間。稅率不變不產生稅率變更日誌。原 inside 未禁止反亂期間修改政策。
- 原版 raw handler 在 auth adapter 下可由非領主呼叫、空值可轉零；候選獨立拒絕非當前領主、過期 revision、空值及未審閱事件，不將 raw handler 寬鬆行為當授權。committable:false，未註冊正式指令。
- 14 組實際原版政策差分（含拒絕）及兩組守門測試。可執行：cd modern && node --test tests/r4-lord-inside-source.test.mjs。提交時尚待 CI 實際驗收。

後續需鎖定原版 UserTaxRate/GetSaleTax、各稅率模式、自然販售、期末 taxin 及 play/shop wire 欄位，再驗證 CAS/history/存讀檔和真玩家領主操作；不可把目前候選視作非零領主稅率正式驗收。
