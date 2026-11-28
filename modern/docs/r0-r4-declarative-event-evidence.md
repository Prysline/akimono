# R0 第十七批：R4 declarative EVENT 生命週期／PARAM 逐檔證據

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。九個 compiled EVENT 的 ITEM PARAM 由原版 inc-makeitem generator 生成並 eval，人工79 ITEM 欄位比對；其中七個另執行 inc-turn 原版 END/START fragment，單 key／固定時段／明示 draws、PushLog stub、callback fail-closed。DataRead loader marker 與 generated overlay eval 不等同真實 loader 或磁碟 IO；不證明完整 EVENT/市場/跨期、CAS 或 v2。

## r4-declarative-event-cycle.test.mjs
- Blob: `6779b9f481d9e975d1302eae8e31c2183a6956eb`。
- 斷言：44–52：七個 code、committable=false、DataRead source drift；53–73：七事件各四邊界，metadata、active/expired/started、until、draws、log、79 ITEM 與輸入不變；74–98：逐時 timeline 連續狀態、overlay、恰一次開始／結束；99–114：缺／多 draws、負 expiry、129600 span、未知 rebel 拒絕。
- 執行：execFileSync original-r4-declarative-event-cycle-probe.pl；projectOriginalR4DeclarativeEventCycle。
- 邊界：單 EVENT key、固定開始秒1000000／3600秒、明示 draws、人工 ITEM 數字；非全17-key hash/RNG、實際 DataRead IO、callback、WorldState/CAS/period/HTTP/v2。
- 分類：有效（Perl Oracle／Node 差分（純單 EVENT 投影）），非正式玩家。

## original-r4-declarative-event-cycle.t
- Blob: `9244822a74455dde59896c074ff85366ea3c36ae`。
- 斷言：8–13：probe 執行成功及 JSON；15–26：七 code、四案例、79 ITEM、timeline>7、首次 start 不追溯 DataRead、strict expiry。
- 執行：直接呼叫 original-r4-declarative-event-cycle-probe.pl，擷取原版 END/START 與 PARAM generator。
- 邊界：.t 僅 smoke 與明列斷言；probe 執行原版片段、人工單 key、log stub、RequireFile/GetPath 拒絕 callback；實際載入 generated code 的 eval 不等於 DataRead 磁碟。
- 分類：有效（Perl Oracle（隔離 END/START）），非正式玩家。

## r4-event-item-param.test.mjs
- Blob: `c2d1602a9bdd9dae9850d13e2c5baf65ac7a4d19`。
- 斷言：31–40：9 active PARAM、committable=false、compiler drift；41–64：17 compiled、9 overlay code 精確集合，79 ITEM 的每個 source 欄位逐項比對（數字容差1e-9）、輸入不變；65–76：非 overlay code、78 ITEM、unsafe popular 拒絕。
- 執行：execFileSync original-r4-event-item-param-probe.pl；projectR4EventItemParams。
- 邊界：人工79 ITEM 欄位，單事件純 overlay；不執行 start/end/now、hash order、自然販售、正式交易/存檔。
- 分類：有效（Perl Oracle／Node 差分（純 PARAM 投影）），非正式玩家。

## original-r4-event-item-param.t
- Blob: `a8e2374b953c36d9fd17b74aa0c7f815cd8daa05`。
- 斷言：8–12：probe 成功、JSON；14–20：17 compiled、9 overlay、各79 ITEM、非空 PARAM、原版 generated ITEM expression。
- 執行：直接呼叫 original-r4-event-item-param-probe.pl；原版 GetNumber/GetItemNumber/GetString 與 PARAM generator eval。
- 邊界：.t 僅 smoke／結構檢查；probe 執行原版 compiler 生成的 expressions，人工79 ITEM，未執行完整 EVENT engine 或實際市場。
- 分類：有效（Perl Oracle（原版 PARAM compiler）），非正式玩家。

## EVENT 逐項補鏈

9 PARAM overlay：boom-posyon、tate-sale、yoroi-sale、tue-sale、plusdown-yakusou、plusup-misuriru、plusup-oriharukon、ken-sale、plusup-tetu。其中7 single-key END/START：boom-posyon、tate-sale、yoroi-sale、tue-sale、plusdown-yakusou、plusup-misuriru、plusup-oriharukon。`ken-sale`、`plusup-tetu` 本批只有 overlay，未把其他七事件 cycle 套用其上。等於 expiry 邊界不結束；新開始只在下一次 DataRead 生效。原版參數與 79 ITEM 人工向量證據不是商品合法取得或全 EVENT runtime。其餘16 EVENT 本批不增加語義證據；25 metadata 下界仍原值，9 PARAM 與7 cycle 是更細的子集。
