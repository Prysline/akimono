# R4 arena public information source candidate (B, 2026-11-28)

Source-only, noncommittable projection for original slime-l modes sche/dra/pr/rc/st/jk/rd and slime mode rd (internally named status). Not a public HTTP handler, not a new persistence or game authority.

## Source pins

Upstream katelynn620/akimono-core at 738d71a2985fd088f2ca90f25145706392ee2365. Exact UTF-8 blob SHA-1 checked by reviewDragonPublicView:
- slime-l.cgi a1f615108e614196255097c03aff13ea0f09081f
- inc-dragon-rd.cgi 9694f6c4d704382c56f66e3e9ecb09fc44a3c119
- inc-dragon.cgi 76bb00f247733630cbcc374a82f693638f653b71
- drreada.cgi 01110533ae1a223f687f13b02f0aaeebd30c3155
- drreadb.cgi 1b13a1a855490c80c88b0fa117676c68b6440753
- drreadc.cgi f363bcdab6022581976b6b99dd5e095b51f5f238
- page helper aa8b04dcec124276cb5b4eeeba650137b4449779
- time helper e164091d4dc6de084bb4770e0b9b4bf6005d9f3f
- _config.cgi 87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0

Only the two previously absent source handlers are added as frozen test fixtures. Existing helper fixtures and original source tree are unchanged.

## Contract

reviewDragonPublicView returns a process-local token; projectDragonPublicView requires it plus trusted clock, street, active shop IDs, town names, canonical source file contents, mobile flag, integer page, race code 0/1 and optional decoded dr-last times. No arbitrary handler dispatch, eval of source data, mutation, RNG, payment, persistence or network I/O. Mode status is an internal name, not a newly enabled original route.

- sche: source race definitions and their original ordering, two groups of 12, source clock labels; absent dr-last produces no clock rows and never initializes a schedule.
- dra: stable name then descending prize sorting, no stale-owner filter.
- pr: stable descending prize then sex sorting; same-street invalid owner becomes an empty source slot.
- rc: source average prize (two days) then descending sort, orphan slot retained.
- st/jk: descending four-win total; orphan slot retained.
- All five lists: raw slot count before pagination, stable ties, desktop 25/mobile 5 rows, original pg and control-copy differences, source age/grades/distance aptitude/earnings/results; missing and empty files produce no visible rows. Final record chop removes a Unicode code point even without newline.
- rd: original race order joined to current dragon records by ID, absent dragon skipped, stale owner not filtered. Only source public cells and image keys.
- status: source phase, schedule label, race metadata, weather image key, public entry snapshot cells, detail popup descriptor and original commentary text; no substitution of current dragon state for the race snapshot.

D must own authenticated read snapshots and route/identity/locale/rendering integration. Text labels are source Japanese keys/identity translations, not a replacement for the original locale dictionary. Image keys are not proof of available assets. sourceCommentary is opaque source content (may contain HTML); it must never be directly injected into a browser as trusted HTML. Resolve links, sanitize/structure commentary, map table headings and original page links in the official UI. The input contract intentionally expects canonical numeric source fields; malformed/arbitrary data compatibility is not claimed. No hidden raw ability, genetics, owner ID or internal race columns are returned.

## Evidence

Isolated Node 22.16.0 / Perl 5.40.1: node --test modern/tests/r4-dragon-public-view-source.test.mjs, 5/5 passed, zero failed/skipped/cancelled; 89 invocations of the real pinned Perl handlers/helpers across five test groups (3 schedule, 70 list, 3 detail, 12 status, 1 privacy). The oracle uses isolated temporary files, pinned original GetPage/time/dragon/read helpers, and marker stubs for the surrounding session/skin/HTML/language shell. It extracts the actual rendered rows and image keys. First run exposed an oracle schedule-heading extraction error; fixing the regex to exclude other HTML tags yielded the passing run, without changing original handlers or reducing assertions.

This is controlled source differential evidence, not a real player acceptance, production UI integration, complete local checkout or complete remote CI result. Prior full regression at B parent 74281e2d096b723fd26c37a5eb5b4a42d493b761: JS 1732/1732, Perl 3273/3273 (98 files), actual checkout tree 9b8271f96691379eea5943026756be00841191be. New commit CI must be verified separately.
