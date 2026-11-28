# R0 第三十四批：R4 備份磁碟／DataWrite 及 DataRead

正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；審閱候選 `44b35c24ed74d64a832b667bf3afd696caa23e40`。四份固定測試與三份新 probe（backup-tail probe 前批已讀）；本輪靜態逐檔審閱，未本機重跑，候選 CI 未驗收。R1 功能層不變。

## r4-source-backup-disk.test.mjs

- 測試 blob：`fdc7609130dbbaf7e83fd568f6545a55eade340b`；Perl Oracle／Node 差分（真隔離備份磁碟／失敗拒絕）。
- 原版來源：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`。
- 執行來源：`modern/tests/original-perl/original-r4-data-files-backup-probe.pl` @ `521f4825ec9b875d72a2f7e415b4d3162730f4a5`；`modern/tests/original-perl/original-r4-backup-rotation-failure-probe.pl` @ `b6d4edd33a302fe2b9990d3e42da8ff59c9f55f7`；`modern/tests/original-perl/original-r4-period-backup-tail-probe.pl` @ `5247dc34ff07db135455558c0502d57ee2944b6c`；`modern/src/original-r4-backup-disk.mjs` @ `f556966c221811df66b112a02b80c7fab7aac81a`。
- 入口：原版 DataFilesBackup＋DataWrite prelude 擷取、原版 period tail；Node 實際 sandbox copy/rename/utimes/unlink。
- Fixture：NOW1000000、cutoff996400、mtime996399/996400/996401、lasttime999999；人工五檔；兩期備份 probe 已讀；nonempty backup_work。
- 斷言：L16–25 older/equal/newer 五檔、mtime/lasttime；L26–39 missing source/invalid destination 原版部分寫入與 Node 拒絕保留 prior 及 clock；L40–52 同一 Node 目錄兩次 rotation，五檔三代、刪除及剩餘名稱；L53–62 blocked work/missing source、gen1 保留與 source drift；L64–73 原版 blocked work stale play、Node 四目錄 play 未改。
- 限制：Node 兩期真磁碟延續，但每期 activeFiles 人工重灌，非遊戲 state；比對解碼文字、session names 非剩餘 mtime。invalid destination 目錄未獨立斷言保留；missing input/unfinished work 只核 gen1，blocked work 核四個 play，非全部檔案。拒絕是 preflight，未注入實際中途 rename/write/unlink OS failure；無缺世代正例、跨檔原子、fsync、正式 CAS/v2。

## original-r4-data-files-backup.t

- 測試 blob：`1f07d11c5a55b36846179a4ce211b6c9d6003c90`；原版 Oracle（真隔離備份 prelude／部分失敗）。
- 原版來源：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`。
- 執行來源：`modern/tests/original-perl/original-r4-data-files-backup-probe.pl` @ `521f4825ec9b875d72a2f7e415b4d3162730f4a5`；`modern/tests/original-perl/original-r4-backup-rotation-failure-probe.pl` @ `b6d4edd33a302fe2b9990d3e42da8ff59c9f55f7`。
- 入口：require frozen write.cgi，eval DataWrite backup/utime prelude；另 eval frozen period tail，真隔離磁碟。
- Fixture：人工五檔、固定 NOW/mtime/lasttime、非空 work；GetPath 注入、MakeGuildFile 空 stub。
- 斷言：L6–17 五 cases：older copy、equal/newer prior、missing source truncation、destination directory、後續 log2 仍 copy、五例 lasttime mtime；L18–21 非空 backup_work 造成 gen2/gen3/work stale、gen1 live。
- 限制：僅 prelude 非 DataWrite 全函式；warnings 收集但 .t 未斷言；blocked rotation probe 只讀 play、非全檔狀態。證實原版 unchecked copy/rename 的部分寫入，不證所有故障模式、正式狀態或原子性。

## r4-source-data-write-files.test.mjs

