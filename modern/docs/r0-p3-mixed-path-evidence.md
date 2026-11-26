# R0 補審：P3 pre-EVENT 與混合 v1/v2 HTTP 路徑

固定基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。逐檔完整讀取測試（含 p3-forging 700 行）；另核對 Perl probe 與 legacy entrypoint 的模式宣告。原始來源/入口 SHA 來自固定 tree。未重新執行；有效僅指限定證據，不升格正式真時鐘玩家功能。v1 防偽與 v2 正式路徑不可合併計數。

## p3-pre-event-inventory.test.mjs

- 測試 blob: `8883b5ebd1f109582e741bb61c8effdf79c9d85a`；有效／Perl Oracle／Node 差分（受控 pre-EVENT）
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/market.cgi` @ `1aca77e9b373c25e53e445d64c101a7cc2246825`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/core-inc-item.cgi` @ `bb0244748088be0c5f1d24de7f9f7f05225278cb`
- 執行入口: `modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/original-b41-playable-sale.mjs` @ `47100f2d430e4bb7a59d49ccb3f7a07a931caf9f`；`modern/tests/original-perl/original-p3-pre-event-inventory-probe.pl` @ `7aeb8144ada9161491e7537960b41196570014c3`
- Fixture: 固定 1000000；GameCore memory world + PLUS-only draws prefix；混合庫存、EXP、job 合成 fixture 明示；Perl probe receives shop/CSV/span/draws
- 路徑: executeMemoryCommand → projectP3PreEventTurn ↔ Perl original-p3-pre-event-inventory-probe.pl
- 斷言: 實際 memory commands #79/0,#9/0,#20 buy,#79/3,#37/0,#20/0、鐵劍41與 EXP20；projectB41Sale 拒舊範圍；compare money/rank/tax/cost、item/exp/job、wholesale/sparse defined/CSV、exact consumed RNG；無 period/revision、input 不變；展示41後投影賣出；製品清單與 Nayuta70；拒 overflow、非法 stock/job、未知 EVENT、跨期/多架；牛25 cap ceil(1.5)=2、持有 0..20 的差分
- 限制: 受控時間/RNG、部分合法 memory 前綴但 PLUS-only；混合 fixture 非合法取得；無 EVENT successor/CAS 提交或 HTTP/v2；probe 僅單架 type=10 模型

## r2-career-true-player-http.test.mjs

- 測試 blob: `61c7ad402a2d58a8110c86f550167d1423e4561e`；歷史／舊 HTTP／CAS（固定時鐘/RNG）
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`
- 執行入口: `modern/tests/support/legacy-dev-local.mjs` @ `992a03097c4631ad7ee58c928942547d994724b3`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`
- Fixture: tempdir；legacy-dev-local；now=1000000 deterministic RNG=1；/api/supply 3600
- 路徑: legacy HTTP initialize/open/supply/buy/use → GameCore CAS
- 斷言: 初始化／開店，#78 初始 0→PLUS market quote→buy→#78/11 消耗指南，job=cow、EXP25=0、inline log 1；#79/4 牛1；#25/0 milk>0、EXP25=10、耗時2400、draws2；USE revision+1
- 限制: 檔名 true-player 不等於正式啟動；無 v2 或任何 save/restart；固定 RNG/time；歷史來源動作證據

## r2-dairy-true-player-http.test.mjs

- 測試 blob: `a92493eeed8e905e164d777c227f0c7b1befe37d`；歷史／舊 HTTP／CAS＋v1 recovery（固定時鐘/RNG）
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`
- 執行入口: `modern/tests/support/legacy-dev-local.mjs` @ `992a03097c4631ad7ee58c928942547d994724b3`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/tests/support/legacy-world-save-store.mjs` @ `cacbb09ecddc9c202238981b66e3cf63d417e845`；`modern/tests/support/legacy-career-save-replay.mjs` @ `62edcd02637f2b07bcdb79c6cec811f13e3c287e`
- Fixture: tempdir；legacy-dev-local；now=1000000 deterministic RNG=1；五次來源券；負向才改 disk
- 路徑: legacy HTTP/CAS → legacy save/load two generations → forged world-a.json recovery
- 斷言: 五次 #79/4：牛1..5券4..0；#25/0×3 milk8 EXP30 draws4；gen1 restart 全 world；#25/1×3 milk24 EXP60 draws4；#26/0 rank+2 capped、milk23 draws1；gen2 restart；#26/1 milk8 yogurt2 draws0；#35/0 yogurt1；#26/2 NEED 409 world unchanged；forge gen2 milk2000 重算 SHA 後回退 gen1 recoveryWarning
- 限制: 不是 v2/HMAC；舊 deterministic RNG 值不可當現行產量固定值；拒絕僅 world equality，未驗完整 RNG/history/disk snapshot

## p3-forging-persistence-http.test.mjs

- 測試 blob: `a7544f00284de393f8dee3affd86f55547dc7be3`；有效／混合：正式 HTTP/v2 固定時鐘＋歷史 v1（分段）
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/market.cgi` @ `1aca77e9b373c25e53e445d64c101a7cc2246825`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/core-inc-item.cgi` @ `bb0244748088be0c5f1d24de7f9f7f05225278cb`
- 執行入口: `modern/tests/support/legacy-dev-local.mjs` @ `992a03097c4631ad7ee58c928942547d994724b3`；`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/local-world-save-store.mjs` @ `df8429f40065882f2c1482c63e0e2163b6acb7d0`；`modern/src/reviewed-world-time-history.mjs` @ `b6cd1f7dff2635d12e2077237babb1a0be676d0b`
- Fixture: legacy boot now=1000000 RNG=1／reviewed boot now=900000 RNG=0；隔離 tempdirs；負向 disk forge；正式路徑 bounded 34 nonsettling ticks、無注入資產
- 路徑: boot(reviewedTime=false) → legacy-dev-local/v1；reviewedTime=true → scripts/dev-local.mjs → reviewed time/HTTP/CAS/v2
- 斷言: 1–370：legacy 四書20/21/22/23各合法鐵製品41/47/53/58、技能保留、EXP、NEED/非法USE/client RNG/stale rev、2 gen restart；#20 14 組 forged skill/product/EXP/job/book/material/RNG/command/cap/missing/corrupt/size/prefix fallback，prefix 移除舊 slot 可 replay 作對照；武器轉職 EXP transfer、配件雙 NEED 拒絕。371–470：正式固定時鐘配件66、雙技能、17 EVENT order、settledCount0、2 saves/restarts、proof commands、EXP拒絕。471–700：正式 v2 P1 15/0..4、EXP220→600、elixir exact cost；P2 78/11→25/0→78/0 career/restart；v1 refusal/load/init no overwrite + explicit reset→v2；四書鐵製造2 gen、#20/1 EXP200→220鋼劍42，#20/2拒絕；每成功 USE rev+1、失敗世界不變
- 限制: 固定 now，非 genuinePlayer(now:null)；兩模式不可互換，14 forged variants 屬 legacy v1、不能當 v2/HMAC 證據；非跨期、無完整拒絕 disk/history/RNG call count；不新增正式 feature flags

