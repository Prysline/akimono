# R4 原版研究：公會設立、代表與跨街道同步（2026-11-25）

只確認原版；不新增現代版功能。固定上游 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。前一 HEAD 9efa27730e97692419b18c76dd20c8a63ac9aaf0 CI 45483500989 已通過：1198 JS、2717 Perl、93 .t。現有公會費用、攻擊與負金庫刪檔、MakeGuildFile 基本行為已有原版證據；本輪補上設立入口及不同街道資料分工。

## 設立與編輯
- 本專案 _config.cgi blob 87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0 L65–68：DIG_POINT=0,1,2,4,8,16,32；DIG_FORGUILD=16。gd-f.cgi（4b3b8e2cb117e98aa82449c7943bb498c7ca1590）L9–22 有公會進編輯，否則爵位不足16不顯示設立。L29–30 編輯 UI 以本街 id2idx 中團長 ID 存在且非本人為拒絕條件；不是完整跨街道身份檢查。
- gd-b.cgi（712cacab0ce4accdff2f6fc6ff4b5cb71f1678c5）L4–39：CoLock→DataRead→CheckUserPass→ReadGuild/ReadGuildData→驗證→GuildImgUp→BuildGuild→CoUnLock。沒有明示爵位門檻、既有入會拒絕、編輯者團長身份比較或額外建會金額扣款；不推論全部部署授權。leadt/leader 由當前 MYDIR/DT.id 填入；正常 UI 每街一代表，BuildGuild 把 OtherDir 對應欄寫入；空值 ReadConfig 不保留。未見 handler 驗證代表是否同公會、存在或符合資格。
- 欄位長度由原 CutStr 控制：name30、shortname12、dealrate4、feerate4、member6、comment30、appeal120、needed120、leadt10、leader10、url60；&/</> 轉義。rate 只數字且10–500（千分比1–50%）；code 檢查非 a-z 字元，UI 說10字但 handler 未明示長度限制。設立需要上傳及不存在同 code 的 .pl；edit 不要求圖片，可保留舊圖。
- L63–94 實際圖檔按 MIME 含 gif 接受，直接 live 寫 common/<code>.gif，未在此處驗證像素/內容；定義 common/<code>.pl 也是直接 live 寫，非 CoDataCA stage。L41–50 非 edit 在 common 解鎖後再取 street lock，重新 DataRead/CheckUserPass，DT.guild=code，DataWrite/commit/unlock。edit 不改該街成員歸屬。若後段 street 失敗，前段 common 已寫的檔案未由此 handler 回滾；本測試在 street DataWrite adapter 注入失敗，不是全原版磁碟 commit 失敗實測。

## 共同定義 vs 每街帳本
- _config.cgi L124/155–184：COMMON_DIR=../common，DATA_DIR=./data，TEMP_DIR=DATA_DIR/temp，COTEMP_DIR=COMMON_DIR/temp，GUILD_FILE=guild，GUILDBAL_FILE=guildbal。inc-func.cgi L80–84 單參數 GetPath 取 DATA_DIR，L27 require 當街 guild。共用 .pl 定義與代表不等於共用金庫。plug/guildsub.cgi ReadGuild 讀共同 .pl 到 GUILD_DETAIL；MakeGuildFile 生成當街 guild.cgi、未更新當前 %GUILD。plug/guild.cgi ReadGuildData/WriteGuildData 只讀寫當街 guildbal.cgi，按當前 GUILD 鍵輸出。
- inc-turn.cgi L6–9：當次先 Lock/DataRead/ReadGuild/ReadGuildData；L368–381：共同現存 .pl 中最大 mtime > 當街 guild.cgi mtime 才重建；相等不重建。若只刪除 .pl，沒有較新的剩餘檔案，這個 gate 本身不一定發現刪除；inc-period.cgi L202 每期期末無條件 MakeGuildFile。這是來源推論，mtime gate 已有舊原版實測，本輪不重做。
- 已知原版刪定義：gd-s break L72–77、inc-period L4–10 金庫<0 直接 unlink common .pl。此處並非說已證明全部解散入口；尚未找到玩家主動解散的獨立入口。MakeGuildFile 清掉舊 GUILD 存在而 GUILD_DETAIL 消失的本街所有成員 guild/_so_e，記錄滅亡；其他街須等自己的 rebuild。單刪 .pl 不會由該函式刪 .gif；同次 WriteGuildData 仍按舊 GUILD，重讀新版定義後再寫才移除舊帳本鍵。新 guild 也先可能無 ledger row，不假定初始資金。若原版手動從共同目錄刪檔的原因未證明，測試以 fixture unlink 模擬已知消失邊界。

## 新原版驗證候選
original-r4-guild-establishment.t：真 frozen gd-b CGI、CutStr、ReadConfig、ReadGuild/ReadGuildData、MakeGuildFile、WriteGuildData、EditGuildMoney，真 CoLock/CoUnLock 及 common 隔離檔案；兩個 File::Temp 街道目錄共用 common，生成/帳本 stage 由測試 driver rename，不宣稱實際街道 commit；身份、街道讀寫/lock/commit、UI 為 adapter。GIF 只是 opaque 測試 bytes。測試資料不代表真玩家已獲爵位或合法建會路徑。無現代版實作；新增 CI 未驗收。
