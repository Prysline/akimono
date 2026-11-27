# C62 — exact CI and independent lifecycle/source boundaries (2026-11-27 UTC+8)

Parent C61 92d8c8688d7a79c0a51abbcf62b62065392d49d8 / 1b43aa19f5749bd9a230f7bea3c4bc4377c644d2. C only. No change to original gameplay, source/runtime, prior assertions, A/B/D branches, formal base, shared workflows or authority. R0 233/R1 220 are audit indices, not completion percentages.

## Full original CI logs and actual Git trees

Actual checkouts extracted from runner log, Git commit API checked against each corresponding candidate tree (D26–D28 candidate Git API independently fetched; other rows match exact prior C or B/A/D handoffs). JS cancelled0 throughout; skip explicit. Perl not run on failed JS.

| Candidate | Run/job | Actual checkout | Tree | JS | Perl |
|---|---|---|---|---|---|
| C61 92d8c86 |46022551678/140585595628|ef23b6f34d921f9f5cdad1a23a9b97a121e05198|1b43aa19f5749bd9a230f7bea3c4bc4377c644d2|1350/1350|2456/2456|
| D26 cd0bd41 |46022295540/140584718086|bd034c31f2239d8a64895cfb205079dfddcf19f5|1c3b95d28d28202446ef1506f5de38af5498e379|1410/1411 skip1 cow|2756/2756|
| D27 03c88fc |46022449523/140585248824|410d767a4fbfd8bece2ecbb7e59066a68d7672d7|139610c9792c4480ab3d2aba43722c24c6396444|1414/1414|2756/2756|
| D28 aef09c7 |46022605439/140585775036|1cecb36b4182039bb2e08aad51881d008312940c|6650d83ab5165b92915e9caa09ce14f46a1d9a5f|1414/1415 fail1|not run|
| D29 801fb36 |46023078866/140587402598|9d41437f05b9a0af4aac23a9e471e2d112f063ff|0cc93557e7a9a8ec54eec5859270afebc792f1a3|1417/1418 fail1|not run|
| B 2a42111 |45974983629/140424360228|ae419efd96a249d0ddc92338949138a1c3f8efae|375c41a9e6bf33ef4215757681a1d3cba3c90da8|1693/1694 skip1|3181/3181|
| B ff716ef |45975763982/140426958152|aaf27711ec347e440f5afc117f33a1b99770dc81|14a9c8b3b709931d1f1250e5eea2838f2b4baf3b|1696/1696|3273/3273|
| B f9f4ef5 |45975976928/140427676293|db3b69e20384b1bc9973cfcd55772d5eaf834fe7|04f1056cec042a8fec825c5c55baee5a0d7f72a6|1698/1699 skip1|3273/3273|
| B a9f7b36 |45976122240/140428160088|287f9ff2d9ea4f39a7196e98ddda14a71809dc84|ac3b69f85ee545a6f608c4c25f65bc53d2295be5|1699/1699|3273/3273|
| B 97a8249 |45981244757/140445389743|359bcb3b26c18b1bc6b232c0be94ac18aad7dddb|bfb568fc2ffc07ca4739ffbc1b57cd5e34e5ac07|1704/1705 skip1|3273/3273|
| B 2f4d283 |45981610966/140446637703|d739cfe38a7cb5ab8512bc9d8547780c558e4b0b|f376833b5c1c00bfe6d5a1eafda8b134338b60b0|1705/1708 fail3|not run|
| B d5fe00c |46022153702/140584229452|35fa464f9e528a2bd2b12a5dc9ead7edea11d6ab|b7661c4053ec6d42648097f449bef45f0a1cfa36|1711/1711|3273/3273|
| B 4415c29 |46022490817/140585385334|5ac41a8a8f2ddae4c1a7f31f366b9613583fbb5c|5a1b408de6a5bdac829610747fb76e872fb8d0e6|1713/1713|3273/3273|

