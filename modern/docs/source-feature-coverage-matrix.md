# 商品／USE／EVENT 來源覆蓋矩陣（整合候選，未結案）
固定正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。兩份凍結 DSL：7a18185e98b32aee82ca1ce30d6f3c395157dbcb / 923634e58a05beca9ab004515fc7669d53a1ba3a。
逐項 ID、blob、來源行、Registry 證據、已連結驗收與缺口見 [canonical manifest](r0-r1-baseline-manifest.json)；[來源宣告原文索引](r1-source-declarations.json) 保存 220 個區塊的逐行原文與定位（靜態擷取，不等同完整語義審查）。#23 CI 45746112640 的實際 Registry 診斷已回填，整合候選 b40dec8 已由 CI 45765900966 重驗通過；新 HEAD 待驗。

| 層級 | ITEM | USE | EVENT |
|---|---:|---:|---:|
| 宣告、原文定位 | 79 | 116 | 25 |
| compiled | 79 | 待確認 | 17 |
| registered | 56 | 112 | 待確認 |
| perlOracle | 74 | 108 | 25 |
| nodeDifferential | 74 | 108 | 25 |
| lawfulAcquisition | 7 | 12 | 0 |
| http | 7 | 12 | 0 |
| reviewedTime | 5 | 0 | 0 |
| v2Restart | 7 | 12 | 0 |

以上非 Registry 欄位為已逐項連結證據下界；0 不表示不支援，null 表示尚未證明。ITEM：17 common-static、39 common-dynamic、23 unsupported。EVENT：15 正 START、2 zero START 編譯，8 START -1 禁用。USE #62/2、#65/0–2 無規則；#62/1 有規則但正式 HTTP 拒絕 targetShopId；#63 初始持有與市場再取得分開。P1/P2/P3 既有歷史受控驗收逐項連結 priorAcceptance，不將 legacy 或固定起始時鐘升格。正式命令共用契約見 [R1 audit](r1-current-core-contract-audit.md)。
尚缺逐項 Oracle、差分、合法取得、前置條件、正式 command、UI、時間/RNG 適用性、CAS/交易、v2/replay 的完整語義證據；不可用原文索引或註冊結果替代。#22 正常經營，#18/#16 外部系統，各自依賴，不提前實作。

## 14 層證據工作欄與第一批補鏈
220 rows 均新增 evidenceLayers（14 欄：declaration、compiled、registry、perlOracle、nodeDifferential、lawfulAcquisition、prerequisites、formalCommand、http、ui、reviewedTime、rng、cas、v2Restart）。僅已有證據的欄填值，未知保留 null；不是 220 項已完成。P4/P5 19 rows 已逐項補精確測試 SHA、行號、條件、命令、取得／結果、保存與限制，見 [真玩家逐項證據](r1-p4-p5-feature-evidence.md)。本批新增 6 ITEM、3 USE 的限定真玩家證據；ITEM 26/35/36/79 仍未註冊 market-buy，不能混稱不可取得。商品／USE 的全部原版差分、UI、未審時間與外部依賴仍待補。

第二批補鏈：[EVENT metadata／gift Oracle](r1-event-gift-oracle-evidence.md)：25 EVENT 原版數字／時間 compiler metadata 與 Node exact 差分、#79/0 與四 ITEM 受控 gift Oracle。上表 perlOracle/nodeDifferential 為限定證據數，EVENT 的25不代表任何 EVENT callback/runtime 玩家驗收；HTTP/v2/合法取得正式下界未改。新增 14 層 schema、頂層／層級 flag 一致、測試 SHA/行號/分類、HTTP/v2真玩家 gate 與六個負例；待新候選 CI。

#79/0 的 source 1000 permille 僅歸於條件；正式 RNG 實測仍為 null。正式 HTTP/command/CAS/v2 正向欄位禁止只引用靜態來源。

第三批補鏈：[禮物卷／市場](r0-gift-market-oracle-evidence.md)：ITEM #10、USE #79/1–4 五筆受控差分，其中 #79/4 既有真玩家證據保留；#79/2 正向注入10券不算合法取得。詳細證據行數：52 筆功能記錄；正式 lawfulAcquisition/HTTP/v2 下界不變。

