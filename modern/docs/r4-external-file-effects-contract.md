# R4 第一階段｜真實資料檔案與外部副作用來源契約（2026-11-24）

## 2026-11-24｜R4 公會真檔案子工作包

新增 [公會持久化契約](./r4-guild-file-persistence-contract.md)：真原版公會定義、帳本、正負額、兩期 B-50、隔離多檔部分寫入及 marker 恢復。MakeGuildFile 不 reload %GUILD，WriteGuildData 仍用舊 keys；不把新公會缺帳本猜成零。僅已審閱檔案欄位、非正式 WorldState 提交；原版 hash 順序不宣稱等價。正式 36h fail-closed、eventState:null、R2/R3 原受控結論維持，R4/R5/R0/R1 全量未結案。以最後同一 HEAD 的 Push/PR Actions 為驗收依據；下一工作包軍隊/城鎮與主檔共同接合。

**判定：來源契約已追查，DataWrite 單店主存檔與 CloseShop 實際封存日誌的受限子集合加入真 Node/Perl 檔案差分。不是原子期末交易；B-50 仍 nonCommittable，36 小時跨期仍 fail-closed。**

固定原版：katelynn620/akimono-core commit 738d71a2985fd088f2ca90f25145706392ee2365；本庫未修改的 frozen write.cgi、lock.cgi、inc-func.cgi、core-detail.cgi、period.cgi 受 Git blob SHA 稽核。原版沒有獨立的 plug/read.cgi；實際主資料讀取為 inc-func.cgi 的 DataRead。固定原版 plug/user.cgi、plug/error.cgi 已新增不改動 SHA 副本 pinned-user.cgi、pinned-error.cgi 供真 Perl I/O 驗證；其他未在本庫保存的原版 plug/guild.cgi、guildsub.cgi、army.cgi、custom.cgi、config.cgi 也從該固定 commit 審閱，未將其當作可修改的 modern 原始檔。

## 原版實際呼叫鏈與先後關係

1. inc-turn.cgi 第 6–9 行：Lock → DataRead → ReadGuild → ReadGuildData。初次 Lock 會呼叫 DataCommitOrAbort(1)；inc-func.cgi 啟動時亦可對既存 marker 進行恢復。
2. 自然販售 → ITEM FUNCTURN/FUNCSALE → SortDT → 有店且跨期才執行 inc-period.cgi。期末先清公會 in/out、獎品、DragonBalance、UpdateResetBefore，再按店判斷 CloseShop、結算、EditGuildMoney、熟練與爵位，SortDT、城市結算、UpdateResetAfter、三代備份、Session mtime 清理、MakeGuildFile。
3. **所有時間片都結束之後**，inc-turn.cgi 第 371–383 行在公會來源 .pl mtime 較新時可能再次呼叫 MakeGuildFile，然後 WriteGuildData → DataWrite → RenewLog → DataCommitOrAbort(0) → UnLock。不可把期末子段純投影冒稱已提交。

## 函式、資料與失敗對映

