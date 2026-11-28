# R0 第 24 批：R4 17-key mixed EVENT 其餘五份 Node 差分

固定上批 HEAD `15e35e984ce094e41b7e62236d9b21505249435f`；延續第23批已逐檔審閱的共同 Perl probe / .t，不重新分類。共同 probe `modern/tests/original-perl/original-r4-mixed-support-gate-probe.pl` 之 789–1007 行分別建立 loto/happy/durable/guild/rebel cases，原版 EVENT fragment 以真實 Perl hash 遍歷與受控 RNG 執行。Node reviewer 按 frozen metadata/DSL/marker 驗證，projector 比原版輸出，並回傳 noncommittable。

共同限制：單店人工 stock/資產/ITEM metadata、固定 3600 秒切片、受控 millionth draws、同程序 Perl hash 順序；probe 只執行 generated PARAM 與 inc-turn EVENT 區段，非完整 DataRead/period/sale；格式化與 log IO stub；無正式玩家/真時鐘/伺服器 RNG/CAS/HTTP/v2。

本批只讀與更新文件，未本地重跑；CI 另核。

## r4-mixed-loto-gate.test.mjs

- 四 cases 5/0/3/50 tickets；逐案比 DataRead/期限/shop/log/亂數 range/count；每票 rand(6096454)、零票仍開獎 log、現金 cap/210000；二次 Perl 程序；缺 review、少/多 draw、51票、hash drift 拒絕且輸入不變。
- 分類：有效；原版共用 probe → `createStandardStreetModule`／source reviewer → `projectOriginalR4MultiEventFixture`。
- 限制：單店人工 stock/資產/ITEM metadata、固定 3600 秒切片、受控 millionth draws、同程序 Perl hash 順序；probe 只執行 generated PARAM 與 inc-turn EVENT 區段，非完整 DataRead/period/sale；格式化與 log IO stub；無正式玩家/真時鐘/伺服器 RNG/CAS/HTTP/v2。 人工票庫存，millionth 抽樣非完整精確整數獎級邊界；其他案件重設時間/庫存；非正式購票或存檔。

## r4-mixed-happy-now-gate.test.mjs

- 四 cases START 同片 NOW、active 下一片 NOW、expiry 不 NOW、expiry/restart 同片 NOW；比 ITEM/shop/log/期限/亂數；8 durable、support/instant/loto 混合；二次 Perl 程序；缺 review/NOW order、0 span、少/多 RNG 拒絕。
- 分類：有效；原版共用 probe → `createStandardStreetModule`／source reviewer → `projectOriginalR4MultiEventFixture`。
- 限制：單店人工 stock/資產/ITEM metadata、固定 3600 秒切片、受控 millionth draws、同程序 Perl hash 順序；probe 只執行 generated PARAM 與 inc-turn EVENT 區段，非完整 DataRead/period/sale；格式化與 log IO stub；無正式玩家/真時鐘/伺服器 RNG/CAS/HTTP/v2。 人工跳時與分叉重啟；固定一小時 rand(100)，不是所有秒級/10小時邊界或連續遊玩。

## r4-mixed-iron-sword-gate.test.mjs

- 四 cases 十 durable START、次片 overlay、跳時 expiry、重啟；新 START 不回溯 overlay；#5 PLUS720、#40/#44 popular/2，全部 ITEM array 差分；比 state/shop/log/draw；二次 Perl 程序；review drift/未支援 active/少 RNG 拒絕。
- 分類：有效；原版共用 probe → `createStandardStreetModule`／source reviewer → `projectOriginalR4MultiEventFixture`。
- 限制：單店人工 stock/資產/ITEM metadata、固定 3600 秒切片、受控 millionth draws、同程序 Perl hash 順序；probe 只執行 generated PARAM 與 inc-turn EVENT 區段，非完整 DataRead/period/sale；格式化與 log IO stub；無正式玩家/真時鐘/伺服器 RNG/CAS/HTTP/v2。 synthetic baseItems，僅參數 overlay/期限，不是實際鐵供給、劍銷售、正式取得或價格變動；標題 other 10 與實際十 durable 總數有歧義，以 assert count 10 為準。

## r4-mixed-guildbattle-end-gate.test.mjs

- 四 cases：十 durable＋happy NOW 時 guildbattle END 選 beta、嚴格小於期限（相等保留）、單 guild expiry、zero START 不持久；比 guild snapshot/callback、shop、overlay、logs、RNG；二次 Perl 程序；平手、缺 review/snapshot/draw、rebel 未支援拒絕。
- 分類：有效；原版共用 probe → `createStandardStreetModule`／source reviewer → `projectOriginalR4MultiEventFixture`。
- 限制：單店人工 stock/資產/ITEM metadata、固定 3600 秒切片、受控 millionth draws、同程序 Perl hash 順序；probe 只執行 generated PARAM 與 inc-turn EVENT 區段，非完整 DataRead/period/sale；格式化與 log IO stub；無正式玩家/真時鐘/伺服器 RNG/CAS/HTTP/v2。 人工三 guild cash/active expiry，ReadGuild/ReadGuildData/SetTownData stub；不證磁碟或跨程序交易；平手拒絕是 Node 保守邊界。

## r4-mixed-rebel-now-gate.test.mjs

- 五 cases：11 durable 含 rebel/happy、NOW 自刪（pre-NOW hash 捕捉）、RIOT shop army3000/armyById1800、guildbattle END beta 後 rebel/happy NOW、expiry 不 NOW；比 town/RIOT/ARMY/shop/guild/overlay/log/draw；二次 Perl 程序；缺 review/context/shop army、錯 NOW count/order/RNG 拒絕。
- 分類：有效；原版共用 probe → `createStandardStreetModule`／source reviewer → `projectOriginalR4MultiEventFixture`。
- 限制：單店人工 stock/資產/ITEM metadata、固定 3600 秒切片、受控 millionth draws、同程序 Perl hash 順序；probe 只執行 generated PARAM 與 inc-turn EVENT 區段，非完整 DataRead/period/sale；格式化與 log IO stub；無正式玩家/真時鐘/伺服器 RNG/CAS/HTTP/v2。 人工 active rebel/town/army/guild；ReadArmy/WriteArmy 與 guild IO stub；rebel cases 不另外啟動 durable，按來源現存 hash 次序安排 RNG；rebelNowDrawCount 人工分段，不是自然叛亂啟動、軍隊磁碟或全域時序。

