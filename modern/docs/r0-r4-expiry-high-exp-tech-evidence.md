# R0 第30批：R4 店主缺席／兩期高 EXP 技術遺失

正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d；逐檔審閱，未本地重跑。

## r4-source-period-shop-expiry.test.mjs

- 測試 blob `0d97a4a7c4a90eff8da68694d86b7668aa900eff`。
- 斷言：L22–52 九 cases、threshold43200/604800、closeCalls/log/unchanged shop exact、strict 12h/7d 邊界與 +1s。L53–59 兩次 Perl process；L60–83 source/config drift、無效 timestamp/blocklogin/shopname、偽 effectKnown 拒絕。
- Fixture：now700000/0、foundation/lastlogin 邊界、blocklogin stop/warning/空字串；九 cases。
- 入口：isolated expiry probe → projectR4PeriodShopExpiry
- 限制：人工 shop/now；原版只擷取 period expiry block，CloseShop/PushLog 記錄呼叫，l 為測試 adapter；沒有執行 CloseShop 實作、刪檔、archive/guild/session 或正式時間/HTTP/CAS/v2。 Perl probe EXPIRE_TIME 人工設3600*24*7，Node review 檢查 _config.cgi。

## original-r4-period-shop-expiry.t

- 測試 blob `6b7d331df8c97935b1ec9ee2f9d649915741bdb4`。
- 斷言：L10–31 exit0/JSON、九 cases：exact12h/7d 不關，+1s 呼叫，stop 保護、warning 不保護、young/recent/zero 不關，原版 reason/channel/message。
- Fixture：同九 cases；EXPIRE_TIME 人工設3600*24*7。
- 入口：frozen expiry block eval；CloseShop/PushLog recorder
- 限制：人工 shop/now；原版只擷取 period expiry block，CloseShop/PushLog 記錄呼叫，l 為測試 adapter；沒有執行 CloseShop 實作、刪檔、archive/guild/session 或正式時間/HTTP/CAS/v2。

## r4-period-expiry-all-stages-chain.test.mjs

- 測試 blob `5712efaf778da6ef4ecb178d243b7cf078a303ba`。
- 斷言：L51–113 phase metadata 順序、兩期 exact shop/town/population/points/guildContext/fee calls/tech loss/log/expiry calls/log、nonCommittable/no write/input unchanged；第二期 close recorder、shop仍1、dragon-500、atk921、dignity23、lost19。L115–126 兩次 Perl process；L128–157 未審時間/null/負時間/偽 committable/source drift 拒絕。
- Fixture：單店 foundation1000000/lastlogin0、now1000000/1129600、guild50、EXP10/14各5000、tech18/19/38/24各1、8/6 draws。
- 入口：expiry all-stages probe → projectOriginalSoloPeriodPhaseChain (dragon/dignity/guild/postTech/expiry)
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock/EXP/guild、固定 NOW_TIME、指定 rand tape；真隔離 drapay read/unlink，Node 文字投影；EditGuildMoney 只記錄，WriteLog/PushLog 不持久化，EVENT 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。 CloseShop stub 只記呼叫，仍保留店鋪與後續財務/技術；未測真關店。L12–14 tech imports 未用；phase list 是 metadata，順序另由 source prefix/差分支持。

## original-r4-period-expiry-all-stages.t

- 測試 blob `7eef938d74b4415313ab545a820cbd3c4828083d`。
- 斷言：L10–47 exit0/JSON、兩期、first no close/second one close reason/log、shop仍1、dragon500→-500、atk921、dignity23、lost19、第二期 draws6、兩真檔消耗。
- Fixture：同上；8/6 tape。
- 入口：frozen SortDT + pre-backup prefix, CloseShop call recorder
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock/EXP/guild、固定 NOW_TIME、指定 rand tape；真隔離 drapay read/unlink，Node 文字投影；EditGuildMoney 只記錄，WriteLog/PushLog 不持久化，EVENT 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。 CloseShop recorder 不改 shop/file；只確認呼叫與後續財務/技術。

## r4-period-high-exp-tech-same-world-chain.test.mjs

