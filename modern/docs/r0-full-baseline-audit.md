# R0 全量固定基線稽核（第一批，未結案）
正式來源 08fdd3b31ff130e66d0337360430fda3d73fdc8d；tree 9a6c0d5837042c276eda13f78394025016d332b5；[CI 45727603147](https://github.com/Prysline/akimono/actions/runs/45727603147) completed/success、checkout 8f4d70e71151a0d1be0b0a4b5890fc47adfaf9c5 同 tree。既有 JS 1329/1329、Perl 2456/2456（85 .t），原版 pins 與 DSL 通過。此 PR 新增測試尚需自己的 CI。
完整 recursive tree 未截斷：626 blobs；124 src；371 tests/ blobs（含 148 JS、85 Perl .t）；44 root CGI/PL 與隔離 CGI 固定 blob，其中 22 已有 CI/DSL pin。其他檔案均列於歷史 tree 快照，不將所有 helper 視為凍結原版。
[機讀 manifest](r0-r1-baseline-manifest.json) 包含固定 tree、測試路徑與來源宣告；[逐檔清冊](r0-full-test-mapping.md)、[契約稽核](r1-current-core-contract-audit.md)、[來源矩陣](source-feature-coverage-matrix.md)、[R5 驗收門檻](r5-integrated-acceptance-plan.md)。
基線 blob 是可追溯版本，不是每個檔案的語義核准。未審閱測試仍保留、未審閱 runtime fail-closed。未修改 runtime、原版、workflow、Notion。
本機 Git DNS 無法解析 github.com；透過 GitHub 固定 SHA 取檔。本機未執行完整 Node/Perl，不得把既有 CI 當本輪結果。現有 npm test 自動納入新增 test。
P1 #9、P2 #10 歷史整合；P3 #15 封存交接、#17 正式合併；P4 #20、P5 #21 已正式合併。#1/#16/#18/#22 皆 open Draft；#22 疊在 #18，非正式能力。未新增第二套交易、時間或存檔。

## 收斂 #23 / #24
已按 exact recursive tree 核對 626 blobs、44 frozen、233 baseline tests 的 path/SHA；兩 Draft 變更路徑互不重疊。B56 證據重疊一次，46 有效、17 歷史、170 待補；新增 3 測試分列（含本輪 HTTP/v2 負向補件）。原始 CI checkout tree 逐一查證等於各自候選 tree，詳見 manifest provenance。整合候選尚未驗收。

本輪補審 6 檔（詳見 [補件](r0-source-guard-economy-lock-evidence.md)）；更新為 51 有效、18 歷史、164 待補；先前 63 份仍需最終覆核。

第二批補審 5 檔（[hash/CAS/history](r0-hash-cas-history-evidence.md)），本輪共 11，去重分類 54 有效、20 歷史、159 待補；既有 63 份分類仍須最終覆核。

第三批補審 6 檔（[LIMIT／world codec／備份與提交規劃](r0-limit-world-codec-evidence.md)）：4 有效、2 歷史；累計 58 有效、22 歷史、153 待補（80/233），收斂後補審 17 檔，原 63 檔待最終覆核。未增加正式玩家功能證據。

第四批補審 4 檔（[P3／R2 混合路徑](r0-p3-mixed-path-evidence.md)）：2 有效、2 歷史；累計 60 有效、24 歷史、149 待補（84/233），收斂後補審 21 檔，原 63 檔待最終覆核。P3 混合 v1/v2 必須分段；正式固定時鐘 v2 不算真時鐘玩家。

第五批覆核既有 63 分類中的 5 檔，詳見 [R1 v2 安全證據](r1-v2-security-evidence.md)；原 63 中仍 58 待最終覆核。分類 60/24/149 不變；新候選測試增為 4 檔。修正稽核器原先只接受 baseline 文件引用的缺口：候選證據文件必須顯式列冊、實際存在、heading 與測試路徑及行號一致，舊來源仍固定 SHA。尚未執行新測試。

整合候選 ee961fd68e93c5063b584b903eb108488a1a1278 的 exact CI 45760668915：JS 1340 pass / 1 fail / 1 skip（未觀察牛死亡），Perl 未執行。唯一失敗為本線競爭測試對成功 staging 的錯誤假設，修正與限制見 [R1 契約](r1-current-core-contract-audit.md)。新候選未驗收。

## 已確認整合候選 CI 綠燈（固定版本）
[45765900966](https://github.com/Prysline/akimono/actions/runs/45765900966) job 139726608654：HEAD `b40dec8bfd28f6e655e48f5068c5ba280d5513b8`，checkout `41808264862039019cacbed13d552ee63b1d8e91` tree `de0452748ce90c5367beeb327b35cba0397e8f65` 相同。JS 1342/1342、0 fail/skip/cancelled，Perl 85 檔 2456/2456、Result PASS，所有 DSL 與原版 pins 步驟成功。R1 CAS race 與 fresh replay 均通過；P4 實測 96 opportunities、1 death、4 cows、rev81→86 保存／合法復原。此綠燈屬固定前一候選，不替代新 HEAD。

第六批補審 8 檔（[開店、展示、PLUS、EXP、USE](r0-init-wholesale-exp-use-evidence.md)），有效 68、歷史 24、待補 141（92/233），收斂後補審 29 份，既有 58 份待覆核。

新增第五份候選測試（checkpoint 內層隔離負例），不計入 233 正式基線測試分母；待 exact CI。

## 已確認 checkpoint 內層隔離 CI
[45794612974](https://github.com/Prysline/akimono/actions/runs/45794612974) job 139821957733，HEAD `f7a2c520d9a17fe66a6b08ec02073f61bdf3a1f8`、實際 checkout `0493bf2b80b4bd0677bccb92a00af91eb84a6c72` tree `1e66142f265ff0af160c3176b5107f09b6399f77` 相同。JS 1343/1343、0 fail/skip/cancelled，Perl 85 檔 2456/2456，所有 DSL/pin steps 成功。subtest 737 通過，八條 R1_INNER_GUARD 診斷逐一核對：inner MAC、fingerprint、interpreter、hash policy、draw policy、generation、anchor revision、origin；外層驗證先通過，再獨立指定原因及 HTTP 回退。P4 256 opportunities 觀察1 death、4 cows、rev216→221。僅固定前候選結果，新 HEAD 需重驗。R1-HTTP-01 獨立 strict repro 尚未執行；本機重新測 Git DNS 仍無法解析。

第七批補審 6 檔（[市場初始化／回呼／載入](r0-admin-callback-loader-evidence.md)）：74 有效、24 歷史、135 待補（98/233），收斂後補審35，既有58仍待覆核。

既有 63 分類另覆核 B53 兩檔（累計7、餘56），25 EVENT metadata＋gift Oracle 逐項補鏈；14層稽核器與5負向測試新增，尚待 CI。

第八批補審5檔（[禮物卷／市場](r0-gift-market-oracle-evidence.md)）：79有效、24歷史、130待補（103/233）；收斂後補審40、既有待覆核56。上一批正文為歷史快照。新候選未驗收。

## 第九批與前候選 CI
前候選 [45804660497](https://github.com/Prysline/akimono/actions/runs/45804660497) job 139856600728：HEAD `1d3d112e3b5897e7c013ee5d8cf5906c12151c5a`、實際 checkout `c8bbf30ac5e0d6aa2f5dc321f8878dc0c76be121`，tree `41fce2eb2ef4c8ffcdb8cf9bca2c3f5cdf90c8c6` 相同。JS 1350/1350、0 fail/skip/cancelled、Perl 2456/2456（85 .t）、DSL/pins steps 全 success。僅該固定候選；本批新 HEAD 待驗。

[打工／展示架／lostbook](r0-work-showcase-lostbook-evidence.md) 4 檔已逐檔審閱，83 有效、24 歷史、126 待補（107/233），收斂後補審44、既有待覆核56。57 項已有精確測試證據；B-27 兩種打工與展示架1–4 callback probe 補鏈，5–8 不升格；B-30 合成 A/B/C 不硬映射正式 USE。正式 lawfulAcquisition/HTTP/v2 下界不變。R1-HTTP-01 strict repro 未實跑；本批無 runtime 修改。

第十批 [共用回呼／helper／材料與產出](r0-shared-helper-material-evidence.md) 補審 6 檔，89 有效、24 歷史、120 待補（113/233）；收斂後補審50，既有待覆核56。保留 B-26 stub、B-29 exact helper、B-22 數字片段的區分；沒有新增具體 ITEM/USE 正向旗標；未執行本批 CI。

第十一批 [USE 資格／交易／機率／經驗尾段](r0-use-gates-outcomes-experience-evidence.md) 補審8檔：97有效、24歷史、112待補（121/233）；收斂後補審58、既有待覆核56。B-21/B-23 Node 純投影與獨立 Perl Oracle 分開，B-24/B-25 有直接 probe 差分。均非正式玩家；功能矩陣正向下界不變。新候選 CI 待驗。

第十二批 [打工／職業／乳製品／派對](r0-r2-work-career-dairy-party-evidence.md) 補審4檔：101有效、24歷史、108待補（125/233）；收斂後補審62、既有待覆核56。20 USE rows 新增或補強原版交易差分（其中14職業逐選項），70 rows 有詳細證據；受控注入、正式正向不變。新候選 CI 待驗。

第十三批 [採集／多次地圖／廣告](r0-r2-gathering-advertisement-repeat-evidence.md) 補審4檔：105有效、24歷史、104待補（129/233）；收斂後補審66、既有待覆核56。10 USE rows 新增原版交易差分，80 rows 有詳細證據；#62/1 memory-only 保留正式 HTTP 拒絕。新候選 CI 待驗。

第十四批 [R2/R3 歷史 HTTP/v1](r0-legacy-r2-r3-http-evidence.md) 補審8檔：105有效、32歷史、96待補（137/233）；收斂後補審74、既有待覆核56。全部 spawn legacy server、fixed clock/RNG；B43 v1、兩店診斷與原版差分不升格，正式功能下界不變。R1-HTTP-01 嚴格腳本仍獨立、未實跑；本機 git ls-remote 再次 DNS 失敗，不以包裝預期失敗測試取得 npm 綠燈。

第十五批 [sparse PLUS](r0-sparse-plus-evidence.md) 補審6檔：111有效、32歷史、90待補（143/233）；收斂後補審80、既有待覆核56。B35/36/37 原版受控 PLUS／cap 差分，明示 ITEM #1/#10/#40 補鏈，82 筆功能有詳細證據；79槽向量不當作正式商品取得，正式正向下界不變。新候選 CI 待驗。

第十六批 [自然販售／#70 FUNCTURN](r0-natural-sale-functurn-evidence.md) 補審4檔：115有效、32歷史、86待補（147/233）；收斂後補審84、既有待覆核56。ITEM #10/#70 受控來源 Oracle／差分補鏈，83 筆有詳細證據；正式取得/HTTP/v2 下界不變。前候選 CI 45809746831 已核對 checkout 同 tree、1350 JS／2456 Perl 通過；新候選待驗。

第十七批 [R4 EVENT declarative／PARAM](r0-r4-declarative-event-evidence.md) 補審4檔：119有效、32歷史、82待補（151/233）；收斂後補審88、既有待覆核56。9 EVENT 純 PARAM 差分、其中7單 key END/START 生命週期；25 metadata 下界不變，83 筆功能有詳細證據；正式下界不變。新候選待 CI。

第十八批 [R4 B50 公會帳本／跨期磁碟](r0-r4-b50-disk-ledger-evidence.md) 補審4檔：123有效、32歷史、78待補（155/233）；收斂後補審92、既有待覆核56。原版 temp disk、受控 period prefix/tail、guild ledger、stage/receipt/recovery，不等於正式 v2 或原子 WorldState；83 詳細 rows、正式下界不變。新候選待 CI。

第十九批：[R4 多 EVENT/hash](r0-r4-multi-event-hash-evidence.md)，四檔有效；累計有效127、歷史32、待補74（159/233），收斂後逐檔審閱96；既有63中7覆核、56待覆核。七 EVENT 17-key 受控混合切片，非正式時間／callback／RNG/CAS/v2；詳細功能83，正式下界不變。

第二十批：[R4 guildbattle END／rebel NOW](r0-r4-guildbattle-rebel-callback-evidence.md)，四檔有效；累計有效131、歷史32、待補70（163/233，70.0%），收斂後逐檔審閱100、既有待覆核56。兩 EVENT 追加單 key callback Oracle/Node 差分，人工外部狀態與 IO stub；83 詳細 rows、正式下界不變。新候選 CI 待驗；R1-HTTP-01 尚未實跑。

第二十一批：[R4 RebelRobin period→NOW](r0-r4-rebel-period-now-evidence.md)，四檔有效；累計有效135、歷史32、待補66（167/233，71.7%），收斂後逐檔審閱104、既有待覆核56。rebel 七 trigger/extension、八 period→NOW 人工同片來源差分，非完整 period/軍隊結算/17 EVENT/正式時間。83 詳細 rows、正式下界不變。第二十批 CI 45814598758 queued，新候選待驗。

第二十二批：[R4 公會檔案／邊界／會費](r0-r4-guild-files-fee-evidence.md)，五檔有效；累計有效140、歷史32、待補61（172/233，73.8%），收斂後逐檔審閱109、既有待覆核56。實際隔離 stage/live、原版注入第2 rename 與 Node 目標目錄阻擋第2 rename 的 recovery、舊 keys/mtime/malformed 來源觀測；單店 dues 只 EditGuildMoney call stub。非正式 v2/全域原子或玩家能力；83 詳細 rows、正式下界不變。新候選 CI 待驗。

### 第 23 批：混合 support／instant EVENT

- 新審 4 檔：有效 144、歷史 32、待補 57；固定分母 233，分類收斂 176/233（75.5%）；累計另逐檔審閱 113 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-mixed-support-instant-evidence.md)：四 support／六 theft 同程序 hash＋受控 RNG 差分；共用 Perl .t 另有 loto/happy/iron/sword/guildbattle/rebel 原版斷言，對應 Node 檔另審。83 詳細功能列及正式取得/HTTP/v2 下界不變。未執行本批本地測試，CI 待核。

### 第 24 批：R4 混合 EVENT 其餘五份 Node 差分

- 新審 5 檔：有效 149、歷史 32、待補 52；固定分母 233，分類收斂 181/233（77.7%）；累計另逐檔審閱 118 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-mixed-loto-happy-iron-sword-guild-rebel-evidence.md)：loto/happy/iron-sword/guildbattle/rebel 共 21 受控 cases；第23批共享 Perl probe/.t 已審不重複；人工 stock/active state、clock jump、single shop、stub IO，非完整 period/正式玩家/真 RNG/CAS/HTTP/v2。83 詳細功能列與正式下界不變。未本地重跑，CI 待核。

### 第 25 批：R4 時鐘分割／動態人口 PLUS

- 新審 4 檔：有效 153、歷史 32、待補 48；固定分母 233，分類收斂 185/233（79.4%）；累計另逐檔審閱 122 份，原有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-clock-population-plus-evidence.md)：九時鐘 partition cases；三人口、120秒、59 PLUS/79 slots sparse wire 受控差分；非正式跨期人口生成、合法取得或正式時間/CAS/HTTP/v2。不升格 79 商品個別功能，83 詳細 rows 與正式下界不變。未本地重跑，最新 CI 待核。

### 第 26 批：R4 SortDT pre-EVENT 單店排序

- 新審 2 檔：有效 155、歷史 32、待補 46；固定分母 233，分類收斂 187/233（80.3%）；累計另逐檔審閱 124 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-sorted-pre-event-evidence.md)：memory #10 買入/上架→受控 R3/R4 純 stage，Node R3 shop→原版 GetDTPoint/SortDT；單店點數差分、costtoday <1e-12、反轉 EVENT order fixture。null EVENT 負例傳錯 review 欄位，不獨立證明該 guard；未改原斷言。非原版整鏈、多店排序、正式跨期/玩家/CAS/HTTP/v2。83 詳細功能列及正式下界不變。未本地重跑，Git DNS 仍失敗，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第 27 批：R4 P3 pre-EVENT overlay／跨期與記憶體 CAS

- 新審 1 檔：有效 156、歷史 32、待補 45；固定分母 233，分類收斂 188/233（80.7%）；累計另逐檔審閱 125 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-p3-pre-event-overlay-evidence.md)：11 subtests，九 PARAM overlay、normal/crossing source 差分、20+40 秒同 Perl process、受控記憶體 CAS 兩次36h、隔離四檔 stage/recovery；人工 stock/clock/tape，非正式 HTTP/真時鐘/v2 reload。九 EVENT 已補既有差分層；83 詳細功能列及正式下界不變。未本地重跑，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第 28 批：R4 兩期財務 prefix（龍賽／爵位／會費）

