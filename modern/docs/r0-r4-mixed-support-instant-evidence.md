# R0 第 23 批：R4 混合 support／instant EVENT 證據

固定候選上批 HEAD `57dfd4d950fd93854a757367f3fc34f4c7ad1348`。以下為來源審閱與證據分類，未在本批本地重新執行測試；CI 另核對。

共同 probe 從原版 compiler initializer 建立 17-key EVENT hash；由固定 DSL 擷取 STARTFUNC 與 ITEM PARAM，將 callback 寫入臨時目錄，eval 原版 inc-turn END/START/NOW 片段。`GetPath` 捕捉 NOW traversal；原版與 Node 共用同一 probe 提供的 hash 順序及受控亂數。非完整遊戲 loop。

support 第三案例人工設 cap 附近資產並跳時；theft 手動補 #10/#64，僅 active state/部分 shop 結果銜接。Perl .t 的其他 callback 群有獨立原版斷言，但其 Node 對應測試仍待後續逐檔審閱。

限制：單店人工 79 格庫存／展示／現金人氣；每次 3600 秒、人工 gate hit/miss、millionth draws 與同一 Perl 程序實際 EVENT/active hash 順序；DataRead 僅 generated ITEM PARAM overlay，非完整 DataRead；人工補機器人/商品及跳時，GetMoneyString/log/軍隊公會 IO stub；不是正式 RNG／連續遊玩／period／CAS／HTTP／v2。

## r4-mixed-support-gate.test.mjs

- 四 cases：七 durable 與 getmoney/getpop hit、miss、cap 999999999/10000、期限狀態銜接；比 ITEM overlay、shop、logs、draw range/count、noncommittable；另三次 Perl 程序各自 hash order；錯 reviewer/order/active state、缺店/RNG 拒絕且輸入不變。
- 原版執行：`modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl` → 原版 17-key compiler/END/START/NOW；`projectOriginalR4MultiEventFixture` 差分。
- 分類：有效；Perl Oracle／Node 差分（混合 support STARTFUNC）。
- 限制：單店人工 79 格庫存／展示／現金人氣；每次 3600 秒、人工 gate hit/miss、millionth draws 與同一 Perl 程序實際 EVENT/active hash 順序；DataRead 僅 generated ITEM PARAM overlay，非完整 DataRead；人工補機器人/商品及跳時，GetMoneyString/log/軍隊公會 IO stub；不是正式 RNG／連續遊玩／period／CAS／HTTP／v2。

## original-r4-mixed-support-gate.t

- probe exit/JSON；17 keys、四 cases、七 active、補助 200000／人氣6000、miss 不變、金錢/人氣上限、ranges/count。
- 原版執行：`modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl` → 原版 17-key compiler/END/START/NOW；Perl Test::More 直接斷言 probe JSON。
- 分類：有效；Perl Oracle（混合 support STARTFUNC）。
- 限制：單店人工 79 格庫存／展示／現金人氣；每次 3600 秒、人工 gate hit/miss、millionth draws 與同一 Perl 程序實際 EVENT/active hash 順序；DataRead 僅 generated ITEM PARAM overlay，非完整 DataRead；人工補機器人/商品及跳時，GetMoneyString/log/軍隊公會 IO stub；不是正式 RNG／連續遊玩／period／CAS／HTTP／v2。

## r4-mixed-instant-gate.test.mjs

- 六 theft cases：七 durable＋support＋manbiki/goutou、shop stock/rank/money/robot、ITEM overlay、active state、logs、draw ranges/count；robot 保護/破壞各兩次 rand(1000)；三次獨立 Perl 程序；錯 reviewer/shape/order、缺店/RNG 拒絕且輸入不變。
- 原版執行：`modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl` → 原版 17-key compiler/END/START/NOW；`projectOriginalR4MultiEventFixture` 差分。
- 分類：有效；Perl Oracle／Node 差分（混合 instant STARTFUNC）。
- 限制：單店人工 79 格庫存／展示／現金人氣；每次 3600 秒、人工 gate hit/miss、millionth draws 與同一 Perl 程序實際 EVENT/active hash 順序；DataRead 僅 generated ITEM PARAM overlay，非完整 DataRead；人工補機器人/商品及跳時，GetMoneyString/log/軍隊公會 IO stub；不是正式 RNG／連續遊玩／period／CAS／HTTP／v2。

## original-r4-mixed-instant-gate.t

- probe exit/JSON；6 theft、4 loto、4 happy、4 iron/sword、4 guild、5 rebel cases；分別斷言票數/獎金/亂數、happy START/END/NOW、十 durable 與 ITEM #5/#40 overlay、guild 領地／期限邊界、rebel self-delete/RIOT army/NOW order、theft 機器人保護及破壞。
- 原版執行：`modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl` → 原版 17-key compiler/END/START/NOW；Perl Test::More 直接斷言 probe JSON。
- 分類：有效；Perl Oracle（混合 17-key callback 群）。
- 限制：單店人工 79 格庫存／展示／現金人氣；每次 3600 秒、人工 gate hit/miss、millionth draws 與同一 Perl 程序實際 EVENT/active hash 順序；DataRead 僅 generated ITEM PARAM overlay，非完整 DataRead；人工補機器人/商品及跳時，GetMoneyString/log/軍隊公會 IO stub；不是正式 RNG／連續遊玩／period／CAS／HTTP／v2。

