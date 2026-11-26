# R1 EVENT 編譯 metadata／禮物卷與地圖 Oracle（限定層）

固定正式 base `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；exact 前候選 CI 45794612974 0 fail/skip。25 EVENT 全數逐欄差分的實質是 metadata，不是 25 EVENT runtime。#79/0 與四 ITEM 的 Oracle 為受控 memory/Perl，未提升 HTTP 或 v2 標籤。

## b53-event-catalog-source.test.mjs

- 測試 blob `bdaba6a5853bd835e92841b8c7c0beef24181eaf`；probe `modern/tests/original-perl/original-b53-event-catalog-probe.pl` @ `855bd3c4ac103217580d19630e256c4239b584a4`
- 來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`
- Fixture：兩固定 DSL EVENT header；probe 抽取原版 GetTime/GetNumber，對最後 START 及 callback metadata；Node source mutation
- 斷言：25 rows逐項 code/ordinal/group/startProba/baseTimeSeconds/plusTimeSeconds/compiled、全部 repeated START、opaque callback presence/name equality；runtimeSupported=false；source drift rejection
- 限制：僅編譯 metadata：固定原版 GetNumber/GetTime、last START -1/0/positive、group/time/opaque callback 名稱；沒有 EVENT callback execution / runtime / HTTP / v2

## original-b53-event-catalog.t

- 測試 blob `d66fd10bc2d9bfc5424c2ca8def97ab5adeab672`；probe `modern/tests/original-perl/original-b53-event-catalog-probe.pl` @ `855bd3c4ac103217580d19630e256c4239b584a4`
- 來源：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`
- Fixture：兩固定 DSL EVENT header；probe 抽取原版 GetTime/GetNumber，對最後 START 及 callback metadata；Node source mutation
- 斷言：實際執行 Perl probe exit0、JSON、25/17/8、2 zero/15 positive、happy100/18000/18000、priceup-yakusou last -1、rebel zero now、guildbattle end
- 限制：僅編譯 metadata：固定原版 GetNumber/GetTime、last START -1/0/positive、group/time/opaque callback 名稱；沒有 EVENT callback execution / runtime / HTTP / v2

## EVENT 25 rows

| EVENT | 最後 START | 編譯 | Oracle 範圍 |
|---|---|---|---|
| kill-ken | -1 | disabled | metadata only |
| kill-yoroi | -1 | disabled | metadata only |
| kill-tate | -1 | disabled | metadata only |
| kill-tue | -1 | disabled | metadata only |
| happy | 10% | included | metadata only |
| boom-posyon | 7% | included | metadata only |
| ken-sale | 10% | included | metadata only |
| tate-sale | 10% | included | metadata only |
| yoroi-sale | 10% | included | metadata only |
| tue-sale | 10% | included | metadata only |
| priceup-yakusou | -1 | disabled | metadata only |
| priceup-tetu | -1 | disabled | metadata only |
| priceup-misuriru | -1 | disabled | metadata only |
| priceup-oriharukon | -1 | disabled | metadata only |
| plusdown-yakusou | 10% | included | metadata only |
| plusup-tetu | 10% | included | metadata only |
| plusup-misuriru | 7% | included | metadata only |
| plusup-oriharukon | 5% | included | metadata only |
| manbiki | 100% | included | metadata only |
| goutou | 20% | included | metadata only |
| getmoney | 30% | included | metadata only |
| getpop | 30% | included | metadata only |
| loto | 50% | included | metadata only |
| rebel | 0 | included | metadata only |
| guildbattle | 0 | included | metadata only |

## Gift #79/0 與 ITEM 9/12/14/79

固定 source compiler 子函式與 UseItem，受控 memory 差分：#79/0 消耗2券、#9/#12/#14各1，稀疏市場、時間1800、cap與拒絕；不等於真 HTTP/v2

- `modern/tests/original-admin-sparse-market.test.mjs` L173–219 @ `81db868d6972067ee708992e2134dde213699a01`：合法 memory gift sequence、稀疏 stock/CSV 與第三次拒絕
- `modern/tests/original-admin-sparse-market.test.mjs` L277–328 @ `81db868d6972067ee708992e2134dde213699a01`：直接 Perl probe 與 Node CSV/defined slots/stock/money/time differential
- `modern/tests/original-perl/original-admin-sparse-market.t` L33–106 @ `71247094b760f9827b78addf60bc20b7d4062965`：原版 gift #79/0 兩次成功、第三次不足拒絕與 cap fixture

固定 helper：
- `modern/tests/original-perl/OriginalAdminBootstrapHarness.pm` @ `538a03cbcc36fd8d27ed77e1c86c40fbce55f1b1`
- `modern/tests/original-perl/OriginalGiftMapUseHarness.pm` @ `4a81cd4b834222acdd059d9ea9a717452fc830c5`
- `modern/tests/original-perl/original-admin-sparse-market-probe.pl` @ `2bac04c03ea5a630d0a425f5423e0ba03da408bb`
- `modern/tests/original-perl/OriginalVirtualItemLoader.pm` @ `c3620e1f6464b511a8f9e124102ff47fabaeda35`

#62/1 已有 HTTP false 原因明列於對應 evidenceLayers，不可把 memory registry=true 當成跨店正式操作。
