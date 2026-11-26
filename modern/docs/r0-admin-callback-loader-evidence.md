# R0 市場初始化、回呼清冊與原版動態載入補審

固定正式 base `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。本批 6 檔完整讀取，固定原始測試與來源 blob；有 subprocess／Oracle 不代表正式 runtime。靜態 .t 明確不算執行原版回呼。前候選 CI 45794612974 全綠，非本次新 HEAD 結果。

## original-admin-sparse-market.test.mjs

- 測試 blob: `81db868d6972067ee708992e2134dde213699a01`；Perl Oracle／Node 差分（舊 memory CAS）
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`
- 執行入口: modern/src/original-admin-world-bootstrap.mjs → modern/src/standard-street-module.mjs → modern/src/game-core-contract.mjs → modern/src/world-wholesale-codec.mjs → modern/tests/original-perl/original-admin-sparse-market-probe.pl；`2e852bc260e2c67bb081465377ffec2976c01a88`；`abf89cb14a24479f98ec00374d48657cc1f45d81`；`b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`2714020cb3fb2d555062cbbaa1c42a8601e2bb50`；`2bac04c03ea5a630d0a425f5423e0ba03da408bb`
- Fixture: 固定 now1000000、shop42、source opt-in module；空市場、兩次 #79/0 合法 memory 兌換；cap case 注入三種地圖各3；Perl subprocess
- 斷言: init metadata 精確 500000,100 等、空 CSV / 0 defined slots vs 79 numeric zeros；source drift拒絕、incomplete opt-in、舊 capability 集合；boot rev0→1 無店、open→2 #63×1/#79×5；reboot/post-open/extra wholesale 拒絕；gift 消耗2、9/12/14各+1、slot78唯一已寫，第二次保留 sparse、第三次拒絕不變；cap map slots8/11/13/78 寫零；malformed provenance與 stale rev拒絕、JSON immutable roundtrip；Perl probe 對照 CSV/defined/numeric/stock/money/time，cap fixture對照
- 限制: 舊 opt-in module 非正式七命令入口；memory adapter/固定時鐘；cap fixture非合法取得；原版 Perl 子程序可能無 Perl 時 skip（已確認候選 0 skip）；非 HTTP/v2 或完整 compiler

## original-item-dynamic-loading-model.test.mjs

- 測試 blob: `444e615842d687abe4c3201c14bfb3e1407b382a`；Perl Oracle／Node 差分（虛擬 require）
- 原版來源: `_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/core-item-detail.cgi` @ `9b4db56d6702d6b3475af0331fdcf1a27ed8d3c8`；`modern/tests/original-perl/core-item-form.cgi` @ `7ec2c01829c20e78feec53a1ed410ad7254b21c7`；`modern/tests/original-perl/core-item-submit.cgi` @ `bf895cb9c4672fe984cc9be352d52a856d3ac4e3`；`modern/tests/original-perl/core-inc-item.cgi` @ `bb0244748088be0c5f1d24de7f9f7f05225278cb`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`
- 執行入口: modern/src/original-item-dynamic-loading-model.mjs → modern/src/original-standard-callback-inventory.mjs → modern/tests/original-perl/original-virtual-item-require-probe.pl；`b83ac7e8d065c54d5a922b599c5eebda74ca35ef`；`bac98cbffaf7135d1e4b0687a20a4a3e9bfa7f36`；`89e4321d9431fe8597a2b7660a00fb9a71976204`
- Fixture: 合成 book-work / edit-showcase 虛擬檔，單 Perl interpreter；9 種順序；money100/shelf1等 fixture
- 斷言: custom RequireFile priority且無 override；common package item/funcitem；三 entrypoint 先 common 再 direct require 再 USE lookup；compiler同 package、per-code paths、@USE不清、_local_1 alias；獨立work money104 logs2、showcase2 [9,0]/[90,0]；%INC cache及同名 symbol覆寫、重載舊路徑不能恢復；兩槽覆寫留下6槽；unsafe sequence拒絕與immutable；9 scenarios真 Perl @INC probe steps/loadedPaths/hookRequests exact
- 限制: 不執行真 CGI/完整 compiler/磁碟 module；舊全域 symbol 碰撞為來源風險，不是要求正式模型重現漏洞；不證明 #13/63 正式交易

