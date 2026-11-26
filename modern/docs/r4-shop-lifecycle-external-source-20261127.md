# LC-B2 external lifecycle source audit (2026-11-27 UTC+8)

Source authority: katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365.
B starting head 28d5c37fac650f90d5330b13a7096cbe634ec4fb, tree 5a71c45af92d741a039679c0086cceedb594b215; D ownership at b034925d3c2ac4fdeabcae6239c56c3e3206a884.

## Read source, not an invented cascade

- membership user.cgi restart clears the shop hash except id/name/shopname/pass/icon, invokes FUNCNEW, deletes matching local subdata, logs, writes local play. cls calls existing CloseShop and clears cookies; write.cgi CloseShop archives, zeroes status/money/rank and selects subdata. Neither invokes a common-file cleanup or Army/DragonBalance.
- write.cgi DataCommitOrAbort only publishes local TEMP_DIR files; common files have a distinct CoDataCA boundary (pinned-colock.cgi). Do not equate staged common rows to publication.
- Guild: shop guild and user data cleared on restart; closing active row omitted. External guild config/role/ledger remains. pinned-guild.cgi ReadGuildData reads raw ledger; pinned-guildsub.cgi MakeGuildFile removes memberships for dissolved guilds, not for lifecycle alone. inc-gd.cgi normal role actions require shop guild as well as street+ID. Full leader succession/period effects remain to be checked; no synthetic fee or forced dissolution.
- Army (plug/army.cgi): ReadArmy imports raw counts, filters RIOT by active local id2idx; WriteArmy deletes inactive and zero counts. A restarted same ID can still have external counts/riot; closed ID filtered on the later reader/writer, not at close.
- Dragon (plug/drreada,b,c.cgi): local inactive stable/jock/ranch/parent slots become undef on read but their indexes were assigned before filtering; other-town same owner ID unaffected. ReadDragon does not apply that inactive filter, ReadRace just decodes race rows. Writers omit unnamed rows; later staging/publication is not an automatic cascade. Full race/training and inactive recipient policy remain separate.
- Invitation (gd-m.cgi ReadEntry): expires only tm < NOW_TIME on read; no active-owner filter. inc-gd-entry.cgi join matches both town and id and consumes matching invitations; restart preserves ID, close removes active actor. New ID does not inherit by name. Full join/expiry/write and cross-street player chain still pending.
- inc-period.cgi DragonBalance consumes only drapay-MYDIR, skips absent local id2idx, adds signed amount to active dragon accumulator, then unlinks source payout. Restart can still receive pending valid payment; closed owner not recreated; other street file remains. Actual end-of-period ledger/CAS integration belongs to D; no new fee or settlement policy.

## Evidence

Extend existing controlled two-owner original handler/compiler/wire oracle, no new runtime. Hash-pin nine already present source files; preserve existing assertions. Synthetic external rows include local ID, active peer and other street same ID, future/expired invites, local/other payouts. Check raw bytes unchanged immediately after both lifecycle commands, then separately call true readers and staged writers, local Army publication and DragonBalance. Opaque guild role file tests byte preservation only, not config parsing or leader succession. Common writer staging tested, not CoDataCA publication. Existing archive/log trace boundaries retained; no formal player evidence.

New tests not yet executed: full CI pending; local Git unavailable (DNS). Source audit reviewed; controlled oracle candidate pending; formal integration not connected; player acceptance not tested. No frozen source edits or changed balance.
