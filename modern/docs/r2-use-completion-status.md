# R2 原版商品 USE／製作補完狀態（平行支線）

- R2 原支線：`work/r2-use-completion`，由 R4 初始 `8cf56395cceba89464a9b7dfbd4c5b00a57e6b5a` 建立；2026-11-24 在獨立 `integration/r2-use-completion-20261124` 合併 PR #2（`6fadc54ba892a8ca6a747a157151dc591d13aa9a`）。後續唯讀診斷 PR #3 也已合入同一隔離整合分支（`1cc0ae1cd7ad6d427ac6465e722e9fbfad5be73b`；CI 1,201／1,201）。#62/1 非提交式 GameCore 試算 PR #4 已合併（`535a3eee5303d6ef22df6b0e2843bcdbc242c37f`；CI 1,202／1,202）。本次市場購買試算分支：`work/r2-ad-package-market-preflight-20261124`。
- PR #2 原本目標 `test/task02-baseline-on-s1` 是 **R4 Draft PR #1 的來源分支**；為避免更動 R4，PR #2 已改指向上述獨立整合分支並成功合併。原有 Draft PR #1、R4 來源分支與 `main` 均未改動；**這不是合入主線或完成 R4 整合**。
- 受控來源範圍：變更只在 `modern/`；凍結的 `custom/*.cgi`、Perl、DSL、Core 不修改。
- **原版宣告：79 ITEM／116 USE。** 本分支 `getRule` 現有 **112 項**（原 111＋#62/1 跨店廣告的記憶體限定實作）；單店本機 HTTP 的 `listUseOffers` 仍維持 **111 項**，不提供 #62/1 目標選擇與儲存。其他 **4 項** 尚未註冊。`getRule` 存在不代表玩家 HTTP、授權或 B-43 多店持久化已驗收。詳見 `r2-use-completion-gap-inventory.md`。

## 1. 已實作、正在驗收的實際玩家能力

### ITEM #14 USE #0：去劍的市場收購

- 使用同一正式 `use-item` 執行首次、第二次、第三次及後續使用；不再受限於工程上的 `firstUseOnly` 或 `singleUseOnly`。允許原版按金錢、時間與有效數量裁切多趟請求。
- 真 Perl `GetItemUseTime`／`UseItem` 差分：EXP 0／20／40／980／1000；每次成功加 20 EXP，上限 1000；常態時 7200／7128／7056／6984 秒連續縮時。
- `LIMIT_EXP=3600` 下按原版其他商品 EXP 重新分配；其他 ITEM 擁有 EXP 不會令 #14 首次 USE 被錯拒。
- 保留五種劍 GET、`MakeAmount`、`funcb` 收穫加倍、`lostbook` 損毀、`CheckWholeStore`、存貨超量市場轉入和原版亂數順序。
- Source `job 行腳商人 times/job_peddle_time_rate` 編譯規則對 time、exptime 都作 `int(clock/1.5)`。Node 已接上同一共用 Clock；Perl 探針以凍結 DSL 的實際 `GetNumber` 與 Perl `int` 調整後執行真 `UseItem`。**尚未把原版完整自動產生的 `_job_use` 函式及玩家轉職流程接上正式 HTTP，所以職業全流程不能視為已完全驗收。**
- `listUseOffers` 顯示 EXP 與實際所需秒數。HTTP 測試以真玩家建立世界→開店→市場供貨→買 #14→多次 USE→兩代存檔→服務重啟→載入→再次 USE；含 CAS 與失敗原子性。
- 對 `LIMIT_EXP` 的非目標 EXP 同分排序，因原 Perl hash 遍歷次序具不確定性，目前在需要依排序扣除時 fail-closed；未冒充完整來源行為。

### ITEM #79 USE #0～#4：原版禮物卷五種交換

- `79/0` 地圖集：既有受控功能。
- `79/1` 入門書籍 3 件（消耗 5 張）、`79/2` 高級書籍 4 件（消耗 10 張）、`79/3` 修行套組（消耗 2 張）、`79/4` 米諾陶洛斯（消耗 1 張）：由無回呼的原版 USE DSL 產生純資料規則，統一接入同一 GameCore `use-item`、材料和成品交易，不額外新增商品專用命令。
- `modern/tests/original-perl/original-r2-gift-use-variants-probe.pl` 使用凍結 Perl `GetBuffer`、`GetItemNumber` 與 `UseItem` 執行 4 種交換；Node 比對庫存、批發、金錢、時間和原版使用／創造回報。
- 真 HTTP 路徑覆蓋 #79/4 與 #79/3 的 CAS、雙世代存檔、關服重啟及載入。商品 #79/2 已接入 Registry，但**初始店舖只有五張禮物卷**，目前沒有審閱完成的真實玩家補到十張的取得路徑，不能聲稱起始玩家已可執行此交換。
- B-43 存檔重新按「合法禮物卷消耗／對應產物」的來源可行組合審核，而不是永久假定只會兌換地圖。

