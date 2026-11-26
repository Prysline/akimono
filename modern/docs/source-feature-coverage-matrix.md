# 商品／USE／EVENT 來源覆蓋矩陣（整合候選，未結案）
固定正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。兩份凍結 DSL：7a18185e98b32aee82ca1ce30d6f3c395157dbcb / 923634e58a05beca9ab004515fc7669d53a1ba3a。
逐項 ID、blob、來源行、Registry 證據、已連結驗收與缺口見 [canonical manifest](r0-r1-baseline-manifest.json)；[來源宣告原文索引](r1-source-declarations.json) 保存 220 個區塊的逐行原文與定位（靜態擷取，不等同完整語義審查）。#23 CI 45746112640 的實際 Registry 診斷已回填，整合候選 b40dec8 已由 CI 45765900966 重驗通過；新 HEAD 待驗。

| 層級 | ITEM | USE | EVENT |
|---|---:|---:|---:|
| 宣告、原文定位 | 79 | 116 | 25 |
| compiled | 79 | 待確認 | 17 |
| registered | 56 | 112 | 待確認 |
| perlOracle | 9 | 39 | 25 |
| nodeDifferential | 9 | 39 | 25 |
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