- 測試 blob：`36b1685bc4312b8ea51ee0646de05db6e07d5894`；Perl Oracle／Node 差分（真隔離單檔 stage/rename/recovery）。
- 原版來源：`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/lock.cgi` @ `84382170f1b7f70348c4e2a91bf30b1d1043b964`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`。
- 執行來源：`modern/tests/original-perl/original-r4-data-write-files-probe.pl` @ `093652b30dd6c6613498f7b43f37ef1fb2c04f36`；`modern/src/original-r4-data-write-files.mjs` @ `8541d7cd933cfe2b45d50330808f2494a541ab97`。
- 入口：Perl 原版 DataWrite/DataCommitOrAbort/DataRead、SortDT/AutoVar、lock.cgi OpenAndCheck/RenameAndCheck；Node narrow serializer＋隔離真 stage/rename。
- Fixture：人工 active17200/停用店兩筆、79零槽、單架、空 maps；第二次 Perl DataRead 後人工 money16900/saletoday100/lasttime2000；fresh backup 避免 DataFilesBackup、預置 owned-lock 文件；固定 NOW1000000。
- 斷言：L30–61 32/11 schema、兩次 staged re-encoded UTF-8 bytes 與 Node 真 stage/live、marker 消失、兩店→一店；L63–81 SHA drift、多 key、78 slots、delimiter、forged committable；L83–103 live path directory 阻擋真 Node rename，stage/marker 保留、abort:true recover；L105–118 無 marker discard、tmp root 拒絕。
- 限制：不是兩次 period.cgi 結算；Node 每次接受 Perl input，無 Node reload；Node serializer 不執行 SortDT point 計算、money cap/foundation mutation 拒絕，非多店排序或多 key hash；測試正例空 map，未獨立證 one-key 正例。Node failure/recovery 非 Perl 失敗差分、無真 lock acquisition、fsync、多檔原子或正式 v2。Perl bytes 經嚴格 UTF-8 decode 再 encode 比對。

## original-r4-data-write-files.t

- 測試 blob：`18ef7b6e53770b65212e697057b2bdc39137b68f`；原版 Oracle（真隔離 DataWrite／rename／DataRead）。
- 原版來源：`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/lock.cgi` @ `84382170f1b7f70348c4e2a91bf30b1d1043b964`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`。
- 執行來源：`modern/tests/original-perl/original-r4-data-write-files-probe.pl` @ `093652b30dd6c6613498f7b43f37ef1fb2c04f36`。
- 入口：frozen write.cgi＋lock.cgi require；eval 原版 GetPath/DataRead/GetDTPoint/SortDT/AutoVar，兩次單檔寫入、同 process reload。
- Fixture：人工 active/inactive、單架、空 maps、fresh backup、人工 owned-lock、固定時鐘；second round 人工修改已 reload shop。
- 斷言：L10–24 probe 成功、兩次 staged/live 文字 exact、commit marker 與 stage 消失、header/separator；L25–32 兩店→一店、live 變化、17200→16900 人工修改 reload。
- 限制：DataWrite 真實執行，但沒有實際 Lock/UnLock；沒有跨 process restart、period 結算、關店觸發或舊備份 copy（另測）、多檔、非空 EVENT、cap/foundation、正式玩家、HTTP/CAS/v2。

## 共用來源與缺口

`write.cgi` L4–35 commit/abort、L37–55 CheckLockStatus/backup/utime/open、L57–88 schema/SortDT/cap/foundation、L91–101 unchecked copy；`lock.cgi` L44–63 真 RenameAndCheck/OpenAndCheck，非實際 lock acquisition；`inc-func.cgi` L80–84 GetPath、L233–299 DataRead、L301–309 GetDTPoint、L440–472 AutoVar；`core-detail.cgi` L4–14 prune/point/sort。Backup prelude probe L14–32 實際五例；failure probe L17–31 非空 work；原版 missing source truncates、bad destination 後續仍 copy，且 lasttime 仍更新；blocked work 導致 stale generations。Node backup disk L10–20 SHA/WeakSet/root guard、L25–38 preflight、L45–69 真 rotation、L75–84 copy/mtime，未證中途 OS failure recovery。DataWrite probe L66–78 原版擷取/require、L98–103 人工 lock/fresh backup、L134–166 兩次 write/rename 與真 DataRead 後人工修改；不是 period.cgi 輸出直接入存檔。Node writer L26–60 SHA/schema、L101–153 narrow serializer、L168–174 stage、L182–208 marker/rename/recover/discard；不重算 point，不證任意有效 shop 的完整原版等價。不得升格為正式存檔安全或 R5 驗收。
