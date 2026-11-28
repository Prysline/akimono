# C61 — independent CI, lifecycle compiler and A player prerequisite evidence (2026-11-27 UTC+8)

Parent C60 6261b77e0f827fdf6c76077c3b28052aca2be2cb / f016edced694f613bf7714fe54775675bbd0e499. C sole writer. Original source, runtime, existing assertions, A/B/D branches unchanged. Audit indices R0 233/R1 220 are not completion rates. Evidence types remain separate.

## Actual full CI evidence

Each actual checkout SHA below was extracted from the original job log, then its Git commit tree was retrieved. Trees match the respective candidate handoff or, for first five A rows, independently fetched candidate Git commit tree. All rows have zero JS cancelled; skip only where noted. Perl not run on JS failures. Run URLs: https://github.com/Prysline/akimono/actions/runs/{run}/job/{job}.

| Candidate | Run/job | Actual checkout | Tree | JS pass/total | Perl |
|---|---|---|---|---|---|
| C60 6261b77 |45975339766/140425550777|bd78dbb79af4d5ff56ba80c576802c3cb990209f|f016edced694f613bf7714fe54775675bbd0e499|1350/1350|2456/2456|
| B 6869d24 |45975235945/140425203364|03cdd587007673758f47efd3a2b79f23107fd9f3|d9522558dc736f9723b87826a198eeebcbf06294|1694/1694|3213/3213|
| B 4e59a7b |45975302516/140425427398|11b66db01bf0b92c361d1d0284110412793f291b|1af8cd78dc753f8173449c3579a57380635350a0|1693/1694 skip1|3229/3229|
| B 3d5d5bb |45975474013/140426000834|03308b519323be3735630b8945421e27b66fef15|96d3fad2b18522583aa79389b3d005f4ece0bccf|1696/1696|3229/3229|
| B 2818a3c |45981661613/140446809620|0d4dee48c755b35654f4ee5cdfd9b15e6e6fd8bc|3f40f0057116eef78b9c1c5c5b34a5aa62a7cfdd|1708/1708|3273/3273|
| D21 158cfee |45975219192/140425146749|792e62f2e32274d4395d36c0118fbf3c3216f3ba|121cddfb718d87816b443b7ad173c6a15fa73a67|1393/1393|2456/2456|
| D22 e721428 |45975335108/140425534414|60158d761b02f370aa0c33e5da802fe09bbfdc8a|2f7fbd3eb7e1441eae38c72683ea3c963abe7299|1396/1396|2468/2468|
| D23 031b3a0 |45975523191/140426163724|e4c3b429e5b521a376afa45073b90792fea80411|00eaf442105da75cfa437b03155f4d13f531ba92|1396/1396|2468/2468|
| D24 bebe12e |45975761156/140426947190|c2e7fce948ad151e6e91e1914880d9238ca39bab|d568c3535e99eb62a46fcd1a6b7bb35d42124dc3|1399/1399|2468/2468|
| D25 5da13d1 |45976171344/140428320979|9f1e765d54e6da368de2732196e35e3dbd8e9a2b|f128967ecc8cf14875a4b1f9ec36e762c917d184|1404/1404|2468/2468|
| A f9b19c2 |45975060511/140424616579|321ab994ef1fbe650b6ca9699a7a5b48b5583fb5|753c21133d7df4aabc9ab866423f7b9128a363a3|1568/1568|2778/2778|
| A 862bb10 |45975416759/140425808557|35c9af06577a074bc01065a67c18558329ad446f|1b78dcf2d7470aea2a8a992f4c372d460f503675|1569/1569|2778/2778|
| A 43a683b |45975703778/140426758600|150e9fa4c411dd2e2fb01bee156cd59b8fd6bd94|8c6a9287b8c3404bfcfe161b584898dd622550a1|1570/1570|2778/2778|
| A 5521ac6 |45976216109/140428468288|ce66479995c33f0da7a674aead7c5b394e972556|7af8263991409b34785f22b3dad86c4145e1375d|1572/1573 fail1|not run|
| A 06ce172 |45976427683/140429171584|d0685a9e88a15da4557f4558f94fc937f892bcaf|839b4a3ea4d9735e727e4cff774d67edc17a4914|1573/1575 fail2|not run|
| A a3b3e5f |45976646837/140429912310|c128501123a01a753a26ba4a532cb1fd7317907c|f5e13ba7f2385f3f89ed715117cf1c0bc3e5c84d|1573/1575 fail2|not run|
| A 4b63109 |45977137460/140431576348|396398bb266f1f00baf212e54d19c6fce78a7c11|4ce96bd4d2a8d81e27a0e30be61e58ec313a7b01|1575/1575|2778/2778|
| A24 0248550 |45977335279/140432252987|0a95a4b2a3f8958ef589df2f636047da73f78527|ef282154e885ceef07dcf36d1c407c9b6524c4f8|1577/1577|2778/2778|
| A25 ab0ed3a |45977525122/140432890345|3337b83c428d74020e519ad7d652dfd2c808246e|541df3ffd45885708f85362bbfc420ca02bf80b1|1579/1579|2778/2778|
| A26 04772ca |45977970406/140434396163|1fdee58e43daf8c7af7e0f7f51e8954b0366766a|77b08a4a04a9c40bc7690ac27147181289645d27|1579/1580 fail1|not run|
| A27 8c3b925 |45979754081/140440351939|6ec85154f7dd5388bacfa7c99fc8f5dc37eee044|e271a7b19aee0f6b1ef32b036fa5147a051c7eaa|1582/1582|2778/2778|
| A28 b099a74 |45980237587/140441994042|e2aca12dc3bf8891e3085aa2ac6720ac5e05d347|ffcb0bf7c8f2b6885c081f9d8637da59367a9db9|1582/1583 fail1|not run|

