# R4 公會持久化工作包（2026-11-24）

## 2026-11-24｜R4 B-50 期末主檔、備份、封存及日誌共同子鏈

新增 [B-50 期末真檔案整合契約](./r4-b50-period-disk-contract.md)。真原版單店 B50 一/兩期全段期末、DragonBalance、CloseShop+真 archive、三代 backup/session 清理、每期 MakeGuildFile、transient guild reset、最終 WriteGuildData→DataWrite/DataFilesBackup→RenewLog→四檔共同 commit→DataRead；Node 由 live 讀取、真實 stage/recover、原版 log/mtime/失敗差分及 ready 摘要拒絕不完整 stage。屬明示空 EVENT、固定受控 RNG/每期 NOW_TIME 與隔離檔案，非全 inc-turn、正式 WorldState 或跨期授權。舊 36h fail-closed、eventState:null、R2/R3 保留。下一主線是既有自然販售/ITEM/SortDT/59 PLUS/完整 17 EVENT 與期末檔案同一來源連續整合，之後才正式 CAS/HTTP/save/restart。以最終同 SHA 雙 CI 為驗收依據。

## 2026-11-24｜R4 軍隊／城鎮及三檔共同 EVENT 子鏈

新增 [軍隊、城鎮及共同檔案契約](./r4-army-town-file-persistence-contract.md)。真原版 ReadArmy/WriteArmy、SetTownData/GetTownData、DataRead/DataWrite、多鍵 town、同 turn 多次 NOW live/stage 差異，及兩個特殊 EVENT 同一原版 END/START/NOW → army.cgi/guildbal.cgi/play.cgi 共同暫存與 commit/reload；原版 guildbattle transient guild=id 已獨立 codec，舊五欄仍嚴格。Node 真第三檔 rename 失敗、marker 復原；僅隔離來源子鏈，不是全 17 EVENT 或完整 B-50/WorldState，既有 36h fail-closed/eventState:null 不變。最終同 SHA Push/PR CI 為驗收依據。下一工作包完整 B-50 主檔與 DataFilesBackup、封存/Session/備份共同恢復及正式跨期正向整合；不再重做公會／軍隊／town 已驗收子集合。

範圍：隔離來源差分與 B-50 子鏈，不是正式玩家跨期交易。所有 adapter 維持 committable:false；既有 WorldState/CAS、eventState:null 守門與 R2/R3 受控結論不變。

## 實際來源

固定上游 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。新增未改原文快照 pinned-guild.cgi、pinned-guildsub.cgi、pinned-config.cgi、pinned-sub.cgi；Node 完整 Git blob SHA 核對（另含 write.cgi）。

- ReadGuild 讀 COMMON_DIR 合法 .pl 並排序，ReadConfig 去除 # 後註解、將 < > " 跳脫。GetString 產生 Perl 字串；本 adapter 僅接受無單引號、反斜線、控制分隔符的已審閱名稱，不猜測原版特殊跳脫。
- ReadGuildData 清除記憶體後讀 guildbal.cgi UTF-8 TSV；EditGuildMoney 正額加 in、負額絕對值加 out，money 加原額。WriteGuildData 按當前 %GUILD 鍵輸出暫存帳本。原版 period 開頭每期重設 in/out 並刪 guild 臨時欄；負資金刪 .pl 分支尚未整合，本受限 B-50 adapter 拒絕負資金起始狀態。
- MakeGuildFile 生成 executable guild.cgi；刪除公會會清會員 guild 與 user._so_e、記錄滅亡訊息，新公會記錄成立。**並不 reload %GUILD**，因此同次 WriteGuildData 仍使用舊鍵。測試刻意覆蓋 old 消失、beta 新增的帳本/定義差異；重啟若兩者鍵不一致，Node 拒絕猜測新公會資金。
- 原版所有時間片完成後才 WriteGuildData / DataWrite / RenewLog / DataCommitOrAbort。期末可生成暫存 guild.cgi；inc-turn 末 mtime 條件亦可生成。本輪明示調用 MakeGuildFile，另新增真 mtime 判斷隔離差分；尚未整合全部 inc-turn。
- Perl hash 與 readdir 順序非固定；只比對解碼後公會與帳本資料、確定的日誌，以及失敗恢復不變量；Node 固定 sandbox 檔名順序不是 Perl hash/order 等價。

## 可重現測試

- original-r4-guild-files-probe.pl/.t：實際原版 ReadGuild/ReadConfig/GetString/MakeGuildFile/ReadGuildData/EditGuildMoney/WriteGuildData/DataCommitOrAbort，File::Temp 中生成兩個檔案，正/負/零額，移除會員、成立/滅亡訊息；第二次 rename 注入失敗後 marker 保留並 recover。OpenAndCheck/GetPath/RenameAndCheck 是隔離 adapter，未執行真 OS 遊戲鎖。另 --stable 同兩公會重新讀檔後再次編輯/寫回。
- original-r4-b50-guild-ledger-probe.pl/.t：真原版 B-50 同店兩期，改用合法 .pl code guild_a；每期直接執行原版 EditGuildMoney（保留 recorder 作比較）、攻防與期初收入支出重設。兩種案例：兩獨立 turn 的帳本重載；--one-turn 兩期在記憶體相接、期末生成定義，但僅所有兩期結束後寫帳本/總 commit。龍付款、關店、Session 等既有 source prefix 保留，原版備份尾段與封存日誌仍非這次共同交易。
- r4-source-b50-guild-ledger.test.mjs：共用 projectOriginalSoloPeriodPhaseChain，真 Node 單帳本磁碟重讀、兩期末單次 guild pair stage/commit；同一商店/城市/公會狀態串接。
- r4-source-guild-files.test.mjs：實際 Node 檔案，讀回解碼對照 Perl，真第二檔 rename 失敗（目的路徑為目錄）、marker 恢復而非 rollback、無 marker abort、缺帳本/非法定義/來源漂移、半成品暫存不准新提交、穩定雙公會再次讀寫。

## 界線與後續

- 受控公會檔工作包的正向及錯誤路徑已加入程式及回歸。僅固定欄 money/in/out/atk/def、受控定義欄 shortname/dealrate/feerate、合法 ASCII code；未宣稱所有歷史公會設定、零/缺欄、負資金刪檔、未初始化新公會或多會員期間費用完整可提交。
- 原版部分寫入不是跨檔原子性；沒有 fsync 或真跨程序鎖。正式資料/主 play/army/封存/Session/備份尚未共同接合；B-50 仍 nonCommittable。不可將 eventState:null 當空事件，36h fail-closed 保留。
- 下一窗口：army.cgi / SetTownData 真來源與 B-50 EVENT/期末的同一世界檔案接合，繼而完整 DataWrite 主檔、DataFilesBackup 失敗恢復及多檔 WorldState/CAS/HTTP 真跨期重啟；R4/R5/R0/R1 全量均未結案。

## 原版錯誤與新版安全界線

新增 original-r4-guild-file-edge-probe.pl/.t：真 ReadGuildData 缺檔可空表、損毀 TSV 可部分讀入、非法 rate 可直接輸出至 Perl 定義；Node 嚴格拒絕。原版 period 負資金會 unlink 公會 .pl、重設 in/out、刪 transient guild 欄，但已載入 GUILD_DETAIL 仍可生成舊定義，直到下一次 ReadGuild 才消失。此為已觀察的真來源邊界，Node 不模擬負資金刪檔。原 inc-turn mtime block 真 File::Temp 的 older/equal/newer 三案與 Node guildRebuildNeeded 差分；缺 generated 檔的原版隱式 coercion 不開放。
