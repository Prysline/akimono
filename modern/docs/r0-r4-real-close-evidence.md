# R0 R4 真 CloseShop 與兩期結算證據（第三十一批）

基準：正式 08fdd3b31ff130e66d0337360430fda3d73fdc8d。此批為逐檔語義審閱，不是新執行結果。

## 來源及界線

- `write.cgi` L103–138：ID gate → SetUserData → 32 scalar fields 與 array/hash archive → WriteErrorLog → status/money/rank 歸零 → session filename regex 與 unlink。`core-detail.cgi` L4–14：SortDT status filter、point、index；DataWrite inactive filter 本批僅 review。
- `original-r4-close-shop-effects-probe.pl` L21–63 擷取原版、stub SetUserData/WriteErrorLog、GetDTPoint；L64–145 真隔離 session 與三 cases。缺 ID case 無 shop；inactive case 不代表正式玩家可重複關店。
- `original-r4-period-real-close-chain-probe.pl` L24–87 指定 RNG、session/drapay tempdir、外部呼叫記錄；L89–177 擷取原版 CloseShop/GetDTPoint/SortDT/AddItem/RebelRobin/DragonBalance/DSL callbacks 與整段 pre-backup；L179–219 人工資料，L221–308 同 process 兩期、drapay 消耗、session before/after 與 closed reference。第二期歸零後仍進行龍賽、公會及後續結算，money1425，不等於可供已關店玩家領取。SortDT 移除唯一店鋪後不再消耗技術 rand。
- `original-r4-close-shop-effects.mjs` L22–75 source review；L82–141 bounded hash/filename、純投影；L153–209 prune/source filter，actualDataWriteInvoked=false。`original-period-solo-chain.mjs` L278–295 接續關店後 ledger；Node 無檔案操作或 world commit。
- 未增加 R1 feature 明細；既有 ITEM 技術證據不得由此升格。沒有新測試／runtime 修改。

## r4-source-close-shop-effects.test.mjs

- 路徑：`modern/tests/r4-source-close-shop-effects.test.mjs`，blob `0a6c288f9ce3fc57a65a18bba044c4dd4d7d0b36`。
- 分類：有效；Perl Oracle／Node 差分（CloseShop 真 session unlink、封存文字／SortDT）。
- 斷言：L27–70 三 cases：archive pre-zero、status/money/rank、calls、session 名單及 immutable；L72–79 重跑；L81–114 source drift/多鍵 hash/path/reason/committable guards；L117–141 singleton prune 與空 DataWrite rows；L143–166 drift/forged prune。
- 執行：frozen CloseShop + isolated temp sessions; SortDT (GetDTPoint stub); Node projection
- Fixture：money123456、rank88、九個 session 名稱；正常、無 ID、已 inactive。
- 限制：人工 singleton shop、隔離真 session 檔 unlink；SetUserData/WriteErrorLog 只記錄呼叫，封存文字不代表真 archive file；Node 純投影，無 Node unlink、DataWrite、正式 HTTP/CAS/v2。獨立 probe 的 SortDT 使用 GetDTPoint stub；DataWrite 只檢查 source filter，未執行。 缺 ID fixture 無 shop；不證有其他 active shop 的多店排序。
- 原版 pins：`modern/tests/original-perl/write.cgi` `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` `9a83d26fb29edee4032958f1e6de837a250f3384`；`_config.cgi` `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- 執行 pins：`modern/tests/original-perl/original-r4-close-shop-effects-probe.pl` `ba05b500b25e5b7c4051a4714ab5ffe01163aa41`；`modern/src/original-r4-close-shop-effects.mjs` `8ba642520d76dd9115acde71028554f24ece1261`

## original-r4-close-shop-effects.t

- 路徑：`modern/tests/original-perl/original-r4-close-shop-effects.t`，blob `7854f42b3e67a08143a169f7d241a2074b441afe`。
- 分類：有效；原版 Perl Oracle（CloseShop／真 session unlink）。
- 斷言：L10–47 exit0/JSON；三 cases；status/money/rank 歸零，archive delete payload，1-alpha/1-beta 真 unlink、SetUserData call、缺 ID 不封存、inactive 仍 close、SortDT 空 active/index。
- 執行：frozen CloseShop + temp sessions + SortDT
- Fixture：同上述三 cases。
- 限制：人工 singleton shop、隔離真 session 檔 unlink；SetUserData/WriteErrorLog 只記錄呼叫，封存文字不代表真 archive file；Node 純投影，無 Node unlink、DataWrite、正式 HTTP/CAS/v2。獨立 probe 的 SortDT 使用 GetDTPoint stub；DataWrite 只檢查 source filter，未執行。
- 原版 pins：`modern/tests/original-perl/write.cgi` `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` `9a83d26fb29edee4032958f1e6de837a250f3384`；`_config.cgi` `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- 執行 pins：`modern/tests/original-perl/original-r4-close-shop-effects-probe.pl` `ba05b500b25e5b7c4051a4714ab5ffe01163aa41`

