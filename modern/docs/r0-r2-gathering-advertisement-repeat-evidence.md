# R0/R1 第十三批：採集、劍地圖多次 USE、廣告

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。四檔原版 source USE／memory GameCore 差分，10 個 USE rows。未重跑，不冒充正式玩家；#62/1 兩店 memory CAS 與正式 HTTP 的拒絕必須同時保留。

## r2-repeat-use-source.test.mjs

- 固定 blob：`e0b9532ce8cfb41a04f2ac63244cd2aa682e52d3`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：80–128 compare actual Perl offer time、count、stock、money、time、EXP、market、receipts、draws；129–154 5 EXP fixtures、四步 #14/0 sequence（7200/7128/7056 秒，20/40/60 EXP）；155–195 double-create/lostbook/cap/limit/financial/time clipping、原版拒絕 snapshot；197–209 peddle 1.5 clock。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-repeat-use-probe.pl`。
- Fixture：memory init/open/#79/0 gift；固定 now=1000000，部分 fixture 注入 EXP、stock、money、time/job；controlled random samples，Perl GetBuffer/funcb/UseItem/LIMIT_EXP；job hook 以 source GetNumber 隔離。
- 限制：合法 memory 取得地圖不等同正式玩家；有注入／固定時鐘及 RNG、無 v2；不升格 P4/P5 之外的正式證據。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：14/0。

## r2-self-advertisement-source.test.mjs

- 固定 blob：`05997d2b25a28bfd28950a96d21ca8578dc5c3be`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：55–110 #62/0 rule、EXP100、自耗、編譯字段及全狀態/receipts/logs/rand(1000)；111–123 五 rank × 四 draw 邊界、peddle、cap；124–144 缺 item/count2/缺或多 draw 不變；145–169 #62/1 memory-only、#62/2/#65/0–2 無規則及 source drift。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-self-advertise-use-probe.pl`。
- Fixture：人工 #62、money100000、time956800、rank/job/EXP；rand override、log stub。
- 限制：僅 #62/0 差分；不能將 #62/1、#65 registry 檢查視為實際交易；非正式 RNG、取得、HTTP/v2。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：62/0。

## r2-target-advertisement-source.test.mjs

- 固定 blob：`1d35c84feb80cd9f718496163495013fa6e97090`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：56–126 人工兩店，5h、EXP0、原版自耗、actor/target stock/rank、money/time、market、receipt、log、revision+1、0 draw；127–133 七 rank 與 peddle 無倍率；134–169 invalid/own/missing target、stale、callback、guild/status/rank 等拒絕不變；170–181 source drift。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-target-advertise-use-probe.pl`。
- Fixture：memory initialize/open 兩店，注入 #62、time、money/rank/job；Perl actual UseItem 和 target callback，WriteLog recording。
- 限制：受控 memory CAS，非正式 HTTP 授權、跨店持久化或 v2；現行正式 targetShopId 拒絕 flag 保留 false；不以 memory CAS 標記正式 cas。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：62/1。

## r2-gathering-map-uses.test.mjs

- 固定 blob：`8815ba2c9ebd2fbace4cc7d8549a6b7ea6435f88`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：70–117 source rule、dry-run draws、compiled fields/creates、全 stock/market/EXP/time/money/receipt、mapDestroyed；118–130 #12/0–3 #9/0–2 七配方、兩 lostbook cases、material job first-use clock；131–148 缺 map/來源 drift 拒絕不變。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-gathering-use-probe.pl`。
- Fixture：memory init/open/#79/0 gift，直接將 time 設956800，job 與 randomDraws controlled；Perl GetBuffer/UseItem/MakeAmount/lostbook。
- 限制：地圖經 memory command 取得，但真時間／RNG／HTTP/v2 未驗；七配方差分不等同各自完整玩家驗收。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：12/0、12/1、12/2、12/3、9/0、9/1、9/2。

## 證據界線

#62/1 具真正原版兩店 callback 與 memory revision+1、原子拒絕，但未授權正式 HTTP 或 v2，多店身份與 guild 依賴不接管；#62/2/#65/0–2 不加正向旗標。#9/#12/#14 的 memory 合法 gift route 不算真玩家實證；不把 deterministic random replay 當真 RNG。10 rows 的 perlOracle/nodeDifferential 已定位，其他旗標不變。