- 新審 2 檔：有效 158、歷史 32、待補 43；固定分母 233，分類收斂 190/233（81.5%）；累計另逐檔審閱 127 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-period-all-finance-evidence.md)：同一 Perl process 兩期，實際隔離 drapay read/unlink、525/0 會費呼叫、攻防、爵位與完整 shop/town 差分；Node 每期讀取 Oracle input，非獨立連續提交。人工 stock/clock/draw、guild IO stub；不證真公會金庫/正式時間/HTTP/CAS/v2。83 詳細功能列及正式下界不變。未本地重跑；R1-HTTP-01 未實跑。

### 第 29 批：R4 龍賽檔案／兩期龍賽與爵位

- 新審 6 檔：有效 164、歷史 32、待補 37；固定分母 233，分類收斂 196/233（84.1%）；累計另逐檔審閱 133 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-dragon-period-evidence.md)：九龍賽檔案 cases、兩期龍賽及爵位 prefix；Perl 真隔離 drapay read/unlink，Node 純文字投影、每期重讀 Oracle input，非獨立連續提交。人工 stock/clock/rand、log stub；CAS 標題無 CAS 呼叫、legacy dignity 負例未隔離 guard；不證正式玩家／HTTP／v2。83 詳細功能列與正式下界不變。未本地重跑，Git DNS 失敗，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第 30 批：R4 店主缺席／兩期高 EXP 技術遺失

