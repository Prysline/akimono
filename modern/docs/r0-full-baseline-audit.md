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
