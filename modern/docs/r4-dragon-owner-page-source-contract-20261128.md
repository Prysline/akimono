# R4 arena owner pages — source contract for B/D/F (2026-11-28)

Source review only. Parent B HEAD 90513578681edecbabbe145654d9c0f90ff5630c, tree 4ce64744f86eb659bb2a3187dc58b5f71024955d. This document neither registers a route nor completes a projection, enables transactions, publishes state or constitutes player acceptance.

## Exact frozen source and scope

Upstream katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365; reviewed exact upstream blobs:

| Path | Git blob SHA-1 |
|---|---|
| slime.cgi | 2eccc7ccc5bc493596b51542509c0244795abdd0 |
| slime-s.cgi | 458c594aebb933486531c6234e846cae9e98e29f |
| inc-dragon-stable.cgi | bcc6f2fd82cb16c5c67c8b20f1b89365f8ec96d7 |
| inc-dragon-ranch.cgi | 9880bcc094ff347f4f12b42076c62ac461a59a08 |
| inc-dragon-detail.cgi | 9a551012de3a3f380288010fe402a14e6ce096c0 |
| inc-dragon-pr.cgi | 6dd166a653715e3aa24bb303dff399b0299012b1 |
| inc-dragon.cgi | 76bb00f247733630cbcc374a82f693638f653b71 |
| plug/drreada.cgi | 01110533ae1a223f687f13b02f0aaeebd30c3155 |
| plug/drreadb.cgi | 1b13a1a855490c80c88b0fa117676c68b6440753 |
| locale/zh_TW.po | a512f6887cee214e66828769a382ad2b18bcd5b3 |

The original slime menu order is info, rd (default), rd code=1, then ranch/stable/jock only for non-guests. Detail/pr links belong to ranch, not to the public slime-l mode allowlist. slime performs due-phase maintenance before dispatch; do not make private read projection a second phase or publication authority. slime-s takes common lock, reads street data, checks player authentication, loads dragon configuration and submits the selected handler, then unlocks. Do not reproduce dynamic RequireFile dispatch or forward USERPASSURL/USERPASSFORM. D must bind a trusted current actor and street, active shop IDs, revision-consistent canonical read snapshot and clock. Private read token must be process-local and separate from public review token. Missing/ambiguous detail target must fail closed (the original unchecked hash index can otherwise alias the first slot); no new game balance policy.

Readers: ReadStable/ReadJock/ReadRanch retain raw slot count and ID map, blank stale same-street owner slots after recording the ID, leave foreign rows untouched and use the last valid matching local owner for MYST/MYJK/MYRC. ReadRanch computes aprize=int(prize/(now-birth+1)*86400*2) before stale filtering. ReadDragon does not stale-filter; MYDR contains matching street+owner rows in file order. ReadParent blanks stale local rows, MYPR contains own females only, file order. No sorting/pagination in these owner tables. Preserve raw holes versus visible records; never turn a blank slot into an actionable ID. Record raw blank options separately where original loops visit them, not valid modern action choices.

## stable: source projection and existing actions

No own stable: trainer (ドラゴン調教師, slime3), explanatory message; show stedit/new only when scalar @ST < STmax=10, including orphan slots in count; otherwise full message. Form emp (six EMPHA indices 0..5), name (SIZE=20), submit establishment; source advice 500000 establishment, minimum daily 100000, policy cannot be changed, cap10. Do not use cash to hide this form.

Own stable: one summary row in order name, EMPHA, tr/con/wt grades VALUE[int(x/100*6)], sp/sr/ag/pw/hl/fl facility EVALUE indices, four wins (g1/g2/g3/sd), maintenance=sum(six levels)*100000, expiry= birth+50d-now (positive GetTime2found else わずか; label あと %1). Then StableDragon table all DR rows matching stable number in file order, regardless of dragon owner/street: name+image, age, sex, condition EVALUE[int(con/100*4)], weight, prize+万, four wins. This is source boarding-list visibility, not dragon ownership or permission to act; do not reveal extra raw fields.

FormLarge: n=int((now-birth)/86400/2)+1; hide form only if n < sum(six levels). Equality permits form; source offers all six lar options 0..5 even when selected facility already at level3 (the transaction rejects that selection). Form shows cost 500000, maintenance warning and deposit-income warning. No new UI affordability/level prefilter replacing the source behavior.

## ranch

No own ranch: teacher (ドラゴン老師, slime1), rcedit/new form name SIZE=20, establishment 1000000 and additional breeding expense advice; no cash-based visibility check. Own ranch summary: name, founding age, aprize+万, prize+万, four wins. MYDR table in source order: name+image links to slime/detail/dr, age, sex, sp/sr/ag/pw grades, con grade, weight, aptitude, prize, four wins; empty message when none. MYPR (only own female parents) section if nonempty: name+old image links to slime/pr/dr, age, hr/sp/sr/ag/pw/hl/fl grades, aptitude, prize, four wins. No parent section when none. Purchase form only MYDR count <3, fields fm=0/1, dist=0/1/2, name SIZE=20, source cost500000, cap3, full-width Katakana10 advice. Existing purchase source contract retains effective 6–20 Unicode characters and CheckNGName, not new Katakana restriction.

## detail

Target dragon by exact ID and same street+owner; reject absent, ambiguous or unauthorized. Summary order name+image, age, sex, color, stable name (original scans ST in file order; last matching row wins), running style, aptitude+km, prize+万, four wins, race status. GetRaceStrate ordered comparisons: sr>ag*3 and sr>80 ->0; sr>ag*1.2 ->1; ag>sr*3 and ag>80 ->3; ag>sr*1.2 ->2; else 4. GetRaceApt uses original truncation and 1200/3200 endpoints.

