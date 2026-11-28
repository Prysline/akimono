# R0 批次：禮物卷與 #10 市場原版差分（未結案）

固定正式 HEAD `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；接手候選 `750c7a447db4714f0d76f2790acf0bc79a738cc9`。本批只審閱固定來源與測試，不執行測試、不新增玩家正向驗收。保留 legacy HTTP、fixture、Oracle 邊界。工作線：R0/R1 證據，#22 正常經營；未修改 runtime。

## reviewed-gift-map-use.test.mjs

- 路徑：`modern/tests/reviewed-gift-map-use.test.mjs`；blob `50a463b24ec0752c003a4abf8c88ef8d5f1febad`。
- 證據：Perl Oracle／Node 差分（受控 memory）。
- 入口：compileReviewedGiftMapUse → executeMemoryCommand / createMemoryWorldAdapter；Perl probe。
- Assertions：來源 #79/0：2券換 #12/#9/#14 各1，1800秒、0金錢／EXP；三次序列第三次拒絕、count 0／stale revision／非法 callback／錯 market fixture、全 stock 與六個 Perl cases 差分、cap、snapshot deterministic；編譯漂移拒絕。
- Fixture：固定 now=1000000；人工79槽零 wholesale、滿倉注入、memory snapshot；Perl runtime 不在時可 skip。
- 限制／風險：受控 source recipe 與 memory CAS，不是現行 HTTP、真時鐘、RNG、正式 v2 或合法市場初始化。
- 處置：保留；現行正式正向／負向路徑另證，不重複實作 #22。
- 原版來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`。
- 執行入口及支援：`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/standard-street-module.mjs` @ `abf89cb14a24479f98ec00374d48657cc1f45d81`；`modern/src/reviewed-gift-map-use.mjs` @ `c0cb84e0c45727d4a0f0129b5fc00734f7e733d0`；`modern/tests/original-perl/OriginalGiftMapUseHarness.pm` @ `4a81cd4b834222acdd059d9ea9a717452fc830c5`；`modern/tests/original-perl/original-gift-map-use-probe.pl` @ `803179a5f298230f9100d7b51630778d2332fa25`。

## original-gift-map-use.t

- 路徑：`modern/tests/original-perl/original-gift-map-use.t`；blob `b0d7fc060e596edd99998861c2cb1191b7e51b73`。
- 證據：原版 Perl Oracle（隔離 compiler／Core）。
- 入口：OriginalGiftMapUseHarness::compile/run → 固定 GetBuffer/ClearBuffer/UseItem/CheckWholeStore。
- Assertions：編譯 #79/0、1800秒、2券與3地圖；time→wholesale→common、無 callback；重複消耗、第三次不足不改 stock/money/time、requested3→2、滿地圖容量仍消耗且 additem=0。
- Fixture：固定初始 shop/time/money/stock、人工79槽 market；隔離 compiler subroutines，非 top-level CGI/disk。
- 限制／風險：原版配方、結果順序與截斷是有效 Oracle；不證明正式玩家取得或 v2/CAS。
- 處置：保留；現行正式正向／負向路徑另證，不重複實作 #22。
- 原版來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`。
- 執行入口及支援：`modern/tests/original-perl/OriginalGiftMapUseHarness.pm` @ `4a81cd4b834222acdd059d9ea9a717452fc830c5`。

## original-market-buy10.test.mjs

- 路徑：`modern/tests/original-market-buy10.test.mjs`；blob `4b293c64cc786f800ea2e25104b2bca5cc5e522b`。
- 證據：混合：Perl Oracle／Node 差分＋歷史 HTTP/CAS。
- 入口：executeMemoryCommand → reviewed-sparse-all-plus → market-buy；另 spawn tests/support/legacy-dev-local.mjs。
- Assertions：空市場拒絕；受控 PLUS 後 #10 5000G、600秒、庫存/稀疏 CSV/支付差分、rev 2→3→4；錯 count/價格/貨架不變、無金錢拒絕；legacy UI markup 與 /api/supply、buy stale replay。
- Fixture：固定時間、Perl 供給 draws、零現金注入；legacy temp save dir 與 HTML/CSS/JS 字串檢查。
- 限制／風險：保留差分與歷史 UI／CAS 證據；舊 /api/supply 非正式入口，無正式玩家重啟、真 RNG 或現行 UI 操作證據。
- 處置：保留；現行正式正向／負向路徑另證，不重複實作 #22。
- 原版來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`。
- 執行入口及支援：`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/standard-street-module.mjs` @ `abf89cb14a24479f98ec00374d48657cc1f45d81`；`modern/tests/original-perl/original-market-buy10-probe.pl` @ `42849c0ac02a0ed7e9514dd5c6d4283ff7e9733b`；`modern/tests/support/legacy-dev-local.mjs` @ `992a03097c4631ad7ee58c928942547d994724b3`。

## original-market-buy10.t

- 路徑：`modern/tests/original-perl/original-market-buy10.t`；blob `e72d5898574d82566eb16b24819cff79c1952fe8`。
- 證據：原版 Perl Oracle（隔離 CGI）。
- 入口：perl original-market-buy10-probe.pl → do buy-s.cgi；實際 calc/item/whole。
- Assertions：PLUS 補貨；空市場／零錢／count 0 不 commit；成功 commit=1、95000G、paid5000、stock1、time957400、market-1、79槽CSV。
- Fixture：固定 supply draws、固定 shop；DataWrite/DataCommitOrAbort、Lock、auth、guild、CGI render stub。
- 限制／風險：commit 次數為 stub 計數，不證明磁碟原子性、正式 auth、CAS 或 v2。
- 處置：保留；現行正式正向／負向路徑另證，不重複實作 #22。
- 原版來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`。
- 執行入口及支援：`modern/tests/original-perl/original-market-buy10-probe.pl` @ `42849c0ac02a0ed7e9514dd5c6d4283ff7e9733b`。

## r2-gift-use-variants.test.mjs

- 路徑：`modern/tests/r2-gift-use-variants.test.mjs`；blob `e8c68b2cbd215a555432c4eb027dd6247129028e`。
- 證據：Perl Oracle／Node 差分（受控 memory）。
- 入口：createStandardStreetModule → initialize-source-market/open-shop → executeMemoryCommand(use-item)；Perl GetBuffer/UseItem probe。
- Assertions：#79/1–4 registry 無 callback；逐變體比較 count、全部庫存/wholesale、money/time/paytoday、use/add rows/messages；#79/2 初始5券 count0 且 snapshot 不變。
- Fixture：固定 now=1000000；memory；#79/2 正向直接注入10券，Perl stock/wholesale fixture。
- 限制／風險：4 分支有效受控差分；#79/2 正向非合法取得，未證正式 HTTP/真時間/RNG/CAS/v2。
- 處置：保留；現行正式正向／負向路徑另證，不重複實作 #22。
- 原版來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`。
- 執行入口及支援：`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/standard-street-module.mjs` @ `abf89cb14a24479f98ec00374d48657cc1f45d81`；`modern/tests/original-perl/original-r2-gift-use-variants-probe.pl` @ `82acbbcc66996ae5dfd750e3de40820bf9e6bda1`；`modern/tests/original-perl/OriginalGiftMapUseHarness.pm` @ `4a81cd4b834222acdd059d9ea9a717452fc830c5`；`modern/tests/original-perl/OriginalFullUseLostbookHarness.pm` @ `2e84c60cf948011e0f32344dde4ee64299793964`。

