# C65 — archive continuity and stable-ID wire independent evidence (2026-11-28 UTC+8)

Parent bc400534f00ce6c32183366db8ca245840f4c5a1 / e16bec74aede85cdf762c9c5038648f29be40ea4. C-only test workflow and document. Base 08fdd3b31ff130e66d0337360430fda3d73fdc8d unchanged.

## Raw full CI, exact actual checkout trees
|Candidate|run/job|actual checkout|tree|JS|Perl|
|---|---|---|---|---|---|
|C64|46043604543/140657230094|46c146ec0151cdf6caa05ff216c53a6685a39316|e16bec74aede85cdf762c9c5038648f29be40ea4|1350/1350|2456/2456 (85)|
|D41|46043454118/140656714601|2d4f46c8acbc760d8ce13e3015ee1c703eb213f2|579ab24e429b4cfa0ce6014f9e495e642cb19f6c|1434/1434|2823/2823 (88)|
|D42|46043632340/140657317388|3db9f5b378378fb6ab959d05119f0521a1f67a62|098391d58c6a1f3cd28aef036a86a2ef6093cdc2|1434/1435|not run|
|D43|46043748017/140657699237|2397a4ac3c0fadba55a71bda3578c1c1070c1dcb|d73dc9d3b456f3bfbb65e5e0b8c0857b7b6ace77|1435/1436|not run|
|D44|46043840478/140658017352|579775152d5ef37e13c53aa93e91aeb88cc58a47|af6d148122806e880cc38d997021adef701c7980|1436/1437|not run|
|D45|46044050751/140658740540|2a399859a7fc02426afb9cc6d22a98ababe6b945|5664b686ad0caedfd0628dfd76fa95a51470ed1d|1437/1438|not run|
|A34|46032847100/140620734253|de7ff668f601b943772ff685f88bf1b93b585553|a1f158adcb4e04468e56e9d7c606d5d9bffc0ef1|1593/1596|not run|

All zero skip/cancel; D42–45 each one fail same test; A34 three fail. A34.1 497f36b82ec3abe65f946b4a539dd6dfdfbf459c static diff adds edit-owner-icon to reviewed-time ordinaryKinds and fixes rename oracle reviewed variable; not independently proven yet. A35.3 f4187ec2d3f690ef90b7e1cb3a7876c000e18e8f run46044688667 in progress at query. A34 errors owner-icon HTTP false != true and two reviewed is not defined.

## Archive continuity confirmed
C64 run46043604656/job140657230154 actual D40 6530714075282af97873732354ad296f91fb4cc4 / 42638239833ec4ecb1ab0c707dd80c42ad6fbbae. Original red pin retained. Pin-only corrected Perl 296/296 and JS1/1, assertion280–282 actual WriteErrorLog and rotation, 287–288 same name new stable ID, 292–294 current/old bytes and both mtimes retained through DataRead/new.cgi. Artifact15220843291. D41 actual full green independently confirms correction. Controlled original source fixture, not formal modern lifecycle CAS or real data loss. Source contract now established: archived files may coexist with an active replacement shop. D notification https://github.com/Prysline/akimono/pull/27#issuecomment-7225079222; D owns disk authority change, no C runtime edits.

## Recurrent real player observations
C64 full cow 288 opportunities, one death four cows, dead rev239 recovered244. C64 full Nayuta cross period successful through period2 and natural lostbook. Exact run46043604645: D30 original1/1 job140657230498, #66/1 output68+15 and #66/2 output69+11; D35 original1/1 copy1/1 job140657230533, 163 observation rows; C62 P5 original2/2 and copy1/1 job140657230105. P5 before last loop nonWorkFunds200000 totalPaid49831 rev197 money208048, after204831 paid lower bound4831 rev262 period1 money53048. Six work receipts total58000. 31 purchases at5000 after pre-loop, approaching fixed 32 cap. The earlier run had nonWorkFunds100000 and 11 purchases. If positive non-work deltas exceed pre-loop total + 160000, test's fixed cap cannot prove the strict threshold; this is a mathematically established test limitation, not proven root of historical C62 fail. Do not loosen funds proof, inject money, or choose RNG. Historical failures remain.

## D42–D45 stable ID100 failure
Exact D45 64af1d22d18b5971c62dddc9955c037372600ee5 / 5664b686ad0caedfd0628dfd76fa95a51470ed1d. Test L75 writes copied Perl c.input + canonical nextid and wholesaleCsv. Probe L164 initial numeric 79 zeros, L173 DataRead, L193–199 copies Perl JSON data; inc-func L249 splits wholesale CSV into strings. Codec parseWorldWholesaleLine returns numeric 79 cells; sparseWire L63 compares strict numeric equality against world.wholesale. Static hypothesis: second round raw Perl strings not normalized in test adapter. No runtime guard relaxation. C workflow pins:
- modern/tests/r4-source-two-shop-play.test.mjs f4f1151515edefeccf0367596a0807aa95451e57
- modern/tests/original-perl/original-r4-data-write-files-probe.pl efd6e604ac697644cb84c2c449ea1af96012f1d7
- modern/src/original-r4-period-play-file.mjs 15a818fcfd4572d30837884946e3b64e0711db75
- modern/src/world-wholesale-codec.mjs 2714020cb3fb2d555062cbbaa1c42a8601e2bb50
- modern/tests/original-perl/inc-func.cgi e7a8add7b0291901e71fe797783b664dff1568a0
Run unchanged test first; independent copy only adds validation/conversion from original input array, type counts (no personal info), preserves actual raw wire bytes and all original assertions, adds negative mismatch guard. If further errors surface keep them. Static anchor checked before commit; remote pending. D notification https://github.com/Prysline/akimono/pull/27#issuecomment-7225088931.

## B nine dedicated jobs independently read
B 6adc0c7, exact same actual fe4bcc222e71d5c4a1fabbbd72905b10199873b9 / aeef3aee5f73923bf2a779b17b6f8b5cffce9d93, run46033918606. All zero failures/skips: guild-peer 140624393351 Perl106/JS26; fiscal real 140624393672 JS3; joint controlled 140624393706 JS3; browser 140624393779 JS4; lord guard 140624393821 JS4; fiscal controlled 140624393850 JS136+1; cow 140624393867 JS1 (336 opportunities, 1 death 4 cows rev278->283); dragon source 140624393967 Perl52; rebel 140624394149 JS5+17+4. Dedicated controlled sources not upgraded into formal player or D integration. General B run already C64 verified. No local full checkout/test; CI remotely executed. No user decision needed.
