# R0 第二十二批：R4 公會檔案／邊界／會費

固定正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。本批實讀五測試、三 probe、兩 projector，核對 pinned-guild/guildsub/config/sub、write.cgi DataCommitOrAbort L4–35、inc-turn L369–378、period L4–10及 L93–104。前批 B50 帳本與跨期磁碟已完成，不重新分類。此批補公會定義/舊 keys/重讀/檔案邊界及單店 dues call，不硬映射 guildbattle callback。

## r4-source-guild-files.test.mjs

- Blob：92311b606d11e0104e1ea9e303a45b8bf65e2274
- 分類：有效｜Perl Oracle／Node 差分（隔離公會磁碟）
- 斷言：七 subtests：新增 beta/移除 old、ReadConfig escaping、舊 ledger keys、語義 stage/live、membership/user field/log；第2 rename失敗留 marker/一檔並 recover；無 marker abort、壞 config/缺 ledger、incomplete stage 拒絕；穩定 membership 第二輪 reload；原版 malformed/負庫款/invalid rate 與 Node 拒絕；三 mtime 邊界及缺 generated file。
- 執行：reviewGuildFiles SHA pins → stageGuildFiles/commitGuildFiles/guildRebuildNeeded；execFileSync guild-files/edge probes
- Fixture：alpha/old/beta 人工 configs、兩 shops、+120/-40/0 edits、stable 第二輪 -20/+1；實際 temp disk
- 限制：隔離 temp 目錄、人工 config/ledger/shop、原版 GetPath/OpenAndCheck/RenameAndCheck/l/PushLog wrapper；實際 stage/live rename、原版注入第2 rename失敗、Node 以目標目錄阻擋第2 rename，恢復非 rollback；只比語義、非原版 hash/rename順序、正式 v2/全域原子/CAS/跨程序。 原版隔離磁碟與直接 eval period reset/mtime 片段；missing/malformed/invalid rate/負庫款與舊 definition 為來源觀測，不代表正式 runtime 漏洞。Node 僅對實際測試的 malformed/rate/missing 等拒絕與 mtime 差分，不宣告全部原版行為等價；非完整 period/正式 v2。

## original-r4-guild-files.t

- Blob：10f2958a01ea1f97dc047917555e482a7a26c059
- 分類：有效｜Perl Oracle（隔離公會磁碟）
- 斷言：pipe close 成功及 JSON decode；old keys alpha/old、generated alpha/beta、HTML escape、alpha money1080/in127/out48、清除被移除 guild及_so_e、兩 log、部分 rename 待一檔、recover。
- 執行：Perl .t → original-r4-guild-files-probe.pl → pinned guild/guildsub、ReadConfig/GetString、DataCommitOrAbort
- Fixture：人工公會設定、帳本、兩店、實際隔離 stage/live
- 限制：隔離 temp 目錄、人工 config/ledger/shop、原版 GetPath/OpenAndCheck/RenameAndCheck/l/PushLog wrapper；實際 stage/live rename、原版注入第2 rename失敗、Node 以目標目錄阻擋第2 rename，恢復非 rollback；只比語義、非原版 hash/rename順序、正式 v2/全域原子/CAS/跨程序。

## original-r4-guild-file-edge.t

- Blob：f2a3496bd7037698f1a6f875c760fa0020b1ac4b
- 分類：有效｜Perl Oracle（公會檔案邊界）
- 斷言：missing ledger 空、malformed money12/in undef、invalid dealrate nope仍生成；負 treasury 刪 config、移除 transient guild、in/out歸零，舊 loaded definition仍在、重讀後消失；mtime相等/較新/較舊為0/1/0。
- 執行：Perl .t → original-r4-guild-file-edge-probe.pl → actual guild/config + period reset + inc-turn mtime
- Fixture：實際 temp disk、缺檔、malformed row、invalid config、alpha money=-1、mtime100/101/99
- 限制：原版隔離磁碟與直接 eval period reset/mtime 片段；missing/malformed/invalid rate/負庫款與舊 definition 為來源觀測，不代表正式 runtime 漏洞。Node 僅對實際測試的 malformed/rate/missing 等拒絕與 mtime 差分，不宣告全部原版行為等價；非完整 period/正式 v2。

## r4-source-guild-period-fee.test.mjs

- Blob：31251ca9ae24e8c44bbeb22d0ac0ffc370a8e977
- 分類：有效｜Perl Oracle／Node 差分（單店會費呼叫）
- 斷言：七 cases 比 shop/guild/具體 EditGuildMoney call，noncommittable、輸入不變；fee456 截斷、def1000上限、負店金；兩次獨立 Perl process；source drift、null/不符 membership、rate1001、NaN、無公會卻附 guild 拒絕。
- 執行：reviewR4GuildFee；execFileSync original-r4-guild-period-fee-probe.pl → projectR4GuildFee
- Fixture：人工單店/公會、七 case，含零費與負錢
- 限制：七單店人工 money/saleyesterday/feeRate/atk/def；原版 eval period dues block，EditGuildMoney 只記呼叫；非實際帳本寫入或整期多成員重複衰減；負店金為來源片段，不代表正式玩家可負債；noncommittable，非 HTTP/CAS/v2。

## original-r4-guild-period-fee.t

- Blob：3607ffc42154a1e7145d4240032381737163ffce
- 分類：有效｜Perl Oracle（單店會費呼叫）
- 斷言：probe exit/JSON、七 cases；無 guild 零 call、零費仍 call、atk960/def450、800k sales 50‰=40000且def482、fraction fee456、def1000 cap、atk1→0、shop money=-39990。
- 執行：Perl .t → original-r4-guild-period-fee-probe.pl → eval exact per-shop dues block
- Fixture：人工單店與 guild 狀態，EditGuildMoney call stub
- 限制：七單店人工 money/saleyesterday/feeRate/atk/def；原版 eval period dues block，EditGuildMoney 只記呼叫；非實際帳本寫入或整期多成員重複衰減；負店金為來源片段，不代表正式玩家可負債；noncommittable，非 HTTP/CAS/v2。

## 共用契約補鏈

原版 MakeGuildFile 不會更新已載入 %GUILD；WriteGuildData 使用舊 keys，新增/移除 membership 可在 live 形成定義與 ledger keys 不一致，Node 下一輪拒絕此狀態。這是受控來源/隔離 adapter 的明示邊界，不是正式玩家已確認缺陷。穩定 membership 可續讀兩輪。原版第二 rename 失敗注入與 Node 實際目標路徑阻擋分開記錄；恢復完成剩餘檔，不是多檔 atomic rollback。公會會費只觀測 per-shop 公式與外部呼叫，不能以此替代 B50 實際 ledger/period 或正式 guild API。未新增 ITEM/USE/EVENT 正向旗標，83 詳細 rows 不變。

本批未在本機重跑，CI 待驗。