第四批補鏈：[打工／展示架／lostbook](r0-work-showcase-lostbook-evidence.md)：ITEM #13、#63 與 USE #13/0–1、#63/0–3 的隔離 callback 證據；#63/4–7 保留未證明狀態；B-30 不硬連具體配方。57 筆有詳細證據，正式正向下界不變。

第五批補鏈：[打工／職業／乳製品／派對](r0-r2-work-career-dairy-party-evidence.md)：20 USE rows（#13/0–1、#25/0–1、#26/0、#77/0、#78/0–13）受控完整 source USE 差分，70 筆有詳細證據；正式正向下界不變，#26/1 hint 不升格。

第六批補鏈：[採集／多次地圖／廣告](r0-r2-gathering-advertisement-repeat-evidence.md)：10 USE rows（#9/0–2、#12/0–3、#14/0、#62/0–1）受控完整 source USE 差分，80 筆有詳細證據；#62/1 formal HTTP false 保留，正式正向下界不變。

第七批補鏈：[sparse PLUS](r0-sparse-plus-evidence.md)：ITEM #1/#10/#40 受控來源供給差分，82 筆有詳細證據；正式取得/HTTP/v2 下界不變。

第八批補鏈：[自然販售／#70 FUNCTURN](r0-natural-sale-functurn-evidence.md)：ITEM #10/#70 受控來源 Oracle／差分，83 筆功能有詳細證據；#70 registry false 不變；正式取得/HTTP/v2 下界不變。

第九批補鏈：[R4 EVENT declarative／PARAM](r0-r4-declarative-event-evidence.md)：九 EVENT 純 PARAM overlay，其中七 EVENT 單 key END/START 及 DataRead 連續時段差分；25 metadata 下界與83詳細 rows 不變。正式 HTTP/v2/合法取得仍不變，不能宣告 EVENT callback/runtime 已驗收。

第十批：[R4 B50 公會帳本／跨期磁碟](r0-r4-b50-disk-ledger-evidence.md) 為共用 period/guild/IO 來源層；不硬映射 guildbattle、人工 EVENT codec 或商品取得，83詳細 rows 與正式下界不變。

第十一批：[R4 多 EVENT/hash](r0-r4-multi-event-hash-evidence.md)：七 EVENT 另補 17-key 混合切片 Oracle/差分；其餘十 key 僅 hash/gate，未驗 callback。83 詳細 rows、正式下界不變。

第十二批：[R4 guildbattle END／rebel NOW](r0-r4-guildbattle-rebel-callback-evidence.md)：兩 EVENT 追加單 key callback Oracle/Node 差分，五／八受控案例；IO stub、固定時鐘與明示 draws，非外部磁碟、正式時間或玩家能力。83 詳細 rows、25 EVENT 限定 Oracle 下界及正式下界不變。

第十三批：[R4 RebelRobin period→NOW](r0-r4-rebel-period-now-evidence.md)：rebel 七 trigger/extension、八 period→NOW 單切片受控 Oracle/Node 差分；非完整 settlement、軍隊磁碟、真時間/RNG/CAS/v2。83 詳細 rows、25 EVENT 限定 Oracle 下界及正式下界不變。

第十四批：[R4 公會檔案／邊界／會費](r0-r4-guild-files-fee-evidence.md)：共用 guild definition/ledger、隔離磁碟恢復、per-shop dues/atk/def call stub；不映射 guildbattle 或正式玩家。83 詳細 rows 及正式下界不變。

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

### 第三十八批：peer trade 純投影／B-32 人工 USE 差分

- 新審2檔有效：有效197、歷史32、待補4；固定233，分類收斂229/233（98.3%）；收斂後逐檔補審166，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-peer-use-fixture-evidence.md)：peer #1/#40/#79 純記憶體投影，無 CAS；人工 stock/tax/time/RNG，非售完非法 rank -1 仍保留。B-32 三組兩步 Perl/Node、synthetic A/B/C、同 adapter 連續 CAS；shortage/time-gate 標題實際 COMMITTED、spoof 只改 worldId、no IO 只查 metadata、JSON 非 v2。無正式玩家、HTTP/v2；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。

### 第三十九批：R2 declarative／unified USE

- 新審2檔有效：有效199、歷史32、待補2；固定233，分類收斂231/233（99.1%）；收斂後逐檔補審168，既有重審7、剩56；新增5獨立。
- [逐檔證據](r0-r2-declarative-unified-use-evidence.md)：69 distinct recipe IDs 受控 Perl/Node、人工材料/EXP/job/time/draw，並非合法取得；#26/0 僅 metadata/drift。Unified #79 六例只驗 probe 長度，#14 六分支逐值差分、受控初始券換地圖、memory CAS 拒絕；非完整 compiler/CGI/HTTP/v2。R1 逐項尚待另行連結，詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 暫不變。

