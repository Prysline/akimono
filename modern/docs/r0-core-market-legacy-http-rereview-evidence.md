# R0 第四十九批：Core／市場／歷史 HTTP／來源稽核重新覆核

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；六份測試原文實讀，market probe 另核對 source 路徑與 stub 節錄；維持3有效3歷史。未本機重跑。

## game-core-contract.test.mjs

- 固定 blob：`e6e05fab415c1ee0b1ad76d5ec056000d612a920`；歷史／fixture。
- 實際斷言：L45–107 source marker、79/116/25 raw metadata、freeze/unsupported；L109–254 初始化/開店/上架/清架 pure apply、immutable/錯 command/street/revision；L255–314 真 memory commit/連續2次/同 rev 競爭/invalid transition；L315–402 memory encode/decode、malformed snapshot/command、malicious module mutation、街道中立與 deterministic replay。
- 執行路徑：createMemoryWorld → applyGameCommand/executeMemoryCommand/createMemoryWorldAdapter；僅 DSL supplied 的 StandardStreet subset。
- 限制：固定 now1000000、舊 memory schema；L45–49 只寬鬆 regex/marker，不是 SHA pin；raw metadata nonexecuting，無 market/event、HTTP/disk/v2。兩提案真 CAS 只同程序 sequential，非並行程序。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/new.cgi` @ `9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7`；`modern/tests/original-perl/sc-s.cgi` @ `0bada620cff769bed782707d61b87e48cce0a58c`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/standard-street-module.mjs` @ `abf89cb14a24479f98ec00374d48657cc1f45d81`；`modern/src/standard-street-model.mjs` @ `c624fbb9f2c141bd539b7dfec86a48d3ba373efc`。

## market-buy-core.test.mjs

- 固定 blob：`56d39115e402654e89e88cb07d996199113f784e`；有效／Perl Oracle / Node 差分。
- 實際斷言：L109–315 Registry #10/11/14、受控 pure projection、真 sequential CAS、clamp/stale/hook fixture/time cap、legacy 3代存檔；L318–445 36歷史 Perl cases（#14 static fixture）及 global/item hook；L448–638 #39三案差分、legacy 2代/registry guard、#1/14 BASE多股量 quote；L641–803 #12/14 動態16案差分、人工#1 carryover、#64 FUNCBUY fail-closed、guild/EVENT、registry；L805–843 舊 command 排除/regex；L845–864 #25 controlled refusals；L867–943 P5 #13 16案差分與 zero-price guard。
- 執行路徑：source market-buy registry / applyGameCommand / executeMemoryCommand / legacy store；5個明示 Perl probes（R2-A、R2-B39、pricehalf、dynamic、P5）及 supply probe。
- 限制：原版 buy-s auth/lock/read/write/commit 多為 stubs/counters；36案 #14 使用特意保留 static quote fixture，不能作正式動態價格；#1 stock carryover、#64 rich/stock、#25 cap 皆人工，不算合法取得。cash/cap clamp #10 同時市場供貨有限，未隔離原因；多數拒絕 pure apply，非 CAS；synthetic hook 只契約順序、#64 voucher 實際拒絕。legacy disk 非正式 v2，無 HTTP；未逐項重讀全部探針，只核對上述 probe 的 stub/source 路徑段落。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/standard-street-module.mjs` @ `abf89cb14a24479f98ec00374d48657cc1f45d81`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/original-market-buy10-probe.pl` @ `42849c0ac02a0ed7e9514dd5c6d4283ff7e9733b`；`modern/tests/original-perl/original-r2a-market-buy-oracle.pl` @ `2971619a20e28bfb15c5f940fb02a98fb4a03381`；`modern/tests/original-perl/original-r2b-market-buy39-probe.pl` @ `adcb783162d2eaf40d1b70aa36a0eb91dbd9a127`；`modern/tests/original-perl/original-r2b-pricehalf-probe.pl` @ `7b4bb9e5702cc7765254cf7d6501ae0ad7dc3d95`；`modern/tests/original-perl/original-r2b-dynamic-market-buy-oracle.pl` @ `e6955be9109ad317d14bc551f65d38235b3df2d3`；`modern/tests/original-perl/p5-book-work-market-oracle.pl` @ `a44186ed8d59ab0aad76139b4f12832af24ee32a`。

## p1-advanced-medicine-persistence-http.test.mjs

