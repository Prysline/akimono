# C60 — actual CI evidence and independent source oracle diagnosis (2026-11-27 UTC+8)

Parent 4e83186b21d0e8bf7f2df0030c7fbc40d5400b00 / 8d95bbc756bd789aa41c29e753ec2d7d34f3630a; C sole writer. All rows below obtained from original job logs and actual checkout Git commit API; candidate trees checked against stated handoffs where available. Source-only tests, controlled clock/RNG, HTTP/v2 and wall-clock players are separate evidence. R0 233/R1 220 are audit indices, not completion rates.

## Actual checkout and results

| Candidate HEAD | Run / job | Actual checkout | Tree | JS | Perl |
|---|---|---|---|---|---|
| C59 4e83186b21d0e8bf7f2df0030c7fbc40d5400b00 |45895338554/140167713933|676ef6778e01ab28547393fd6e7438d18ee938e2|8d95bbc756bd789aa41c29e753ec2d7d34f3630a|1350/1350|2456/2456|
| A 49851d098fae8c45a25a32e60eb4b4f0b4195e43|45892523628/140158394938|2fda527efe2856cc4ad7752677116ce1b81e3b4e|ff7a4d141e0f8d68c9c706e757adf450f8db67c2|1560/1561|not run|
| A a39532044c129bbd844841334be623b98bffbaec|45892643620/140158801730|f14d9f6fc866fb0fe565bcfb083f0d2d51bbe89d|d6bff3b6c50a052aca4236dc8cd09bd34412e2ae|1562/1563|not run|
| A 80d0a0170f467a36643231e68d97db53da27dd95|45892881857/140159597868|66811c5fdda0b022d33f2cc46cd2bbe80779291a|36cfb4d3b7bbbdc33921d7a11e64f1da269af38a|1565/1565|2778/2778|
| A 9addbd06c0491beab38033b27747a455b3a2b922|45895881409/140169517880|f90fcf8764321a6256a50056d37f6de02f63cbbc|2edce73fccd8d67fb067c15868aee38d61a9b624|1568/1568|2778/2778|
| A 6677d4d5ad0facc705d82a44c36b6f8b8466e335|45896182008/140170533944|2d2e5061ddb6ecd7c2dd3d7b7cc0114fa6685113|cdbbc5e9d1b3b611d80d1f0620583de5d9624462|1568/1568|2778/2778|
| A 1a7a5867b018892af6220f8ac8e32d395b9b351f|45896342982/140171068446|860f7903023b49156e615c3c755926ae00ded5eb|413c932ea6c2d2e849944765f0b0225eb7ccff22|1567/1568|not run|
| B 8aa97bc549ade9bb2e2117ae9f44d3597f22b455|45892621259/140158726869|d1a5986dc5f9ac0bc6db61600289ed65deea0859|638817651dffd70f4baf874d997b742d447a6bb9|1679/1680 skip1|2929/2929|
| B c4be128bf87f7428f9d5a9706bd95fed73d616c9|45892778690/140159245569|0d08ea29b00801e5870252df1317031b23ea1ead|fe76d61b52586666b4a3e9af448dc8664bf59921|1682/1683 skip1|2929/2929|
| B 14e02dcaf4d7ba806f96a8659894c79993aae29e|45892924272/140159736776|00a1deae826067d73f612b96251cec144f155f1d|04a66de016f591ee1353aeca45a26c71faf76678|1686/1686|2929/2929|
| B 576ec408ce139141d760e644178f34f85d9dc102|45893306253/140160993825|4ba5f398189e982478f06da0097eb20ffc3d4466|502c5f7be907c15f581ffced64be0c2005e8926d|1689/1689|3001/3007 fail6|
| B 28d5c37fac650f90d5330b13a7096cbe634ec4fb|45893514311/140161674507|048b3aae84ed542350d03c747700873b8553bae4|5a71c45af92d741a039679c0086cceedb594b215|1691/1691|3029/3035 fail6|
| B 0823f94e6cd78a21ef0a614e6038ea0ca6f84781|45895700170/140168915990|049cce06ccc561ed9357e3b03e59a1d8d4e08928|5ab05666172dff99b7df6bd07d5d165984d34d2f|1691/1691|3166 total, FAIL; historical raw log reports 12 failure lines, summary 10 failed indices; not reconciled|
| B cf8449290f0849b6c181d2e764d1232cc37f9162|45895726919/140169004796|b8f7a89668cf5140375a3e224686f942c839b826|756721dedf17588fda9f87c8aff9ab681d59c052|1691/1691|3158/3166 fail8|
| B 6c456e5b5fb5d980c13356e7579724cf0c77d36b|45895811037/140169286328|a79b1d4b8477e65920b794c83cefeda60a6a9073|cfae600b8807d808b7a4319842458b291e0edfd2|1691/1691|3160/3166 fail6|
| B cac00ecdbca8602a1ba9a7a93f16f0f7030a559d|45895952953/140169757814|58ac776cd13995d8d5feed8f244b589955411525|18987e808270eab2f759123d6919dc42e8040254|1694/1694|3160/3166 fail6|
| B 0936465451c7da47e28eb6b3ceb0e0cebb7b3671|45896046916/140170078909|af4d672c73f72330a35dee4681c43b9c01ad1d5c|acc49e65ad033ac6311317c4a0c3c92b44487a32|1694/1694|3172/3178 fail6|
| D 08531b4a3f688f68bdf8c34bd9a6ac44f9ba8cea|45893429371/140161397497|01369a35732d02cbc1ccfac6df9c6530fc947c56|4d315ed27fda195adad47e9fcdbb44a8e77ae501|1386/1386|2456/2456|
| D b034925d3c2ac4fdeabcae6239c56c3e3206a884|45895385085/140167867448|55d4ba17ff57a2fe61788bb9fa6c95aa34a89f34|9c9caba724d403ece783ebb27467bb28b35d0edf|1388/1388|2456/2456|
| D 046e74bd3878c83a5f86226ddd3c601feeaadbd6|45895607892/140168618751|7795466b482180ac3c8a44ae3c21b89896d8e5f3|8021a453ffcb36b2c6f5f172c077ffdf8b8887e4|1391/1391|2456/2456|