### 第四十批：R3 natural sale／五劍取得販售，分類收斂完成

- 新審2檔（1有效、1歷史）：有效200、歷史33、待補0；固定233，分類收斂233/233（100%）；收斂後逐檔補審170，既有重審7、剩56；新增5獨立。不是全量重審或 R0 結案。
- [逐檔證據](r0-r3-natural-sword-sales-evidence.md)：原版 24 stock/display＋24 price＋24 pre-EVENT＋16 multi-shelf，人工 stock／固定 draw；單架 draw 只 <= 原版總量，多架精確 natural，整合才比全79 wholesale及總 draw；#70 有 owner 只 Perl。五劍 Node 合法來源路徑受控 memory CAS，但使用舊時間命令與真隔離 legacy v1（重載非新 process），非正式 HTTP/v2 或逐劍完整原版差分。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 暫不變。
- 下一步：重新逐檔覆核剩餘56份原有分類；完成後逐項補 R1 14層，R5 仍只規劃。

### 第四十一批：B44–B47 既有分類重新覆核

- 八檔既有有效分類維持：有效200、歷史33、待補0；固定233、分類100%；新逐檔170，既有63重審15、剩48；實際逐檔累計185/233（79.4%）。
- [逐檔證據](r0-b44-b47-rereview-evidence.md)：B44 原版 ledger 79槽但77槽人工9999，#10/#79 手填 cap；B45 原版 prize callback＋AddItem/排名計數，ITEMNO regex 代換，WriteLog stub，JS no-op DSL mutation 不算 drift；B46 同 Perl interpreter 兩次無領袖 territory，Node 每次 Oracle input、非兩期完整結算；B47 單店 SortDT/GetDTPoint 四例，two-sales 人工帳。均非正式 HTTP/v2/CAS、完整 period。R1 詳細87與限定/正式下界不變。

### 第四十二批：B41–B43 既有分類重新覆核

- 五檔既有分類維持（3歷史、2有效）：有效200、歷史33、待補0；固定233、分類100%；新逐檔170，既有63重審20、剩43；實際逐檔190/233（81.5%）；候選新增5獨立。
- [逐檔證據](r0-b41-b43-rereview-evidence.md)：B41 30/60m source #10 買/展示/售、原版 commit/auth/IO stub、自然區段接 PLUS 非全 period；清架測試只驗 stale。B42 同 memory/原版兩次買售，legacy HTTP 實際先買2再售2次、partial EVENT 後拒再買；near clone 跨期拒絕未驗 clone 不變。B43 真隔離 legacy v1 雙槽與子程序重啟，memory schema v2 不等於正式磁碟v2；B54 仍固定 clock；stock/負 itemtoday 合併拒絕，未重算 checksum；reset/symlink 負例僅歷史路徑。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變，R5 未啟動。
- 第36–41及前 HEAD CI failure 已於 `6d3a293` 記錄並修復11個 evidence heading；修正 commit CI 45844518410 查詢時 queued；新候選待驗。R1-HTTP-01 strict repro 未實跑。

### 第四十三批：B48–B49 既有分類重新覆核

- 四檔有效分類維持：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審24、剩39；實際逐檔194/233（83.3%）。
- [逐檔證據](r0-b48-b49-rereview-evidence.md)：五／六個單 synthetic EVENT、固定 time/draw，原版 START 與 END/START region；strict expiry equality、group、duration、draw count；無真 callback/NOW/period/world IO/HTTP/CAS/v2；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 第42批 CI 45844865477/job139995779986 success，實際 checkout `27f4fd45e9d915167057664e50cc89e3d4d006e0`，與 `50528dd` compare files=[]；JS1350/1350、0 fail/skip/cancelled，Perl2456/2456（85檔），DSL/source pins 通過；tree SHA 來自前 PR metadata，未獨立取 tree。新 HEAD 待驗；本機 Git DNS 仍失敗，strict repro 未實跑。

### 第四十四批：B50–B52 既有分類重新覆核