## original-standard-callback-inventory.test.mjs

- 測試 blob: `374b0f92d79673254296b80a2863f5d252b647a0`；靜態來源回呼清冊
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`
- 執行入口: modern/src/original-standard-callback-inventory.mjs；`bac98cbffaf7135d1e4b0687a20a4a3e9bfa7f36`
- Fixture: 直接兩 DSL 與 compiler 原文，source mutation 負例
- 斷言: 79 ITEM/116 USE/25 EVENT/7 FUNC；56 post=22 lostbook+1 popup+11 inline+22 alias、60 無 post；1 pre #14、1 itemTurn #70、42 job modifiers；58 callbacks 來源定位全部 resolved/not-executed；#13/#25/#63/#78 aliases 1/1/7/13；lostbook/popup/reference tokens、#62 token effects；compiler drift/missing shared definition/structure拒絕；freeze
- 限制: token references不代表實際 effects；無 callback 執行、compiler/runtime registry、HTTP/CAS/v2；不證明所有 USE 行為

## original-admin-sparse-market.t

- 測試 blob: `71247094b760f9827b78addf60bc20b7d4062965`；Perl Oracle（隔離 init/gift）
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`
- 執行入口: Perl Test::More → fixed source markers / isolated harness as stated
- Fixture: OriginalAdminBootstrapHarness scalar handle 與 OriginalGiftMapUseHarness；先空 WHOLE，再沿用庫存／稀疏陣列；cap 注入
- 斷言: init 原版 print time numeric、metadata literal、6 LF split/blank WHOLE & event/ //、0 slots；#79/0 兩次5→3→1、9/12/14各+1/次、CSV78逗號+0、defined[78]、數值0、trace use-time→wholesale→require-common、money100000、time958600→960400；第三次 count0 trace空且 stock/CSV/time不變；cap case vouchers仍耗、additem retained0、4 literal zero slots、其他 undef
- 限制: 不執行 init 全函式/真 IO/lock/完整 compiler；cap為合成資料；原版 oracle 非正式玩家

## original-virtual-item-require.t

- 測試 blob: `d019316685a9522d7a7f428d1ba149d2e72614dc`；Perl Oracle（虛擬 require）
- 原版來源: `_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/core-item-detail.cgi` @ `9b4db56d6702d6b3475af0331fdcf1a27ed8d3c8`；`modern/tests/original-perl/core-item-form.cgi` @ `7ec2c01829c20e78feec53a1ed410ad7254b21c7`；`modern/tests/original-perl/core-item-submit.cgi` @ `bf895cb9c4672fe984cc9be352d52a856d3ac4e3`；`modern/tests/original-perl/core-inc-item.cgi` @ `bb0244748088be0c5f1d24de7f9f7f05225278cb`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`
- 執行入口: Perl Test::More → fixed source markers / isolated harness as stated
- Fixture: OriginalVirtualItemLoader @INC memory hook；book-work、edit-showcase 及重複/反向組合
- 斷言: P01–20 原文 loader/require/compiler/USE order；P21–50 真 Perl require：work¥4/money104、2 USE owners；同路徑cache、異路徑覆寫_local_1、回到cached仍用後者；反向覆寫只2槽、剩6；showcase2、陳列/價格與兩 log exact；hook first load order
- 限制: 不是正式 CGI/disk generated module，兩 callback synthetic；不能把舊全域碰撞視為現代必須行為

## original-item-callback-contract.t

- 測試 blob: `1c19557289fb36b3cfc24f8d2bd15b9b420a9c82`；靜態來源守門（Perl Test::More）
- 原版來源: `modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`
- 執行入口: Perl Test::More → fixed source markers / isolated harness as stated
- Fixture: 只讀固定 CGI 文字；index/regex，不 eval
- 斷言: 16 assertions：CheckWholeStore→無條件 RequireFile→EXP；result.function 選 item:: symbol、missing symbol跳過、全店/targetidx/effective count/USE/active shop/ITEM namespace 綁定在 dispatch前；return verbatim；compiler functionbefore與function 分開；唯一 dynamic invocation site
- 限制: 雖是 .t 但不執行原版 callback；不證明執行順序以外的實際 side effects、合法取得或持久化