- 新審 6 檔：有效 170、歷史 32、待補 31；固定分母 233，分類收斂 202/233（86.7%）；累計另逐檔審閱 139 份，既有分類尚 56 份待覆核。新增 5 檔獨立計算。
- [逐檔證據](r0-r4-expiry-high-exp-tech-evidence.md)：九 expiry cases、嚴格12h/7d +1s 邊界；兩期原版真隔離 drapay、CloseShop call recorder（店鋪仍在）、高 EXP 18/24→19 遺失、38 保留、EXP4695→4409、8/6 draws。Node 每期重讀 Oracle input；人工 stock/EXP/clock/rand、guild/log IO stub，非真關店或正式玩家／HTTP／v2。新增四 ITEM 限定 Oracle/Node 詳細證據，87 詳細列、ITEM14/USE39/EVENT25；#38 僅保留分支，正式取得/HTTP/v2 下界不變。未本地重跑，R1-HTTP-01 未實跑；新候選 CI 待核。

### 第三十一批：真 CloseShop／兩期結算

有效174、歷史32、待補27（206/233，88.4%）；收斂後逐檔補審143、原有分類重新覆核7（剩56）；候選新增5獨立計算。四份測試與兩份 probe 已逐檔實讀，見 [限定證據](r0-r4-real-close-evidence.md)。原版真隔離 session unlink、archive pre-zero 文字、status/money/rank 歸零、SortDT singleton prune；第二期 closed reference 仍結算 dragon1500、fee75、money1425、atk921，移除後不跑技術 rand。Node 每期 Oracle input，純投影；SetUserData/WriteErrorLog/EditGuildMoney 等外部呼叫記錄、DataWrite 未執行、備份尾段未跑。R1 詳細87，限定 ITEM14/USE39/EVENT25、正式取得/HTTP/v2 ITEM7/USE12/EVENT0 不變。CI29、30 本批查詢仍 in_progress，不繼承舊綠燈。