## 2. 新增第一階段：可重用原版效果宣告（#10、#37、#39）

- `modern/src/reviewed-declarative-use-compiler.mjs` 從凍結 DSL 編譯 #10 書本寫作（8 項）、#37 修行（4 項）、#39 拆解／打包（19 項），共 **31 項無回呼 USE**。只接受來源已審核的欄位，未知回呼與來源漂移 fail-closed。
- `modern/src/shared-use-effect-plan.mjs` 定義同一執行路徑的 `source-materials`、`source-production`、`source-proficiency` 三種可組合效果；共用 GameCore 驗證來源計畫與原始交易材料／成品／EXP 完全一致，沒有新增每件商品專屬執行命令。
- 原版 `need` 以機率 0 的材料門檻表示：必須持有但不扣除；同一商品多個 `@@USE` 沿用原版編譯器的 `exp` 值，而 `job`、材料／產物、time／exptime 逐 USE 重設。
- 職業 `book`、`weapon`、`armor`、`tool` 的 `times/job_*_time_rate=1.5` 使用原版 `int(time/rate)` 語義，並保留 EXP 20／50／10 點、每商品熟練度上限及 `LIMIT_EXP` 裁切。
- `modern/tests/original-perl/original-r2-declarative-use-probe.pl` 執行凍結 `GetBuffer`／`GetItemNumber`／`UseItem`／`MakeAmount`／`CheckWholeStore`。`modern/tests/r2-declarative-use-effects.test.mjs` 差分 31/31 USE 的原版編譯結果、材料與產物、隨機抽樣、金錢、時間、庫存、批發市場、EXP；另外測 `need` 失敗原子性、四種職業縮時以及來源漂移拒絕。
- 真 HTTP 的 `sampleSourceUse` 已支援無回呼 USE 的原版有效數量與 MakeAmount 亂數預先配置，但**B-43 本機存檔仍維持原先嚴格來源庫存白名單**；31 項新增製作尚未逐條建立實際玩家取得→製作→雙世代保存→重啟載入的來源證明。不得把這 31 項標記為「完整玩家玩法驗收完成」。
- CI 須分辨 R2 來源差分與 R4 PR 合併投影的失敗；R4 曾在 `modern/tests/local-original-ui-layout.test.mjs` 引入獨立的正規表示式語法錯誤，已由 R4 工作線自行修正。R2 必須在最新 R4 基底重新觸發完整 CI，不能用修正前失敗或本地模型結果宣稱最終合併驗收。

### ITEM #12／#9：山區與礦山採集 7 項

- 新增 `reviewed-gathering-map-uses.mjs`，直接核對凍結的 #12 四項和 #9 三項來源 DSL：GET 產物及機率、2h 原始時間、半時倍率、20 EXP、`lostbook` 10‰ 損毀及山師首次 USE 縮時；沿用 GameCore `use-item`，未增加獨立指令。
- 新增 `original-r2-gathering-use-probe.pl` 與 `r2-gathering-map-uses.test.mjs`，執行真原版 Perl `GetBuffer/UseItem/MakeAmount/lostbook`，逐欄比較 Node 產物、庫存、損毀、熟練度、時間和亂數消耗；`ca3efd06` 同 SHA Actions 曾成功。
- 新增 `r2-gathering-http-save.test.mjs`，以真實初始五張禮物卷兌換地圖，進行 #12／#9 HTTP 採集、雙世代存檔、關服重啟與載入後續採集，不注入背包物品。完整 CI 可能因 R4 既有 hash／EVENT 測試失敗，須分別報告。
- 存檔只對已審核的「禮券兌換地圖 → 採集」路徑採用材料產量上界，未證明的市場另購地圖、其他製作產物及熟練度飽和後無法推回的來源，仍維持拒絕。