- 五檔維持4有效1歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審29、剩34；實際逐檔199/233（85.4%）。
- [逐檔證據](r0-b50-b52-rereview-evidence.md)：B50 Perl 同程序兩期前綴，Node 每次 Oracle input；repo 未傳 projector，不是真 CAS 拒絕。B51 真 memory CAS/legacy disk bootstrap，不是正式 v2 或期末；clockShift 負例同時缺 writeSource。B52 原版 seed/單句與 scalar handle，非真磁碟或實際 EVENT。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- #24 三個補件檔與 #26 blob SHA 全相同，#23 registry audit script 相同，audit/repro/test/R5 plan 有差異仍須語義比對。第43批 CI 45849759031 查詢時 in_progress；本環境 git ls-remote 仍 DNS failure，strict repro 未實跑；新 HEAD 待驗。

### 第四十五批：B54–B56 既有分類重新覆核

- 四檔維持1有效3歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審33、剩30；實際逐檔203/233（87.1%）。B56 重疊唯一列。
- [逐檔證據](r0-b54-b56-rereview-evidence.md)：B54 local deterministic replay 非 Perl RNG；B55 十例直接 callback、人工 stock/draw、memory CAS 與 legacy disk；B56 反轉17-key fixture，非 Perl hash order，實際受控 CAS/拒絕、舊存檔、prefix retry；null state 負例未隔離其他 review 參數。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 第43/44批 CI 45849759031/45851995042 查詢時仍 in_progress；未本機重跑、strict repro 未實跑；新 HEAD 待驗。

### 第四十六批：B57–B58 既有分類重新覆核

- 四檔維持2有效2歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審37、剩26；實際逐檔207/233（88.8%）。
- [逐檔證據](r0-b57-b58-rereview-evidence.md)：B57 十一例、兩 callback、受控CAS；B58 十五例獎級/邊界、合法 memory market 買券、人工 draw/legacy reload，整合 expected 為 Node projector，不是同 world Perl 全差分。非正式 HTTP/v2/自然RNG；R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 第43批 CI 45849759031/job140012737260 success，checkout `f0b67b86d33cabb85c23cd60658909efca6a449c` 與 `59d07e9` compare files=[]；JS1350/1350、0 fail/skip/cancelled、Perl2456/2456（85檔），DSL/source pins 通過。candidate tree 已知，checkout tree未單獨取得。第44/45批仍 in_progress；strict repro 未實跑；新 HEAD 待驗。

### 第四十七批：B59–B60 既有分類重新覆核

- 四檔維持2有效2歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審41、剩22；實際逐檔211/233（90.6%）。
- [逐檔證據](r0-b59-b60-rereview-evidence.md)：B59 5案 END/START、全79 numeric PLUS、手組 modifier；B60 9案真 temp event-n file 與 NOWFUNC、手工組裝非全 compiler；連續 memory CAS 有效受控證據，負例 pure apply 不是真 CAS；固定 clock/draw/order、legacy reload 非正式 v2。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 本輪 git ls-remote 實際 DNS failure，未本機重跑；第44/45/46批最後查詢尚未完成，新 HEAD 待驗；strict repro 未實跑。

### 第四十八批：B61–B63 既有分類重新覆核

- 六檔維持3有效3歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審47、剩16；實際逐檔217/233（93.1%）。
- [逐檔證據](r0-b61-b63-rereview-evidence.md)：B61 真 PARAM compiler fragment/人工200木刀 buyer prep，Node #10 店只 preview；B62 #14 market/use得10#40，Node active/normal sale 5vs2，非原版獨立售出差分；B63 六種 first-use 受控 Perl/Node 差分，真 memory acquisition，legacy save、未上架五劍持有，非全部正式取得/銷售。B62/B63 負例多位於 already-used/EXP20 state，未隔離各 guard。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- B41–63 的 #24 42列既有證據完成本輪重新覆核；仍需其他16檔與 #23 全語義收斂，未結案。新 HEAD 待驗，strict repro 未實跑。

### 第四十九批：Core／市場／歷史 HTTP／來源稽核