### 第三十二批：R4 關店封存磁碟／B50 串接

- 新審 3 檔：有效 177、歷史 32、待補 24；固定分母 233，分類收斂 209/233（89.7%）；收斂後另逐檔補審 146，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-close-shop-archive-evidence.md)：原版真隔離 CloseShop/WriteErrorLog 四例，新建、追加、30001 bytes 輪替、missing log 仍清零與 session unlink；SetUserData 原版 no-op。Node 真隔離 append/rename 與解碼文字差分，missing ENOENT；未測 30000 bytes 等值或跨檔原子性，輪替先於 context 驗證。B50 兩期 Perl 封存仍為 recorder，Node 每期 Oracle input、獨立 probe context，非兩期原版真磁碟差分或正式 WorldState commit。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，未本地重跑、R1-HTTP-01 未實跑；CI29–31 本批查詢仍 in_progress，新候選待驗。

### 第三十三批：R4 period 備份尾段／兩期真關店

- 新審 4 檔：有效 181、歷史 32、待補 20；固定分母 233，分類收斂 213/233（91.4%）；收斂後另逐檔補審 150，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-period-backup-full-tail-evidence.md)：兩期真隔離三代五檔 rename/copy、session strict mtime、MakeGuildFile recorder；joint probe 真 CloseShop/SortDT/drapay 及備份尾段，第二期 closed shop prune、draws4。人工 activeFiles 非 DataWrite 產物，Node 每期 Oracle input 純投影不寫檔；外部 archive/guild/log 呼叫記錄，缺世代、失敗/原子性未驗，不升格正式玩家。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑；新候選 CI 待驗。

