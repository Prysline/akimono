# 商品／USE／EVENT 來源覆蓋矩陣（第一批）
兩份凍結 DSL：7a18185e98b32aee82ca1ce30d6f3c395157dbcb / 923634e58a05beca9ab004515fc7669d53a1ba3a。逐宣告 ID、來源行、blob、各層級 nullable 欄位見 [manifest features](r0-r1-baseline-manifest.json)。靜態 79 ITEM、116 USE、25 EVENT，EVENT 17 編譯（15 正 START、2 zero START）、8 START -1 禁用；新增測試使用既有 parser 和 EVENT compiler 檢查，不是完整 Perl 重跑。

| 層級 | ITEM | USE | EVENT |
|---|---:|---:|---:|
| 宣告 | 79 | 116 | 25 |
| 編譯（已知 EVENT） | 待補 | 待補 | 17 |
| registered（本批證據下界） | 1 | 10 | 0 |
| perlOracle（本批證據下界） | 1 | 0 | 0 |
| nodeDifferential（本批證據下界） | 1 | 0 | 0 |
| lawfulAcquisition（本批證據下界） | 1 | 9 | 0 |
| http（本批證據下界） | 1 | 9 | 0 |
| reviewedTime（本批證據下界） | 1 | 0 | 0 |
| v2Restart（本批證據下界） | 1 | 9 | 0 |

0 表示本批尚無逐項證據，不等於 runtime 不支援。null = 未核對。P1–P3 已驗收仍須逐項連結，不重做。Registry 不能代替合法取得／真 HTTP／reviewed time／v2。#22 目標範圍不能列為已完成。

第二批：P1/P2/P3 歷史受控驗收逐項連結至 `priorAcceptance`（不將 P1/P2 legacy persistence 或 P3 固定起始時鐘當作本輪真時鐘）。#62/1 註冊但正式 HTTP 拒絕；#62/2、#65/0–2 無規則；#63 市場規則缺失。新增 Registry 測試將從正式 source wiring 列出全部 220 項目前註冊／編譯資訊；CI 結果未回收前，表內仍保留已核對證據下界，不把推測填入 null。

## #23 exact CI Registry 回收（整合候選待重驗）
以下表取代上方舊的下界表之 Registry 欄位；其他證據仍是已連結下界。0 不是不支援，null 仍未知。

| 層級 | ITEM | USE | EVENT |
|---|---:|---:|---:|
| 宣告 | 79 | 116 | 25 |
| compiled | 79 | 0 | 17 |
| registered | 56 | 112 | 0 |
| perlOracle | 1 | 0 | 0 |
| nodeDifferential | 1 | 0 | 0 |
| lawfulAcquisition | 1 | 9 | 0 |
| http | 1 | 9 | 0 |
| reviewedTime | 1 | 0 | 0 |
| v2Restart | 1 | 9 | 0 |

ITEM：17 common-static、39 common-dynamic、23 unsupported。USE 缺 62/2、65/0–2；EVENT 8 禁用。USE compiled 與 EVENT registered 尚未確認，不以 0 表示未實作。逐列 registryEvidence 保存 #23 CI provenance；不得充當合法取得或 HTTP/v2 證據。