Ability section sp/sr/ag/pw/hl/fl (base=point-up, acquired=up, remainder=100-point; omit zero-width original segments); con (cap upper 100 only, EVALUE[int(con/100*4)]), wt (fill=(wt-40)*5; rank=max(0,3-abs(int((wt-50)/2))), source ton label), gr (cap upper100, percentage without condition label). Represent as structured values/segment keys, never HTML; do not silently clamp raw source measurements to different gameplay values. F may safely render invalid CSS widths without changing authoritative values.

Only when race<2: ent if scalar @ST (including raw holes, valid selectable stable IDs only in modern action binding); torace always, rcode 0/1, jock 0 followed by JK rows with race<=1 in original file order, str 0..3 (not 自在 index4); retire only age strictly >10d, check text field SIZE=10 expected retire, prize>=300 advisory breeding threshold. Do not change source registration drawing, capacity or actual race eligibility based on advisory text.

## pr

Target female parent by exact ID, current street and owner. Reject male/absent/ambiguous/foreign/other-owner detail. Summary name+old image, age, color, running style, aptitude+km, prize (literal 万), four wins, last birth GetTime2FormatTime(preg). Ability rows hr/sp/sr/ag/pw/hl/fl, each base width=value and remainder=100-value, omit zero-width segments. FormPreg only when original male option text is nonempty and now-preg strictly >3d. Male options from all PR rows with false fm in file order (including foreign males; blank raw slots are not actionable IDs). Fields dr (target), name SIZE=20, pr (male ID). The source form does NOT hide at own racing dragon cap3; the operation rejects. Original advises Hiragana10 and stud fee, but approved normal-flow producer contract retains actual name rules and no payment or WritePayLog in breeding; do not introduce fee or a new rule. Keep raw UI/handler equality discrepancies in source tests.

## D action mapping, not a second transaction registry

All forms original key=slime-s, bk=slime; keep mode/code/field descriptors, do not include credentials or client clock/RNG/cost/owner assertions. Existing B module exports observed at parent:

| Original form | User fields (plus target ID where applicable) | Existing candidate |
|---|---|---|
| stedit/new | emp,name | original-r4-dragon-facility-producer.mjs / projectDragonFacility |
| stedit/large | lar | same |
| rcedit/new | name | original-r4-dragon-ranch-producer.mjs / projectDragonRanchNew |
| dredit/new | fm,dist,name | original-r4-dragon-purchase.mjs / projectDragonPurchase |
| dredit/ent | dr,ent | original-r4-dragon-entry.mjs / projectDragonEntry |
| dredit/torace | dr,rcode,jock,str | same |
| predit/retire | dr,check | original-r4-dragon-parent.mjs / projectDragonParent |
| predit/preg | dr,name,pr | same |
| jkedit/new | existing jockey form | facility producer; owner view candidate not on branch |

Translate field names to reviewed producer contracts in D, not arbitrary dispatch. B files already implement source transaction candidates; do not duplicate them. A current ref 69106427122828263d3a18e85ae876e21e4602a3 and D 6440e6b371881be102e21eac0c0552d167d7ef7c source-tree filename inventory showed no owner-page projection module; D has dragon balance and log rotation. This is a targeted file inventory, not proof of every route's absence or full registry audit.

## F locale and assets

Use source keys and original translation layering; core zh_TW actual entries include 牧場→牧場, 厩舎→龍房, 騎手→騎師, ドラゴン老師→飼龍師, ドラゴン調教師→馴龍師, 厩舎設立→開設小屋, 厩舎増築→擴建小屋, 厩舎預託→託付小屋, 牧場設立→開設牧場, 所有競争竜→擁有賽龍, 所有繁殖%1竜→擁有繁殖%1龍, 入厩中の竜→在小屋的龍, ドラゴン購入→購買龍, レース出走登録→參加比賽, 能力の詳細→詳細能力, 種付け→配種, 遺伝力→遺傳力, 脚質→腿的質量, 距離適性→距離能力, 前回の出産→上次生產. Core locale alone is not proof of effective layered locale. Source GetTagImgDra uses dragon + (fm+1+(old?2:0)) + (color+1) + IMAGE_EXT; teacher keys slime1/slime3 via GetTagImgKao; bar b.gif/r.gif/t.gif, height12. Image keys/source geometry only, not claim asset presence, rights or modern asset availability. F owns actual safe UI/rendering; D owns trusted API. Never insert source HTML directly.

## Required next tests and status

Actual handler + readers + original time/dragon/config helpers in isolated files, extract rows, option order, labels, image keys and bar segments; test empty/full/stale slots, same numeric owner different streets, last valid owner, foreign boarders, cap3, age thresholds n/sum and 10d/3d equality +/-1, race 1/2, no/all stable/jockey options, invalid/cross-owner/male IDs, missing ID integrity and raw holes. Source shell/locale/clock adapters must be explicit; include source drift and no arbitrary dispatch. D supplies official authenticated current snapshot, CAS mutation with existing producers and v2; F renders. No test execution for this document.

Prior B jockey candidate remains unsaved on branch: module blob 8c2d7f84b17ec3b46ef5715909ca82f126ae4707 readable; oracle 45d78f30703340fdc2d423f302c0f817870258d9, test 61e67f8f05e13cd63c9a6f882a34506326531363, pin c44c99613f637b704bac7b9dd71907bc330536c1 not found in Prysline repository blob lookup. Old attachment akimono-b-owner-jockey-tested-candidate.zip not located in current sandbox or accessible file search; its recorded SHA256 is eacd8d2a913298d3122eb9ec655ead5c9de2c816440fc990832d1b54df858121. Original upstream pin availability does not establish old complete package. Do not reconstruct around prior connector refusal, publish partial code, or call it committed. Separate stable/ranch/detail/pr source work continues without overwriting that candidate.
