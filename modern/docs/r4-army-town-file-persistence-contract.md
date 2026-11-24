# R4 軍隊／城鎮與共同檔案持久化工作包（2026-11-24）

**範圍：已審閱的原版來源子流程及真隔離磁碟；不是正式 R4 36h WorldState 交易。** R2/R3 原受控結論不變，eventState:null 仍未知，既有 CAS 與 HTTP 守門未放寬。最終驗收必須查相同 HEAD 的 Push／PR CI。

## 原版來源與檔案順序

固定上游 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。新增原文不改的 pinned-army.cgi（Git blob cd29bcbfe52bac84794c4c79426bd559d7616d85）與 pinned-custom.cgi（93d7f77df648df0c46e5dca4763afd3d2c48654b）。新 Node review 完整 blob SHA 核對 army/custom/turn/write/read；既有 guild 定義/帳本及 EVENT callback 來源審閱保留。

- ReadArmy 清空 ARMY/RIOT 後讀 **live** army.cgi 兩行 CSV：第一行 ID/兵力交替，第二行叛亂 ID。只過濾不存在店的 RIOT，不先刪 ARMY。WriteArmy 清除不存在店的 ARMY 與零兵力，保留當下 RIOT，截斷重寫 **stage** army.cgi。原版沒有在該回呼內 commit；每次 NOW 又從 live 讀取，而非從上一時間片 stage 讀取。
- 原版真連續三次來源 NOW：起始 4000，第一片 stage 2800；同 turn 第二片仍從 live 4000 減至 2800；提交後下一片讀 2800 減至 1600。城市與商店在記憶體連續接續；未宣稱完整三次 DataRead 重啟。沒有活動 callback 就不開 army 檔；原版缺檔可空表、無尾 LF 的 chop 可吃掉 ID、奇數 pair 可 undefined、重複 ID 覆蓋，Node 明示安全拒絕而非模仿損毀。
- SetTownData 只修改 DTtown：對 ASCII 控制 00–1f、逗號、% 做小寫 %hex，空字串刪 key，字面 0 保留，Unicode 與冒號可保留。GetTownData 先 **解碼輸入 key** 再查 map（不是對 key 做相同 encode）；對查到的值解碼。DataWrite 透過 AutoVar::Get 將 town CSV 寫在 play.cgi 第五行，DataRead 以 AutoVar tie/hash 重讀。新多鍵 town 專項序列化僅放寬這一欄、必須為已審閱編碼；原單鍵 DataWrite 及其他 map 守門不變。Perl hash 遍歷順序不保證，相同語意 map 比較，其他 play 行逐字比較。
- guildbattle END 真 ReadGuild、ReadGuildData 使用 live 檔；ReadGuild 更新 GUILD_DETAIL，勝者仍依目前已載入 GUILD 與 live 資金最大值（同額仍拒絕）。回呼設定 dominion 並向 GUILD_DATA 每公會加 transient guild=id；隨後 WriteGuildData 真寫入該欄。新增獨立、明示 event-ledger codec，僅允許這一欄及原五欄，不放寬舊 guild codec；期末清除 transient 的完整串接仍待做。
- 商店 callback army 欄不在原版 DataWrite 的 32 欄索引；它是當次記憶體資料，不能假稱永久保存。城鎮 STATE 與 DTtown 是不同資料，前者 11 欄、後者任意已審閱 key/value。

## 本輪實際可重現測試

| 測試 | 真來源及 Node 接合 |
|---|---|
| original-r4-rebel-army-disk-probe.pl/.t + r4-source-rebel-army-disk.test.mjs | 八個原版 period RebelRobin → END/START/NOW 原文片段執行，真 ReadArmy/WriteArmy、DataCommitOrAbort、live reload；同 turn 兩時間片及下一次 commit 後讀取；原版 malformed/missing 差分、Node 真 rename failure、marker recovery、abort。 |
| original-r4-town-play-probe.pl/.t + r4-source-town-play.test.mjs | 真 guildbattle DSL END 從實際 .pl/guildbal/guild.cgi 讀取，SetTownData/GetTownData 原文、多鍵 Unicode/百分比/逗號/控制字元與刪鍵，DataWrite→commit→DataRead 同一店兩次存讀；真 Node disk/recovery。不是全事件生命週期。 |
| original-r4-external-joint-probe.pl/.t + r4-source-external-joint.test.mjs | 同一原版 inc-turn END/START/NOW 片段（僅 rebel/guildbattle 兩個事件）中先公會 END、再叛亂 NOW，SortDT 先排除停店，WriteArmy 清零/不存在 ID，WriteGuildData 保留 transient guild，DataWrite 寫完整已審閱單店主檔；三個實際 stage 交同一真 DataCommitOrAbort，再 DataRead 同一店／城市／town 與 live guild ledger，下一 turn 無活動軍隊回呼、不重寫 army。Node 共同 sandbox 比對檔案、事件日誌、固定 RNG range、真第三檔 rename 失敗、marker/recover、無 marker 半成品拒絕與 abort。 |

新模組 original-r4-army-files.mjs、original-r4-town-files.mjs、original-r4-external-files-sandbox.mjs；重用原有純來源 projector 與已審閱 DataWrite/guild codec。所有結果 committable:false。原版探針僅 File::Temp，不觸真玩家檔；部分 helper 為隔離路徑/日誌/受控 RNG，沒有真遊戲 Lock/UnLock。三檔 Node rename 順序固定只是測試策略，不宣稱 Perl readdir/hash 順序。失敗中途已寫部分 live，marker 存在時 Node 禁讀及續傳復原，並非跨檔原子或 fsync 保證。

## 下一個主線工作包（不可重做本輪零件）

接入 B-50 實際期末的完整主檔欄位與同一來源自然販售 → SortDT → 36h → EVENT；整合期末公會 transient reset、MakeGuildFile、DataFilesBackup 真 mtime/缺檔/部分複製、CloseShop 日誌與 Session/backup 的外部副作用，以及全檔共同恢復。此處三檔 EVENT 子鏈未執行完整 B-50、其餘十五 EVENT、全部市場/商品/期末、完整 HTTP/CAS/雙世代或跨程序真鎖；不開放 36h，不宣告 R4/R5/R0/R1 全量完成。
