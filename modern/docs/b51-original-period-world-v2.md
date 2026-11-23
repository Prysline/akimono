# B-51｜來源城市／期別資料正式進入可存檔 WorldState（尚未跨期）

> 2026-11-21：這是 B-50「同來源商店／城市連續兩個期末」驗證後的**玩家世界資料結構整合**。B-51 有實際瀏覽器初始城市顯示、GameCore CAS 保留、B-43 磁碟儲存及 Node 重啟載入；**尚未實作真正原版 36h 跨期命令**，不得把期別資料的存在宣稱成已完成期末結算。

## 實際玩家路徑

1. 使用 `cd modern && npm run dev:local`，打開 `http://127.0.0.1:4173`。**只綁定本機 127.0.0.1**。
2. 按「初始化世界」建立來源 `akimono.memory-world.v2`，此時 City/Period 由固定管理員初始化程式與固定 Core 產生。頁面顯示 **來源城市資料：初始人口500,000、發展5001、治安5001；已完成決算：0期（跨期尚未開放）**，沒有顯示任何假的期末成果。
3. 使用既有同一頁的真開店、來源 59 PLUS 供貨、批發市場商品#10 進貨、展示架#10、自然販售及重複進貨。所有 GameCore → StreetModule 的現有 CAS 操作都保留同一份 `period` 初始資料，不會擅自幫玩家結算或增加城市人口。
4. 「儲存世界」將目前來源商店、市場及 `period` 一起寫入 B-43 雙世代磁碟存檔。完全停止 Node 再重啟，「載入存檔」後，世界的版本、商店、金錢、庫存、供貨、時鐘與**城市資料**仍相同。未按儲存的新變更仍會遺失。
5. B-43 建立的 `akimono.memory-world.v1` 舊格式可讀、可存、可繼續原本受審核的真營業操作；畫面會標記「舊版世界（無期別城市資料）」。**不自動把舊存檔猜測成新版城市或偷加欄位**。只有從來源重新建立的 v2 世界才含有此城市資料。

## 來源資料與嚴格型別

[GameCore v1/v2 契約](../src/game-core-contract.mjs) 不編造任何街道規則。v1 世界仍精確8欄；v2 世界增加第9欄 `period`。CAS 不允許跨 schema 偷降級，並完整保留單一 revision 和原時鐘。

[原版來源初始化與語義校驗](../src/original-period-world-seed.mjs)：固定 `inc-admin-func.cgi` 初始城市、`inc-func.cgi::@STATEnamelist` 十一欄原版順序、`period.cgi` 城市處理區段，配合固定 `inc-turn.cgi` / `_config.cgi` 的每期36小時與 JST 9h − 日期修正6h = **實際 +3h** 期界時鐘。初始化資料只有：

- `source: standard-street-original-period-bootstrap.v1`
- `state: bootstrap-only-no-period-turn`
- `periodSeconds: 129600`，`clockShiftSeconds: 10800`
- `settledCount: 0`、`lastSettledBoundarySeconds: null`
- `dtPeople: 500000`
- `town: {leader:0,money:0,in:0,out:0,develop:5001,devem:0,safety:5001,safem:0,army:0,robina:2000,robinb:0}`
- `eventState: null`（尚未可來源合法載入完整事件表，**非**「沒有原版事件」）

[本機持久化模組](../src/local-world-save-store.mjs) 在讀取／保存 v2 時必須驗證上述來源初始值；若有人偽造 `settledCount>0`、來源城市發展值、EVENT 或期別時間，**必須拒絕保存、載入**，不能被視為完整結算。保留 B-43 原來雙世代 SHA256 校驗、原子替換、未存變更不持久化與 Windows 目錄 fsync 限制。

## 回歸與限制

[獨立 B-51 原版城市／GameCore／雙世代存檔測試](../tests/b51-source-city-period-world.test.mjs) 以及加強後的 [B-43 真 HTTP 殺 Node／重啟續售 E2E](../tests/b43-durable-world-save.test.mjs) 驗證 v2 與舊 v1 相容。

**尚未完成：** B-50 同一間商店和城市連續兩個來源原版期末的純階段，目前設 `nonCommittable:true`；需要將 B-44～B-50 的正確時序、原版 EVENT 真實回呼、FUNCTURN／FUNCSALE、原版人口／獎勵／商店帳務／59 PLUS 及必要持久化語義，實作成**一次且僅一次**的 WorldState CAS 跨期，並完成跨界、存檔、重啟後繼續真經營的 HTTP E2E。來源 EVENT 資料缺失時必須明確阻擋跨期，不得將 `eventState:null` 當作事件全都未發生。未完成前**玩家端仍拒絕任何跨越36小時的操作**；不要增加假期末按鈕。

正式驗收仍依使用者要求：只在同一繁中介面完成「開店→真進貨→合法上架→自然販售→真跨期決算→存檔重啟→續營」後，集中人工驗收。原版 Core CGI／DSL、`main`、`migration/standard-street-s1` 不動，PR #1 保持 Draft 未合併。

## 2026-11-23｜GameCore v2 正式期別／時鐘變更另須通過 R4 原版時鐘閘門

B-51 起始期別和 B-43 雙世代存檔已能持久化來源城市，但**不代表已授權結算**。新增 `original-r4-world-transition-gate.mjs` 經 Standard Street 的 `reviewPeriodTransition` 餵入 GameCore：當來源 v2 世界的時鐘或 `period` 變化，必須先取得原版 36 小時／+3 小時及 B-51／B-59～61 合法期別的審閱許可；跨界結算、假城市、`settledCount>0` 與 `nonCommittable` 來源片段在 CAS 前拒絕。

這是**正式命令進入記憶體 CAS 前**的拒絕契約，並不等於通用 `createMemoryWorldAdapter.compareAndSwap` 已可安全處理任意自訂 caller，或原版真 Guild/Army/Session/Backup 文件副作用已轉成完整 durable 原子提交。現有 B-51 玩家介面仍不得提供假期末完成按鈕；B-43 磁碟仍按來源初始期別或現行三種單 EVENT 狀態嚴格拒絕非審核 settled world。
