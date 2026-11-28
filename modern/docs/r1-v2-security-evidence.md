# R1 v2 安全性證據覆核（未結案）

正式 base `08fdd3b31ff130e66d0337360430fda3d73fdc8d`，以下五份為既有 63 分類的逐檔重新覆核，不增加 233 分母或有效數。完整讀取測試、兩 helper、v2 store/history/checkpoint source；來源與入口固定 blob SHA。原基線 CI 45727603147 已通過，但新候選尚無完整結果。

## p3-v2-two-checkpoint-rotations.test.mjs

- 測試 blob: `0bf1624b7416406d827bd2abdabb08833fc3d7c2`；受控 HTTP/CAS + v2 重啟；真初始時鐘=false
- 來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`
- 執行入口: `modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/src/local-world-save-store.mjs` @ `df8429f40065882f2c1482c63e0e2163b6acb7d0`；`modern/src/reviewed-world-time-history.mjs` @ `b6cd1f7dff2635d12e2077237babb1a0be676d0b`；`modern/src/reviewed-history-checkpoint-store.mjs` @ `ed1b8167d739523279eb1063427578e33b1ff7ca`
- Fixture: genuinePlayer default now=896401/crossPeriod=false；合法 mining/training/market/craft，260 × discard iron one
- 斷言: L7–58：每次 revision+1、now 不變、iron-1、history<=128，>=2 checkpoint rotations，第一次轉輪 gen1 重啟、gen2 exact；製品/EXP/技能與 period 保留。L61–66：rejectDamagedOldestPrefix → status unreadable / restart load/init reject / restore exact；checksum-correct latest product+1 → gen1 fallback。
- 限制: 不是跨期或真初始時鐘；oldest prefix tamper 是檔案破壞，未隔離 metadata MAC/fingerprint 個別驗證；沒有跨程序寫入證明。

## p3-v2-cross-period-long-history.test.mjs

- 測試 blob: `28afacafe4483317ff309cf9b66080809c9e2a1f`；受控 HTTP/CAS + v2 重啟；真初始時鐘=false
- 來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`
- 執行入口: `modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/src/local-world-save-store.mjs` @ `df8429f40065882f2c1482c63e0e2163b6acb7d0`；`modern/src/reviewed-world-time-history.mjs` @ `b6cd1f7dff2635d12e2077237babb1a0be676d0b`；`modern/src/reviewed-history-checkpoint-store.mjs` @ `ed1b8167d739523279eb1063427578e33b1ff7ca`
- Fixture: genuinePlayer default fixed now=896401,crossPeriod=true；合法取得、鑄造、展示、兩次結算；260 × discard iron
- 斷言: L12–53：37 次內到結算，play.cgi previous bytes、lasttime mtime、dateupdate=1、EXP decay、排行、sale/pay/tax yesterday、maintenance/cash、profitstock、city tax、item history、prize grant/discard、population。L57–105：gen1 exact、260 ops revision/time/stock/count、>=2 rotations、續作 EXP、第二次 settlement、gen2 exact、前代 disk lineage、偽造 product+1 回退。
- 限制: 固定初始時鐘；單店單架，沒有原版多店／全部外部 IO；只偽造一種製品，非獨立 HMAC/key/trace 負例。

## p4-dairy-death-and-save-security.test.mjs

