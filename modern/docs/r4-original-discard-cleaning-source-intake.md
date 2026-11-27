# Frozen Core discard and cleaning source intake (2026-11-27)

Read-only original source reference: https://github.com/katelynn620/akimono-core/tree/738d71a2985fd088f2ca90f25145706392ee2365
Commit 738d71a2985fd088f2ca90f25145706392ee2365; tree a8a6a5f64a7faa1280cdd647bbf84083ff14e4e3. Existing pinned inc-func.cgi, plug/calc.cgi, plug/use.cgi, item-m.cgi and item-s.cgi match this source by Git blob SHA. No original rule changes.

| Upstream path | Fixture | Exact Git blob |
|---|---|---|
| inc-item-throw.cgi | modern/tests/original-perl/core-inc-item-throw.cgi | 714e623b9fd1f40ce7c51b89503d2a801330f1bb |
| item-t.cgi | modern/tests/original-perl/core-item-t.cgi | ded6d1efc44003b000e4f76562c6eb4ddcda4b29 |
| sweep.cgi | modern/tests/original-perl/core-sweep.cgi | 720d950c288c44b2ac664193a7c9e96c5a2b18d0 |
| sweep-s.cgi | modern/tests/original-perl/core-sweep-s.cgi | cecf6b31bfb231ca4b98b37082076171b1e9577c |

## Source differences to implement
- item-t.cgi calls Lock, DataRead, CheckUserPass, CheckItemNo, CheckCount. The original CheckCount (plug/calc.cgi, 586354a9a300e26d0e12a4efa512fa25760e3197) clips the selected numeric count to [0, owned] then truncates; zero rejected. t flag rejects discard; h flag is dismissal without waste/wholesale. Ordinary non-h items subtract stock, add int(standard price * effective count / 5) to trush, add effective count to the indexed wholesale slot and clip against the single-item combined store/wholesale cap. Negative wslimit denotes absolute cap, otherwise int(wslimit * shop count). Preserve sparse slot definedness, not blanket CheckWholeStore. Original logged in owner lastlogin is updated by CheckUserPass and persisted by DataWrite. Ordinary no-guild branch does not consume action time, change showcase or directly alter cash. Guild subsidy and h-related external semantics remain B/D coordination.
- Current StandardStreet discard command subtracts stock only, rejects count above owned, does not write wholesale or trush; independent disk finalize omits discard from lastlogin refresh and no source discard log. These are not full source parity.
- sweep.cgi view and sweep-s.cgi submit constitute a separate missing normal-commerce function. View displays garbage in int(trush/10000) kg and gates the form at trush >= 10000 and at least one stored hour; submit clips requested integer hours to int(GetStockTime(time)/3600), rejects zero, calculates min(GetTimeDeal(trush), count*3600) time and min(trush, count*3600/TIME_SEND_MONEY*TIME_SEND_MONEY_PLUS) garbage removed, then invokes UseTime and DataWrite/commit. Form visibility and submit gates are distinct. Verify exact original GetTimeDeal, config and integer wire representation before port.
- Frozen inc-turn.cgi b8a4980275f475a952846a8d6072fad45f8dff50 adds sale and upkeep waste and multiplies popularity loss by 0.75+trush/10000000. Existing shared-natural-sale-core has this calculation; do not redesign or reimplement it. Integrate discard/cleaning with it.
- Need controlled original Perl differential (including clipped amount, t/h flags, cap, undefined slot, zero stock, lastlogin, log/commit order), real GameCore/CAS and HTTP/v2 two-generation reload/settlement, source pin CI coordination. Test legacy separately. No player formal acceptance claim. The source-only commit is evidence intake, not a runtime implementation. Do not change checkpoint authentication to accommodate new runtime.
