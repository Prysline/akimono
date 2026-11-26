# 商品／USE／EVENT 來源覆蓋矩陣（第一批）
兩份凍結 DSL：7a18185e98b32aee82ca1ce30d6f3c395157dbcb / 923634e58a05beca9ab004515fc7669d53a1ba3a。逐宣告 ID、來源行、blob、各層級 nullable 欄位見 [manifest features](r0-r1-baseline-manifest.json)。靜態 79 ITEM、116 USE、25 EVENT，EVENT 17 編譯（15 正 START、2 zero START）、8 START -1 禁用；新增測試使用既有 parser 和 EVENT compiler 檢查，不是完整 Perl 重跑。

| 層級 | ITEM | USE | EVENT |
|---|---:|---:|---:|
| 宣告 | 79 | 116 | 25 |
| 編譯（已知 EVENT） | 待補 | 待補 | 17 |
| registered（本批證據下界） | 1 | 9 | 0 |
| perlOracle（本批證據下界） | 1 | 0 | 0 |
| nodeDifferential（本批證據下界） | 1 | 0 | 0 |
| lawfulAcquisition（本批證據下界） | 1 | 9 | 0 |
| http（本批證據下界） | 1 | 9 | 0 |
| reviewedTime（本批證據下界） | 1 | 0 | 0 |
| v2Restart（本批證據下界） | 1 | 9 | 0 |

0 表示本批尚無逐項證據，不等於 runtime 不支援。null = 未核對。P1–P3 已驗收仍須逐項連結，不重做。Registry 不能代替合法取得／真 HTTP／reviewed time／v2。#22 目標範圍不能列為已完成。