Run URL https://github.com/Prysline/akimono/actions/runs/{run}/job/{job}. B guild ledger failures 1057/1058/1059 numeric string wire comparison, B 2818a3c formal repair already green in C61; historical failures retained. B request tests ok1343–1345 and later 1345–1347, postal ok1102/1103, actual source fixture comparison (not formal shared WorldState). D26/27 source FUNCNEW six old failures remain passed. D29 original library source and HTTP test ok1010/1011, but whole candidate not green.

## C61 historical candidate reruns

Run46022551694:
- A28 b099a743110b70cc6e497d3b72fa7a6e291645cf/tree ffcb0bf7c8f2b6885c081f9d8637da59367a9db9 job140585595850 original1/1, isolated observation1/1, zero fail/skip/cancel; pins verified. rev57 shelf[40,0,0,0], #40=92, clock1795867114, money57239, saleToday20400. +2400 seconds rev58 #40=88, money62039, saleToday25200, remaining2443. Four requests #40/#57/#45/#51 per120 all COMMITTED rev59–62, remaining43, final shelf[40,57,45,51]. Lower than120 still valid. Original out-of-stock not reproduced; not proof of the sole historical cause. Artifact15210866517 sha256:8ad07f502913867c381ec6b3803ca26fb840ad9a920d6623835446244f7fc24c.
- A26 04772ca4ea25cdbf4b343db1e75b28795a5af8ed/tree77b08a4a04a9c40bc7690ac27147181289645d27 job140585596432 original1/1, observation1/1; 52 observations. n12/j0 money50182, requirement57000, after paid work n12/j1 money60182. Historical j20 not reproduced; no root claim. Artifact15209136528 sha256:0a372cfc70a42f0e44001c4849c333e77ce470ea2b80cfd0de8316539d8b0fd5.
- Artifacts metadata read, ZIP not downloaded. A29 strategy revision and A30 pending. Historical failed worlds not overwritten or seed-selected.

C61 general cow actual 224 opportunities/1 death/4 cows/revision195→200. Dedicated run46022551585: D13 independent strict job140585595939 3/3; C58 Nayuta job140585596301 original1/1 + observation1/1, historic boundary rejection not reproduced; B lifecycle historical job140585596361 original231/237 fail6 + regex-only237/237, historic red retained; P5 job140585596467 original2/2/observation1/1, proof nonwork100000 paid104824 minimum4824 rev216 period1 money52841 six work receipts61000. C55 strict historical red job140585596386 metadata failure; prior exact D13 repair evidence remains scoped.

## D28/D29 oracle defect

Actual Perl compile failure nmy @list before source comparison in voluntary-close test L90; D28/D29 not ok954/955. Exact test blob 08bb7c4d5c5e6f56a4042ee85762c7d23bb432cd, source DataRead e7a8add7b0291901e71fe797783b664dff1568a0, runtime a88638b32a97fc56d375dbe8c6aaddcd2f054279. Execute exact test script-builder fragment in V8: double escaped newline split selects 1789-character source segment instead of a single line, join yields literal backslash-n; four backslashes before %DT also over-escaped. Correct by one escaping layer in two affected lines, matching earlier existing natural-sale test. Source correct line @DT{qw(itemyesterday itemtoday exp)}=map{{split(/,/,$_)}}@list[3,4,5];. Actual local Node22.16/Perl5.40.1 executed extracted corrected oracle and native runtime Perl program bodies with no sales, original D domain seeds for revisions12/13/14: 0x4315244b3ba4f924c901b9f92112924f, 0xb5872aebe929a2b2503b3491ea5c206a, 0x6bdcd79f38e6842fddfee65deddd911a. Exact four map wire strings equal at all three seeds; separately malformed newline minimized repro exit255 with nmy. This is isolated source fragment evidence, not full D test pass. Container git ls-remote DNS failure; no local full checkout. D owns formal correction. D29 library checks passed independently but same unrelated red retained.

## Additional source boundary audit: request board and letter identity

