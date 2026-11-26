# R0 第四十三批：B48–B49 既有分類重新覆核

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；四份測試及兩份 probe 完整原文實讀。四檔維持有效受控證據，不升格正式玩家或 EVENT 逐項實裝。未本機重跑。

## b48-original-event-start.test.mjs

- 固定 blob：`1dcf75347648df6ff23f55aecf1d474712d3461c`；有效／Perl Oracle／Node 差分（受控）。
- 實際斷言：L24–39 source review 0/-1 與三項 source mutation；L40–56 五案逐值 entered/group/expiry/draw、active count、no notices；L57–72 缺/多 draw、callback、disabled/fractional probability、group shape、duration 拒絕。
- 執行路徑：reviewOriginalEventStart → projectOriginalEventStart；Perl probe JSON 作差分。
- 限制：單 synthetic EVENT，固定 time=1000000、span120、人工 group/draw；Perl 只跑 inc-turn start region，callback 為空，RequireFile/GetPath fail closed；不執行實際 EVENT、period、world IO、HTTP/CAS/v2。
- 來源／入口：`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/original-b48-event-start-probe.pl` @ `be51d29af2f10171a964afc392840537901244af`；`modern/src/original-event-start-gate.mjs` @ `ff91e6f04568523b7e096022c29c03b405752961`。

## b49-original-event-lifecycle.test.mjs

- 固定 blob：`1649d60e70524f6623ace59cf322869698db80d1`；有效／Perl Oracle／Node 差分（受控）。
- 實際斷言：L26–37 strict < expiry mutation 與未審 start 拒絕；L38–52 六案 expired/entered/group/activeUntil/draw 逐值及輸入不變；L53–65 負時間/零 span、缺 draw、callback 拒絕。
- 執行路徑：reviewOriginalEventStart → reviewOriginalEventLifecycle → projectOriginalEventLifecycle；Perl probe JSON 作差分。
- 限制：單 synthetic EVENT，固定 time/span/draw、人工 active expiry；只執行 END/START 區段，無 NOW、實際 callback、period 或正式存檔。Oracle expired flag 由 probe 依條件計算，另有 active map 與 .t 邊界斷言。
- 來源／入口：`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/original-b49-event-lifecycle-probe.pl` @ `1ca0e333dada922fe9bbcd3b39343c68d513b925`；`modern/src/original-event-start-gate.mjs` @ `ff91e6f04568523b7e096022c29c03b405752961`；`modern/src/original-event-lifecycle.mjs` @ `84efa7ab8d9a62b2c37e7e857b4ef4bd3066dcdd`。

## original-b48-event-start.t

- 固定 blob：`d4b54b9aebca9b3784869e00cd228911837dc83b`；有效／Perl Oracle（受控）。
- 實際斷言：L9–28 probe exit/JSON、五案；0 gate 1 draw、無期限不寫 DTevent；正機率 miss/hit、duration 3 draws、occupied 0 draws、到期 1003828/1000120。
- 執行路徑：Perl .t → original-b48-event-start-probe.pl → 原版 inc-turn start region eval。
- 限制：固定 time/span、人工 EVENT 與 draw tape；每案清空 DTevent/LOG，未執行原版 compiler 本體或正式事件 callback、世界 I/O。
- 來源／入口：`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/original-b48-event-start-probe.pl` @ `be51d29af2f10171a964afc392840537901244af`。

## original-b49-event-lifecycle.t

- 固定 blob：`a3a1108f409fd9e056074ee36ce1781a65108731`；有效／Perl Oracle（受控）。
- 實際斷言：L9–32 exit/JSON、六案；fresh 1 draw、active/equal boundary 不重觸發、expired zero retrigger、timed expiry 1003720/3 draws、miss 1 draw。
- 執行路徑：Perl .t → original-b49-event-lifecycle-probe.pl → 原版 inc-turn END/START region eval。
- 限制：每案人工 EVENT、active、time、draw，無 callback/NOW；expired 布林由 probe 依 strict < 條件推導，另查 active end/group/draw；非正式世界週期或玩家。
- 來源／入口：`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/original-b49-event-lifecycle-probe.pl` @ `1ca0e333dada922fe9bbcd3b39343c68d513b925`。
