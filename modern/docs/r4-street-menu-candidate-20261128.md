# R4 Standard Street menu route/activity source candidate

B/#18, 2026-11-28 UTC+8. Base 6adc0c7b971792ca225261049e42bd233572b11b, tree aeef3aee5f73923bf2a779b17b6f8b5cffce9d93. D owns formal auth/HTTP/CAS/disk and UI wiring.

## Source and interface

Frozen custom/inc-menu.cgi 53e8e64f1b3c1d0eeb67104cc3377b50996c4187, _config.cgi 87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0, pinned-time.cgi e164091d4dc6de084bb4770e0b9b4bf6005d9f3f. reviewStreetMenu checks all three complete Git blobs. projectStreetMenu consumes a server-trusted viewer classification (player/guest/admin), current actor ID for player only, canonical ordered DT projection (unique positive IDs, lastlogin, shopname), server current time, treelog mtime (0 absent), and trusted mailbox existence. Returns source-language route groups/labels/targets, short board timestamp, and mutually exclusive activity branches. No credentials, raw URLs with userpass, direct IO, authentication or commit authority. D must resolve viewer and actor from current authority; menu visibility is not permission to execute a handler. Labels are source locale keys; apply reviewed localization and safe text rendering at UI boundary.

- Guest and soldoutadmin see only the original three street links. Player has five groups, 22 links; library opens _blank. No disabled trade/move activation.
- LoginMember uses >= NOW-120, original DT order, first four shops, and appends ほか at exactly four as well as more than four. This is different from town scenery's 600-second list; do not conflate them.
- The board timestamp uses source JST, 12-hour strict threshold OR same local day, and --/-- on absent file.
- For a present mailbox (including empty content), activity is {kind:'wis',actorId}. For no mailbox it is {kind:'active',names,more,sourceText}. The existing projectWisRead remains the sole B source mailbox bytes/deletion contract; D combines it with authoritative scoped read/delete. No duplicate mailbox writer or raw HTML rendering here.
- A/D already have library/news/settlement menu; B already has shop-a/b, external functions and slime dispatcher. This package supplies only the previously missing shared route/activity/menu selection. BGM/guest home-top/skin/actual rendering and actual handler availability are outside this package; do not infer completion from links. A settlement clock and D session/HTTP remain their own packages.

## Controlled source evidence

r4-street-menu-source.test.mjs executes the original menu file and pinned GetTime2FormatTime, with isolated temporary treelog and mailbox files. Presentation/auth/settlement formatter adapters are stubs, not formal player evidence. It compares route order, labels, targets, player/guest/admin, real short format, 0–6 active shops with 120/121-second boundary, empty and nonempty mailbox branch/actual source deletion, and rejects drift/invalid actor/duplicate rows. 17 source scenarios across two tests plus one rejection test. Local Node 22.16.0 / Perl 5.40.1: 3/3, no fail/skip using exact menu and time blobs and a local extract of the three exact config assignments (test-only config pin substituted locally then restored). Full original config pin and exact published tree require remote CI. Full CI and formal D integration pending, C formal player verification separate. No original source changes.
