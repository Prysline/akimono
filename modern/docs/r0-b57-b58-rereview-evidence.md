# R0 第四十六批：B57–B58 既有分類重新覆核

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；四份測試及兩份 probe 原文實讀。維持2有效2歷史，未本機重跑；不升格正式玩家。

## b57-source-support-events-live-cas.test.mjs

- 固定 blob：`4faa0d78e2f66630243eecdc77cf85caefa0cdfb`；歷史／Perl 差分＋fixture CAS。
- 實際斷言：L106–145 十一例 stock/money/rank/ret/message/draw 差分、輸入不變與兩 callback 串接；L147–183 五種來源 mutation、八種 projector 拒絕；L185–224 買#10、自然售出後同 CAS 加100000資金及1000 rank、cap、19 draws、event starts/messages、market/營收不受援助影響、legacy load exact；L226–252 四種 fixture 拒絕全 snapshot，stale pure apply。
- 執行路徑：reviewOriginalSupportEventCallbacks → projector → advance-source-time-reviewed-events memory CAS；legacy-world-save-store 同程序 save/load。
- 限制：固定 time、人工 trigger/order/draw；原版 callback-only、格式 stub；非完整 EVENT gate 差分。標題 restart 實際無子程序重啟。happy 負例只查 SOURCE_BOUNDARY_REJECTED，未隔離 typed/duration 缺 draw 或其他 guard；stale apply 未送 adapter。非正式 HTTP/v2。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/original-b57-support-event-probe.pl` @ `df54790978348c5f7854bd25c93fdf3df3cd4a8f`；`modern/src/original-b57-support-event-callbacks.mjs` @ `09b98a21f1890f16f7fb7ff7d9efbea2a61de335`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/original-b56-event-time-slice.mjs` @ `55a4d598b719b140d632cca012eff284623cebbb`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/original-perl/original-market-buy10-probe.pl` @ `42849c0ac02a0ed7e9514dd5c6d4283ff7e9733b`；`modern/tests/original-perl/original-b41-real-sale-probe.pl` @ `cffc93c2f78409198d4fa7bcf218633fd029afb4`。

## b58-source-loto-real-ticket-cas.test.mjs

- 固定 blob：`b8375c16be1385c9c223c6a22f98579484ea5ee4`；歷史／Perl 差分＋fixture CAS。
- 實際斷言：L145–170 十五例五獎級/邊界/未中/cap/stock/log/draw；L172–227 六 source mutation、market review 拒絕、九 projector 拒絕；L229–251 原版單張 #11 價2000/時間與現代雙張購入4000/600s、#10 shelf 消失；L253–335 固定 lottery draws，耗2券、獎110000、log/營收/維持費/market、CAS rev+1、legacy reload 與空券再抽；L337–373 八種錯 tape/order 拒絕全 snapshot，stale pure apply。
- 執行路徑：reviewOriginalLotoStartfunc → projector；source market-buy → advance-source-time-reviewed-events memory CAS；legacy store；先 search valid sale prefix 再 commit。
- 限制：原版 callback-only，人工庫存、固定 draw 與 WriteLog 收集 stub；整合預期採 Node projector 非獨立同 world Perl oracle，actualPerl mixed-three 只核對 logs.length；#10 實際是否售出未獨立斷言；L200–210 buy10 mutation 同時 model 可能 undefined，未隔離；同程序 reload 非正式重啟/HTTP/v2，非真 RNG。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/original-b58-loto-event-probe.pl` @ `67d301c603c053451a5c33bf7bf802c253899f11`；`modern/src/original-b58-loto-startfunc.mjs` @ `a07b84e4df95e86b8c2daac65a56e8dda17efadb`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/original-b56-event-time-slice.mjs` @ `55a4d598b719b140d632cca012eff284623cebbb`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/original-perl/original-market-buy10-probe.pl` @ `42849c0ac02a0ed7e9514dd5c6d4283ff7e9733b`；`modern/tests/original-perl/original-b41-real-sale-probe.pl` @ `cffc93c2f78409198d4fa7bcf218633fd029afb4`；`modern/src/original-market-buy11.mjs` @ `270e407b820f0efdaaa6a5c4610ec37551c4b459`；`modern/tests/original-perl/original-market-buy11-probe.pl` @ `21a28ab028c3a7ef8856d2d5ef1646909e7b87ba`；`modern/src/local-source-command-draws.mjs` @ `e609be0da8d547c4e4796277d1971d06addb2901`。

## original-b57-support-event.t

- 固定 blob：`724907644bc4ee64c87c585c1b1e609c5c61d82f`；有效／Perl Oracle（受控）。
- 實際斷言：L10–53 exit/JSON、十一例資金與人氣命中/拒絕/threshold inclusive/cap、兩回呼共享 draw 串接、每案 ret=0、draw=1、79 inventory 長度。
- 執行路徑：Perl .t → original-b57-support-event-probe.pl，抽取 DSL STARTFUNC 直接 eval 執行。
- 限制：probe L26–38 formatter stub、MaxMoney 來源 marker 後人工常數，非編譯器實跑；每案人工單店/stock/rank/money/draw，combined 同店兩回呼；無 EVENT gate/hash order/磁碟，ret 數值檢查後輸出0，非型別證據。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/original-b57-support-event-probe.pl` @ `df54790978348c5f7854bd25c93fdf3df3cd4a8f`；`modern/src/original-b57-support-event-callbacks.mjs` @ `09b98a21f1890f16f7fb7ff7d9efbea2a61de335`。

## original-b58-loto-event.t

- 固定 blob：`399b9ed529234431d39d8ea668f75d1b6b3a0373`；有效／Perl Oracle（受控）。
- 實際斷言：L9–57 exit/JSON、15 cases、rand range6096454、五級與五個嚴格邊界、未中/零券、多券、cap、每張一 draw、全部清券、opening log level2。
- 執行路徑：Perl .t → original-b58-loto-event-probe.pl，抽 DSL loto STARTFUNC 直接 eval 執行。
- 限制：probe L25–40 GetMoneyString/WriteLog stub、MaxMoney marker 後常數；人工券庫存與 exact integer draw，不驗自然 RNG 或合法取得；原版 gate/hash/persistent log 未跑；ret 數值檢查後輸出0。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/original-b58-loto-event-probe.pl` @ `67d301c603c053451a5c33bf7bf802c253899f11`；`modern/src/original-b58-loto-startfunc.mjs` @ `a07b84e4df95e86b8c2daac65a56e8dda17efadb`。
