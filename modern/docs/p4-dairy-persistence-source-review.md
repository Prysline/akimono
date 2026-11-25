# P4 #25／#26 酪農與乳製品持久化來源審閱（2026-11-26）
 
狀態：**候選、尚未驗收**。正式 migration 開工 HEAD `8a10b5b5b860e55e62b8d41d03e6d58c430dacf6`；與 #17 merge `3b927866b4749aad3ffc583a9cf12bf3fb9eb783` 相較僅 14 個 Markdown 路徑。#19 CI 45577439072 成功。只改 P4 所需 modern/tests、modern/docs；不合併 R4 研究，不改凍結 Perl/DSL、main、固定 refs 或正式玩家引擎。新測試尚須目標 PR exact HEAD、checkout tree 和完整 CI。
 
## P4-A 固定來源
 
- [custom/inc-item-data.cgi](https://github.com/Prysline/akimono/blob/8a10b5b5b860e55e62b8d41d03e6d58c430dacf6/custom/inc-item-data.cgi#L2271)，blob `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`。DEFINE NewShopMoney=100000、NewShopTime=43200、#63×1、#79×5；ItemUseTimeRate=0.5、job_cow_time_rate=1.5。
- #25 (2271)：price 10000, cost 1000, limit 20/1.5, plus 1d, pop 1d。兩項 USE 2h、EXP 1%，先依有效次數及持有牛數抽產量，再 AddItem(26)，每次抽死亡（level²/1000），UseItem(25)，原版回報、WriteLog，再共用 EXP。保留 2500 牛乳上限、死亡上限與實際回報區別。
- #26 (2329)：price 200, cost 50, limit 2500/0, pop 30m, point 15%。/0 飲用 3m，count<10 增加 int(rand(count+1))+count、上限10000；10..29 不改人氣；>=30 扣 count*2、下限0，公開日誌。/1 72m、NEED 5、USE 15 milk、GET 2 yogurt；/2 144m、NEED 10、USE 15 milk、GET 1 cheese。NEED 不消耗。
- #35 (2400)：price 3000, cost 100, limit 300/0, pop 6h，/0 食用 10m、USE 1、無 GET。#36 (2422)：price 6000, cost 200, limit 150/0, pop 10h，/0 食用 20m、USE 1、無 GET。
- #78 (2529) price 10000, limit 1, plus 1h；/11 酪農家、來源 EXP 轉移，不重做 P2。#79 (2717) /4 一張換一頭牛。合法市場購買必須先於禮券換牛；第 8–10 頭及以上以真原版期末排名第一獎勵禮券取得。
- 凍結 inc-turn.cgi blob `b8a4980275f475a952846a8d6072fad45f8dff50`：自然販售後計算持有 cost（有存貨上架品 1/10 維持費）、按 timespan/86400 累計，ITEM callback → SortDT → 期末（若有）→ PLUS → EVENT。period.cgi blob `6183e88e9dd69a16606a1064c8084e9a1411dbd5` 期末 int(costtoday)+showcase cost 扣款、costyesterday，清空 costtoday。PLUS 來源與人口、MAX_USER、時間片相關，不能保證立即有牛。_config.cgi MAX_USER=50。
 
## 既有證據與缺口矩陣
 
| USE | 原版差分／GameCore（基線） | 既有 HTTP | 現行 v2 P4 候選／缺口 |
|---|---|---|---|
| 25/0 | r2-dairy-inline-source；非死亡／死亡、EXP、時間 | legacy 5 牛 | 真時鐘、合法換牛、兩代重啟候選；真死亡不保證 |
| 25/1 | 同上，level 2 | legacy 5 牛 | 同上；來源禮券補牛候選 |
| 26/0 | 三段 rank／上下限／日誌 | legacy 少量 | 三段實際消耗與 rank 候選 |
| 26/1 | r2-declarative-use-effects；5 牛、NEED、職業 | legacy 成功 | 4 牛拒絕、5 牛製造、重啟續作候選 |
| 26/2 | 同上，10 牛、NEED、職業 | legacy 拒絕 | 9 牛拒絕、真 10 牛正向、重啟續作候選 |
| 35/0 | 同上，無 GET | legacy 食用 | 重啟後食用、自然販售候選 |
| 36/0 | 同上，無 GET | 未找到 legacy 正向 | 真食用、自然販售、重啟續作候選 |
 
r2-dairy-true-player-http、r2-career-true-player-http、p2-career-persistence-http 都啟動 legacy-dev-local，固定鐘或測試亂數；不可當成現行 v2 玩家驗收。P3 的 p3-pre-event-inventory 有四種乳品持有/販售 Oracle（fixture），不是合法取得。reviewed-dairy-inline-uses、original-inline-dairy-callback-model、standard-street-module、original-use-transaction-model 已接共用來源；original-b41-playable-sale 的 P3_TURN_IDS/costs/rules 已涵蓋 25/26/35/36 和 cow EXP/job；不新增並行 registry。
 
新增差分：r2-dairy-inline-source 裁切有效時間/材料次數、2499/2500 牛乳及死亡，r2-declarative-use-effects 四/九頭與十四瓶精確門檻。受控 fixture 只用於原版差分。
 
## P4-B～D 正式玩家候選
 
`tests/p4-dairy-v2-player-http.test.mjs` 重用 `tests/support/p3-genuine-v2-player.mjs`；新 opt-in now:null 明確刪除固定鐘環境變數，保留原 P3 helper 預設。每次從新臨時 save dir 啟動正式 scripts/dev-local.mjs，cross-period opt-in，使用實際 market offer、伺服器 RNG、CAS、/api/advance-reviewed-time，沒有 /api/supply、注入金錢/牛/牛乳/EXP/時鐘。原版起始 100000 G 可支付兩頭牛與指南共 30000 G；實際供貨、報價、維持費與餘額須由 CI 觀察，不能把理論當實測。
 
候選流程：市場先購兩頭→禮券補至四牛→擠奶→優格 NEED 拒絕→第五牛→起司 NEED 拒絕→市場 #78→轉職→優格→初始及期末真獎勵禮券補至九牛→起司拒絕→第十牛→起司→第一代存讀→食用、三段飲用、續製→四種牛／乳品自然販售及禮券補牛→合法產乳及 129 個普通 discard 以促成 checkpoint→第二代存讀→續用。每次採乳以真結果檢查牛、乳、EXP、時間、有效次數、亂數呼叫數，若發生死亡按實際禮券與來源期末獎勵補牛並輸出實際次數；不要求低機率一定發生。空架時的持有維持費按來源成本總和及時間比對。完整 WorldState 重啟比較包含資金、人氣、銷售、職業、revision 等。checkpoint 以 historyCheckpointRevision 推進與實際 save/load 驗證；偽造乳品、牛、EXP、職業的寫檔只用於負面備援回復，非正向取得。
 
## P4-E 與尚未完成項目
 
- 候選包含非法 count、過期 revision、客戶端 RNG 拒絕、缺 cow/milk、舊 generation、組合資產偽造與備援。現行 v2 歷史、HMAC、前綴、磁碟、v1 拒絕等既有 P3/R4 回歸必須重新跑完整 CI；未新增 dairyProof，未改任何 runtime。
- 真 HTTP 死亡若此次 server RNG 無命中，仍是明確缺口；Oracle 不等於玩家死亡保存。即使命中，也需確認死亡發生在已保存歷史、重啟後合法補牛、有效次數與日誌，而不是只見總數。#25 實際自然販售已加入候選（來源 fixture 已有），尚須 CI。獨立資金/庫存上限、行動時間不足、死亡後低於門檻、各種單獨偽造與 HMAC/retained prefix 乳品專項負面仍待逐項驗收。若合法市場預算、時間、未審閱 EVENT 或其他邊界阻塞，保持 fail-closed，不放寬來源。
- 本機無法 clone：DNS 無法解析 github.com。提交經 GitHub connector；本地未執行 Node/Perl，不聲稱本輪已通過。以 Draft PR 的實際 CI、exact HEAD、merge tree/source blob/DSL 審計及測試日誌為準。
- 保持單店單架完整時間、明確 opt-in 跨期；不進入 P5、不接管 R4。不具合併授權前不合併。

## 2026-11-26 續作：市場總量與期末獎勵

- 凍結 `modern/tests/original-perl/whole.cgi:50–74` blob `778badaf157326bcfd1f8fa1e310d94f94995eb3`：CheckWholeStore 先合計所有店內持有，再用 int(wslimit*shopcount+0.99) 限制持有+批發。#25 在單店為 2；持有 2 頭以上即市場歸零。20 是個人持有上限，不能在已有五頭時等待市場補牛。增加 `p3-pre-event-inventory.test.mjs` 八個持有量 fixture，直接差分凍結 Perl PLUS/CheckWholeStore。
- 凍結 DSL 3200–3292 @@FUNCUPDATE：rank-one 九個選項，其中五項獎勵 5/4/3/2/1 張 #79，其餘為機器人及慶祝用品。正式受控跨期已接 `original-period-top-prize.mjs`；玩家從實際 reviewed time 結算取得獎勵，沒有新 API、固定 RNG 或假庫存。先購兩牛+五張初始禮券+至少三張真獎勵，期間靠合法產乳自然販售維持營業。
- 實際舊候選 CI [45651554594](https://github.com/Prysline/akimono/actions/runs/45651554594)，HEAD 12c0e1771fd52d8438e8df3d562a80e3e79a1762：1320/1321 JS，唯一失敗在持有五牛後等待市場補貨，長時間無交易觸發原版店主不在 closure fail-closed。Perl/後續 SHA 步驟未執行。修正的是玩家取得路徑，不是原版關店閘門。
- 新獨立 `p4-dairy-death-and-save-security.test.mjs`：5 牛、預留合法禮券、酪農家、最多 480 次有效高等擠奶；若 server RNG 命中死亡，先保存死亡狀態並重啟，再隔離 5 牛 NEED 拒絕、真禮券補牛、製造優格及第二代重啟。若無死亡命中，明確 skip 並輸出實際機會數，**不是死亡驗收成功**。另一短路徑從 fresh v2 單獨偽造四種資產、EXP、job、history、RNG、v1 與錯誤 checksum，拒絕最新槽、回復舊槽、不覆寫。只在負面測試還原原本真實 save bytes。
- 新候選仍待 exact HEAD 的完整目標 PR CI。不可把上述測試程式或舊成功數字當成本輪正向玩家證據。

- P4 補充市場 cash/持有上限/負行動時間/錯誤報價的受控負面 CAS fixture（非正向玩家資產），及正式 HTTP market receipt 逐欄斷言。第二代實際 save bytes 只讀檢查 outer SHA、HMAC、每個 checkpoint HMAC、source fingerprint、retained prefix digest/revision/origin；負面破壞最新 retained prefix 及獨立 checkpoint metadata，驗證上一代回復且不得覆寫，之後只還原原始真實 bytes。完整執行仍以 exact HEAD CI 為準。
