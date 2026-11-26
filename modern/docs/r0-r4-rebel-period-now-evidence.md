# R0 第二十一批：R4 RebelRobin 跨期觸發→NOW

固定正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。本批逐檔審閱四測試、兩 probe、兩 projector。period.cgi L145–152 為 extension/trigger wrapper，L206–224 為 RebelRobin；inc-turn.cgi 的 SortDT/period/PLUS/CheckWholeStore/END/START/NOW 順序只由 reviewer marker 驗證，combined probe 實際直接執行 period rebel wrapper 後接 EVENT L282–363，並非完整跨期。原版 period 隨後的軍隊合併/欠薪/backup 未納入。

## r4-source-rebel-period-trigger.test.mjs

- Blob：886c2e868fb44fd6b43e4f2c6d6eede309d5f43b
- 分類：有效｜Perl Oracle／Node 差分（period RebelRobin）
- 斷言：七 cases 比 town/eventState/expiry/logs/draw ranges/count，noncommittable 與輸入不變；舊但 truthy 期限延至1259200、rand(100)恰30不觸發；兩次獨立 Perl probe；source drift、未審 NOW、draw不足/過量、leader不合、expiry0拒絕。
- 執行：reviewOriginalCompiledEventCatalog → reviewR4RebelNow → reviewR4RebelPeriodTrigger；execFileSync Perl probe → projectR4RebelPeriodTrigger
- Fixture：七人工城鎮案例、leader membership、固定時間與亂數
- 限制：固定 NOW=1000000，人工 town、leader membership、active expiry 與 millionth draws；僅 period.cgi RebelRobin 完整 sub 及 truthy extension wrapper；l/PushLog 為替代 helper，非完整 period/SortDT/資金結算、真時間、RNG、磁碟、CAS/HTTP/v2。

## original-r4-rebel-period-trigger.t

- Blob：bee642d7509a308a961bdfe8165be4f0f92d7368
- 分類：有效｜Perl Oracle（period RebelRobin）
- 斷言：probe exit/JSON、七 cases；未知領主零 draw、既有事件三日延長零 draw、平靜兩 draw、動盪 log、rand(100)略低於30啟動10000 bandits、恰30延後、舊 truthy expiry延長。
- 執行：Perl .t → original-r4-rebel-period-trigger-probe.pl → eval exact RebelRobin sub＋extension wrapper
- Fixture：人工 CITY/leader membership、七案例
- 限制：固定 NOW=1000000，人工 town、leader membership、active expiry 與 millionth draws；僅 period.cgi RebelRobin 完整 sub 及 truthy extension wrapper；l/PushLog 為替代 helper，非完整 period/SortDT/資金結算、真時間、RNG、磁碟、CAS/HTTP/v2。

## r4-source-rebel-period-now.test.mjs

- Blob：a0725928fb89f3d511466b21b0f1c2b42122cf3c
- 分類：有效｜Perl Oracle／Node 差分（period→NOW 單切片）
- 斷言：八 cases 比 town/shops/RIOT/ARMY、expiry/eventState/persist、logs、draw ranges/count、tax、IO counts；noncommittable、輸入不變；兩次獨立 Perl probe 比範圍/event/town/log；缺 period review、stage drift、時鐘不同、draw少/多/錯 stage count 拒絕。
- 執行：reviewR4RebelPeriodToNow；execFileSync combined probe → projectR4RebelPeriodToNow → period projector＋NOW projector
- Fixture：八人工同 CITY/兩店/單 rebel、固定 clock、明示 draws/分段數
- 限制：固定 NOW=start=1000000、3600 秒，人工兩店、CITY/RIOT/ARMY、單一 EVENT、明示 draws 及手工 periodDrawCount/nowDrawCount；原版直接依序呼叫兩片段，不執行中間市場/PLUS 或完整 inc-period、軍隊合併尾段、其他16 EVENT；ReadArmy/WriteArmy/GetMoneyString/l/PushLog 為 stub，非正式玩家/CAS/HTTP/v2。

## original-r4-rebel-period-now.t

- Blob：d61c6509fac1889df9145b390bbeda5f6d480d56
- 分類：有效｜Perl Oracle（period→NOW 單切片）
- 斷言：probe exit/JSON、八 cases；無領主仍消耗 START gate 100000，平靜2500/5000000/100000，新叛亂2500/5000000/100/100/5且首次NOW robinb8800/9400，延後仍 gate，延長後同切片鎮壓、既有 RIOT 用rand(5)。
- 執行：Perl .t → original-r4-rebel-period-now-probe.pl → eval RebelRobin/period wrapper → actual END/START/NOW＋DSL NOW callback
- Fixture：八受控同城鎮/軍隊快照單切片
- 限制：固定 NOW=start=1000000、3600 秒，人工兩店、CITY/RIOT/ARMY、單一 EVENT、明示 draws 及手工 periodDrawCount/nowDrawCount；原版直接依序呼叫兩片段，不執行中間市場/PLUS 或完整 inc-period、軍隊合併尾段、其他16 EVENT；ReadArmy/WriteArmy/GetMoneyString/l/PushLog 為 stub，非正式玩家/CAS/HTTP/v2。

## 功能補鏈

rebel 新增七個 period 觸發／延長案例與八個同 slice period→NOW 案例，保留上一批單獨 NOW 八案例與原 compiler metadata。原版完整 period 仍未由此兩 probe 執行；同片是人工順接，非整個 inc-turn 自然跨期。正式 RNG/time/CAS/HTTP/v2 及其他 EVENT 維持未證明。

第二十批 CI 45814598758 已出現，查詢為 queued；第十六至十九批仍 in_progress，job logs 未取得，不能推定新 CI 通過。本機 DNS 阻塞，R1-HTTP-01 未實跑。
