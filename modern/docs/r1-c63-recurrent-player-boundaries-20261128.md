# C63 — independent CI and recurrent player boundaries (2026-11-28 UTC+8)

Parent C62 66c8d962392c3b190511348dd2415bdcdd7f45df / ffb00590203f90be092f6d5b15c80697a5bd5888. Formal base 08fdd3b31ff130e66d0337360430fda3d73fdc8d / 9a6c0d5837042c276eda13f78394025016d332b5 unchanged. C-only audit; no gameplay changes or replacement of original assertions.

## Raw CI logs and exact tree
Seven actual synthetic checkout commits independently resolved through Git commit API; exact candidate tree equality. JS skip/cancel 0 throughout; Perl not run on JS failure.

| Candidate | run/job | actual checkout | tree | JS | Perl |
|---|---|---|---|---|---|
| C62 |46028369897/140605532165|1ca4325a44d8704ef9c0475962c2978f389b83ec|ffb00590203f90be092f6d5b15c80697a5bd5888|1349/1350 fail1|not run|
| D30 90858aa |46027674757/140603156719|3a17fd4be1a41142d052e515bbf8560afee7a412|7cd012e4289f01c7ee6a5b1eff4d110c980c9129|1417/1418 fail1|not run|
| D31 d2cc32a |46027834831/140603695065|5c1534ae4d75f499839565f466ca2fd9a3bf37a0|a8ad16bf308a9c15509a0145b715bdc35fc27954|1422/1422|2756/2756 (87 files)|
| D32 f8eb606 |46027992927/140604237271|b681c29a627d8733faf74e9a9cb40ba8aece823d|5775d8f2faccf805317ee1e42210867d7904dfd5|1425/1425|2756/2756 (87 files)|
| D34 c888699 |46028518835/140606030129|22b3112df32edd8cbd7ad2420b8e834acdaf9610|24b3653a6277b207a831506c4ac95665c3b513d4|1426/1427 fail1|not run|
| D35 26604de |46028716945/140606705282|57fac56635f50b51b24b105f3bdc5f526fad7b30|6b27acdf4f07ed900b78bd84573b52303d85aa7e|1428/1430 fail2|not run|
| B 0d802c0 |46023337733/140588279319|9399182859ad74e4e4eb909319e3b18b82b96881|07d91166399c8617a94dc9cbe01267586edbdca7|1720/1720|3273/3273 (98 files)|

Job URL https://github.com/Prysline/akimono/actions/runs/{run}/job/{job}. D30 oracle ok955, D31 ok956, D32/D34/D35 ok957. Historical D28/29 red retained. D30 new unrelated #66 high-forge period budget exhausted: boundary59, remaining69771, exp9=340, exp37=100, money6612, during market wait. Test explicitly stops before settlement; rerun exact candidate without increasing budgets or selecting seed. D35 #66/3 B41 rejection clock1024621/shop956179/money6754/exp9=340,37=100; separate from D34/35 LC-D2 test error. D34/35 voluntary-close-state RangeError exact current active source shelf state required; D37 5c44618 statically changes Perl probe to opt-in showcasecount=1 matching one actual shelf, no guard change. D37 CI not yet verified.

## C62 source boundary raw logs
Run46028370045:
- job140605532653 D28 exact aef09c7/tree6650d83; original3/4 compile fail; isolated escape-only copy4/4 zero fail/skip/cancel. Formal D30 fixed original oracle above.
- job140605533072 B4415c29/tree5a1b408: original3/3, appended observation5/5. Missing active fulfiller and expiry equality/no refund verified against source in controlled fixture.
- job140605533170 same B tree: original2/2, observation3/3; normal ID100 read remains, ID1 read deletes as parcel notice. Not formal runtime identity or data loss.
All three exact checkout/test/module pin steps and artifact uploads passed.

C62 P5 general red not ok618, p5-book-work-v2-player-http.test.mjs:195, workFundedPurchase null, original assertion retained. Prior historical C rerun run46028369819/job140605531893 observation1/1 actual nonwork100000, gross104832, minimum4832, rev218/period1/money52892; prior successful sample not C62 failed world. Static observation: workFundedPurchase assigned only inside final #10 loop; if gross already exceeds non-work funds before loop, or if 32 iterations cannot exceed it, same assertion could fail; no claim either occurred. New pre-loop log and prior per-purchase/positive-time diagnostics preserve original assertions, observe new unselected genuine world. No mutation of stock, clock, RNG, or failed historical world. Fixed D35 Nayuta exact candidate diagnostics and D30 unchanged high forge rerun. Original and diagnostic exits separate; no retry-until-green.

## Current boundary
A latest d1738f4fde068b656fb1b122821e5854b812cd4f A31.1 run46027972125 in progress at query. B latest 0d802c0 full above; R4 run46023337751 status success only, not raw verified here. D latest D38 66fa1895c2e57ad316014caf8f1be0b51768f7b9 / 93b7fed619e0812847576ecaa2f7fd0e92330c4c run46029338422 in progress. D33/D36/D37 in progress at query. D38 header projector explicitly noncommittable and tests synthetic active ID1; D35 private session and D36 two-shop wire are prerequisites, not actual same-world registration/HTTP/CAS/v2 publication. Reserved postal identity still requires D integration proof, not new gameplay rules. R5 no formal player acceptance yet.

New C-only workflow pinned three candidate refs, expected test/helper/source blobs; C62 P5 and D35 Nayuta diagnostic transformations based on prior workflows with new pin anchors checked from exact files. D30 untouched test only. New runs pending; no local full checkout or test claim. No user decision needed.
