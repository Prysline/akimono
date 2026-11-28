# R0 第二十批：R4 guildbattle END／rebel NOW

固定正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。本批逐檔閱讀四測試、兩 probe、兩 projector、實際 DSL（rebel L3–92／guildbattle L94–105）與 inc-turn L282–365。原版 probe 寫入 temp callback 檔並 eval 原版切片，非完整 CGI。period.cgi 的 rebel marker 不代表執行 RebelRobin。既有 CI 證據與本批尚未實跑分開。

## r4-source-guildbattle-end.test.mjs

- Blob：7e90c466895924de409120770f9288a24ea04bd6
- 分類：有效｜Perl Oracle／Node 差分（單 EVENT END）
- 斷言：五 cases 比較期限、persist/expired、dominion、排序後 guild records、logs、三依賴呼叫、draw ranges/count、group、noncommittable、輸入不變；兩次獨立 Perl process 比 log/ranges；body drift、最高金額 tie、空 guild、缺 draws、負期限拒絕。
- 執行：createStandardStreetModule → reviewR4GuildbattleEnd；execFileSync Perl probe → projectR4GuildbattleEnd
- Fixture：人工三公會／兩公會、唯一最高金額、固定 clock、五 cases
- 限制：單一人工注入 guildbattle、固定 1000000/3600、明示 millionth draws；ReadGuild/ReadGuildData/SetTownData/RequireFile 為 stub、唯一最高公會金額；非實際公會檔案、同額 tie、戰事啟動、全域 hash、正式 CAS/HTTP/v2。

## original-r4-guildbattle-end.t

- Blob：18e0b663f511d73417d597734483c4c413093681
- 分類：有效｜Perl Oracle（單 EVENT END）
- 斷言：probe exit/JSON、五 cases、beta 勝出、三依賴各一次、單 log/單 START draw；期限等於切片末仍 active 無 END 或 draw；START=0 無外部啟動不持久。
- 執行：Perl .t → original-r4-guildbattle-end-probe.pl → exact DSL END body＋inc-turn END/START
- Fixture：人工公會快照、固定 clock、明示 draws
- 限制：單一人工注入 guildbattle、固定 1000000/3600、明示 millionth draws；ReadGuild/ReadGuildData/SetTownData/RequireFile 為 stub、唯一最高公會金額；非實際公會檔案、同額 tie、戰事啟動、全域 hash、正式 CAS/HTTP/v2。

## r4-source-rebel-now.test.mjs

- Blob：56827b22d970dc39353f3dc089e4c406e0050cd3
- 分類：有效｜Perl Oracle／Node 差分（單 EVENT NOW）
- 斷言：實際八 cases（標題 six 非實際數量）；比期限/persist、town/shops/RIOT/ARMY/tax、logs、read/write counts、draw ranges/count、returnCode；noncommittable、輸入不變；兩次獨立 probe 比 town/log/ranges；body drift、過期、draw 耗盡/超量、無效 RIOT 拒絕。
- 執行：createStandardStreetModule → reviewR4RebelNow；execFileSync Perl probe → projectR4RebelNow
- Fixture：人工兩店／城鎮／軍隊與 active rebel、八 cases
- 限制：人工 active rebel、固定時鐘/3600 秒、兩店／明示 town/RIOT/ARMY 與 millionth draws；ReadArmy/WriteArmy/GetMoneyString 為 stub，returnCode 為 probe 常值 0 而非獨立擷取；period 僅 marker 檢查、非實際跨期啟動／多 EVENT／軍隊磁碟／正式 CAS/HTTP/v2。

## original-r4-rebel-now.t

- Blob：8e1ea651a06a70b153c51bb85ecd2daae17e9247
- 分類：有效｜Perl Oracle（單 EVENT NOW）
- 斷言：probe exit/JSON、八 cases；鎮壓刪 event/log/零 draw，增援與戰鬥兩 draw，RIOT 3000→1800，新領主2、外敵領主0/tax0/店金1210，rand(100) 恰75與稍高分界 robinb 1300/1900，雙倍時間兩 draw。
- 執行：Perl .t → original-r4-rebel-now-probe.pl → exact DSL NOW body＋inc-turn END/START/NOW
- Fixture：人工兩店/城鎮/RIOT/ARMY、固定 clock、明示 draws
- 限制：人工 active rebel、固定時鐘/3600 秒、兩店／明示 town/RIOT/ARMY 與 millionth draws；ReadArmy/WriteArmy/GetMoneyString 為 stub，returnCode 為 probe 常值 0 而非獨立擷取；period 僅 marker 檢查、非實際跨期啟動／多 EVENT／軍隊磁碟／正式 CAS/HTTP/v2。

## 功能證據與缺口

guildbattle：原版 ENDFUNC 實際執行，唯一最高公會金額勝出；rebel：原版 NOWFUNC 實際執行，八個受控分支。兩項皆追加 Oracle/Node refs，原有 compiler metadata 保留；不填正式 RNG、時間、CAS、HTTP、v2 或取得欄。原版 rebel 未加大括號的 Perl 字串插值與 Node 保留其 log 差分；本批不改原版、不推定新的正式 runtime 缺陷。

四個前候選 CI 查詢仍 in_progress，job log 404 BlobNotFound；尚未核對實際 checkout。git ls-remote 本機再現 DNS 失敗。R1-HTTP-01 未執行。本批無測試或 runtime 修改。