B exact request module 84c3ec56edfc9977324154cc3fc3bbb9eb2ec127 and test 6ec166c701ab5b1e168757076dc7989e17f5ec1b. req-s e2fb94dd67755b274d1706de6e2f28087dc121cb, inc-req 29de51b7b519fcfcfbd0810a3c180e7357374d34, list dc0f5308e49bfab09e2dc70efed26070ded7d390, detail b4f509eb0066f03b1b3132f802c4a72cd53ec051. Original plus rejects only when fulfiller mode resolves to active id2idx; original normal detail ReqLast opens fulfill for other shops when absent; original owner list routes nonzero mode to thank even if fulfiller is absent. Expiry tm<NOW undef row (no refund in reader). These are source observations, not a request to redesign escrow or invent close cascades. New controlled differential will model active row absent (not actual player close) and expiry equality/after. B cash reward source unassigned global id is separately covered by existing oracle; do not infer new requester payment.

B exact letter module 5f5e4b1c813700fa2944b15b982b7ae8f31ead83 and test 1ebe7e045c602e7bb4f4c0bc26a2b6b8514bd92a. Original pinned-plug-letter.cgi 53c33a03bfa8023b259ddb822d6ae238c6e1fee4 SearchLetterName(no==1) identifies parcel notice; pinned-inc-letter.cgi 89a5f523c47d9a4c6659a91ebf310dfac662af07 marks fromid1 read as deletion; edit a0ac79de67a027fc915bba2d1af9cd7031c76c45 uses DT.id as sender. B normal fixture uses IDs100/101. D29 dev-local f67dc55751519f60a72559a6d41c8e3c1f7c3e1e L467 and other routes use local shopId1; independent disk ee51be4f1733d110dd7b7e3bf4f73d6f02007633 L47 writes nextid100; original new.cgi 9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7 L64 assigns DTnextid. Directly treating existing local player ID1 as original sender would classify ordinary mail as parcel notice and delete it upon reading. Integration namespace hazard, not present D HTTP bug; no postal runtime connected. D must preserve stable actor/history/save/source identity and reserved system sender without inventing new gameplay. New controlled fixture compares ordinary100 vs hypothetical ID1 sender with actual source read/write; not claim ID1 is original normal registration.

## C-only new CI and coordination
New .github/workflows/c-audit-lifecycle-source-boundaries.yml pinned historical D28 and B4415 exact trees/test/module blobs. Execute untouched original full test file first; separate temporary copy fixes only D test escaping (two lines, all assertions retained) or appends controlled B cases (all original lines retained). Actual V8 ran transformation on exact fetched files and checked D two lines and B original prefix plus new snippet syntax; full workflow tests pending. Original D historical failure remains red. No direct writes to other work windows, no test state into public runtime, no selected RNG, no new source rules. Controlled fixtures do not prove actual D multi-store lifecycle/HTTP/CAS.

A notification https://github.com/Prysline/akimono/pull/22#issuecomment-7222462006
D oracle notification https://github.com/Prysline/akimono/pull/27#issuecomment-7222461220
D identity notification https://github.com/Prysline/akimono/pull/27#issuecomment-7222495140
B source notification https://github.com/Prysline/akimono/pull/18#issuecomment-7222495998

Latest read A30 84433535d489fe0afe86cc202ff67f7003980445/tree4056ca67befa38005ba48041e85c6926a786ea8d run46022623222 in_progress; B 0d802c0755f06269ac1739ee4157f8783e8db365/tree07d91166399c8617a94dc9cbe01267586edbdca7 general46023337733/R4 46023337751 in_progress; D29 801fb3646f8a3ee9a884ddb4b8e73509b79ce2e8/tree0cc93557e7a9a8ec54eec5859270afebc792f1a3 historical red. D27 source planner only, D28 archive hash helper only, D29 read-only library. R5 actual same-world authority not ready; no fake integration. No new user policy decision; D already authorized to coordinate stable identity. If cross-version save migration/destructive operation later requires user policy, raise then, not preemptively.