| 定義／呼叫 | 來源讀寫、格式及條件 | 失敗、恢復與 modern 證據 |
|---|---|---|
| inc-func.cgi DataRead：inc-turn 期初 | 讀 data/play.cgi UTF-8：lasttime；people,nextid,blockip,taxrate,11 STATE（冒號）；79 批發 CSV；EVENT CSV；DTtown；//；每店 32 欄 index 與七段 showcase:price:item:itemyesterday:itemtoday:exp:user。AutoVar 支援延遲載入。 | open/read 未全面核對，無資料走 OutError；新 probe 透過實際第一期 live 檔重新執行原版 DataRead，第二期接續同店，僅安全單鍵 map。 |
| plug/write.cgi DataWrite：inc-turn 全片尾 | CheckLockStatus → 舊備份 mtime 時 DataFilesBackup → utime(lasttime.cgi) → 建立 data/temp/play.cgi → 頭部/批發/事件/城鎮 → SortDT 過濾 status=0 → 各店 32 欄和七段內容。大於 MAX_MONEY 截斷；foundation 空值重設。 | 原版 print/close/utime 並非嚴格失敗回報。新 modern/src/original-r4-data-write-files.mjs 在 SHA 固定、單一活店、可選停店、79 ITEM、32/11 schema、0–1-key map、無 money 截斷前提下序列化；真 Node stage/rename + 原版 Perl DataWrite/commit/reload 兩期位元組對比。**不代表正式 WorldState 寫入**。 |
| plug/write.cgi DataCommitOrAbort、plug/lock.cgi Lock/UnLock | 暫存 .cgi、data/commit.cgi marker、readdir 次序逐檔 rename；abort 無 marker 則 unlink，既有 marker 代表恢復而非 rollback。Lock 透過 rename 取得，開啟前處理上次 marker。 | 第二筆 rename 失敗可使第一筆 live 已更新、marker 仍在。沿用 B-13 world-commit.t 真多檔部分寫與恢復；B-14 lock-safety.t 是真 Core 行為。新 Node 單檔隔離測試注入 rename 失敗並復原，但**不提供真正跨程序鎖、fsync 或跨檔原子性**。 |
| plug/write.cgi DataFilesBackup | 當 play 備份 stat mtime 舊於 NOW_TIME-BACKUP_TIME，複製 log0/log1/log2/guildbal/play 到備份路徑，編碼 UTF-8。不同於期末三代 backup rotation。 | 原版 open/print/close 未檢查全部錯誤，缺檔可留下部分結果。B-15 world-backup-preflight 是新安全審核純投影；本階段尚未建立該函式完整真檔案失敗差分。 |
| plug/user.cgi SetUserData、SetUserDataEx、WriteDTSub | CloseShop 會呼叫 SetUserData，但該固定版函式只有註解、**實際 no-op**；DataWrite 中 SetUserData 呼叫也被註解。SetUserDataEx 只對 user map 進行百分比跳脫；獨立 WriteDTSub 才寫 subdata 下的 id-tag.cgi。 | 原版不會憑空產生專用 user 檔，不可將 CloseShop recorder 視為真 user 檔成功。尚缺 WriteDTSub 與其餘使用場景完整檔案審閱。 |
| plug/error.cgi WriteErrorLog：CloseShop、鎖錯誤 | LOG_SIZE_MAX=30000 且檔名非空時；原版檢查 log/delete.cgi size 大於上限，先嘗試 rename 為 delete-old.cgi，再用 UTF-8 append 寫 NOW_TIME、SCRIPT_NAME、REMOTE_ADDR、REMOTE_HOST、GetTrueIP、USER、msg 七欄 tab + LF；CloseShop msg 含原因、32 欄、七段並內嵌 LF。 | 包在 eval，rename/open/close 失敗可被吞掉；CloseShop 仍可能變更 status/money/rank 和刪 Session。既有 CloseShop 原版 Perl 真 unlink Session；新增 pinned-user/error 的原版 Perl 直接執行 CloseShop+WriteErrorLog 真 append、rotate、缺 log 目錄後仍關店與 Session unlink 的部分失敗，與 Node 真檔案 IO 差分；**正式跨檔一致性仍未完成**。 |
| plug/guildsub.cgi ReadGuild、GetGuildDirFiles | 讀 COMMON_DIR 中合法單詞 code 的 *.pl，排序並以 plug/config.cgi ReadConfig 解析 key=value；這是公會定義來源，非帳本。 | opendir/read 缺錯誤檢查；B-50 用 fixture，真正 .pl 檔案的缺檔/損毀/讀取仍未差分。 |
| plug/guild.cgi ReadGuildData / WriteGuildData | 讀 live data/guildbal.cgi：每行 guildcode + tab 交替 key/value；WriteGuildData 依 %GUILD 和 %GUILD_DATA 寫 data/temp/guildbal.cgi，後續由總 commit rename。 | Perl hash order 不定，單次鍵序不能硬編；真 IO 和多公會讀回尚缺。B-13 可提供跨多檔部分寫恢復，但非真 guildbal 來源驗證。 |
| plug/guild.cgi EditGuildMoney：period 各會員店 | **只修改 %GUILD_DATA 記憶體**：正額增加 in、負額增加 out 絕對值，money 增加原金額；店鋪另扣費。 | 本身不開檔，B-50 guildMoneyEdits 只是呼叫/數值投影；須接 WriteGuildData 與總 commit 後才可宣告持久化。 |
| plug/guildsub.cgi MakeGuildFile：period 尾、inc-turn 末按 mtime | 開 data/temp/guild.cgi，產生可執行 Perl 程式文字，含 GUILDIDX 常數與 %GUILD=...；可依消失/新增公會記日誌、改店 guild/user。 | hash 順序不穩，不能當 JSON 或穩定 keys；備份尾段現僅記 recorder，真 guild.cgi 落盤/讀取未驗證。 |
| plug/army.cgi ReadArmy / WriteArmy：rebel EVENT | live data/army.cgi 兩行，第一行 armyId,兵數交替，第二行 RIOT ID；原版 chop 行尾。寫入 temp/army.cgi 前刪不存在店 ID/零軍力；後續總 commit。 | 順序可能因 hash 改變、missing open 不一定報錯；R4 rebel/混合 EVENT 目前 IO stub，真軍隊檔與失敗/重啟尚缺。 |
| plug/custom.cgi SetTownData：EVENT 與其他城鎮入口 | 對 DTtown hash 的 key/value 進行 %hex 跳脫（控制字元、逗號、%）；空值刪鍵。**本身不開檔**，要 DataWrite AutoVar::Get(DTtown) 才保存 play.cgi 城鎮行。 | 多鍵 Perl hash 順序、非法字元與前後事件流程仍未完整差分。現有特殊 EVENT 仍為純來源投影。 |