### 第三十四批：R4 備份磁碟／DataWrite 及 DataRead

- 新審 4 檔：有效 185、歷史 32、待補 16；固定分母 233，分類收斂 217/233（93.1%）；收斂後另逐檔補審 154，既有分類重審 7、剩 56；候選新增 5 獨立計算。
- [逐檔證據](r0-r4-backup-data-write-disk-evidence.md)：原版 backup prelude 3600s 嚴格 mtime、缺來源截斷／目的目錄錯誤後續仍 copy、lasttime 仍更新；blocked work stale generations。Node 真隔離兩期 rotation、preflight 拒絕，非中途 OS failure 原子性。DataWrite 原版兩次真單檔 stage/rename、同程序 DataRead reload 後人工修改；Node 窄序列化與真單檔 rename failure/recover/discard，不重算 point、非完整 period/鎖/CAS/v2。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑；CI29–33 查詢仍 in_progress，新候選待驗。

### 第三十五批：town／guildbattle END／play 磁碟

兩份待補轉有效：原版直接 END body 真隔離 guild/config/ledger read、兩次 DataWrite/DataRead，Node 真隔離讀檔及 town-only stage/rename/recovery；town map 比對不等於 hash order bytes，非完整 EVENT lifecycle、正式玩家、CAS 或 v2。Set/GetTownData key 不對稱保留原版行為。guildbattle 既有 Oracle/Node 層追加引用，詳細仍 87 項、其餘 133 項；正式下界不變。證據：[r0-r4-town-play-evidence.md](r0-r4-town-play-evidence.md)。R0 有效187、歷史32、待補14（219/233，94.0%）；收斂後逐檔補審156，既有重新覆核7，剩56；候選新增5獨立。

