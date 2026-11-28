# R4 城鎮決算與 RebelRobin 同狀態候選

共用 B46 既有領土計算前半段，新增完整原版領土區段 opt-in 候選，不改正式 unled period 路徑。原版 DataRead 的 DTusercount 與 SortDT 後有效領主索引分開；前者計算人口，後者決定反亂觸發／義勇軍歸屬。原版順序：收稅、人口、開拓治安、守軍不足、支出、RebelRobin 或延長既有反亂、義勇軍併入、破產裁減、領主歸屬。RebelRobin 須讀到扣除支出後的暫時負城市資金，不得提前清零。

10 個真原版完整領土區段與 RebelRobin 差分、RNG 範圍、原版日誌及人口；Perl 外部 DataRead/SortDT 會員集合與 RNG 是隔離輸入。未接正式多店、領主稅率或完整 period/CAS，不是玩家反亂驗收。正式目前仍只允許原有單店無領主來源路徑。新 CI 待驗證。
