# R0 第29批：R4 龍賽檔案／兩期龍賽與爵位

正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d；逐檔審閱，未本地重跑。

## r4-source-dragon-balance.test.mjs

- 測試 blob `5a322062f0095ca3d2ad4840cf2dd9399bf28919`。
- 斷言：L20–40 九 cases：shops/log arguments/file present/consumed/noncommittable/input immutable；正負結算、chop。L41–47 兩次 Perl process。L48–73 chop→chomp/順序 drift、malformed text、overflow、null、duplicate shop ID 拒絕。
- Fixture：兩店 money1000/2000；正負、duplicate ID、absent、empty、no newline、CRLF、unknown ID、既有正負 dragon，共九 cases。
- 入口：DragonBalance probe → projectR4DragonBalance
- 限制：人工雙店；原版真隔離 drapay read/unlink；GetPath 只許測試路徑，l/GetMoneyString identity，PushLog 記錄參數而非持久 log；Node payoutFilePresent/Consumed 為文字投影，非磁碟操作。未執行完整 period、真龍賽生成、正式玩家、HTTP/CAS/v2。 malformed/overflow 等負例是 Node 收窄契約，不是 Perl 拒絕差分。

## original-r4-dragon-balance.t

- 測試 blob `453f45ce49144b02cd4aa69abc3777b3033eb03f`。
- 斷言：L9–36 exit0/JSON、9 cases、正負 money、paytoday330、duplicate ID→500、absent 仍結算既有250、empty unlink、chop→50、CRLF→200、unknown ID ignored、-800/+200 net。
- Fixture：與 Node 檔同九原版 fixture。
- 入口：原版 DragonBalance + 擷取 per-shop ledger in isolated Perl
- 限制：人工雙店；原版真隔離 drapay read/unlink；GetPath 只許測試路徑，l/GetMoneyString identity，PushLog 記錄參數而非持久 log；Node payoutFilePresent/Consumed 為文字投影，非磁碟操作。未執行完整 period、真龍賽生成、正式玩家、HTTP/CAS/v2。

## r4-period-dragon-same-world-chain.test.mjs

- 測試 blob `4e90d01e552d51e592effd9305766ef5ecf0888f`。
- 斷言：L57–91 九 phases、兩期 shop/town/population/points exact、file consumed、nonCommittable、worldStateWritten=false、input immutable、Node log count=1；dragon500→-500、drmoney0、payyesterday517。L92–100 兩次 Perl process；L101–123 legacy payout/nonzero dragon、committable forged、NaN/overflow 拒絕。
- Fixture：單店、dignity0、guild/EVENT empty；payout +500/-1000；now1000000/1129600；award+2 territory draws each.
- 入口：Perl period dragon probe → projectOriginalSoloPeriodPhaseChain (dragon opt-in)
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock、固定 NOW_TIME、指定 rand tape；WriteLog/PushLog stub，GetMoneyString/l identity，CloseShop/EditGuildMoney 禁止，EVENT/guild 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。 L9–10 memory imports 未用、L42–44 B50 回傳值未用；L101 標題 world CAS 但未執行 CAS，L80–81 僅 Node log 數，原版 PushLog stub，非 log payload 差分。

## original-r4-period-dragon-chain.t

- 測試 blob `435f51f9002f2df13147351372b10d42b6dd0c04`。
- 斷言：L9–39 exit0/JSON、兩期 dragon500→-500、drmoney500→0、payyesterday517、兩 drapay 消耗、drawsUsed3/3、rankingcount1→2。
- Fixture：同上；固定3 draws/期。
- 入口：frozen SortDT + pre-backup prefix in one Perl process
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock、固定 NOW_TIME、指定 rand tape；WriteLog/PushLog stub，GetMoneyString/l identity，CloseShop/EditGuildMoney 禁止，EVENT/guild 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。

## r4-period-dragon-dignity-same-world-chain.test.mjs

- 測試 blob `ea3cd285a566594924fe2fd20916ef5193474f54`。
- 斷言：L58–95 十 phases、兩期 shop/town/population/points exact、dignity draw range100/count1、file consumed、nonCommittable/worldStateWritten=false、input immutable、26→23→23、dragon-500/drmoney0。L96–105 兩次 Perl process；L106–130 threshold drift、legacy review、null/1000000 draws、negative dignity 拒絕。
- Fixture：單店 dignity26→23→23；payout +500/-1000；now1000000/1129600；award/dignity/2 territory draws each；dignity 0/999999 millionths.
- 入口：Perl period dragon+dignity probe → projectOriginalSoloPeriodPhaseChain (dragon/dignity opt-in)
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock、固定 NOW_TIME、指定 rand tape；WriteLog/PushLog stub，GetMoneyString/l identity，CloseShop/EditGuildMoney 禁止，EVENT/guild 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。 L9–10 memory imports 未用、L42–44 B50 回傳值未用；L116–118 legacy combined input 可先由 nonzero dignity/dragon 守門拒絕，不能獨立證明缺 dignity draw review guard。

## original-r4-period-dragon-dignity.t

- 測試 blob `7bf0c7afe7030e29961e4fda3277203cf7cd9eb9`。
- 斷言：L9–38 exit0/JSON、兩期 dignity26→23→23、drawsUsed4/4、dragon500→-500、drmoney0、payyesterday517、兩 drapay 消耗、rankingcount2。
- Fixture：同上；固定4 draws/期。
- 入口：frozen SortDT + pre-backup prefix with dignity rand(100) in one Perl process
- 限制：原版同一 Perl process 兩期，Node 每期接收該期 Oracle input，非自行續接 Node output；人工 stock、固定 NOW_TIME、指定 rand tape；WriteLog/PushLog stub，GetMoneyString/l identity，CloseShop/EditGuildMoney 禁止，EVENT/guild 空，backup/session/MakeGuildFile tail 未執行；不證正式玩家/時鐘/RNG、HTTP/CAS/v2。

## 來源與實際邊界

- `original-r4-dragon-balance-probe.pl` L10–20 tempdir 與 identity/記錄式 adapters；L21–59 frozen DragonBalance + per-shop section eval；L64–93 每 case 重置 shops/log、真檔 write/read/unlink；L94–119 九 cases。`original-r4-dragon-balance.mjs` L15–46 review token/順序；L48–94 文字解析、chop、ID、累計與 synthetic consumed；L102–130 ledger/log arguments/overflow。
- `original-r4-period-dragon-chain-probe.pl` 與 `original-r4-period-dragon-dignity-probe.pl` L21–51 受控 rand/IO；L53–127 frozen helpers、79 ITEM limits/ITEMNO、完整 pre-backup prefix eval；L129–156 人工世界；L157–202（dignity 至203）同一 Perl process 兩期真隔離 drapay 消耗，3/4 draws。檔頭 B50 註解稱 DragonBalance held outside，與實際 eval 不符，以執行段為準。
- 沿用第28批固定來源：period.cgi L4–35 DragonBalance/UpdateResetBefore；L45–124 ledger/history/EXP/dignity/SortDT；L126–172 town/UpdateResetAfter；L225–240 drapay read/chop/split/id2idx/unlink；L174–202 tail 未跑。DSL L3202–3318 UpdateResetBefore/After。Node solo-chain L124–147 phases、L154–195 guards、L253–314 payout/ledger/dignity、L362–390 非提交回傳。原版與 Node 都未證明全期磁碟整合。
- 無新增逐商品或 USE/EVENT callback assertion；不擴張 220×14 功能矩陣下界、83 詳細列不變。R1-HTTP-01 未實跑，本機 Git DNS 仍失敗，未取得完整可核驗 checkout。
