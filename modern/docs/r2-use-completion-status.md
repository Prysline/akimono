# R2 原版商品 USE／製作補完狀態（平行支線）

- R2 支線：`work/r2-use-completion`，由 R4 初始 `8cf56395cceba89464a9b7dfbd4c5b00a57e6b5a` 建立。
- R4 合併目標：`test/task02-baseline-on-s1`；僅透過獨立 **Draft PR #2** 進行預整合驗證，未合併。原有 Draft PR #1、R4 分支與 Notion 任務狀態不變。
- 受控來源範圍：變更只在 `modern/`；凍結的 `custom/*.cgi`、Perl、DSL、Core 不修改。
- **原版宣告：79 ITEM／116 USE。** 本分支 `getRule` 目前有 **52 項**（舊 6 項＋#10／#37／#39 共 31 項＋#12／#9 採集 7 項＋#15／#16／#17 製作 8 項）；其他 **64 項** 屬於「原版宣告存在但尚未接入」，不能標為原版不支援。逐筆詳見 `r2-use-completion-gap-inventory.md`。

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

### ITEM #15／#16／#17：八項來源製作（本輪新增）

- 已接入原版 #15 藥劑調和 USE 0、2（治療劑／乙太，後者要求 200 點熟練度）、#16 皮革加工 USE 0、1（皮盾／皮胸甲）、#17 木工 USE 0～3（木刀／木杖／木盾／木胸甲），合計八項。來源宣告及職業倍率直接由既有 `reviewed-declarative-use-compiler.mjs` 解析，通過共同 GameCore `use-item`，製作書必須真正持有；缺少材料、時間、資格的指令不寫入世界。
- #15 USE 1、3、4 原版使用 `func lostbook`，仍保留拒絕。編譯 #15 USE 2 時，由原版 GetBuffer 讀過前面的宣告但不執行其回呼；真 Perl 與 Node 的單次製作、材料消耗、產量、時間、熟練度和藥屋／防具屋／武器屋縮時都有差分測試。
- `r2-source-manufacturing-http-save.test.mjs` 真實從初始禮券換地圖、山區採集、來源 PLUS 市場購書、實際製藥／皮盾／木刀、雙世代存檔、重啟、繼續製杖與再存讀。不得預先填入原料或 EXP，也不接受客戶端自訂亂數。
- B-43 保存審核只增加可比對的來源製作書、20 EXP 倍數、已採集材料投入量上界及部分非市場供貨產物上界；不把整個 ITEM 目錄的存檔限制放開。它是受限玩家狀態包絡，不是完整歷史交易追溯證明。
- 完成狀態取決於最終同 SHA GitHub Actions + HTTP/Perl 測試；若 CI 失敗，未通過時不得稱製作鏈驗收完成。

## 3. 材料取得鏈（R2 新增來源驗證）

- **玩家卡住的原因已定位**：31 項 Perl 差分使用「預先放入材料」的記憶體來源世界，不等同玩家從開店取得原料。原版前期原料 #1～#7 的 `PLUS -20m` 表示市場供貨扣減，不代表可由 PLUS 從零補貨。不能把市場上的 ITEM 定義或未執行的 USE 直接當成可取得材料。
- `listUseOffers(world)[].materialRoutes` 以讀取同一凍結 DSL ITEM / Registry、世界庫存及已註冊 USE 的方式提供每項材料資訊。區分已持有、目前市場現貨、原版正向 PLUS 可補貨、已具材料的前置 USE、前置 USE 仍缺材料、尚未接通取得路徑；**只提供說明，不直接增減商品或創造市場存貨**。正向 PLUS 也不保證每次供貨都產生足量、可負擔或可在時間限制內購買。
- 來源材料鏈實例：初始五張禮物卷 → `#79/3` 消耗二張換得 #37 修行套組 → 原版 PLUS 在市場產出 #8 魔石 → `market-buy` 買三十個魔石 → `#37/1` 消耗修行套組與三十魔石，產出 #19 魔法的知識並取得五十點 #37 EXP。這條流程使用原版來源的 API，而非手動填入測試庫存。
- `local-world-save-store.mjs` 原有 #37/1 一次性魔法知識來源證明保留；新增 #9／#12 受限地圖兌換、熟練度與原版最大產量包絡的材料存檔審核。未知製作結果與不合法 EXP 仍拒絕，並不對所有已註冊 USE 一律解禁。
- **新增採集與剩餘阻塞**：#12 四項山區採集、#9 三項礦山採集已接入來源受控 `use-item`，真實取得原料 #1～#7；但 #10 寫作、#37 其他修行與 #39 製作的藥品、裝備及解體屋之魂等上游仍不完整，未知配方的存檔來源證明仍拒絕。不能因採集通過就把其他配方稱為完整玩家玩法。

## 4. 尚未完成與 R4 依賴

- 其他 **64／116** 原版 USE 仍未接入。各筆按純資料、材料／庫存／製作、特殊回呼、職業／公會、EVENT、未審閱來源分流；不得因模型拒絕就視為原版禁止。
- 高風險缺口是原版產生函式、職業變化、`LIMIT_EXP` 並列排序與事件狀態的完全差分；這些需要個別補真 Perl Oracle，再擴充共用 Registry，不能用手寫預期值冒充來源。
- R4 負責完整時間切片、原版 EVENT/hash/RNG 語義、SortDT、36 小時期末決算；R2 不建立第二套 EVENT 引擎、不將未知 EVENT 設空。依賴 EVENT 的 USE 在明確介面接妥前繼續拒絕。
- `modern/scripts/dev-local.mjs` 與 R4 兩條工作線都有修改；整合前應重新取得 R4 最新 HEAD 並以兩側功能保留方式處理。R2 支線 CI 通過只代表支線驗收，不代表最終整體合併驗收。

## 5. 驗證標準

正式判定需最終 R2 HEAD 的 GitHub Actions 完整成功（Node、原版 Perl、DSL/Core 來源 SHA、R2/R3/R4 回歸）與相同程式碼上的雙世代 HTTP 玩家驗收。新增測試通過數量不等於 116 項功能完成。即使 R2 分支 CI 綠燈，也僅能稱 **「R2 補完支線驗收通過」**，不能稱整個專案或 R2 全原版玩法完整結案。