- 六檔維持3有效3歷史：有效200、歷史33、待補0；固定233；新逐檔170、既有63重審53、剩10；實際逐檔223/233（95.7%）。
- [逐檔證據](r0-core-market-legacy-http-rereview-evidence.md)：B31 舊 memory contract；共用 market 36歷史/3普通/16動態/P5 16案、BASE quote、synthetic hook、人工 carryover/資產、legacy disk；P1/P2 真 HTTP 子程序/重啟但固定 clock/RNG/legacy checksum；P5 Perl 零價書籍16案、IO stub；DSL structure 不代表 runtime。R1 詳細87、限定 ITEM14/USE39/EVENT25、正式 ITEM7/USE12/EVENT0 不變。
- 剩餘 P3 9檔及 R4 reviewed-time HTTP history 1檔；新 HEAD 待驗，strict repro 未實跑。

### 第五十批：P3／R4 HTTP 與 v2 證據

- 10 檔逐檔重新覆核（均有效），固定基線 233/233 完成逐檔審閱；有效 200、歷史 33。170 份新審閱、原 63 份全數重新覆核。分類不等於全功能驗收。
- 詳見 `modern/docs/r0-p3-r4-http-v2-rereview-evidence.md`；正式 HTTP/CAS/v2、固定起始時鐘及伺服器 RNG，不升格真玩家；#66/3 實售/lostbook 與條件 FUNCTURN、多架時間拒絕、歷史 checkpoint 與跨期負向回復各自限縮。R1 詳細 87/220 暫不變，#23/#24 語義收斂及 R1-HTTP-01 strict repro 未結案。新 HEAD 待 CI。

### 第五十一批：#23/#24 證據去重核對

- `modern/docs/r0-r1-pr23-pr24-reconciliation.md`：#23 11路徑、#24 3路徑逐項收錄核對；233 pins/220 declarations、舊 known flags/evidence 保留，補回6檔9筆舊文件引用，B56 僅計一次。#24 42列 status/realPlayer/blob 一致，三補件 blob 相同。兩 PR 不關閉，待新 CI 與使用者/D 決定。
- #44/45 CI 45851995042、45852340690 success，job 140020465192/140021659118；checkout compare files=[]；JS1350/1350、Perl2456/2456，無 fail/skip/cancel；tree 未獨立取得。R1-HTTP-01 未實跑，87/220 詳細列暫不變，新 HEAD 待驗。


### 第52批：31 USE 詳細補鏈

[逐項來源與受控差分](r1-writing-training-disassembly-evidence.md)：#10/0–7、#37/0–3、#39/0–18，詳細列 118/220（剩102）；USE Oracle／Node 70，正式下界不變。非新執行，無 runtime 修改。R1-HTTP-01 尚未實跑。


### 第53批：製作／鍛造／乳製品／節慶

[38 USE 詳細證據](r1-manufacturing-dairy-festival-evidence.md)：34 新詳細、4 既有補強；152/220（剩68），USE Oracle/Node 108，正式下界不變；固定材料/EXP/time/draw，lostbook 受控，不是新執行或正式玩家。R1-HTTP-01 尚未實跑。


### 第54批：明示 GET 產物 ITEM

[52 ITEM 逐項證據](r1-explicit-recipe-item-output-evidence.md)：依已測 USE 明示 GET 與 stock/receipt 差分逐項連結，不將全79槽向量硬映射。204/220（剩16）；ITEM Oracle/Node 66（52為限定產物差分，不是全部 ITEM 功能）；正式下界不變，未重跑。R1-HTTP-01 尚未實跑。


## C 第55批：R1 最後16列與執行環境

[最後16列詳細證據及 HTTP 執行環境](r1-final-feature-evidence-and-http-environment.md)：204→220/220（含8個 alias/Registry 缺口列），限定 ITEM Oracle/Node 74、USE108、EVENT25；正式下界7/12/0不變。R0 233/233不變。strict repro 環境受阻、未實跑，R5未執行。新 HEAD 待 CI。

## C 第57批：最新 CI／R1-HTTP-01 狀態

[第57批 exact CI、缺陷及 P5 資金證據](r1-ci-defect-and-p5-funds-evidence-20261127.md)：第50批歷史紅燈保留，第51–56批一般 CI exact tree 成功（JS 0 fail，52/54/55 各1牛死亡未命中；Perl2456/2456）。R1-HTTP-01 第56批專用 CI 已實跑，3/3 拒絕契約失敗，已回報 D #27；不證資產注入。使用者指定 GitHub CI，本機 DNS 非主要阻礙。P5 六次後續成功，歷史根因仍待證；不降斷言、不改平衡。R0/R1 詳細索引與正式驗收下界不變，R5 未啟動。