## C60 dedicated evidence (run 45975339576)
- job140425550454 exact B 0936465451c7da47e28eb6b3ceb0e0cebb7b3671/tree acc49e65ad033ac6311317c4a0c3c92b44487a32. Original 231/237, fail indices27–28/46–47/64–65. Diff output shows exactly one line changes (indentation and case of section regex); isolated diagnostic copy 237/237, source pins and clean status pass, original job remains failed. This demonstrates harness defect explains the six failures; not a new gameplay rule. Artifact15187564741 digest sha256:21e7c8ca63fe37601bede77090326fa41ef625372dbf974118b419089fb7cae0; artifact metadata read, ZIP not read. Formal B fix independently verified: 6869d24 ok29/30/51/52/69/70; latest 2818a3c ok32/33/54/55/72/73. Latest raw session alias 287/288 passed; D stable identity policy unchanged. B latest specialist run45981661622 all nine job metadata success; individual raw logs not yet audited this batch.
- job140425549890 exact C58 original and separate diagnostic 1/1 each, zero fail/skip; historical B41 boundary rejection not reproduced, not resolved root. Artifact15187469639 digest sha256:a5ce8cb94b7b546e2b467c72a22201e87ab2a73998df1ba8b1d2185b5f22df72.
- job140425550302 P5 isolated observation shows total paid104819, nonwork upper100000, minimum4819, period1 revision212, money52448, six work receipts61000. Historical P5 failure retained. Artifact15188760811 metadata verified; no ZIP read.
- Original C55 strict job140425550385 failure metadata; D13 independent strict job140425550281 success. Prior independently established C58 D13 fix remains scoped to that candidate. No production baseline claim.

## A evidence classification
- All 12 A candidate logs show dairy, natural EVENT and ten-voucher genuine tests pass. A28 additionally controlled ten-voucher exchange ok1031 and genuine ok1144 (new A28 assertions in pinned test; not full suite green). Prior 0/-0 and dairy old log failures not reproduced in these logs, retain historical evidence.
- A22/23 three historical failures: library expected.titles.map not a function; owner help undefined.msg. A formal oracle arrayref repair 4b63109 full CI green, later green evidence retained. Do not infer gameplay error from malformed oracle output.
- A26 not ok1140 at r4-normal-commerce-remaining-items-http.test.mjs:99:14, j<20 actual sword trip funding. Existing loop awaits real time, requires money>=12000+max(45000,ceil(costtoday)+10000), performs #13/1 paid work; initial funding budget reached before next sword USE. No full per-iteration receipts in original log; no proof of callback defect or proof that strategy is the sole cause.
- A28 not ok1161 at r4-normal-commerce-wood-iron-packages-http.test.mjs:204:12 prepareAdvancedCapital. Four legal products #40/57/45/51 initially manufactured until stock>=120, then enoughTime(4*600), then four /api/showcase calls per120. Actual SOURCE_BOUNDARY_REJECTED / Item out of stock; no exact item/shelf/before-after data. Hypothesis time wait or listing may change stock, not proven. #39/3–11 not reached; do not label callback failed. A27 pass preserves positive separate world, does not erase A26/A28 failure.

## New C-only targeted independent CI
.github/workflows/c-audit-a-player-prerequisites.yml uses two pinned historical candidates; original targeted subtest executed first, then separate freshly generated world with insertion-only diagnostics (test copies, original helper unchanged). Exact test and helper Git blob pins; original lines preserved, no game state injection, selected RNG, altered assertions, rerun selection, source or runtime modifications. Failure remains failure. Targeted runs not full-suite acceptance. Matrix case names advanced-showcase/sword-funding. Before committing, diagnostic script ran against both fetched exact test contents and verified all original lines remain in sequence. Actual Node/Perl/full HTTP tests not executed locally; workflow execution pending. This adds evidence only, not a prerequisite for unrelated A/B/D migration.

## Coordination
B notification https://github.com/Prysline/akimono/pull/18#issuecomment-7221688260
A notification https://github.com/Prysline/akimono/pull/22#issuecomment-7221690483
D notification https://github.com/Prysline/akimono/pull/27#issuecomment-7221689082
LC-B1/B2 source evidence ready for D adaptation, not formal lifecycle. D25 noncommittable preflight, formal owner/CAS/history/v2 and same-world external integration still absent; R5 not started. No new user policy decision. No merge or other-window writes.
