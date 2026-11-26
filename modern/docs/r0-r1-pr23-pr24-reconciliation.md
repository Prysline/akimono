# #23/#24 選擇性證據收錄與語義去重核對

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d` / tree `9a6c0d5837042c276eda13f78394025016d332b5`；比較候選 `e4771dc5c21663509777e6c351436f05732ed105` / tree `44de9a170cf71cbc75c137b06215d2626411017a`，非祖先合併。不關閉 PR、不刪分支、不合併；本文件不是 R1 完成證明。

## #23：988c310ceb5dbcbb4e89d5f22d7b9b9590017433

11 路徑均已在 #26。逐檔對照：

| 路徑（modern/） | 原 blob → 收錄前 blob | 結論 |
|---|---|---|
| docs/current-baseline-status.md | 462d3f0 → 1f862a1 | 舊非空行全保留，增加歷史 |
| docs/r0-full-baseline-audit.md | 85fc6af → 4557c00 | 舊非空行全保留，增加逐檔覆核 |
| docs/r0-full-test-mapping.md | 95c3dd8 → cdf3a4f | 舊待補分類更新；逐檔對照與下列引用補回 |
| docs/r0-r1-baseline-manifest.json | 637693f → 9562bfd | 626 pins、44 frozen 完全相同；233 基線＋原新增1項保留，新增另列5 |
| docs/r1-current-core-contract-audit.md | 2c8fe12 → b7b1ff8 | R1-HTTP-01 原描述更新為三路由、strict repro 已補 load 但未執行；原權限與資產注入未實證限制保留 |
| docs/r5-integrated-acceptance-plan.md | 9db0cdb → b916903 | 舊非空行全保留，增依賴門檻；未執行 R5，須按新工作線政策解讀 |
| docs/source-feature-coverage-matrix.md | 84280bd → 2f313f5 | 舊初批下界由擴充矩陣取代；原 220 宣告與 priorAcceptance 等元資料相同，既有非 null flags 及 evidence 無遺漏 |
| scripts/r0-r1-audit.mjs | a9d6975 → 31259fe | 4 舊行改為基線/新增分列與候選 anchor；其餘保留，增加14層、來源 pin/range、證據 guard |
| scripts/r1-formal-registry-audit.mjs | 32eb469 → 32eb469 | blob 相同 |
| scripts/r1-http-extra-fields-repro.mjs | b792f36 → e433396 | 由 reset-based 兩 route 改獨立 fresh control/probe，追加 load、4xx/全 snapshot/disk、診斷；仍不在 npm test，未實跑 |
| tests/r0-r1-baseline-audit.test.mjs | 2d6ca4e → c04c6f1 | 原新增測試保留；唯一替換舊 inventory count 包含新增列；追加6項負向 guard |

#23 原 22 已分類測試 status/realPlayer 不變；233 基線 path/blob 一致，原新增測試保留、非基線分母。220 features 宣告 id/path/sha/line/code/start、其餘舊非覆蓋元資料（含 priorAcceptance）一致，原已知 flags 及 evidence 保留。九筆歷史文件引用原先被新證據引用替代，逐行核實內容後補回（不將舊文件描述提升證據類型）：

- `modern/tests/peer-trade-model.test.mjs` ← `modern/docs/r2e-r0-affected-tests-mapping.md:49` @ `a937a849fc0cdbd699666a3a3981483e02ef7021`
- `modern/tests/r2d-unified-use-item.test.mjs` ← `modern/docs/r2e-r0-affected-tests-mapping.md:13` @ `a937a849fc0cdbd699666a3a3981483e02ef7021`
- `modern/tests/r3-shared-natural-sale.test.mjs` ← `modern/docs/r3-r0-affected-tests-mapping.md:28` @ `bdc03d1be7eee1cab86d5b261991360b7032c21b`
- `modern/tests/r3-shared-natural-sale.test.mjs` ← `modern/docs/r3-r0-affected-tests-mapping.md:38` @ `bdc03d1be7eee1cab86d5b261991360b7032c21b`
- `modern/tests/r3-shared-natural-sale.test.mjs` ← `modern/docs/r3-r0-affected-tests-mapping.md:50` @ `bdc03d1be7eee1cab86d5b261991360b7032c21b`
- `modern/tests/r3-shared-natural-sale.test.mjs` ← `modern/docs/r4-r0-affected-tests-mapping.md:11` @ `4714c9ef9e570de3bbdecdc81654f78288eff305`
- `modern/tests/r3-shared-sword-acquisition-sales.test.mjs` ← `modern/docs/r3-r0-affected-tests-mapping.md:29` @ `bdc03d1be7eee1cab86d5b261991360b7032c21b`
- `modern/tests/r4-sorted-pre-event.test.mjs` ← `modern/docs/r4-r0-affected-tests-mapping.md:31` @ `4714c9ef9e570de3bbdecdc81654f78288eff305`
- `modern/tests/reviewed-use-fixture-street.test.mjs` ← `modern/docs/r2e-r0-affected-tests-mapping.md:40` @ `a937a849fc0cdbd699666a3a3981483e02ef7021`

## #24：08526633a81b6c0474599e70b9846cf7e021ef41

三個補件 blob 與 #26 相同：`r0-b41-b63-evidence.md` d3b7feeb3302097881c62c8245b3574468250824；`r0-b41-b63-evidence.json` 0db7d5c2c5355d627b1029a9e535c03024568b22；`r1-formal-startup-legacy-rejection.test.mjs` b3589a5341f2b52179422930b3a73d76bebce5d5。42/42 path/blob/status/realPlayer 全相符，28有效、14歷史，全部已逐檔重新覆核。唯一與 #23 已審列重疊 B56，僅計一次；原 oracle/probe 保留，三項負向 startup 測試保留。

## 殘留與驗收

兩補件的基線身分、證據分類、舊引用、工具與原文件逐項收錄核對完成；非全部新 R1 逐層證據完成。此次 CI 尚待 exact HEAD，不能以舊綠燈取代。#44/45 CI 原始 log 已核對，JS1350/1350、fail/skip/cancel=0，Perl2456/2456，source pin steps success；實際 checkout 與各自 head compare files=[]，connector 未回傳 tree 欄，未另宣稱 exact tree SHA。#46–50 尚未完成。#23/#24 保留 Draft，待新 CI 與使用者/D 明確同意才考慮關閉。R1-HTTP-01 仍欠實際三路由重現，Git DNS 阻塞；不改 runtime/workflow、不預設越權。新正式驗收分支與 CI 執行由 D 協調。
