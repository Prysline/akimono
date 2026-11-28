# R0 第三十三批：R4 period 備份尾段／兩期真關店

正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；審閱候選 `ff70e04ccb59d2c02427304c801d58f86ec9caf1`。四份固定基線測試與兩 probe；本輪靜態逐檔審閱，未本機重跑，CI 待核。R1 功能層不變。

## r4-source-period-backup-tail.test.mjs

- 測試 blob：`dc4e749d9ecf0d39dc7225b7c481ce97d8241384`；Perl Oracle／Node 差分（真隔離備份／純投影）。
- 原版來源：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`。
- 執行來源：`modern/tests/original-perl/original-r4-period-backup-tail-probe.pl` @ `5247dc34ff07db135455558c0502d57ee2944b6c`；`modern/src/original-r4-period-backup-tail.mjs` @ `dea341ab09cf7d96e72d706c4678aed7944f65e9`。
- 入口：原版 period.cgi backup tail 原文 eval；Perl tempfile 實際 rename/copy/stat/unlink；Node 純投影。
- Fixture：三個已存在且五檔完整世代、人工 UTF-8 active；NOW800000/929600、mtime195199/195200、七 session；固定7天。
- 斷言：L23–67 兩期五檔三代、刪除與保留 session 名稱/mtime、cutoff、MakeGuildFile 次數、非提交、input 不變；L68–74 跨 probe 重跑；L75–92 source marker drift；L93–112 七無效 fixture 與 forged committable。
- 限制：Perl GetPath 注入，MakeGuildFile recorder；Node 不寫磁碟。未測 missing/partial generations、rename/copy/unlink failures、並發或大檔；Node 僅 marker reviewer 非完整 SHA、每檔4096字元/50 sessions 限制。對缺世代原版 mkdir 可能產生空目錄，Node null 與實際空目錄未驗差分。不證正式玩家/時鐘/HTTP/CAS/v2。

## original-r4-period-backup-tail.t

- 測試 blob：`8c0a38c4209ef5aa4d508c1b9bafdb938ef58983`；原版 Oracle（真隔離三代備份與 session mtime）。
- 原版來源：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`。
- 執行來源：`modern/tests/original-perl/original-r4-period-backup-tail-probe.pl` @ `5247dc34ff07db135455558c0502d57ee2944b6c`。
- 入口：同一 Perl process 兩期執行 frozen backup tail，真隔離磁碟。
- Fixture：完整三代五檔，固定 NOW800000/929600；人工 active 和 mtime。
- 斷言：L10–15 probe 成功與兩期；L17–34 play 三代輪替；L35–49 expired/edge strict cutoff、每期 MakeGuildFile call、bare .cgi/CAPS.CGI/note.txt 保留。
- 限制：Perl .t 直接斷言 play，其他四檔有 Node 差分；GetPath 注入、MakeGuildFile recorder；未測缺檔/失敗/原子性。不是完整 period/正式備份。

## r4-period-full-tail-close-chain.test.mjs

- 測試 blob：`46a81e2349e9e52034abc058be6d48c32b886a8f`；Perl Oracle／Node 差分（兩期真關店＋真隔離備份尾段）。
- 原版來源：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`。
- 執行來源：`modern/tests/original-perl/original-r4-period-full-tail-close-probe.pl` @ `cb942ca6c6b8a2441e65e326b1e1df566a8f19f2`；`modern/src/original-period-solo-chain.mjs` @ `0c83f75a8a4090c0fa8318ab1f5f2f37c846c37d`；`modern/src/original-r4-period-backup-tail.mjs` @ `dea341ab09cf7d96e72d706c4678aed7944f65e9`；`modern/src/original-r4-post-period-tech-loss.mjs` @ `7f77f5178dc5cec18114488ccfc3229ddc019acc`；`modern/src/standard-street-model.mjs` @ `c624fbb9f2c141bd539b7dfec86a48d3ba373efc`；`modern/src/reviewed-gift-map-use.mjs` @ `c0cb84e0c45727d4a0f0129b5fc00734f7e733d0`。
- 入口：同一 Perl process frozen period prefix＋backup tail eval，真 CloseShop/SortDT/drapay/session/backup；Node 每期 Oracle input，純投影。
- Fixture：NOW1000000/1129600、payout500/1000、固定4+4/4 draws；人工 stock/EXP/guild、兩個獨立 session/subdata 目錄；三代五檔，activeFiles 每期預先人工寫入。
- 斷言：L56–116 opt-in phase metadata、兩期 shop/town/people/guild/close/closed ref/tech loss、五檔三代/mtime/cutoff/MakeGuildFile、無提交、不變 input；395200/524800 cutoff，首期 old.cgi、次期 edge.cgi；第二期 shop null；L117–129 重跑；L130–159 無 opt-in、null snapshot、NOW mismatch、partial files、forged reviewer。
- 限制：SetUserData/WriteErrorLog/EditGuildMoney/WriteLog/PushLog/MakeGuildFile recorder。備份的是人工 prewritten play/log/guildbal，不是 DataWrite 序列化或關店後實際 log；Node 不寫磁碟、不自行串接下一期。未直接斷言 close archive payload、close session 清單、drawsUsed（Perl probe/ .t 有部份 guard）；兩個 post-tech imports 未直接使用。EVENT 空；非正式時間/RNG/玩家/HTTP/CAS/v2。

## original-r4-period-full-tail-close.t

- 測試 blob：`67008678e70d0046027477d92c21b21388cc54b8`；原版 Oracle（同程序兩期真關店與隔離備份尾段）。
- 原版來源：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`。
- 執行來源：`modern/tests/original-perl/original-r4-period-full-tail-close-probe.pl` @ `cb942ca6c6b8a2441e65e326b1e1df566a8f19f2`。
- 入口：frozen period prefix＋backup tail 同程序執行兩次，真隔離文件。
- Fixture：人工 stock/EXP/guild/activeFiles/mtime；NOW1000000/1129600、固定 rand tape。
- 斷言：L10–15 probe 成功兩期；L17–34 cutoff、old/edge session、MakeGuildFile 呼叫及 play 跨代輪替；L35–42 首期活躍/第二期關店 prune、closed status0、第二期 draws4。
- 限制：原版真 CloseShop session unlink 與 drapay read/unlink、三代磁碟 rotation；archive/公會/記錄 IO 仍 recorder，DataWrite 未跑；未在 .t 直接比對所有五檔/close payload，Node 差分另列。無正式玩家/時間/RNG/HTTP/CAS/v2 或原子存檔。

## 共用來源與缺口

`period.cgi` L171–203：UpdateResetAfter 後三代 mkdir/rename、五檔 UTF-8 copy、session strict mtime < NOW_TIME−EXPIRE_TIME、MakeGuildFile。`_config.cgi` L42/204–211 為7天/三代/五檔。獨立 probe L40–66 擷取 tail/注入路徑與 guild recorder，L102–156 兩期真實檔案與 utime。Joint probe L49–81/106 外部 IO recorder、L160–256 擷取來源（L251 註解稱 omitted tail，但 L256 實際接回 tail）、L293–356 每期寫人工 active 內容、真 drapay/period 與 draw guard；L380–414 記錄結果。Node backup projector L28–74 ordered marker reviewer；L76–120 純投影，null generation 未有原版缺世代差分，不能宣告缺檔語義已驗。Node chain L230–243 opt-in/snapshot/時間檢查，L340–346 使用獨立輸入投影，不會寫檔。原版 rename/open/unlink 未逐一檢查失敗，現有 fixture 未故障注入；不宣告原子性或備份已與 WorldState 一致。未新增功能層，R5 未啟動。
