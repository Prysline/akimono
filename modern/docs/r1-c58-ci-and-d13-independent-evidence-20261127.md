# C batch 58 — CI evidence and D13 independent reproduction (2026-11-27 UTC+8)

Parent C57 43b3f2cea54d6857beb8b44ed8d8ae2abacf899b / 4e4d095570d0e3855f72bd3c11686d8b2a1ecb6e. R0 233/233 and R1 220/220 are audit scope, not implementation completion. No runtime, source, probability, existing assertion or shared workflow changes. Only C diagnostic job and this evidence note. All historical failures remain.

## Actual checkout trees and job logs
| Candidate | run / job | actual checkout | tree | result |
|---|---|---|---|---|
| C57 | 45876322369 / 140104204682 | 54224124f435c681d7d42a7456d1d1d441a193ec | 4e4d095570d0e3855f72bd3c11686d8b2a1ecb6e | JS 1350/1350, zero fail/skip/cancel, Perl 2456/2456 |
| D12 f10b17c5d1d47a95c43d0c694fa5b3f05d60cb1a | 45876054947 / 140103292422 | 3c6f2432f66c27138969ca97214289d7ab6d96ea | 50c33926d084a76f5624035d8c8be2730ddd473a | JS 1354/1355, no skip, strict 4/4 passed; D9 #63 B41 sale boundary rejected, Perl not run |
| D13 ffeba863c06dbeb8ae3521897320e0f057f0878e | 45876508111 / 140104822024 | fc8e7960a7ce8f75ccaeaaa522a5af6b74cd1ad4 | 1a6a8912da4c354150bd4dd75743dcc2979cff82 | JS 1356/1356, zero fail/skip/cancel, Perl 2456/2456; strict 728–731 all pass |
| A a1e0accc37dbbe0a5d4dea2964537fc1828acb59 | 45876189999 / 140103752562 | 6ff39c299e807b749cb1b42e91171a9c1568ba3f | cc1455b5d07633e0e1dd5f4e7e01a75b0e5eee53 | JS 1554/1555, no skip, UI regex failure 201 at local-original-ui-layout.test.mjs:297; Perl not run |
| A dfcc3f61e98c58b6830f5c986ea198e89c7d7083 | 45878241397 / 140110701564 | c5b814738238f432133e25e97cfe8af35c06aa6f | 8cfb9b5197be92ffe4e1d448e82a9a84cccd5e3c | JS 1560/1561, no skip; #24 appraiser/peddle FUNCINIT HTTP log prefix assertion 1092; Perl not run |
| B 3b8a89bfcb84466ba6787ca772b2637bb0fee0ed | 45876205416 / 140103807104 | 71e27285b47feb4b2ef393789342eebfb6747e01 | 570574b19d23a361521b90b1753437874dc27d06 | JS 1674/1674, zero fail/skip/cancel, Perl 2929/2929 |
| B ef9fc9b11bed0e6247cf092907241eca00f996cc | 45876582391 / 140105068234 | f425a15570ccf98dd2dc652cc4ff6a30a2b50840 | 033653430927c6450f069fee1a3474a3796da997 | JS 1677/1677, zero fail/skip/cancel, Perl 2929/2929 |

Actual checkout commit tree verified through Git commit API. CI job links use https://github.com/Prysline/akimono/actions/runs/{run}/job/{job}. D12 and D13 source strict test blob 73a041a4277de0dffb39d8d3de23308645b42b16, first three tests equal C strict after import/header normalization; helper D13 blob 19244d0b636e393a2f7a26fcd033fe78e0c3d003 also clears D9 market env and adds raw transport. D13 is positive candidate-level integration evidence, not a formal baseline merge. Separate C independent job added: two exact checkouts, original test and helper copied only into ephemeral D13 test overlay; no runtime changes, hashes checked, cleanup and exit preserved. No independent result yet.

## Historical P5
45876322515 / 140104205389 pinned e4771dc5c21663509777e6c351436f05732ed105 / 44de9a170cf71cbc75c137b06215d2626411017a. Original file 2/2 pass, independent observation copy 1/1 pass, both zero fail/skip. Revision 147 tick: 114063 -> 214063, upper bound 100000 -> 200000, paid 43924. Before final purchase proof paid 49836 for non-#10 purchases; 31 x 5000 reaches 204836; proof min work-funded 4836; revision 264 money 53151, six works 61000. This demonstrates 100000 additional non-work funds can occur and a single such increase is still within the original 32-purchase budget in this run. Not proof of historical batch-50 root cause; original failure remains unresolved. Artifact 15146082532 metadata digest sha256:1d20f60865c84cc176bae100e8fcb33e3e6c43abf8fe19bbfee5dbb65ddeeb63; ZIP not inspected. Historical strict rerun job 140104205876 pinned C55: 0/3, fail 3, no skip; artifact 15145753489. Do not treat known historical strict red as new D13 failure.

## B specialist verification
Older 45876205436: seven jobs success, guard and browser failure. Both failed in prerequisite genuine rebel point/cash budget (not a demonstrated guard/browser runtime failure): guard job 140103808071 1/2 pass, period 47, maxPoint 20536, final point 10161; browser job 140103807911 0/1, period 44, maxPoint 20376, final point 8021. Old evidence retained. New 45876582390: all nine job statuses success, actual logs independently read for guard 140105069200 4/4 and browser 140105069122 4/4 (prerequisite passed), cow 140105068971 1/1 (no skip), checkout f425a15570ccf98dd2dc652cc4ff6a30a2b50840. Remaining six specialist logs not yet individually reviewed. B new race closure is source candidate, no D formal publication claim.

## Next
Read C independent D13 job result; report A latest log assertion to A for source/runtime vs stale expected text classification; inspect B remaining six job logs and new dragon source diffs. R5 integrated acceptance not begun; no independent final release or merge decision. P5 historical failure not overwritten; no artificial world/seed or probability changes. No user decision needed.