## r4-period-real-close-source-chain.test.mjs

- 路徑：`modern/tests/r4-period-real-close-source-chain.test.mjs`，blob `efaff855a9e72ed7c5fad91acf0c65d8ee99fb8b`。
- 分類：有效；Perl Oracle／Node 差分（兩期真 CloseShop／財務／prune）。
- 斷言：L53–129 phase order、兩期 shop/town/point/guild/expiry/dragon/dignity/tech exact 差分；第二期 closed reference、archive/call/session 差分、status0/rank0/money1425/dragon1500/atk921/4 draws/無 tech loss；L131–141 重跑；L143–177 opt-in/inventory/path/hash/postTech/forged contract guard。
- 執行：frozen SortDT + period pre-backup prefix + actual CloseShop; Node solo phase projection
- Fixture：兩期 NOW1000000/1129600、payout500/1000、初 EXP5000、4/0 tech tape、五 session 名稱。
- 限制：同一 Perl process 兩期，Node 每期接收 Oracle input，非自行接續 Node output；人工 shop/stock/EXP/guild、固定 NOW_TIME 與 rand tape，真隔離 drapay/session unlink，Node 純投影。SetUserData/WriteErrorLog/EditGuildMoney/WriteLog/PushLog 只記錄；EVENT 空，backup/session/MakeGuildFile 尾段未執行，不證正式玩家、時鐘/RNG、持久封存、HTTP/CAS/v2。 phase order 亦有 metadata 斷言；兩個 imported post-tech functions 未直接使用。
- 原版 pins：`modern/tests/original-perl/write.cgi` `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` `9a83d26fb29edee4032958f1e6de837a250f3384`；`_config.cgi` `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/period.cgi` `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` `1bf4537cc41e344c144d840d43175c4c232765bb`；`custom/inc-item-data.cgi` `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`
- 執行 pins：`modern/tests/original-perl/original-r4-period-real-close-chain-probe.pl` `161244a68aa1fd20ee5fec659a1cd09bb0b71b7c`；`modern/src/original-period-solo-chain.mjs` `0c83f75a8a4090c0fa8318ab1f5f2f37c846c37d`；`modern/src/original-r4-close-shop-effects.mjs` `8ba642520d76dd9115acde71028554f24ece1261`

## original-r4-period-real-close-chain.t

- 路徑：`modern/tests/original-perl/original-r4-period-real-close-chain.t`，blob `43cca73ad64da97f47faecabdc471c06f16085ee`。
- 分類：有效；原版 Perl Oracle（兩期真 CloseShop／財務／prune）。
- 斷言：L10–47 exit0/JSON、首期 active/EXP4695，次期 shop null/active0、closed status0/rank0/money1425、dragon1500、1-one/1-two 真 unlink、delete call、atk921、draws4/無技術遺失、drapay consumed。
- 執行：frozen SortDT + period pre-backup prefix + actual CloseShop
- Fixture：同上；同一 Perl process。
- 限制：同一 Perl process 兩期，Node 每期接收 Oracle input，非自行接續 Node output；人工 shop/stock/EXP/guild、固定 NOW_TIME 與 rand tape，真隔離 drapay/session unlink，Node 純投影。SetUserData/WriteErrorLog/EditGuildMoney/WriteLog/PushLog 只記錄；EVENT 空，backup/session/MakeGuildFile 尾段未執行，不證正式玩家、時鐘/RNG、持久封存、HTTP/CAS/v2。
- 原版 pins：`modern/tests/original-perl/write.cgi` `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/core-detail.cgi` `9a83d26fb29edee4032958f1e6de837a250f3384`；`_config.cgi` `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/period.cgi` `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` `1bf4537cc41e344c144d840d43175c4c232765bb`；`custom/inc-item-data.cgi` `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`
- 執行 pins：`modern/tests/original-perl/original-r4-period-real-close-chain-probe.pl` `161244a68aa1fd20ee5fec659a1cd09bb0b71b7c`
