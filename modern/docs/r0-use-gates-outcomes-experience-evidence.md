# R0 第十一批：USE 資格、交易、機率及經驗尾段

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`，8 份逐檔語義審閱。B-21/B-23 的 JS 只有純數值／來源斷言，對應 Perl .t 是獨立 Oracle；B-24/B-25 則有 execFileSync 直接差分。未在本機重跑，沒有新增正式玩家或逐配方旗標。

## original-use-eligibility-model.test.mjs

- 固定 blob：`a2533adf1ab7f346d5e562968c1e5d9069bbcb09`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/inc-makeitem.cgi。
- 斷言：28–49 pin job/functionbefore/status 及 stale flags；51–188 specific/fallback job、before 0/1/2/7、前置 mutation、材料逐列、Get first/list、flag 保留；190–218 fixture guards；220–244 13 個 Perl cases 比較 records/stock/selection/calls。
- 執行：projectOriginalUseEligibility → Perl probe 擷取 CheckUseItem/GetUseItem/GetUseItemListSub。
- Fixture：人工 stock、USE no、named job/before callback effect；Perl 缺失可 skip。
- 限制：無真正 DSL job/functionbefore、實際物品執行、正式 command/CGI/v2。舊 stale flag 不代表現行授權允許。
- 結論：有效，僅 Perl Oracle／Node 差分（合成 eligibility）。

## original-use-eligibility.t

- 固定 blob：`15145631e9a3d3f554a78d7d1f9686eb2a2cf9f6`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/inc-makeitem.cgi。
- 斷言：59–97 exact routines 擷取編譯；122–201 job override/fallback、before return 與 mutation；206–247 Get/List 回傳 reference、stale flags；253–266 unresolved callback error 與缺料不改 stock。
- 執行：eval exact CheckUseItem/GetUseItem/GetUseItemListSub；本地 package item fixture。
- Fixture：synthetic callback 符號、材料及庫存；不載入真正 DSL。
- 限制：只證明原版前置流程與 wrapper 行為，不是正式授權及交易。
- 結論：有效，僅 Perl Oracle（合成 eligibility）。

## original-use-experience-transaction-model.test.mjs

- 固定 blob：`3bc6ef24125f3309715b6bdacbaf90bc1d427ae0`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi。
- 斷言：42–57 pin market→callback→EXP 及 cap/sort/denominator；59–200 gate、accounting、單項 cap1000、negative award、count0、expold、total cap 與刪零；201–266 原版 tie order、不自造 item ID 排序、callback boundary；268–305 fixture；307–337 9 個 Perl probes 逐欄比對。
- 執行：projectOriginalUseWithExperience → projectOriginalUseTransaction → Perl probe 連接無回呼 source fragments。
- Fixture：人工兩店三槽、時鐘1000、EXP map、observedPerlSortedKeys；callbacksConfirmedAbsent=true；Perl 缺失可 skip。
- 限制：未執行真正 callbacks、職業 loader、合法取得、正式時間/RNG、CAS/v2；hash ties 只是該次 Perl 觀察。
- 結論：有效，僅 Perl Oracle／Node 差分（無回呼經驗尾段）。

## original-use-experience-transaction.t

- 固定 blob：`4237dba71b2296a28aa564995e69dd2b4867de06`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi。
- 斷言：25–64 source gate-through-market 與 EXP tail 擷取，故意排除 callback；98–178 money/time/stock、EXP cap/negative/zero、count0、expold、total cap；185–197 觀察原版 hash tied order 及 reductions。
- 執行：eval isolated_full_use_exp + require calc.cgi/whole.cgi。
- Fixture：合成 shop、固定 clock、EXP records、LIMIT_EXP 3600。
- 限制：無真正 CGI、DSL callback；tie order 非跨 interpreter 保證。
- 結論：有效，僅 Perl Oracle（無回呼經驗尾段）。

## original-use-outcomes-model.test.mjs

- 固定 blob：`b11c2f941b1dc46b98f80d3ca9fa40f48ec9a372`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/whole.cgi、modern/tests/original-perl/period.cgi。
- 斷言：30–56 source MakeAmount literal PI、sqrt(abs(t))、market 及 period；58–112 機率0/1000、19/20 draws、正負 t、RNG validation；114–186 負 inventory、overflow/recap、uncoded、fractional wslimit；188–199 immutable/no transaction。
- 執行：projectOriginalMakeAmount / projectOriginalCreateThenWholesale / projectReviewedPeriodStock。
- Fixture：注入 draws、單項 market fixture、人工負數。
- 限制：本 JS 檔未執行 Perl；相鄰 .t 是獨立 Oracle，非自動逐欄差分。不是正式 RNG 或事件／玩家 transaction。
- 結論：有效，僅 純 Node 投影／來源守門（機率與產出）。

## original-use-outcomes.t

- 固定 blob：`2590cb9e28ab1c4cea9fed0195bad425f146c872`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/whole.cgi。
- 斷言：21–45 exact MakeAmount/creation block/whole；47–69 20 次走2 draws、19 次逐 draw、下一 RNG 狀態及端點；71–135 產出上限、overflow、market recap、負 retained、uncoded/固定與小數 cap。
- 執行：eval exact MakeAmount/creation fragment + require whole.cgi。
- Fixture：seeded random、人工 item/shop/market；原版數值公式。
- 限制：無完整 USE、真正玩家／session／事件／付款／磁碟。
- 結論：有效，僅 Perl Oracle（機率與產出片段）。

## original-use-transaction-model.test.mjs

- 固定 blob：`1a740185e6b2bb023575eee8e3fe7183730a0364`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi。
- 斷言：46–65 原版 gate→settle→spend→material/create→market、expold/time cap；67–150 count4→3→2、金錢/時間/stock、六種 gate、zero probability 仍需材料、duplicate 負數；152–201 zero cost、late time cap、inactive、expold、shared RNG、空 recipe；203–225 fixture guards/immutable。
- 執行：projectOriginalUseTransaction → projectOriginalMultiItemUse。
- Fixture：人工兩店、時計、recipe、注入 RNG。
- 限制：JS 未直接 exec Perl；無 callback、EXP tail、真時間、正式交易或持久化；負數 synthetic 不證明現行可觸發。
- 結論：有效，僅 純 Node 投影／來源守門（交易前段）。

## original-use-transaction.t

- 固定 blob：`2c8a9b941c73f6e8440b705d1e5f52cc8b54ce94`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/calc.cgi、modern/tests/original-perl/whole.cgi。
- 斷言：25–51 擷取 gate 到一次 market、MakeAmount、require calc/whole；87–132 baseline accounting、count0 不支出、經驗/職業/點數/人氣/事件/材料 gate；142–187 duplicate negative、late cap、inactive、expold 與 seeded material/create RNG 順序。
- 執行：eval isolated_transaction + GetItemUseTime/UseTime/CheckWholeStore。
- Fixture：人工 shop、固定 clock、seed、recipe；停在 RequireFile 前。
- 限制：未執行動態 job/functionbefore、callback、EXP redistribution、正式玩家、CGI/v2。
- 結論：有效，僅 Perl Oracle（交易前段）。

## 不升格界線

原版 CheckUseItem 的 stale flags、duplicate material negative count、過量 EXP 負值、hash ties 與 B-21 的抽樣公式均有研究價值；不等同現行 runtime 缺陷或授權結果。R1 正式 payload/command gate、真時鐘、合法取得、原版機率策略、CAS/v2 需各自證據。未修改執行層。
