# R0 第十九批：R4 多 EVENT 與 Perl hash 順序

固定基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。原版 probe 實際 eval frozen compiler initializer、七組 PARAM 生成式、inc-turn END/START 切片；active hash 與 EVENT hash 分別觀測，不能以 JS／DSL 排序替代。GetPath/RequireFile 在未審 callback 時直接 die；明示亂數非伺服器 RNG，DataRead overlay 非真檔案 loader。四切片含 1003600→1040000 跳時，不是連續遊玩。

## r4-multi-event-order.test.mjs

- Blob：165f48cca58736cf4c85d8c4d7c589ee9f3b1edd
- 分類：有效｜Perl Oracle／Node 差分（17-key 受控投影）
- 斷言：39–66：四切片全 ITEM、activeUntil、log 順序、draw range/count、前態連續與 committable=false；67–80：三次獨立原版程序各自提供 order 並比對 draw ranges/log；81–105：錯 permutation、rebel、缺多 draws、129600 span、group guard drift 拒絕，輸入不變。
- 執行：execFileSync 原版 multi probe → projectOriginalR4MultiEventFixture
- 限制：受控 79 ITEM、明示 millionth draws、四個 3600 秒切片含跳時；17-key gate／兩種 hash order 由同一 Perl process 提供，僅七 EVENT 有 durable START/END/PARAM；其他正 START 刻意 miss，零 START 僅 transient group；非完整 NOWFUNC／連續時間／period／WorldState/CAS/HTTP/v2。

## r4-original-event-hash-order.test.mjs

- Blob：431663d92a2684b0c32455af066087efaab254df
- 分類：有效｜Perl Oracle（hash 觀測，JS wrapper）
- 斷言：13–25：25 declared/17 compiled、真 hash key set、未變更同 hash 順序、active fixture set、scope；26–38：四程序各自驗證 key set 與同程序穩定，不宣告跨程序順序關係。
- 執行：execFileSync 原版 hash probe；JS 只核對 Oracle 結果，無 Node runtime 投影
- 限制：重建原版 compiler 的 13 欄 rows 並 eval emitted initializer；17-key keys 觀測、人工 active 三鍵；跨程序不要求排列相同或不同，非生命週期／callback／RNG／可重播正式世界。

## original-r4-multi-event-order.t

- Blob：96fe020a6df00d6de2893965966a0cff0caa89df
- 分類：有效｜Perl Oracle（17-key 受控切片）
- 斷言：8–13：probe exit/JSON；15–29：17 keys、四切片、首次七 durable active、17-key traversal、draw count、次次 DataRead 七 active、ITEM 1 indexing。
- 執行：Perl .t → original-r4-multi-event-order-probe.pl → eval frozen END/START/PARAM
- 限制：受控 79 ITEM、明示 millionth draws、四個 3600 秒切片含跳時；17-key gate／兩種 hash order 由同一 Perl process 提供，僅七 EVENT 有 durable START/END/PARAM；其他正 START 刻意 miss，零 START 僅 transient group；非完整 NOWFUNC／連續時間／period／WorldState/CAS/HTTP/v2。

## original-r4-event-hash-order.t

- Blob：b61e333d41b20cf13aaca3b707e95b58f115e008
- 分類：有效｜Perl Oracle（hash 觀測）
- 斷言：8–13：probe exit/JSON；15–29：25/17、原版 keys set、同 hash 重讀穩定、active fixture set、非完整 EVENT engine。
- 執行：Perl .t → original-r4-event-hash-order-probe.pl → original compiler emitted initializer
- 限制：重建原版 compiler 的 13 欄 rows 並 eval emitted initializer；17-key keys 觀測、人工 active 三鍵；跨程序不要求排列相同或不同，非生命週期／callback／RNG／可重播正式世界。

## 功能補鏈邊界

七 EVENT（boom-posyon、tate-sale、yoroi-sale、tue-sale、plusdown-yakusou、plusup-misuriru、plusup-oriharukon）補 17-key 混合 START/END/PARAM 差分。其餘十 compiled EVENT 只參與 hash/gate fixture，不新增 callback 證據；hash 觀測不填 formal RNG/replay。83 詳細 rows 及正式下界不變。