### ITEM #15／#16／#17：十一項來源製作（含進階藥劑 lostbook）

- 已接入原版 #15 藥劑調和 USE 0～4（治療劑、高級治療劑、乙太、高級乙太、艾利草；後四項需來源熟練度門檻）、#16 皮革加工 USE 0、1（皮盾／皮胸甲）、#17 木工 USE 0～3（木刀／木杖／木盾／木胸甲），合計十一項。來源宣告及職業倍率直接由既有 `reviewed-declarative-use-compiler.mjs` 解析，通過共同 GameCore `use-item`，製作書必須真正持有；缺少材料、時間、資格的指令不寫入世界。
- #15 USE 1、3、4 原版 `func lostbook` 已審核接入（param 25／25／50，依原版千分率抽樣；材料與產物先處理，再扣損毀的製作書），真 Perl／Node 使用相同亂數比對成品、製作書、EXP、耗時、原版日誌與回呼返回值。未知回呼或原版參數漂移仍 fail-closed。
- `r2-source-manufacturing-http-save.test.mjs` 真實從初始禮券換地圖、山區採集、來源 PLUS 市場購書、實際製藥／皮盾／木刀、雙世代存檔、重啟、繼續製杖與再存讀。`r2-potion-lostbook-http.test.mjs` 實際由藥草與十次治療劑製作取得 200 EXP，再執行 #15/1，驗證 25‰ 回呼與未達門檻時 CAS 不變。不得預先填入原料或 EXP，也不接受客戶端自訂亂數。
- B-43 保存審核只增加可比對的來源製作書、20 EXP 倍數、已採集材料投入量上界及部分非市場供貨產物上界；不把整個 ITEM 目錄的存檔限制放開。它是受限玩家狀態包絡，不是完整歷史交易追溯證明。
- **P1：#15 進階製藥持久化（PR #9 已合併）**：新 `reviewed-medicine-save-proof.mjs` 將真原版 #15/0～4 的 EXP／材料轉換／產量與 lostbook 參數來源鎖定，再以來源採集藥草與有效製作次數建立可行狀態包絡；`local-world-save-store.mjs` 不再錯把每一次 #15 操作視為消耗 10 藥草。`p1-advanced-medicine-persistence-http.test.mjs` 以新玩家真正完成 #79 換地圖→#12 採藥→來源 PLUS 買 #15 書→#15/0、/1、/2、/3、/4→B-43 第一代→重啟→繼續製藥→第二代→再重啟；另以偽造高級產物、材料、熟練度與損毀檔案的**負向攻擊 fixture** 驗證拒絕與保留舊世代。PR #9 HEAD `49ae6e21220744d44907402e22da62488385829b` 的 Actions 45323091134 已通過 JS 1227/1227、Perl 2286/2286。此為可行數量包絡，非不可偽造的交易歷史日誌；未知 EVENT、36h 結算、多店、非本次材料來源、EXP 飽和後額外製作依舊未獲 P1 授權。

### ITEM #20～#23：劍、盾、鎧、杖共十六項鍛造製作

- #20、#21、#22、#23 各四項鐵／鋼鐵／秘銀／奧利哈鋼鍛造 USE 全數接入原版宣告式 Compiler、共用 GameCore 和原版 Perl 差分；原版 `need` 門檻 #18「鐵匠的技術」或 #19「魔法的知識」為 **必須持有但不消耗**，並保留原版熟練度、製作書持有、材料、職業縮時及隨機產量。
- 各組 USE 2／3 的 `func lostbook` 參數 50‰ 已比較原版 Perl 的損毀／未損毀兩條支線與原始亂數次序；未知 callback／無法取得的 `need`／非法 EXP 繼續拒絕且不提交世界。
- 這 16 項具有「程式已註冊且原版記憶體差分」證據，但其 #18／#19 前置技能、來源市場購書、鍛造成品及 #39 打包鏈尚未取得全部真實玩家存檔／重啟驗證。B-43 不直接為 #20～#23 的 EXP 與鍛造庫存開放未知來源的持久化。
- 原有 #63 展示架調整 USE 0～7 已由 `reviewed-showcase-resize-use.mjs` 實作並註冊。先前統計誤將這 8 項列為「未接入」；本輪依真實 `useItem.getRule(63,useId)` 與 `listUseOffers` 校正，**不是新增八項功能**。

### ITEM #66：四項飾品製作（原版 NEED 與 lostbook）

