# R4 新基線接續：來源證據入場（2026-11-25）

正式基線 migration/standard-street-s1@3b927866b4749aad3ffc583a9cf12bf3fb9eb783，tree ce360d4fceab1fe862fb2ae747a57565822979cc，PR #17 目標 CI 45492647525 JS1317/1317、Perl2456/2456（85 .t）。P3 原驗收 b60c2078a2c63db71490980f0b113b3907d6d483。舊 R4 d2dccdacb83925b6f0121bd7311f92be2e18d2da、研究 #16 6664d60af29b4974f9386bf5c97ce09cdd477637 僅供選擇性證據來源，不是合併父 commit。凍結原版 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。這一入場 commit 只增加來源證據及文件，零 runtime 改動、零舊檔覆蓋。

## 入場狀態

- 選擇 #16 的 25 個 Perl/文件 blob（其中公會設立修正版 test/md 是候選，舊 CI 45484109364 失敗2項；研究重測 45576804253 尚未確認），另取 #1 中新版未含的 5 個原版軍隊/外部共同事件 Perl blob 與 3 個歷史研究文件。所有共用原版 helper 已核對 blob；custom/inc-palace.cgi、custom/inc-rebel-data.cgi、_config.cgi 完全相同。
- 歷史文件含當時的 Node adapter、舊 v1 fail-closed 及未完成工作敘述；不視為新基線現況，不因文件提及而宣稱相應 runtime 已移植。未帶入舊原版 army JS adapter、external joint/rebel disk JS 差分與研究 peer-buy JS test；待讀新基線契約、確認依賴與重新獨立驗證後再移入/改寫。
- 不覆蓋 P3 的 v2 存讀唯一入口、歷史 checkpoint/replay/HMAC、共享交易/EXP/USE/製作、普通1–8架、明示 opt-in 單店單架跨期。未開放公會/龍族/軍隊/領主/閉店/多店外部玩家功能。
- 公會原版缺列行為：首次 EditGuildMoney 未保留在全域 hash，需區分缺列與空列重讀。新測試尚須在本基線 CI 實際通過。保留原版資料、不修改原版。
- 此 PR 第一階段是建立新共同基線及重新驗收證據，不等於正式 R4 功能完成。後續先審閱新基線交易與持久化邊界，再適配原版外部檔案/軍隊最小範圍，禁止直接合併 #1/#16 或覆蓋共用系統。移店、關店原版研究仍可獨立進行。
- 不改 migration/main/Notion、凍結來源、P3 舊分支，亦不合併 PR。CI 以實際 checkout tree 及最終 SHA 為準。

## 精確來源清單

