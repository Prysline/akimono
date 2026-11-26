# R0 第四十一批：B44–B47 既有分類重新覆核

固定基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。八檔原有分類完整重新覆核，分類不變。未本機重跑。

## b44-period-ledger.test.mjs

- 固定 blob：`9eb39c6cba6e3dcbf27296d3d0e2962d666444c3`；有效／Perl Oracle／Node 差分（純投影）。
- 實際斷言：L27–47 source/config markers/3案例；L48–64 逐欄 ledger、maintenance、輸入不改、clone；L65–79 guild/dragon/dignity/limits/EXP/count/cost 拒絕。
- 執行路徑：原版 period.cgi 前期保存至 dignity decay 前區段直接 eval；Node ledger 純投影。
- Fixture：三個獨立人工單店；手填 config、#10 limit20、#79 limit10，其餘77槽9999。
- 限制：非79真商品上限；無全 compiler/period/獎勵/guild/dragon/town/EVENT/disk/CAS/HTTP/v2；負向僅 throws。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/original-b44-period-ledger-probe.pl` @ `109d067b5f149e03da3d9ee0fcc4e97dcf0ec38c`；`modern/src/original-period-shop-ledger.mjs` @ `5042498720184aebcfaa113786adb0e6c8a300af`；`modern/src/standard-street-model.mjs` @ `c624fbb9f2c141bd539b7dfec86a48d3ba373efc`。

## original-b44-period-ledger.t

- 固定 blob：`7138c295180aed031439839b06fb276c82bd35dd`；有效／原版 Perl Oracle（受控）。
- 實際斷言：L8–39 exit/JSON、79槽/3案例；maintenance、歷史、EXP89/1、loss、#10/79 cap、cash -994、profit -750、稅歸零。
- 執行路徑：原版 period.cgi 前期保存至 dignity decay 前區段直接 eval；Node ledger 純投影。
- Fixture：三個獨立人工單店；手填 config、#10 limit20、#79 limit10，其餘77槽9999。
- 限制：非79真商品上限；無全 compiler/period/獎勵/guild/dragon/town/EVENT/disk/CAS/HTTP/v2；負向僅 throws。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/original-b44-period-ledger-probe.pl` @ `109d067b5f149e03da3d9ee0fcc4e97dcf0ec38c`。

## b45-period-top-prize.test.mjs

- 固定 blob：`5631a576bf55ed6cf21753edcb9308c454f3e05d`；有效／Perl Oracle／Node 差分（純投影）。
- 實際斷言：L24–41 9 prizes id/count、source mutation；L42–61 10例逐欄、input unchanged、overflow grant1/discard4；L62–74 invalid draw/stock/rank。
- 執行路徑：DSL UpdateResetBefore/TopGetItem regex ITEMNO代換、原版 AddItem與rankingcount++擷取 eval；WriteLog stub；Node 純投影。
- Fixture：人工單店已勝、gift5或9、每例重建、Perl rand(9)注入0..8，Node choice轉 millionths。
- 限制：非完整 compiler/排名競爭/合法得獎或 period；JS L32 CostShowcase2→同字串是 no-op，真正 mutation 是 AddItem；無正式 RNG/CAS/HTTP/v2。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/original-b45-top-prize-probe.pl` @ `cfdb86eb71880480cddf214b304b1ff0988ae568`；`modern/src/original-period-top-prize.mjs` @ `c2b4e976c8c0ff9f63a3e05a995e92eaf7495f51`；`modern/src/standard-street-model.mjs` @ `c624fbb9f2c141bd539b7dfec86a48d3ba373efc`。

## original-b45-top-prize.t

- 固定 blob：`f8ecb35dba0839bbf202fdb5f0d28aed441a8970`；有效／原版 Perl Oracle（受控）。
- 實際斷言：L8–27 exit/JSON、9選項＋overflow、rankingcount1、一個 item type、gift9→10。
- 執行路徑：DSL UpdateResetBefore/TopGetItem regex ITEMNO代換、原版 AddItem與rankingcount++擷取 eval；WriteLog stub；Node 純投影。
- Fixture：人工單店已勝、gift5或9、每例重建、Perl rand(9)注入0..8，Node choice轉 millionths。
- 限制：非完整 compiler/排名競爭/合法得獎或 period；JS L32 CostShowcase2→同字串是 no-op，真正 mutation 是 AddItem；無正式 RNG/CAS/HTTP/v2。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/original-b45-top-prize-probe.pl` @ `cfdb86eb71880480cddf214b304b1ff0988ae568`。

