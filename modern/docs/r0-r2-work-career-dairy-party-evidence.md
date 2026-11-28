# R0/R1 第十二批：逐 USE 打工、職業、乳製品與派對

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。四檔實際比較原版 Perl 交易與現代 memory GameCore，具逐 USE scope；初始化開店後仍人工注入資源或時間，不能升格為合法取得、正式 HTTP、RNG 或持久化。未重跑本批。

## r2-book-work-source.test.mjs

- 固定 blob：`7208bf7fbc429501eb7bc1582af175e500d1bb51`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：57–104 rule/compiled time、exptime、param 與 money/time/paytoday/rank/全 stock/market/EXP、receipts/logs、0 draws；105–115 #13/0–1 multi-count/peddle 與缺書拒絕 snapshot；116–127 source drift fail closed。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-book-work-use-probe.pl`。
- Fixture：先 memory initialize/open，再直接設書1、time956800、money100000、job；Perl GetBuffer/UseItem/_local_1 在 RAM，RequireFile/WriteLog stub。
- 限制：不證明合法取得或真 clock、正式 HTTP/CAS/v2；原版工作 callback 之上另有完整原版隔離 transaction。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：13/0、13/1。

## r2-career-change-source.test.mjs

- 固定 blob：`03dc0209cdba8e2cfa98cdd069c5725eb6d17d2d`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：56–118 規則3h、single-use、param1/4、消耗#78、原版 job/EXP/stock/money/time/market/receipt/log；119–125 全14 USE 各兩組 exp fixture；126–144 donor ID==target EXP 原版異常、cap/default；145–173 缺書/count2拒絕、source drift、offer 不贈送。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-career-use-probe.pl`。
- Fixture：直接置 #78、EXP、job、money100000、time956800；Perl exact GetBuffer/UseItem/inline；log/require stub。
- 限制：14個選項皆有差分，但其前置經驗／書本非合法玩家取得；不證明每種職業的正式 HTTP、UI 或 v2。歷史 offers 111 不覆蓋現行 112。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：78/0、78/1、78/2、78/3、78/4、78/5、78/6、78/7、78/8、78/9、78/10、78/11、78/12、78/13。

## r2-dairy-inline-source.test.mjs

- 固定 blob：`52b733b063bfc7d96ef1e160802f0e9bbfa038c7`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：55–122 #25/0–1、#26/0 compiled fields/uses、stock/rank/EXP/money/paytoday/time/market/receipt/log/draws；123–139 milk/cow death、rank branches、缺牛拒絕 snapshot；140–165 drift、milk provider hint 不贈送；168–175 clipped count、milk cap、部分 mortality。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-dairy-inline-use-probe.pl`。
- Fixture：人工牛／奶、rank/job/money/time；注入 randomDraws，Perl CORE::GLOBAL::rand override；source extracted callbacks，log stub。
- 限制：非真 RNG、真 acquisition 或存檔；#26/1 只證 read-only material hint，不補其差分；不覆蓋現有 P4 正式證據。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：25/0、25/1、26/0。

## r2-party-popup-source.test.mjs

- 固定 blob：`d60246c6a42c1a15e3735443100dbead37fb9d32`。
- 來源：custom/inc-item-data.cgi、custom/inc-rebel-data.cgi、modern/tests/original-perl/inc-makeitem.cgi、modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/core-inc-item.cgi、modern/tests/original-perl/inc-func.cgi、modern/tests/original-perl/core-inc-admin-func.cgi、modern/tests/original-perl/write.cgi、modern/tests/original-perl/inc-turn.cgi、_config.cgi、modern/tests/original-perl/market.cgi、modern/tests/original-perl/item.cgi、modern/tests/original-perl/core-detail.cgi、modern/tests/original-perl/buy-s.cgi。
- 斷言：54–102 #77/0 source time7200、param1000、消耗 gift、rank/stock/money/time/market/EXP/receipts/logs、0 draws；103–125 七個 rank 含 cap，缺 item/count2 snapshot 不變；126–145 drift 與 read-only offers。
- 執行：createStandardStreetModule → executeMemoryCommand(use-item) 與 execFileSync 隔離 Perl probe，`original-r2-party-use-probe.pl`。
- Fixture：memory open 後直接塞 #77、rank/money100000/time956800；Perl exact GetBuffer/UseItem/popup；WriteLog recording。
- 限制：非真取得或正式時間/HTTP/v2；offer count111 為舊測試限定結果，不覆蓋現行 registry。
- 結論：有效，僅 Perl Oracle／Node 差分（受控 memory）。
- 逐 USE：77/0。

## 不升格界線

20 個 USE rows 新增／補強差分證據，14個職業逐選項執行。#13/0–1 與 #25/0–1、#26/0、#78/11–12 既有正式玩家層保留，不因本批 fixture 降格或新增正式旗標。#26/1 acquisition hint 並非差分，未補其 flags；ITEM 不因其 USE 被測即算完整取得。所有正式 RNG 及時間證據仍依 P4/P5 或其他真玩家測試。