- 依凍結 `custom/inc-item-data.cgi` 編譯 #66 USE 0～3：鐵耳環、秘銀戒指、奧利哈鋼手鐲及那由多的項鍊，要求真的持有 #66 製作書；#18 鐵匠的技術與 #19 魔法的知識皆為原版必備而不消耗的 `need`。#66/3 額外要求「行家的精隨」，未持有時保持 CAS 原子拒絕。
- #66/1、#66/2 的 `lostbook` 為 50‰，#66/3 為 **200‰**。原版 Perl `GetBuffer/UseItem/MakeAmount/lostbook` 差分比對材料、產量、熟練度、損毀／未損毀、職業道具屋縮時及 RNG 次序。
- 這四項是來源受控的**執行功能**，但起始玩家的雙知識與額外技術取得鏈、飾品製造／B-43 存讀檔尚未完整驗收；存檔白名單未因此擴充到未知產物。

### ITEM #25／#26／#35／#36：七項來源酪農與乳製品 USE

- 新增 `#26/1` 輕微發酵、`#26/2` 大量發酵；需要持有 5／10 頭米諾陶洛斯♀且每次消耗 15 瓶牛乳，分別產生優格、起司。新增 `#35/0` 食用優格、`#36/0` 食用起司，這兩項原版本來就**沒有 GET 成品**。共用效用編譯器因此限定地允許空成品宣告，不自動放行其他未審閱類型。
- 酪農家 `job_cow_time_rate=1.5` 用原版 `int(time/1.5)` 縮時。#25/0「擠奶」及 #25/1「用力榨取乳汁」已接入凍結 `_local_／_local_1` 共用回呼：產量 `int(rand(等級×有效次數×持有牛數))+1`；每次擠奶以原版 `rand(1000)<等級²` 判斷牛隻死亡（1‰／4‰），動態 AddItem 與 UseItem 皆記錄在原版結果欄位。#26/0「飲用」按有效瓶數分成 <10、10～29、≥30 三段，對原版人氣（rank）做同樣的抽樣增加、無變化或扣減並維持原文日誌。凍結 Perl 直接執行原始內嵌回呼，Node 測試比對牛乳、死亡、人氣、EXP、原版 log、回呼返回值與隨機順序。
- `r2-dairy-true-player-http.test.mjs` 真玩家從初始五張禮物卷連續 `#79/4` 換取五頭牛，執行兩種擠奶、`#26/0` 飲用、`#26/1` 發酵優格與 `#35/0` 食用，並驗證五頭牛不足以執行需十頭牛的 `#26/2`。沒有注入牛、牛乳、熟練度或客戶端隨機抽樣。
- B-43 僅對來源已認證的「初始禮券→五頭以內牛→擠奶 EXP 每次 10 → 牛乳最大產量包絡」准許雙代存檔、Node 重啟與載入；對最新世代改造牛乳數量超上界、但 SHA-256 正確的存檔，仍拒絕並回復上一有效世代。此為**保守數量上界，非完整交易追溯**；牛隻死亡後的來源耗損、額外市購牛、發酵後優格／起司庫存的全部合法來源持久化尚未證明，維持拒絕。
- 乳製品原版差分、真玩家雙世代存讀與其他 Core 回歸須在最新同 SHA Actions 通過才算本輪驗收，不能把七項 Registry 接入全部標為完整持久玩法。

### ITEM #13：兩項原版打工 USE

- `#13/0`「發面紙賺錢」（原版 param 3000）與 `#13/1`「去當日薪木工賺錢」（param 10000）已 source-pin：兩項共用凍結 `_local_1` 回呼，在 `UseItem` 時間／CAS／市場檢查之後增加 `param×有效次數` 金錢；包含原版兩筆 `WriteLog` 文案與職業行腳商人 1.5 倍時間修正。原有 B-27 `GetMoneyString` 預覽模型已接入共用 GameCore，`¥` 為受控合成幣別測試值，不聲稱等於所有遊戲部署的幣別設定。
- `original-r2-book-work-use-probe.pl` 在記憶體內執行凍結 `GetBuffer`、原始 `UseItem` 與原版 inline body，`r2-book-work-source.test.mjs` 比對有效次數、金錢、時間、消耗、熟練度與回傳文案，另外驗證未持有打工書時 fail-closed、不憑空給錢。
- **重要取得缺口**：#13 原版 `price=0`，現行 R2 wholesale registry 對零價商品仍拒絕直接購買；實際新玩家購書／合法加薪／B-43 金錢來源持久化沒有完整驗證。本輪只稱「原版差分完成、Registry 已接入」，不宣稱可由新開店玩家走完。

