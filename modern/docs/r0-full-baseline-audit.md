# R0 全量固定基線稽核（第一批，未結案）
正式來源 08fdd3b31ff130e66d0337360430fda3d73fdc8d；tree 9a6c0d5837042c276eda13f78394025016d332b5；[CI 45727603147](https://github.com/Prysline/akimono/actions/runs/45727603147) completed/success、checkout 8f4d70e71151a0d1be0b0a4b5890fc47adfaf9c5 同 tree。既有 JS 1329/1329、Perl 2456/2456（85 .t），原版 pins 與 DSL 通過。此 PR 新增測試尚需自己的 CI。
完整 recursive tree 未截斷：626 blobs；124 src；371 tests/ blobs（含 148 JS、85 Perl .t）；44 root CGI/PL 與隔離 CGI 固定 blob，其中 22 已有 CI/DSL pin。其他檔案均列於歷史 tree 快照，不將所有 helper 視為凍結原版。
[機讀 manifest](r0-r1-baseline-manifest.json) 包含固定 tree、測試路徑與來源宣告；[逐檔清冊](r0-full-test-mapping.md)、[契約稽核](r1-current-core-contract-audit.md)、[來源矩陣](source-feature-coverage-matrix.md)、[R5 驗收門檻](r5-integrated-acceptance-plan.md)。
基線 blob 是可追溯版本，不是每個檔案的語義核准。未審閱測試仍保留、未審閱 runtime fail-closed。未修改 runtime、原版、workflow、Notion。
本機 Git DNS 無法解析 github.com；透過 GitHub 固定 SHA 取檔。本機未執行完整 Node/Perl，不得把既有 CI 當本輪結果。現有 npm test 自動納入新增 test。
P1 #9、P2 #10 歷史整合；P3 #15 封存交接、#17 正式合併；P4 #20、P5 #21 已正式合併。#1/#16/#18/#22 皆 open Draft；#22 疊在 #18，非正式能力。未新增第二套交易、時間或存檔。

## 收斂 #23 / #24
已按 exact recursive tree 核對 626 blobs、44 frozen、233 baseline tests 的 path/SHA；兩 Draft 變更路徑互不重疊。B56 證據重疊一次，46 有效、17 歷史、170 待補；新增 2 測試分列。原始 CI checkout tree 逐一查證等於各自候選 tree，詳見 manifest provenance。整合候選尚未驗收。
