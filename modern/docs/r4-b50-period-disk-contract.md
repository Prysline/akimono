# R4 B-50 期末主存檔、備份、封存及日誌共同檔案工作包（2026-11-24）

**定位：原版 B-50 已審閱單店期末來源子鏈的真檔案整合，非完整 inc-turn、正式 WorldState 或 R4 退出。** R2/R3 受控結論保持；正式 36h fail-closed 不變，eventState:null 是未知而不是空事件。最終驗收以同一最終 HEAD Push/PR Actions 為準。

## 原版呼叫與檔案順序

固定 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。新未改原文 pinned-log.cgi（blob 0f9143c49d1552233f27754e3937e1cdc2740f0a）。其餘使用既有 frozen period/write/inc-func/detail、固定 Standard Street DSL、pinned guild/guildsub/config/sub、user/error/custom。各新 codec 與備份/日誌審閱完整 Git blob SHA。

- B-50 先 SortDT，執行原版 period 全段（不含 require 頂層與函式定義的重複載入）：公會 in/out 歸零及刪 transient guild、第一名計數、DragonBalance、UpdateResetBefore、CloseShop、店鋪收支與歷史、會費攻防、EXP/爵位、SortDT 移除停業、城市與人口、UpdateResetAfter、備份三代及過期 Session、MakeGuildFile。
- 真 Perl 檔案 probe 使用同一 File::Temp 資料根，先用原版 DataWrite/WriteGuildData 建立完整初始 live play/guildbal（32 欄、11 STATE、79 商品，單店及已編碼 multi-key town）。原版公會初始帶 transient guild=id，期末確實移除。每期實際建立/讀取/刪除 DragonBalance payout、原版 CloseShop 調 SetUserData no-op、WriteErrorLog 真 append、刪實際 subdata；原版真備份尾段與 MakeGuildFile，每期覆寫暫存 guild.cgi。
- B-50 fixture 固定單店、無領主、已知空 EVENT、受控 RNG 與每期 NOW_TIME（相隔 129600 秒）。兩期同記憶體接續，第一期/第二期均讀相同尚未提交的 live play/guildbal 做備份；不能將兩期之間的記憶體狀態誤寫進備份。原版完整 CGI 的 NOW_TIME 與時間片時鐘不是此 fixture 的通用授權；未執行完整 inc-turn 時間片計算、自然販售、ITEM 回呼、59 PLUS、17 EVENT。
- 所有指定期末結束後才 WriteGuildData → DataWrite（DataFilesBackup 判斷、lasttime mtime、主檔暫存）→ RenewLog → DataCommitOrAbort。四檔 guild.cgi/guildbal.cgi/log0.cgi/play.cgi 共同 rename。Node sandbox 依固定檔名順序，原版用 readdir/hash 非固定順序；不能宣稱跨檔原子或同序。原版真 Perl 以第三筆 rename 注入失敗後保留 marker 及剩餘兩檔，再執行 DataCommitOrAbort(1) 完成，而非重算期末。
- DataRead 在提交後清除 probe 的 process-owned 資料重新讀取：first-only 有一活店，兩期關店後為零店，城鎮、32/11 欄、歷史、庫存與帳本已重讀。dragon、STATE.people、point 等非 32/11 持久欄位不假稱保存；point 由原版 DataRead 重算。Node 新 B50 codec 支援 source 32/11、成本小數、單鍵店鋪 map、已驗證多鍵 town 與零店；舊單店 DataWrite codec 不放寬。未知/null/nonempty EVENT、額外店、未審閱 map/欄位或其他資金分支仍拒絕。

## 備份與日誌真實邊界