### 第三十六批：UI 靜態回歸／原版 world 讀寫及提交

- 新審 5 檔有效：有效192、歷史32、待補9；固定233，分類收斂224/233（96.1%）；收斂後逐檔補審161，既有重新覆核7，剩56；候選新增5獨立。
- [逐檔證據](r0-ui-world-read-commit-evidence.md)：UI 為靜態字串/CSS/handler wiring，非瀏覽器或 HTTP/CAS；原版 DataRead 真隔離檔，非數字保留、缺 // / CRLF sentinel 需 alarm、duplicate ID 覆蓋及缺 payload 接受。DataWrite 無店 stage，人工 stock 變更，未 commit；DataCommitOrAbort 真隔離 rename、第二次注入失敗後 recovery、原版 selector wildcard，非多檔 atomic。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。Git DNS 仍失敗，R1-HTTP-01 未實跑。

### 第三十七批：人工 world USE 序列／市場與批發來源

- 新審3檔有效：有效195、歷史32、待補6；固定233，分類收斂227/233（97.4%）；收斂後逐檔補審164，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-world-use-market-fixtures-evidence.md)：兩次人工 A/B/C USE 同 interpreter 但重建 state、各次 seed，真原版 lostbook、wholesale/callback/EXP 順序；人工 #10 市場統計與 sc-s CGI，時間先於拒絕，commit/IO stub；人工批發定價/limit、#20/#25 手填 DSL 數值非 compiler 或合法取得。非正式玩家、HTTP/CAS/v2/Node 差分；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
