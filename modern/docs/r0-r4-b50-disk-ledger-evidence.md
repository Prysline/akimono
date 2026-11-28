# R0 第十八批：R4 B50 公會帳本與跨期磁碟逐檔證據

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。兩組 Perl probe 皆使用固定單店、guild_a、人工庫存／EXP／資金／payout 與明示 draws。公會 probe 執行 period pre-backup prefix，原版 CloseShop 的外部 SetUserData/WriteErrorLog 為記錄 stub；period disk probe 另執行 backup/session tail，載入原版 SetUserData/WriteErrorLog/PushLog/WriteLog/RenewLog、DataRead/DataWrite/DataFilesBackup/DataCommitOrAbort，原版函式於 temp directory 及受控 wrapper，非全 inc-turn。第二組實際清除 process-owned Perl globals 後 DataRead（非新程序），並注入第三次 rename 失敗。Node 對應 stage、檔案 receipt、recovery 可在 temp disk 運行，但 committable=false、worldStateWritten=false，非正式 v2 存檔或全域原子交易。

## r4-source-b50-guild-ledger.test.mjs
- Blob: `262cb992337ee4db069af0d35f9ddcc8d485c316`。
- 斷言：54–75：兩期逐次 ledger read/persist、guildMoneyEdits、guildContext、重讀解析相等、負 atk 不改檔；76–80：來源 drift／缺欄／重複 key；82–120：同一次隔離 turn 兩期 state continuity、stage ledger 不提前改 live、最終 guild ledger/definition 差分。
- 執行：execFileSync original-r4-b50-guild-ledger-probe.pl；projectOriginalSoloPeriodPhaseChain、persistGuildPeriod、stageGuildFiles/commitGuildFiles；mkdtemp。
- 邊界：人工單店／單 guild_a、固定時鐘／亂數與龍族 payout；隔離 guild ledger IO，非正式玩家加入公會、跨程序 CAS、原子 WorldState 或 v2。
- 分類：有效（Perl Oracle／Node 差分（隔離公會磁碟）），非正式玩家。

## original-r4-b50-guild-ledger.t
- Blob: `0f9452a3c3cd0fdf84bb9e622dcf0f6682997aa0`。
- 斷言：6–10：執行 probe 並解碼；11–20：separate/one-turn 各兩期帳本連續、EditGuildMoney treasury、次期 income reset、MakeGuildFile；21–23：第一期是否實寫、最終帳本語義一致。
- 執行：original-r4-b50-guild-ledger-probe.pl 執行固定 period prefix、原版 guild/MakeGuildFile/WriteGuildData/DataCommitOrAbort/ReadGuildData，rename sandbox。
- 邊界：固定兩期、單 guild；外部 SetUserData/WriteErrorLog 為記錄 stub，實際 temp session unlink 與 payout file；未執行 period backup tail/full inc-turn。
- 分類：有效（Perl Oracle（隔離公會磁碟）），非正式玩家。

## r4-source-b50-period-disk.test.mjs
- Blob: `773567de97be906a306e8db5cd410b1119f53a81`。
- 斷言：76–132：人工檔案／mtime、stage B50、逐期 shop/town/guild/log/backup/expiry/subdata、live play/guildbal 未提前改；133–149：一／兩期 final commit、重讀 active/empty、transient 欄位清除、stage/marker 清除；150–172：Node 第四 rename 失敗 recovery、不重播、缺 log 的 incomplete stage 拒絕；173–180：未知 EVENT／缺欄／多鍵拒絕；182–194：原版第三 rename 失敗 recovery；196–214：ready receipt 防 stage/已搬移檔變更；217–236：人工 sparse CSV、EVENT 順序、多鍵 codec、拒絕。
- 執行：execFileSync original-r4-b50-period-disk-probe.pl；stageB50PeriodDisk/commitB50PeriodDisk/readPeriodPlay/serializePeriodPlay；mkdtemp。
- 邊界：真 temp disk 但原版舊 play/guildbal/log/backup 檔案，committable=false/worldStateWritten=false；不是正式 v2 或全域原子交易。happy/plusup-tetu codec 僅人工 key，不證明 EVENT runtime；沒有真時鐘、真 RNG 或跨程序崩潰證明。
- 分類：有效（Perl Oracle／Node 差分（隔離 B50 磁碟）），非正式玩家。

## original-r4-b50-period-disk.t
- Blob: `a464de4166f2345849d24098e6eef71505dedb95`。
- 斷言：11–28：一／兩期 stage→live、原版 DataRead 重讀、舊 live backup、log rotation/equality、mtime、第二期關店 archive 與 backup generation；29–34：原版第三 rename 注入失敗、marker、兩檔待搬及 recovery 結果。
- 執行：original-r4-b50-period-disk-probe.pl；原版 period prefix+tail、DataWrite/DataFilesBackup、CloseShop、RenewLog、DataCommitOrAbort、DataRead/ReadGuildData，temp directory。
- 邊界：人工單店單 guild，兩期 1000000/1129600，明示 draws/payout；原版函式在受控 wrapper 內執行、rename 可故障注入，非正式 v2/full inc-turn 或真 process restart。
- 分類：有效（Perl Oracle（隔離 period disk tail）），非正式玩家。

## 不升格功能矩陣

本批以共用 period／guild／IO 契約與來源證據為範圍。guild fee ledger 並非 guildbattle EVENT，人工 happy/plusup-tetu wire codec 非 EVENT callback；人工 shop inventory 不代表 ITEM 合法取得，不新增 ITEM/USE/EVENT 的正向旗標。原版第三 rename 與 Node 第四 rename 是不同故障注入，兩者均不證明 crash-safe、跨程序或正式 v2。前置 archive/log/session/backup 副作用已實際發生，禁止把 staged 部分成功當作完整交易原子性。#18/#16/#22 依賴保留，不接管。