### ITEM #27～#29：三項節慶單次消耗 USE

- #27/0 食用整隻烤火雞、#28/0 喝挑剔的朗姆酒、#29/0 穿時髦的靴子，原版皆 `arg nocount`；各消耗自己的原版一件物品，執行時間 `1h×ItemUseTimeRate(0.5)`、無 GET、無 EXP，保留「肚子真飽／感覺很好／獨占了所有人的視線」材料消耗文字，且非單次請求（requestedCount!=1）在執行前原子拒絕。
- 凍結 `GetBuffer` + Perl `UseItem/MakeAmount/CheckWholeStore` 的三項差分與 DSL 變更 fail-closed、連續使用兩次拒絕測試位於 `r2-declarative-use-effects.test.mjs`。來源商品的市場取得、真 HTTP 新玩家與 B-43 合法存檔路徑尚未驗證，不因此放寬來源存檔白名單。

### ITEM #78：十四項職業變更與熟練度移轉 USE

- 原版 `轉職指南` 的 USE 0～13 已按原始 `param` 與 `_local_／_local_1` 綁定編譯成獨立 Registry 規則，全部要求持有指南 1 本、`arg nocount`、時間 `6h×ItemUseTimeRate(0.5)`，共用 CAS 在正常扣除／時間／市場檢查後執行原版轉職函式。前 13 種轉職依原版將指定 13 個商品熟練度清除，轉入目標熟練度且係數 0.5、上限 1000，並改變店舖職業。第 14 種解除職業，不進行熟練度轉移。
- **關鍵相容性**：凍結 Perl 的跳過條件確為 `next if !$exp || $exps==$exp1;`，其中 `$exp1` 是目標商品當前的**熟練度數值**、不是商品編號；不修正這個原版行為。完整 `original-r2-career-use-probe.pl` 直接執行凍結 `GetBuffer`、`UseItem` 與 inline `_local_`；`r2-career-change-source.test.mjs` 覆蓋 14 項、熟練度為 0／1000、編號恰等於熟練度值、職業別名、日誌及單次 USE／未持有拒絕。
- `r2-career-true-player-http.test.mjs` 已建立市場正向 PLUS → 真購書 → 轉酪農家 → 禮券換牛 → 擠奶職業縮時。P2 的 `reviewed-career-save-replay.mjs` 與 B-43 新增有界真命令歷史，避免以轉職後 EXP 錯推過去產量：保存及載入重播原版初始化／已驗證舊檔錨點、真 GameCore CAS 及伺服器 RNG，逐欄比對完整世界；雙世代同一歷史前綴，舊無職業存檔維持相容。`p2-career-persistence-http.test.mjs` 覆蓋十三項轉職、解除職業、真 EXP 轉移、保留原庫存、兩次 Node 重啟及後續製作、舊檔接續、偽造 job／EXP／商品／歷史／RNG／校驗拒絕。只承認 `p2-career-persistence-source-review.md` 內明示白名單，非密碼學簽章；未審閱操作、R4 EVENT、跨期及多人仍 fail-closed。PR #10 已合併；HEAD `23c959515d8e24f445af16367d6de380e8a72d01` 的 Actions 45375561791 已通過 JS 1230/1230、Perl 2286/2286。

### ITEM #77：一項慶祝派對人氣回呼 USE

- `#77/0` 消耗 1 組「慶祝用套組」，原版 `arg nocount`，宣告費用 0、執行時間 `4h×ItemUseTimeRate(0.5)`，保留材料消耗訊息；執行 frozen `@@FUNCITEM::popup`：`int(1000×(2−rank/5000))`、人氣上限 10000、兩筆原文 `WriteLog`，沒有憑空加入其他庫存，也沒有客戶端任意指定人氣值。
- `original-r2-party-use-probe.pl` 直接編譯凍結 `GetBuffer`、真 Perl `UseItem` 與 `popup` 本體；`r2-party-popup-source.test.mjs` 比對不同初始人氣、上限、原版訊息與缺少套組／非法次數的 CAS 原子拒絕。**套組市場取得與 B-43 保存來源仍未驗收**，不可當成任意玩家現成物品。

