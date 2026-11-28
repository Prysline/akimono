# R0 第二批：hash replay、CAS 與 shop history

固定正式 base；此批 5 檔 3 有效、2 歷史，均非新增正式玩家正向驗收。

## modern/tests/r4-perl-hash-replay.test.mjs
- blob: `aa4ec4740619345a910e59ea5e1ba78a80890965`
- 有效／來源差分／受控 RNG
- 來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`
- 入口：resolveR4HashOrders/reviewR4HashPolicy；execFileSync perl original-r4-event-hash-order-probe.pl；createR4TimeDraws
- 斷言：revision 7–10 原版 Perl EVENT keys order 等值、delete/reinsert 後 NOW keys、拒 interpreter/source drift、unknown keys、null EVENT；221 draw range、同 command 重現/不同 revision 差異、loto 超百萬結果
- fixture：固定 synthetic worldId/revision/now/active map、PERL_HASH_SEED、PERL_PERTURB_KEYS=0；noncommittable
- 限制與風險：單 slice v1 hash bridge，非跨期 command replay/正式 HTTP、保存或原版全 RNG stream
- 處置：保留原版差分；正式 command trace、跨期與 v2 另連結

## modern/tests/r4-source-cas-http-save-restart.test.mjs
- blob: `ae436ec67a9020881471549fccb1bd4ac6129e8d`
- 歷史／legacy HTTP／雙世代 fixture
- 來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`
- 入口：tests/support/legacy-dev-local.mjs；/api/supply、/api/advance-time、/api/save/load
- 斷言：合法歷史開店/供貨/買 #10；1025980+60 跨 1026000 拒絕、world/revision/settledCount 不變；save 1→2、重啟等值，再拒跨期
- fixture：固定 now 1025980、deterministic RNG=1、legacy server、tmpdir
- 限制與風險：不是現行正式 reviewed-time 或 v2；舊跨期 veto 不能判定現行跨期支援
- 處置：保留歷史拒絕與保存證據；對應正式 /api/advance-reviewed-time 與 v2 安全測試

## modern/tests/r4-source-world-transition-cas-guard.test.mjs
- blob: `d9728e55aead57c55cf809c20fd678c3fb020857`
- 歷史／舊 CAS／nonCommittable 與 legacy store
- 來源：`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/market.cgi` @ `1aca77e9b373c25e53e445d64c101a7cc2246825`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`
- 入口：createStandardStreetModule（無正式 reviewed opt-in）、createSourceReviewedMemoryWorldAdapter、applyGameCommand、allowR4UnsettledWorldTransition、legacy-world-save-store
- 斷言：同周期成功、跨期/缺 reviewer/forged settledCount/城市/未知 EVENT/軍隊/clock drift 拒絕；nonCommittable receipt veto；直接 CAS 拒 stale/invalid initial；惡意自審 module 無法越過已綁定 reviewer；零時程不得造 iron/happy/sword EVENT；兩舊世代不變
- fixture：synthetic period seed、固定 clock、mkModule stub、直接 forged state、legacy disk store
- 限制與風險：共用 GameCore guard 有回歸價值，但舊 nonsettling reviewer 不等同現行正式 source-reviewed crossing；legacy 存檔不等於 v2
- 處置：保留原子性/guard fixture；正式 HMAC/replay/HTTP 另驗

## modern/tests/world-shop-history-model.test.mjs
- blob: `8ebf23788918415c0ccd71d02c3be890b783b06f`
- 有效／來源守門／純 parser
- 來源：`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`
- 入口：parseReviewedShopHistoryWorld → parseReviewedOneShopWorld；原版 reader/writer marker
- 斷言：三 history maps / key 1..79 / safe max、排序與 immutable；拒 odd/duplicate/unsafe key/overflow、超 8 users、CRLF/NUL/額外資料列/unknown EVENT/town；只回 user count 不洩 fixture values/password、不 grant auth/write
- fixture：synthetic one-shop comma/colon wire、固定 timestamp；無 FS writes 或 live auth
- 限制與風險：較原版嚴格的 read-only parser，不等於現行 v2 careerProof 或 HMAC
- 處置：保留來源格式與輸入守門；禁止誤用為存檔 replay 或 auth 證據

## modern/tests/original-perl/world-shop-history.t
- blob: `424703aef8004dec85c570bb887704580866f671`
- 有效／原版 Perl Oracle／受控 DataRead
- 來源：`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`
- 入口：從 inc-func.cgi 擷取 DataRead、AutoVar、header list，eval 原文；File::Temp play.cgi
- 斷言：三 maps immediate hash、item/user lazy tie、Get 保原 raw 到 FETCH；空欄、tab/comma；原版接受 odd pair (undef) 及 duplicate 後值覆蓋
- fixture：synthetic one-shop 32 fields；GetPath/OutError/GetDTPoint stub、alarm 2 秒；無 live auth/callback 或 live write
- 限制與風險：證明原版 DataRead/AutoVar 差異，不證明正式存檔接受 malformed wire
- 處置：保留原版 Oracle；對照 JS strict parser fail-closed 與 v2 格式分層