- 固定 blob：`f7d4ae9ddb4372a8152d84ab0b719302dce5e2ed`；歷史／歷史 HTTP。
- 實際斷言：L19–85 legacy boot、HTTP use/save/denial；L86–172 無人工正向資產、gift/#12 gather、買#15、五USE、EXP200/220/600/660、高藥/ether/elixir、gen1/2 各真 Node restart/load；L174–187 stale generation/負count；L189–221 4種 checksum-correct forgery或壞checksum，真啟動回退gen1。
- 執行路徑：spawn tests/support/legacy-dev-local.mjs → /api/initialize/open-shop/use/supply/buy/save/load → B43 slots；HTTP state exact。
- 限制：固定 AKIMONO_E2E_FIXED_NOW=1000000 與 DETERMINISTIC_RNG=1，並非原版自然 RNG/時鐘；legacy B43 checksum 無正式 v2 HMAC/inner checkpoint；負向 isolated disk rewrite 非玩家注入。拒絕只比 world，未逐槽比 bytes；無 browser。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/tests/support/legacy-dev-local.mjs` @ `992a03097c4631ad7ee58c928942547d994724b3`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/support/legacy-career-save-replay.mjs` @ `62edcd02637f2b07bcdb79c6cec811f13e3c287e`。

## p2-career-persistence-http.test.mjs

- 固定 blob：`d99418bda4d3f96b137bab9d9694ebec4856558a`；歷史／歷史 HTTP。
- 實際斷言：L17–109 legacy boot/HTTP helpers/rehash；L110–208 合法操作取得材料/轉 cow EXP25=20→30、奶/2400s、轉 drug EXP15=15→35→55、兩真重啟；7種 job/EXP/product/proof/history/RNG/checksum forgery 回退；L209–242 13職業與 release、各 save/reset；L244–278 P1 legacy anchor/career proof、HTTP forgedProof拒、第二代重啟。
- 執行路徑：spawn legacy-dev-local.mjs，固定 clock/RNG，HTTP /api/use/supply/buy/save/load/reset，B43 career proof。
- 限制：positive 不人工注入，但 deterministic fixture/legacy disk；13 choices 每次 reset 的新世界，不是同玩家全長程；只第一職業測解除，13職業各未逐一 restart。legacy SHA checksum/proof 非正式 v2 HMAC；負向磁碟手改僅隔離攻擊 fixture；非真 RNG、browser。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/tests/support/legacy-dev-local.mjs` @ `992a03097c4631ad7ee58c928942547d994724b3`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/support/legacy-career-save-replay.mjs` @ `62edcd02637f2b07bcdb79c6cec811f13e3c287e`。

## p5-book-work-market-source.test.mjs

- 固定 blob：`f00a3cb058ed64c7dbbd7e5de2958c6c81ec1798`；有效／Perl Oracle。
- 實際斷言：L6–49 原版16案，7成功9拒絕；零價/零稅/cash/paytoday/gift 不變，職業/鑑定 time600/300/450/225、cap/wholesale、callback stage、成功 log 與拒絕無寫/無log。
- 執行路徑：Perl p5-book-work-market-oracle.pl → fixed buy-s.cgi transaction 與 BASE compiler fragments；Node .test 檢查 oracle，無 Node market transaction（另 market-buy-core L867–943）。
- 限制：原版 oracle auth/lock/IO stub、commit/write counter、人工狀態、tax固定0；非 formal market/HTTP/CAS；held 與 sold-out 都 marketBefore0，未單獨隔離 owned cap；log 為收集非持久化。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/p5-book-work-market-oracle.pl` @ `a44186ed8d59ab0aad76139b4f12832af24ee32a`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`。

## source-audit.test.mjs

- 固定 blob：`b03dc6f5227f6172b60d166bcb8cc07c8d12c11f`；有效／靜態來源。
- 實際斷言：L11–20 synthetic ITEM/USE/need/use/get 與 owner line；L22–29 synthetic Perl raw 保存不 eval；L31–41 實際兩 DSL parse、79/116/25/7 counts、ID1–79、首 ITEM no10、zero audit issues。
- 執行路徑：parseDsl/validateStandardStreet；讀兩凍結 DSL。
- 限制：僅結構 parser/declaration，不是 compiler 或 runtime；第一案 ownerItemLine 不直接驗 owner ID join；未驗 SHA/所有 raw byte 相等、全部 USE/EVENT 可執行。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/src/parse-dsl.mjs` @ `1e81a659e8f24ef0e4aa1124adb37e2c47aec234`。