### ITEM #62/0：自家廣告 USE（#62/1 僅記憶體；#62/2 未註冊）

- 凍結 `custom/inc-item-data.cgi` 的 ITEM #62 USE #0「推出自己商店的廣告」現以 source-pinned Registry + GameCore CAS 接入，必須持有廣告包 1 件且單次使用（`nocount`），執行時間 `10h×ItemUseTimeRate(0.5)`；行腳商人使用原版 `job_peddle_time_rate=1.5`，每次增加該 USE 原版 `exp 10%`（100 點）。
- 來源 inline `_local_` 在扣除時間、道具與市場檢查之後消耗 **一次** `rand(1000)`：`<250`（250‰）為反效果，人氣減去 `int(500×(2−rank/5000))` 且下限為 1000；否則人氣增加同一數值，上限 10000。兩分支均保留原版兩筆 `WriteLog`。不因成功就產生任何商品、費用或目標店舖效果。
- `original-r2-self-advertise-use-probe.pl` 真正執行凍結 `GetBuffer`、原版 `UseItem` 及 inline Perl；`r2-self-advertisement-source.test.mjs` 比對 0、249999、250000、999999 抽樣、不同人氣、EXP 上限、行腳商人時間、日誌與 CAS 失敗。HTTP 由伺服器供應 source-scoped 抽樣，**不接受玩家自行指定 RNG**。
- 尚無「新玩家真正取得廣告包→完成廣告→雙世代 B-43」的全鏈驗收；原版 `plus=5d` 不等於保證市場立即有貨。現行 B-43 **不**准許單靠 #62 USE 增長的熟練度、任意廣告包與額外人氣來源，不能把 Registry 接入當成安全可持久化。

### #62/1 記憶體受控實作與剩餘 4 項跨世界回呼

- **2026-11-24 R2 #62 廣告包市場來源試算（新分支）**：僅在 `AKIMONO_R2_TARGET_AD_MEMORY_ONLY=1` 下，新增 `POST /api/r2/advertisement-package-market-preflight`。請求只能有 `expectedRevision`；由伺服器從來源 `quoteMarketOffer(world,62)` 取真實架位、動態價格、批發存量，並用相同 `applyGameCommand(kind='market-buy',shopId=1,itemId=62,requestedCount=1)` **非提交**預測來源市場購買。來源市場沒有 #62 現貨時回傳 `SOURCE_MARKET_OFFER_UNAVAILABLE`；即使市場 `canBuy=true`，但錢不足，仍由 GameCore 拒絕，不能把「有市場現貨」誤稱成功買到；若 EVENT 變為 `null`，即使價格仍顯示也會從完整購買世界驗證拒絕。只有單店、固定 actor；雙店拒絕。不能從 HTTP 注入價格、架位、金錢、物品或 RNG；強制 `committed=false,persisted=false,authenticated=false,authoritativeBuyApproval=false`，且對比原 WorldState／B-43 存檔世代不變。**真購買只有既有 `/api/buy` 可執行，不會因試算而獲得資金或道具。**
- **2026-11-24 R2 已合併的受控來源試算**：僅明確設定 `AKIMONO_R2_TARGET_AD_MEMORY_ONLY=1` 且存在真來源雙店時，`POST /api/r2/target-advertisement-preflight` 只接受 `expectedRevision` 與 `targetShopId`。伺服器把固定 `shopId=1,itemId=62,useId=1,requestedCount=1` 送入與真 USE 共用的 `applyGameCommand`，只讀取投影是否被來源拒絕、原因與在來源允許時預計的目標人氣，**絕不呼叫 `executeMemoryCommand`／CAS**。客戶端不能指定金錢、物品、行為、亂數或回呼；不接受自家、未知或過期版本目標。回應強制標示 `committed=false`、`persisted=false`、`authenticated=false`、`authoritativeUseApproval=false`。目前真玩家情境會因缺廣告包或 EVENT 不明而拒絕；**試算成功也不等於正式玩家授權或可保存**。

- **2026-11-24 已合併的唯讀驗證**：當 `AKIMONO_R2_TARGET_AD_MEMORY_ONLY=1` 時，`/api/state.targetAdvertisementAudit.readiness` 顯示來源 #62 動態市場單價、當前現金與現金差額、廣告包是否持有、EVENT 狀態是否已失去來源確認、雙店是否禁止 B-43 存檔。市場 `canBuy` 不等於玩家能負擔或成功執行交易；所有資訊僅供診斷，`evidenceOnly=true`、`authoritativeUseApproval=false`、`authenticated=false`。關閉模式時仍回傳 `targetAdvertisementAudit=null`，沒有增加任意玩家身分、RNG、商品或金錢。