## b46-period-territory.test.mjs

- 固定 blob：`ea64d199acb18c55daaf47d984f1b16cebe0e4dc`；有效／Perl Oracle／Node 差分（純投影）。
- 實際斷言：L25–40 bootstrap meta/drift；L41–55 三例 town 全欄/人口、input 不變、2 draws；L56–68 multi-shop/tax/leader/event/draw拒絕。
- 執行路徑：原版 territory block＋RebelRobin early return eval；同 interpreter 第一輪結果人工傳第二輪、第三獨立；Node 每例 Oracle input 純投影。
- Fixture：手填 town/meta、單店、tax0、無 leader/event、now1000000、2固定 rand(200)、PushLog/l stub。
- 限制：非兩期完整結算；RebelRobin僅無領袖 return；無真 town disk/稅收入/多店/完整反叛/CAS/HTTP/v2。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/original-b46-territory-probe.pl` @ `58961635bfbb2fe7f03222a15e32361bcfd803ac`；`modern/src/original-period-territory.mjs` @ `528291611e001e8cc79d5648b9ec9b2713973c97`。

## original-b46-territory.t

- 固定 blob：`496ae141ccf9651325881cc1c64ad7746a30cc34`；有效／原版 Perl Oracle（受控）。
- 實際斷言：L8–31 exit/JSON、人口500000→374050→336550、develop/safety兩期、army8000→robina2666、money歸零。
- 執行路徑：原版 territory block＋RebelRobin early return eval；同 interpreter 第一輪結果人工傳第二輪、第三獨立；Node 每例 Oracle input 純投影。
- Fixture：手填 town/meta、單店、tax0、無 leader/event、now1000000、2固定 rand(200)、PushLog/l stub。
- 限制：非兩期完整結算；RebelRobin僅無領袖 return；無真 town disk/稅收入/多店/完整反叛/CAS/HTTP/v2。
- 來源／入口：`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/original-b46-territory-probe.pl` @ `58961635bfbb2fe7f03222a15e32361bcfd803ac`。

## b47-period-solo-sort.test.mjs

- 固定 blob：`cb54e0e7cbf598293926b0286d5d43144cece187`；有效／Perl Oracle／Node 差分（純投影）。
- 實際斷言：L20–31 marker drift；L32–44 四例 output逐欄、id/name index、input不改；L45–55 id/status/name/rank/profit拒絕。
- 執行路徑：原版 GetDTPoint/SortDT 擷取 eval；各例單店 @DT；Node 純投影。
- Fixture：人工 opened/two-sales/positive/loss；two-sales直接填sales/pay10000。
- 限制：非兩次交易、非多店競爭/同分排序/停業篩選/完整 period；無IO/CAS/HTTP/v2；負向僅 throws。
- 來源／入口：`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/original-b47-solo-sort-probe.pl` @ `92ecccde5f159a7bb41139b0912057b918480c6e`；`modern/src/original-period-solo-sort.mjs` @ `a61bba7f651aaccae799b382d22495e2c534115e`。

## original-b47-solo-sort.t

- 固定 blob：`7ba59eff7bf218bf098e4fcd0566a766a9c03303`；有效／原版 Perl Oracle（受控）。
- 實際斷言：L8–28 exit/JSON、4例、point5010、index0、非負point、rank不變、高profit加分、loss減分。
- 執行路徑：原版 GetDTPoint/SortDT 擷取 eval；各例單店 @DT；Node 純投影。
- Fixture：人工 opened/two-sales/positive/loss；two-sales直接填sales/pay10000。
- 限制：非兩次交易、非多店競爭/同分排序/停業篩選/完整 period；無IO/CAS/HTTP/v2；負向僅 throws。
- 來源／入口：`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/original-b47-solo-sort-probe.pl` @ `92ecccde5f159a7bb41139b0912057b918480c6e`。
