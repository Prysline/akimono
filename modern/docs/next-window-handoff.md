# 最新開發交接｜2026-11-22 共用規則引擎優先（取代原 B-64 逐劍專用開發建議）

> 本節為**最新執行方向**，優先於下方 B-63 及更早各階段的「下一步」敘述。**此文件更新僅代表決策及規劃，尚未修改程式、沒有完成新 Core、沒有新增玩家功能或解除原版 36h 決算限制。** 完整權威計畫：[共用規則引擎優先與最短可玩閉環](playable-loop-priority-plan.md)；成因與正式里程碑：[移植進度及架構修正](migration-progress-and-next-milestones.md)；原始契約與現行邊界：[GameCore 責任修正](game-core-contract-v1.md)。

## 本次架構決策

使用者要求：不要再沿用「每新增一個小商品／小事件，就新增一套專用模型／命令及近似整條測試流程」的開發模式。核心原因可從現有碼追溯：B-31 的 GameCore 主要處理命令分派、世界修訂版、記憶體 CAS；標準街模組逐步累積 buy-market-item-10/11/14、use-original-sword-map-14 等命令及個別 reviewed/project 模型。這使原始 Core 共同演算沒有真正形成所有商品／街道可重用的規則層，而來源 Perl 片段、Node 測試、CAS、事件、存檔、HTTP 常在小功能上重複串接。

原版驗證必須保留。「新增小功能耗費十倍工時」未有計時數據，應描述為**大量逐案例實作與重複整合驗證造成的結構性成本**，不可宣稱量化倍率已證實，也不可為追求速度放寬原版規則及資料安全。

**新分工：** GameCore 真正執行共通 UseItem／MakeAmount、交易、商品供需／自然販售、世界時間、EVENT、36h 決算等運算；StreetModule 提供經來源核對的街道 ITEM／USE／EVENT、職業、設定、特殊效果及狀態；WorldState／Repository 負責一致性、CAS、持久化；UI 只呈現與送命令。嚴禁把一般功能永久綁定 itemId/eventCode，或把每個新的來源合法商品變成新的 command 種類。

## 下一輪不是「B-64 再多做 #41～#44 專用販售」

1. **R0：固定現有 B-63 基準**。保留 B-63 基準的**已驗證行為與必要安全覆蓋**、固定 Core／DSL SHA、WorldState／CAS、B-43 雙世代存檔與本機繁中 UI；盤點每個專用命令及測試所覆蓋的行為，允許在有替代測試證據後移除過時、重複或依賴被淘汰內部流程的測試。
2. **R1：明確定義共同引擎的可執行合約及資料／回呼契約。** 依 Core 的 plug/use.cgi、buy-s.cgi、inc-turn.cgi、inc-period.cgi、inc-makeitem.cgi，列出來源、前置條件、輸入／輸出、運算／亂數、世界副作用、回呼順序、街道覆寫、拒絕邊界；不要求一口氣移植全部玩法。
3. **R2–R3：從已有真流程提取通用操作。** 先讓共同商品使用及交易可接受不同來源合法 ITEM／USE 而不是 buy-market-item-10 一類專用命令，再整合共用市場、自然販售、世界時間及展示。#10、#40、#41～#44 是**資料驅動共用銷售驗證集**，不是新四條專用演算法。
4. **R4–R5：同一筆世界狀態的 EVENT／期末／存檔／UI 閉環**；保留原版順序，讓玩家在同一繁中介面經開店、真進貨、上架、真販售、36h結算、落盤、重啟、下一期續營；之後一次集中人工驗收。
5. **R6：跨街驗證，非先移植整個麵店／航海街。** 用 URon 售麵增加髒碗，WAtlas 期末海域更新，證明共同 Core 可以運作，且街道有自己的擴充與存檔，不必重寫販售／決算；多人及其他玩法留在後續。

## 交接驗收與禁止事項

- **能力驗收，而非 B 編號驗收：** 新增一種來源合法商品若不涉及新語義，應只更新 DSL／編譯資料與對應案例，不增加命令類型，也不複製獨立完整交易／販售函式。未知 DSL／回呼仍明確拒絕，不能直接 eval Perl 或偷偷跳過原版 EVENT／期末。
- **驗證分層且重用：** 共用演算的來源 Perl oracle／Node 差分測試只建立一套穩定契約；新商品驗證編譯資料、特殊回呼和真正有差異的整合案例。保留固定來源 SHA 與**有效的必要回歸覆蓋**、同一 HEAD 的 Push／Draft PR CI completed/success；新架構要增加通用命令／跨商品／特殊回呼／CAS／存檔差分測試，也要清理已有等價替代、只驗舊特化模型的測試與孤兒 fixture。
- **測試增刪交接要求：** 每次重構須列出新增、改寫、合併、刪除的測試檔案及來源行為對照；新測試先證明共同規則可用，再刪除過時白名單或實作細節測試，且不可削減必要的原版 Perl 差分、資產守恆、失敗 rollback、存檔／重啟或真正 HTTP 閉環覆蓋。歷史斷言數與測試檔數可下降，不當成退步；只要必要覆蓋完整、CI 成功、功能更通用即合乎目標。
- **本輪修正文件之前的功能現況：** B-63 的地圖 #14 已支援首次使用五劍產出、加倍、損毀，#41～#44 可持有和存檔但尚不能一般自然售出；B-43 本機存檔、真 UI 存在；完整 36h 期末、通用 116 USE、三街共用引擎及多人均未完成。
- **維持分支與原版凍結：** 僅修改 test/task02-baseline-on-s1 下 modern/ 文件／後續允許的新版碼；不碰 main、migration/standard-street-s1、Core Perl、標準街 DSL、Notion 正式狀態、不合併 Draft PR #1。本次沒有修改任何實際遊戲程式。

---

## 以下為 B-63 與更早的歷史交接（「下一步 B-64」已由本節新規劃取代）

## 2026-11-22｜B-63 最新交接（優先於 B-62 及更早紀錄）

完成 [B-63：劍市地圖原版全部五劍 GET 首次使用、收穫加倍、地圖損毀的真原版數值＋CAS](b63-real-sword-map-all-original-first-use-outcomes.md)，只在現有 `test/task02-baseline-on-s1` 及 Draft PR #1（仍Draft未合併），不修改 frozen Core／DSL、main或 migration 底分支。此版以 B-62 **真原版批發來源 #14 劍市地圖**（不是憑空造劍）為前置。新增選配 `originalItemHelperSource` 指向真固定 `modern/tests/original-perl/core-inc-item.cgi`，來源齊備時才提供內部指令 `use-original-sword-map-14-all-outcomes`；既有 B-62 `use-original-sword-map-14` 的狹窄木刀分支保持不變、舊呼叫者不提供原版helper就不啟用 B-63。

原版 ITEM #14 SOURCE `@@USE` 五條 GET：`ITEM 40..44` 木刀、鐵劍、鋼鐵劍、秘銀劍、奧利哈鋼劍，10次抽取、機率400/350/150/60/30 permille；`funcb _local_` 若 `rand(1000)<=100`（含等號）將5份count皆加倍為20，再依原版 `MakeAmount` 進入 **每組2筆 rand() 正弦平方根分支**，不是把十次抽樣結果x2；`lostbook` 若最後 `rand(1000)<100`（不含等號）呼叫真正 `item::UseItem(14,1,...)→UseItemSub`，真扣地圖1份並將 `originalUseItem/originalUseMsg` 記入來源回執。一般原版抽樣總數52、加倍12，對照真原版 Perl 擷取編譯器 `GetBuffer/GetLocalFunction` + 原始 DSL `funcb` 本體 + frozen Perl `UseItem/MakeAmount/GetItemUseTime/UseTime/CheckWholeStore/item::lostbook`。六個原版獨立情境：一般五種劍各2／保留地圖；各2／地圖損毀；加倍產生8,7,3,1,1／保留；加倍產生8,7,3,1,1／損毀；全部沒有 GET + 損毀；100/1000等值邊界會**加倍但不會損毀**。首次用地圖仍花12000、用時7200、EXP[14]=20；未提供的亂數、額外亂數、過期CAS、來源 callback 改動（包含多出副作用）都完整拒絕。

修改 `modern/src/original-b63-sword-map-all-outcomes.mjs` 並接 `standard-street-module.mjs`，B-41／B-56 時間片可保留5種真來源劍的玩家庫存、原版持有成本 `[120,150,320,800,1200]` 及各自上限 `[600,500,300,100,75]`；原版 B-43 雙世代磁碟存檔可保存真來源其它四種劍和地圖已毀狀態，重載後沒有地圖就不能再用。`modern/tests/b63-source-all-sword-map-outcomes-cas.test.mjs` 與 `modern/tests/original-perl/original-b63-sword-map-all-outcomes-probe.pl` 及同名 `.t` 都逐情境比對原版真函式結果及CAS。

**邊界須維持**：只支援地圖**首次使用**；EXP20後再次使用之熟練縮時未審查；除了原版木刀#40，鐵劍#41～奧利哈鋼劍#44 目前可真的取得、持有、存檔和付維持費，但**尚未實作各自的展示架自然販售**；沒有原版全部道具／市場回補或超量丟棄支線、原版完整 PRNG 和 Perl hash keys 次序、同時多持續EVENT、原版 log 持久化、玩家 HTTP 及 **36小時結算**。本回合完整 Migration 任務02/04/05仍**進行中**，絕不可宣稱整款遊戲已完成或合併 PR。

**最終原版 Perl／Node測試總數、HEAD、CI連結，以本交接修改後同一 SHA Push和Draft PR均 `completed/success` 為準**；不要沿用 B-62 的 886/1702。下一步 B-64 推薦真原版 #41～#44 販售時的 `popular/2`、價格／point及成本，而不是先把地圖熟練時間／假原版 RNG 當作完整支援。

## 2026-11-22｜B-62 最新交接（優先於 B-61 及更早紀錄）

