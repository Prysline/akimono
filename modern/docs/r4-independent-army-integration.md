# R4 軍隊獨立來源正式接線候選

沿用 #18，不新增工作分支。P5 已正式合併並同步，經營共用規則仍由 #22 負責。

- 來源：既有 army-s handler、army codec、原版傭兵所 army.cgi（ed89b1213ec236eb224dac048314be4073c30566），原版 UI 完整 2400／600 秒資格；handler 隔離測試仍保留可形成時間債的差異。
- 獨立單店模式加入 HTTP /api/army-hire、/api/army-fire、伺服器 quote、傭兵所 UI、正式歷史指令 schema、完整 CAS 重算與同一 v2 immutable source file generation。正數數量及 revision 由 client 提供，爵位、金錢、時間、兵力和價格由 server 驗證。原版 army.cgi 缺檔直到首次合法寫入，只有 live generation 包含 army.cgi，原版五檔備份不變。
- 爵位下降不自動刪兵；現兵力超過上限時不得繼續僱用，仍可解僱。獨立模式只允許已審閱普通 EVENT；反亂價格 1500 已有原版 handler 與 view 隔離差分，但正式反亂生命周期未開放，因此拒絕未授權 rebel/RIOT。不能假稱反亂正式可玩。
- 來源候選、隔離 adapter、真玩家零爵位拒絕與重啟測試分開。尚無真玩家 20000 點、完成宮殿及取得爵位的正向證據，不能宣告成功僱兵驗收。所有新測試以實際新 HEAD CI 為準；來源日誌中文文字是明示 local adapter，不宣稱原版日文格式逐字一致。
