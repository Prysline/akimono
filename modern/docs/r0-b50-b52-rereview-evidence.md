# R0 第四十四批：B50–B52 既有分類重新覆核

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；五份測試及兩份 probe 原文實讀。維持4有效、1歷史，未本機重跑。B50 不可提交前綴、B51 legacy save、B52 EVENT wire 各自限定。

## b50-period-same-state-chain.test.mjs

- 固定 blob：`08e089855a7e2ec39c27fca56fe25ddc7bfa7e3e`；有效／Perl Oracle／Node 差分（不可提交前綴）。
- 實際斷言：L45–56 七階段、79 cap、nonCommittable、移除 UpdateResetAfter drift；L57–78 兩期 shop/town、人口、points exact、輸入不變；L79–105 獨立 memory repo 不變及六種 projector 負例。
- 執行路徑：reviewOriginalSoloPeriodPhaseChain → projectOriginalSoloPeriodPhaseChain；每期取 Perl oracle input。
- 限制：原版同程序單店兩期，Node 每期重新讀 Oracle input，不證明自身連續提交；L82–92 只建立未傳給 projector 的 repo 並比較，不是真 CAS 拒絕測試。固定 clock/draw、人工資產；無外部 IO、正式 period/HTTP/v2。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/original-b50-period-chain-probe.pl` @ `f069ead5a3857f578c2ed2682ede26ce83536b82`；`modern/src/original-period-solo-chain.mjs` @ `0c83f75a8a4090c0fa8318ab1f5f2f37c846c37d`。

## b51-source-city-period-world.test.mjs

- 固定 blob：`0e2ba0214e22d9f8197a888212a2be1fc83ff4ee`；歷史／fixture／舊 CAS 存檔。
- 實際斷言：L60–91 129600/10800、500000、town seed、兩 review 負例；L92–134 memory 初始化/開店 rev2、legacy disk gen1、四種偽造 period 拒絕、load snapshot exact；L135–176 七種 seed drift、generic schema 容許、v1/v2 downgrade CAS 與 dummy apply 拒絕。
- 執行路徑：reviewOriginalPeriodBootstrap → createPeriodMemoryWorld → executeMemoryCommand → legacy-world-save-store save/load；generic adapter compareAndSwap。
- 限制：固定 time=1000000，bootstrap-only，不執行結算；磁碟為 legacy store，不是正式 v2；拒絕後只核對 generation 及最終重載，不逐槽比 bytes；L77–82 缺 writeSource 且改 clockShift，未隔離 clockShift guard；沒有 HTTP 或新程序重啟。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/src/original-period-world-seed.mjs` @ `0fa17185d67894b35218c2c6e632ee54021c906e`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`。

## b52-event-bootstrap-source.test.mjs

- 固定 blob：`9c857d66673409a20b5b49b1c1d36eba4d60271a`；有效／Perl Oracle／Node 差分。
- 實際斷言：L25–46 空 CSV / 單 rebel wire、bootstrap 空 map、null 相容、active 拒絕及三 source mutation；L47–59 seed 空 map、null 可讀、active/array/hasOwnProperty 形狀拒絕。
- 執行路徑：reviewOriginalEmptyEventBootstrap / reviewOriginalPeriodBootstrap；Perl probe JSON 比對。
- 限制：Perl 只抽 admin seed 字串及 DataRead/DataWrite 單句，使用 scalar filehandle，非真磁碟；人工 rebel expiry，不證明發生事件。Node 無整體 world save 或 CAS/HTTP/v2。
- 來源／入口：`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/original-b52-event-wire-probe.pl` @ `11452b3df4ff530141c32388fa343bbfd2dd2614`；`modern/src/original-event-world-bootstrap.mjs` @ `8d328795ca659142de004dd675efd406fbad59fc`。

## original-b50-period-chain.t

- 固定 blob：`970c942d44825df21fc2865d110ad24e4c392a36`；有效／Perl Oracle（受控）。
- 實際斷言：L9–43 exit/JSON、79 cap、兩期同店 town；rankingcount 1→2、gift stock10、robot1、帳本 rollover、money99983、EXP100→89→79、人口374050、每期3 draws、第二期承接前三欄。
- 執行路徑：Perl .t → original-b50-period-chain-probe.pl；真 SortDT/GetDTPoint/AddItem、RebelRobin、DSL before/after 與 period 前綴 eval。
- 限制：原版同程序保留 DT/STATE；人工 stock、EXP、帳、時間及每期 draw tape。probe L38–48 log/DragonBalance stub、CloseShop/guild/disk fail closed；L91–114 截至 backup 前，無完整 period/正式 IO；ITEMNO regex 替換非全 compiler。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/original-b50-period-chain-probe.pl` @ `f069ead5a3857f578c2ed2682ede26ce83536b82`；`modern/src/original-period-solo-chain.mjs` @ `0c83f75a8a4090c0fa8318ab1f5f2f37c846c37d`。

## original-b52-event-wire.t

- 固定 blob：`1ed198a5e6bab1152e76644e9fec94696cf7bb38`；有效／Perl Oracle（受控）。
- 實際斷言：L9–18 exit/JSON、初始 active0、空行、rebel,123456 單行、回讀唯一 key。
- 執行路徑：Perl .t → original-b52-event-wire-probe.pl → admin seed regex、DataRead/DataWrite 單句 eval。
- 限制：probe L19–35 抽 seed 與單句，L43–54 scalar handle 而非真檔；人工 active state，非實際 EVENT lifecycle、完整 admin/DataRead/DataWrite/commit 或玩家。
- 來源／入口：`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/original-b52-event-wire-probe.pl` @ `11452b3df4ff530141c32388fa343bbfd2dd2614`；`modern/src/original-event-world-bootstrap.mjs` @ `8d328795ca659142de004dd675efd406fbad59fc`。