完成 [B-62 真實劍市地圖 #14 → 木刀 #40 來源產出 → `ken-sale` 木刀真實銷量／營收](b62-real-sword-map-buy-use-sale-cas.md)。核心關鍵：原始 DSL 木刀 #40 的 `plus -1h`，初始真批發市場沒有木刀，故**不能直接偽造木刀批發進貨**。改採真來源：原始市場 `plus 1h` 補充地圖 ITEM #14「到劍市的地圖」，原版 `buy-s.cgi` 數值路徑真正花10,000購入地圖、扣市場與資金、600秒；#14 原版 USE 再花12,000及7200秒，`exp 2%`（20點），經過來源限定的 `funcb _local_` 跳過收穫加倍、五個來源 GET（木刀40%、鐵劍35%、鋼鐵劍15%、秘銀劍6%、奧利哈鋼劍3%）中僅10次木刀成功、其它四組40次全失敗、`func lostbook` 不摧毀地圖——總計**52筆原版 rand(1000)**，在真世界取得十把 #40，原始地圖仍保留。其它抽樣路徑及重複使用因熟練度改變時間等未審查分支仍**整筆拒絕**，不可假稱所有來源地圖功能已完成。

真正的玩家 #40 於商店展示架按原版定價1200上架，`original-b41-playable-sale.mjs` 來源販售新增木刀這條已審查支線：原版 buyer/sale/補貨、原版木刀 point1250、原版成本120（展示時/10）、地圖庫存成本500，保留 B-59/60/61 的事件契約及交易歷史。B-56 完整受控17鍵 EVENT 首片觸發 `ken-sale`，**啟動片**使用未被修飾的10800秒 `popular`，相同30分鐘樣本實售木刀 **2把、收入2400**；存檔至B43磁碟再用新 memory adapter 重讀，下一片 DataRead 依活動 `popular/2=5400` 秒，真實成交 **5把、收入6000**，木刀原來10把經兩片後剩3把、`itemtoday[40]=7`，兩次售出皆實際增加玩家金錢。若第二片沒有EVENT，受控對照只賣2把／2400。不是只讀潛在需求預測。

新增程式 `modern/src/original-b62-sword-map-acquisition.mjs`，Street `originalUseSource` **選配**：舊呼叫者不提供此來源時保留B-41/B-56原本契約及舊測試通過；僅提供固定原始 `use.cgi` 才出現內部 `buy-market-item-14`、`use-original-sword-map-14`。`modern/tests/b62-real-sword-market-map-sale-cas.test.mjs` 含真市場/真地圖/真受控木刀成交/硬碟復原、原版交易抽樣及未審查分支、過期交易拒絕。**真原版 Perl 執行** `modern/tests/original-perl/original-b62-sword-map-use-probe.pl` 透過固定原版 `GetBuffer` 加上固定原版 `GetLocalFunction`，真正執行從 DSL 擷取的本體 `_local_b1`、固定原版 Core `UseItem`、`MakeAmount`、`GetItemUseTime`、`UseTime`、`CheckWholeStore`、`item::lostbook` 與EXP，來源52次rand、10把木刀、原版時鐘與收入前置費用皆有斷言 `original-b62-sword-map-use.t`。

B-62 原始來源只接受地圖未加倍、未損毀、只得到十把木刀的這條狹窄分支，**不支援所有地圖結果、其它劍真的進貨／販售或真原版全 CGI/玩家 HTTP**。其它持續EVENT不得並行、Perl `keys(%EVENT)` 實際順序及PRNG未復原、持久化日誌與**36小時期末結算**仍未實作。任務02、04、05及專案總覽都仍進行中、不得假稱完整可玩遊戲。Draft PR #1 仍Draft未合併，原版 Core／DSL、main與migration底分支未修改。**最終 SHA/Node與Perl計數及CI網址須以本交接提交後同SHA Push與PR兩個成功CI確認**。下一個 B-63 建議拓展原版地圖加倍/損毀分支與其他劍的真正買賣，或優先打通來源36h跨期結算。

## 2026-11-22｜B-61 最新開發交接（優先於 B-60 與更早紀錄）

本輪 B-61 接續 B-59 `plusup-tetu` 真批發持續 EVENT 與 B-60 `happy` 真商店人氣 NOWFUNC，新增 [原版「對劍的需求增加」 `ken-sale` 的持續期限、真正 Perl 編譯的商品需求與市場計算、真世界 CAS 與存檔](b61-source-sword-demand-economics-cas.md)。原版固定 Standard Street DSL 指明 `start 10%`（編譯機率100）、`basetime 6h + plustime 24h`，無 start/end/nowfunc，五條來源 `PARAM` 只有木刀(#40)、鐵劍(#41)、鋼鐵劍(#42)、秘銀劍(#43)、奧利哈鋼劍(#44) 各自 `pop/2`。原版 `inc-makeitem.cgi::OutEventData` 真編譯迴圈實際導出對應五行 `$ITEM[40..44]->{popular}=int($ITEM[40..44]->{popular}/2)`，不改售價；原版 `inc-turn.cgi` 真買家準備區及 `market.cgi::GetMarketStatus` 真執行，獨立來源 fixture 中200把木刀定價1200的市場 `uppoint` 54→27、商品平均價1200→1200、五種劍的 `buypeople` 約兩倍，證據來自執行原版程式，**不是玩家已取得或賣出200把木刀**。原版 `priceup-*` 雖有 `price*2`，DSL 後面的 `start -1` 已移除自然觸發，本輪不做假漲價。

來源順序：固定 DataRead 對活動中的 `ken-sale` 讀取參數，**本片先用有效的 popular 值計算買家需求和市場，再結束舊 EVENT/開始新 EVENT**。因此啟動當片仍是原需求，下片才加倍；在到期片計算需求仍受活動影響，結束後下一片才還原；`expiry===sliceEnd` 並不過期且不重抽群組。B-56 受控全部17鍵 EVENT gate 用明示排序/抽樣精確執行來源無回呼的啟動/到期，GameCore 同一 revision CAS 寫入時間、真正書店#10銷售/59 PLUS、市場及 `period.eventState['ken-sale']`；B-43 真雙世代磁碟保存及**新 adapter 真從磁碟重載**可以續玩這個單一合法活動。與 B-59 鐵礦、B-60 感謝祭維持「三種只能擇一個活動」，未知/多個事件拒絕，不會掉狀態；舊 B-41 孤立販售和只跑 PLUS 的命令不可跳過活動。真世界商店仍只支援銷售 ITEM #10；`sourceSwordDemandPreview` 僅是**經來源檢查的買家潛在量回執**，其原始分數以安全整數 `potentialBuyerNumerator`/`potentialBuyerDenominator`、浮點近似用字串 `potentialBuyersApprox`，因此不放鬆 GameCore 的禁止小數交易回執契約。沒有憑空新增劍庫存、劍交易或遊戲幣。

來源程式 `modern/src/original-b61-sword-demand-event.mjs`，真 Perl 執行 `modern/tests/original-perl/original-b61-sword-demand-probe.pl` 與斷言 `.t`，全路徑 Node 檢驗 `modern/tests/b61-source-sword-demand-live-cas.test.mjs`。本輪編譯器實際 source 值、原版買家需求與市場、原版 EVENT 完整 END+START、真購書→真販售→劍需求啟動→存檔重載→6h嚴格期限→恢復，以及同時活動、未知事件、來源漂移、抽樣缺漏、revision 衝突拒絕都有測試。**最終計數與SHA必須看完成本交接提交後的 Push/PR 同SHA兩條 completed/success；中間CI不得當作最後證明。** 固定 Core/DSL、main、migration 底分支不改，Draft PR #1 不合併，Notion 02／04／05 仍為進行中。

**尚缺、不能說完成**：B61 的200把劍僅是獨立原版來源經濟測試 fixture，沒有真玩家購買/上架/銷售劍；除三種已審查持續 EVENT 之外的其他活動、真正 Perl 當次 `keys(%EVENT)` hash 順序與完整 PRNG、原版持久化事件日誌、自然事件玩家 HTTP/UI、**36小時期末跨期結算**均未實作。下一輪宜將受到需求事件影響的一種劍接通真正市場取得→展示→自然販售的合法來源流程，使需求變動真的影響玩家收入，再逐步打通跨期結算和完整可玩循環。

## 2026-11-22｜B-60 最新開發交接（優先於 B-59 與更早紀錄）

接續 B-59 原版 `plusup-tetu` 真鐵礦脈持續 EVENT，B-60 新增 [原版感謝祭 `happy` NOWFUNC 真商店人氣、活動生命週期與存檔](b60-source-happy-nowfunc-live-cas.md)。固定 Standard Street `@@EVENT code happy` 原文 `start 10%`（編譯 `startproba=100`）、`basetime 5h` + `plustime 5h`，`func _local_` 真正產生成 `event::_local_now`，回呼：`$time=min($main::TIMESPAN,36000)`、`$time=int($time/36)`、對原版事件真商店逐間 `rank+=int(rand($time))` 並封頂10000、`return 0`，不生成 NOWFUNC log。核心實作 `modern/src/original-b60-happy-event-nowfunc.mjs` 嚴格核對完整源碼，透過 B-56 受控同一筆 CAS 先完成真 B-41 書本販售+59項 PLUS，然後原版「舊 EVENT 到期→17個 EVENT 啟動 gate→NOWFUNC」處理；**啟動當片就會增加人氣**，活動持續群組不重抽 gate 但每片再消耗一次 NOWFUNC rand，等於期限邊界仍有效、到期後可當片重新開啟。活動到期時間存入 `period.eventState.happy`，B-43 只允許「鐵礦脈或感謝祭二擇一」的合法單一持續事件；同時兩種活動及陌生鍵必整筆拒絕。舊 `advance-source-time` 與孤立 PLUS 不可略過已知感謝祭真回呼，原 B-41 未審查 `eventState=null` 仍保留未知語義。

**真原版 Perl 驗證**：`modern/tests/original-perl/original-b60-happy-event-probe.pl` 自固定 DSL 真實擷取 `_local_`、暫時生成 `event-n` Perl 函式檔，再讓**原版 `inc-turn.cgi` END+START+NOWFUNC 全段**按真正 `require` 流程執行；用9種情境對照當片新啟動、持續、期限等號、過期未重啟、過期當片重啟、未觸發、60秒 `rand(1)`、60分 `rand(100)`、人氣封頂。原版數值封頂時回執 `festivalRankGain` 必為**實際增加量**（如9999加上抽樣49，最終10000，實際只增加1），raw `rankRoll` 另保留。搭配 Perl `.t` 測試及 Node `b60-source-happy-nowfunc-live-cas.test.mjs` 的真正市場採購、感謝祭 CAS、磁碟載入新 adapter、跨多片人氣成長與過期、未支援事件回滾/舊revision測試。**最終 CI 統計必看最後 HEAD 的 Push 與 PR 兩條同 SHA completed/success**；未確認之前不得聲稱通過。不可修改固定 Perl Core/DSL，也不可合併 Draft PR #1。

**邊界**：EVENT hash 順序仍是受控明示17個 code 的排序與顯式抽樣，不代表原版 Perl 真 hash/RNG；只能有一種已審查持續活動，原版其他 `price/pop/point/plus` EVENT、期間/結束 callback、世界持久化 EVENT log、玩家可操作 HTTP/UI 及真 36h 跨期結算都未實作。下一步建議選**會直接作用於經營銷售價格或商品需求的事件**，核對原版編譯器 `PARAM` 對市場值更新順序；最終再打通跨期與完整遊玩閉環。任務02／04／05 Notion 仍進行中，不要求人工驗收。

## 2026-11-22｜B-59 最新開發交接（優先於 B-58 與更早紀錄）

本輪實際實作 [B-59 原版「發現新的鐵礦脈」持續事件、真批發市場補貨、到期與磁碟續玩](b59-source-iron-event-live-lifecycle.md)。`plusup-tetu` 的原版 DSL（start 10%→編譯概率100、base12h+隨機plus12h、PARAM「鐵塊 plus=720」、開始/結束公告）與固定 Perl 編譯器、DataRead、inc-turn 已逐一來源鎖定。原始鐵塊 ITEM #5 批發 `plus=-20m`；已開始的持續事件，會透過固定 DataRead EVENT file 在**下一次**回合改成 +720 秒正向補貨，仍以原版 59 項 PLUS + 79 項完整 CheckWholeStore + 相同 RNG 與來源稀疏 wire 計算；不回溯修改事件啟動片的批發市場。原版 EVENT 到期採嚴格 `expiry < segmentEnd`，等於時不過期、事件群組不消耗 gate；在過期片內 PLUS 仍受本片開頭 DataRead 的舊活動效果影響，**下片才恢復**原本負向補貨。到期後可以在同片重新啟動新期限，公告 end 先於 start。實際 B-56 受控 `advance-source-time-reviewed-events` 同一 CAS 提交市場+商店+時間+活動狀態；`period.eventState.plusup-tetu` 僅單一安全到期時間，B-43 雙世代真磁碟存檔及**由磁碟重新載入至新 adapter** 續玩已整合，且隔離 PLUS／舊 B-41 不可略過已知活動事件。legacy B-41 未審查事件狀態 `null` 仍保留原先「未知」語義，不宣稱為空表。

**已新增真原版 Perl 直接執行探針＋測試**：擷取固定 `inc-turn.cgi` 完整 END/START 區段，經原始編譯器 `GetItemNumber/GetTime/GetNumber` 核對 `$ITEM[5]->{plus}=720;` 生成式，以固定原版 59 項 PLUS＋CheckWholeStore 真執行 compare baseline vs active；Node 逐項核對，真市場 #10 進貨/上架/自然售出後啟動 B59、存檔重啟續玩、11×1h持續、相等期限、跨片到期、市場補貨還原、非法世界拒絕。完成驗證統計：**應以最後 HEAD 的 Push/PR 同 SHA CI 核定**，不可引用中間 SHA 的運行結果。

**仍未完成**：B-56 `eventHashOrderFixture` 是內部明示 17 code 順序，不是原版 Perl `keys(%EVENT)` 實際迭代與 PRNG；玩家 HTML/HTTP 無新的可用事件按鈕，其他原版持續型 EVENT 的價格／需求／PLUS、FUNCEVENT／END、原版持久化日誌、其他商品及36小時跨期結算均尚未實現。現在不能人工驗收完整商店閉環；任務02、04、05在 Notion 保持「進行中」。保留 `test/task02-baseline-on-s1` Draft PR #1 未合併，不動 main/migration 底分支及固定原版 Core/DSL。下一輪優先擴展真實原版持續事件市場修改與資料重載路徑，然後36h期末結算。

## 2026-11-22｜B-58 最新開發交接（優先於 B-57 與更早紀錄）

**新增完整來源依據的真抽獎卷／開獎受控玩家世界流程**：[B-58 真市場購票與 Perl 真開獎](b58-source-loto-real-ticket-cas.md)。在 B-57 的真 B-40 買#10→上架→B-41來源自然販售及59項PLUS→B-56完整17個 EVENT gate→GameCore CAS 之上，新增真正原版 #11 抽獎卷市場購買（真 DSL 排序貨架、價格2000、持有上限50、批發上限20、進貨600秒），讓已買入的 #11 以原版 COST=10 正確累積自然時間維護費，抽獎事件 `loto` start 50% 編譯機率500，回呼開獎時一次扣除所有抽獎卷、每張各抽 `rand(6096454)`，依來源五層門檻 <1/<6/<216/<10000/<152411 發給 1e9 /1.5e8/5e6/1e5/1e4 金額、上限999999999，回傳0、不建立持續 EVENT、不算銷售。新增買#11原版真 Perl `buy-s.cgi` 探針與原封不動 `loto STARTFUNC` Perl 執行 15 條分支的 Node 嚴格對照，且已通過真世界單筆 CAS／B-43 存檔、續玩第二來源空票開獎、錯來源／漏抽樣／錯範圍／未支援事件回滾測試。

**真 Perl 文字陷阱**：原版 `"抽中了$hit等獎，"` 將 `$hit等獎` 解析成整個 Unicode 變數名稱，Perl 實測輸出「抽中了，10000！」而不是「抽中了5等獎，10000！」；Node 跟隨真實來源，不修正成作者可能意圖的字面。回合 `WriteLog` 目前只回傳 `eventLogEmissions` 於 CAS receipt，尚未寫入原版持久化日誌。

**已驗證**：B-58 程式／測試初步 Push CI Node **871/871**、Perl **1570/1570**，均為0失敗；正式最終 HEAD 若包含本交接文件提交，仍必須重新看**最終 HEAD 的 Push＋PR 兩條同 SHA CI**，不可拿中途 SHA 充數。

**剩餘限制**：依然只有內部 `advance-source-time-reviewed-events` 與 `buy-market-item-11`，沒有玩家 HTTP/UI；`eventHashOrderFixture` 是使用者顯式傳入17個事件 code 的排列，並非 Perl 實際 `keys(%EVENT)` 順序，外部受控抽樣也不是重現原版 PRNG。已移植 manbiki、goutou、getmoney、getpop、loto 五種 STARTFUNC；其餘實際持續事件通過門檻一律整筆拒絕；活動期間／期末回呼、持續 EVENT、世界日誌、36小時跨期結算均未完成。原版 Core/DSL、main、migration 底分支不改；`test/task02-baseline-on-s1`、Draft PR #1 保持未合併，任務02/04/05維持進行中。下一步優先補真正持續事件生命週期及其原版市場影響，然後解鎖36h跨期與玩家完整經營閉環。

## 2026-11-22｜B-57 最新開發交接（優先於 B-56 與更早紀錄）

**本輪已寫入實際程式、Perl/Node 測試和文件**：[B-57 原版資金援助／人氣提升回呼](b57-source-support-events-live-cas.md)。在 B-56 已有的真商店自然販售→59項PLUS→17鍵顯式 EVENT gate，同一個受控 `advance-source-time-reviewed-events` CAS 裡，新增兩個直接影響玩家的原版 `startfunc`：`getmoney` 的30%入口、每店 `rand(1000)<=300` 命中加100000元，受原版 `MaxMoney 999999999` 上限限制；`getpop` 同樣30%入口、單店命中加1000人氣、上限10000。兩者回傳0，不生成活動事件，不把資金援助當自然銷售收入。真 Perl 直接擷取固定 DSL 的兩段完整 `startfunc` 執行，Node 逐案例核對11分支＋連續兩回呼；整合同一真 B-40 進貨／B-41自然販售、GameCore revision CAS、B-43 磁碟存檔重載、錯誤來源／亂數／事件 gate 全部拒絕且不寫入世界。

**完成檢驗**：新來源程式＋測試的 Push／PR 同 SHA CI 已核對 Node **866/866**、原版 Perl **1487/1487** 通過。新文件／交接最後提交仍需以**最後 HEAD 的最新 Push＋PR 同 SHA CI** 確認，不可引用中間 SHA 替代。

**功能邊界不變**：B-56 的 EVENT 排列是由內部來源測試傳入全部17 code 的顯式序列，不等同 Perl `keys(%EVENT)` 的實際 hash 迭代；新回呼也未對外新增 HTTP 或 UI。除 `manbiki`、`goutou`、`getmoney`、`getpop` 與兩個 `startproba=0` 無期限事件外，其餘任何未支援事件若通過 gate，仍整筆拒絕。未知或已有活動事件不能被默認為空；36h跨期仍拒絕；完整原版期末／每期事件尚未完成。工作仍只在 `test/task02-baseline-on-s1`；Draft PR #1 保留，不修改 `main`、遷移底分支及任何固定 Core/DSL。下一階段優先移植會影響實際玩家世界的其餘事件（如 `loto` 的真正抽獎券扣除與獎金），再把完整事件生命週期和原版時間片接入玩家操作閉環。

## 2026-11-22｜B-56 最新交接（優先於本文件的 B-55 與更早紀錄）

在工作分支新增內部來源受控命令 **advance-source-time-reviewed-events**，以真 B-40 商店 #10 原價展示架，在**同一 GameCore 原子 CAS** 執行 B-41 自然販售 → 59項原版 PLUS → 所有17個原版 EVENT start gate → B-55 已用真 Perl 對照的偷竊／強盜即時回呼。所有未移植的其他事件若進入啟動分支，一律整筆拒絕；已知空活動事件表保留空狀態；未知先前活動事件不接受此新命令。**不得把原版 Perl keys(%EVENT) 當 DSL 宣告序列**，故目前必須由測試呼叫者提供完整17鍵的顯式順序與接續亂數樣本；這是內部來源 fixture，**不是**公開自然事件、完整原版 RNG、完整 EVENT 生命週期。B-41 原有玩家命令與 UI 不修改，仍會標記未知 EVENT，36小時跨期仍拒絕。詳見 [B-56 程式、測試與界線](b56-source-event-time-slice.md)。

本階段程式、測試與文件都在 test/task02-baseline-on-s1；PR #1 保持 Draft、不合併；不得修改 main、migration/standard-street-s1、固定 Core/CGI/DSL。**以本輪最後 HEAD 的 Push＋PR 同 SHA CI 為準，若測試失敗必須先修正。** 下一步是讓其他會改變玩家商店與世界的事件有來源對照效果，並讓來源順序、活動到期與回呼在安全條件下接入真正玩家時間片，再推進36小時結算。

# 《商人物語》標準街 Node.js 移植｜新對話接力交接（B-55 真來源偷竊／強盜回呼進 CAS，尚未自然觸發或跨期）

> **用途**：使用者換聊天視窗後，新的助手只需先讀這份精簡可核對的 GitHub 文件，再依目前遠端 HEAD 核對後續工作。**不要**從舊聊天記憶推論最新狀態，也不要把文件內的 CI 數字視為未來 HEAD 的保證。


> **2026-11-21 使用者最新驗收節奏：** 不再每完成一個 B 階段就請使用者確認。直接以「在同一個繁體中文瀏覽器介面從零開店 → 真進貨 → 合法上架 → 自然販售／可連續經營 → 真跨36小時結算 → 真磁碟存檔 → 關閉服務重開載入 → 繼續營業」作為**一次完整的集中人工驗收**；開發中仍須每次提交維持來源 Perl／Node／HTTP E2E、固定 Core／DSL 稽核及最終同 SHA Push／PR CI，不能因延後人工確認而省略自動測試，也不能假稱目前已完整運作。

## 2026-11-22｜B-55 真原版偷竊／強盜 STARTFUNC，直接對照 Perl 並走真 WorldState CAS／存盤

**這次不是多一個孤立的事件欄位清單，而是兩個原版 Perl 回呼的真正商店效果可提交到真 WorldState**：從固定 Standard Street DSL 原樣擷取 `manbiki` 偷竊（`startfunc _local_(400,200)`）和 `goutou` 強盜（`startfunc _local_(700)`），真 Perl 執行；Node 完整核對 10 種有無鎖定、原版機器人#64防禦／遭毀、展示架貨物 `int(stock/10)` 或 `int(stock/4)` 流失、強盜人氣 `rank-int(rank/5)`、訊息、來源 RNG 消耗和返回值 **0（不建立活動事件）**。對於金額文字，Perl 探針使用簡化 `GetMoneyString` 只輸出整數字串，不能假稱原版 GUI 完全相同；商品及人氣直接是固定原版程式真執行的結果。來源漂移、非法商品、超額亂數均拒絕。來源詳見 [B-55 真原版偷竊／強盜 callback／CAS 證據](b55-source-event-instant-callbacks.md)。

新指令 `reviewed-instant-event-callback-fixture` **只提供程式內測與來源引擎組裝**，不開 HTTP endpoint／玩家按鈕，原因是原版17 EVENT 的機率、`keys(%EVENT)` hash順序、群組、所有回呼尚未完整整合，不能讓玩家自行觸發事件冒充原版自然發生。B-55 的整合測試先**真開一間 v2 原版店、真59 PLUS供貨、真市場買#10、合法上架並自然販售、再次市場購貨**，再讓來源強盜回呼對該真商店透過 GameCore `expectedRevision` CAS 扣人氣，完整城市／市場／商店與 B-52 的 EVENT未知狀態不被汙染；**真正 B-43 雙世代磁碟存檔讀回**後，仍能繼續自然售出剩下的 #10。不存在「回呼更新後就不能繼續經營」的漏洞，失敗指令不改版本。10種 Perl 路徑 + Core CAS + 磁碟續營皆在同一次 CI。

**跨原版36小時仍必須拒絕。** 目前只是原版兩種 STARTFUNC 的受控內部 callback，**不是已自然觸發兩事件**；`period.eventState=null` 仍代表其他 EVENT 回呼未審核，不能因 B-55 存在就假稱完整。下一步優先把原版多 EVENT 啟動／過期／callback 及商品 FUNCTURN/FUNCSALE 依真來源順序合入單一時間片 CAS，再與 B-50 同店同城原版期末全段、B-43 原子存檔復原整合；最終玩家 HTTP 真跨期、保存、重啟、下一期再買賣通過才一次集中人工驗收。main、migration、固定原版 Core與DSL保持不變，Draft PR #1 不合併。

## 2026-11-21｜B-54 本機真進貨／自然販售快轉：同世界版本重啟後**無法重抽亂數**

**本輪是實際本機玩家 HTTP 快轉執行層修正，不是新的孤立算式測試**：先前 `dev-local.mjs` 的真來源 B-37（全59 PLUS）與 B-41（市場#10實際買貨、上架、自然販售）每次都用 `crypto.randomInt()` 即時產生新樣本。若玩家在來源世界 `revision=5` 存盤，執行30分鐘自然販售後尚未保存便結束 Node，再從 B-43 存盤重啟並重新執行同版同命令，之前可能拿到**不同**市場、商品或現金結果。B-54 新增 `local-source-command-draws.mjs`，將 `worldId + revision + nowSeconds + command kind + params` 經 SHA-256 domain separated、48-bit rejection sampling 穩定映射為原本 B-37／B-41 接受的百萬分位亂數前綴；仍用真來源已審核的公式，且成功 CAS 會讓下一個 command revision 改變。來源探查同一亂數串流的消耗前綴不會改變輸出；無效 expectedRevision 或未提交命令不能藉重試重新抽獎。**這是明確的本機遷移持久化政策，不是原版 Perl process-rand 的精確種子或事件引擎，也沒有防預測的私有種子**。

[B-43 原有真 HTTP Node／磁碟重啟 E2E](../tests/b43-durable-world-save.test.mjs) 新增 B-54 場景：不用既有固定0亂數測資，真的「新建來源 v2 世界→單店→60分鐘59 PLUS供貨→市場#10真買→來源上架→保存revision5→快轉30分鐘並取得整份世界結果→**SIGTERM殺 Node**→再開 Node／載入快轉前的世代→過期 revision 命令拒絕→同一 revision 再快轉30分鐘→**完整商店／市場／城市／時鐘／EVENT未知標記逐欄一致**→儲存結果→再關 Node／第三次重啟載入依然一致」。同時驗證即使客戶端送出 `randomDraws` 雜訊也不會改變伺服器來源抽樣；舊 CI 固定亂數 fixture 仍保留。獨立 Node 測試檢查穩定性、來源指令隔離與無效要求拒絕。詳見 [B-54 真 HTTP 重啟來源亂數一致性、政策差異與限制](b54-restart-stable-source-draws.md)。

**這不等於完整跨期**：B-53 只確認原版17個會編入的 EVENT 定義，原版 hash 遍歷及真事件回呼、商品 FUNCTURN/FUNCSALE、B-50 同店同城整段期末與檔案副作用、WorldState/磁碟一次性36h結算均尚未接到玩家時間片。B-52 的時間片後 `period.eventState=null` 應繼續表示未知，不能因 B-54 重播一致就說原版事件已正確執行。**跨期仍拒絕**；下一步首要開發仍為真正來源 EVENT/商品回呼與 full period CAS，直到使用者能真跨期→存盤重啟→次期繼續賣才要求一次集中人工驗收。main、migration、固定原始 Core/DSL 不改，PR保持 Draft。

## 2026-11-21｜B-53 原版事件定義編譯清單（25 宣告／17 編入／8 排除；事件引擎尚未完成）

B-53 在已確認 B-52「新世界活動 EVENT 真正空表、時間片後未知」的基礎上，直接依**固定原版 Perl `inc-makeitem.cgi` 的 `GetNumber/GetTime` 原式執行**與 `@@EVENT` 來源編排，將 Standard Street ITEM DSL 的23個 EVENT、rebel DSL 的2個 EVENT 全數投射成 source-reviewed 的 `reviewedEventCatalog`：25宣告中8個 `start -1` 在原版編譯時被排除、15個正機率 EVENT 編入、`rebel`／`guildbattle` 兩個 `start 0` **也會編入並在原版 EVENT 起始處通過零機率分支**。原版 `10%` 對應 `startproba=100`，後續 `start -1` 覆蓋前面的 `start 50%`。Node 逐筆與原版 Perl GetNumber/GetTime 真執行的原始事件資料（code、group、start／重複值、持續秒數、回呼宣告）對照，來源漂移拒絕。每個 EVENT 的動態 startfunc/endfunc/func 仍不透明，不執行回呼；`runtimeSupported=false`，瀏覽器只讀顯示25／17與未接通，不建立假事件、也不承認完整跨期。原版 `keys(%EVENT)` 的 Perl hash 遍歷**不是 DSL 宣告順序**，未來不能把清單依宣告順序跑一次當作忠實事件迴圈。詳見 [B-53 原版可編譯 EVENT 清單與限制](b53-compiled-event-manifest.md)。

**下一步不是再補零散活動清單，而是讓真 EVENT 與真商品回呼進入玩家時間片：** 原版 start/expiry/nowfunc 的亂數、群組、價格／人氣、抽獎、盜賊、叛亂／商會戰副作用必須可 source-verified 與可持久化，再與 B-50 的同城同店真原版期末及 B-43 磁碟重啟串成同一筆安全 CAS 跨36小時，禁止以未知事件為空或反覆重試重新抽獎。**跨期仍必須拒絕**，主分支／migration／原始 Core／DSL 不動，PR #1 Draft 不合併，使用者只有完整可玩閉環後一次人工驗收。

## 2026-11-21｜B-52 原版初始 EVENT 空白欄位的真讀寫 + 時間推進後未知狀態

B-52 直接擷取並執行固定原版 `core-inc-admin-func.cgi` 初次建立的 `play.cgi` 記錄、`inc-func.cgi::DataRead` 的 `%DTevent=split(/,/,$DATA[$idx++]);` 與 `write.cgi::DataWrite` 的 `join(",",%DTevent)` 實際陳述式，證實**新世界 EVENT 執行實例初始空白**，並用單一測試事件 `rebel,123456` 來回寫入／讀回證明 wire 格式（**不是**真玩家觸發叛亂）。B-51 v2 世界改為 `period.eventState={}` 明確表示「新世界尚未開始時間片、來源確認零個活動事件」；保留歷史 B-51 v2 `eventState=null` 的存檔相容，拒絕沒有原版事件執行證據的活動事件 key。B-41 的任何真來源自然販售／59 PLUS 時間快轉**尚未運行 EVENT 迴圈**，因此時間一動 `period.eventState` 會改為 `null`「未知」，不能保留 `{}` 偽稱沒有事件；B-43 真磁碟存檔／關閉 Node 重啟及繁中狀態欄會保留／區分這兩個狀態。來源與限制：[B-52 原版 EVENT 初始化、過期回呼未實作警戒](b52-original-event-state-source.md)。

**下一步真正要打通：** B-48/49 真事件起訖只覆蓋一個合成事件，B-52 只證實新世界初始零活動 EVENT，**都不是25個原版事件與動態回呼已移植**。需先將原版事件與商品回呼按 `inc-turn.cgi` 中的先後次序真正處理並持久化（包含來源 hash 事件迭代、機率／群組、效果與亂數消耗）；不能以事件機率低就直接無視，也不能在某次來源事件抽中未支援的回呼時允許玩家不停重試洗掉事件。再將 B-50 的真來源期末階段接成同一個 v2 WorldState CAS，補原版期末後副作用與可恢復存檔，做真正跨36小時 HTTP → B-43 落盤重開 → 次期續買續售。**目前維持跨期拒絕**，Draft PR #1 不合併。使用者只在完整可玩閉環後一次集中驗收。

## 2026-11-21｜B-51：原版城市／期別初始資料進入真正玩家 WorldState + 磁碟保存（不假決算）

**本輪新增真正瀏覽器可觀察、可存檔的世界資料**，不是再新增一份孤立算式：GameCore `akimono.memory-world.v2` 明確新增受 StreetModule 及本機存檔來源檢查的 `period` JSON 信封；以固定原版 `inc-admin-func.cgi`／`@STATEnamelist`、原版 `period.cgi` 領地欄位、來源36h +3h 時鐘，建立唯一可接受的初始 `town={leader:0,money:0,in:0,out:0,develop:5001,devem:0,safety:5001,safem:0,army:0,robina:2000,robinb:0}`、`dtPeople=500000`、`settledCount=0`、`eventState=null`；目前仍**未來源驗證真 EVENT、也沒有發生過任何結算**。新建世界的真商品進貨、上架、自然販售 CAS 會保留此同一個 `period`，B-43 本機雙世代磁碟保存／結束 Node／重啟載入也一併還原城市。繁中頁面會看到初始城市人口、發展、治安與已結算0期；原版 `v1` 舊存檔仍能讀、存、營業，不默默猜城市將舊存檔升級。讀存對偽造下一期、偽造 EVENT 或修改初始城市值 fail-closed。完整內容：[B-51 城市／期別初始契約與玩家操作](b51-original-period-world-v2.md)。

**B-51 尚未解除跨36小時拒絕。** B-50 只有原版同一商店／城市連續兩個期末**純來源驗證**，未提交真玩家世界。來源商品 FUNCTURN/FUNCSALE、多 EVENT callback、原版 SortDT 與真全部期末、PLUS、檔案效果仍需在合法 v2 WorldState 的 source-authorized CAS 轉場按順序執行；之後再做 HTTP 真跨期→存盤→重啟→繼續真買賣的驗收。嚴禁把來源 `period.eventState=null` 偷改成 `{}` 以假設事件不存在。不要因 B-51 顯示城市資料便宣布完整可玩、完成 Notion 任務或合併 Draft PR；只在使用者要求的完整閉環後一次集中人工驗收。

## 2026-11-21｜B-50：同一份原版商店與城市連續兩期來源結算（尚不可提交）

**本輪比以前獨立的 B-44～B-49 更接近真期末：** 直接從 SHA 固定 `period.cgi` 擷取並執行**整段原版期末前綴**（包含冠軍發獎、商店帳務、期後排序、城市人口／治安、標準街 `UpdateResetBefore/UpdateResetAfter`，止於備份／session I/O 之前），每一期之前仍真跑 Core `GetDTPoint/SortDT`。來源 `@@ITEM` 第10號宣告帶行尾註解，所以原版 DSL 分析器必須包含它。兩期使用**同一個** `$DT[0]`、`$STATE`、`$DTpeople` 及來源79商品上限：第一期禮物卷獎勵5、維持費 `int(17.875)=17` 計入新期支出、熟練度衰減、城市人口更新；第二期保留該獎品與支出、再發放看門機器人1件並依上一期城市狀態重新計算。Node `original-period-solo-chain.mjs` 以**完整商店／城市資料**逐欄對照真正原版 Perl 輸出。詳見 [B-50 來源整合實際程式與邊界](b50-source-same-state-period-chain.md)。

**嚴格邊界：此函式是無副作用的、nonCommittable 來源投射。** 還沒把期末整段放進玩家瀏覽器的真 `WorldState` CAS，也沒有通過期界／落盤後接續販售的 HTTP E2E。原版跨期仍先拒絕。原版正在營業的完整 `inc-turn.cgi` 前段 FUNCTURN/FUNCSALE、多 EVENT 真回呼與順序、龍賽／公會／關店等分支、原版備份與 session I/O 都尚未打通。下一步應以單店完整 WorldState、期別城市／EVENT 可持久化狀態，將 B-50 全段與 B-48～B-49 的**真回呼**安全合併，再證明同一次原子更新不會重複結算，且 B-43 磁碟重啟後可繼續下一期營業。使用者只在整段遊戲真正可玩後一次確認；Draft PR #1 不合併，main、migration 和原版固定 Core／兩份 DSL 不改。

## 2026-11-21｜B-48～B-49 真原版事件啟動／期限先後次序（仍未整合 WorldState）

B-48 新增固定原版 `inc-turn.cgi` 事件啟動區段的真 Perl 執行與 Node 原文審核投射，確認 `startproba=0` 仍先消耗一次 `rand(100000)` 並進入來源觸發條件、同群組阻擋則不消耗、事件具有 basetime/plustime 時再消耗兩次決定到期時刻。固定 `inc-makeitem.cgi` 只排除 `startproba=-1`；標準街 `rebel`／`guildbattle` 宣告 `start 0`，**但尚未執行真正的動態回呼**。B-49 再以真原版 Perl 相鄰的「事件結束→事件開始」兩段對照 Node：到期條件是嚴格 `DTevent到期 < 片尾`，恰好相等仍占群組不重抽；舊事件到期才能刪除及依正常概率重試。六組來源輸出／亂數前綴測資已建立。來源與完整範圍：[B-48～B-49 EVENT 控制流](b48-b49-original-event-gates.md)。

**交接警戒**：B-44～B-47 期末四子階段與 B-48～B-49 事件純來源階段現在**都沒有整合為真 WorldState 跨期 CAS 命令**。目前真 EVENT / FUNCTURN / FUNCSALE、完整領地、商品、活動、事件效果與儲存需要實作並以固定 Perl／Node／HTTP 核對；不可以略過回呼或把單事件合成測試冒充原版全事件。現有36小時跨期阻擋正確、B-43 真本機存讀檔仍可用，未實作部分不得假稱完成。使用者要完整單機可玩閉環後再做一次人工驗收，毋需逐段詢問。Draft PR #1 維持未合併，main／migration／原版 Core／DSL 不動，最新 HEAD Push/PR 要同 SHA 成功。

## 2026-11-21｜B-47 單店原版 SortDT／GetDTPoint + 事件迴圈重要來源邊界

B-47 新增真正執行固定 Core `inc-func.cgi::GetDTPoint` 與 `plug/detail.cgi::SortDT` 的 Perl 探針及 Node 純投射，核對一間有效商店的排行榜分數由原版 `rank`、`profitstock`、當期銷售／稅／進貨及優勝次數等計算，並核對單店的 ID／名稱索引0。這接在 B-44 商店期末帳簿、B-45 冠軍來源獎品、B-46 領地人口三個子階段之外，**仍不代表整個跨期已可提交到 WorldState**。

新確認的下一個必須嚴格審閱的原版依賴：原版事件不是單純可以刪除的隨機裝飾。固定編譯器 `inc-makeitem.cgi` 只排除 `startproba=-1` 的事件；原版 `inc-turn.cgi` 開始事件的條件明文包含 `|| $E->{startproba}==0`，標準街叛亂／公會戰事件 `start 0` 不等於不會處理。因此若沒有真正建模來源的事件載入、回呼、到期與跨期保存，就繼續拒絕不正確的期別提交，不能以事件永遠無事偷渡。完整來源證據見 [B-44～B-47 期末階段](b44-b46-source-period-stages.md)。

## 2026-11-21｜B-44～B-46 真正期末來源驗證（仍未開放跨期）

B-43 已經有單店真 #10 買／賣、磁碟儲存與重啟續營。B-44～B-46 從固定原版來源依正確期末主要階段補上**尚待整合**的純結算區段：
1. B-44 真正執行 SHA 固定 `period.cgi`「前期的資訊保存 → 商品上限 → 維持費結轉 → 熟練度自然減少」Perl 原文，用同組輸入逐欄核對 Node；現金可依原版扣成負數，維持費`int(costtoday)`，新期 `paytoday` 需計入維持費，並非簡單歸零。
2. B-45 真執行 Standard Street `@@FUNCUPDATE::UpdateTodayPrize` 和固定 Core `AddItem`：單店期末第1名9種原版獎勵、`rankingcount++`、商品限量裁切、獎品分類／實際商品名稱不同，和 Node 全類比對。
3. B-46 真執行原版 `period.cgi` 領地調整及無領主 `RebelRobin` 早退分支，核對原版管理員初始城市、人口、發展／治安、守軍懲罰、軍費、破產及下一期兵力，連續兩期的 Node／Perl 比對。

**上述三項都是來源核對的階段，不是已打通的真 WorldState 跨期命令；目前仍在原版 +3h 相位的36小時邊界先拒絕，不篡改商店或城市。** 關鍵下一步：依真 `inc-turn.cgi` 排序，將原版必要 ITEM 回呼、`SortDT`、三個期末階段、其他公會／事件／檔案效果與 PLUS 嵌入一個合法世界 CAS 轉場；保存後重啟也必須能跨期續玩，方可交給使用者一次完整人工驗收。參考 [B-44～B-46 原版來源、公式及未完成項](b44-b46-source-period-stages.md)。工作分支不變，Draft PR #1 不合併、正式任務狀態不提前改動，最終驗收仍需 HEAD Push／PR 同 SHA 綠燈。

## 2026-11-21｜B-43：本機真磁碟存檔、重啟載入後繼續營業

**繼續同一分支與 Draft PR #1；完整可玩目標仍是原版真跨期決算 + 可持續營業。** B-43 加入 `modern/src/local-world-save-store.mjs`、原版繁中 UI 的「儲存世界／載入存檔」按鈕與後端 `/api/save`、`/api/load`。保存原版合法市場入庫與自然販售後的完整 WorldState，使用兩個有來源驗證、世代編號、SHA-256 偵錯、同目錄原子替換的磁碟存檔槽，支援停止 Node、重啟、載入、再次真購買與自然售出；損毀最新世代可回復上一個可驗證世代。詳見 [B-43 存檔、操作與限制](b43-durable-local-save.md)。尚未按儲存的進度會在服務關閉後遺失，沒有默默自動存檔；不是原版 Perl 存檔格式，也不是安全多人資料庫。

**下一主線仍是原版跨36小時決算。** B-42 先前更正的 JST9h - 日期修正6h＝**+3h** 邊界必須保留。源碼 `inc-period.cgi` 包含商店／市場／領地／人口／排名／事件／公會等期末效果，目前 WorldState 沒有可合法執行全部效果的真實欄位，仍必須禁止跨期，不能因為磁碟存檔完成就稱作完整遊戲。先補原版真正期末來源合約與 Perl／Node／HTTP 閉環，然後才擴商品與其他街道；維持 main／migration／原版 Core／DSL 不修改、不合併 PR。最終 CI 請以此文件所指的最新遠端 HEAD 的 **Push／PR 同 SHA** 驗收，不能套用較舊成功報表。

## 2026-11-21｜B-42 前段最新交接：兩輪真買入／真販售，保留原版時間邊界

已在 `test/task02-baseline-on-s1` 擴充 B-41 來源世界：第1次真市場買入 #10→合法原價展示架→自然販售，透過第一次自然時間片的59項來源 PLUS 更新後的真批發，再買 #10→第2次自然販售；可繼續對無庫存展示架快轉而不造出假銷售。固定原版 Perl／Node／HTTP E2E 對照資金100000→95000→100000→95000→100000 G、庫存0→1→0→1→0、`saletoday/paytoday=10000`、`itemtoday[10]=2`、人氣、持有費小數與原版79欄市場／CSV。修正原版架上有商品但庫存0仍令 `temprank=rank+1000`。

**必須沿用的原版邊界修正：** `inc-turn.cgi` 期別時間是 JST9小時 **減** `DATE_REVISE_TIME` 6小時，亦即 36小時期別偏移 **+3小時（10800秒）**；B-41 原來的9小時判定錯誤，B-42 已按固定 `_config.cgi` 來源鎖定與修正。現有原版繁中 UI 在上方顯示距下次決算；**跨期仍拒絕**，不是完成決算。B-42 Perl/Node/HTTP 與操作步驟：[B-42 經營兩輪驗收](b42-continuous-playable-loop.md)。

**下一步優先：原版真跨期結算**。需處理 `SortDT`、期末帳簿、完整 `inc-period.cgi` 涉及的領地／人口／公會／事件與必要回呼、世界狀態表示及可用 UI。不可把現有 B-19/B-20 孤立結算抽取當作完整期末；之後再做真磁碟存讀檔。維持原版 Perl／Node 對照、HTTP E2E、同 SHA 雙 CI，main／migration／原版 Core／DSL 不改，Draft PR #1 不合併，正式任務狀態不提前完成。

## 2026-11-21｜B-41 最新交接：真 #10 上架、來源自然販售與本機快轉

**已寫入工作分支，仍須以最終 HEAD 的 Push／PR 同 SHA CI 確認。** B-40 的真市場進貨已在同一記憶體 WorldState 上延伸至：初始化來源世界 → 開店 → 原版 59 項 PLUS 供貨子步驟 → 實際購得商品 #10（價格 5,000 G） → 倉庫使用現有 `edit-showcase` 合法第 1 架上架（單價 5,000 G、原版行動時間 600 秒） → 在店內快轉 1～60 分鐘，執行已審閱的原版自然販售區段，接著原版 59 項 PLUS／CheckWholeStore，並在同一個 CAS 世界提交資金、商品、人氣、今日銷售、供貨與 `nowSeconds`。**沒有人工灌入 #10**；原版 Perl 測試直接用 `buy-s.cgi` 與 `sc-s.cgi` 原始程式再接真 `inc-turn.cgi` 來源銷售片段。見 [B-41 完整對照、驗收與保留限制](b41-real-market-showcase-natural-sale.md)。

**使用者要求的快轉已加在現有原版風格介面**（`自店 > 店內`），有 **1／10／30 分鐘與 1 小時**快捷、**自填 1～60 分鐘**。不更動 B-40「交易」主選單／表格緊湊樣式；原版來源是依「秒數 `$timespan`」而非固定列舉選項執行，所以 1／10／30／60 是 UI 操作便利值，**不是冒稱為原版限定選單**。每次最多60分鐘，跨未實作的36小時結算邊界拒絕，不暗中跳過結算。此前 B-40 單獨「供貨子步驟」仍獨立，不推進時鐘。

**現況邊界：** 新 B-41 動作僅單店、商品 #10、合法原價架位、記憶體世界；銷售是否發生依原版抽樣，不保證每片都有成交。來源檢驗的正向測資為 30 分與 60 分；現有 GameCore 可保留原版 `costtoday` 小數，但正式期末結算尚未驗收。固定原版商品 DSL／Perl／Core 20 份、main、migration 均不可修改。沒有執行 FUNCSALE／FUNCTURN 通用回呼、跨店排序、跨期 `inc-period.cgi`、存讀檔、認證或多人；**此限定來源片段並非完整原版 `inc-turn.cgi` 真營業週期，也不代表已通用化的可玩閉環**。

**下一個 B-42 優先工作：** 以 B-41 已能在原版風格 UI 完成的真 #10 進貨／上架／販售為基礎，先解除「賣出一件後仍可繼續經營」的來源審查限制，依必要原版回呼及轉場順序補足可連續兩輪營業與期末結算；再完成可靠單機落盤、關閉服務重啟／載入後繼續經營。不可倒退成只做孤立 Perl 測試。按此文件、[優先序計畫](playable-loop-priority-plan.md)與最新版 HEAD 的真 CI 繼續，所有正式任務狀態維持現狀。

## B-40 使用者 UI 回饋與已提交的視覺修正（2026-11-21）

使用者在 Windows 實測時指出 B-40 灰綠 dashboard 卡片配色與實際原版《商人物語》印象差異過大，並要求直接 commit 以便預覽。已直接在 `test/task02-baseline-on-s1` 重排 `modern/local-ui/index.html`／`style.css`／`app.js`：以固定 `sindex.html`、`smain.html`、`custom/inc-menu.cgi` 為依據，恢復「自店／取引／情報／施設／交流」主選單及次選單、白底淡紫白表格、淺綠標題、淺黃選取提示、緊湊店舖資訊；世界 ID/revision/收據改成可展開的測試區。僅店內、倉庫、真市場進貨 #10 開放操作，其他分類與功能停用且如實顯示；未複製任何原始圖片或音樂。原版 Perl/DSL／GameCore／市場來源與交易 API 均未修改。HTTP E2E 已調整檢查選單、CSS 與真交易，詳細參考 [原版介面與 B-40 視覺修正](original-ui-reference-for-local-test.md)。

**下一步：** 先讓使用者在本機 `cd modern && npm run dev:local` 實際預覽，確認色彩與資訊配置；若有他的歷史伺服器截圖以截圖優先作局部修正，再依原計畫 B-41 在相同原版風格 UI 開發真正上架／自然販售。仍保留 Draft PR #1，不合併、不可修改 main/migration；只採用最新 HEAD 雙 CI 作回歸證據。Windows CRLF 讀取修正亦保留。

## B-40 後續修正｜Windows 原版來源 CRLF 啟動相容

Windows Git 的 `core.autocrlf` 可能使固定原版 CGI/DSL 在工作目錄成為 CRLF，B-34 仍以 `sub init\\n` 原版 LF 字串逐字核對，導致 `npm run dev:local` 啟動時在 `reviewOriginalSparseWorldBootstrap` 報 `fixed admin init source drift`。已在 `modern/src/local-source-text.mjs` 建立僅針對本機讀取結果的 CRLF→LF 正規化，`modern/scripts/dev-local.mjs` 對12份 CGI／DSL 來源輸入套用；禁止孤立 CR，原始檔、SHA、規則、審閱守門及分支沒有更改。新增 `modern/tests/local-source-text.test.mjs` 模擬 Windows 12份來源，實際核對可初始化真 StreetModule／GameCore 與開店；竄改原版內容仍然拒絕。

Windows 工作樹請先確認 `git status --short`，在 `test/task02-baseline-on-s1` 執行 `git pull --ff-only origin test/task02-baseline-on-s1`，再 `cd modern && npm run dev:local`。**不要重設工作樹、不要修改固定 CGI 來排除這個錯誤。** 手動／CI 詳情見 [B-40 本機操作文件](b40-local-browser-market-buy.md)。下一 B-41 上架→自然販售優先序不變；每次驗證以最新 HEAD Push/PR 同 SHA CI 為準。

## 2026-11-21｜B-40 最新開發交接（以下取代本檔 B-39 的「下一個 B-40」舊描述）

**新增加的真正玩家動作：** 在 Node 本機伺服器開啟 [可操作繁中介面](../local-ui/index.html)，經「初始化原版空白來源世界 → 開店 → 原版59項 PLUS 供貨子步驟 → 市場購買商品 #10 書本寫作工具 → 查看同一世界現金、倉庫與批發更新」。店內、市場、倉庫三頁籤由 [dev-local.mjs](../scripts/dev-local.mjs) HTTP API 接至 [GameCore／StreetModule／WorldState](../src/standard-street-module.mjs)，不是獨立 JSON demo，未實作功能停用。詳細 [B-40 執行／成功與拒絕操作、來源 Perl／Node 檢驗](b40-local-browser-market-buy.md)。

- 本機：`cd modern && npm run dev:local`，`http://127.0.0.1:4173`（僅 127.0.0.1）。Node 22+，關閉 Node 服務即失去世界；目前沒有正式存讀檔。
- 新來源審閱交易模組 [original-market-buy10.mjs](../src/original-market-buy10.mjs) 唯一開放 `buy-market-item-10`：商品 #10 原版 DSL 價格5000、持有上限20／每店批發上限10、單次市場交易時間600秒、原版可成交量縮減，以及商品／金錢／支出／行動時間／批發 sparse CSV 的單次 CAS 變更。別店、其他物品和 callback 尚未開放。
- 原版供貨不是人工插入：保留 B-34 初始市場空 CSV，經 B-37 真 `PLUS` + `CheckWholeStore` 抽樣運算，提供 60、600、3600 秒的**獨立來源子步驟**。**不**推進 WorldState 時鐘、不做自然販售／完整決算。隨機抽樣不是聲稱可重現 Perl 的 RNG 序列。
- [原版 Perl 的 buy-s.cgi 執行探針](../tests/original-perl/original-market-buy10-probe.pl)、[Node 回歸及實際本機 HTTP E2E](../tests/original-market-buy10.test.mjs) 核對無貨拒絕、有貨成交、扣款、庫存、批發、CAS 及可從 HTML 操作的 API。每次仍**必須依最新 HEAD 的 push/PR 同 SHA CI 結果**判斷是否完成驗收；不要用較早 B-39 CI 或中間紅燈／綠燈代表最終狀態。
- 正式任務 02／04／05 仍在進行中；此階段未完成商品完整 USE／自然販售／真正原版週期、CGI、認證、磁碟持久化、多人。原版20份 Core source SHA 和 DSL、main、migration 底分支保持不修改；Draft PR #1 保持開啟且不得合併。

**下一個玩家操作優先 B-41：** 使用本機介面內真購得的 #10，依來源現有 `edit-showcase` 及 B-38 reviewed natural-sale 投射路徑，在相同 WorldState 連接「庫存真上架 → 自然販售 → 現金與庫存變更」；只補阻擋這條鏈的原版必要回呼與時鐘處理。接著依順序接「完整週期結算 → 可重啟讀取的單機存檔」。不要回去做 B-40 以外零散原版細節。

## 最新工作界線

- GitHub repo：**`Prysline/akimono`**。
- 正式工作分支：**`test/task02-baseline-on-s1`**；Draft PR [#1](https://github.com/Prysline/akimono/pull/1)，base **`migration/standard-street-s1`**，**不得自行合併、不得改成 Ready for review**。此分支是唯一要接續的實作位置。
- 固定原始主分支 `main` 的已核對 SHA 為 `7301b0c2b1e27226d1770e153fa3c68cfeae6d48`；固定底分支 `migration/standard-street-s1` 已核對 SHA `585c77ba247510bcf3f22cf24c0c277b68d7d5a4`。**不得修改**原始 `main`、遷移底分支、原版 Core/CGI、`custom/inc-item-data.cgi`、`custom/inc-rebel-data.cgi`。
- 固定上游 Core：`katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`；兩份街道 DSL 固定 Git Blob SHA：商品 `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`、叛亂 `923634e58a05beca9ab004515fc7669d53a1ba3a`。
- `modern/tests/original-perl/` 已鎖定**20份來源原樣 Core 快照**（原18份＋B-34 原始管理員 `core-inc-admin-func.cgi` Blob `2164b7e5abfea7a466235a8deba1543c2cc41515`＋B-38 固定 `core-detail.cgi` 原版 `plug/detail.cgi` Blob `9a83d26fb29edee4032958f1e6de837a250f3384`）；GitHub Actions 逐份以 `git hash-object` 核對。
- 正式 Notion 12 任務：**01已完成；02、04、05進行中；其餘8項待辦**，非遊戲完工比例。任務02： https://app.notion.com/p/41db4185273f818f97d4fce172db36f8 ；任務04： https://app.notion.com/p/41db4185273f81288606d7d5a4375794 ；任務05： https://app.notion.com/p/41db4185273f812ea949dfcaf7c2def9 。

## 已真正實作與驗證的核心路線

1. B-01～B-30：原版商品上限、原版世界欄位與鎖／備份／寫入、原版市場／批發／時間／商品交易核心數值、部分原版回呼／實際 Perl 隔離；原版異常只記錄 [`original-behavior-issues.md`](original-behavior-issues.md)，**不可偷偷修復**。
2. B-31：純記憶體 `GameCore/StreetModule/WorldState`，嚴格 `revision`、`compareAndSwap` 與 JSON 快照，`standard-street` 最早只支援 `open-shop` 和 `edit-showcase`；不是真正磁碟／資料庫／多人遊戲。
3. B-32：人工A/B/C商品的來源 Perl `UseItem → lostbook` 連續兩次交叉驗證，**不代表**真實標準街 ITEM #1/#2/#3。
4. B-33：第一筆**真正**標準街 `ITEM #79 gift 禮物卷 / USE.no=0 交換地圖集`：消耗2張禮物卷，產出 ITEM #12 山區地圖、#9 礦山地圖、#14 劍市地圖各一張；固定原版編譯器 `ItemUseTimeRate=0.5` 令原始 `time 1h` 編成 `time/exptime=1800秒`，無自訂回呼、無熟練度、無金錢成本。原版商品上限79項已跨語言核對。當時因市場未驗證，僅限**明示人工批發全0**測資。
5. **B-34：** 追查到固定 Core `inc-admin-func.cgi::init` 第一次建立世界資料時，**批發庫存第三行是空字串**，而不是79個明文0；`inc-func.cgi::DataRead` 的 Perl `split` 得到**長度0稀疏陣列**。新 `original-admin-world-bootstrap.mjs` 只有在明確提供**原版管理員、讀取、寫入三份原文**且來源結構一致時，才允許對**空世界 `revision=0`** 執行選用 `initialize-source-market` 命令。它保存 `originalWholesaleCsv=''` 和 `sparseWrittenSlots=[]`，另外保留79格供數值運算的0視圖。B-34 使用真正原版 Perl `print DATA time()...` 子句（只在 scalar 記憶體把手執行，不跑整個 admin init）及完整原版 `UseItem` 核對後，將來源市場真正接到 B-33 的 `gift-exchange-maps`：在空世界初始化、真實標準街開店、連續兩筆交換後，庫存禮物卷 `5→3→1`、三種地圖各 `0→1→2`、世界版號 `0→1→2→3→4`。原版批發陣列只賦值位置78時，`DataWrite join` 文字是**78個逗號＋末尾一個0**，不是79個字面0；超限地圖會另寫位置8、11、13。詳見 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)。
6. **B-35：** 對已來源核對的 B-34 初始稀疏市場，實作**限定商品 #10 `book-make` 的 PLUS 20m**；Perl 真正抽取固定 `inc-turn.cgi` PLUS 原文迴圈、只把其他商品 PLUS 設為明示測試0，並直接呼叫完整固定 `whole.cgi::CheckWholeStore`。來源人口500000、MAX_USER=50、單一真新店、亂數抽樣由外部提供；三個受限後銷售時間片 `60/60/600秒` 的商品 #10 批發 `0→1→2→10`，記憶體版本 `2→3→4→5`。商品 #79 原版限額修正額外明確寫下索引78的0，證實稀疏CSV只定義索引9和78。**完整其他商品 PLUS、自然銷售／回呼／時間流逝／決算皆未執行**。詳見 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)。
7. **B-36：** 保留固定原版 `inc-turn.cgi` 的**完整 PLUS 迴圈原文片段**及 `plug/whole.cgi::CheckWholeStore`，在 B-34 空白稀疏市場與一間真實標準街新店上，只啟用三個固定來源商品：#1 藥草 `-20m`、#10 `book-make +20m`、#40 木刀 `-1h`。**其餘76項原版 PLUS 明示人工設0**，不是完整原版週期。原始 `DTpeople=500000`、`MAX_USER=50`，亂數百萬分位外部注入；三段來源時間片 `60/60/600` 秒讓商品 #10 批發 `0→1→3→10`，#1/#40 扣到負數後依原版 `CheckWholeStore` 歸0。批發 CSV 稀疏寫入索引 `[0,9,39,78]`，其餘空槽不補成0。另有**明示人工正庫存**的獨立扣貨 fixture 證實 #1 `20→19`、#40 `10→9`，不可誤稱是真實開服市場。Node `reviewed-sparse-multi-plus` 支援三筆 CAS 版本 `2→3→4→5`；沒有更新真世界時鐘、銷售、回呼、事件或持久化。詳見 [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)。
8. **B-37：** 固定標準街 DSL 共79 ITEM，依專案 `parseDsl` 與原版 `inc-makeitem.cgi::GetTime` 核對 **59項有 PLUS、20項無 PLUS 而由編譯器預設0**；初次快速掃描漏掉 #16「皮革加工入門」、#17「木工加工入門」的 `PLUS 20h`，現已訂正並納入79格固定來源清單。真原版 Perl 直接編譯59項，執行固定 `inc-turn.cgi` 原文 **PLUS 迴圈**及完整 `whole.cgi::CheckWholeStore`；Node 選用命令 `reviewed-sparse-all-plus` 必須另外提供並核對固定原版編譯器才開啟。真原版管理員批發初始空白 CSV、單間標準街新店、人口500000／MAX_USER50；三段受控後銷售時間片60／600／3600秒及明示 `rand` 消耗，全部79數值欄、**60個有定義的稀疏欄位**與 Perl 原文 CSV 逐項一致。#10 首60秒0→1，後續受上限10約束；`revision 2→3→4→5`，世界時鐘、商店與事件不更新。另有商品 #79「交換地圖集」先交易、後接全商品 PLUS 的受控整合測試。**未執行前段自然販售、回呼、完整時間／結算／CGI／檔案／多人**。[B-37來源與限制](reviewed-original-sparse-all-plus.md)。
9. **B-38：** 固定原版 `inc-turn.cgi` 的「店舗・商品別来客数計算處理」至「@@item 処理準備」前**自然販售原文區段**，直接執行固定原版 `plug/market.cgi::GetMarketStatus`、`plug/item.cgi::GetSaleTax` 與新增20th不改原文 Core 快照 `plug/detail.cgi::GetUserTaxRate`（Blob `9a83d26fb29edee4032958f1e6de837a250f3384`），然後**跳過**原版商品 FUNCTURN/FUNCSALE 回呼、`SortDT`、期末決算，再執行真正原版59項 PLUS 迴圈及完整79項 `CheckWholeStore`。**這是隔離的兩個來源區段串接，不是真完整週期。** 在真原版管理員初始空白批發、人口500000／MAX_USER50、只有一間新店、1728秒人工時間片下，真新店空展示架：售0、金錢100000、人氣5009、共消耗72筆 rand。另**人工**新增 #10 書本寫作工具1個且以5000上架（**沒有真的執行購買或入庫**）：原文販售確實售1、金錢105000、人氣4915、當期售額5000、稅0、`trush=5001`，自然銷售3筆 rand 再接 PLUS 72筆 rand，合計75筆；兩個案例最後稀疏市場60格定義，Perl／Node 的79格 CSV 和世界狀態一致。重要測試器根因：B-33 `OriginalGiftMapUseHarness` 只留 `code/name/scale/limit/wslimit`，不含 `price`；B-38 已由原版 `GetBuffer` 編譯 `ITEM#10 price=5000`、`pop=20d`、`point=200000` 與維持費，**不是修原版公式**。詳見 [B-38 來源與限制](reviewed-original-natural-sale-plus.md)。
10. **B-39（最新）：** 在原版固定標準街79 ITEM 中，**僅 #70 那由多的項鍊**宣告 `funct _local_`：標準價50000、`pop 2d`、`point 20000`、持有成本200、`PLUS=0`、批發限額0。隔離 Perl 直接使用**真正原版行內 callback 主體**，再由固定 `inc-turn.cgi` **原版 FUNCTURN 逐項派送迴圈**選擇持有商品的店家；只有第一展示架 #70 且售價不高於50000才加人氣，依 `TIMESPAN/86.4` 取整或以原版 rand 進位，上限10000。獨立來源測試：60秒 rand0→+1、999999→0，標價50001不加，初始人氣9980→10000。新來源固定8640秒人工時間片（B-37 對外原有最長3600秒**不變**）在單店依原版自然銷售→真 FUNCTURN→原版59項 PLUS／全79項上限：真新店空展示架售0、人氣5007、成本5、rand60次、稀疏市場60格有定義；**人工增加1件 #70 並以50000上架**、以明示rand保留庫存後，原版自然人氣5007再由回呼+100至**5107**、成本7、總 rand61次、稀疏市場61格有定義。Perl/Node 79欄批發、CSV、財務與亂數對照一致。**跳過其它商品回呼、FUNCSALE、SortDT、結算、真進貨、真時間、磁碟與CGI**。見 [B-39 原文測試與界線](reviewed-original-nayuta-functurn.md)。
11. **程式驗證 HEAD** `0265bd0a632b6567ebbfbfd33e9ff6c27f15fcd3`：[push CI](https://github.com/Prysline/akimono/actions/runs/44878580737)、[PR CI](https://github.com/Prysline/akimono/actions/runs/44878586451) **同 SHA success**，**807／807 Node、1138／1138 原版 Perl（32個 `*.t`）**，20份 Core Blob SHA、2份 DSL audit 均成功。**文件後續 HEAD 必須重新核對同 SHA 的兩份 CI。**

## 讀檔順序（新對話必做）

在新的對話中使用**已連接的 GitHub App／工具**，依序查看：
1. [Draft PR #1](https://github.com/Prysline/akimono/pull/1)（**讀回最新 head_sha、draft、merged、base**）與 [本交接文件](next-window-handoff.md)。
2. [`reviewed-original-nayuta-functurn.md`](reviewed-original-nayuta-functurn.md)（B-39）、[`reviewed-original-natural-sale-plus.md`](reviewed-original-natural-sale-plus.md)（B-38）與 [`reviewed-original-sparse-all-plus.md`](reviewed-original-sparse-all-plus.md)（B-37）與 [`reviewed-original-sparse-multi-plus.md`](reviewed-original-sparse-multi-plus.md)（B-36）與 [`reviewed-original-sparse-plus-turn.md`](reviewed-original-sparse-plus-turn.md)（B-35）與 [`reviewed-original-sparse-market-init.md`](reviewed-original-sparse-market-init.md)（B-34 來源初始化）；[`reviewed-real-gift-use.md`](reviewed-real-gift-use.md)（B-33 真商品）；[`migration-progress-and-next-milestones.md`](migration-progress-and-next-milestones.md)（正式里程碑）。
3. [`original-nayuta-functurn.mjs`](../src/original-nayuta-functurn.mjs)、[`original-natural-sale-plus.mjs`](../src/original-natural-sale-plus.mjs)、[`original-sparse-all-plus.mjs`](../src/original-sparse-all-plus.mjs)、[`original-sparse-multi-plus.mjs`](../src/original-sparse-multi-plus.mjs)、[`original-admin-world-bootstrap.mjs`](../src/original-admin-world-bootstrap.mjs)、[`reviewed-gift-map-use.mjs`](../src/reviewed-gift-map-use.mjs)、[`standard-street-module.mjs`](../src/standard-street-module.mjs)、[`game-core-contract.mjs`](../src/game-core-contract.mjs)。
4. [`OriginalNayutaFuncturnHarness.pm`](../tests/original-perl/OriginalNayutaFuncturnHarness.pm)、[`original-nayuta-functurn.t`](../tests/original-perl/original-nayuta-functurn.t)、[`original-nayuta-functurn.test.mjs`](../tests/original-nayuta-functurn.test.mjs)，以及 [`OriginalNaturalSalePlusHarness.pm`](../tests/original-perl/OriginalNaturalSalePlusHarness.pm)、[`original-natural-sale-plus.t`](../tests/original-perl/original-natural-sale-plus.t)、[`original-natural-sale-plus.test.mjs`](../tests/original-natural-sale-plus.test.mjs)，以及 [`OriginalSparseAllPlusHarness.pm`](../tests/original-perl/OriginalSparseAllPlusHarness.pm)、[`original-sparse-all-plus.t`](../tests/original-perl/original-sparse-all-plus.t)、[`original-sparse-all-plus.test.mjs`](../tests/original-sparse-all-plus.test.mjs)，以及 [`OriginalSparseMultiPlusHarness.pm`](../tests/original-perl/OriginalSparseMultiPlusHarness.pm)、[`original-sparse-multi-plus.t`](../tests/original-perl/original-sparse-multi-plus.t)、[`original-sparse-multi-plus.test.mjs`](../tests/original-sparse-multi-plus.test.mjs)；原有 [`OriginalSparseWholesalePlusHarness.pm`](../tests/original-perl/OriginalSparseWholesalePlusHarness.pm)、[`original-sparse-wholesale-plus.t`](../tests/original-perl/original-sparse-wholesale-plus.t)、[`original-sparse-wholesale-plus.test.mjs`](../tests/original-sparse-wholesale-plus.test.mjs)，以及 [`OriginalAdminBootstrapHarness.pm`](../tests/original-perl/OriginalAdminBootstrapHarness.pm)、[`original-admin-sparse-market-probe.pl`](../tests/original-perl/original-admin-sparse-market-probe.pl)、[`original-admin-sparse-market.t`](../tests/original-perl/original-admin-sparse-market.t)、[`original-admin-sparse-market.test.mjs`](../tests/original-admin-sparse-market.test.mjs)。
5. GitHub Actions **同 SHA 的 push / PR 兩份 CI**、`modern/package.json`、`verify-modernization.yml`，確認既有測試與所有20個 Core source SHA、兩份 DSL audit 完全成功，再開始新的修改。

## 原版 UI 參考與後續實際操作驗收

**使用者補充：可參考原始介面。** 先讀 [原始標準街介面來源與 B-40 測試 UI 對照](original-ui-reference-for-local-test.md)：已核對標準街 `sindex.html`／`smain.html`／`custom/inc-menu.cgi` 與固定原版 Core `inc-main.cgi`／`stock.cgi`／`shop-m.cgi`／`sc-s.cgi`。B-40 本機繁中測試 UI 優先保留原版自店／市場／倉庫選單、店內金錢／人氣／時間資訊、商品價格／可購量／庫存與架位操作；改善表格可讀性，不直接復用無授權圖片或舊 CGI 密碼/憑證。後端資料與功能仍以原版來源驗證及真 Game Core 命令為準。

## 現行工作順序：先完成可玩的經營閉環

**以 [現行工作優先序與最小可玩閉環](playable-loop-priority-plan.md) 為後續開發優先依據。** 使用者已明確要求「紀錄應有的順序和工作規劃，不要老是追究小細節」。**下一輪 B-40 必須同步建立實際可啟動的繁體中文本機瀏覽器測試介面與真正進貨，讓使用者可以點選操作、觀察扣款／庫存／市場、查看失敗原因**；後續在同一 UI 逐步加上上架／販售、必要回呼與結算、真存檔，最後整理正式繁中網頁，再做麵店和多人。原版 Perl／Node 比對照舊，但僅擴張足以驗證當前功能的規則；不再只為了另一項函式或斷言數而開新階段。

## 歷史紀錄：B-40 開始前的精確目標（已進入程式階段，最新狀態見本檔開頭）

B-39 已有真正 ITEM #70 FUNCTURN 回呼的原文隔離驗證，不是玩家可以自行購買的完整遊戲。**B-40 第一優先是可啟動的本機測試 UI＋原版真市場進貨 ITEM #10**：以固定 `buy-s.cgi`／市場與批發來源實際完成付款、購買、庫存更新，接現有 `WorldState`，並驗證至少一筆成功與拒絕路徑。完成後直接把真庫存接展示架與自然販售。**本輪必須有實際可執行的啟動指令（規劃 `npm run dev:local`）、瀏覽器網址與手動成功／拒絕測試步驟，並把畫面資料接真 Game Core／WorldState；不能只有 JSON demo 或測試輸出。** 原版市場初始若沒有 #10 貨源，必須先經合法供貨來源才能購買，不得灌入人工貨源。**只在目前真閉環必要時**才補 FUNCSALE、SortDT 或期末結算；其餘未相關回呼、事件／115 USE 暫不擴大。不更改原版來源／分支、維持双 CI；不能因測試固定秒數、人工庫存就聲稱可玩。

**未完成且不得聲稱已完成：** 所有商品使用、完整週期／市價／自動販售、真正磁碟讀寫／鎖／備份／回滾、密碼認證、HTTP、繁體中文可玩前端、其他街道、多人世界。所有 B-39 `WorldState` 操作仍只在**記憶體**中，初始化命令並非真實玩家行為或安全的原版遊戲管理操作。

## 新視窗起手提示（B-41 起直接複製）

```text
繼續《商人物語》標準街 Node.js 現代化。先連接 GitHub 的 Prysline/akimono，讀取 test/task02-baseline-on-s1 最新 HEAD、Draft PR #1 的 Push／PR 同 SHA CI，優先閱讀 modern/docs/playable-loop-priority-plan.md、modern/docs/original-ui-reference-for-local-test.md、modern/docs/next-window-handoff.md 及 modern/docs/b40-local-browser-market-buy.md。B-40 已在同一 GameCore／StreetModule／WorldState 加入真正商品 #10 市場進貨和可執行繁中本機 UI：cd modern && npm run dev:local，瀏覽器 http://127.0.0.1:4173；若 CI 紅燈先修正，不把失敗當成功。B-41 起直接擴充同一個 UI 的真上架→自然販售，使用上一步真正買到的商品庫存。再完成週期結算與可重啟的單機存讀檔。不要以獨立 JSON demo、人工貨源或拆散的測試取代操作閉環；尚未完成的功能必須明確停用。B-37 真 PLUS 目前只是抽樣供貨子步驟，不得假稱有真時鐘或完整週期。只在目前玩家路徑需要時補原版回呼、SortDT 等細節，原版 Perl／Node 比對與 Push／PR 雙 CI 繼續跑。main、migration/standard-street-s1、固定 Core/CGI/DSL 不修改，Draft PR 不合併；更新 GitHub 文件與 Notion，提供可實際操作的繁中成功／拒絕步驟。
```

**本檔先前 B-39 數值、CI、B-40 開發要求為保留的歷史紀錄；以最新遠端 HEAD 和本檔開頭的 B-40 交接為準。**