- 測試 blob `7aa7573ff7d6189fe5ec56d227420e318f776607`。
- 斷言：L49–91 兩期 exact shop/town/population/points/guild/fee/tech lost/log、rand range14000/count、no write/input unchanged；lost18/24→19、38保留、EXP10 4695→4409。L93–100 兩次 Perl process；L102–137 source drift、no-tech review、null/short/extra/out-of-bound draws、偽 committable、低 EXP 無 lost IDs。
- Fixture：單店 EXP10/14各5000、18/19/38/24各1、now1000000/1129600、8/6 draws（tech 0/500000/999999/250000；0/999999）。
- 入口：high-exp probe → projectOriginalSoloPeriodPhaseChain (dragon/dignity/guild/postTech)；direct tech guard
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock/EXP/guild、固定 NOW_TIME、指定 rand tape；真隔離 drapay read/unlink，Node 文字投影；EditGuildMoney 只記錄，WriteLog/PushLog 不持久化，EVENT 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。 CloseShop 禁止；L108–113 no-tech 同時 high EXP/skill/draw 未審，不能隔離各守門；L131–135 低 EXP 直接 projector 只斷言 lost IDs=[]、空 tape 成功，非原版低 EXP 獨立差分。

## original-r4-period-high-exp-tech.t

- 測試 blob `497fab15af08cb6cde885e77445fe8850259086d`。
- 斷言：L10–45 exit0/JSON、lost18/24→19、log4/2、draws8/6、EXP10 4695→4409、18/24/19 slots0、38 slot1、dragon-500/atk921/dignity23、兩真 drapay 消耗。
- Fixture：同上；原版固定 draws。
- 入口：frozen SortDT + pre-backup prefix + UpdateResetAfter technology loss
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock/EXP/guild、固定 NOW_TIME、指定 rand tape；真隔離 drapay read/unlink，Node 文字投影；EditGuildMoney 只記錄，WriteLog/PushLog 不持久化，EVENT 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。 CloseShop 禁止；tech log capture 非正式 durable log。

## 來源與實際邊界

- `original-r4-period-shop-expiry-probe.pl` L19–47 frozen expiry block 擷取/eval、記錄式 CloseShop/PushLog；L48–89 九人工 timestamps cases。Node `original-r4-period-shop-expiry.mjs` L11–36 source/config/順序守門，L38–67 strict >43200、lastlogin+604800<now、blocklogin ne stop，僅 call/log 投影。
- `original-r4-period-expiry-all-stages-probe.pl` L23–62 rand/IO adapters、L64–138 frozen prefix eval、L140–180 人工世界、L182–253 同一 Perl process 兩期、真 drapay read/unlink、CloseShop/PushLog 記錄與 tech logs/lost IDs；CloseShop stub 不改 shop。`original-r4-period-high-exp-tech-probe.pl` L22–57 adapters、L59–133 source eval、L135–175 fixture、L177–239 同程序兩期；CloseShop 禁止。兩 probe 的舊 B50 檔頭不反映已實際執行的龍賽及 guild 數值分支。
- 沿用第28/29批固定 period/DSL/Node 脈絡；新增核對 DSL UpdateResetAfter/UpdateTodayEraseTech：EXP sum>4000 才按 held 技術 18,19,38,24 順序 rand(14000)<excess，命中扣1並雙 WriteLog。Node `original-r4-post-period-tech-loss.mjs` L13–62 source/order/ID/threshold review，L64–112 draw/held/stock/log 純投影；solo-chain L203–221 guards、L265–269 expiry call、L332–338 post-tech after SortDT。原版同一 Perl process，Node 每期 Oracle input，不證獨立續營。

## R1 限定 ITEM 證據

- ITEM #18、#24 第一期遺失；#19 第二期遺失；#38 兩期抽樣未命中、保留。高 EXP JS L55–90 / Perl .t L17–36；expiry JS L62–112 / Perl .t L37–44 另支持 #19。只填 perlOracle/nodeDifferential，#38 不證遺失命中；不填 lawfulAcquisition、reviewedTime、rng、formalCommand、HTTP/CAS/v2。四者 registry=false 為 market-buy，未變更。詳細列83→87，限定 ITEM Oracle/Node 10→14，USE39/EVENT25 不變；正式取得/HTTP/v2 下界 ITEM7/USE12/EVENT0 不變。
