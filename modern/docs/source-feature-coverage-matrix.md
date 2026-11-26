# 商品／USE／EVENT 來源覆蓋矩陣（整合候選，未結案）
固定正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d。兩份凍結 DSL：7a18185e98b32aee82ca1ce30d6f3c395157dbcb / 923634e58a05beca9ab004515fc7669d53a1ba3a。
逐項 ID、blob、來源行、Registry 證據、已連結驗收與缺口見 [canonical manifest](r0-r1-baseline-manifest.json)；[來源宣告原文索引](r1-source-declarations.json) 保存 220 個區塊的逐行原文與定位（靜態擷取，不等同完整語義審查）。#23 CI 45746112640 的實際 Registry 診斷已回填，整合候選仍待重驗。

| 層級 | ITEM | USE | EVENT |
|---|---:|---:|---:|
| 宣告、原文定位 | 79 | 116 | 25 |
| compiled | 79 | 待確認 | 17 |
| registered | 56 | 112 | 待確認 |
| perlOracle | 1 | 0 | 0 |
| nodeDifferential | 1 | 0 | 0 |
| lawfulAcquisition | 1 | 9 | 0 |
| http | 1 | 9 | 0 |
| reviewedTime | 1 | 0 | 0 |
| v2Restart | 1 | 9 | 0 |

以上非 Registry 欄位為已逐項連結證據下界；0 不表示不支援，null 表示尚未證明。ITEM：17 common-static、39 common-dynamic、23 unsupported。EVENT：15 正 START、2 zero START 編譯，8 START -1 禁用。USE #62/2、#65/0–2 無規則；#62/1 有規則但正式 HTTP 拒絕 targetShopId；#63 初始持有與市場再取得分開。P1/P2/P3 既有歷史受控驗收逐項連結 priorAcceptance，不將 legacy 或固定起始時鐘升格。正式命令共用契約見 [R1 audit](r1-current-core-contract-audit.md)。
尚缺逐項 Oracle、差分、合法取得、前置條件、正式 command、UI、時間/RNG 適用性、CAS/交易、v2/replay 的完整語義證據；不可用原文索引或註冊結果替代。#22 正常經營，#18/#16 外部系統，各自依賴，不提前實作。