- `#62/1` 指定其他店舖作廣告：已 source-pin 原版 `target|nocount`、10h×0.5、0 EXP、1 包材料與 inline Perl，以受控 `targetShopId` 解析同一記憶體 WorldState 中的另一間真實 `open-shop` 建立店舖。僅在雙店、無 guild／EVENT、目標有效時，以同一 revision/CAS 扣使用者的廣告包與時間並提高目標人氣；無額外 RNG。`original-r2-target-advertise-use-probe.pl` 與 `r2-target-advertisement-source.test.mjs` 已有凍結 Perl 差分。`modern/scripts/dev-local.mjs` 新增**預設關閉**的 `AKIMONO_R2_TARGET_AD_MEMORY_ONLY=1` 本機驗證模式：`/api/r2/open-target-shop` 只可透過原本 `open-shop` 建立第二間店（固定 ID 2，未注入物品／EXP），`/api/use` 僅針對 #62/1 允許 `targetShopId`，實際操作店仍固定 ID 1；第二店建立後，市場購買、供貨、時間快轉、一般 USE、展示架與丟棄等原單店指令都被拒絕，只允許受控 #62/1 嘗試；由伺服器來源世界解析目標並重新做共用 CAS，客戶端不得指定回呼或亂數。`r2-target-advertisement-local-http.test.mjs` 以真來源 PLUS→市場購入 #14 地圖→真 `use-item` 製劍→B-41 自然販售，驗證該測試情境的 #62 動態報價 **121951** 超過起始金額 **100000**，缺錢購買維持拒絕；首次販售後 `period.eventState=null`，下一次販售時間片也因尚無完整 R4 EVENT 來源而被拒絕，**不憑空補錢或廣告包，也不假稱 HTTP 成功用了 #62/1**。另驗證第二店來源建立、非法目標／過期 revision／未持有包裹原子拒絕、雙店 B-43 存檔拒絕與既有單店存檔重啟載入；正向 #62/1 Perl／Node 差分仍由記憶體兩店測試提供。原 PR #2 最終同 SHA 1,198／1,198 CI 通過。**此模式沒有多玩家身分驗證，也不能保存雙店世界；正常啟動時 HTTP 不接受 target，B-43 仍拒絕雙店。不可宣告正式玩家跨店廣告已放行。**
- `#62/2` 商會廣告：需可信 guild 身分、商會名稱字典、同 guild 的全部店舖快照與原版逐店人氣投影，不可用空商會資料替代。
- `#65/0` 謠言：需指定目標、`needpoint=20000`、原版 `rand(1000)<800`、對方 #62 熟練度與雙方人氣變化，需共同交易與日誌驗證。
- `#65/1` 偷竊：需目標商品／陳列架、看門機器人、跨店金錢與 `saletoday/paytoday`、失敗賠償、`STATE.safety`、隨機與持有上限等所有原版分支；不得只模擬轉移商品。
- `#65/2` 行業謠言：需目標店隨機陳列架、原版四類 `kill-*` 事件的啟動／衝突與 8 小時到期處理，必須與 R4 EVENT 時間切片整合。
- R2 共用 `use-item` 一般規則仍限定單店、無 guild、無未審閱 EVENT；僅 #62/1 允許**恰好兩店的記憶體 CAS**，並提供預設停用的本機 HTTP 驗證模式，**不代表正式多人玩家 HTTP 或跨店保存**。#62/2、#65/0～2 仍 `getRule=null`、原子拒絕；多店身分授權、B-43 持久化與 R4 EVENT 接點均未完成。

## 3. 材料取得鏈（R2 新增來源驗證）