- 測試 blob: `18dd2835d4c96e7065c5cae267aeed8fdb37730d`；HTTP/CAS；真初始時鐘=true
- 來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`
- 執行入口: `modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/src/local-world-save-store.mjs` @ `df8429f40065882f2c1482c63e0e2163b6acb7d0`；`modern/src/reviewed-world-time-history.mjs` @ `b6cd1f7dff2635d12e2077237babb1a0be676d0b`；`modern/src/reviewed-history-checkpoint-store.mjs` @ `ed1b8167d739523279eb1063427578e33b1ff7ca`
- Fixture: now:null,crossPeriod:true；合法市場、券、牛與牧場；30×16 有界 RNG opportunities，另 fresh proof 雙代
- 斷言: 死亡路徑：牛2 market+3 voucher→cow job，yield/death/EXP/time/draw count，死亡後先 save/restart、足量奶仍 NEED 拒絕、合法補牛→優格→再存。若 480 opportunities 無死牛明確 t.skip。fresh 路徑：合法 count clipping、action-time deny、anchor=fresh；獨立 stock 25/26/35/36、EXP、job、history pop、RNG sample、v1 format、bad checksum；restore:true each fallback + bytes not overwritten。
- 限制: 死亡 case 不能從檔名推成必定觀察；fresh replay 不是 HMAC checkpoint。deny helper 比 world/history，非磁碟 hash 或 RNG calls。基線 CI skip=0 是該次，候選未驗。

## p4-dairy-v2-player-http.test.mjs

- 測試 blob: `80def541842276dbd4d9dacda3d626bc93a5c5db`；HTTP/CAS；真初始時鐘=true
- 來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`
- 執行入口: `modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/src/local-world-save-store.mjs` @ `df8429f40065882f2c1482c63e0e2163b6acb7d0`；`modern/src/reviewed-world-time-history.mjs` @ `b6cd1f7dff2635d12e2077237babb1a0be676d0b`；`modern/src/reviewed-history-checkpoint-store.mjs` @ `ed1b8167d739523279eb1063427578e33b1ff7ca`；`modern/tests/support/p4-dairy-proof.mjs` @ `52dc93bf36212062bbc9989bd272344c3c7e5322`
- Fixture: now:null,crossPeriod:true；實際 market 2 cow、合法券/排行獎、10 cow；129×合法 milk discard 強制 checkpoint
- 斷言: 七 USE（25/0,25/1,26/0,26/1,26/2,35/0,36/0），NEED 4/5/9/10 cows、milk/death/EXP/time/draw、career、rank 1/10/30、4 商品自然販售、原版 maintenance、purchase/settlement 帳本；gen1/2 exact；129 ops checkpoint、inspectDairyCheckpoint 32-byte key、outer digest/record HMAC、每 segment metadata HMAC/fingerprint/origin/anchor SHA/revision/prefix SHA 至 fresh；stale save、newest prefix damage、checkpointAuth/mac/sourceFingerprint/prefixSha256 四個獨立變體、複合資產偽造，older fallback。
- 限制: 讀取 key 僅測試內獨立驗算；攻擊者無 key 的邊界；metadata 變體重算 SHA 但未重簽 outer HMAC，因此證明整體拒絕，不單獨證明每個內層檢查的觸發。非分散式或斷電驗收。

## p5-book-work-v2-player-http.test.mjs

