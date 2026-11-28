# R4 B private dragon detail / parent view candidate — 2026-11-28

Scope: original read-only page projection, not a new transaction, formal API, session, save authority, or production UI. B supplies this source package to D/F. Frozen upstream katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365.

## Source pins and exact tested files

- modern/src/original-r4-dragon-owner-detail-view.mjs 653b56e0fbf549ccd47db9b183d3e7b59407517b
- modern/tests/original-perl/original-r4-dragon-owner-detail-probe.pl 89002acae03fa7f50e1ecd7943713ab3a5340032
- modern/tests/r4-dragon-owner-detail-source.test.mjs ada7266aa6bc2429acbac26e3613ff96254f17a3
- modern/tests/original-perl/pinned-dragon-detail.cgi 9a551012de3a3f380288010fe402a14e6ce096c0
- modern/tests/original-perl/pinned-dragon-pr.cgi 6dd166a653715e3aa24bb303dff399b0299012b1
- Existing pinned-inc-dragon.cgi 76bb00f247733630cbcc374a82f693638f653b71; pinned-drreada.cgi 01110533ae1a223f687f13b02f0aaeebd30c3155; pinned-drreadb.cgi 1b13a1a855490c80c88b0fa117676c68b6440753; pinned-time.cgi e164091d4dc6de084bb4770e0b9b4bf6005d9f3f; _config.cgi 87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0.

## Contract for D and F

- reviewDragonOwnerDetailView(sources) verifies all seven exact source hashes and returns a process-local noncommittable token.
- projectDragonOwnerDetailView({review,mode,now,street,actorId,activeShopIds,dr,files}) accepts private detail/pr only. D supplies authenticated actor, authoritative revision-consistent time and files, valid unique active shop IDs. dr is an explicit positive target ID, not a source path. Local ownership is checked; pr requires an owned female parent. Last matching raw ID wins as in source indexing; unknown target fails closed, rather than allowing Perl undefined-index fallback. No IO, dispatch, RNG, mutations, credential fields or authority duplication.
- Return: mode, committable=false, titleKey, summary {columns,cells,imageKey}, abilityTitleKey, bars {key,segments[{imageKey,width,height}],label}, forms {route,backRoute,mode,code,hidden:{dr},titleKey,submitKey,fields,advice}. These are descriptors, not authoritative commands.
- detail: original header interpolation of $TDB出走 is an undefined variable in the exercised original handler. Actual output has nine headers and ten cells; the last cell is race state. Initial local differential failed on this, corrected projection to actual original output; original source and oracle unchanged. F may use an empty header cell for accessible layout, not silently invent original wording.
- detail bars retain exact b.gif/r.gif/t.gif raw widths and height 12; omit zero-width segments; condition/growth cap only above 100, weight formula and strategy/aptitude strict branches preserved. Negative or over-100 source widths are evidence, not trusted CSS; F must render safely without changing game stats. Age/time/weight source identity display uses locale mapping in F, including %1トン and original JST.
- detail forms: race <2, ent only when raw stable slots exist, torace always when eligible, retire only after strictly more than 10*86400 seconds. Race terms 0/1, strategy 0..3, jockey sentinel 0 and nonbusy raw slots; check=retire confirmation. Existing transaction source remains authoritative; no new costs or mutation.
- pr: source male options including foreign and orphan slots; preg form only if original option string nonempty and elapsed since last birth strictly >3*86400. Original three-dragon capacity warning does not hide the form. Preserve original name and stud-fee advisory strings as page copy; do not infer additional fee or naming rules in the transaction from advisory text.
- Local orphan slots remain visible as null/disabled option descriptors, never converted to sentinel zero or submitted. D rechecks eligibility/ownership on actual operations, F must not submit disabled options or use raw HTML. Advice key/args preserve source markup tokens for safe localized rendering, not HTML insertion. Existing dredit/ent, dredit/torace, predit/retire, predit/preg transaction implementations remain in their own authority; no new API route is released.
- Private pr is not the public slime-l pr list. Existing public mode allowlist and facility/jockey modules are unchanged by this slice.

## Evidence and limitations

Local Node v22.16.0, Perl v5.40.1, exact source bytes restored and verified. Four new tests pass, zero fail/skip; 34 successful rendered handler comparisons plus six actual bad-request cases (40 handler invocations). Includes 8 strategy boundary cases, 6 weight cases, raw negative widths, 12 race/retirement combinations, local orphan/foreign options, no stable, strict parent cooldown/capacity, missing target and authority/source drift rejection. The first differential exposed the original nine-header defect; fixed the candidate projection, not the original handler or test. Re-run of the public and recovered jockey suites with these tests: 12/12, zero failures/skips, 140 original handler invocations total. Full local git checkout unavailable (DNS); no full local regression or genuine-player claims. Existing CI and D/F integration remain separate, and C owns genuine player acceptance.

Parent commit 53a921c870b40f95bfea3b38d80505bbf5c4d8ab. Formal baseline remains 08fdd3b31ff130e66d0337360430fda3d73fdc8d. Record candidate tree/CI/actual checkout in PR #18 handoff comment.