| 路徑 | Git blob | 來源 |
|---|---|---|
| `modern/docs/r4-dragon-pay-producer-contract.md` | `6aac6e3077d1e1604376d01196ea589366713a10` | #16 |
| `modern/docs/r4-guild-dragon-transaction-research-20261125.md` | `3d6ed0fce853cf883270be994f99325332869d33` | #16 |
| `modern/docs/r4-guild-peer-dragon-failure-research.md` | `dd1735a7a3201d7fe1efb621f9b056c7d667bb74` | #16 |
| `modern/docs/r4-original-army-lord-guild-commands.md` | `8632fab57b847149473bb7b28441c9d4d709e906` | #16 |
| `modern/docs/r4-original-guild-establishment.md` | `ebcab74dd2f352c1d6ed9c54330852d75c7c9803` | #16 |
| `modern/docs/r4-original-palace-guild-membership.md` | `3b39919dd6d56728973a473b7a0bb06580e031d7` | #16 |
| `modern/tests/original-perl/original-r4-command-source.t` | `97e8d8ad563add2432c4bfcf3de1c44e46b23141` | #16 |
| `modern/tests/original-perl/original-r4-dragon-pay-producer.t` | `f876609fa2fae95744ce03e62ee0be1113959b31` | #16 |
| `modern/tests/original-perl/original-r4-dragon-payout-failure.t` | `6f4a963ff511a95596db87a6d17b25f3e3e4d942` | #16 |
| `modern/tests/original-perl/original-r4-guild-establishment.t` | `cf05813f7ba58f29063504a8f154cd6b8e8e04f2` | #16 |
| `modern/tests/original-perl/original-r4-guild-peer-buy-probe.pl` | `652de60bd0bd1eea52be31683afa6b3252a59bf5` | #16 |
| `modern/tests/original-perl/original-r4-guild-peer-buy.t` | `da21b43d87523f51a0de3dc90c89f0e0b1f2e761` | #16 |
| `modern/tests/original-perl/original-r4-guild-trade-edge.t` | `e9e769bda1d9db487b556848df9f4bbf3aad38d8` | #16 |
| `modern/tests/original-perl/original-r4-palace-guild-membership.t` | `6cf32eebf3326598228bded88670c78ddeee6a0a` | #16 |
| `modern/tests/original-perl/pinned-army-s.cgi` | `6f457b78f530e37aa0ff4074358a57797f5087e2` | #16 |
| `modern/tests/original-perl/pinned-colock.cgi` | `99ff12db08135879e1a570cef1424f6dd5bec151` | #16 |
| `modern/tests/original-perl/pinned-drlog.cgi` | `e60cda027c87de25585ee59bf64a4cb24b9d1476` | #16 |
| `modern/tests/original-perl/pinned-gd-b.cgi` | `712cacab0ce4accdff2f6fc6ff4b5cb71f1678c5` | #16 |
| `modern/tests/original-perl/pinned-gd-e.cgi` | `5580c540934d04316ea4f37f9ea80aa213f2d628` | #16 |
| `modern/tests/original-perl/pinned-gd-m.cgi` | `b18dd3166709e270e5cb2d525ce404bca80551ca` | #16 |
| `modern/tests/original-perl/pinned-gd-s.cgi` | `2b743fdab85b897ba6a621f100df656f884ab29b` | #16 |
| `modern/tests/original-perl/pinned-inc-gd-entry.cgi` | `f28cdcc1778534cbf1c84195df7ab749519be5a6` | #16 |
| `modern/tests/original-perl/pinned-lord-s.cgi` | `8754dabf130a521aa243fc0568910d5f52523362` | #16 |
| `modern/tests/original-perl/pinned-membership-user.cgi` | `8e817c535d4cd17e68d65f0e2f67846a344b5094` | #16 |
| `modern/tests/original-perl/pinned-palace-s.cgi` | `f3a918d6fcffd435e478dce53b812a89c1429ef2` | #16 |
| `modern/tests/original-perl/original-r4-external-joint-probe.pl` | `c0dbe4c77b970249d5d50c0e7d0b11208c6f8365` | #1 |
| `modern/tests/original-perl/original-r4-external-joint.t` | `c05a2434734445c7d386ea6a3d93b66dd3d314b0` | #1 |
| `modern/tests/original-perl/original-r4-rebel-army-disk-probe.pl` | `58face5ee9d09ae3db07344d9159e0196cdaea1d` | #1 |
| `modern/tests/original-perl/original-r4-rebel-army-disk.t` | `8e3e5e09492415dde7314b87d57f35d923535584` | #1 |
| `modern/tests/original-perl/pinned-army.cgi` | `cd29bcbfe52bac84794c4c79426bd559d7616d85` | #1 |
| `modern/docs/r4-army-town-file-persistence-contract.md` | `999fe770784b42e372946874b98843977d3e5ea6` | #1 |
| `modern/docs/r4-external-file-effects-contract.md` | `72fa9276c70f7320f9e0472f917cfb8e6e806e88` | #1 |
| `modern/docs/r4-guild-file-persistence-contract.md` | `f6e12ccc664c7a8d574350f1aab2d10adfd98860` | #1 |
