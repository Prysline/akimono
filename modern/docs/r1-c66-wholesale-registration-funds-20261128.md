# C66 — stable wholesale diagnosis, registration wire and P5 budget (2026-11-28 UTC+8)

Parent 16f17336403e8e9b587e71d17bbd34464b39fa43 / b998de5707eed38fcb13e9032daaaf7e4ad3f0f3. Baseline 08fdd3b31ff130e66d0337360430fda3d73fdc8d / 9a6c0d5837042c276eda13f78394025016d332b5 unchanged. Read C63–65 handoffs, C65 detailed doc and both D notifications.

## Exact independent D45 diagnostic
Run46046790793/job140667928688 checkout 64af1d22d18b5971c62dddc9955c037372600ee5 / 5664b686ad0caedfd0628dfd76fa95a51470ed1d. Original JS2/3 red, independent copy3/3, zero skips. Round1 79 numbers; round2 79 strings; both raw CSV numeric matches. Copy validates input safe nonnegative integers, maps Number from input, preserves raw bytes and all assertions, adds mismatch rejection. Downloaded artifact15222422556 SHA256 8ca13273d0de30960cc7beb58535882ced4c704b7cdc34799d338780e11b5b45; environment, original.log, observation.log and observation.diff all inspected. Overall red intentional. D notified https://github.com/Prysline/akimono/pull/27#issuecomment-7226837243. D46 corrected oracle boundary, not runtime guard.

## Raw full CI and actual merge checkout trees
|Candidate|run/job|actual|tree|JS|Perl|
|---|---|---|---|---|---|
|C65|46046790340/140667927847|a70451aef4ff3a2506acd23985a70c5f2ed796d3|b998de5707eed38fcb13e9032daaaf7e4ad3f0f3|1350/1350|2456/2456 (85)|
|A35.3|46044688667/140660878543|a648145a2dc5fc8d092b664700ba39664d2b8ce4|837c2eb59cac896e121416c4794c67b07f9e459c|1601/1601|2778/2778 (94)|
|B latest 74281e2|46047264303/140669524290|66db005adbf646152849ef4654411466b947d6ae|9b8271f96691379eea5943026756be00841191be|1732/1732|3273/3273 (98)|
|D46|46047154958/140669152193|a5864e60740879003f9d79ef7341d1da44d2e361|bc5fb10948e20fd09effc01299bd816feed7ff15|1437/1438 (1 skip)|2829/2829 (88)|
|D47|46047264855/140669526138|be2c8440fb61718d3863b9cc7db3b1df8b26f3a6|22ad02016a29381d228a9ae37add62e4ccc3565d|1444/1444|2829/2829 (88)|
|D48|46047480156/140670243853|04833065a62d7b23331301f39abc64a554bf08f8|6ed9a609316fb779671a178c652d0173c41bf7ac|1445/1446|not run|
|D49|46047611326/140670690904|40a086903ea4b0eb38887baa326c5f415829c344|091b74b1f3aba7173791dbd0d987c60bc3081a91|1446/1447|not run|
|D50|46047734854/140671101920|80239a89aaceaa172e52879381c1d52d034f42e3|efc7533224860eb962998fa4cc9c17cfaf9d8f84|1446/1447|not run|

Zero skip/cancel except D46 one skip (reason not yet independently read); D48–50 one fail each. A latest 4329653d6538ebbac6e44dd2adb3adcf61a36762 / 9132f5aebd98f19063dd52dbbc624c29b988be3a run46048148919 in progress at query; #25 same head, fixed base ddd2f441. B run46047264389 nine raw jobs all actual 66db005 same tree, zero failures/skips: rebel140669525290 JS5+17+4; fiscal source140669525621 JS136+1; genuine fiscal140669525650 JS3; dragon140669525657 Perl52; guild140669525664 Perl106/JS26; lord guard140669525703 JS4; browser140669525711 JS4; cow140669525771 JS1 (144 opportunities, four cows dead rev119 recovered124); joint140669525792 JS3.

## New D48–50 source boundary
D50 HEAD 6440e6b371881be102e21eac0c0552d167d7ef7c. Raw assertion extra moneystock:0. Source new.cgi L71 initializes moneystock:0; modern initializer L150 matches; inc-func.cgi 32 DTindexnamelist fields exclude it, and oracle L639 DataRead then L644 enumerates only persisted fields. Static cause of mismatch established, not independently rerun corrected D registration. Keep initialization and exact wire checks distinct; notify D https://github.com/Prysline/akimono/pull/27#issuecomment-7226850857. D50 independent disk-store L23 closed-only guard still present, original archive continuity proven C65; no actual modern data loss proven. New credential verifier is candidate, not formal HTTP session/restart acceptance. No C runtime change.

## Recurrent genuine player / P5
C65 full cow 448 opportunities, four cows dead rev381 recovered386; P5 minimum earnings spent 4835. B latest full 96 opportunities rev80->85, P5 4829; A35.3 two cow traces 80 rev65->70 and 320 rev264->269, P5 4821; D50 cow432 rev371->376, P5 4830. Historical C58/D35 Nayuta B-41, D30 high forge budget, C62 P5 failure retained. C65 recurrent workflow46046790489 all three jobs green; D30 raw1/1 exact tree7cd012e4289f01c7ee6a5b1eff4d110c980c9129; C62 diagnostic P5 minimum4836, D35 job green (raw detailed counts pending separate audit). C65 historical archive/lifecycle/R1 strict diagnostic red retained; not blanket green.
 
New C-only workflow pins C65 and original P5/helper blobs; independent temporary full test copy uses live threshold until strict proof plus a bounded 256 purchase cap (chosen test resource budget, not game rule). Ensures at least one final #10 purchase even if threshold already exceeded at entry; records required purchases, attempts, proof and explicit budget-exhausted marker, preserves every original assertion and second negative test. Original test remains unchanged and existing historical workflow still runs separately. No RNG/time/asset injection; no automatic rerolls. New workflow not executed at commit time. 45 min outer timeout or 256 cap still possible, not evidence of runtime failure without further diagnosis. R5 formal multiplayer, session ownership, archive co-existence, restart/CAS publication still pending. No user rule decision needed. No local full checkout available; raw CI and connector evidence used.
