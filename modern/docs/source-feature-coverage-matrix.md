# 商品／USE／EVENT 來源覆蓋矩陣（整合候選，未結案）
固定正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。兩份凍結 DSL：7a18185e98b32aee82ca1ce30d6f3c395157dbcb / 923634e58a05beca9ab004515fc7669d53a1ba3a。
逐項 ID、blob、來源行、Registry 證據、已連結驗收與缺口見 [canonical manifest](r0-r1-baseline-manifest.json)；[來源宣告原文索引](r1-source-declarations.json) 保存 220 個區塊的逐行原文與定位（靜態擷取，不等同完整語義審查）。#23 CI 45746112640 的實際 Registry 診斷已回填，整合候選 b40dec8 已由 CI 45765900966 重驗通過；新 HEAD 待驗。

| 層級 | ITEM | USE | EVENT |
|---|---:|---:|---:|
| 宣告、原文定位 | 79 | 116 | 25 |
| compiled | 79 | 待確認 | 17 |
| registered | 56 | 112 | 待確認 |
| perlOracle | 10 | 39 | 25 |
| nodeDifferential | 10 | 39 | 25 |
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