## 實際工作包、與 B-50 的接合邊界

- 新 modern/tests/original-perl/original-r4-data-write-files-probe.pl 和 .t：在隔離 File::Temp 中執行原版 DataWrite + DataCommitOrAbort、以原版 DataRead 重載第一期 live 檔，驗證同一店連兩期；Node tests/r4-source-data-write-files.test.mjs 於獨立 mkdtemp 真實 stage/rename/unlink/recover，逐位元組與 Perl 比對；CI 為唯一正式驗證結果，不能用人工 expected 代替。
- 重用 B-13 真多檔實際部分寫、marker 恢復，B-14 鎖定，B-15 備份嚴格 preflight；R4 既有真 CloseShop Session unlink、三代備份及七天 Session 清理測試保留。以上不表示通用真資料檔全接上。
- B-50 projectOriginalSoloPeriodPhaseChain 在相同店/城兩期產生會費、關店、備份等來源**純投影**，不持有 DataWrite 完整 32 欄與實際 guild/army/guildbal 外部檔快照。新 DataWrite adapter 不自行填補缺少欄位，也不接受 B-50 投影當已提交；現階段是可重用 IO 契約與隔離檔案比較，**尚未同一路徑整合正式期末交易**。
- 仍待完成：CloseShop 封存＋Session＋主檔共同交易、guildbal/guild.cgi 真帳本、army.cgi、城鎮多鍵與原版 hash、WriteDTSub、DataFilesBackup 真失敗/恢復、多檔共同鎖、同一 B-50 資料直接寫入、36h 多時間片正向 WorldState/CAS/存檔/重啟。直到全部來源與一致性驗收，禁止跨期提交；R4、R5、R0/R1 全量不結案。

## 2026-11-24｜關店封存真 I/O 與 B-50 的有限接合

- 新未改動原版副本：modern/tests/original-perl/pinned-user.cgi（blob 46fe3b13e68ee83997aa919125ab210372af2822）、pinned-error.cgi（blob 16b619dffd91a3b67095177b7da464de264f1aa3）。新的 original-r4-close-shop-archive-file-probe.pl 與 .t 在隔離 File::Temp 實際呼叫原版 CloseShop、SetUserData、WriteErrorLog，而非 recorder；覆蓋真 log/delete.cgi UTF-8 append、>30000 bytes 輪替 delete-old.cgi，以及缺失日誌目錄時店舖已歸零／Session 已刪但封存未寫的部分失敗。
- 新 original-r4-close-shop-archive-file.mjs、tests/r4-source-close-shop-archive-file.test.mjs 以真 Node 檔案比對上述來源：實際 append、rotate、缺檔失敗必須拋錯而不得假報成功。始終 committable:false。
- 新 tests/r4-source-b50-archive-disk-chain.test.mjs **直接使用原有 B-50 兩期共同來源鏈**在第二期形成的 actualCloseEffect，將來源 archive payload 寫到真 Node 暫存 log。B-50 仍 nonCommittable:true；主檔、guildbal、army、Session 與封存檔尚未形成同一可恢復原子交易。
