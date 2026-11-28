# R0 第28批：R4 跨期財務（龍賽／爵位／公會會費）

正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d；本批逐檔審閱，未重跑。

## r4-period-all-finance-same-world-chain.test.mjs

- L60–87：11 phases、nonCommittable、兩期逐筆 exact shop/town/population/point/guildContext/call edits、dragon file consumed、dignity、輸入不變；Node 每一期由該期 Perl input 開始，不是自行接續前期 Node output。
- L88–103：第一期 post-dragon sales10500、fee525；第二期 sales0、fee0；atk1000→960→921、def500→450→405、dragon累計-500、dignity23、payyesterday517。
- L105–114：兩次獨立 Perl process 比較 shop/guildContext/IO call edits；不等於原版 PRNG 或磁碟重啟。
- L116–138：未啟用 guild、null membership、錯會員ID、rate1001、偽 committable review 拒絕，原輸入不變。L42–44 另呼叫 B50 基礎 probe，其回傳值未被本檔斷言使用，不額外認列。

## original-r4-period-all-finance-source.t

- L10–46：原版 probe exit0/JSON、兩期、fee525/0、atk/def 持續、dignity23/23、dragon-500、payyesterday517、兩期 drapay 真檔消耗、rankingcount2。非 Node 路徑。

## 來源及實際執行邊界

- period.cgi L4–35 guild reset/ranking/DragonBalance/UpdateResetBefore；L45–124 closure gate、dragon ledger、histories/limits/upkeep、fee/atk/def、EXP/dignity、第二次 SortDT；L126–172 town/UpdateResetAfter；L225–240 DragonBalance read/chop/split/id2idx/accumulate/unlink。L174–202 backup/session/MakeGuildFile tail 不在 probe。
- custom/inc-item-data.cgi L3202–3318：UpdateResetBefore/TopGetItem/AddItem 與 UpdateResetAfter；低 EXP fixture 不涵蓋高 EXP 技術遺失。
- finance probe L22–58 rand override、IO stubs、真 tempdir；L59–133 原版片段擷取、79 limits/ITEMNO substitution、整個 pre-backup prefix eval；L135–228 同一 Perl shop/town/guild 狀態兩期，payout +500/-1000，NOW_TIME 人工設定，award/dignity/兩 territory 共四 samples 消耗；每期檔案實際消失，EditGuildMoney 只錄呼叫不改 treasury。檔頭描述較早 B50 限制，實際以下方執行為準。
- original-period-solo-chain.mjs L124–147 11 phases，L154–250 review/fixture guards，L251–346 原版順序、L347–392 nonCommittable/無 WorldState write；dragon-balance L48–130 payoutText 累計/ledger；shop-ledger L148–185 history/upkeep/EXP；guild-fee L48–89 會費計算/攻防/IO call；dignity-decay L36–65 rand(100)<25 與 int(dignity/12)+1。
- 原版同一 Perl process 持續兩期；Node 每次使用該期 Oracle input 而非獨立接續前一 Node output。固定 NOW_TIME/4 draws/人工店鋪與公會；原版真隔離 drapay file consume，Node 純 payoutText。EditGuildMoney/WriteLog/PushLog stub，CloseShop 禁止，backup/session/MakeGuildFile tail 未執行，不證公會金庫、龍賽生成、正式時鐘/玩家/HTTP/CAS/v2。 無新增逐商品或 USE/EVENT callback assertion，不擴張 220×14 功能矩陣下界，83 詳細列不變。

固定來源與斷言定位同步於 canonical manifest。
