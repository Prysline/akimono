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