- **玩家卡住的原因已定位**：31 項 Perl 差分使用「預先放入材料」的記憶體來源世界，不等同玩家從開店取得原料。原版前期原料 #1～#7 的 `PLUS -20m` 表示市場供貨扣減，不代表可由 PLUS 從零補貨。不能把市場上的 ITEM 定義或未執行的 USE 直接當成可取得材料。
- `listUseOffers(world)[].materialRoutes` 以讀取同一凍結 DSL ITEM / Registry、世界庫存及已註冊 USE 的方式提供每項材料資訊。區分已持有、目前市場現貨、原版正向 PLUS 可補貨、已具材料的前置 USE、前置 USE 仍缺材料、尚未接通取得路徑；**只提供說明，不直接增減商品或創造市場存貨**。正向 PLUS 也不保證每次供貨都產生足量、可負擔或可在時間限制內購買。
- 來源材料鏈實例：初始五張禮物卷 → `#79/3` 消耗二張換得 #37 修行套組 → 原版 PLUS 在市場產出 #8 魔石 → `market-buy` 買三十個魔石 → `#37/1` 消耗修行套組與三十魔石，產出 #19 魔法的知識並取得五十點 #37 EXP。這條流程使用原版來源的 API，而非手動填入測試庫存。
- `local-world-save-store.mjs` 原有 #37/1 一次性魔法知識來源證明保留；新增 #9／#12 受限地圖兌換、熟練度與原版最大產量包絡的材料存檔審核。未知製作結果與不合法 EXP 仍拒絕，並不對所有已註冊 USE 一律解禁。
- **新增採集與剩餘阻塞**：#12 四項山區採集、#9 三項礦山採集已接入來源受控 `use-item`，真實取得原料 #1～#7；但 #10 寫作、#37 其他修行與 #39 製作的藥品、裝備及解體屋之魂等上游仍不完整，未知配方的存檔來源證明仍拒絕。不能因採集通過就把其他配方稱為完整玩家玩法。

## 4. 尚未完成與 R4 依賴

- 尚有 **4／116** 原版 USE 未註冊（#62/2 商會廣告＋#65/0～2 禁斷之書）；#62/1 僅接入記憶體雙店 USE，以及預設關閉的本機 HTTP 稽核入口，**未提供受授權多人 HTTP 或雙店保存**。不能將 112 項 Registry 計數等同 112 項完整玩家玩法。
- 高風險缺口是原版產生函式、職業變化、`LIMIT_EXP` 並列排序與事件狀態的完全差分；這些需要個別補真 Perl Oracle，再擴充共用 Registry，不能用手寫預期值冒充來源。
- R4 負責完整時間切片、原版 EVENT/hash/RNG 語義、SortDT、36 小時期末決算；R2 不建立第二套 EVENT 引擎、不將未知 EVENT 設空。依賴 EVENT 的 USE 在明確介面接妥前繼續拒絕。
- `modern/scripts/dev-local.mjs` 與 R4 工作線均有既有變動；目前僅在獨立整合分支保留兩側歷史，原 R4 PR #1 與 `main` 未更新。未來若要將整合分支合回 R4 或主線，仍須再次檢查兩側來源語義與同 SHA CI；R2 支線測試通過不代表最終遊戲功能驗收。

## 5. 驗證標準

正式判定需最終 R2 HEAD 的 GitHub Actions 完整成功（Node、原版 Perl、DSL/Core 來源 SHA、R2/R3/R4 回歸）與相同程式碼上的雙世代 HTTP 玩家驗收。新增測試通過數量不等於 116 項功能完成。即使 R2 分支 CI 綠燈，也僅能稱 **「R2 補完支線驗收通過」**，不能稱整個專案或 R2 全原版玩法完整結案。

## P3 第一階段（Draft PR #11，尚未完成驗收）

- `p3-forging-accessory-source-review.md` 記錄二十項 USE 與 #37 修行、#9 採礦、#8 魔石及製作書來源。共用歷史重播保留 P2 wire 格式、128 筆上限及完整世界比對，新增 #37/0、#37/1、#79/3、基礎四種鍛造和必要市場購買的白名單；不要求無職業鍛造玩家先轉職。
- `p3-forging-persistence-http.test.mjs` 已新增 #20/0、#21/0、#22/0、#23/0 真玩家取得、製作、B-43 雙世代重啟及拒絕偽造測試；須由 PR #11 確切 HEAD 的 CI 證實，不以測試存在宣告通過。
- 其餘十六項仍缺合法玩家／持久化證明；進階熟練度、雙技能、#24 修行門檻、實際時間推進及未審閱 EVENT 不得繞過。現有 PLUS 供貨子步驟不是完整時間推進。尚未驗收 P3 轉職及 lostbook 持久化；不擴張 #39 或進入 P4。