- period 三代備份依 backup3→backup_work、backup2→backup3、backup1→backup2、work→backup1，複製 live log0/log1/log2/guildbal/play，最後清理 session/*.cgi（strict mtime < NOW_TIME-604800，.cgi 本身不符合）。Node 實際 mkdir/rename/copy/unlink；原版 blocked backup_work 可能無聲略過輪替但仍覆寫 backup1，保留舊 generations。Node 拒絕 unfinished work、缺檔、非一般檔或無效 UTF-8，禁止自動重播部分外部副作用。
- DataFilesBackup 是不同的單獨 backup/ 五檔複製，只有 backup/play mtime < NOW_TIME-3600 才跑；原版 DataWrite 後續 utime(lasttime)（不代表提交 marker 已完成）。真 older/equal/newer、缺 source（原版可截空 destination）、destination directory（原版可繼續複製後檔）差分。Node 先檢查五來源及目的，拒絕損毀，不冒稱原版安全等價。
- PushLog unshift NOW_TIME/mode/id/msg TSV；WriteLog 相容轉接。B50 原版排名、獎品（分類名稱、實際品名、數量、scale、超額丟棄）、關店、龍族、城市不足兵力/資金及技術遺忘依原版順序；Node 與 Perl 累計每一行逐字比較。明示使用與 fixture 相同的 identity l()/GetMoneyString()，不是完整本地化或貨幣格式化。
- RenewLog：log1 mtime < NOW_TIME-129600 時先把 live log1→log2、live log0→log1，再寫暫存 log0；否則把既有 log0 接在新日誌後。first-only 等於門檻不輪替，兩期案例嚴格較舊會輪替。備份發生在 RenewLog 前，故備份仍保留舊 live log。日誌輪替、封存 append、備份、Session unlink 在總 marker 之前即可能改動磁碟，不可宣稱原子或全部 rollback。

## 新程式／測試

| 程式 | 實際驗證 |
|---|---|
| original-r4-backup-disk.mjs | 原版 DataFilesBackup/prelude 和三代輪替真磁碟；mtime 邊界、缺檔/目的失敗、blocked backup_work 及失敗拒絕。 |
| original-r4-period-play-file.mjs | B50 完整主檔、活店或空店、32/11、成本小數及 town；真正 stage/live read，保留舊 codec 界線。 |
| original-r4-period-log-disk.mjs | B50 完整 source log calls 與實際 RenewLog mtime/rename/stage。 |
| original-r4-b50-period-disk.mjs | 從 live 檔讀取、指定一/兩期、真 payout/封存/subdata/備份/session/公會定義、總 ledger/play/log stage 與共同 commit/recover；只允許 akimono-r4-period-disk-* 暫存根。 |
| original-r4-b50-period-disk-probe.pl/.t + r4-source-b50-period-disk.test.mjs | 真 Perl source 一/兩期及部分 rename 恢復；Node 同一來源 state、真備份/封存/日誌、四檔共同提交、重讀、第四檔真 OS rename 失敗，恢復與錯誤拒絕。 |
| original-r4-data-files-backup-probe.pl/.t、original-r4-backup-rotation-failure-probe.pl、r4-source-backup-disk.test.mjs | 真原版 unchecked 複製/輪替失敗、safe Node 拒絕、實際兩次 rotation/expiry。 |

Node 新加 period-attempt（外部副作用已開始不可直接重算）、period-ready（四暫存檔 SHA256）是安全證據，不是原版檔案。stage 成功後才產生 ready；未齊/改動檔拒絕；marker 恢復時同時核對已 moved live 及 pending stage 的摘要；只移動剩餘檔案，不重做封存與備份。這不是防惡意程序的正式交易鎖/持久化 CAS 或 fsync。中止在 ready/marker 前只能隔離調查或人工復原，不能宣稱已自動恢復不可逆外部副作用。

## 下一主線：完整運作及 R4 退出

本工作包已把先前獨立的 B50、公會、備份/封存、主檔、日誌接合；先前軍隊/城鎮/兩 EVENT 三檔共同子鏈仍有效。下一工作包要將既有自然販售→ITEM 回呼→SortDT→59 PLUS→完整 17 EVENT→期末順序與實際 world 檔案接成同一受控連續來源，而非重做本輪 B50 磁碟零件。仍欠多店/全部事件/軍隊領主情境、全部時間片正確 NOW_TIME、正式 lock 與持久化一致性、WorldState/CAS/HTTP 正向跨期、雙世代 save/restart 繼續營業。不得先開放正式 36h 或標記 R4/R5/R0/R1 完成。


## 跨期正常時間候選與真檔案接合（待同 SHA CI）

新增 opt-in `reviewPeriodPlay(sources,{crossPeriod:true})`，舊 codec 不變：原版 32 欄、11 CITY 欄、原始 sparse wholesale CSV、已審閱 durable EVENT 的寫入順序、多鍵 itemtoday/itemyesterday/exp/user、job 字串。對 map 的 Perl hash 排列只比較語意；EVENT wire 保留次序。新 `OriginalR4CrossPeriodDiskHarness.pm` 在既有 crossing Perl 行程內執行 period.cgi 真備份尾段、MakeGuildFile、缺席 DragonBalance 檔的原版分支及最後 WriteGuildData/DataWrite/RenewLog/DataCommitOrAbort/DataRead；Node `stageR4CrossPeriodDisk` 使用同一候選引擎及既有 sandbox 寫入器，真四檔 ready receipt/recovery，校驗 live play 與輸入一致後才有副作用。只限來源明示的獨立空公會、無龍族檔、無關店的單店；完整來源欄位及稅收/EXP/商品歷史為隔離 fixture，不是合法 HTTP 取得。正式 WorldState/B43 及跨期拒絕未改。所有測試需最終同 SHA CI，尚未宣告完成。

## 正式獨立單店跨期模式（本機 opt-in，非全部 R4 退出）

- `enableReviewedCrossPeriod` 需同時啟用 `enableReviewedNormalTime`，HTTP 使用 `AKIMONO_REVIEWED_CROSS_PERIOD=1`。非跨期模式原本的期界拒絕及 B43 非跨期 proof 契約保留。正式 1–60 分鐘命令會呼叫已驗證的 crossing／settled candidate，而非另寫一套結算數學。期界 20/40 秒等精確切分、舊 DataRead overlay、人口更新後 PLUS、EVENT hash lineage、source draws、獎品、稅額、EXP、收支及排名全走原先 source projection。原始 candidate 仍 noncommittable；正式 controller 才負責整個 after-state 的 CAS 精確重算。
- `original-r4-independent-world-disk.mjs`：來源 32/11 codec、sparse CSV、EVENT wire、日誌、三代備份及獨立 DataFilesBackup 在每一來源指令的 after-state 一同推進；備份取 BEFORE live bytes，日誌與備份時間使用可重播的邏輯世界時間。新店只正規化 frozen new.cgi 的 unset 欄位，local authentication/password/IP/session 並不冒充真 CGI 帳號，普通成功交易更新 lastlogin。局部 UI 操作日誌明示為 local adapter message，非完整原版本地化與 USE CGI log parity。無外部 session 檔可刪；來源真正的 session 清理與含外部副作用的 B50 檔案驗證仍是上列 isolated source oracle，不冒充本機帳號系統。
- `r4-independent-period-disk-store.mjs`：固定檔名集合、不可變 content-addressed generation、實際 temp 目錄寫入、file fsync、mtime、directory fsync（Windows 依既有 best effort）、rename、讀回 bytes/mtime 驗證。B43 原子 slot 是唯一發布指標；preflight 階段若故障不 CAS，未發布的實體世代不代表存檔。save/load 檢查完整 source proof 和實體檔案，篡改最新檔案或 crossing trace 不能繞過重播，回復有效舊 slot。保留世代目錄供稽核，尚未做 GC；獨立 file envelope 100000 bytes，既有 history/anchor 容量仍適用，超過拒絕而非裁掉來源證據。這是現代單 writer 設計，並非直接使用原版 live 資料目錄、原版 rename 順序或多程序鎖。
- `reviewed-world-time-history.mjs`：保留 normal trace，cross/settled trace 另外保存精確 slice dateupdate/span、17 EVENT 順序、每階段實際 samples、effects digest、完整 successor digest。checkpoint HMAC 包含兩種 RNG/hash policy 及實作/Perl fingerprint。只有合法 fresh anchor/source replay 或已認證 checkpoint 可載入；形狀相符的偽造 settled state 不取得 provenance。沒有從舊 mode 直接匯入的授權。
- 本機 UI 使用 reviewed route，顯示結算數、人口及已知 EVENT；可手動 save/restart。正向 HTTP 測試涵蓋未到期→真跨期→買入/上架/繼續推進→存檔/重啟→舊世代恢復；另外真兩期連續來源 CAS、備份 generation 及防偽造初始 world。最終以同一 HEAD 的 Push/PR CI 為準。公會成員／龍族外部檔案、領主／特殊事件外部副作用、關店及多人仍拒絕，不宣告完整 R4/R5/R0/R1 完成。