All JS rows without an explicit skip had zero skip/cancel. Run links https://github.com/Prysline/akimono/actions/runs/{run}/job/{job}. Counts for Perl failed suites are total minus reported failed assertion indices, not successful full suite.

## C59 dedicated jobs

45895338551/job140167714398 exact C58, original 1/1 and isolated diagnostic 1/1, no skip/fail. Prior B41 rejection not reproduced, no failed trace. Artifact 15155055289, sha256:6ad8e76994b0f10121ae5fc5e4f40083ed5af823c6dee45dbadbe60fb2ae833c, metadata verified, ZIP not read. P5 job140167714345 original2/2, observation1/1, upper100000/paid104818/minimum4818/rev210/money53182, six works61000. Historical P5 batch50 root unknown. Old C55 strict job140167714011 failure and D13 job140167714322 success retained as separate jobs; prior D13 independent exact pass established in C58.

## A
All six #24 FUNCINIT pass; actual [600,450,225,300] in logs. Historical A17 failure remains. Two natural EVENT failures on 49851d09 and a3953204 L75 signedDelta actual 0 expected -0, source test row.units*Math.sign(row.plusSeconds). JSON has no negative zero identity on wire; preserve signed nonzero, units/draws/lifecycle checks. A21.2 dairy fails L35 on herd #79/4 L156, stale generic local use-item prefix after reviewed #79 silent change; need actual log bytes and exact silence check, not deleting assertion alone. Not proven dairy production bug. A notified #22 comment7214869967.

## B
Latest nine specialist job logs run45896046889 all exact af4d672c73f72330a35dee4681c43b9c01ad1d5c: browser140170078829 4/4, cow140170079084 1/1 (32 opportunities,1 death,4 dead,rev27→32), dragon payment140170079102 Perl52, fiscal source140170079129 JS136+1, guild140170079131 Perl106+JS20, fiscal player140170079137 JS3, rebel140170079217 JS5+17+4, joint140170079267 JS3, guard140170079289 JS4. Older guard run45892778621/job140159245423 exact 0d08ea29... 0/1 prerequisite point/cash budget period44 final7648 max21289, not proven guard runtime defect.

Six lifecycle oracle failures in latest run: wrapper tests 27/28/46/47/64/65. got names last USE name, item counts undef. Static source diagnostic against exact wrapper blob edf97c6055936875ca613b774e3d236832bdb8aa and DSL 7a18185e98b32aee82ca1ce30d6f3c395157dbcb: old regex produces 79 blocks, #63 nine name rows ending 將展示架改為8個, #79 six ending 交換米諾陶洛斯. Candidate regex recognizing indentation + case yields same 79 blocks, each #63/#79 one correct name. This is JS regex inspection, not actual Perl. Independent C-only CI job executes exact B original wrapper then separate one-regex diagnostic copy with all original assertions, exact source pins and clean checkout. Original fail remains fail; no source or B branch edits. B notified #18 comment7214864839; D notified #27 comment7214870586. D20 full green does not include this B lifecycle wrapper or full shared authority; R5 not launched.

## Next
Read independent diagnostic TAP; validate B official corrected candidate separately, not treat temporary copy as official fix. Continue A/ D new evidence and R5 readiness. No user policy decision needed; no game rules/source/runtime/shared workflow edits.
