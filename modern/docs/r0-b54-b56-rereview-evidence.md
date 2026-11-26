# R0 第四十五批：B54–B56 既有分類重新覆核

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；四份測試、一份 B55 probe 與 B54/B56 runtime 原文實讀。維持1有效3歷史，未本機重跑。B56 重疊只計一次。

## b54-repeatable-source-command-draws.test.mjs

- 固定 blob：`533ad00ca9f6e9bc981375248f4d9fa98d216939`；歷史／fixture／現代 policy。
- 實際斷言：L14–23 121 個整數 millionth、freeze、重播、59-prefix；L24–33 revision/worldId/clock/args/kind 各變更時前8 draw 不同；L34–46 十種 malformed state/command/count 拒絕。
- 執行路徑：sourceCommandDraws；SHA-256 48-bit rejection sampling、固定 domain。
- 限制：本地 migration replay policy，不重建 Perl process rand；固定人工 world/revision/time，沒有真 RNG、HTTP、CAS、重啟；未測 use-item domain 或統計均勻性。
- 來源／入口：`modern/src/local-source-command-draws.mjs` @ `e609be0da8d547c4e4796277d1971d06addb2901`。

## b55-source-event-callbacks-live-cas.test.mjs

- 固定 blob：`e6a43f621e7260cac85bbc23b9e4162f20f8301b`；歷史／Perl 差分＋fixture CAS。
- 實際斷言：L55–76 十例 79-slot/rank/money/ret/log/draw 差分、輸入不變；L77–103 三 source mutation、六 projector 拒絕；L104–210 memory 實買2、售1、unknown EVENT 拒買、人工 goutou callback 成功與多餘 draw 拒絕全狀態不變、legacy disk save/load、bounded prefix 再售。
- 執行路徑：reviewOriginalInstantEventCallbacks → projector；executeMemoryCommand → reviewed-instant-event-callback-fixture；legacy-world-save-store，後續 applyGameCommand 選出符合 draw 長度的 prefix 再 commit。
- 限制：Perl callback-only，格式 stub、ITEMNO 手動替換；固定 time 與人工 draw；明示 naturalEventTriggered=false，EVENT state null；後續售出透過選擇可接受 prefix，非自然玩家 RNG；legacy disk 非正式 v2/HTTP/新程序重啟。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/original-b55-instant-event-callback-probe.pl` @ `8c6676d015543e259e4f05117d1e062dd0a71e34`；`modern/src/original-instant-event-callbacks.mjs` @ `20037b8142b560ae5aeab583c56b06aaf09e43b6`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/original-perl/original-market-buy10-probe.pl` @ `42849c0ac02a0ed7e9514dd5c6d4283ff7e9733b`；`modern/tests/original-perl/original-b41-real-sale-probe.pl` @ `cffc93c2f78409198d4fa7bcf218633fd029afb4`。

## b56-source-event-time-slice.test.mjs

- 固定 blob：`23f61d009dc750169fa6faa3c0c0d221a751be9c`；歷史／fixture CAS。
- 實際斷言：L107–125 17 key、publicGameplay=false、兩 source drift；L127–209 pre-EVENT 比 B41、原狀態不變、goutou slice rev+1/time+1800、rank/stock/money/market、3 start codes、18 draws、legacy save/load 及第二 slice；L211–244 五種 unsupported/order/draw 拒絕 whole memory snapshot、unknown incoming state 拒絕。
- 執行路徑：reviewB56EventSlice → R3 pre-EVENT 與 GameCore advance-source-time-reviewed-events → legacy save/load；第二段 sourceCommandDraws + prefix search。
- 限制：event order 為 compiled list reverse，非 Perl process hash order；人工 0/999999 trigger tape、固定時間，僅 goutou callback 與兩零機率 gate；無獨立 Perl 全 EVENT oracle；第二段對失敗 trial 無逐項原因斷言；L157–163 null state guard 省略多個 reviewed contract 參數，不能單獨證實 guard；非正式 v2/HTTP/真 RNG。B56 是 #23/#24 重疊唯一基線列，不重複計數。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/src/original-b56-event-time-slice.mjs` @ `55a4d598b719b140d632cca012eff284623cebbb`；`modern/src/original-b41-playable-sale.mjs` @ `47100f2d430e4bb7a59d49ccb3f7a07a931caf9f`；`modern/src/local-source-command-draws.mjs` @ `e609be0da8d547c4e4796277d1971d06addb2901`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/original-perl/original-market-buy10-probe.pl` @ `42849c0ac02a0ed7e9514dd5c6d4283ff7e9733b`；`modern/tests/original-perl/original-b41-real-sale-probe.pl` @ `cffc93c2f78409198d4fa7bcf218633fd029afb4`。

## original-b55-instant-event-callback.t

- 固定 blob：`2621b7c32db8ea6e83efbe69e3aa447f33766c0d`；有效／Perl Oracle（受控）。
- 實際斷言：L10–44 exit/JSON、十固定案例：未命中、floor(stock/10)、robot 生存/損毀、floor(stock/4)、rank 5000→4000、空架；全部 ret=0、draw count。
- 執行路徑：Perl .t → original-b55-instant-event-callback-probe.pl；取 DSL manbiki/goutou STARTFUNC eval。
- 限制：probe L29 格式 stub、L54 robot ITEMNO 手動替換64；L78–89 人工 stock/rank/draw；直接呼叫 callback 不跑 gate/hash order/完整編譯/磁碟；L97–112 對 ret 非0拒絕但 undefined 也輸出0，非原始 ret 型別精確證據。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/original-b55-instant-event-callback-probe.pl` @ `8c6676d015543e259e4f05117d1e062dd0a71e34`；`modern/src/original-instant-event-callbacks.mjs` @ `20037b8142b560ae5aeab583c56b06aaf09e43b6`。
