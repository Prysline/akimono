# C 第57批：R1 HTTP 已實證、歷史 P5 紅燈及 exact CI 補核

使用者已確認驗證一向使用 GitHub CI。本機 DNS 不再視作阻擋，不另建本機測試環境。此文件取代第55批當時的未實跑狀態，不抹除歷史。無遊戲 runtime、凍結原版、原測試斷言或共用 workflow 修改。

## R1-HTTP-01
固定被測第55批 HEAD 630e98795ef957272e49c8a7cabb5c6f1ce992b2 / tree ede2b15cfcdb0077b026c2a25b2386a84eefd003。CI [45873580066/job 140094903740](https://github.com/Prysline/akimono/actions/runs/45873580066/job/140094903740) exact checkout、clean tree、strict blob e43339680eda08d30ebc9a5c70f56635361ace12、harness 0aa7dc6127e94bece6d43fa778ccf2fd7f3a2016 均核對成功。Node22.23.5、Perl5.40.1、git2.56.1、Linux X64。原指令 node --test scripts/r1-http-extra-fields-repro.mjs；exit1，0/3 pass，3 fail，無 skip/cancel。合法對照皆成立。
| 路由 | 預期 | 實測副作用 |
|---|---|---|
| initialize | 4xx/false、不建立世界 | 200 COMMITTED/true，revision null→1，disk 0→12 files |
| open-shop | 4xx/false、不建立店 | 200 COMMITTED/true，revision 1→2，正常 shopId 1/money100000，disk 12→24 files |
| load | 4xx/false、不載入 | 200 LOADED/true，revision null→2，generation1，25 files hash map 不變 |

已確認額外欄位拒絕契約缺陷，非證實資產、他店或外部世界注入。固定候選證據，不推及所有分支。原始 stdout/stderr、exit/env [artifact 15143791536](https://github.com/Prysline/akimono/actions/runs/45873580066/artifacts/15143791536)，SHA256 410cf97c82fe4f40344019040e6dc7350722d13edc7f16d0f3ebe0c796b81496，到期2026-12-26；已讀原始 job logs，未下載 ZIP，connector 長行部分 JSON escape 不可解析，抽取獨立 before/after disk hash map 與明確欄位。已 [回報 D #27](https://github.com/Prysline/akimono/pull/27#issuecomment-7200470212)，D 最新當時 980b62a0e1d1a6a6e6310a2b458823e8fe2972fd 靜態查閱 dev-local blob 8f6167b413ad772006553ae538e601811745d5eb L257/375/411/435，未見各自拒絕；不是 D tree 實跑。由 D 修復、C 重驗，不阻無依賴功能。

## 一般 CI：第50–56批 actual checkout/tree
每一列已核對原始日誌，actual checkout tree 與該候選 tree 相同。第50批此前已實讀，後六批本輪補核。所有成功列 source pins/DSL/Perl PASS；50 在 npm test failure 後未跑 Perl/pins。跳過皆為 bounded cow mortality 未命中，不算通過或產品缺陷。
| 批 | 候選 HEAD | exact tree | actual checkout | run/job | JS pass/fail/skip (1350 total) | Perl |
|---|---|---|---|---|---|---|
| 50 | e4771dc5c21663509777e6c351436f05732ed105 | 44de9a170cf71cbc75c137b06215d2626411017a | b75ea1e071692ee12bf5f32a12f6e0f87b61f4ef | [45856279714/140035384424](https://github.com/Prysline/akimono/actions/runs/45856279714/job/140035384424) | 1348/1/1 | 未執行 |
| 51 | 1b5ea7b1a4fb802fd6937066ce89939919879a88 | b376709e715e313e03f6e0e346e79dab30f94acd | a2ad0ddf24ae9c5501774aaadbe40373162f9491 | [45857315261/140038977718](https://github.com/Prysline/akimono/actions/runs/45857315261/job/140038977718) | 1350/0/0 | 2456/2456 (85檔) |
| 52 | c5220eb0e31502bb91ef7ec45662f3ae04021c0c | 0e6cd005b21b614cdcbcad9633160ca49473022d | e9643354f9ceceab335f10b43ae56a3322f28576 | [45861136133/140052158415](https://github.com/Prysline/akimono/actions/runs/45861136133/job/140052158415) | 1349/0/1 | 2456/2456 (85檔) |
| 53 | cc837fbb1bfa0dbceac61e9064dd2fc8cf7fb5e0 | 2e8625418576c08fb63a34f932f89c3de70b2cd4 | bc2ce388dff3adc8fb704974d5425811472ddc7e | [45861418600/140053131515](https://github.com/Prysline/akimono/actions/runs/45861418600/job/140053131515) | 1350/0/0 | 2456/2456 (85檔) |
| 54 | 6f406e3a1ba53f66c08186bfa174108189960e98 | 0f6de9cacf0c4cabf6718b129811f3b98c98f7af | e8260836ff65e412c59737d1ec97f628862d768e | [45861727981/140054189503](https://github.com/Prysline/akimono/actions/runs/45861727981/job/140054189503) | 1349/0/1 | 2456/2456 (85檔) |
| 55 | 630e98795ef957272e49c8a7cabb5c6f1ce992b2 | ede2b15cfcdb0077b026c2a25b2386a84eefd003 | e3121ca24dcd04209d8e56de61ce88b07e05e5e2 | [45862211525/140055850815](https://github.com/Prysline/akimono/actions/runs/45862211525/job/140055850815) | 1349/0/1 | 2456/2456 (85檔) |
| 56 | 7357484d3fe2a86df2e3d629e42558504c86c037 | 6c98038fee54570e53734c1912f0855b6fab326d | d6fbb5d889a03869126360059a056a30f8bae95a | [45873580009/140094903799](https://github.com/Prysline/akimono/actions/runs/45873580009/job/140094903799) | 1350/0/0 | 2456/2456 (85檔) |

## P5 歷史資金驗收紅燈
第50批 not ok618，固定 test blob 97a9b57a8f51f72643f363d3bc21370323428be9 L195；未記錄失敗當下數值。51–56批皆相同 test/support/dev-local blob（97a9b57a8f51f72643f363d3bc21370323428be9 / 547208190d5ec6d26af293e1ed0d0ded5f649a44 / 78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9）；50→56 diff 只有11份 docs及 C workflow，無 runtime/test 變更。原成功日誌具真玩家資金下界：
| 批 | #8 實付 | #78 | #10 | 非打工上界 | 實支 | 可證最少打工支出 |
|---|---:|---:|---:|---:|---:|---:|
| 51 | 39829 | 10000 | 55000 | 100000 | 104829 | 4829 |
| 52 | 39833 | 10000 | 55000 | 100000 | 104833 | 4833 |
| 53 | 39827 | 10000 | 55000 | 100000 | 104827 | 4827 |
| 54 | 39826 | 10000 | 55000 | 100000 | 104826 | 4826 |
| 55 | 39824 | 10000 | 55000 | 100000 | 104824 | 4824 |
| 56 | 39830 | 10000 | 55000 | 100000 | 104830 | 4830 |
六次 works sum61000、均11次#10、合法支出/兩世代/重播斷言成功；不能回溯抹掉50。原始 DSL custom/inc-item-data.cgi L3084–3101：getmoney 30% start、STARTFUNC 100000、reverse DT、rand(1000)>300 skip、合法援助可增加非工作上界。B57 callback 按原版加款。原 P5 test L94–112 每次正 tick delta 納入 nonWorkFunds，L183–195 最多32筆#10、每筆5000；若多次援助使上界超過累計可支出，即使有合法打工也不能通過原證明。這是可驗證假說，不是第50批已查明根因；不能降低斷言、改援助或重選世界。C 診斷 job 新增原樣固定第50批 test 執行，另一次獨立真玩家進程只在暫時副本附加 t.diagnostic，保留原斷言與預算，保存差分/資金/事件/購買日誌，結果待 CI。不是新增正式測試或遊戲修改，不混同原樣執行與診斷副本證據。

## 外部候選初步覆核（非全量驗收）
A #22/#25 在本輪讀取 bf535fa2ea1617f71ca91b9b026138eb5526017e / 0ddff85a8bb08db55b7e813932c92810d2f8676c，後續 HEAD 持續前進。固定候選 diff 相對 a36ac866 30路徑；已實讀 shared-source-market-status 661a5e3、warehouse 3b87afd、read views HTTP bb5aa31、accessory-writing HTTP 0191f05。供需共用原公式、單店界限、唯讀；HTTP 測試 now:'896401' 是必要受控整合，非正式真時鐘。#70 list 等待已顯示商品可能售罄，需實售 receipt 等值證明，未放棄自然販售/製作/雙重 reload 斷言；新 CI 未核實，不宣告修復。A/B 完整差分與最新 CI 仍待逐項核對。
B #18 固定 9fa6b3411d19411dac174634bd2d16589c4aa0ee / 9af3d80a5e5d8e30fd88dfb6c5187755e973d8f8，較 a99d40e 新25路徑。已讀 r4-dragon-stale-stable-policy-A-20261127.md 9451acf 與 r4-dragon-training-approved-A.test.mjs 058cf9f。使用者政策 A 已記載、保留原合法效果/無效付款隔離，測試對 actual pinned Perl temp files、固定 clock/RNG、trace adapters、全狀態/ordered append bytes，輸出 noncommittable/worldStateWritten:false；不是正式共同 CAS/v2/HTTP。新 full 45875517244/R4 45875517027 查詢時 queued，不能宣告正式啟用或通過。B/D 責任不接管。R0 233/233、R1 220/220 詳細索引及正式下界不變；R5 尚未開始。