- 測試 blob: `97a9b57a8f51f72643f363d3bc21370323428be9`；HTTP/CAS；真初始時鐘=true
- 來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`
- 執行入口: `modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/src/local-world-save-store.mjs` @ `df8429f40065882f2c1482c63e0e2163b6acb7d0`；`modern/src/reviewed-world-time-history.mjs` @ `b6cd1f7dff2635d12e2077237babb1a0be676d0b`；`modern/src/reviewed-history-checkpoint-store.mjs` @ `ed1b8167d739523279eb1063427578e33b1ff7ca`；`modern/tests/support/p4-dairy-proof.mjs` @ `52dc93bf36212062bbc9989bd272344c3c7e5322`
- Fixture: now:null,crossPeriod:true；無注入；零價 #13、合法 #78/12、#8/#10 買/丟、work funds 上界；fresh 與 checkpoint 分案
- 斷言: #13 zero price、600s、limit1、whole street cap；illegal prices/shelf/extra/unknown #63/#999/stale/negative count 等拒絕；work 3000/10000、normal/peddle cost、clipping、no RNG/stock/EXP change、兩 inline logs；work-funded purchase 保守 totalPaid>nonWorkFunds；129 legal discards+兩代 v2、history command keys/count/order、獨立 HMAC/prefix verification；stale gen、newest prefix damage、checkpointAuth/mac/fingerprint/prefix、money、v1 fallback；另 fresh no checkpointAuth/segments0、cash/book/price/useId/bad hash 獨立篡改。
- 限制: 拒絕 helper 比 world/history/checkpoint，不獨立量測所有 disk/ RNG；metadata mutations outer HMAC 同時失效，非 inner isolation；未涵蓋全部 USE/ITEM/EVENT。

## 安全契約對照與尚缺項目

| 契約 | 已有固定基線的證據 | 不得宣稱／補件 |
|---|---|---|
| fresh replay, hash, v1 | P4 fresh、P5 fresh、P3 mixed formal v1 refusal | 不將舊 v1 14 組 forgery 算入 v2；新補件測 unknown command/invalid EVENT/trace/shape/size |
| checkpoint HMAC / fingerprint | P4/P5 inspectDairyCheckpoint 獨立驗算正向；outer/inner fields 破壞後 fallback | 內層個別檢查需隔離 outer auth；不測真 key compromise |
| retained prefix | P3 two rotations oldest damage；P4/P5 newest damage | 破壞 oldest 時拒 load/init，newest 時回退；未宣稱所有失敗的暫存檔不變 |
| generations | P3/P4/P5 two saves/restarts、stale generation | 新測 wrong slot parity、all invalid fail-closed；競爭測試另候選待 CI |
| lineage | source verifies worldId/revision/prefix；P3 two crossing generations | 正式兩個各自可 replay 的分叉 lineage 獨立對照未做；legacy prefix 對照不代替 v2 |
| time/EVENT replay | P3 crossing receipts、P4/P5 reviewed ticks | 新測 fresh proof eventOrder、after digest 及未知 event；完整 25 EVENT 矩陣待補 |
| atomicity | source fsync/rename/readback，候選 HTTP snapshot | 不證明多程序、斷電、失敗後所有 staging 副作用；R1-HTTP-01 仍獨立未跑 |


## R1 checkpoint 內層隔離負例（待 CI）
新增 `r1-v2-inner-checkpoint.test.mjs`：真時鐘 genuinePlayer 合法礦石、130 次丟棄形成 checkpoint、兩代保存；僅在負向 case 讀取隔離測試目錄 key 重簽外層，必要時重簽 metadata，使 outer HMAC 通過，對 inner MAC、sourceFingerprint、interpreter、hashPolicy、drawPolicy、generation、anchor revision、origin 八個變體逐一 `verifyChain` 指定拒絕原因，再實際 HTTP load 由舊代復原、確認不覆寫 forged bytes，恢復原始檔後重啟 exact。白箱僅驗防禦分層，不表示玩家能存取 key，也不宣稱 key compromise 下安全；既有 P4/P5 無 key 攻擊證據仍保留。此測試尚未執行。

## 已確認 checkpoint 內層隔離 CI
[45794612974](https://github.com/Prysline/akimono/actions/runs/45794612974) job 139821957733，HEAD `f7a2c520d9a17fe66a6b08ec02073f61bdf3a1f8`、實際 checkout `0493bf2b80b4bd0677bccb92a00af91eb84a6c72` tree `1e66142f265ff0af160c3176b5107f09b6399f77` 相同。JS 1343/1343、0 fail/skip/cancelled，Perl 85 檔 2456/2456，所有 DSL/pin steps 成功。subtest 737 通過，八條 R1_INNER_GUARD 診斷逐一核對：inner MAC、fingerprint、interpreter、hash policy、draw policy、generation、anchor revision、origin；外層驗證先通過，再獨立指定原因及 HTTP 回退。P4 256 opportunities 觀察1 death、4 cows、rev216→221。僅固定前候選結果，新 HEAD 需重驗。R1-HTTP-01 獨立 strict repro 尚未執行；本機重新測 Git DNS 仍無法解析。
